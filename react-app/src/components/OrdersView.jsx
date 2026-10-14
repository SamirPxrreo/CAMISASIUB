import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Phone,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  CheckCircle2,
  ShoppingBag,
  Shirt,
  MessageCircle,
  Copy,
  Check,
  Eye,
  ChevronRight,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { exportarListaCompraExcel } from '../lib/excelExport';
import { useData } from '../context/DataContext';
import {
  ORDEN_ESTADOS,
  fmt,
  formatearFechaHumana,
  hoyColombia,
  saldoCliente,
  precioTotalVenta,
  costoTotalVenta,
  precioDeItem,
  costoDeItem,
  estadosTodosLiquidado,
  abonoClienteTotal,
  itemsCrudosVenta,
  normalizarEstado,
  estadoGeneralVenta,
  getEstadoBadgeStyle,
  getWhatsAppLink,
  ESTADOS_PASTEL_CHIP,
  generarTextoResumenPedido,
  getVendedorColor,
  fechaHoraRegistroVenta
} from '../lib/utils';
import InlineDeleteConfirm from './InlineDeleteConfirm';
import Pagination from './Pagination';
import StatusDropdown from './StatusDropdown';
import OrderDetailModal from './OrderDetailModal';
import { useAuth } from '../context/AuthContext';

