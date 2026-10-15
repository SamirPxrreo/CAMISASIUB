import confetti from 'canvas-confetti';

export const ORDEN_ESTADOS = ['Pedido', 'Comprado', 'Bordando', 'Listo para entrega', 'Entregado', 'Liquidado'];

export const VERSIONES_DISPONIBLES = [
  { id: 'Viejo', nombre: 'Versión 1', costoBase: 30000 },
  { id: 'Nuevo', nombre: 'Versión 2', costoBase: 31000 }
];

export const GENEROS_DISPONIBLES = ['Hombre', 'Mujer'];

export const COLORES_DEFECTO_OBJETOS = [
  { id: 'turqui',       nombre: 'Turqui',       hex: '#0d9488' },
  { id: 'negro',        nombre: 'Negro',        hex: '#111827' },
  { id: 'blanco',       nombre: 'Blanco',       hex: '#ffffff' },
  { id: 'camel',        nombre: 'Camel',        hex: '#c19a6b' },
  { id: 'gris',         nombre: 'Gris',         hex: '#6b7280' },
  { id: 'palo-de-rosa', nombre: 'Palo de rosa', hex: '#d9a3a3' }
];

export const COLORES_DISPONIBLES = COLORES_DEFECTO_OBJETOS.map(c => c.nombre);

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
  "IUB SOLEDAD",
  "IUB PLAZA DE LA PAZ",
  "IUB POSGRADOS",
  "IUB CENTRO HISTORICO",
  "DOMICILIO",
  "CASA VAL",
  "CASA SAMIR",
  "OTRO"
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
      if (p && Array.isArray(p.items) && p.items.length) return p.items;
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

