import React, { useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
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
  claveCliente
} from '../lib/utils';
import InlineDeleteConfirm from './InlineDeleteConfirm';

export default function PurchasesView() {
  const { compras, compraAportes, ventas, refreshData } = useData();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoyColombia());
  const [comprador, setComprador] = useState('Samir');
  const [observaciones, setObservaciones] = useState('');
  const [aporteSamir, setAporteSamir] = useState(0);
  const [aporteVal, setAporteVal] = useState(0);
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [expandirDeudaSamir, setExpandirDeudaSamir] = useState(false);
  const [expandirDeudaVal, setExpandirDeudaVal] = useState(false);

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

  // Pedidos disponibles que faltan por pagar al proveedor
  const pedidosPendientesProveedor = useMemo(() => {
    return ventas
      .filter(v => !v.finalizado && normalizarEstado(v.estado) !== 'Liquidado')
      .map(v => {
        const pagos = abonosProveedorPorVentaId(v);
        return { ...v, pendienteProveedor: pagos.pendiente, costoTotal: pagos.costoTotal };
      })
      .filter(v => v.pendienteProveedor > 0);
  }, [ventas]);

  const toggleSeleccionPedido = (id) => {
    setPedidosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

      // 3. Vincular pedidos cubiertos en compra_pedidos si se seleccionaron
      if (pedidosSeleccionados.length > 0) {
        const detalleInserts = pedidosSeleccionados.map(vId => {
          const vObj = pedidosPendientesProveedor.find(p => p.id === vId);
          return {
            compra_id: cData.id,
            venta_id: vId,
            monto: vObj ? vObj.pendienteProveedor : 0
          };
        });
        await supabase.from('compra_pedidos').insert(detalleInserts);
      }

      await refreshData();
      setModalAbierto(false);
      setAporteSamir(0);
      setAporteVal(0);
      setObservaciones('');
      setPedidosSeleccionados([]);
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

  // Filtrado de visitas
  const comprasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return compras;
    const q = busqueda.toLowerCase().trim();
    return compras.filter(c =>
      (c.comprador || '').toLowerCase().includes(q) ||
      (c.observaciones || '').toLowerCase().includes(q) ||
      (c.fecha || '').includes(q)
    );
  }, [compras, busqueda]);

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

      {/* 2. Tarjetas KPI Generales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Costo Total Confección</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{fmt(costoTotalPedidos)}</span>
          <span className="text-xs text-slate-400 mt-0.5 block">Costo base acumulado</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/70 border border-emerald-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">Total Pagado a Yesenia</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{fmt(totalAbonadoYesenia)}</span>
          <span className="text-xs text-emerald-700/80 font-semibold mt-0.5 block">Suma de aportes entregados</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 border border-amber-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">Saldo Pendiente Yesenia</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{fmt(saldoPendienteYesenia)}</span>
          <span className="text-xs text-amber-700/80 font-semibold mt-0.5 block">Faltante por liquidar al taller</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-indigo-700 uppercase tracking-wider block">Aportes por Socio</span>
          <div className="text-xs font-bold text-slate-800 mt-1 space-y-0.5">
            <div>Samir: <span className="text-indigo-600 font-black">{fmt(aportesPorSocio.samir)}</span></div>
            <div>Valentina: <span className="text-violet-600 font-black">{fmt(aportesPorSocio.val)}</span></div>
          </div>
        </div>
      </div>

      {/* 3. Desglose de Deuda con Yesenia por Cada Socio (Exacto app.v2.js) */}
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
            {comprasFiltradas.map((c) => {
              const aportesCompra = compraAportes.filter(a => a.compra_id === c.id);
              const totalPagado = c.abono_total || c.costo_total || aportesCompra.reduce((s, a) => s + (Number(a.monto) || 0), 0);

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
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

                    {c.observaciones && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                        "{c.observaciones}"
                      </p>
                    )}

                    {/* Aportes de socios en esta visita */}
                    {aportesCompra.length > 0 && (
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Aportaron:</span>
                        {aportesCompra.map((a, i) => (
                          <div key={i} className="flex justify-between p-1.5 rounded-xl bg-slate-50 text-[11px]">
                            <span className="font-bold text-slate-700">{a.socio}:</span>
                            <span className="font-black text-slate-900">{fmt(a.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Total Pagado</span>
                      <span className="text-base font-black text-emerald-600">{fmt(totalPagado)}</span>
                    </div>

                    <div className="w-32">
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
                  <label className="font-bold text-slate-700 block mb-1">Persona que entregó el dinero</label>
                  <select
                    value={comprador}
                    onChange={(e) => setComprador(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
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
                    value={aporteSamir}
                    onChange={(e) => setAporteSamir(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-indigo-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-violet-700 block mb-1">Aporte Valentina ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={aporteVal}
                    onChange={(e) => setAporteVal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-violet-700 outline-none"
                  />
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between text-xs font-black text-slate-800">
                  <span>Total Abono a Yesenia:</span>
                  <span className="text-emerald-600 text-sm">{fmt((Number(aporteSamir) || 0) + (Number(aporteVal) || 0))}</span>
                </div>
              </div>

              {/* Selector de pedidos cubiertos en este abono */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pedidos que se están pagando en esta visita ({pedidosSeleccionados.length} seleccionados):
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-2xl border border-slate-200 text-[11px]">
                  {pedidosPendientesProveedor.map((p) => {
                    const isChecked = pedidosSeleccionados.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSeleccionPedido(p.id)}
                        className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                          isChecked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-100 bg-white border border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold text-slate-800 truncate">
                            {p.cliente_nombre || 'Cliente'} ({p.vendedor || 'Samir'})
                          </span>
                        </div>
                        <span className="font-black text-amber-600 shrink-0">
                          Falta: {fmt(p.pendienteProveedor)}
                        </span>
                      </div>
                    );
                  })}
                  {pedidosPendientesProveedor.length === 0 && (
                    <div className="text-center py-3 text-slate-400">
                      ✓ Todos los pedidos están al día con el taller de Yesenia.
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