export default function OrdersView({ onOpenNewSale, onEditOrder }) {
  const { ventas, updateItemEstado, updateOrderEstadoCompleto, deleteVenta, finalizarPedido } = useData();
  const { role } = useAuth();
  const esAdmin = role?.role === 'admin';
  const miNombreVendedor = role?.vendedor || role?.nombre;

  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [copiadoPedidoId, setCopiadoPedidoId] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [exportandoCompra, setExportandoCompra] = useState(false);

  // Mantener actualizado el pedido abierto en el modal
  const activeOrderForModal = useMemo(() => {
    if (!selectedOrderDetail) return null;
    return ventas.find(v => String(v.id) === String(selectedOrderDetail.id)) || selectedOrderDetail;
  }, [ventas, selectedOrderDetail]);

  const handleCopiarPedido = (v) => {
    const texto = generarTextoResumenPedido(v);
    navigator.clipboard.writeText(texto);
    setCopiadoPedidoId(v.id);
    setTimeout(() => setCopiadoPedidoId(null), 2500);
  };

  // Helper para filtrar por vendedor según el rol del usuario o el selector de admin
  const matchVendedor = (vendedorVenta) => {
    if (!esAdmin && miNombreVendedor) {
      return (vendedorVenta || '').trim().toLowerCase() === (miNombreVendedor || '').trim().toLowerCase();
    }
    if (vendedorFiltro !== 'Todos') {
      return (vendedorVenta || '').trim().toLowerCase() === (vendedorFiltro || '').trim().toLowerCase();
    }
    return true;
  };

  // Conteo por estado respetando el vendedor del usuario en sesión o el filtro de admin
  const conteoPorEstado = useMemo(() => {
    const counts = { Todos: 0 };
    ORDEN_ESTADOS.forEach(e => counts[e] = 0);

    ventas.forEach(v => {
      if (v.finalizado) return;
      if (!matchVendedor(v.vendedor)) return;

      counts.Todos += 1;
      const items = itemsCrudosVenta(v);
      if (items && items.length) {
        items.forEach(it => {
          const e = normalizarEstado(it.estado || v.estado);
          if (counts[e] !== undefined) counts[e] += 1;
        });
      } else {
        const e = normalizarEstado(v.estado);
        const cant = Math.max(1, Number(v.cantidad) || 1);
        if (counts[e] !== undefined) counts[e] += cant;
      }
    });
    return counts;
  }, [ventas, esAdmin, miNombreVendedor, vendedorFiltro]);

  const filtros = ['Todos', ...ORDEN_ESTADOS];

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (v.finalizado) return false;
      
      // Filtrar por vendedor según rol o filtro de admin
      if (!matchVendedor(v.vendedor)) return false;

      // Filtro de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const cliente = (v.cliente_nombre || '').toLowerCase();
        const vendedor = (v.vendedor || '').toLowerCase();
        const telefono = (v.cliente_telefono || v.telefono || '').toLowerCase();
        const nota = (v.nota || '').toLowerCase();
        const items = itemsCrudosVenta(v) || [];
        const tieneItemMatch = items.some(it =>
          (it.programa || '').toLowerCase().includes(q) ||
          (it.color || '').toLowerCase().includes(q)
        );

        if (!cliente.includes(q) && !vendedor.includes(q) && !telefono.includes(q) && !nota.includes(q) && !tieneItemMatch) {
          return false;
        }
      }

      // Filtro de estado
      if (estadoFiltro !== 'Todos') {
        const items = itemsCrudosVenta(v);
        if (items && items.length) {
          const tieneEstado = items.some(it => normalizarEstado(it.estado || v.estado) === estadoFiltro);
          if (!tieneEstado) return false;
        } else {
          if (normalizarEstado(v.estado) !== estadoFiltro) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || a.fecha || 0).getTime();
      const timeB = new Date(b.created_at || b.fecha || 0).getTime();
      return timeB - timeA;
    });
  }, [ventas, busqueda, estadoFiltro, esAdmin, miNombreVendedor, vendedorFiltro]);

  const pageSize = 12;
  const totalPages = Math.ceil(ventasFiltradas.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const ventasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return ventasFiltradas.slice(start, start + pageSize);
  }, [ventasFiltradas, currentPage, pageSize]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async (id, clienteNombre) => {
    if (window.confirm(`¿Enviar el pedido de ${clienteNombre || 'este cliente'} a la papelera? Podrás restaurarlo después.`)) {
      await deleteVenta(id);
    }
  };

  // Exportar a Excel con diseño profesional, tabla y filtros únicamente las prendas en estado 'Pedido'
  const handleExportarCompra = async () => {
    setExportandoCompra(true);
    try {
      const vendedorParaExportar = !esAdmin ? miNombreVendedor : vendedorFiltro;
      await exportarListaCompraExcel(ventas, vendedorParaExportar);
    } catch (err) {
      console.warn('Exportar lista de compra:', err);
      alert(err.message || 'Error al exportar la lista de compra.');
    } finally {
      setExportandoCompra(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. CABECERA, BUSCADOR Y FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Gestión de Pedidos
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {ventasFiltradas.length} activos
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tarjetas organizadas con estado por prenda, detalles de entrega y acceso directo a WhatsApp.
          </p>
        </div>

        {/* Buscador, filtro de vendedor y botón Exportar Lista de Compra */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {esAdmin && (
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-xs outline-none cursor-pointer"
            >
              <option value="Todos">Todos los socios</option>
              <option value="Samir">Samir</option>
              <option value="Valentina">Valentina</option>
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente, bordado..."
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 focus:border-indigo-500 text-xs font-medium outline-none transition-all placeholder:text-slate-400 shadow-xs"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportarCompra}
            disabled={exportandoCompra}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-60"
            title="Exportar a Excel (.xlsx) con tablas y filtros las camisas en estado 'Pedido' para confeccionar/comprar"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span className="hidden sm:inline">
              {exportandoCompra ? 'Generando Excel...' : 'Exportar por Comprar'}
            </span>
            <span className="sm:hidden">
              {exportandoCompra ? 'Excel...' : 'Por Comprar'}
            </span>
            {conteoPorEstado['Pedido'] > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-800 text-emerald-100 text-[10px] font-black shrink-0">
                {conteoPorEstado['Pedido']}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. CHIPS DE FILTRO DE ESTADO EN TONOS PASTEL CON CONTEOS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filtros.map((filtro) => {
          const isActive = estadoFiltro === filtro;
          const count = conteoPorEstado[filtro] || 0;
          const chipStyle = ESTADOS_PASTEL_CHIP[filtro] || {
            active: 'bg-indigo-100 text-indigo-950 border-indigo-300 shadow-xs',
            pill: 'bg-indigo-300 text-indigo-950'
          };

          return (
            <motion.button
              key={filtro}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setEstadoFiltro(filtro)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? `${chipStyle.active} border`
                  : 'text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>{filtro}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isActive ? chipStyle.pill : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 3. LISTADO DE TARJETAS EN CUADROS CON ORDEN LOGICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {ventasPaginadas.map((v) => {
            const items = itemsCrudosVenta(v) || [];
            const saldo = saldoCliente(v);
            const total = precioTotalVenta(v);
            const abono = abonoClienteTotal(v);
            const tel = v.cliente_telefono || v.telefono || '';
            const waLink = getWhatsAppLink(tel);
            const vCol = getVendedorColor(v.vendedor);
            const estadoGral = estadoGeneralVenta(v);
            const todasLiquidadas = estadosTodosLiquidado(v);

            return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* 1. ENCABEZADO: CLIENTE, VENDEDOR Y ESTADO GENERAL */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${vCol.bg} ${vCol.border} ${vCol.text}`}>
                        {(v.cliente_nombre || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-sm leading-tight truncate" title={v.cliente_nombre}>
                          {v.cliente_nombre}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-lg font-black text-[10.5px] border ${vCol.badge}`}>
                            {v.vendedor || 'Samir'}
                          </span>
                          {tel && (
                            <span className="font-mono text-slate-500 flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {tel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Estado General Fijo (Mixto o el estado unánime) */}
                    <div className="shrink-0">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full border shadow-2xs ${getEstadoBadgeStyle(estadoGral)}`}>
                        {estadoGral}
                      </span>
                    </div>
                  </div>

                  {/* 2. FECHAS: REGISTRO (CON HORA) Y ENTREGA */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <span className="text-[9.5px] text-slate-400 font-bold block uppercase tracking-wider leading-none">Registro</span>
                        <span className="font-bold text-slate-700 leading-tight block mt-0.5">
                          {fechaHoraRegistroVenta(v)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 border-l border-slate-200/70 pl-2.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="truncate">
                        <span className="text-[9.5px] text-slate-400 font-bold block uppercase tracking-wider leading-none">Entrega</span>
                        <span className="font-bold text-slate-700 leading-tight block mt-0.5">
                          {v.fecha_entrega ? formatearFechaHumana(v.fecha_entrega) : 'Por definir'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. RESUMEN LIMPIO DE PRENDAS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] text-slate-400">
                        <Shirt className="w-3.5 h-3.5 text-indigo-500" />
                        Prendas ({items.length || 1})
                      </span>
                      {v.lugar_entrega && (
                        <span className="flex items-center gap-1 text-[10.5px] text-slate-500 font-semibold truncate max-w-[150px]" title={v.lugar_entrega}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{v.lugar_entrega}</span>
                        </span>
                      )}
                    </div>

                    {/* Lista concisa de prendas */}
                    <div className="space-y-1">
                      {items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-lg bg-white border border-slate-200/80 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-[11.5px] truncate">
                              {it.genero === 'Hombre' ? 'Hombre' : 'Mujer'} · {it.color || 'Color'} · Talla {it.talla || 'U'}
                              {it.modelo === 'Nuevo' && ' · v2'}
                            </span>
                            {it.programa && (
                              <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100/80 truncate max-w-[110px]" title={it.programa}>
                                {it.programa}
                              </span>
                            )}
                          </div>

                          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border shrink-0 ${getEstadoBadgeStyle(it.estado || v.estado)}`}>
                            {it.estado || v.estado || 'Pedido'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {v.nota && (
                      <p className="text-[11px] text-slate-500 italic px-2.5 py-1.5 bg-amber-50/60 rounded-xl border border-amber-100/70 leading-snug">
                        "{v.nota}"
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. PIE DE TARJETA: SALDOS Y BOTONES COMPACTOS */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-black block uppercase tracking-wider">Saldo</span>
                      <span className={`text-base font-black ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {saldo > 0 ? `Resta ${fmt(saldo)}` : 'Pagado ✓'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9.5px] text-slate-400 font-black block uppercase tracking-wider">Total / Abono</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {fmt(total)} <span className="text-emerald-600 font-semibold">({fmt(abono)})</span>
                      </span>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN: Botón principal "Ver detalle" + Accesos rápidos */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {/* Botón Principal: Ver Detalle */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetail(v)}
                      className="flex-1 py-2 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black border border-indigo-200/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span>Ver detalle</span>
                    </button>

                    {/* Si está 100% liquidado, acceso directo a Finalizar */}
                    {todasLiquidadas && (
                      <button
                        type="button"
                        onClick={() => finalizarPedido(v.id)}
                        className="p-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                        title="¡Todas las prendas están liquidadas! Clic para finalizar pedido"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Rápido: WhatsApp */}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {/* Botón Rápido: Copiar Pedido */}
                    <button
                      type="button"
                      onClick={() => handleCopiarPedido(v)}
                      className={`p-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                        copiadoPedidoId === v.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={copiadoPedidoId === v.id ? '¡Copiado!' : 'Copiar resumen para WhatsApp'}
                    >
                      {copiadoPedidoId === v.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Botón Rápido: Editar */}
                    {onEditOrder && (
                      <button
                        type="button"
                        onClick={() => onEditOrder(v)}
                        className="p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer shrink-0"
                        title="Editar pedido"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Rápido: Borrar / Papelera */}
                    <InlineDeleteConfirm
                      onDelete={() => deleteVenta(v.id)}
                      clienteNombre={v.cliente_nombre}
                      duration={4500}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {ventasFiltradas.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No se encontraron pedidos</h3>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros o la búsqueda.</p>
          </div>
        )}
      </div>

      {/* 4. CONTROLES DE PAGINACIÓN */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={ventasFiltradas.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="pedidos"
      />

      {/* 5. VENTANA MODAL DE DETALLE DE TODAS LAS PRENDAS */}
      <OrderDetailModal
        isOpen={!!selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
        order={activeOrderForModal}
        onEditOrder={onEditOrder}
      />
    </div>
  );
}
