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
  Check,
  CheckCircle2,
  Sparkles,
  ShoppingBag
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
  getEstadoBadgeStyle
} from '../lib/utils';

export default function OrdersView({ onOpenNewSale }) {
  const { ventas, updateItemEstado, deleteVenta, updateVenta } = useData();
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [expandedId, setExpandedId] = useState(null);

  const filtros = ['Todos', ...ORDEN_ESTADOS];

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (v.finalizado) return false;
      
      // Filtro de texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const cliente = (v.cliente_nombre || '').toLowerCase();
        const vendedor = (v.vendedor || '').toLowerCase();
        const telefono = (v.telefono || '').toLowerCase();
        if (!cliente.includes(q) && !vendedor.includes(q) && !telefono.includes(q)) {
          return false;
        }
      }

      // Filtro de estado
      if (estadoFiltro !== 'Todos') {
        const items = itemsCrudosVenta(v);
        if (items) {
          const tieneEstado = items.some(it => normalizarEstado(it.estado || v.estado) === estadoFiltro);
          if (!tieneEstado) return false;
        } else {
          if (normalizarEstado(v.estado) !== estadoFiltro) return false;
        }
      }

      return true;
    });
  }, [ventas, busqueda, estadoFiltro]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. CABECERA Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Pedidos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {ventasFiltradas.length} pedidos encontrados
          </p>
        </div>

        {/* Barra de búsqueda amigable */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, teléfono..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all placeholder:text-slate-400 shadow-xs"
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

      {/* 2. CHIPS DE FILTRO DE ESTADO */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filtros.map((filtro) => {
          const isActive = estadoFiltro === filtro;
          return (
            <motion.button
              key={filtro}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEstadoFiltro(filtro)}
              className={`relative px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive ? 'text-indigo-700' : 'text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="filter-pill-active"
                  className="absolute inset-0 bg-indigo-100 border border-indigo-200 rounded-full"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10">{filtro}</span>
            </motion.button>
          );
        })}
      </div>

      {/* 3. LISTADO DE TARJETAS DE PEDIDO CON ANIMATEPRESENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {ventasFiltradas.map((v) => {
            const items = itemsCrudosVenta(v) || [];
            const saldo = saldoCliente(v);
            const total = precioTotalVenta(v);
            const abono = abonoClienteTotal(v);
            const isExpanded = expandedId === v.id;

            return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {(v.cliente_nombre || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate">
                          {v.cliente_nombre}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {v.vendedor || 'Equipo'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getEstadoBadgeStyle(v.estado)}`}>
                      {v.estado || 'Pedido'}
                    </span>
                  </div>

                  {/* Datos del pedido (Teléfono, Fecha entrega, Lugar) */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-2xl">
                    {v.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={`https://wa.me/57${String(v.telefono).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          {v.telefono}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatearFechaHumana(v.fecha_entrega)}</span>
                    </div>

                    {v.lugar_entrega && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{v.lugar_entrega}</span>
                      </div>
                    )}
                  </div>

                  {/* Camisas / Items */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span>{items.length || 1} Camisa(s)</span>
                      {items.length > 0 && (
                        <button
                          onClick={() => toggleExpand(v.id)}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver detalle'}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Previa de camisas */}
                    <div className="space-y-1.5">
                      {items.slice(0, isExpanded ? items.length : 2).map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-800">
                              {it.talla || 'U'} &bull; {it.tipo || 'Polo'}
                            </span>
                            <span className="text-slate-400 ml-1">({it.color || 'Blanco'})</span>
                          </div>

                          {/* Selector de estado de la camisa */}
                          <select
                            value={normalizarEstado(it.estado || v.estado)}
                            onChange={(e) => updateItemEstado(v.id, idx, e.target.value)}
                            className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                          >
                            {ORDEN_ESTADOS.map(est => (
                              <option key={est} value={est}>{est}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer de la tarjeta: Totales y Saldo */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Saldo pendiente</span>
                    <span className={`text-base font-extrabold ${saldo > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {saldo > 0 ? fmt(saldo) : 'Pagado ✓'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Total</span>
                    <span className="text-xs font-bold text-slate-700">{fmt(total)}</span>
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
