import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  ShoppingBag,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Phone,
  Shirt,
  Users,
  Lock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  fmt,
  formatearFechaHumana,
  hoyColombia,
  costoTotalVenta,
  calcularDeudaProveedorVendedor,
  abonosProveedorPorVentaId,
  normalizarEstado,
  getEstadoBadgeStyle,
  claveCliente,
  getWhatsAppLink,
  itemsCrudosVenta
} from '../lib/utils';
import InlineDeleteConfirm from './InlineDeleteConfirm';
import Pagination from './Pagination';

export default function PurchasesView() {
  const { compras, compraAportes, compraPedidos = [], ventas, refreshData } = useData();
  const { role } = useAuth();
  const esAdmin = role?.role === 'admin';
  const miVendedor = role?.vendedor || (role?.nombre === 'Samir' ? 'Samir' : role?.nombre === 'Valentina' ? 'Valentina' : null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoyColombia());
  const [comprador, setComprador] = useState(miVendedor || 'Samir');
  const [observaciones, setObservaciones] = useState('');
  const [aporteSamir, setAporteSamir] = useState(0);
  const [aporteVal, setAporteVal] = useState(0);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);
  const [abonosPorPedido, setAbonosPorPedido] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandirDeudaSamir, setExpandirDeudaSamir] = useState(false);
  const [expandirDeudaVal, setExpandirDeudaVal] = useState(false);

  // Si no es admin, fijar obligatoriamente el comprador al vendedor en sesión
  useEffect(() => {
    if (!esAdmin && miVendedor) {
      setComprador(miVendedor);
    }
  }, [esAdmin, miVendedor, modalAbierto]);

  // 1. Costo total de confección en el sistema
  const costoTotalPedidos = useMemo(() => {
    return ventas.reduce((s, v) => s + costoTotalVenta(v), 0);
  }, [ventas]);

  // 2. Total pagado a Yesenia (sumatoria de aportes registrados)
  const totalAbonadoYesenia = useMemo(() => {
    return compraAportes.reduce((s, a) => s + (Number(a.monto) || 0), 0);
  }, [compraAportes]);

  // 3. Saldo pendiente global con el taller de Yesenia
  const saldoPendienteYesenia = Math.max(costoTotalPedidos - totalAbonadoYesenia, 0);

  // 4. Aportes de capital acumulados por cada socio
  const aportesPorSocio = useMemo(() => {
    let samir = 0;
    let val = 0;
    compraAportes.forEach(a => {
      const m = Number(a.monto) || 0;
      if (a.socio === 'Samir') samir += m;
      else if (a.socio === 'Valentina') val += m;
    });
    return { samir, val };
  }, [compraAportes]);

  // 5. Deuda con Yesenia desglosada por cada socio (Exacto app.v2.js)
  const deudaDetalleSamir = useMemo(() => {
    return calcularDeudaProveedorVendedor('Samir', ventas);
  }, [ventas]);

  const deudaDetalleVal = useMemo(() => {
    return calcularDeudaProveedorVendedor('Valentina', ventas);
  }, [ventas]);

  const totalDeudaSamirYesenia = useMemo(() => {
    return deudaDetalleSamir.reduce((s, d) => s + d.pendiente, 0);
  }, [deudaDetalleSamir]);

  const totalDeudaValYesenia = useMemo(() => {
    return deudaDetalleVal.reduce((s, d) => s + d.pendiente, 0);
  }, [deudaDetalleVal]);

  // Pedidos disponibles que faltan por pagar al proveedor (filtrados por el socio que paga)
  const pedidosPendientesProveedor = useMemo(() => {
    return ventas
      .filter(v => !v.finalizado && normalizarEstado(v.estado) !== 'Liquidado')
      .filter(v => {
        if (comprador === 'Samir') return v.vendedor === 'Samir';
        if (comprador === 'Valentina') return v.vendedor === 'Valentina';
        return true;
      })
      .map(v => {
        const pagos = abonosProveedorPorVentaId(v);
        return { ...v, pendienteProveedor: pagos.pendiente, costoTotal: pagos.costoTotal };
      })
      .filter(v => v.pendienteProveedor > 0);
  }, [ventas, comprador]);

  const toggleSeleccionPedido = (id, pendiente) => {
    setPedidosSeleccionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        setAbonosPorPedido(curr => ({
          ...curr,
          [id]: curr[id] !== undefined ? curr[id] : pendiente
        }));
        return [...prev, id];
      }
    });
  };

  const handleCambioAbonoPedido = (id, val) => {
    setAbonosPorPedido(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleGuardarCompra = async (e) => {
    e.preventDefault();
    const totalAbono = (Number(aporteSamir) || 0) + (Number(aporteVal) || 0);
    if (totalAbono <= 0) {
      setErrorMsg('Ingresa un monto de aporte válido para al menos uno de los socios.');
      return;
    }

    setGuardando(true);
    setErrorMsg('');

    try {
      const horaActual = new Date().toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      // 1. Guardar en compras_proveedor
      const { data: cData, error: cErr } = await supabase
        .from('compras_proveedor')
        .insert([{
          fecha,
          hora: horaActual,
          comprador,
          observaciones: observaciones.trim(),
          costo_total: totalAbono,
          abono_total: totalAbono,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (cErr) throw cErr;

      // 2. Guardar aportes por socio en compra_aportes
      const aportesInserts = [];
      if (Number(aporteSamir) > 0) {
        aportesInserts.push({
          compra_id: cData.id,
          socio: 'Samir',
          monto: Number(aporteSamir),
          fecha
        });
      }
      if (Number(aporteVal) > 0) {
        aportesInserts.push({
          compra_id: cData.id,
          socio: 'Valentina',
          monto: Number(aporteVal),
          fecha
        });
      }

      if (aportesInserts.length > 0) {
        await supabase.from('compra_aportes').insert(aportesInserts);
      }

      // 3. Vincular pedidos cubiertos en compra_pedidos y actualizar abono_yesenia en cada venta
      if (pedidosSeleccionados.length > 0) {
        const detalleInserts = pedidosSeleccionados.map(vId => {
          const vObj = pedidosPendientesProveedor.find(p => p.id === vId);
          const montoPed = abonosPorPedido[vId] !== undefined ? Number(abonosPorPedido[vId]) : (vObj ? vObj.pendienteProveedor : 0);
          return {
            compra_id: cData.id,
            venta_id: vId,
            monto: montoPed
          };
        });
        await supabase.from('compra_pedidos').insert(detalleInserts);

        // Actualizar abono_yesenia e items_camisa en cada pedido afectado en ventas
        for (const vId of pedidosSeleccionados) {
          const vObj = ventas.find(v => v.id === vId);
          if (!vObj) continue;
          const montoPed = abonosPorPedido[vId] !== undefined ? Number(abonosPorPedido[vId]) : (vObj.pendienteProveedor || 0);
          const abonoAnterior = Number(vObj.abono_yesenia) || 0;
          const nuevoAbonoYesenia = abonoAnterior + montoPed;

          let items = itemsCrudosVenta(vObj);
          if (items && items.length) {
            const costos = items.map(it => Number(it.costo) || Number(vObj.costo_unitario) || 0);
            const sumCostos = costos.reduce((a, b) => a + b, 0);
            let asignado = 0;
            items = items.map((it, idx) => {
              const parte = sumCostos > 0
                ? (idx === items.length - 1 ? nuevoAbonoYesenia - asignado : Math.floor(nuevoAbonoYesenia * costos[idx] / sumCostos))
                : Math.floor(nuevoAbonoYesenia / items.length);
              asignado += parte;
              return { ...it, abono_yesenia: parte };
            });
          }

          const upd = {
            compra_id: cData.id,
            abono_yesenia: nuevoAbonoYesenia,
            ...(items ? { items_camisa: JSON.stringify(items) } : {})
          };

          await supabase.from('ventas').update(upd).eq('id', vId);
        }
      }

      await refreshData();
      setModalAbierto(false);
      setAporteSamir(0);
      setAporteVal(0);
      setObservaciones('');
      setPedidosSeleccionados([]);
      setAbonosPorPedido({});
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el abono a Yesenia.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCompra = async (compraId) => {
    try {
      await supabase.from('compra_aportes').delete().eq('compra_id', compraId);
      await supabase.from('compra_pedidos').delete().eq('compra_id', compraId);
      await supabase.from('compras_proveedor').delete().eq('id', compraId);
      await refreshData();
    } catch (err) {
      alert('Error eliminando compra: ' + (err.message || err));
    }
  };

  // Filtrado de visitas con búsqueda profunda (incluye clientes de pedidos de la visita)
  const comprasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return compras;
    const q = busqueda.toLowerCase().trim();
    return compras.filter(c => {
      if ((c.comprador || '').toLowerCase().includes(q)) return true;
      if ((c.observaciones || '').toLowerCase().includes(q)) return true;
      if ((c.fecha || '').includes(q)) return true;
      if (String(c.id).toLowerCase().includes(q)) return true;
      const renglones = compraPedidos.filter(cp => cp.compra_id === c.id);
      const pedidos = renglones.length > 0
        ? renglones.map(r => ventas.find(v => v.id === r.venta_id)).filter(Boolean)
        : ventas.filter(v => v.compra_id === c.id);
      return pedidos.some(p =>
        (p.cliente_nombre || '').toLowerCase().includes(q) ||
        (p.cliente_telefono || '').toLowerCase().includes(q)
      );
    });
  }, [compras, compraPedidos, ventas, busqueda]);

  const pageSize = 12;
  const totalPages = Math.ceil(comprasFiltradas.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const comprasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return comprasFiltradas.slice(start, start + pageSize);
  }, [comprasFiltradas, currentPage, pageSize]);

  // Obtener desglose de pedidos cubiertos en una visita (idéntico a app.v2.js)
  const getDetalleVisita = (c) => {
    const renglones = compraPedidos.filter(cp => cp.compra_id === c.id);
    const pedidos = renglones.length > 0
      ? renglones.map(r => ventas.find(v => v.id === r.venta_id)).filter(Boolean)
      : ventas.filter(v => v.compra_id === c.id);

    const cantidadCamisas = pedidos.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
    const costoTotalConfeccion = pedidos.reduce((s, v) => s + costoTotalVenta(v), 0);
    const aportesCompra = compraAportes.filter(a => a.compra_id === c.id);
    const totalAportado = Math.max(
      aportesCompra.reduce((s, a) => s + (Number(a.monto) || 0), 0),
      Number(c.abono_total) || Number(c.costo_total) || 0
    );
    const saldoPendiente = Math.max(0, costoTotalConfeccion - totalAportado);

    const gruposMap = new Map();
    pedidos.forEach(p => {
      const clave = claveCliente(p);
      if (!gruposMap.has(clave)) {
        gruposMap.set(clave, {
          pedidos: [],
          nombre: p.cliente_nombre || 'Cliente',
          telefono: p.cliente_telefono || ''
        });
      }
      gruposMap.get(clave).pedidos.push(p);
    });

    const grupos = [...gruposMap.values()].map(g => {
      const cant = g.pedidos.reduce((s, pp) => s + (Number(pp.cantidad) || 1), 0);
      const abonoEnVisita = g.pedidos.reduce((s, pp) => {
        if (renglones.length === 0) return s + (Number(pp.abono_yesenia) || 0);
        const r = renglones.find(x => x.venta_id === pp.id);
        return s + (r ? (Number(r.monto) || 0) : 0);
      }, 0);
      const saldoResto = g.pedidos.reduce((s, pp) => s + abonosProveedorPorVentaId(pp.id).pendiente, 0);
      return {
        nombre: g.nombre,
        telefono: g.telefono,
        cantidad: cant,
        pedidosCount: g.pedidos.length,
        abono: abonoEnVisita,
        saldo: saldoResto
      };
    });

    return {
      pedidos,
      cantidadCamisas,
      costoTotalConfeccion,
      aportesCompra,
      totalAportado,
      saldoPendiente,
      grupos
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Abonos al Proveedor (Yesenia)
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
              {compras.length} visitas registradas
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control exacto de pagos de confección, aportes de capital y pedidos cubiertos en el taller.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setModalAbierto(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Nuevo Abono a Yesenia</span>
        </button>
      </div>

      {/* 2. Desglose de Deuda con Yesenia por Cada Socio (Samir y Valentina) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deuda Samir con Yesenia */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm">
                S
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Deuda de Samir con Yesenia</h4>
                <span className="text-xs text-slate-400 font-medium">
                  {deudaDetalleSamir.length} pedido(s) con confección pendiente
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-lg font-black ${totalDeudaSamirYesenia > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {totalDeudaSamirYesenia > 0 ? fmt(totalDeudaSamirYesenia) : 'Al día ✓'}
              </span>
            </div>
          </div>

          {deudaDetalleSamir.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExpandirDeudaSamir(!expandirDeudaSamir)}
                className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1 cursor-pointer"
              >
                <span>{expandirDeudaSamir ? 'Ocultar detalle de pedidos' : `Ver ${deudaDetalleSamir.length} pedidos pendientes`}</span>
                {expandirDeudaSamir ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandirDeudaSamir && (
                <div className="space-y-1.5 mt-2 max-h-52 overflow-y-auto pr-1">
                  {deudaDetalleSamir.map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-800 block truncate">{d.venta.cliente_nombre || 'Cliente'}</span>
                        <span className="text-[10.5px] text-slate-400">{d.venta.fecha || ''} · {d.venta.cantidad || 1} camisas</span>
                      </div>
                      <span className="font-black text-amber-600 shrink-0">{fmt(d.pendiente)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deuda Valentina con Yesenia */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 font-black flex items-center justify-center text-sm">
                V
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Deuda de Valentina con Yesenia</h4>
                <span className="text-xs text-slate-400 font-medium">
                  {deudaDetalleVal.length} pedido(s) con confección pendiente
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-lg font-black ${totalDeudaValYesenia > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {totalDeudaValYesenia > 0 ? fmt(totalDeudaValYesenia) : 'Al día ✓'}
              </span>
            </div>
          </div>

          {deudaDetalleVal.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExpandirDeudaVal(!expandirDeudaVal)}
                className="w-full flex items-center justify-between text-xs font-bold text-violet-600 hover:text-violet-800 py-1 cursor-pointer"
              >
                <span>{expandirDeudaVal ? 'Ocultar detalle de pedidos' : `Ver ${deudaDetalleVal.length} pedidos pendientes`}</span>
                {expandirDeudaVal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandirDeudaVal && (
                <div className="space-y-1.5 mt-2 max-h-52 overflow-y-auto pr-1">
                  {deudaDetalleVal.map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-800 block truncate">{d.venta.cliente_nombre || 'Cliente'}</span>
                        <span className="text-[10.5px] text-slate-400">{d.venta.fecha || ''} · {d.venta.cantidad || 1} camisas</span>
                      </div>
                      <span className="font-black text-amber-600 shrink-0">{fmt(d.pendiente)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Historial de Visitas y Pagos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            Historial de Visitas y Compras ({comprasFiltradas.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por comprador, fecha..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {comprasPaginadas.map((c) => {
              const info = getDetalleVisita(c);

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3.5">
                    {/* Cabecera de Visita */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">Visita #{String(c.id).slice(-4)}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatearFechaHumana(c.fecha)} {c.hora ? `• ${c.hora}` : ''}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200">
                        {c.comprador || 'Samir'}
                      </span>
                    </div>

                    {/* Quiénes Aportaron */}
                    {info.aportesCompra.length > 0 && (
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Aportaron en esta visita:</span>
                        <div className="flex flex-wrap gap-2">
                          {info.aportesCompra.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200/80 font-bold text-[11px] text-slate-800 shadow-2xs">
                              <span className="text-slate-500">{a.socio}:</span>
                              <span className="text-emerald-700 font-black">{fmt(a.monto)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detalle de Pedidos Cubiertos en esta Visita (Como en app.v2.js) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{info.cantidadCamisas} camisa(s) cubiertas</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {info.grupos.length} cliente(s) · {info.pedidos.length} pedido(s)
                        </span>
                      </div>

                      {info.grupos.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {info.grupos.map((g, idx) => {
                            const waLink = getWhatsAppLink(g.telefono);
                            return (
                              <div key={idx} className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-extrabold text-slate-900 truncate">{g.nombre}</span>
                                    {waLink && (
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                        title={`Chatear con ${g.nombre}`}
                                      >
                                        <Phone className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  <span className="font-extrabold text-slate-700 text-[11px] shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-200/60">
                                    ×{g.cantidad} {g.cantidad === 1 ? 'camisa' : 'camisas'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40">
                                  <span className="text-emerald-700 font-bold">
                                    Abono: {fmt(g.abono)}
                                  </span>
                                  <span className={`font-black px-1.5 py-0.5 rounded-md text-[10.5px] ${
                                    g.saldo <= 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {g.saldo <= 0 ? 'Liquidado ✓' : `Saldo ${fmt(g.saldo)}`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-xl text-center">
                          Abono general al taller sin pedidos específicos asignados.
                        </p>
                      )}
                    </div>

                    {c.observaciones && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        "{c.observaciones}"
                      </p>
                    )}
                  </div>

                  {/* Footer de la tarjeta con Totales y Botón Eliminar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Pagado:</span>
                        <span className="text-base font-black text-emerald-600">{fmt(info.totalAportado)}</span>
                      </div>
                      {info.costoTotalConfeccion > 0 && (
                        <div className="text-[10.5px] text-slate-400 font-medium">
                          Costo taller: {fmt(info.costoTotalConfeccion)} · {info.saldoPendiente > 0 ? (
                            <span className="text-amber-600 font-bold">Resta {fmt(info.saldoPendiente)}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Liquidado</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="w-28 shrink-0">
                      <InlineDeleteConfirm
                        onDelete={() => handleEliminarCompra(c.id)}
                        clienteNombre={`Visita #${String(c.id).slice(-4)}`}
                        duration={4000}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {comprasFiltradas.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No hay compras registradas</h3>
              <p className="text-xs text-slate-400 mt-1">Registra tu primer abono a Yesenia con el botón de arriba.</p>
            </div>
          )}
        </div>

        {/* Controles de Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={comprasFiltradas.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="visitas y pagos a Yesenia"
        />
      </div>

      {/* Modal Registrar Nuevo Abono a Yesenia */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Nuevo Abono a Yesenia</h3>
                <p className="text-[11px] text-slate-400">Registra el pago de confección en taller</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleGuardarCompra} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de la visita / pago</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Persona que entregó el dinero</span>
                    {!esAdmin && (
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Fijado para tu usuario ({comprador})
                      </span>
                    )}
                  </label>
                  <select
                    value={comprador}
                    disabled={!esAdmin}
                    onChange={(e) => setComprador(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-colors ${
                      !esAdmin
                        ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Samir">Samir</option>
                    <option value="Valentina">Valentina</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
              </div>

              {/* Aportes individuales por socio */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="font-bold text-indigo-700 block mb-1">Aporte Samir ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={aporteSamir === '' ? '' : aporteSamir}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAporteSamir(val === '' ? '' : (isNaN(Number(val)) ? '' : Number(val)));
                    }}
                    onBlur={() => {
                      if (aporteSamir === '' || isNaN(aporteSamir)) setAporteSamir(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-indigo-700 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-violet-700 block mb-1">Aporte Valentina ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={aporteVal === '' ? '' : aporteVal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAporteVal(val === '' ? '' : (isNaN(Number(val)) ? '' : Number(val)));
                    }}
                    onBlur={() => {
                      if (aporteVal === '' || isNaN(aporteVal)) setAporteVal(0);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-violet-700 outline-none focus:border-violet-500"
                  />
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between text-xs font-black text-slate-800">
                  <span>Total Abono a Yesenia:</span>
                  <span className="text-emerald-600 text-sm">{fmt((Number(aporteSamir) || 0) + (Number(aporteVal) || 0))}</span>
                </div>
              </div>

              {/* Selector de pedidos cubiertos en este abono */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">
                    Pedidos que se pagan en esta visita ({pedidosSeleccionados.length} seleccionados):
                  </label>
                  {pedidosSeleccionados.length > 0 && (
                    <span className="text-[11px] font-black text-indigo-700">
                      Total pedidos: {fmt(
                        pedidosSeleccionados.reduce((s, id) => {
                          const val = abonosPorPedido[id] !== undefined
                            ? Number(abonosPorPedido[id]) || 0
                            : (pedidosPendientesProveedor.find(p => p.id === id)?.pendienteProveedor || 0);
                          return s + val;
                        }, 0)
                      )}
                    </span>
                  )}
                </div>

                {/* Botón rápido para igualar el aporte al total asignado a pedidos */}
                {pedidosSeleccionados.length > 0 && (
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const sum = pedidosSeleccionados.reduce((s, id) => {
                          const val = abonosPorPedido[id] !== undefined
                            ? Number(abonosPorPedido[id]) || 0
                            : (pedidosPendientesProveedor.find(p => p.id === id)?.pendienteProveedor || 0);
                          return s + val;
                        }, 0);
                        if (comprador === 'Valentina') {
                          setAporteVal(sum);
                        } else {
                          setAporteSamir(sum);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer underline"
                    >
                      <span>Copiar suma al aporte de {comprador === 'Valentina' ? 'Valentina' : 'Samir'}</span>
                    </button>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px]">
                  {pedidosPendientesProveedor.map((p) => {
                    const isChecked = pedidosSeleccionados.includes(p.id);
                    const abonoIngresado = abonosPorPedido[p.id] !== undefined ? abonosPorPedido[p.id] : p.pendienteProveedor;
                    const restante = Math.max(p.pendienteProveedor - (Number(abonoIngresado) || 0), 0);

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-200 ring-1 ring-indigo-300/50'
                            : 'hover:bg-slate-100 bg-white border-slate-200/70'
                        }`}
                      >
                        <div
                          onClick={() => toggleSeleccionPedido(p.id, p.pendienteProveedor)}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-800 text-xs block truncate">
                                {p.cliente_nombre || 'Cliente'} <span className="text-slate-400 font-semibold">({p.vendedor || 'Samir'})</span>
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {p.cantidad} camisa(s) · {p.fecha ? formatearFechaHumana(p.fecha) : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Falta Yesenia</span>
                            <span className="font-black text-amber-600 text-xs">
                              {fmt(p.pendienteProveedor)}
                            </span>
                          </div>
                        </div>

                        {/* Campo editable de cuánto se le aporta a este pedido específico */}
                        {isChecked && (
                          <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-indigo-900 block mb-0.5">
                                Aporte / Seña a este pedido ($):
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={abonoIngresado === '' ? '' : abonoIngresado}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleCambioAbonoPedido(p.id, val === '' ? '' : (isNaN(Number(val)) ? '' : Number(val)));
                                }}
                                onBlur={() => {
                                  if (abonoIngresado === '' || isNaN(abonoIngresado)) {
                                    handleCambioAbonoPedido(p.id, 0);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-black text-indigo-700 outline-none focus:border-indigo-500 shadow-2xs"
                                placeholder={`$ Abono (máx ${fmt(p.pendienteProveedor)})`}
                              />
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Restará</span>
                              <span className={`text-xs font-black ${restante <= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {restante <= 0 ? '$0 (Cubierto ✓)' : fmt(restante)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {pedidosPendientesProveedor.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      ✓ No hay pedidos pendientes de pago a Yesenia para {comprador}.
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones / Notas de la visita</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Detalle de entrega de dinero, telas o acuerdos con el taller..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Registrar Abono'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