export function validarPasoALiquidado(venta, liquidaciones) {
  if (!venta) return { ok: false, faltas: ['Pedido no encontrado.'] };
  const faltas = [];

  // 1. Debe estar 100% cobrado al cliente
  const saldoCli = saldoCliente(venta);
  if (saldoCli > 1) {
    faltas.push(`Falta cobrar ${fmt(saldoCli)} al cliente antes de liquidar.`);
  }

  // 2. Debe estar 100% pagado al proveedor Yesenia
  const pagos = abonosProveedorPorVentaId(venta);
  if (pagos.pendiente > 1) {
    faltas.push(`Falta pagar ${fmt(pagos.pendiente)} a Yesenia (registra el pago en Abonos Yesenia).`);
  }

  // 3. Debe estar 100% liquidado con el socio (Liquidaciones)
  if (otroSocioDe(venta.vendedor)) {
    const saldoSocio = saldoSocioPendientePedido(venta, liquidaciones);
    if (saldoSocio > 1) {
      const socioReceptor = otroSocioDe(venta.vendedor);
      faltas.push(`Falta liquidar ${fmt(saldoSocio)} a ${socioReceptor} (registra el pago en Liquidaciones).`);
    }
  }

  return {
    ok: faltas.length === 0,
    faltas
  };
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

// Plantilla de mensaje de recordatorio para el cliente por WhatsApp
export function generarMensajeWhatsApp(v) {
  const cant = Number(v.cantidad) || 1;
  const saldo = saldoCliente(v);
  const crudos = itemsCrudosVenta(v) || [];
  const detalle = crudos.length
    ? crudos.map(it => {
        const genero = it.genero === 'Hombre' ? 'Hombre' : 'Mujer';
        const color = it.color || 'Negro';
        const talla = it.talla || 'U';
        const modelo = it.modelo === 'Nuevo' ? ' [v2]' : '';
        const bordado = it.programa ? ` (Bordado: ${it.programa})` : '';
        return `• ${color} · Talla ${talla} para ${genero}${modelo}${bordado}`;
      }).join('\n     ')
    : `• ${cant} camisa(s) Tipo Polo`;

  return `👕 *Recordatorio Camisas IUB* 👕\n\n👤 *Cliente:* ${v.cliente_nombre}\n📱 *Teléfono:* ${v.cliente_telefono || '-'}\n📋 *Detalle:*\n     ${detalle}\n📦 *Cantidad:* ${cant}\n💰 *Saldo Pendiente:* ${fmt(saldo)}\n📅 *Fecha Entrega:* ${v.fecha_entrega ? formatearFechaHumana(v.fecha_entrega) : 'Por definir'}\n📍 *Lugar:* ${v.lugar_entrega || 'Sin definir'}`;
}

// Resumen completo de un pedido para copiar al portapapeles
export function generarTextoResumenPedido(v) {
  const cant = Number(v.cantidad) || 1;
  const saldo = saldoCliente(v);
  const total = precioTotalVenta(v);
  const abono = abonoClienteTotal(v);
  const crudos = itemsCrudosVenta(v) || [];
  const detallePrendas = crudos.length
    ? crudos.map((it, idx) => {
        const genero = it.genero === 'Hombre' ? 'Hombre' : 'Mujer';
        const color = it.color || 'Negro';
        const talla = it.talla || 'U';
        const modelo = it.modelo === 'Nuevo' ? ' [v2]' : '';
        const bordado = it.programa ? ` | Bordado: ${it.programa}` : '';
        return `  • #${idx + 1} ${color} · Talla ${talla} para ${genero}${modelo}${bordado}`;
      }).join('\n')
    : `  • ${cant} camisa(s) Tipo Polo`;

  return `👕 *PEDIDO CAMISAS IUB*\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *Cliente:* ${v.cliente_nombre || 'Cliente'}\n📱 *Teléfono:* ${v.cliente_telefono || v.telefono || 'Sin teléfono'}\n🏷️ *Vendedor:* ${v.vendedor || 'Samir'}\n🏷️ *Estado:* ${v.estado || 'Pedido'}\n\n📦 *Prendas (${cant}):*\n${detallePrendas}\n\n💰 *Total:* ${fmt(total)}\n💵 *Abono:* ${fmt(abono)}\n💳 *Saldo Pendiente:* ${saldo > 0 ? fmt(saldo) : 'Pagado ($0)'}\n\n📅 *Fecha Entrega:* ${v.fecha_entrega ? formatearFechaHumana(v.fecha_entrega) : 'Por definir'}\n📍 *Lugar Entrega:* ${v.lugar_entrega || 'Sin definir'}${v.nota ? `\n📝 *Nota:* "${v.nota}"` : ''}`;
}

// Cálculos de deuda con el proveedor de confección (Yesenia)
export function abonosProveedorPorVentaId(venta, ventasCache = null) {
  if (!venta) return { abonado: 0, costoTotal: 0, pendiente: 0 };
  let vObj = venta;
  if (typeof venta === 'number' || typeof venta === 'string') {
    if (Array.isArray(ventasCache)) {
      vObj = ventasCache.find(x => String(x.id) === String(venta)) || null;
    } else {
      vObj = null;
    }
  }
  if (!vObj) return { abonado: 0, costoTotal: 0, pendiente: 0 };
  const costoVenta = costoTotalVenta(vObj);
  const crudos = itemsCrudosVenta(vObj);
  let abonado = 0;
  if (crudos && crudos.some(it => it.abono_yesenia != null && it.abono_yesenia !== '')) {
    abonado = crudos.reduce((s, it) => s + (Number(it.abono_yesenia) || 0), 0);
  } else {
    abonado = Number(vObj.abono_yesenia) || 0;
  }
  return {
    abonado: Math.round(abonado),
    costoTotal: costoVenta,
    pendiente: Math.max(costoVenta - Math.round(abonado), 0)
  };
}

export function calcularDeudaProveedorVendedor(vendedor, ventas) {
  return (ventas || [])
    .filter(v => v.vendedor === vendedor && normalizarEstado(v.estado) !== 'Liquidado' && !v.finalizado)
    .map(v => {
      const pagos = abonosProveedorPorVentaId(v);
      return { venta: v, pendiente: pagos.pendiente, costoTotal: pagos.costoTotal };
    })
    .filter(x => x.pendiente > 1);
}

// Paleta de colores pastel refinada, amigable y de alta legibilidad
export const ESTADOS_COLOR = {
  'Pedido': {
    badge: 'bg-amber-50 text-amber-900 border-amber-200/90 shadow-2xs',
    dot: 'bg-amber-400',
    border: 'border-amber-200'
  },
  'Comprado': {
    badge: 'bg-sky-50 text-sky-900 border-sky-200/90 shadow-2xs',
    dot: 'bg-sky-400',
    border: 'border-sky-200'
  },
  'Bordando': {
    badge: 'bg-purple-50 text-purple-900 border-purple-200/90 shadow-2xs',
    dot: 'bg-purple-400',
    border: 'border-purple-200'
  },
  'Listo para entrega': {
    badge: 'bg-emerald-50 text-emerald-900 border-emerald-200/90 shadow-2xs',
    dot: 'bg-emerald-400',
    border: 'border-emerald-200'
  },
  'Entregado': {
    badge: 'bg-blue-50 text-blue-900 border-blue-200/90 shadow-2xs',
    dot: 'bg-blue-400',
    border: 'border-blue-200'
  },
  'Liquidado': {
    badge: 'bg-teal-50 text-teal-900 border-teal-200/90 shadow-2xs',
    dot: 'bg-teal-400',
    border: 'border-teal-200'
  },
  'Mixto': {
    badge: 'bg-rose-50 text-rose-900 border-rose-200/90 shadow-2xs',
    dot: 'bg-rose-400',
    border: 'border-rose-200'
  }
};

// Etiqueta corta para chips compactos. "Listo para entrega" ocupaba dos lineas
// en la tarjeta y robaba el ancho a la descripcion de la prenda, que es la
// informacion que realmente importa. El menu desplegable sigue mostrando
// el nombre completo.
export const ESTADO_CORTO = {
  'Pedido': 'Pedido',
  'Comprado': 'Comprado',
  'Bordando': 'Bordando',
  'Listo para entrega': 'Listo',
  'Entregado': 'Entregado',
  'Liquidado': 'Liquidado'
};

export function estadoCorto(e) {
  const n = normalizarEstado(e);
  return ESTADO_CORTO[n] || n;
}

export const ESTADOS_PASTEL_CHIP = {
  'Todos': {
    active: 'bg-slate-900 text-white border-slate-900 shadow-xs',
    pill: 'bg-slate-700 text-white'
  },
  'Pedido': {
    active: 'bg-amber-100 text-amber-950 border-amber-300 shadow-xs',
    pill: 'bg-amber-300 text-amber-950'
  },
  'Comprado': {
    active: 'bg-sky-100 text-sky-950 border-sky-300 shadow-xs',
    pill: 'bg-sky-300 text-sky-950'
  },
  'Bordando': {
    active: 'bg-purple-100 text-purple-950 border-purple-300 shadow-xs',
    pill: 'bg-purple-300 text-purple-950'
  },
  'Listo para entrega': {
    active: 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-xs',
    pill: 'bg-emerald-300 text-emerald-950'
  },
  'Entregado': {
    active: 'bg-blue-100 text-blue-950 border-blue-300 shadow-xs',
    pill: 'bg-blue-300 text-blue-950'
  },
  'Liquidado': {
    active: 'bg-teal-100 text-teal-950 border-teal-300 shadow-xs',
    pill: 'bg-teal-300 text-teal-950'
  }
};

export function getEstadoBadgeStyle(estado) {
  const norm = normalizarEstado(estado);
  return ESTADOS_COLOR[norm]?.badge || 'bg-slate-50 text-slate-800 border-slate-200';
}

// Colores unificados e inconfundibles por vendedor en toda la aplicación
export function getVendedorColor(vendedor) {
  const v = String(vendedor || '').toLowerCase();
  if (v.includes('val')) {
    return {
      nombre: 'Valentina',
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-700',
      border: 'border-fuchsia-200',
      avatarBg: 'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-700',
      badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      ring: 'ring-fuchsia-300',
      activeBorder: 'border-fuchsia-400',
      solid: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
      accentText: 'text-fuchsia-600 hover:text-fuchsia-800'
    };
  }
  if (v.includes('sam')) {
    return {
      nombre: 'Samir',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      avatarBg: 'bg-indigo-100 border-indigo-200 text-indigo-700',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      ring: 'ring-indigo-300',
      activeBorder: 'border-indigo-400',
      solid: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accentText: 'text-indigo-600 hover:text-indigo-800'
    };
  }
  return {
    nombre: vendedor || 'Ambos',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    avatarBg: 'bg-amber-100 border-amber-200 text-amber-800',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    ring: 'ring-amber-300',
    activeBorder: 'border-amber-400',
    solid: 'bg-amber-600 hover:bg-amber-700 text-white',
    accentText: 'text-amber-600 hover:text-amber-800'
  };
}

// Formateador de moneda en miles colombianos con puntos automáticos (ej: 2500 -> "2.500")
export function formatMiles(val) {
  if (val === '' || val == null) return '';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CO');
}

// Extrae el valor numérico puro de una cadena con puntos o formato
export function parseMiles(str) {
  if (str === '' || str == null) return 0;
  const digits = String(str).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Formatear fecha y hora completa en zona horaria de Colombia
export function formatearFechaYHora(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(isoString);
  }
}

// Formato limpio de fecha y hora en la que se registró la venta
export function fechaHoraRegistroVenta(v) {
  if (v?.created_at) {
    return formatearFechaYHora(v.created_at);
  }
  if (v?.fecha) {
    return formatearFechaHumana(v.fecha);
  }
  return 'Fecha por definir';
}

// Historial y trazabilidad de eventos del pedido
export function historialVenta(v) {
  if (!v) return [];
  const list = [];

  // 1. Evento de registro original
  const fCreacion = v.created_at || v.fecha;
  if (fCreacion) {
    list.push({
      fecha: fCreacion,
      tipo: 'creacion',
      titulo: 'Venta registrada en el sistema',
      detalle: `Pedido creado para ${v.cliente_nombre || 'Cliente'} (${v.cantidad || 1} prenda${(v.cantidad || 1) > 1 ? 's' : ''})`,
      usuario: v.vendedor || 'Vendedor'
    });
  }

  // 2. Historial persistido en items_camisa
  try {
    if (v.items_camisa) {
      const p = typeof v.items_camisa === 'string' ? JSON.parse(v.items_camisa) : v.items_camisa;
      if (p && Array.isArray(p.historial)) {
        p.historial.forEach(ev => {
          if (!list.some(x => x.fecha === ev.fecha && x.titulo === ev.titulo)) {
            list.push(ev);
          }
        });
      }
    }
  } catch {}

  // 3. Fallback en caché local
  try {
    const local = localStorage.getItem(`historial_venta_${v.id}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        parsed.forEach(ev => {
          if (!list.some(x => x.fecha === ev.fecha && x.titulo === ev.titulo)) {
            list.push(ev);
          }
        });
      }
    }
  } catch {}

  return list.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// Obtener marca de tiempo de finalización del pedido (para ordenar el historial por más reciente)
export function fechaFinalizacionPedido(v) {
  if (!v) return 0;
  // 1. Buscar evento de finalización en el historial estructurado de items_camisa
  try {
    const hist = historialVenta(v);
    const evFinalizado = hist.find(ev => ev.tipo === 'finalizado' || (ev.titulo && String(ev.titulo).toLowerCase().includes('finaliz')));
    if (evFinalizado && evFinalizado.fecha) {
      const t = new Date(evFinalizado.fecha).getTime();
      if (!isNaN(t)) return t;
    }
  } catch {}

  // 2. Columna finalizado_at o updated_at si está finalizado
  if (v.finalizado_at) {
    const t = new Date(v.finalizado_at).getTime();
    if (!isNaN(t)) return t;
  }
  if (v.updated_at) {
    const t = new Date(v.updated_at).getTime();
    if (!isNaN(t)) return t;
  }
  if (v.fecha_entrega) {
    const t = new Date(v.fecha_entrega).getTime();
    if (!isNaN(t)) return t;
  }
  if (v.created_at) {
    const t = new Date(v.created_at).getTime();
    if (!isNaN(t)) return t;
  }
  if (v.fecha) {
    const t = new Date(v.fecha).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

// Genera un código de pedido corto y legible (ej: #S04, #V12, #15, #A1)
export function codigoCortoPedido(v) {
  if (!v) return '#';
  const idRaw = v.id != null ? String(v.id).trim() : '';
  if (!idRaw) return '#';
  // Si es un número corto (1 a 4 dígitos)
  if (/^\d{1,4}$/.test(idRaw)) return `#${idRaw}`;
  const clean = idRaw.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length <= 3) return `#${clean.toUpperCase()}`;
  const fin = clean.slice(-2).toUpperCase() || '01';
  const vLetra = (v.vendedor || 'P')[0].toUpperCase();
  return `#${vLetra}${fin}`;
}

// Formateo humano y consistente de prendas (ej: "Negro Talla XL para Mujer · V2")
export function descripcionPrendaHumana(it) {
  if (!it) return '1 prenda';
  const color = it.color || 'Negro';
  const talla = it.talla ? `Talla ${it.talla}` : '';
  const gen = it.genero ? `para ${it.genero === 'Mujer' ? 'Mujer' : 'Hombre'}` : '';
  const esV2 = it.modelo === 'Nuevo' || it.modelo === 'Versión 2' || it.version === 'Nuevo' || it.version === 'Versión 2' || it.tipo === 'Nuevo';
  const v2Tag = esV2 ? ' (V2)' : '';
  const partes = [color, talla, gen].filter(Boolean).join(' ');
  return `${partes}${v2Tag}`.trim();
}

