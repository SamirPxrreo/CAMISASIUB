import confetti from 'canvas-confetti';

export const ORDEN_ESTADOS = ['Pedido', 'Comprado', 'Bordando', 'Listo para entrega', 'Entregado', 'Liquidado'];

export const VERSIONES_DISPONIBLES = [
  { id: 'Viejo', nombre: 'Versión 1', costoBase: 30000 },
  { id: 'Nuevo', nombre: 'Versión 2', costoBase: 31000 }
];

export const GENEROS_DISPONIBLES = ['Hombre', 'Mujer'];

export const COLORES_DISPONIBLES = [
  'Negro',
  'Blanco',
  'Gris',
  'Turquí',
  'Azul turquesa',
  'Camel',
  'Vinotinto',
  'Palo de Rosa',
  'Mostaza'
];

export const TALLAS_DISPONIBLES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

// Compatibilidad
export const COLORES = COLORES_DISPONIBLES;
export const TALLAS = TALLAS_DISPONIBLES;
export const TIPOS_CAMISA = ['Polo'];

export const EXTRA_TALLAS_COSTO = {
  '2XL': 2000,
  '3XL': 4000,
  '4XL': 6000
};

export const PRECIO_VENTA_DEFECTO = 39000;
export const COSTO_YESENIA_DEFECTO = 30000;

export const LUGARES_ENTREGA = [
  "Soledad",
  "Barranquilla",
  "Universidad",
  "Plaza de la Paz",
  "Granadillos",
  "Centro Histórico",
  "Domicilio",
  "Buscan en casa de Val",
  "Buscan en casa de Samir",
  "Otro"
];

// Cálculo automático de costo sugerido según Versión y Talla
export function costoProveedorSugerido(modelo, talla) {
  const base = (modelo === 'Nuevo' || modelo === 'Versión 2') ? 31000 : 30000;
  const extra = EXTRA_TALLAS_COSTO[String(talla || '').trim()] || 0;
  return base + extra;
}

export function normalizarEstado(e) {
  const v = String(e || '').trim();
  if (v === 'Bordado') return 'Bordando';
  if (v === 'Pagado') return 'Liquidado';
  return v || 'Pedido';
}

export function fmt(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

export function hoyColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export function formatearFechaHumana(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  const partes = String(fechaStr).slice(0, 10).split('-');
  if (partes.length !== 3) return fechaStr;

  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);

  const fechaObj = new Date(anio, mes, dia);
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  return `${diasSemana[fechaObj.getDay()]} ${dia} ${meses[mes]}`;
}

export function diasTranscurridos(fechaStr) {
  if (!fechaStr || !String(fechaStr).trim()) return null;
  const hoy = new Date(hoyColombia() + 'T00:00:00');
  const f = new Date(String(fechaStr).slice(0, 10) + 'T00:00:00');
  if (isNaN(f.getTime())) return null;
  return Math.round((hoy - f) / 86400000);
}

// Items crudos del jsonb
export function itemsCrudosVenta(v) {
  if (v && v.items_camisa) {
    try {
      const p = typeof v.items_camisa === 'string' ? JSON.parse(v.items_camisa) : v.items_camisa;
      if (Array.isArray(p) && p.length) return p;
    } catch { /* parse error */ }
  }
  return null;
}

export function precioDeItem(it, v) {
  return (it && it.precio != null && it.precio !== '') ? (Number(it.precio) || 0) : (Number(v?.precio_unitario) || PRECIO_VENTA_DEFECTO);
}

export function costoDeItem(it, v) {
  return (it && it.costo != null && it.costo !== '') ? (Number(it.costo) || 0) : (Number(v?.costo_unitario) || COSTO_YESENIA_DEFECTO);
}

export function precioTotalVenta(v) {
  const crudos = itemsCrudosVenta(v);
  if (!crudos) return (Number(v.precio_unitario) || PRECIO_VENTA_DEFECTO) * (Number(v.cantidad) || 1);
  return crudos.reduce((s, it) => s + precioDeItem(it, v), 0);
}

export function costoTotalVenta(v) {
  const crudos = itemsCrudosVenta(v);
  if (!crudos) return (Number(v.costo_unitario) || COSTO_YESENIA_DEFECTO) * (Number(v.cantidad) || 1);
  return crudos.reduce((s, it) => s + costoDeItem(it, v), 0);
}

export function abonoClienteTotal(v) {
  const crudos = itemsCrudosVenta(v);
  if (!crudos) return Number(v.abono) || 0;
  const total = crudos.reduce((s, it) => s + (Number(it.abono) || 0), 0);
  return total || (Number(v.abono) || 0);
}

export function saldoCliente(v) {
  return Math.max(precioTotalVenta(v) - abonoClienteTotal(v), 0);
}

export function estadosItemsVenta(v) {
  const crudos = itemsCrudosVenta(v);
  const ePedido = normalizarEstado(v?.estado) || 'Pedido';
  if (!crudos) return [ePedido];
  return crudos.length ? crudos.map(it => normalizarEstado(it.estado || ePedido)) : [ePedido];
}

export function estadoGeneralVenta(v) {
  const es = estadosItemsVenta(v);
  const primero = es[0];
  if (es.every(e => e === primero)) return primero || 'Pedido';
  return 'Mixto';
}

export function estadosTodosLiquidado(v) {
  return estadosItemsVenta(v).every(e => e === 'Liquidado');
}

export function todosItemsListosEntrega(v) {
  return estadosItemsVenta(v).every(e => e === 'Entregado' || e === 'Liquidado');
}

export function triggerConfetti() {
  try {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']
    });
  } catch {}
}

