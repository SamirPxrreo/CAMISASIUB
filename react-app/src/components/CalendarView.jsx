import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  MapPin,
  Phone,
  Shirt,
  DollarSign
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { btnNeutro, btnNeutroIcono, btnPrimario } from '../lib/buttonStyles';
import {
  fmt,
  formatearFechaHumana,
  saldoCliente,
  precioTotalVenta,
  abonoClienteTotal,
  itemsCrudosVenta,
  normalizarEstado,
  estadoGeneralVenta,
  getEstadoBadgeStyle,
  hoyColombia,
  getVendedorColor,
  codigoCortoPedido,
  descripcionPrendaHumana
} from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';

// Obtener el lunes de la semana correspondiente a una fecha YYYY-MM-DD
function getLunesDeSemana(fechaIso) {
  if (!fechaIso) return new Date();
  const partes = fechaIso.split('-').map(Number);
  const date = new Date(partes[0], partes[1] - 1, partes[2]);
  const day = date.getDay(); // 0 es domingo, 1 es lunes...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(partes[0], partes[1] - 1, diff);
}

// Convertir fecha a string YYYY-MM-DD
function fechaAStringIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarView({ onEditOrder, onNavigateToCuentas }) {
  const { ventas } = useData();

  // Fecha de referencia para la semana (por defecto, hoy en Colombia)
  const hoyStr = hoyColombia();
  const [fechaSemana, setFechaSemana] = useState(hoyStr);
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState('calendario'); // 'calendario' | 'sin-fecha'
  const [orderModal, setOrderModal] = useState(null);

  // Filtrar pedidos activos (no finalizados)
  const pedidosActivos = useMemo(() => {
    return ventas.filter(v => !v.finalizado);
  }, [ventas]);

  // Contadores para métricas rápidas
  const metricas = useMemo(() => {
    let entregasHoy = 0;
    let sinFecha = 0;
    let totalCamisasHoy = 0;
    let saldoHoy = 0;

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
    });

    return { entregasHoy, sinFecha, totalCamisasHoy, saldoHoy };
  }, [pedidosActivos, hoyStr]);

  // Navegación de semanas
  const cambiarSemana = (deltaDias) => {
    const partes = fechaSemana.split('-').map(Number);
    const date = new Date(partes[0], partes[1] - 1, partes[2] + deltaDias);
    setFechaSemana(fechaAStringIso(date));
    setVista('calendario');
  };

  const irAHoy = () => {
    setFechaSemana(hoyStr);
    setVista('calendario');
  };

  // Generar los 7 días de la semana (Lunes a Domingo)
  const diasSemana = useMemo(() => {
    const lunes = getLunesDeSemana(fechaSemana);
    const nombres = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const dias = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      const iso = fechaAStringIso(d);
      dias.push({
        iso,
        nombreDia: nombres[i],
        numeroDia: d.getDate(),
        mesNombre: d.toLocaleString('es-CO', { month: 'long' }),
        anio: d.getFullYear(),
        esHoy: iso === hoyStr
      });
    }
    return dias;
  }, [fechaSemana, hoyStr]);

  // Título del mes y año (ej. "Octubre De 2026")
  const tituloMesAno = useMemo(() => {
    if (!diasSemana.length) return '';
    const d0 = diasSemana[0];
    const d6 = diasSemana[6];
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

    if (d0.mesNombre === d6.mesNombre) {
      return `${cap(d0.mesNombre)} De ${d0.anio}`;
    }
    return `${cap(d0.mesNombre)} - ${cap(d6.mesNombre)} De ${d6.anio}`;
  }, [diasSemana]);

  // Filtrado de pedidos según vendedor y búsqueda
  const pedidosFiltrados = useMemo(() => {
    return pedidosActivos.filter(v => {
      if (vendedorFiltro !== 'Todos' && v.vendedor !== vendedorFiltro) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const cli = (v.cliente_nombre || '').toLowerCase();
        const tel = (v.cliente_telefono || v.telefono || '').toLowerCase();
        const lug = (v.lugar_entrega || '').toLowerCase();
        if (!cli.includes(q) && !tel.includes(q) && !lug.includes(q)) return false;
      }
      return true;
    });
  }, [pedidosActivos, vendedorFiltro, busqueda]);

  // Pedidos sin fecha asignada
  const pedidosSinFecha = useMemo(() => {
    return pedidosFiltrados.filter(v => !v.fecha_entrega);
  }, [pedidosFiltrados]);

  // Tarjeta de entrega en el calendario.
  // Solo se muestra lo imprescindible, apilado verticalmente: vendedor,
  // cliente, lugar, estado y saldo. Todo lo demás (descripción de prendas,
  // bordados, notas) queda en el modal al tocar la tarjeta, donde sí cabe.
  const TarjetaEntrega = ({ v }) => {
    const saldo = saldoCliente(v);
    const vCol = getVendedorColor(v.vendedor);
    const estGral = estadoGeneralVenta(v);

    return (
      <motion.div
        whileHover={{ y: -2 }}
        onClick={() => setOrderModal(v)}
        className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-indigo-400 p-2.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col gap-1.5"
      >
        {/* 1. Vendedor */}
        <span
          className={`self-start text-[9.5px] font-black px-1.5 py-0.5 rounded-md border leading-none ${vCol.bg} ${vCol.text} ${vCol.border}`}
          title={`Vendedor: ${v.vendedor || 'Samir'}`}
        >
          {v.vendedor || 'Samir'}
        </span>

        {/* 2. Cliente */}
        <h4
          className="font-black text-[12.5px] leading-tight text-slate-900 break-words group-hover:text-indigo-600 transition-colors"
          title={v.cliente_nombre}
        >
          {v.cliente_nombre}
        </h4>

        {/* 3. Lugar de entrega */}
        <span
          className="text-[10.5px] font-bold text-slate-500 leading-tight flex items-start gap-1"
          title={v.lugar_entrega || 'Por definir'}
        >
          <MapPin className="w-3 h-3 shrink-0 mt-px text-slate-400" />
          <span className="break-words">{v.lugar_entrega || 'Por definir'}</span>
        </span>

        {/* 4. Estado y 5. Saldo */}
        <div className="pt-1.5 mt-0.5 border-t border-slate-100 flex flex-col items-start gap-1">
          <span
            className={`self-start px-2 py-0.5 rounded-md font-black border text-[9.5px] leading-none ${getEstadoBadgeStyle(estGral)}`}
          >
            {estGral}
          </span>

          <span
            className={`text-[11px] font-black leading-none ${saldo === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {saldo === 0 ? 'Pagado ✓' : `Resta ${fmt(saldo)}`}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Barra Superior con Filtros Rápidos y Buscador */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Calendario de Entregas
            {metricas.entregasHoy > 0 && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 animate-pulse">
                {metricas.entregasHoy} para hoy
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Vista semanal de entregas. Toca cualquier pedido para ver su detalle completo y opciones.
          </p>
        </div>

        {/* Controles de Filtro */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={vendedorFiltro}
            onChange={(e) => setVendedorFiltro(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs outline-none cursor-pointer"
          >
            <option value="Todos">Todos los socios</option>
            <option value="Samir">Samir</option>
            <option value="Valentina">Valentina</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente, lugar..."
              className="w-full pl-8 pr-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-medium outline-none shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Barra de Navegación del Calendario (Estilo de la imagen de referencia) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Controles de Semana: < Hoy > y Mes */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => cambiarSemana(-7)}
              className={btnNeutroIcono + ' w-8 h-8'}
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={irAHoy}
              className={btnNeutro + ' h-8'}
              title="Ir a la fecha de hoy"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => cambiarSemana(7)}
              className={btnNeutroIcono + ' w-8 h-8'}
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 capitalize tracking-tight ml-1">
            {tituloMesAno}
          </h3>
        </div>

        {/* Leyenda y Acceso a Pedidos Sin Fecha */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              Samir
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
              Valentina
            </span>
          </div>

          {metricas.sinFecha > 0 && (
            <button
              type="button"
              onClick={() => setVista(vista === 'sin-fecha' ? 'calendario' : 'sin-fecha')}
              className={`flex items-center gap-1.5 ${
                vista === 'sin-fecha' ? btnPrimario : btnNeutro
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Sin fecha ({metricas.sinFecha})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. VISTA PRINCIPAL: rejilla semanal de 7 columnas en todos los tamaños.
          En pantallas estrechas se desplaza horizontalmente; cada tarjeta
          muestra solo lo esencial apilado, sin recortar texto. */}
      {vista === 'calendario' ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[840px] grid grid-cols-7 border-b border-slate-100">
              {/* Encabezados de Columna (LUN 5, MAR 6, etc.) */}
              {diasSemana.map((dia) => (
                <div
                  key={dia.iso}
                  className={`py-3.5 px-3 text-center border-r border-slate-100 last:border-r-0 ${
                    dia.esHoy ? 'bg-indigo-50/30' : 'bg-slate-50/40'
                  }`}
                >
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider block ${
                      dia.esHoy ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    {dia.nombreDia}
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-black block mt-0.5 ${
                      dia.esHoy ? 'text-indigo-600' : 'text-slate-800'
                    }`}
                  >
                    {dia.numeroDia}
                  </span>
                </div>
              ))}
            </div>

            {/* Cuerpo de las 7 Columnas con las Tarjetas de Pedidos */}
            <div className="min-w-[840px] grid grid-cols-7 min-h-[460px] divide-x divide-slate-100">
              {diasSemana.map((dia) => {
                const pedidosDia = pedidosFiltrados.filter(v => v.fecha_entrega === dia.iso);

                return (
                  <div
                    key={dia.iso}
                    className={`p-2.5 flex flex-col justify-between transition-colors ${
                      dia.esHoy ? 'bg-indigo-50/15' : 'bg-white'
                    }`}
                  >
                    {pedidosDia.length > 0 ? (
                      <div className="space-y-2.5">
                        {pedidosDia.map((v) => (
                          <TarjetaEntrega key={v.id} v={v} />
                        ))}
                      </div>
                    ) : (
                      <div className="my-auto py-12 text-center select-none">
                        <span className="text-xs font-bold text-slate-300">Libre</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA ALTERNATIVA: Pedidos Sin Fecha Definida */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Pedidos Pendientes por Agendar Fecha ({pedidosSinFecha.length})
            </h3>
            <button
              type="button"
              onClick={() => setVista('calendario')}
              className={btnNeutro}
            >
              Volver a la vista semanal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pedidosSinFecha.map((v) => (
              <div
                key={v.id}
                onClick={() => setOrderModal(v)}
                className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 hover:border-amber-400 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">{codigoCortoPedido(v)} {v.cliente_nombre}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">Sin Fecha</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {v.cantidad || 1} prenda(s) · {v.lugar_entrega || 'Lugar por definir'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-200/50">
                  <span className="text-slate-500">Toca para agendar o ver detalle</span>
                  <span className="font-bold text-indigo-600">Ver →</span>
                </div>
              </div>
            ))}

            {pedidosSinFecha.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 text-xs">
                ¡Todos los pedidos tienen fecha asignada!
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL DETALLADO DE PEDIDO (Abre en ventana con todas las opciones comunes) */}
      <OrderDetailModal
        isOpen={!!orderModal}
        onClose={() => setOrderModal(null)}
        order={orderModal}
        onEditOrder={onEditOrder}
      />
    </div>
  );
}
