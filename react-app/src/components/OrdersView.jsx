import React, { useState, useMemo } from 'react';
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
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  ORDEN_ESTADOS,
  fmt,
  formatearFechaHumana,
  saldoCliente,
  precioTotalVenta,
  abonoClienteTotal,
  itemsCrudosVenta,
  normalizarEstado,
  getEstadoBadgeStyle,
  getWhatsAppLink,
  ESTADOS_PASTEL_CHIP,
  generarTextoResumenPedido
} from '../lib/utils';
import InlineDeleteConfirm from './InlineDeleteConfirm';

export default function OrdersView({ onOpenNewSale, onEditOrder }) {
  const { ventas, updateItemEstado, deleteVenta } = useData();
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [expandedId, setExpandedId] = useState(null);
  const [copiadoPedidoId, setCopiadoPedidoId] = useState(null);

  const handleCopiarPedido = (v) => {
    const texto = generarTextoResumenPedido(v);
    navigator.clipboard.writeText(texto);
    setCopiadoPedidoId(v.id);
    setTimeout(() => setCopiadoPedidoId(null), 2500);
  };

  // Conteo por estado
  const conteoPorEstado = useMemo(() => {
    const counts = { Todos: 0 };
    ORDEN_ESTADOS.forEach(e => counts[e] = 0);
    ventas.forEach(v => {
      if (v.finalizado) return;
      counts.Todos += 1;
      const items = itemsCrudosVenta(v);
      if (items && items.length) {
        items.forEach(it => {
          const e = normalizarEstado(it.estado || v.estado);
          if (counts[e] !== undefined) counts[e] += 1;
        });
      } else {
        const e = normalizarEstado(v.estado);
        if (counts[e] !== undefined) counts[e] += 1;
      }
    });
    return counts;
  }, [ventas]);

  const filtros = ['Todos', ...ORDEN_ESTADOS];

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (v.finalizado) return false;
      
      // Filtro de vendedor
      if (vendedorFiltro !== 'Todos') {
        if (v.vendedor !== vendedorFiltro) return false;
      }

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
    });
  }, [ventas, busqueda, estadoFiltro, vendedorFiltro]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleDelete = async (id, clienteNombre) => {
    if (window.confirm(`¿Enviar el pedido de ${clienteNombre || 'este cliente'} a la papelera? Podrás restaurarlo después.`)) {
      await deleteVenta(id);
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

        {/* Buscador y filtro de vendedor */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={vendedorFiltro}
            onChange={(e) => setVendedorFiltro(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-xs outline-none cursor-pointer"
          >
            <option value="Todos">Todos los socios</option>
            <option value="Samir">Samir</option>
            <option value="Valentina">Valentina</option>
          </select>

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
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
          {ventasFiltradas.map((v) => {
            const items = itemsCrudosVenta(v) || [];
            const saldo = saldoCliente(v);
            const total = precioTotalVenta(v);
            const abono = abonoClienteTotal(v);
            const isExpanded = expandedId === v.id;
            const tel = v.cliente_telefono || v.telefono || '';
            const waLink = getWhatsAppLink(tel);

            return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="bg-white rounded-[28px] border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* SECCIÓN 1: ENCABEZADO DEL CLIENTE Y ESTADO GENERAL */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                        {(v.cliente_nombre || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-sm truncate">
                          {v.cliente_nombre}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold flex-wrap">
                          <span className="text-indigo-600 font-bold">{v.vendedor || 'Samir'}</span>
                          {tel && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-500 flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {tel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Insignia de estado general */}
                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border shadow-2xs shrink-0 ${getEstadoBadgeStyle(v.estado)}`}>
                      {v.estado || 'Pedido'}
                    </span>
                  </div>

                  {/* SECCIÓN 2: PRENDAS / CAMISAS POLO DEL PEDIDO */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span className="flex items-center gap-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        <Shirt className="w-3.5 h-3.5 text-indigo-500" />
                        Prendas ({items.length || 1})
                      </span>
                      {items.length > 2 && (
                        <button
                          onClick={() => toggleExpand(v.id)}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
                        >
                          {isExpanded ? 'Ver menos' : `Ver todas (${items.length})`}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(isExpanded ? items : items.slice(0, 2)).map((it, idx) => {
                        const estadoItem = normalizarEstado(it.estado || v.estado);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-black text-slate-800 text-xs truncate">
                                {it.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1'} • {it.color || 'Color'} • Talla {it.talla || 'U'} ({it.genero === 'Mujer' ? 'M' : 'H'})
                              </div>
                              {it.programa && (
                                <div className="text-[11px] text-indigo-600 font-bold truncate">
                                  Bordado: {it.programa}
                                </div>
                              )}
                            </div>

                            {/* Selector individual de estado con colores vivos */}
                            <select
                              value={estadoItem}
                              onChange={(e) => updateItemEstado(v.id, idx, e.target.value)}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border outline-none cursor-pointer shrink-0 ${getEstadoBadgeStyle(estadoItem)}`}
                            >
                              {ORDEN_ESTADOS.map(est => (
                                <option key={est} value={est}>{est}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECCIÓN 3: LOGÍSTICA DE ENTREGA Y NOTAS */}
                  <div className="space-y-1 text-xs text-slate-600 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">
                        {v.fecha_entrega ? `Entrega: ${formatearFechaHumana(v.fecha_entrega)}` : 'Fecha de entrega por definir'}
                      </span>
                    </div>

                    {v.lugar_entrega && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{v.lugar_entrega}</span>
                      </div>
                    )}

                    {v.nota && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                        "{v.nota}"
                      </p>
                    )}
                  </div>
                </div>

                {/* SECCIÓN 4: TOTALES FINANCIEROS Y BOTONES DE ACCIÓN */}
                <div className="pt-3 border-t border-slate-100 space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Saldo</span>
                      <span className={`text-base font-black ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {saldo > 0 ? fmt(saldo) : 'Pagado ✓'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total / Abono</span>
                      <div className="text-xs font-bold text-slate-800">
                        {fmt(total)} <span className="text-emerald-600 font-semibold">({fmt(abono)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Fila de Botones: Copiar Pedido, WhatsApp, Editar, Borrar */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {/* Botón Copiar Pedido */}
                    <button
                      type="button"
                      onClick={() => handleCopiarPedido(v)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        copiadoPedidoId === v.id
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700'
                      }`}
                      title="Copiar resumen del pedido completo"
                    >
                      {copiadoPedidoId === v.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>¡Copiado! ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Copiar Pedido</span>
                        </>
                      )}
                    </button>

                    {/* Botón WhatsApp directo (sin texto preestablecido) */}
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Abrir chat en WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 text-slate-300 text-xs font-bold cursor-not-allowed"
                        title="Sin teléfono registrado"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-slate-300" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {/* Botón Editar Pedido */}
                    <button
                      type="button"
                      onClick={() => onEditOrder && onEditOrder(v)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {/* Botón Papelera con microinteracción Bencho Confirm */}
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
    </div>
  );
}