// Clave única de cliente para agrupación
export function claveCliente(v) {
  const tel = String(v.cliente_telefono || '').trim().replace(/\D/g, '');
  if (tel && tel.length >= 7) return tel;
  return String(v.cliente_nombre || '').toLowerCase().trim();
}

// Formatear enlace WhatsApp directo sin mensaje predeterminado
export function getWhatsAppLink(telefono) {
  if (!telefono) return null;
  const numLimpio = String(telefono).replace(/\D/g, '');
  if (!numLimpio) return null;
  return `https://wa.me/57${numLimpio}`;
}

/* ---------- Liquidación entre socios por pedido (Exacto app.v2.js) ---------- */
export function mitadGananciaPedido(v) {
  return Math.max((precioTotalVenta(v) - costoTotalVenta(v)) / 2, 0);
}

export function otroSocioDe(vendedor) {
  if (vendedor === 'Samir') return 'Valentina';
  if (vendedor === 'Valentina') return 'Samir';
  return null;
}

export function montoLiquidadoSocioPedido(v, liquidaciones) {
  const receptor = otroSocioDe(v.vendedor);
  if (!receptor) return 0;
  return (liquidaciones || [])
    .filter(l => String(l.venta_id) === String(v.id) && l.pagador === v.vendedor && l.receptor === receptor)
    .reduce((s, l) => s + (Number(l.monto) || 0), 0);
}

export function saldoSocioPendientePedido(v, liquidaciones) {
  return Math.max(mitadGananciaPedido(v) - montoLiquidadoSocioPedido(v, liquidaciones), 0);
}

export function pedidoSocioLiquidado(v, liquidaciones) {
  return saldoSocioPendientePedido(v, liquidaciones) <= 1;
}

export function pedidosPendientesLiquidacion(pagador, ventas, liquidaciones) {
  return (ventas || []).filter(v =>
    v.vendedor === pagador &&
    otroSocioDe(v.vendedor) &&
    saldoSocioPendientePedido(v, liquidaciones) > 1
  );
}

export function calcularDeudaSocios(ventas, liquidaciones) {
  let deudaSamirAVal = 0;
  let deudaValASamir = 0;
  let gananciaTotalSamir = 0;
  let gananciaTotalVal = 0;

  (ventas || []).forEach(v => {
    if (v.vendedor !== 'Samir' && v.vendedor !== 'Valentina') return;
    const pendiente = saldoSocioPendientePedido(v, liquidaciones);
    const ganancia = mitadGananciaPedido(v);
    if (v.vendedor === 'Samir') {
      deudaSamirAVal += pendiente;
      gananciaTotalSamir += ganancia;
    } else if (v.vendedor === 'Valentina') {
      deudaValASamir += pendiente;
      gananciaTotalVal += ganancia;
    }
  });

  const perdidasSinDescontar = Math.round(
    (ventas || []).filter(v => v.vendedor === 'Samir' || v.vendedor === 'Valentina').reduce((s, v) => {
      const g = precioTotalVenta(v) - costoTotalVenta(v);
      return s + (g < 0 ? -g / 2 : 0);
    }, 0)
  );

  return {
    deudaSamirAVal: Math.round(deudaSamirAVal),
    deudaValASamir: Math.round(deudaValASamir),
    gananciaTotalSamir: Math.round(gananciaTotalSamir),
    gananciaTotalVal: Math.round(gananciaTotalVal),
    totalPendiente: Math.round(deudaSamirAVal + deudaValASamir),
    perdidasSinDescontar
  };
}

// Plantilla exacta de mensaje de recordatorio para WhatsApp
export function generarMensajeWhatsApp(v) {
  const cant = Number(v.cantidad) || 1;
  const saldo = saldoCliente(v);
  const crudos = itemsCrudosVenta(v) || [];
  const detalle = crudos.length
    ? crudos.map(it => `• ${(it.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1')} ${it.genero || ''} ${it.color || ''} Talla ${it.talla || ''}${it.programa ? ' (' + it.programa + ')' : ''}`).join('\n     ')
    : `• ${cant} camisa(s)`;

  return `👕 *Recordatorio Camisas IUB* 👕\n\n👤 *Cliente:* ${v.cliente_nombre}\n📱 *Teléfono:* ${v.cliente_telefono || '-'}\n📋 *Detalle:*\n     ${detalle}\n📦 *Cantidad:* ${cant}\n💰 *Saldo Pendiente:* ${fmt(saldo)}\n📅 *Fecha Entrega:* ${v.fecha_entrega || 'Por definir'}\n📍 *Lugar:* ${v.lugar_entrega || 'Sin definir'}`;
}

// Colores oficiales y exactos de los estados (acorde a Impeccable y la app original)
export const ESTADOS_COLOR = {
  'Pedido': {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
    dot: 'bg-amber-500',
    border: 'border-amber-300'
  },
  'Comprado': {
    badge: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700',
    dot: 'bg-cyan-500',
    border: 'border-cyan-300'
  },
  'Bordando': {
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700',
    dot: 'bg-indigo-500',
    border: 'border-indigo-300'
  },
  'Listo para entrega': {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300'
  },
  'Entregado': {
    badge: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-300'
  },
  'Liquidado': {
    badge: 'bg-green-100 text-green-900 border-green-300 dark:bg-green-950/80 dark:text-green-200 dark:border-green-700',
    dot: 'bg-green-500',
    border: 'border-green-300'
  },
  'Mixto': {
    badge: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700',
    dot: 'bg-purple-500',
    border: 'border-purple-300'
  }
};

export function getEstadoBadgeStyle(estado) {
  const norm = normalizarEstado(estado);
  return ESTADOS_COLOR[norm]?.badge || 'bg-slate-100 text-slate-800 border-slate-200';
}
