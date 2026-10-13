import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  Calendar,
  MapPin,
  Shirt,
  DollarSign,
  MessageCircle,
  Copy,
  Check,
  Edit,
  User,
  Sparkles,
  Info
} from 'lucide-react';
import StatusDropdown from './StatusDropdown';
import { useData } from '../context/DataContext';
import {
  fmt,
  formatearFechaHumana,
  precioTotalVenta,
  abonoClienteTotal,
  saldoCliente,
  getWhatsAppLink,
  itemsCrudosVenta,
  generarMensajeWhatsApp,
  getEstadoBadgeStyle,
  normalizarEstado
} from '../lib/utils';

export default function OrderDetailModal({ isOpen, onClose, order, onEditOrder }) {
  const { updateItemEstado, colores } = useData();
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || !order) return null;

  const items = itemsCrudosVenta(order) || [];
  const tel = order.cliente_telefono || order.telefono || '';
  const waLink = getWhatsAppLink(tel);
  const total = precioTotalVenta(order);
  const abono = abonoClienteTotal(order);
  const saldo = saldoCliente(order);

  const handleCopiarWhatsApp = () => {
    const texto = generarMensajeWhatsApp(order);
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const getColorHex = (nombreColor) => {
    const c = colores?.find(col => col.nombre.toLowerCase() === String(nombreColor || '').toLowerCase());
    return c?.hex || '#cbd5e1';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop con desenfoque suave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-slate-100 p-5 sm:p-7 z-10 max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* 1. ENCABEZADO */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                {(order.cliente_nombre || 'C')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                    {order.cliente_nombre || 'Sin nombre'}
                  </h2>
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${getEstadoBadgeStyle(order.estado)}`}>
                    {order.estado || 'Pedido'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5 flex-wrap">
                  <span className="font-bold text-indigo-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {order.vendedor || 'Samir'}
                  </span>
                  {tel && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{tel}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. CONTENIDO DESPLAZABLE */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Tarjeta de Resumen Financiero y Logística */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total del Pedido</span>
                <span className="text-base font-black text-slate-900 block mt-0.5">{fmt(total)}</span>
                <span className="text-[11px] text-slate-500">{items.length} prenda{items.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Total Abonado</span>
                <span className="text-base font-black text-emerald-700 block mt-0.5">{fmt(abono)}</span>
                <span className="text-[11px] text-emerald-600 font-semibold">{total > 0 ? `${Math.round((abono / total) * 100)}% pagado` : '100%'}</span>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                saldo > 0 ? 'bg-amber-50/60 border-amber-200/70' : 'bg-emerald-50/60 border-emerald-200/70'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  Saldo Pendiente
                </span>
                <span className={`text-base font-black block mt-0.5 ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {saldo > 0 ? fmt(saldo) : 'Al día (Liquidado)'}
                </span>
                <span className="text-[11px] text-slate-500">{saldo > 0 ? 'Por cobrar al entregar' : 'Pagado completo'}</span>
              </div>
            </div>

            {/* Datos de Entrega y Notas */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">Fecha de Entrega:</span>
                  <span className="font-bold text-slate-900">
                    {order.fecha_entrega ? formatearFechaHumana(order.fecha_entrega) : 'Por definir'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">Lugar:</span>
                  <span className="font-bold text-slate-900">
                    {order.lugar_entrega || 'Sin asignar'}
                  </span>
                </div>
              </div>

              {order.nota && (
                <div className="pt-2 border-t border-slate-200/50 flex items-start gap-1.5 text-slate-500 italic">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Nota: {order.nota}</span>
                </div>
              )}
            </div>

            {/* LISTA DE PRENDAS DEL PEDIDO */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Shirt className="w-4 h-4 text-indigo-600" />
                  Prendas del Pedido ({items.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  Toca el estado de cada una para actualizarlo
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((it, idx) => {
                  const estadoItem = normalizarEstado(it.estado || order.estado);
                  const hex = getColorHex(it.color);

                  return (
                    <motion.div
                      key={idx}
                      layout
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {/* Insignia con número de prenda */}
                        <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs shrink-0">
                          #{idx + 1}
                        </div>

                        {/* Muestra visual del color */}
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0 mt-1 sm:mt-0"
                          style={{ backgroundColor: hex }}
                          title={it.color}
                        />

                        {/* Descripción clara y sin ambigüedades */}
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                            <span>{it.genero === 'Hombre' ? 'Hombre' : 'Mujer'} {it.color || 'Negro'} Talla {it.talla || 'S'}</span>
                            {it.modelo === 'Nuevo' && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                v2
                              </span>
                            )}
                          </div>

                          {it.programa ? (
                            <div className="text-[11px] font-bold text-indigo-600 mt-0.5 break-words">
                              Bordado: {it.programa}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Sin bordado específico
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selector de estado animado para esta camisa */}
                      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <StatusDropdown
                          value={estadoItem}
                          onChange={(nuevoEstado) => updateItemEstado(order.id, idx, nuevoEstado)}
                          size="md"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. PIE CON ACCIONES RÁPIDAS */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopiarWhatsApp}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  copiado
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? '¡Copiado!' : 'Copiar para WhatsApp'}</span>
              </button>

              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onEditOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditOrder(order);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Editar Pedido</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
