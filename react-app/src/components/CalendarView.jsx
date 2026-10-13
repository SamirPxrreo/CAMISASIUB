import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Shirt,
  AlertCircle,
  Pencil,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  fmt,
  formatearFechaHumana,
  saldoCliente,
  precioTotalVenta,
  abonoClienteTotal,
  itemsCrudosVenta,
  normalizarEstado,
  getEstadoBadgeStyle,
  getWhatsAppLink,
  generarMensajeWhatsApp,
  generarTextoResumenPedido,
  hoyColombia
} from '../lib/utils';

export default function CalendarView({ onEditOrder }) {
  const { ventas } = useData();
  const [vista, setVista] = useState('proximos'); // 'proximos' | 'mes' | 'sin-fecha'
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyColombia());
  const [copiadoId, setCopiadoId] = useState(null);
  const [copiadoPedidoId, setCopiadoPedidoId] = useState(null);

  // Fecha actual en Colombia
  const hoyStr = hoyColombia();

  // Filtrar pedidos no finalizados
  const pedidosActivos = useMemo(() => {
    return ventas.filter(v => !v.finalizado);
  }, [ventas]);

  // Contadores para métricas rápidas
  const metricas = useMemo(() => {
    let entregasHoy = 0;
    let entregasSemana = 0;
    let sinFecha = 0;
    let totalCamisasHoy = 0;
    let saldoHoy = 0;

    const hoyDate = new Date(hoyStr + 'T00:00:00');
    const finSemanaDate = new Date(hoyDate);
    finSemanaDate.setDate(finSemanaDate.getDate() + 7);

    pedidosActivos.forEach(v => {
      const f = v.fecha_entrega;
      const cant = Number(v.cantidad) || 1;
      const saldo = saldoCliente(v);

      if (!f) {
        sinFecha += 1;
        return;
      }

      if (f === hoyStr) {
        entregasHoy += 1;
        totalCamisasHoy += cant;
        saldoHoy += saldo;
      }

      const fDate = new Date(f + 'T00:00:00');
      if (fDate >= hoyDate && fDate <= finSemanaDate) {
        entregasSemana += 1;
      }
    });

    return { entregasHoy, entregasSemana, sinFecha, totalCamisasHoy, saldoHoy };
  }, [pedidosActivos, hoyStr]);

  // Manejar copiado de mensaje recordatorio de WhatsApp
  const handleCopiarMensaje = (v) => {
    const texto = generarMensajeWhatsApp(v);
    navigator.clipboard.writeText(texto);
    setCopiadoId(v.id);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // Manejar copiado de resumen completo del pedido
  const handleCopiarPedido = (v) => {
    const texto = generarTextoResumenPedido(v);
    navigator.clipboard.writeText(texto);
    setCopiadoPedidoId(v.id);
    setTimeout(() => setCopiadoPedidoId(null), 2500);
  };

  // Agrupar pedidos por fecha de entrega
  const pedidosAgrupadosPorFecha = useMemo(() => {
    const grupos = new Map();

    const filtrados = pedidosActivos.filter(v => {
      if (vendedorFiltro !== 'Todos' && v.vendedor !== vendedorFiltro) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const cli = (v.cliente_nombre || '').toLowerCase();
        const tel = (v.cliente_telefono || v.telefono || '').toLowerCase();
        const lug = (v.lugar_entrega || '').toLowerCase();
        if (!cli.includes(q) && !tel.includes(q) && !lug.includes(q)) return false;
      }

      if (vista === 'sin-fecha') {
        return !v.fecha_entrega;
      } else if (vista === 'mes') {
        return v.fecha_entrega === diaSeleccionado;
      }
      return Boolean(v.fecha_entrega);
    });

    filtrados.forEach(v => {
      const f = v.fecha_entrega || 'Sin fecha asignada';
      if (!grupos.has(f)) {
        grupos.set(f, []);
      }
      grupos.get(f).push(v);
    });

    // Ordenar fechas cronológicamente
    const fechasOrdenadas = [...grupos.keys()].sort((a, b) => {
      if (a === 'Sin fecha asignada') return 1;
      if (b === 'Sin fecha asignada') return -1;
      return a.localeCompare(b);
    });

    return fechasOrdenadas.map(f => ({
      fecha: f,
      pedidos: grupos.get(f)
    }));
  }, [pedidosActivos, vendedorFiltro, busqueda, vista, diaSeleccionado]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Calendario de Entregas
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              {metricas.entregasHoy} para hoy
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organización diaria de entregas, recordatorios para clientes y acceso directo a WhatsApp.
          </p>
        </div>

        {/* Selector de Vendedor y Buscador */}
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

          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente, lugar..."
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium outline-none shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Tarjetas KPI del Calendario */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-indigo-800 uppercase tracking-wider block">Entregas de Hoy</span>
          <span className="text-2xl font-black text-indigo-900 mt-1 block">{metricas.entregasHoy}</span>
          <span className="text-xs text-indigo-700/80 font-semibold mt-0.5 block">{metricas.totalCamisasHoy} camisas · Saldo: {fmt(metricas.saldoHoy)}</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/70 border border-emerald-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider block">Próximos 7 Días</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{metricas.entregasSemana}</span>
          <span className="text-xs text-emerald-700/80 font-semibold mt-0.5 block">Entregas programadas</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 border border-amber-100 shadow-xs">
          <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">Sin Fecha Definida</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{metricas.sinFecha}</span>
          <span className="text-xs text-amber-700/80 font-semibold mt-0.5 block">Pendientes por agendar</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Total Activos</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{pedidosActivos.length}</span>
          <span className="text-xs text-slate-400 font-semibold mt-0.5 block">En proceso de entrega</span>
        </div>
      </div>

      {/* 3. Selector de Pestañas de Vista */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setVista('proximos')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            vista === 'proximos'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Próximas Entregas (Cronológico)
        </button>

        <button
          onClick={() => setVista('mes')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            vista === 'mes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Por Día Específico</span>
        </button>

        <button
          onClick={() => setVista('sin-fecha')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
            vista === 'sin-fecha'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Sin Fecha ({metricas.sinFecha})</span>
        </button>
      </div>

      {/* Selector de Día Específico si vista === 'mes' */}
      {vista === 'mes' && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Selecciona el día a consultar:
            </label>
            <input
              type="date"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
              className="mt-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black outline-none"
            />
          </div>
          <button
            onClick={() => setDiaSeleccionado(hoyStr)}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
          >
            Ir a Hoy
          </button>
        </div>
      )}

      {/* 4. Lista Agrupada de Entregas por Fecha */}
      <div className="space-y-6">
        <AnimatePresence>
          {pedidosAgrupadosPorFecha.map((grupo) => {
            const esHoy = grupo.fecha === hoyStr;
            const esSinFecha = grupo.fecha === 'Sin fecha asignada';

            return (
              <motion.div
                key={grupo.fecha}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Cabecera de la Fecha */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      esHoy
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : esSinFecha
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      <CalendarIcon className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        {esSinFecha
                          ? 'Pedidos sin fecha asignada'
                          : formatearFechaHumana(grupo.fecha)}
                        {esHoy && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            ¡HOY!
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {grupo.pedidos.length} pedido(s) programados
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-black text-slate-500">
                    Total: {fmt(grupo.pedidos.reduce((s, p) => s + precioTotalVenta(p), 0))}
                  </span>
                </div>

                {/* Tarjetas de Pedidos de ese día */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grupo.pedidos.map((v) => {
                    const items = itemsCrudosVenta(v) || [];
                    const saldo = saldoCliente(v);
                    const total = precioTotalVenta(v);
                    const abono = abonoClienteTotal(v);
                    const tel = v.cliente_telefono || v.telefono || '';
                    const waLink = getWhatsAppLink(tel);

                    return (
                      <div
                        key={v.id}
                        className="bg-white rounded-[26px] border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Cliente y Estado */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-black text-slate-900 text-sm truncate">
                                {v.cliente_nombre}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold mt-0.5">
                                <span className="text-indigo-600 font-bold">{v.vendedor || 'Samir'}</span>
                                {tel && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-600 flex items-center gap-0.5">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {tel}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <span className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border ${getEstadoBadgeStyle(v.estado)}`}>
                              {v.estado || 'Pedido'}
                            </span>
                          </div>

                          {/* Prendas */}
                          <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100 text-xs">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                              Prendas ({items.length || v.cantidad || 1}):
                            </span>
                            {items.slice(0, 3).map((it, idx) => (
                              <div key={idx} className="font-bold text-slate-800 text-[11.5px] truncate">
                                • {it.modelo === 'Nuevo' ? 'V2' : 'V1'} {it.color} Talla {it.talla} ({it.genero === 'Mujer' ? 'M' : 'H'})
                                {it.programa && <span className="text-indigo-600 font-normal"> · {it.programa}</span>}
                              </div>
                            ))}
                            {items.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                + {items.length - 3} prenda(s) más
                              </span>
                            )}
                          </div>

                          {/* Lugar de entrega */}
                          {v.lugar_entrega && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-semibold truncate">{v.lugar_entrega}</span>
                            </div>
                          )}

                          {v.nota && (
                            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                              "{v.nota}"
                            </p>
                          )}
                        </div>

                        {/* Footer con Saldo y Botones de Copiar / WhatsApp */}
                        <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-3">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Saldo</span>
                              <span className={`text-base font-black ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {saldo > 0 ? fmt(saldo) : 'Pagado ✓'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Total / Abono</span>
                              <span className="font-bold text-slate-800">
                                {fmt(total)} <span className="text-emerald-600 font-semibold">({fmt(abono)})</span>
                              </span>
                            </div>
                          </div>

                          {/* Botones de Acción */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            {/* Botón Copiar Mensaje Recordatorio WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleCopiarMensaje(v)}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                copiadoId === v.id
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700'
                              }`}
                              title="Copiar mensaje de recordatorio para enviarlo al cliente"
                            >
                              {copiadoId === v.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>¡Mensaje Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Copiar Mensaje</span>
                                </>
                              )}
                            </button>

                            {/* Botón WhatsApp directo al chat */}
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
                                title="Abrir chat en WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <button
                                disabled
                                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 text-slate-300 text-xs font-bold cursor-not-allowed"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-slate-300" />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            {/* Botón Copiar Pedido */}
                            <button
                              type="button"
                              onClick={() => handleCopiarPedido(v)}
                              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                copiadoPedidoId === v.id
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                              }`}
                              title="Copiar resumen del pedido"
                            >
                              {copiadoPedidoId === v.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>¡Pedido Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Shirt className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Copiar Pedido</span>
                                </>
                              )}
                            </button>

                            {/* Botón Editar Pedido */}
                            <button
                              type="button"
                              onClick={() => onEditOrder && onEditOrder(v)}
                              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Editar pedido o cambiar fecha de entrega"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pedidosAgrupadosPorFecha.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No hay entregas programadas</h3>
            <p className="text-xs text-slate-400 mt-1">
              {vista === 'sin-fecha'
                ? '¡Excelente! Todos los pedidos tienen fecha de entrega asignada.'
                : 'Prueba cambiando los filtros o seleccionando otra fecha.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
