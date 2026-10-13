import confetti from 'canvas-confetti';

export const ORDEN_ESTADOS = ['Pedido', 'Comprado', 'Bordando', 'Listo para entrega', 'Entregado', 'Liquidado'];

export const LUGARES_ENTREGA = [
  "Soledad",
  "Plaza de la Paz",
  "Granadillos",
  "Centro Historico",
  "Domicilio",
  "Buscan en casa de Val",
  "Buscan en casa de Samir",
  "Otro"
];

export const TIPOS_CAMISA = ['Polo', 'Camisilla', 'Cuello Redondo', 'Buzo', 'Oversize', 'Otra'];
export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '12', '14', '16'];
export const COLORES = ['Blanco', 'Negro', 'Azul Oscuro', 'Azul Rey', 'Rojo', 'Verde Militar', 'Beige', 'Gris', 'Rosado', 'Otro'];

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
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  return `${diasSemana[fechaObj.getDay()]} ${dia} de ${meses[mes]}`;
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
  return (it.precio != null && it.precio !== '') ? (Number(it.precio) || 0) : (Number(v.precio_unitario) || 0);
}

export function costoDeItem(it, v) {
  return (it.costo != null && it.costo !== '') ? (Number(it.costo) || 0) : (Number(v.costo_unitario) || 0);
}

export function precioTotalVenta(v) {
  const crudos = itemsCrudosVenta(v);
  if (!crudos) return (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 1);
  return crudos.reduce((s, it) => s + precioDeItem(it, v), 0);
}

export function costoTotalVenta(v) {
  const crudos = itemsCrudosVenta(v);
  if (!crudos) return (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1);
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
  const ePedido = normalizarEstado(v.estado) || 'Pedido';
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
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']
    });
  } catch {}
}

export function getEstadoBadgeStyle(estado) {
  switch (normalizarEstado(estado)) {
    case 'Pedido':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'Comprado':
      return 'bg-cyan-100 text-cyan-900 border-cyan-200';
    case 'Bordando':
      return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    case 'Listo para entrega':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'Entregado':
      return 'bg-blue-100 text-blue-900 border-blue-200';
    case 'Liquidado':
      return 'bg-green-100 text-green-900 border-green-200';
    case 'Mixto':
      return 'bg-purple-100 text-purple-900 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
