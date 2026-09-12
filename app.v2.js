  const SUPABASE_URL = "https://ifdbpaduvpadotpmojas.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_GnC8zI1oNOWrRTxO8iVqEA_E-yf68uq";

  const USER_ROLES_DEFAULT = {
    "admin@gmail.com": { nombre: "Administrador", role: "admin", vendedor: null },
    "samir@gmail.com": { nombre: "Samir", role: "vendedor", vendedor: "Samir" },
    "val@gmail.com":   { nombre: "Valentina", role: "vendedor", vendedor: "Valentina" }
  };

  // ESTADOS del pedido: flujo completo
  const ESTADOS = ['Pedido','Comprado','Bordando','Listo para entrega','Entregado','Liquidado'];
  // Compatibilidad con datos viejos: Bordado→Bordando, Pagado→Liquidado
  function normalizarEstado(e){ const v=String(e||'').trim(); if(v==='Bordado') return 'Bordando'; if(v==='Pagado') return 'Liquidado'; return v; }
  function claseEstado(estado){ return 'estado-' + String(estado||'').trim().replace(/\s+/g,'-'); }

  function logError(context, err) { console.error(`[${context}]`, err); }

  /* Loading spinner */
  let loadingCounter = 0;
  function showLoading(show = true) {
    loadingCounter += show ? 1 : -1;
    if (loadingCounter < 0) loadingCounter = 0;
    let el = document.getElementById('loading-spinner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-spinner';
      el.innerHTML = '<div class="spinner"></div>';
      Object.assign(el.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '9998', transition: 'opacity 0.2s'
      });
      document.body.appendChild(el);
    }
    el.style.display = loadingCounter > 0 ? 'flex' : 'none';
  }

  function mostrarToast(mensaje, tipo = 'success') {
    const colores = { success: 'var(--ok)', error: 'var(--warn)', info: 'var(--thread)' };
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      background: colores[tipo] || '#333', color: '#fff', padding: '12px 24px',
      borderRadius: '10px', fontSize: '14px', fontWeight: '600',
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)', zIndex: '9999',
      transition: 'opacity 0.3s', opacity: '0', fontFamily: 'inherit'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function confirmar(mensaje) {
    return window.confirm(mensaje);
  }

  function debounce(fn, ms = 300) {
    let timer;
    return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
  }

  /* ---------- PAGINACIÓN ---------- */
  const PAGE_SIZE = 15;
  let paginationState = { orders: 0, compras: 0, liquidaciones: 0, historial: 0 };

  function renderPagination(total, currentPage, key, onPageChange) {
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    if (totalPages <= 1) return '';
    const start = currentPage * PAGE_SIZE + 1;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, total);
    return `
      <div class="pagination">
        <span class="pagination-info">${start}–${end} de ${total}</span>
        <div class="pagination-btns">
          <button class="btn-small" ${currentPage === 0 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})" type="button">‹ Anterior</button>
          ${Array.from({ length: totalPages }, (_, i) => `
            <button class="btn-small ${i === currentPage ? 'pagination-active' : ''}" onclick="${onPageChange}(${i})" type="button">${i + 1}</button>
          `).join('')}
          <button class="btn-small" ${currentPage >= totalPages - 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})" type="button">Siguiente ›</button>
        </div>
      </div>`;
  }

  /* ---------- ORDENAMIENTO POR CLIC EN ENCABEZADOS ---------- */
  const ordenTablas = {};

  function compararValoresOrden(a, b, tipo) {
    const ea = a == null || a === '';
    const eb = b == null || b === '';
    if (ea || eb) return ea === eb ? 0 : (ea ? 1 : -1);
    if (tipo === 'num') {
      a = Number(a) || 0;
      b = Number(b) || 0;
      return a - b;
    }
    if (tipo === 'fecha') {
      a = String(a);
      b = String(b);
      return a < b ? -1 : a > b ? 1 : 0;
    }
    return String(a).localeCompare(String(b), 'es');
  }

  function ordenarFilas(items, clave, campos) {
    const o = ordenTablas[clave];
    if (!o || !campos[o.campo]) return items;
    const reg = campos[o.campo];
    const arr = [...items];
    arr.sort((A, B) => compararValoresOrden(reg.val(A), reg.val(B), reg.tipo) * o.dir);
    return arr;
  }

  function marcarOrdenTabla(clave) {
    document.querySelectorAll('table[data-orden-clave="' + clave + '"] th[data-orden]').forEach(th => {
      th.classList.remove('orden-activo', 'asc', 'desc');
    });
    const o = ordenTablas[clave];
    if (!o) return;
    const th = document.querySelector('table[data-orden-clave="' + clave + '"] th[data-orden="' + o.campo + '"]');
    if (th) th.classList.add('orden-activo', o.dir > 0 ? 'asc' : 'desc');
  }

  // Campos de orden por tipo de fila (ventas / historial comparten los mismos)
  const camposVenta = {
    fecha:    { val: v => v.fecha || '', tipo: 'fecha' },
    vendedor: { val: v => (v.vendedor || '').toLowerCase(), tipo: 'text' },
    cliente:  { val: v => (v.cliente_nombre || '').toLowerCase(), tipo: 'text' },
    cantidad: { val: v => Number(v.cantidad) || 1, tipo: 'num' },
    venta:    { val: v => (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 1), tipo: 'num' },
    abono:    { val: v => Number(v.abono) || 0, tipo: 'num' },
    saldo:    { val: v => (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 1) - (Number(v.abono) || 0), tipo: 'num' },
    pagado:   { val: v => abonosProveedorPorVentaId(v.id).abonado, tipo: 'num' },
    falta:    { val: v => abonosProveedorPorVentaId(v.id).pendiente, tipo: 'num' },
    entrega:  { val: v => v.fecha_entrega || '', tipo: 'fecha' },
    estado:   { val: v => (v.estado || '').toLowerCase(), tipo: 'text' }
  };

  const REGISTRO_ORDEN = {
    ordenes:   { render: renderTable,         campos: camposVenta },
    historial: { render: renderHistorial,     campos: camposVenta },
    compras:   { render: renderCompras,       campos: {
      fecha:    { val: c => c.fecha || '', tipo: 'fecha' },
      proveedor: { val: c => (c.proveedor || '').toLowerCase(), tipo: 'text' },
      comprador: { val: c => (c.comprador || '').toLowerCase(), tipo: 'text' },
      quien:    { val: c => compraAportesCache.filter(a => a.compra_id === c.id).map(a => (a.persona || '').toLowerCase()).filter(Boolean).join(' '), tipo: 'text' },
      camisas:  { val: c => ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.cantidad) || 1), 0), tipo: 'num' },
      costo:    { val: c => ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0), tipo: 'num' },
      aportado: { val: c => {
        const ap = compraAportesCache.filter(a => a.compra_id === c.id).reduce((s, a) => s + (Number(a.monto) || 0), 0);
        const ab = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
        return Math.max(ap, ab);
      }, tipo: 'num' },
      saldo:    { val: c => {
        const costo = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);
        const ap = compraAportesCache.filter(a => a.compra_id === c.id).reduce((s, a) => s + (Number(a.monto) || 0), 0);
        const ab = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
        return costo - Math.max(ap, ab);
      }, tipo: 'num' }
    } },
    liquidaciones: { render: renderLiquidaciones, campos: {
      fecha:   { val: l => l.fecha || '', tipo: 'fecha' },
      pedido:  { val: l => { const v = ventasCache.find(x => x.id === l.venta_id); return v ? ((v.cliente_nombre || '') + ' ' + (v.fecha || '')) : (l.venta_id || ''); }, tipo: 'text' },
      pagador: { val: l => (l.pagador || '').toLowerCase(), tipo: 'text' },
      receptor: { val: l => (l.receptor || '').toLowerCase(), tipo: 'text' },
      monto:   { val: l => Number(l.monto) || 0, tipo: 'num' },
      nota:    { val: l => (l.nota || '').toLowerCase(), tipo: 'text' }
    } },
    usuarios: { render: renderUsuariosTable, campos: {
      nombre: { val: u => (u.nombre || '').toLowerCase(), tipo: 'text' },
      correo: { val: u => (u.correo || '').toLowerCase(), tipo: 'text' },
      rol:    { val: u => (u.rol || '').toLowerCase(), tipo: 'text' },
      creado: { val: u => (u.created_at || '').split('T')[0], tipo: 'fecha' }
    } }
  };

  document.addEventListener('click', function (e) {
    const th = e.target && e.target.closest && e.target.closest('th[data-orden]');
    if (!th) return;
    const tabla = th.closest('table');
    const clave = tabla && tabla.getAttribute('data-orden-clave');
    if (!clave) return;
    const campo = th.getAttribute('data-orden');
    const prev = ordenTablas[clave];
    ordenTablas[clave] = { campo: campo, dir: prev && prev.campo === campo ? -prev.dir : 1 };
    if (clave === 'ordenes') paginationState.orders = 0;
    else if (clave === 'compras') paginationState.compras = 0;
    else if (clave === 'liquidaciones') paginationState.liquidaciones = 0;
    else if (clave === 'historial') paginationState.historial = 0;
    if (REGISTRO_ORDEN[clave]) {
      REGISTRO_ORDEN[clave].render();
    } else if (clave.indexOf('resumen') === 0) {
      renderResumenes();
    }
  });

  // Desplazamiento horizontal de las tablas: Shift + rueda = horizontal, rueda sola = vertical
  document.querySelectorAll('.table-wrap').forEach(function (wrap) {
    wrap.addEventListener('wheel', function (e) {
      if (!e.shiftKey) return;
      if (!e.deltaY) return;
      const max = wrap.scrollWidth - wrap.clientWidth;
      if (max <= 0) return;
      wrap.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  });

  function bloquearScrollFondo() {
    document.body.classList.add('modal-lock');
    document.documentElement.classList.add('modal-lock');
  }
  function desbloquearScrollFondo() {
    if (document.querySelectorAll('.modal-backdrop:not(.hidden)').length === 0) {
      document.body.classList.remove('modal-lock');
      document.documentElement.classList.remove('modal-lock');
    }
  }
  function hardRefresh() {
    try { if ('caches' in window) caches.keys().then(ns => ns.forEach(n => caches.delete(n))); } catch(e){}
    try { localStorage.setItem('camisasIUB_refresh', String(Date.now())); } catch(e){}
    window.location.reload();
    setTimeout(() => { window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now(); }, 400);
  }
  window.hardRefresh = hardRefresh;

  const LUGARES_ENTREGA = [
    "Soledad",
    "Plaza de la Paz",
    "Granadillos",
    "Centro Historico",
    "Domicilio",
    "Buscan en casa de Val",
    "Buscan en casa de Samir",
    "Otro"
  ];

  // ⚠️ Antes de usar "Finalizar pedido", ejecuta la migración en Supabase (SQL Editor):
  //    migracion.sql  (mismo directorio) — agrega el campo "finalizado" a la tabla ventas.




  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  let currentUser = null;
  let currentRole = { role: "vendedor", vendedor: null, nombre: "" };
  let ventasCache = [];
  let usuariosCache = [];
  let comprasCache = [];
  let compraAportesCache = [];
  let liquidacionesCache = [];

  let editingId = null;
  let editingUserId = null;
  let editingCompraId = null;
  let compraSoloAportes = false;
  let pedidosDisponiblesPickers = [];


  /* =====================================================
     FECHAS EN ESPAÑOL HUMANO
     ===================================================== */
  function hoyColombia() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  function formatearFechaHumana(fechaStr) {
    if (!fechaStr) return 'Sin fecha';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;

    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const fechaObj = new Date(anio, mes, dia);
    if (isNaN(fechaObj.getTime())) return fechaStr;

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    return `📅 ${diasSemana[fechaObj.getDay()]} ${dia} de ${meses[fechaObj.getMonth()]} de ${anio}`;
  }

  function fmt(n) {
    return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
  }

  function textoFechaEntrega(v) {
    if (!(v && v.fecha_entrega)) return 'Pendiente por definir';
    return formatearFechaHumana(v.fecha_entrega).replace(/^📅\s*/, '');
  }

  // Muestra el color con su inicial en mayúscula (ej. "negro" → "Negro").
  function capitalizarColor(color) {
    const c = String(color == null ? '' : color).trim();
    return c ? c.charAt(0).toUpperCase() + c.slice(1) : c;
  }

  // Modelo de camisa: "Viejo" o "Nuevo". Las ventas antiguas sin modelo se cuentan como "Viejo".
  function normalizarModelo(m) {
    const s = String(m == null ? '' : m).trim().toLowerCase();
    return s.includes('nuev') ? 'Nuevo' : 'Viejo';
  }

  function modeloDeVenta(v) {
    if (v && v.items_camisa) {
      try {
        const p = JSON.parse(v.items_camisa);
        if (Array.isArray(p) && p.length && p[0].modelo) return normalizarModelo(p[0].modelo);
      } catch (e) { /* venta sin items legibles */ }
    }
    return normalizarModelo(v && v.modelo);
  }

  // Etiqueta visible de la versión: "Versión 1" (valor interno "Viejo"),
  // "Versión 2" (valor interno "Nuevo").
  // En la base se siguen guardando "Viejo"/"Nuevo": no se necesita migración en Supabase.
  function etiquetaModelo(m) {
    return normalizarModelo(m) === 'Nuevo' ? 'Versión 2' : 'Versión 1';
  }

  function badgeModelo(m) {
    const modelo = normalizarModelo(m);
    return `<span class="badge-modelo modelo-${modelo}">${etiquetaModelo(modelo)}</span>`;
  }

  function badgeModeloVenta(v) {
    return badgeModelo(modeloDeVenta(v));
  }

  // Opciones del select "Vendedor asignado": usuarios conocidos + vendedores con ventas + el usuario actual.
  // Así funciona automáticamente para cualquier usuario nuevo sin tocar el código.
  function opcionesVendedoresHtml(seleccionado) {
    const nombres = new Set();
    Object.values(USER_ROLES_DEFAULT).forEach(u => { if (u.vendedor) nombres.add(u.vendedor); });
    ventasCache.forEach(v => { if (v.vendedor) nombres.add(v.vendedor); });
    if (currentRole.vendedor) nombres.add(currentRole.vendedor);
    return [...nombres].sort().map(n =>
      `<option value="${n}" ${n === seleccionado ? 'selected' : ''}>${n}</option>`
    ).join('');
  }

  function horaColombia() {
    return new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Ordena pedidos por fecha de entrega (ascendente). Los que no tienen fecha
  // ("Pendiente por definir") siempre quedan al final. Desempate: fecha de pedido.
  function ordenarPorEntrega(a, b) {
    const fa = a.fecha_entrega || '9999-12-31';
    const fb = b.fecha_entrega || '9999-12-31';
    if (fa !== fb) return fa < fb ? -1 : 1;
    const pa = a.fecha || '9999-12-31';
    const pb = b.fecha || '9999-12-31';
    if (pa !== pb) return pa < pb ? -1 : 1;
    return 0;
  }

  // Pedidos que aún NO se han comprado en la distribuidora:
  // activos, sin compra asociada y sin estado avanzado (todo manual).
  function pedidosPorComprar() {
    return ventasCache.filter(v =>
      !v.finalizado && v.estado === 'Pedido' && !v.compra_id
    );
  }

  function camisasPorComprar() {
    return pedidosPorComprar().reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
  }

  function pedidosSinFechaEntrega() {
    return ventasCache.filter(v => !v.finalizado && !v.fecha_entrega);
  }

  /* ---------- Liquidación entre socios por pedido ---------- */
  function mitadGananciaPedido(v) {
    const cant = Number(v.cantidad) || 1;
    const precio = Number(v.precio_unitario) || 0;
    const costo = Number(v.costo_unitario) || 0;
    return Math.max(((precio - costo) * cant) / 2, 0);
  }

  function otroSocioDe(vendedor) {
    if (vendedor === 'Samir') return 'Valentina';
    if (vendedor === 'Valentina') return 'Samir';
    return null;
  }

  function montoLiquidadoSocioPedido(v) {
    const receptor = otroSocioDe(v.vendedor);
    if (!receptor) return 0;
    return liquidacionesCache
      .filter(l => l.venta_id === v.id && l.pagador === v.vendedor && l.receptor === receptor)
      .reduce((s, l) => s + (Number(l.monto) || 0), 0);
  }

  function saldoSocioPendientePedido(v) {
    return Math.max(mitadGananciaPedido(v) - montoLiquidadoSocioPedido(v), 0);
  }

  function pedidoSocioLiquidado(v) {
    return saldoSocioPendientePedido(v) <= 1;
  }

  function costoProveedorPagado(v) {
    if (!v.id) return false;
    const pagos = abonosProveedorPorVentaId(v.id);
    return pagos.pendiente <= 1;
  }

  function puedeMarcarPagado(v) {
    const faltas = [];
    if (!costoProveedorPagado(v)) {
      const pagos = abonosProveedorPorVentaId(v.id);
      faltas.push(`Falta pagar ${fmt(pagos.pendiente)} al proveedor (registra abonos en Abonos Yesenia).`);
    }
    if (!pedidoSocioLiquidado(v)) {
      faltas.push(`Falta liquidar ${fmt(saldoSocioPendientePedido(v))} al otro socio (registra pago en Liquidaciones).`);
    }
    return { ok: faltas.length === 0, faltas };
  }

  async function sugerirLiquidadoSiListo(ventaId) {
    const v = ventasCache.find(x => x.id === ventaId);
    if (!v || v.finalizado || normalizarEstado(v.estado) !== 'Entregado') return;
    if (!puedeMarcarPagado(v).ok) return;
    if (!confirmar(`✅ El pedido de "${v.cliente_nombre || 'cliente'}" ya quedó al día (proveedor y socios liquidados).\n\n¿Quieres marcarlo como "Liquidado" de una vez?`)) return;
    try {
      await supabaseClient.from('ventas').update({ estado: 'Liquidado' }).eq('id', v.id);
      await loadVentas();
      mostrarToast('✅ Pedido marcado como Liquidado. Ya puedes finalizarlo.');
    } catch (e) { logError('sugerirLiquidadoSiListo', e); }
  }
  async function sugerirLiquidadoParaVarios(ids) {
    for (const id of [...new Set(ids || [])]) await sugerirLiquidadoSiListo(id);
  }

  function pedidosPendientesLiquidacion(pagador) {
    return ventasCache.filter(v =>
      v.vendedor === pagador &&
      otroSocioDe(v.vendedor) &&
      saldoSocioPendientePedido(v) > 1
    );
  }

  function renderLiquidacionPedidosSelect() {
    const pagador = document.getElementById('lq-pagador').value;
    const sel = document.getElementById('lq-pedido');
    if (!sel) return;

    const pedidos = pagador ? pedidosPendientesLiquidacion(pagador) : [];
    if (pedidos.length === 0) {
      sel.innerHTML = pagador
        ? '<option value="" selected disabled>No hay pedidos con saldo pendiente</option>'
        : '<option value="" selected disabled>Primero elige quién paga</option>';
      return;
    }

    sel.innerHTML = '<option value="" selected disabled>Selecciona el pedido</option>' +
      pedidos.map(v => {
        const saldo = Math.round(saldoSocioPendientePedido(v));
        return `<option value="${v.id}" data-saldo="${saldo}">${v.cliente_nombre || 'Cliente'} — ${v.fecha || '?'} — pendiente ${fmt(saldo)}</option>`;
      }).join('');
  }

  function calcularDeudaProveedorVendedor(vendedor) {
    return ventasCache
      .filter(v => v.vendedor === vendedor && normalizarEstado(v.estado) !== 'Liquidado' && !v.finalizado)
      .map(v => {
        const pagos = abonosProveedorPorVentaId(v.id);
        return { venta: v, pendiente: pagos.pendiente, costoTotal: pagos.costoTotal };
      })
      .filter(x => x.pendiente > 1);
  }

  function renderComprasDeudaBox() {
    const box = document.getElementById('compras-deuda-box');
    if (!box) return;

    const esAdmin = currentRole.role === 'admin';
    const vendedores = esAdmin
      ? [...new Set(ventasCache.map(v => v.vendedor).filter(Boolean))].sort()
      : (currentRole.vendedor ? [currentRole.vendedor] : []);

    if (vendedores.length === 0) {
      box.innerHTML = '';
      box.classList.add('hidden');
      return;
    }

    let totalGeneral = 0;
    const bloques = vendedores.map(vendedor => {
      const deudas = calcularDeudaProveedorVendedor(vendedor);
      const total = deudas.reduce((s, d) => s + d.pendiente, 0);
      totalGeneral += total;

      if (deudas.length === 0) {
        return `<div style="background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; display:flex; align-items:center; gap:8px;"><span style="width:8px; height:8px; border-radius:50%; background:var(--ok); flex-shrink:0;"></span><b>${escSimple(vendedor)}</b> <span style="color:var(--ok);">— ✅ Sin deuda pendiente</span></div>`;
      }

      // Agrupa por contacto (mismo teléfono/@ = mismo cliente) para no duplicar
      const grupos = new Map();
      deudas.forEach(d => {
        const clave = claveCliente(d.venta);
        if (!grupos.has(clave)) grupos.set(clave, { ventas: [], pendiente: 0 });
        const g = grupos.get(clave);
        g.ventas.push(d.venta);
        g.pendiente += d.pendiente;
      });
      grupos.forEach(g => {
        g.nombre = etiquetaClienteGrupo(g.ventas);
        const tel = g.ventas.find(v => String(v.cliente_telefono || '').trim());
        g.telefono = tel ? String(tel.cliente_telefono).trim() : '';
      });
      const filas = [...grupos.values()].map(g => {
        const telRaw = g.telefono;
        const telTag = telRaw
          ? `<span style="color:var(--muted); font-weight:400; font-size:12px;"> · ${escSimple(telRaw)}</span>`
          : '';
        const estadosUnicos = [...new Set(g.ventas.map(v => v.estado || '').filter(Boolean))];
        const estadoTxt = estadosUnicos.length === 0 ? '' : estadosUnicos.length === 1 ? estadosUnicos[0] : estadosUnicos.join(' · ');
        const fechasTxt = g.ventas.length === 1
          ? (g.ventas[0].fecha ? formatearFechaHumana(g.ventas[0].fecha).replace(/^📅\s*/,'') : '?')
          : g.ventas.map(v => v.fecha || '?').join(' · ');
        const badgesEstado = estadosUnicos.map(e => `<span class="badge-estado ${claseEstado(e)}" style="font-size:10px; padding:2px 7px; vertical-align:middle;">${escSimple(normalizarEstado(e))}</span>`).join(' ');
        const metaLine = g.ventas.length > 1
          ? `${g.ventas.length} pedidos${badgesEstado ? ` · ${badgesEstado}` : ''} · <span style="white-space:nowrap;">📅 ${escSimple(fechasTxt)}</span>`
          : `${badgesEstado ? `${badgesEstado} · ` : ''}<span style="white-space:nowrap;">📅 ${escSimple(fechasTxt)}</span>`;
        return `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px dashed var(--line); font-size:13px; align-items:center;">
          <span style="display:flex; flex-direction:column; gap:2px; min-width:0;">
            <span style="line-height:1.3;"><b>${escSimple(g.nombre)}</b>${telTag}</span>
            <span style="font-size:11.5px; color:var(--muted); line-height:1.4;">${metaLine}</span>
          </span>
          <b style="color:var(--warn); white-space:nowrap; font-variant-numeric:tabular-nums; font-size:13.5px;">${fmt(g.pendiente)}</b>
        </div>
      `;
      }).join('');

      const cardStyle = total === 0
        ? 'background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px;'
        : 'background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; box-shadow:var(--shadow-sm);';
      return `
        <div style="${cardStyle} display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1.5px solid var(--line);">
            <span style="display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; border-radius:50%; background:${total > 0 ? 'var(--warn)' : 'var(--ok)'}; flex-shrink:0;"></span>
              <b style="font-size:14px;">${escSimple(vendedor)}</b>
            </span>
            <span style="background:${total > 0 ? 'rgba(201,47,47,0.10)' : 'rgba(47,143,91,0.12)'}; color:${total > 0 ? 'var(--warn)' : 'var(--ok)'}; padding:4px 10px; border-radius:999px; font-size:12.5px; font-weight:700; font-variant-numeric:tabular-nums; border:1px solid ${total > 0 ? 'rgba(201,47,47,0.18)' : 'rgba(47,143,91,0.18)'};">${fmt(total)}</span>
          </div>
          ${filas || '<span style="color:var(--muted); font-size:12.5px;">Sin filas</span>'}
        </div>
      `;
    }).join('');

    const esGrid = vendedores.length > 1;
    const bloquesWrap = esGrid
      ? `<div style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; align-items:start;">${bloques}</div>`
      : bloques;

    box.classList.remove('hidden');
    box.innerHTML = `
      <div style="margin-bottom:10px;">
        <b>📋 Deuda con Yesenia por pedidos no marcados como Liquidado</b>
        <p style="color:var(--muted); font-size:12px; margin:4px 0 0;">Suma lo que falta cubrir del costo de tus pedidos activos según los abonos registrados en cada visita.</p>
      </div>
      ${bloquesWrap}
      ${vendedores.length > 1 ? `<div style="margin-top:14px; padding:10px 14px; border-radius:10px; background:var(--accent-bg); border:1px solid var(--line); display:flex; justify-content:space-between; align-items:center;"><b>Total general pendiente</b><span style="color:var(--warn); font-weight:800; font-variant-numeric:tabular-nums; font-size:15px;">${fmt(totalGeneral)}</span></div>` : ''}
      <style>@media(max-width:720px){#compras-deuda-box > div[style*="grid-template-columns"]{grid-template-columns:1fr !important;}}</style>
    `;
  }

   function formatearDetalleCamisa(v, opts = {}) {
     const { html, paraWhatsApp, maxLength } = opts;
     let items = null;
     if (v.items_camisa) {
       try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
     }
     if (!items || !Array.isArray(items) || items.length === 0) {
       const texto = `${v.genero || '?'}, ${capitalizarColor(v.color)}, talla ${v.talla || '?'}`;
       return html ? `<b>${v.genero || '?'}</b>, ${capitalizarColor(v.color)}, talla <b>${v.talla || '?'}</b>` : texto;
     }
     if (html) {
       // Remove Abono from HTML display
return items.map((it, idx) => `
          <div style="${idx > 0 ? 'margin-top:4px; padding-top:4px; border-top:1px dashed var(--line);' : ''}">
            <b>${it.genero || '?'}</b>, ${capitalizarColor(it.color)}, talla <b>${it.talla || '?'}</b>
          </div>
        `).join('') + (items.some(it => it.programa) ? `<div style="margin-top:4px; color:var(--thread); font-size:12px; font-weight:600;">🧵 Bordado: ${items.map(it => it.programa).filter(Boolean).join(', ')}</div>` : '');
     }
     if (paraWhatsApp) {
       return items.map(it => {
         const base = `${it.genero || '?'}, ${capitalizarColor(it.color)}, talla ${it.talla || '?'}`;
         return it.programa ? `${base} — ${it.programa} (bordado)` : base;
       }).join('\n     ');
     }
     let texto = items.map(it => `${it.genero || '?'}, ${capitalizarColor(it.color)}, talla ${it.talla || '?'}`).join('; ');
     if (maxLength && texto.length > maxLength) texto = texto.substring(0, maxLength) + '…';
     return texto;
   }


  /* =====================================================
     SISTEMA DE TEMA CLARO / OSCURO / SISTEMA
     ===================================================== */
  let currentTheme = localStorage.getItem('theme_preference') || 'system';

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme_preference', theme);
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    let activeTheme = theme;
    if (theme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (activeTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (icon) icon.textContent = '🌙';
      if (label) label.textContent = theme === 'system' ? 'Sistema' : 'Oscuro';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (icon) icon.textContent = '☀️';
      if (label) label.textContent = theme === 'system' ? 'Sistema' : 'Claro';
    }
  }

  function toggleTheme() {
    if (currentTheme === 'light') applyTheme('dark');
    else if (currentTheme === 'dark') applyTheme('system');
    else applyTheme('light');
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'system') applyTheme('system');
  });

  /* =====================================================
     INICIALIZACIÓN DE LA APLICACIÓN
     ===================================================== */
   document.addEventListener('DOMContentLoaded', async () => {
     applyTheme(currentTheme);

     const fechaInput = document.getElementById('f-fecha');
     if (fechaInput) fechaInput.value = hoyColombia();

     const lugarSelect = document.getElementById('f-lugar-entrega');
     LUGARES_ENTREGA.forEach(lugar => {
       const opt = document.createElement('option');
       opt.value = lugar;
       opt.textContent = lugar;
       lugarSelect.appendChild(opt);
     });

     const csColorSelect = document.getElementById('cs-color');
     csColorSelect.innerHTML = coloresOptionsHtml('');
     const csTallaSelect = document.getElementById('cs-talla');
     csTallaSelect.innerHTML = '<option value="">Selecciona una talla</option>' +
       TALLAS_DISPONIBLES.map(t => `<option value="${t}">${t}</option>`).join('');

      document.getElementById('f-detalle-individual').addEventListener('change', onModoDetalleChange);
      document.getElementById('f-fecha-entrega-pendiente').addEventListener('change', onFechaEntregaPendienteChange);
      document.getElementById('f-lugar-entrega').addEventListener('change', actualizarLugarOtro);
      document.getElementById('cs-abono-total').addEventListener('input', (e) => {
        e.target.dataset.userEdited = 'true';
        actualizarTotalAbono();
      });

      // Listeners
      document.getElementById('login-button').addEventListener('click', handleLogin);
      ['login-email', 'login-password'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
          }
        });
      });
      document.getElementById('save-sale-button').addEventListener('click', saveVenta);
     document.getElementById('f-cantidad').addEventListener('input', onCantidadChange);
     document.getElementById('f-cantidad').addEventListener('change', onCantidadChange);
      document.getElementById('filter-vendedor').addEventListener('change', renderTable);
      document.getElementById('filter-estado').addEventListener('change', renderTable);
       document.getElementById('filter-search').addEventListener('input', debounce(() => { paginationState.orders = 0; renderTable(); }, 300));
      const fh = document.getElementById('filter-historial-search'); if (fh) fh.addEventListener('input', debounce(() => { paginationState.historial = 0; renderHistorial(); }, 300));
      const fc = document.getElementById('filter-compras-search'); if (fc) fc.addEventListener('input', debounce(() => { paginationState.compras = 0; renderCompras(); }, 300));
      const fl = document.getElementById('filter-liquidaciones-search'); if (fl) fl.addEventListener('input', debounce(() => { paginationState.liquidaciones = 0; renderLiquidaciones(); }, 300));
      const fu = document.getElementById('filter-usuarios-search'); if (fu) fu.addEventListener('input', debounce(() => { renderUsuariosTable(); }, 300));
      const inpCliente = document.getElementById('f-cliente'); if (inpCliente) { inpCliente.addEventListener('input', onClienteInput); inpCliente.addEventListener('change', onClienteInput); }
      const inpTel = document.getElementById('f-telefono'); if (inpTel) inpTel.addEventListener('input', validarTelefonoInput);

     document.getElementById('export-buy-btn').addEventListener('click', exportarCompraExcel);
     document.getElementById('export-full-btn').addEventListener('click', exportarExcelCompleto);

     document.getElementById('lq-pagador').addEventListener('change', (e) => {
       const receptor = document.getElementById('lq-receptor');
       receptor.value = e.target.value === 'Samir' ? 'Valentina' : 'Samir';
       renderLiquidacionPedidosSelect();
     });

     document.getElementById('lq-pedido').addEventListener('change', (e) => {
       const opt = e.target.selectedOptions[0];
       if (opt?.dataset?.saldo) {
         document.getElementById('lq-monto').value = opt.dataset.saldo;
       }
     });

     // Attach all action buttons
     document.querySelectorAll('.editar-button').forEach(button => {
       button.addEventListener('click', (e) => {
         e.preventDefault();
         const venta = ventasCache.find(v => v.id === button.dataset.id);
         if (venta) openForm(venta);
       });
     });

     await checkSession();
   });


  /* =====================================================
     CONTROL DE SESIÓN Y AUTENTICACIÓN
     ===================================================== */
  async function checkSession() {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) { showLogin(); return; }
      if (data?.session) {
        currentUser = data.session.user;
        await syncUserRoleAndShow();
      } else {
        showLogin();
      }
    } catch (error) {
      showLogin();
    }
  }

  function showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
  }

  async function syncUserRoleAndShow() {
    const email = (currentUser?.email || '').toLowerCase();
    let dbUser = null;

    try {
      const { data } = await supabaseClient.from('usuarios').select('*').eq('correo', email).single();
      dbUser = data;
    } catch (e) { logError('syncUserRole', e); }

    if (dbUser) {
      currentRole = {
        role: dbUser.rol,
        vendedor: dbUser.rol === 'admin' ? null : dbUser.nombre,
        nombre: dbUser.nombre
      };
    } else if (USER_ROLES_DEFAULT[email]) {
      currentRole = USER_ROLES_DEFAULT[email];
    } else {
      currentRole = { role: 'vendedor', vendedor: email.split('@')[0], nombre: email };
    }

    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');

    document.getElementById('who-label').textContent =
      `Sesión: ${email} (${currentRole.role === 'admin' ? 'Administrador' : 'Vendedor'})`;

    const tabUsersBtn = document.getElementById('tab-users-btn');
    const exportFullBtn = document.getElementById('export-full-btn');
    const exportFullCard = document.getElementById('export-full-card');
    const filtroVendedor = document.getElementById('filter-vendedor');

    if (currentRole.role === 'admin') {
      tabUsersBtn.classList.remove('hidden');
      exportFullBtn.classList.remove('hidden');
      exportFullCard.classList.remove('hidden');
      filtroVendedor.classList.remove('hidden');
    } else {
      tabUsersBtn.classList.add('hidden');
      exportFullBtn.classList.add('hidden');
      exportFullCard.classList.add('hidden');
      filtroVendedor.classList.add('hidden');
    }

    await loadVentas();
    await loadCompras();
    await loadLiquidaciones();
    if (currentRole.role === 'admin') await loadUsuarios();

    navigateTo('dashboard');
  }

  async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');

    errEl.classList.add('hidden');
    if (!email || !password) {
      errEl.textContent = 'Ingresa correo y contraseña.';
      errEl.classList.remove('hidden');
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        errEl.textContent = error.message;
        errEl.classList.remove('hidden');
        return;
      }
      currentUser = data.user;
      await syncUserRoleAndShow();
    } catch (error) {
      errEl.textContent = 'Error al iniciar sesión.';
      errEl.classList.remove('hidden');
    }
  }

  async function handleLogout() {
    try { await supabaseClient.auth.signOut(); } catch(e){ logError('logout', e); }
    currentUser = null;
    location.reload();
  }


  /* =====================================================
     NAVEGACIÓN POR SIDEBAR
     ===================================================== */
  function navigateTo(section) {
    const sections = ['dashboard', 'new-sale', 'orders', 'purchases', 'settlements', 'summaries', 'reports', 'settings', 'history'];
    sections.forEach(s => {
      document.getElementById(`section-${s}`).classList.add('hidden');
    });
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));

    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.remove('hidden');

    const sidebarItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
    if (sidebarItem) sidebarItem.classList.add('active');

    if (section === 'dashboard') {
      renderDashboard();
    } else if (section === 'new-sale') {
      document.getElementById('form-card').classList.remove('hidden');
    } else if (section === 'orders') {
      renderTable();
    } else if (section === 'history') {
      renderHistorial();
    } else if (section === 'purchases') {
      renderCompras();
    } else if (section === 'settlements') {
      renderLiquidaciones();
    } else if (section === 'summaries') {
      renderResumenes();
    } else if (section === 'settings' && currentRole.role === 'admin') {
      loadUsuarios();
    }

    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('show');
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-backdrop').classList.toggle('show');
  }

  // Close modals on Escape key — usa los close* para desbloquear scroll y limpiar estado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const cm = document.getElementById('compra-modal');
      if (cm && !cm.classList.contains('hidden')) closeCompraModal();
      const lm = document.getElementById('liquidacion-modal');
      if (lm && !lm.classList.contains('hidden')) closeLiquidacionModal();
      const um = document.getElementById('user-modal');
      if (um && !um.classList.contains('hidden')) closeUserModal();
    }
  });

  /* =====================================================
     1. VENTAS Y PEDIDOS (RESUMEN COMPARTIDO, TABLA PERSONAL)
     ===================================================== */
  async function loadVentas() {
    showLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) logError('loadVentas', error);
      ventasCache = data || [];

      renderVendorFilter();
      renderDashboard();
      renderTable();
      renderHistorial();
      renderCompras();
      actualizarDatalistClientes();
    } catch (err) {
      logError('loadVentas', err);
    } finally { showLoading(false); }
  }

  function renderVendorFilter() {
    const sel = document.getElementById('filter-vendedor');
    const current = sel.value;
    const vendors = [...new Set(ventasCache.map(v => v.vendedor).filter(Boolean))].sort();

    sel.innerHTML = '<option value="">Todos los vendedores</option>' +
      vendors.map(v => `<option value="${v}">${v}</option>`).join('');

    sel.value = current;
  }

  // DASHBOARD — pantalla principal: información rápida y accesos generales
  function renderDashboard() {
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;

    const pendientes = ventasCache.filter(v => !v.finalizado && normalizarEstado(v.estado) !== 'Liquidado' && normalizarEstado(v.estado) !== 'Entregado');

    const misVentas = pendientes
      .filter(v => esAdmin || v.vendedor === miNombre)
      .sort(ordenarPorEntrega);

    const misEntregas = pendientes
      .filter(v => v.entrega_por && (esAdmin || v.entrega_por === miNombre))
      .sort(ordenarPorEntrega);

    const porComprar = camisasPorComprar();
    const porComprarPedidos = pedidosPorComprar().length;
    const sinFecha = pedidosSinFechaEntrega().length;
    let totalPorCobrar = 0;
    ventasCache.forEach(v => {
      if (v.finalizado || normalizarEstado(v.estado) === 'Liquidado') return;
      totalPorCobrar += Math.max((Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 1) - (Number(v.abono) || 0), 0);
    });

    document.getElementById('dashboard-contenido').innerHTML = `
      <div id="dashboard-alertas"></div>
      <div class="dash-section" style="margin-bottom:24px;">
        <h2 style="font-size:17px;font-weight:600;margin:0 0 10px;">⚡ Accesos rápidos</h2>
        <div class="kpi-grid">
          <div class="kpi-card" style="cursor:pointer;" onclick="navigateTo('new-sale')">
            <div class="kpi-label">➕ Nueva Venta</div>
            <div class="kpi-value" style="font-size:16px;">Registrar</div>
            <div class="kpi-sub">Crea un nuevo pedido de camisas</div>
          </div>
          <div class="kpi-card" style="cursor:pointer;" onclick="navigateTo('orders')">
            <div class="kpi-label">📋 Pedidos</div>
            <div class="kpi-value" style="font-size:16px;">${pendientes.length}</div>
            <div class="kpi-sub">Pedidos activos</div>
          </div>
          <div class="kpi-card" style="cursor:pointer;" onclick="navigateTo('summaries')">
            <div class="kpi-label">📊 Resúmenes</div>
            <div class="kpi-value" style="font-size:16px;">Ver</div>
            <div class="kpi-sub">Estadísticas y análisis del negocio</div>
          </div>
          <div class="kpi-card" style="cursor:pointer;" onclick="navigateTo('settlements')">
            <div class="kpi-label">💰 Liquidaciones</div>
            <div class="kpi-value" style="font-size:16px;">Ver</div>
            <div class="kpi-sub">Saldos y ganancias entre socios</div>
          </div>
        </div>
      </div>
      <div class="dash-section" style="margin-bottom:24px;">
        <h2 style="font-size:17px;font-weight:600;margin:0 0 10px;">🏭 Estado del negocio</h2>
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left:3px solid var(--warn);">
            <div class="kpi-label">🛒 Camisas por comprar</div>
            <div class="kpi-value">${porComprar}</div>
            <div class="kpi-sub">${porComprarPedidos} pedidos sin ir a la distribuidora</div>
          </div>
          <div class="kpi-card" style="border-left:3px solid var(--thread);">
            <div class="kpi-label">📦 Pedidos sin fecha de entrega</div>
            <div class="kpi-value">${sinFecha}</div>
            <div class="kpi-sub">Esperando definir la entrega</div>
          </div>
          <div class="kpi-card" style="border-left:3px solid var(--gold);">
            <div class="kpi-label">🏦 Por cobrar</div>
            <div class="kpi-value">${fmt(totalPorCobrar)}</div>
            <div class="kpi-sub">Saldo pendiente de los clientes</div>
          </div>
          <div class="kpi-card" style="border-left:3px solid var(--ok);">
            <div class="kpi-label">📋 Pedidos activos</div>
            <div class="kpi-value">${pendientes.length}</div>
            <div class="kpi-sub">En la lista de trabajo</div>
          </div>
        </div>
      </div>
      <div class="dash-list">
        <div class="dash-list-header">
          <h2>🛒 Pedidos que vendí</h2>
          <span class="dash-list-subtitle">Pedidos vendidos por mí, sin importar quién realiza la entrega.</span>
          <span class="dash-list-count">${misVentas.length}</span>
        </div>
        ${misVentas.length === 0
          ? '<div class="dash-empty">🎉 No hay pedidos pendientes.</div>'
          : misVentas.map(v => renderOrderCard(v)).join('')
        }
      </div>
      <div class="dash-list">
        <div class="dash-list-header">
          <h2>📦 Pedidos que debo entregar</h2>
          <span class="dash-list-subtitle">Pedidos cuya entrega está asignada a mí.</span>
          <span class="dash-list-count">${misEntregas.length}</span>
        </div>
        ${misEntregas.length === 0
          ? '<div class="dash-empty">🎉 No hay entregas asignadas.</div>'
          : misEntregas.map(v => renderOrderCard(v)).join('')
        }
      </div>
    `;

    calcularAlertas();
  }

  function itemsParaDashboard(v) {
    let items = null;
    if (v.items_camisa) {
      try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [`• ${v.genero || '?'} · ${capitalizarColor(v.color)} · ${v.talla || '?'}`];
    }
    return items.map(it => {
      const base = `${it.genero || '?'} · ${capitalizarColor(it.color)} · ${it.talla || '?'}`;
      return it.programa ? `• ${base} · ${it.programa}` : `• ${base}`;
    });
  }

  function esUsuarioWhatsApp(tel) {
    return /^@/.test(String(tel || '').trim());
  }

  function copiarUsuarioWhatsApp(usuario) {
    const user = String(usuario || '').trim();
    const avisar = () => mostrarToast('Usuario ' + user + ' copiado. Búscalo en WhatsApp: Chats > Nuevo chat > buscar.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(user).then(avisar).catch(avisar);
    } else {
      const ta = document.createElement('textarea');
      ta.value = user;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      avisar();
    }
  }

  // Clave única del cliente para agrupar pedidos del mismo contacto.
  // Usa el contacto (teléfono/@) como fuente de verdad: mismo número/@ = mismo cliente
  // aunque el nombre varíe ligeramente. Si no hay contacto, usa el nombre.
  function claveCliente(v) {
    const tel = String(v && v.cliente_telefono || '').trim();
    if (tel) {
      if (esUsuarioWhatsApp(tel)) return '@' + tel.replace(/^@/, '').trim().toLowerCase().replace(/\s+/g, '');
      const digitos = tel.replace(/\D/g, '');
      if (digitos) return digitos;
      return tel.toLowerCase();
    }
    return String(v && v.cliente_nombre || '').trim().toLowerCase() || '__sin_contacto__';
  }

  function etiquetaClienteGrupo(pedidos) {
    if (!pedidos || !pedidos.length) return 'Sin cliente';
    // nombre más frecuente dentro del grupo (evita que un typo genere etiqueta rara)
    const freq = {};
    pedidos.forEach(p => { const n = String(p.cliente_nombre || '').trim() || 'Sin cliente'; freq[n] = (freq[n]||0)+1; });
    let mejor = pedidos[0].cliente_nombre || 'Sin cliente';
    let max = 0;
    Object.entries(freq).forEach(([n,c]) => { if (c>max){max=c; mejor=n;} });
    return mejor;
  }

  function renderOrderCard(v) {
    const cant = Number(v.cantidad) || 1;
    const precio = Number(v.precio_unitario) || 0;
    const abono = Number(v.abono) || 0;
    const saldo = (precio * cant) - abono;
    const items = itemsParaDashboard(v);
    const telefonoCrudo = String(v.cliente_telefono || '').trim();
    const telefonoLimpio = telefonoCrudo.replace(/\D/g, '');
    const waLink = telefonoLimpio ? `https://wa.me/57${telefonoLimpio}` : '';
    const waUsuario = (!telefonoLimpio && esUsuarioWhatsApp(telefonoCrudo)) ? telefonoCrudo.replace(/'/g, "\\'") : '';
    const detalleWhatsApp = items.map(it => it.replace(/^• /, '')).join('\n     ');
    const msgWhatsApp = encodeURIComponent(
      `📌 *Recordatorio Camisas IUB* 🧵\n\n👤 *Cliente:* ${v.cliente_nombre}\n📞 *Teléfono:* ${v.cliente_telefono}\n👕 *Detalle:* \n     ${detalleWhatsApp}\n🔢 *Cantidad:* ${cant}\n💰 *Saldo Pendiente:* ${fmt(saldo)}\n*Fecha Entrega:* ${textoFechaEntrega(v)}\n📍 *Lugar:* ${v.lugar_entrega || 'Sin definir'}`
    );
    const fechaEntregaDisplay = v.fecha_entrega ? `📅 ${textoFechaEntrega(v)}` : '⏳ Pendiente por definir';

    return `
      <div class="order-card">
        <div class="order-card-row order-card-meta">
          <span class="order-card-date">${fechaEntregaDisplay}</span>
          <span class="order-card-entrega">📍 Entrega: ${v.lugar_entrega ? escSimple(v.lugar_entrega) : 'Por definir'}, ${v.entrega_por ? escSimple(v.entrega_por) : 'Sin asignar'}</span>
          <span class="order-card-vendedor">Vendedor: ${v.vendedor || ''}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-client">👤 ${v.cliente_nombre || '—'}</span>
          <span class="order-card-phone">📞 ${v.cliente_telefono || '—'}${waLink ? ` · <a href="${waLink}" target="_blank" style="color:var(--ok);font-weight:600;text-decoration:none;">WhatsApp</a>` : (waUsuario ? ` · <a href="#" onclick="copiarUsuarioWhatsApp('${waUsuario}');return false;" style="color:var(--ok);font-weight:600;text-decoration:none;">Copiar @</a>` : '')}</span>
          <span class="order-card-saldo" style="color:${saldo > 0 ? 'var(--warn)' : 'var(--ok)'}">💰 ${fmt(saldo)}</span>
          <span class="order-card-copy"><button class="btn-copy-card" onclick="copiarWhatsApp('${msgWhatsApp}')" type="button">📋 Copiar</button></span>
        </div>
        <div class="order-card-row">
          <span class="badge-estado ${claseEstado(v.estado)}">${escSimple(normalizarEstado(v.estado))}</span>
          ${badgeModeloVenta(v)}
        </div>
        <hr class="order-card-divider">
        <div class="order-card-items">
          ${items.map(it => `<div class="order-card-item">${it}</div>`).join('')}
        </div>
      </div>
    `;
  }

  function copiarWhatsApp(msg) {
    const texto = decodeURIComponent(msg);
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToast('✅ Mensaje copiado al portapapeles. Pégalo en WhatsApp.');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      mostrarToast('✅ Mensaje copiado. Pégalo en WhatsApp.');
    });
  }

  // ALERTAS — dashboard
  function calcularAlertas() {
    const container = document.getElementById('dashboard-alertas');
    const hoy = hoyColombia();
    const alertas = [];
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;
    const misVentas = (esAdmin ? ventasCache : ventasCache.filter(v => v.vendedor === miNombre)).filter(v => !v.finalizado);

    misVentas.forEach(v => {
      if (!v.fecha_entrega || normalizarEstado(v.estado) === 'Liquidado' || normalizarEstado(v.estado) === 'Entregado') return;
      if (v.fecha_entrega < hoy) {
        alertas.push({ tipo: 'critical', msg: `⏰ Pedido vencido: <b>${v.cliente_nombre}</b> (${v.vendedor}) — debía entregarse el ${formatearFechaHumana(v.fecha_entrega)}` });
      }
    });

    const clientesDeuda = {};
    misVentas.forEach(v => {
      if (normalizarEstado(v.estado) === 'Liquidado') return;
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const abono = Number(v.abono) || 0;
      const saldo = (precio * cant) - abono;
      if (saldo > 0) clientesDeuda[v.cliente_nombre] = (clientesDeuda[v.cliente_nombre] || 0) + saldo;
    });
    Object.entries(clientesDeuda).forEach(([nombre, deuda]) => {
      if (deuda > 100000) alertas.push({ tipo: 'warning', msg: `⚠️ Cliente con deuda alta: <b>${nombre}</b> — debe ${fmt(deuda)}` });
    });

    if (alertas.length === 0) alertas.push({ tipo: 'success', msg: '✅ Todo al día — No hay alertas pendientes.' });

    container.innerHTML = alertas.map(a => `<div class="alert-item ${a.tipo}">${a.msg}</div>`).join('');
  }

  /* =====================================================
     RESUMENES — CENTRO DE ESTADÍSTICAS Y ANÁLISIS
     ===================================================== */
  function escSimple(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function resPeriodoLabel() {
    const labels = {
      todo: 'Todos los tiempos', hoy: 'Hoy', ayer: 'Ayer',
      semana: 'Últimos 7 días', mes: 'Este mes', anio: 'Este año', rango: 'Rango personalizado'
    };
    return labels[document.getElementById('res-periodo').value] || 'Todos los tiempos';
  }

  function resRangoToggle() {
    const block = document.getElementById('res-rango-block');
    if (!block) return;
    block.classList.toggle('hidden', document.getElementById('res-periodo').value !== 'rango');
  }

  // ¿La fecha (YYYY-MM-DD) cae dentro del período seleccionado?
  function resPeriodoAplica(fecha) {
    if (!fecha) return false;
    const f = String(fecha).slice(0, 10);
    const hoy = hoyColombia();
    const periodo = document.getElementById('res-periodo').value;
    if (periodo === 'todo') return true;

    if (periodo === 'rango') {
      const desde = document.getElementById('res-desde').value;
      const hasta = document.getElementById('res-hasta').value;
      if (!desde) return true;
      if (f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    }
    if (periodo === 'hoy') return f === hoy;
    if (periodo === 'ayer') {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      return f === ayer.toLocaleDateString('en-CA');
    }
    if (periodo === 'semana') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 6);
      return f >= inicio.toLocaleDateString('en-CA') && f <= hoy;
    }
    if (periodo === 'mes') return f.slice(0, 7) === hoy.slice(0, 7);
    if (periodo === 'anio') return f.slice(0, 4) === hoy.slice(0, 4);
    return true;
  }

  function itemsCamisaVenta(v) {
    let items = null;
    if (v.items_camisa) {
      try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [{ color: v.color, talla: v.talla, genero: v.genero }];
    }
    return items;
  }

  // Rango de fechas del período seleccionado (YYYY-MM-DD).
  function resRangoFechas() {
    const p = document.getElementById('res-periodo').value;
    const hoy = hoyColombia();
    if (p === 'todo') {
      const fechas = ventasCache.map(v => v.fecha).filter(Boolean).sort();
      return { desde: fechas[0] || hoy, hasta: hoy };
    }
    if (p === 'hoy') return { desde: hoy, hasta: hoy };
    if (p === 'ayer') {
      const a = new Date(); a.setDate(a.getDate() - 1);
      const s = a.toLocaleDateString('en-CA');
      return { desde: s, hasta: s };
    }
    if (p === 'semana') {
      const a = new Date(); a.setDate(a.getDate() - 6);
      return { desde: a.toLocaleDateString('en-CA'), hasta: hoy };
    }
    if (p === 'mes') {
      const h = new Date(hoy + 'T12:00:00');
      return { desde: new Date(h.getFullYear(), h.getMonth(), 1).toLocaleDateString('en-CA'), hasta: hoy };
    }
    if (p === 'anio') {
      const h = new Date(hoy + 'T12:00:00');
      return { desde: `${h.getFullYear()}-01-01`, hasta: hoy };
    }
    let desde = document.getElementById('res-desde').value || hoy;
    let hasta = document.getElementById('res-hasta').value || hoy;
    if (desde > hasta) { const t = desde; desde = hasta; hasta = t; }
    return { desde, hasta };
  }

  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function resLabelBucket(k, porDia) {
    if (porDia) {
      const p = k.split('-');
      const d = new Date(+p[0], +p[1] - 1, +p[2]);
      return `${DIAS_CORTOS[d.getDay()]} ${+p[2]} ${MESES_CORTOS[+p[1] - 1]}`;
    }
    const p = k.split('-');
    const m = MESES_CORTOS[+p[1] - 1];
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${p[0]}`;
  }

  // Desglose del período: por día si es corto (≤31 días), por mes si es largo.
  function resDesglose() {
    const { desde, hasta } = resRangoFechas();
    const d1 = new Date(desde + 'T12:00:00');
    const d2 = new Date(hasta + 'T12:00:00');
    const porDia = Math.round((d2 - d1) / 86400000) <= 31;
    const keys = [];
    const buckets = {};
    const cur = porDia ? new Date(d1) : new Date(d1.getFullYear(), d1.getMonth(), 1);
    while (cur <= d2) {
      const key = porDia
        ? cur.toLocaleDateString('en-CA')
        : `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
      buckets[key] = { pedidos: 0, camisas: 0, vendido: 0, costo: 0 };
      if (porDia) cur.setDate(cur.getDate() + 1);
      else cur.setMonth(cur.getMonth() + 1);
    }
    return { porDia, keys, buckets };
  }

  function renderResumenes() {
    const selVendedor = document.getElementById('res-vendedor');
    const selCliente = document.getElementById('res-cliente');
    const fVendedor = selVendedor.value;
    const fCliente = selCliente.value;

    const vendors = [...new Set(ventasCache.map(v => v.vendedor).filter(Boolean))].sort();
    selVendedor.innerHTML = '<option value="">Todos</option>' + vendors.map(v =>
      `<option value="${escSimple(v)}" ${v === fVendedor ? 'selected' : ''}>${escSimple(v)}</option>`).join('');

    const clientes = [...new Set(ventasCache.map(v => v.cliente_nombre).filter(Boolean))].sort();
    selCliente.innerHTML = '<option value="">Todos</option>' + clientes.map(c =>
      `<option value="${escSimple(c)}" ${c === fCliente ? 'selected' : ''}>${escSimple(c)}</option>`).join('');

    const ventasFiltradas = ventasCache.filter(v => {
      if (!resPeriodoAplica(v.fecha)) return false;
      if (fVendedor && v.vendedor !== fVendedor) return false;
      if (fCliente && (v.cliente_nombre || '') !== fCliente) return false;
      return true;
    });

    // ---------- VENTAS ----------
    let totalCamisas = 0;
    let totalVendido = 0;
    let totalCosto = 0;
    let totalAbonos = 0;
    const productos = {};
    ventasFiltradas.forEach(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const costoU = Number(v.costo_unitario) || 0;
      const abono = Number(v.abono) || 0;
      totalCamisas += cant;
      totalVendido += precio * cant;
      totalCosto += costoU * cant;
      totalAbonos += abono;
      let detalleIndividual = null;
      if (v.items_camisa) {
        try {
          const parsed = JSON.parse(v.items_camisa);
          if (Array.isArray(parsed) && parsed.length > 0) detalleIndividual = parsed;
        } catch (e) { detalleIndividual = null; }
      }
      if (detalleIndividual) {
        detalleIndividual.forEach(it => {
          const clave = `${it.color || '?'} · ${it.talla || '?'} · ${it.genero || '?'}`;
          if (!productos[clave]) productos[clave] = { cantidad: 0, color: it.color || '?', talla: it.talla || '?', genero: it.genero || '?' };
          productos[clave].cantidad += 1;
        });
      } else {
        const clave = `${v.color || '?'} · ${v.talla || '?'} · ${v.genero || '?'}`;
        if (!productos[clave]) productos[clave] = { cantidad: 0, color: v.color || '?', talla: v.talla || '?', genero: v.genero || '?' };
        productos[clave].cantidad += cant;
      }
    });

    // ---------- POR MODELO ----------
    const porModelo = { Viejo: { camisas: 0, vendido: 0 }, Nuevo: { camisas: 0, vendido: 0 } };
    ventasFiltradas.forEach(v => {
      const precio = Number(v.precio_unitario) || 0;
      let detalleIndividual = null;
      if (v.items_camisa) {
        try {
          const parsed = JSON.parse(v.items_camisa);
          if (Array.isArray(parsed) && parsed.length > 0) detalleIndividual = parsed;
        } catch (e) { detalleIndividual = null; }
      }
      if (detalleIndividual) {
        detalleIndividual.forEach(it => {
          const m = normalizarModelo(it.modelo);
          porModelo[m].camisas += 1;
          porModelo[m].vendido += precio;
        });
      } else {
        const m = normalizarModelo(v.modelo);
        const cant = Number(v.cantidad) || 1;
        porModelo[m].camisas += cant;
        porModelo[m].vendido += precio * cant;
      }
    });
    const camisasModelo = porModelo.Viejo.camisas + porModelo.Nuevo.camisas;
    const pctViejo = camisasModelo ? Math.round((porModelo.Viejo.camisas / camisasModelo) * 100) : 0;
    const pctNuevo = 100 - pctViejo;
    const liderModelo = porModelo.Viejo.camisas >= porModelo.Nuevo.camisas ? 'Viejo' : 'Nuevo';
    const pctLider = liderModelo === 'Viejo' ? pctViejo : pctNuevo;

    // ---------- PEDIDOS ----------
    const pedidosActivos = ventasFiltradas.filter(v => !v.finalizado && normalizarEstado(v.estado) !== 'Liquidado').length;
    const pedidosFinalizados = ventasFiltradas.filter(v => v.finalizado).length;
    const entregados = ventasFiltradas.filter(v => normalizarEstado(v.estado) === 'Entregado').length;

    // ---------- COMPRAS PENDIENTES (estado actual, sin filtro de período) ----------
    const porComprar = pedidosPorComprar().filter(v =>
      (!fVendedor || v.vendedor === fVendedor) &&
      (!fCliente || (v.cliente_nombre || '') === fCliente)
    );
    const camisasPorComprarN = porComprar.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
    const sinFecha = pedidosSinFechaEntrega().filter(v =>
      (!fVendedor || v.vendedor === fVendedor) &&
      (!fCliente || (v.cliente_nombre || '') === fCliente)
    ).length;

    // ---------- POR VENDEDOR ----------
    const porVendedor = {};
    ventasFiltradas.forEach(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const costoU = Number(v.costo_unitario) || 0;
      const abono = Number(v.abono) || 0;
      const nombre = v.vendedor || 'Sin asignar';
      if (!porVendedor[nombre]) porVendedor[nombre] = { camisas: 0, vendido: 0, ganancia: 0, restante: 0 };
      porVendedor[nombre].camisas += cant;
      porVendedor[nombre].vendido += precio * cant;
      porVendedor[nombre].ganancia += (precio - costoU) * cant;
      porVendedor[nombre].restante += Math.max(precio * cant - abono, 0);
    });

    // ---------- CLIENTES ----------
    const porCliente = {};
    ventasFiltradas.forEach(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const abono = Number(v.abono) || 0;
      const nombre = v.cliente_nombre || 'Sin nombre';
      if (!porCliente[nombre]) porCliente[nombre] = { pedidos: 0, camisas: 0, vendido: 0, deuda: 0 };
      porCliente[nombre].pedidos += 1;
      porCliente[nombre].camisas += cant;
      porCliente[nombre].vendido += precio * cant;
      porCliente[nombre].deuda += Math.max(precio * cant - abono, 0);
    });

    // ---------- COMPRAS ----------
    const comprasFiltradas = comprasCache.filter(c =>
      resPeriodoAplica(c.fecha) && (!fVendedor || c.comprador === fVendedor)
    );
    const comprasInvertido = comprasFiltradas.reduce((s, c) => {
      const costo = ventasCache
        .filter(v => v.compra_id === c.id)
        .reduce((ss, v) => ss + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);
      return s + costo;
    }, 0);

    // ---------- LIQUIDACIONES ----------
    const liqFiltradas = liquidacionesCache.filter(l =>
      resPeriodoAplica(l.fecha) && (!fVendedor || l.pagador === fVendedor)
    );
    const liqTotal = liqFiltradas.reduce((s, l) => s + (Number(l.monto) || 0), 0);

    // ---------- DESGLOSE POR DÍA / MES ----------
    const desglose = resDesglose();
    ventasFiltradas.forEach(v => {
      const f = (v.fecha || '').slice(0, 10);
      const k = desglose.porDia ? f : f.slice(0, 7);
      const b = desglose.buckets[k];
      if (!b) return;
      const cant = Number(v.cantidad) || 1;
      b.pedidos += 1;
      b.camisas += cant;
      b.vendido += (Number(v.precio_unitario) || 0) * cant;
      b.costo += (Number(v.costo_unitario) || 0) * cant;
    });

    const camposVendedor = {
      nombre:   { val: e => (e[0] || '').toLowerCase(), tipo: 'text' },
      camisas:  { val: e => e[1].camisas, tipo: 'num' },
      vendido:  { val: e => e[1].vendido, tipo: 'num' },
      ganancia: { val: e => e[1].ganancia, tipo: 'num' },
      restante: { val: e => e[1].restante, tipo: 'num' }
    };
    const camposProducto = {
      color:    { val: p => (p.color || '').toLowerCase(), tipo: 'text' },
      talla:    { val: p => (p.talla || '').toLowerCase(), tipo: 'text' },
      genero:   { val: p => (p.genero || '').toLowerCase(), tipo: 'text' },
      cantidad: { val: p => p.cantidad, tipo: 'num' }
    };
    const camposCliente = {
      nombre:  { val: e => (e[0] || '').toLowerCase(), tipo: 'text' },
      pedidos: { val: e => e[1].pedidos, tipo: 'num' },
      camisas: { val: e => e[1].camisas, tipo: 'num' },
      vendido: { val: e => e[1].vendido, tipo: 'num' },
      deuda:   { val: e => e[1].deuda, tipo: 'num' }
    };
    let rkVendedores = Object.entries(porVendedor).sort((a, b) => b[1].camisas - a[1].camisas);
    if (ordenTablas.resumenVendedores) rkVendedores = ordenarFilas(rkVendedores, 'resumenVendedores', camposVendedor);
    let rkProductos = Object.values(productos).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
    if (ordenTablas.resumenColores) rkProductos = ordenarFilas(rkProductos, 'resumenColores', camposProducto);
    let rkClientes = Object.entries(porCliente).sort((a, b) => b[1].vendido - a[1].vendido).slice(0, 8);
    if (ordenTablas.resumenClientes) rkClientes = ordenarFilas(rkClientes, 'resumenClientes', camposCliente);

    const ganancia = totalVendido - totalCosto;
    const porCobrar = Math.max(totalVendido - totalAbonos, 0);

    const filaVendedor = rkVendedores.map(([nombre, p], i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${escSimple(nombre)}</b></td>
        <td class="c">${p.camisas}</td>
        <td class="money">${fmt(p.vendido)}</td>
        <td class="money" style="color:var(--ok);">${fmt(p.ganancia)}</td>
        <td class="money" style="color:var(--warn);">${fmt(p.restante)}</td>
      </tr>`).join('');

    const filaProducto = rkProductos.map((p, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${escSimple(capitalizarColor(p.color))}</td>
        <td class="c">${escSimple(p.talla)}</td>
        <td class="c">${escSimple(p.genero)}</td>
        <td class="c"><b>${p.cantidad}</b></td>
      </tr>`).join('');

    const filaCliente = rkClientes.map(([nombre, c], i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td><b>${escSimple(nombre)}</b></td>
        <td class="c">${c.pedidos}</td>
        <td class="c">${c.camisas}</td>
        <td class="money">${fmt(c.vendido)}</td>
        <td class="money" style="color:${c.deuda > 0 ? 'var(--warn)' : 'var(--ok)'};">${fmt(c.deuda)}</td>
      </tr>`).join('');

    const camposDesglose = {
      etiqueta: { val: k => resLabelBucket(k, desglose.porDia), tipo: 'text' },
      pedidos:  { val: k => desglose.buckets[k].pedidos, tipo: 'num' },
      camisas:  { val: k => desglose.buckets[k].camisas, tipo: 'num' },
      vendido:  { val: k => desglose.buckets[k].vendido, tipo: 'num' },
      ganancia: { val: k => desglose.buckets[k].vendido - desglose.buckets[k].costo, tipo: 'num' }
    };
    const filaDesglose = ordenarFilas(desglose.keys, 'resumenDias', camposDesglose)
      .filter(k => desglose.buckets[k].pedidos > 0)
      .map(k => {
        const b = desglose.buckets[k];
        return `
        <tr>
          <td>${resLabelBucket(k, desglose.porDia)}</td>
          <td class="c">${b.pedidos}</td>
          <td class="c">${b.camisas}</td>
          <td class="money">${fmt(b.vendido)}</td>
          <td class="money" style="color:var(--ok);">${fmt(b.vendido - b.costo)}</td>
        </tr>`;
      }).join('');

    document.getElementById('resumen-contenido').innerHTML = `
      <div style="color:var(--muted); font-size:12.5px; margin-bottom:12px;">Período: <b>${resPeriodoLabel()}</b>${fVendedor ? ` · Vendedor: <b>${escSimple(fVendedor)}</b>` : ''}${fCliente ? ` · Cliente: <b>${escSimple(fCliente)}</b>` : ''}</div>

      <h3 style="margin:0 0 12px; font-size:15px;">💵 Ventas del período</h3>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Ventas (total vendido)</div>
          <div class="kpi-value">${fmt(totalVendido)}</div>
          <div class="kpi-sub">${ventasFiltradas.length} pedidos · ${totalCamisas} camisas</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ganancias</div>
          <div class="kpi-value" style="color:var(--ok);">${fmt(ganancia)}</div>
          <div class="kpi-sub">50% por socio: ${fmt(ganancia / 2)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Por cobrar</div>
          <div class="kpi-value" style="color:var(--warn);">${fmt(porCobrar)}</div>
          <div class="kpi-sub">Abonado: ${fmt(totalAbonos)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Camisas vendidas</div>
          <div class="kpi-value">${totalCamisas}</div>
          <div class="kpi-sub">Costo total: ${fmt(totalCosto)}</div>
        </div>
      </div>

<h3 style="margin:24px 0 12px; font-size:15px;">👕 Camisas por versión</h3>
        <div class="kpi-grid">
          <div class="kpi-card" style="border-left:3px solid var(--gold);">
            <div class="kpi-label">Versión 1</div>
          <div class="kpi-value">${porModelo.Viejo.camisas}</div>
          <div class="kpi-sub">${fmt(porModelo.Viejo.vendido)} en ventas</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid var(--thread);">
          <div class="kpi-label">Versión 2</div>
          <div class="kpi-value">${porModelo.Nuevo.camisas}</div>
          <div class="kpi-sub">${fmt(porModelo.Nuevo.vendido)} en ventas</div>
        </div>
      </div>
      <div class="modelo-comparison">
        <div class="modelo-row">
          <span class="modelo-name">Versión 1</span>
          <span class="modelo-bar"><span class="modelo-fill fill-viejo" style="width:${pctViejo}%;"></span></span>
          <span class="modelo-pct">${pctViejo}%</span>
        </div>
        <div class="modelo-row">
          <span class="modelo-name">Versión 2</span>
          <span class="modelo-bar"><span class="modelo-fill fill-nuevo" style="width:${pctNuevo}%;"></span></span>
          <span class="modelo-pct">${pctNuevo}%</span>
        </div>
      </div>
      <p class="hint" style="margin:12px 0 0;">La <b>${liderModelo === 'Viejo' ? 'Versión 1' : 'Versión 2'}</b> es la que más se vende en este período (${pctLider}% de las camisas).</p>

      <h3 style="margin:24px 0 12px; font-size:15px;">🛒 Abonos a Yesenia (estado actual)</h3>
      <div class="kpi-grid">
        <div class="kpi-card" style="border-left:3px solid var(--warn);">
          <div class="kpi-label">Camisas por comprar</div>
          <div class="kpi-value">${camisasPorComprarN}</div>
          <div class="kpi-sub">${porComprar.length} pedidos sin ir a la distribuidora</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid var(--thread);">
          <div class="kpi-label">Pedidos sin fecha de entrega</div>
          <div class="kpi-value">${sinFecha}</div>
          <div class="kpi-sub">Esperando definir la entrega</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Invertido en compras</div>
          <div class="kpi-value">${fmt(comprasInvertido)}</div>
          <div class="kpi-sub">${comprasFiltradas.length} compras registradas</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Liquidado entre socios</div>
          <div class="kpi-value" style="color:var(--ok);">${fmt(liqTotal)}</div>
          <div class="kpi-sub">${liqFiltradas.length} pagos registrados</div>
        </div>
      </div>

      <h3 style="margin:24px 0 12px; font-size:15px;">📦 Flujo de pedidos</h3>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Pedidos activos</div>
          <div class="kpi-value">${pedidosActivos}</div>
          <div class="kpi-sub">En la lista de trabajo</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Entregados</div>
          <div class="kpi-value">${entregados}</div>
          <div class="kpi-sub">Marcados como entregados</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Finalizados</div>
          <div class="kpi-value">${pedidosFinalizados}</div>
          <div class="kpi-sub">Cerrados en Historial</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Deuda de clientes</div>
          <div class="kpi-value" style="color:var(--warn);">${fmt(porCobrar)}</div>
          <div class="kpi-sub">Saldo pendiente de cobrar</div>
        </div>
      </div>

      <h3 style="margin:24px 0 12px; font-size:15px;">📅 Actividad ${desglose.porDia ? 'por día' : 'por mes'}</h3>
      <div class="table-wrap">
        <table class="admin-table" data-orden-clave="resumenDias">
          <thead>
            <tr>
              <th data-orden="etiqueta">${desglose.porDia ? 'Día' : 'Mes'}</th>
              <th class="c" data-orden="pedidos">Pedidos</th>
              <th class="c" data-orden="camisas">Camisas</th>
              <th data-orden="vendido">Vendido</th>
              <th data-orden="ganancia">Ganancia</th>
            </tr>
          </thead>
          <tbody>${filaDesglose || '<tr><td colspan="5" style="color:var(--muted);text-align:center;">Sin ventas en el período.</td></tr>'}</tbody>
        </table>
      </div>

      <h3 style="margin:24px 0 12px; font-size:15px;">🏆 Rankings</h3>
      <div class="table-wrap" style="margin-top:0;">
        <h4 style="margin:0 0 8px; font-size:13.5px;">Vendedores</h4>
        <table class="admin-table" data-orden-clave="resumenVendedores">
          <thead>
            <tr>
              <th class="c" style="width:40px;">#</th>
              <th data-orden="nombre">Vendedor</th>
              <th class="c" data-orden="camisas">Camisas</th>
              <th data-orden="vendido">Vendido</th>
              <th data-orden="ganancia">Ganancia</th>
              <th data-orden="restante">Por cobrar</th>
            </tr>
          </thead>
          <tbody>${filaVendedor || '<tr><td colspan="6" style="color:var(--muted);text-align:center;">Sin datos en el período.</td></tr>'}</tbody>
        </table>
      </div>

      <div class="table-wrap" style="margin-top:18px;">
        <h4 style="margin:0 0 8px; font-size:13.5px;">Camisas más vendidas (top 8)</h4>
        <table class="admin-table" data-orden-clave="resumenColores">
          <thead>
            <tr>
              <th class="c" style="width:40px;">#</th>
              <th data-orden="color">Color</th>
              <th class="c" data-orden="talla">Talla</th>
              <th class="c" data-orden="genero">Género</th>
              <th class="c" data-orden="cantidad">Unidades</th>
            </tr>
          </thead>
          <tbody>${filaProducto || '<tr><td colspan="5" style="color:var(--muted);text-align:center;">Sin datos en el período.</td></tr>'}</tbody>
        </table>
      </div>

      <div class="table-wrap" style="margin-top:18px;">
        <h4 style="margin:0 0 8px; font-size:13.5px;">Clientes (top 8)</h4>
        <table class="admin-table" data-orden-clave="resumenClientes">
          <thead>
            <tr>
              <th class="c" style="width:40px;">#</th>
              <th data-orden="nombre">Cliente</th>
              <th class="c" data-orden="pedidos">Pedidos</th>
              <th class="c" data-orden="camisas">Camisas</th>
              <th data-orden="vendido">Vendido</th>
              <th data-orden="deuda">Deuda</th>
            </tr>
          </thead>
          <tbody>${filaCliente || '<tr><td colspan="6" style="color:var(--muted);text-align:center;">Sin datos en el período.</td></tr>'}</tbody>
        </table>
      </div>
    `;

    marcarOrdenTabla('resumenDias');
    marcarOrdenTabla('resumenVendedores');
    marcarOrdenTabla('resumenColores');
    marcarOrdenTabla('resumenClientes');
  }

  // TABLA DE PEDIDOS (PERSONAL POR VENDEDOR)
  function getVentasFiltradas() {
    const fv = document.getElementById('filter-vendedor').value;
    const fe = document.getElementById('filter-estado').value;
    const fs = (document.getElementById('filter-search').value || '').toLowerCase().trim();

    return ventasCache.filter(v => {
      if (v.finalizado) return false;
      if (fv && v.vendedor !== fv) return false;
      if (fe && v.estado !== fe) return false;
      if (fs && !(
        (v.cliente_nombre || '').toLowerCase().includes(fs) ||
        (v.cliente_telefono || '').toLowerCase().includes(fs) ||
        (v.vendedor || '').toLowerCase().includes(fs) ||
        (v.id || '').toLowerCase().includes(fs) ||
        (v.fecha || '').includes(fs) ||
        (v.fecha_entrega || '').includes(fs) ||
        (v.lugar_entrega || '').toLowerCase().includes(fs) ||
        (v.estado || '').toLowerCase().includes(fs) ||
        (formatearFechaHumana(v.fecha) || '').toLowerCase().includes(fs) ||
        (formatearFechaHumana(v.fecha_entrega) || '').toLowerCase().includes(fs)
      )) return false;
      if (currentRole.role !== 'admin' && currentRole.vendedor && v.vendedor !== currentRole.vendedor) return false;
      return true;
    });
  }

  function renderTable() {
    let rows = getVentasFiltradas();
    if (ordenTablas.ordenes) {
      rows = ordenarFilas(rows, 'ordenes', REGISTRO_ORDEN.ordenes.campos);
    } else {
      rows.sort((a, b) => {
        const fa = a.fecha || '9999-12-31';
        const fb = b.fecha || '9999-12-31';
        if (fa !== fb) return fa < fb ? 1 : -1;
        return 0;
      });
    }

    const body = document.getElementById('ventas-body');
    document.getElementById('empty-state').classList.toggle('hidden', rows.length > 0);

    const page = paginationState.orders;
    const totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
    const start = page * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    body.innerHTML = pageRows.map(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const costoUnitario = Number(v.costo_unitario) || 0;
      const abonoCliente = Number(v.abono) || 0;
      const venta = precio * cant;
      const pagosProv = abonosProveedorPorVentaId(v.id);
      const costoPagado = pagosProv.abonado;
      const costoTotal = costoUnitario * cant;
      const restanteCliente = venta - abonoCliente;
      const pendienteYesenia = pagosProv.pendiente;

      const fechaEntregaHumana = textoFechaEntrega(v);

      const items = itemsParaDashboard(v);

      return `
        <tr>
          <td>${v.fecha ? formatearFechaHumana(v.fecha) : ''}</td>
          <td><b>${v.vendedor || ''}</b></td>
          <td>
            <b>${v.cliente_nombre || ''}</b>
            <span class="sub-tag">📞 ${v.cliente_telefono || ''}${(() => { const t = String(v.cliente_telefono || '').trim(); const d = t.replace(/\D/g, ''); if (d) return ` · <a href="https://wa.me/57${d}" target="_blank" style="color:var(--ok);font-weight:600;text-decoration:none;">WhatsApp</a>`; if (esUsuarioWhatsApp(t)) return ` · <a href="#" onclick="copiarUsuarioWhatsApp('${t.replace(/'/g, "\\'")}');return false;" style="color:var(--ok);font-weight:600;text-decoration:none;">Copiar @</a>`; return ''; })()}</span>
          </td>
          <td>
            <div style="margin-bottom:6px;">${badgeModeloVenta(v)}</div>
            <div style="font-size:12px; line-height:1.6;">${items.join('<br>')}</div>
          </td>
          <td><b>${cant}</b></td>
          <td class="money">${fmt(venta)}</td>
          <td class="money">${fmt(abonoCliente)}</td>
          <td class="money" style="color:${restanteCliente > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmt(restanteCliente)}</td>
          <td class="money" style="color:var(--ok);">${fmt(costoPagado)}</td>
          <td class="money" style="color:${pendienteYesenia > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmt(pendienteYesenia)}</td>
          <td>
            <span class="humano-fecha">${fechaEntregaHumana}</span>
            <span class="sub-tag">📍 ${escSimple(v.lugar_entrega || 'Sin definir')} · 🚚 ${escSimple(v.entrega_por || 'Sin asignar')}</span>
          </td>
          <td>
            <select class="estado-select ${claseEstado(v.estado)}" data-id="${v.id}" data-prev="${v.estado}">
              ${ESTADOS
                .map(e => `<option value="${e}" ${normalizarEstado(v.estado) === e ? 'selected' : ''}>${e}</option>`)
                .join('')}
            </select>
            ${(() => { const listo = puedeMarcarPagado(v).ok && normalizarEstado(v.estado) === 'Entregado'; const pend = !pedidoSocioLiquidado(v) || !costoProveedorPagado(v); if (listo) return '<span class="sub-tag" style="color:var(--ok);font-weight:700;">✅ Listo para liquidar</span>'; if (pend) return '<span class="sub-tag" style="color:var(--warn);">Socio/proveedor pendiente</span>'; return ''; })()}
          </td>
          <td>
            <div class="action-group">
              <button class="btn-small editar-button" data-id="${v.id}" type="button">Editar</button>
              <button class="btn-small abono-button" data-id="${v.id}" type="button">+ Abono</button>
              <button class="btn-small finalizar-button" data-id="${v.id}" type="button" ${normalizarEstado(v.estado) !== 'Liquidado' ? 'disabled title="Solo se puede finalizar cuando está Liquidado (proveedor y socios liquidados)" style="opacity:0.45;cursor:not-allowed;"' : 'title="Finalizar pedido (mover a Historial)"'}>Finalizar</button>
              <button class="btn-danger borrar-button" data-id="${v.id}" type="button">Borrar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    paginationState.orders = page;

    let pagContainer = document.getElementById('orders-pagination');
    if (!pagContainer) {
      pagContainer = document.createElement('div');
      pagContainer.id = 'orders-pagination';
      document.getElementById('ventas-body').parentElement.appendChild(pagContainer);
    }
    pagContainer.innerHTML = renderPagination(rows.length, page, 'orders', 'irPaginaOrdenes');

    marcarOrdenTabla('ordenes');

    document.querySelectorAll('.estado-select').forEach(select => {
      select.addEventListener('change', () => updateEstado(select.dataset.id, select.value, select));
    });

    document.querySelectorAll('.editar-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const venta = ventasCache.find(v => v.id === button.dataset.id);
        if (venta) openForm(venta);
      });
    });

    document.querySelectorAll('.abono-button').forEach(button => {
      button.addEventListener('click', () => addAbono(button.dataset.id));
    });

    document.querySelectorAll('.finalizar-button').forEach(button => {
      button.addEventListener('click', () => finalizarVenta(button.dataset.id));
    });

    document.querySelectorAll('.borrar-button').forEach(button => {
      button.addEventListener('click', () => deleteVenta(button.dataset.id));
    });
  }

  function irPaginaOrdenes(p) { paginationState.orders = p; renderTable(); }

  /* =====================================================
     ITEMS DINÁMICOS DE CAMISA (uno por unidad, según Cantidad)
     ===================================================== */
  const TALLAS_DISPONIBLES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  const COLORES_DISPONIBLES = ['Negro', 'Blanco', 'Gris', 'Turquí', 'Camel', 'Vinotinto', 'Palo de Rosa'];

  function coloresOptionsHtml(valorSeleccionado) {
    const valorActual = valorSeleccionado || '';
    let html = `<option value="" ${valorActual === '' ? 'selected' : ''} disabled>Selecciona un color</option>`;
    html += COLORES_DISPONIBLES.map(c => `<option value="${c}" ${valorActual === c ? 'selected' : ''}>${c}</option>`).join('');
    return html;
  }

  function renderCamisaItemsFromData(items) {
    const container = document.getElementById('camisa-items-container');
    container.innerHTML = items.map((item, i) => `
      <div class="camisa-item-row" data-index="${i}">
        <span class="camisa-item-number">Camisa #${i + 1}</span>
        <div class="camisa-item-fields">
          <div>
            <label>Versión</label>
            <select class="ci-modelo">
              <option value="Viejo" ${item.modelo && item.modelo !== 'Viejo' ? '' : 'selected'}>Versión 1</option>
              <option value="Nuevo" ${item.modelo === 'Nuevo' ? 'selected' : ''}>Versión 2</option>
            </select>
          </div>
          <div>
            <label class="label-required">Género</label>
            <select class="ci-genero">
              <option value="" ${!item.genero ? 'selected' : ''} disabled>Selecciona un género</option>
              <option value="Hombre" ${item.genero === 'Hombre' ? 'selected' : ''}>Hombre</option>
              <option value="Mujer" ${item.genero === 'Mujer' ? 'selected' : ''}>Mujer</option>
            </select>
          </div>
          <div>
            <label class="label-required">Color</label>
            <select class="ci-color">${coloresOptionsHtml(item.color)}</select>
          </div>
          <div>
            <label class="label-required">Talla</label>
            <select class="ci-talla">
              <option value="">Selecciona una talla</option>
              ${TALLAS_DISPONIBLES.map(t => `<option value="${t}" ${item.talla === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Bordado</label>
            <input type="text" class="ci-programa" value="${item.programa || ''}" placeholder="Ej. Ingeniería">
          </div>
        </div>
        <div class="camisa-item-abono">
          <label class="label-required">Abono recibido del cliente ($)</label>
          <input type="number" class="ci-abono" min="0" value="${item.abono !== undefined && item.abono !== null && item.abono !== '' ? item.abono : ''}" placeholder="0">
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.ci-abono').forEach(input => {
      input.addEventListener('input', actualizarTotalAbono);
    });

    actualizarTotalAbono();
  }

  function esModoIndividual() {
    return document.getElementById('f-detalle-individual').checked;
  }

  function collectCamisaItems() {
    if (esModoIndividual()) {
      const rows = document.querySelectorAll('#camisa-items-container .camisa-item-row');
      const items = [];
      rows.forEach(row => {
        items.push({
          modelo: row.querySelector('.ci-modelo').value || 'Viejo',
          genero: row.querySelector('.ci-genero').value,
          color: row.querySelector('.ci-color').value.trim(),
          talla: row.querySelector('.ci-talla').value,
          programa: row.querySelector('.ci-programa').value.trim(),
          abono: parseFloat(row.querySelector('.ci-abono').value)
        });
      });
      return items;
    }

    let cantidad = parseInt(document.getElementById('f-cantidad').value, 10);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    const genero = document.getElementById('cs-genero').value;
    const color = document.getElementById('cs-color').value;
    const talla = document.getElementById('cs-talla').value;
    const abonoTotal = parseFloat(document.getElementById('cs-abono-total').value);

    const items = [];
    for (let i = 0; i < cantidad; i++) {
      const programa = document.getElementById('cs-programa').value.trim();
      const modelo = document.getElementById('cs-modelo').value || 'Viejo';
      items.push({ genero, color, talla, programa, modelo, abono: i === 0 ? (isNaN(abonoTotal) ? 0 : abonoTotal) : 0 });
    }
    return items;
  }

  function actualizarTotalAbono() {
    const items = collectCamisaItems();
    const total = items.reduce((sum, it) => sum + (isNaN(it.abono) ? 0 : it.abono), 0);
    document.getElementById('f-abono').value = total;
  }

  function onModoDetalleChange() {
    const simpleBlock = document.getElementById('camisa-simple-block');
    const itemsContainer = document.getElementById('camisa-items-container');

    if (esModoIndividual()) {
      simpleBlock.classList.add('hidden');
      itemsContainer.classList.remove('hidden');
      onCantidadChange();
    } else {
      simpleBlock.classList.remove('hidden');
      itemsContainer.innerHTML = '';
      itemsContainer.classList.add('hidden');
      actualizarTotalAbono();
    }
  }

  function actualizarLugarOtro() {
    const sel = document.getElementById('f-lugar-entrega');
    const wrap = document.getElementById('f-lugar-otro-wrap');
    const inp = document.getElementById('f-lugar-otro');
    if (!sel || !wrap || !inp) return;
    const pendiente = document.getElementById('f-fecha-entrega-pendiente')?.checked;
    const esOtro = sel.value === 'Otro';
    wrap.classList.toggle('hidden', !esOtro || pendiente);
    inp.disabled = pendiente || !esOtro;
    const lugarSel = document.getElementById('f-lugar-entrega');
    if (lugarSel) lugarSel.disabled = pendiente;
  }

  function onFechaEntregaPendienteChange() {
    const pendiente = document.getElementById('f-fecha-entrega-pendiente').checked;
    const input = document.getElementById('f-fecha-entrega');
    input.disabled = pendiente;
    if (pendiente) input.value = '';
    const lugar = document.getElementById('f-lugar-entrega');
    lugar.disabled = pendiente;
    actualizarLugarOtro();
  }

  function onCantidadChange() {
    let cantidad = parseInt(document.getElementById('f-cantidad').value, 10);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (cantidad > 30) cantidad = 30;
    document.getElementById('f-cantidad').value = cantidad;

    const sugerido = cantidad * 20000;
    const abonoInput = document.getElementById('cs-abono-total');
    if (abonoInput && !abonoInput.dataset.userEdited) {
      abonoInput.value = sugerido;
    }

    if (!esModoIndividual()) {
      actualizarTotalAbono();
      return;
    }

    const existentes = collectCamisaItems();
    const items = [];
    for (let i = 0; i < cantidad; i++) {
      if (existentes[i]) {
        items.push(existentes[i]);
      } else {
        items.push({ genero: '', color: '', talla: '', abono: '', modelo: 'Viejo' });
      }
    }
    renderCamisaItemsFromData(items);
  }

  function actualizarDatalistClientes() {
    const dl = document.getElementById('clientes-sugeridos');
    if (!dl) return;
    const mapa = new Map();
    const ordenadas = ventasCache.slice().sort((a,b)=> String(b.fecha||b.created_at||'').localeCompare(String(a.fecha||a.created_at||'')));
    for (const v of ordenadas) {
      const nombre = String(v.cliente_nombre||'').trim();
      if (!nombre) continue;
      const key = nombre.toLowerCase() + '|' + String(v.cliente_telefono||'').trim().toLowerCase();
      if (!mapa.has(key)) mapa.set(key, v);
      if (mapa.size>=40) break;
    }
    dl.innerHTML = [...mapa.values()].map(v=>{
      const label = v.cliente_telefono ? v.cliente_nombre + ' — ' + v.cliente_telefono : v.cliente_nombre;
      return '<option value="' + escSimple(v.cliente_nombre) + '" label="' + escSimple(label) + '">';
    }).join('');
  }

  function onClienteInput() {
    const inp = document.getElementById('f-cliente');
    const hint = document.getElementById('f-cliente-hint');
    const telInput = document.getElementById('f-telefono');
    if (!inp || !hint) return;
    const nombre = inp.value.trim().toLowerCase();
    if (!nombre) { hint.style.display='none'; return; }
    const exactos = ventasCache.filter(v=> String(v.cliente_nombre||'').trim().toLowerCase()===nombre);
    if (exactos.length>0) {
      const ultimo = exactos.slice().sort((a,b)=> String(b.fecha||'').localeCompare(String(a.fecha||'')))[0];
      if (telInput && !telInput.value.trim() && ultimo.cliente_telefono) {
        telInput.value = ultimo.cliente_telefono;
        validarTelefonoInput();
      }
      const tel = ultimo.cliente_telefono ? ' · ' + ultimo.cliente_telefono : '';
      const vend = ultimo.vendedor ? ' · vendedor habitual: ' + ultimo.vendedor : '';
      hint.textContent = 'Cliente existente' + tel + vend + ' · ' + exactos.length + ' pedido(s) previo(s) — teléfono autocompletado si estaba vacío';
      hint.style.display='block';
      hint.style.color='var(--muted)';
      const selV = document.getElementById('f-vendedor');
      if (selV && ultimo.vendedor && !editingId) selV.value = ultimo.vendedor;
    } else {
      const similares = ventasCache.filter(v=> String(v.cliente_nombre||'').toLowerCase().includes(nombre) && nombre.length>=3);
      if (similares.length>0 && similares.length<=3) {
        const nombres = [...new Set(similares.slice(0,3).map(s=> s.cliente_nombre))].join(', ');
        hint.textContent = '¿Quisiste decir: ' + nombres + '?';
        hint.style.display='block';
        hint.style.color='var(--muted)';
      } else { hint.style.display='none'; }
    }
  }

  function validarTelefonoInput() {
    const inp = document.getElementById('f-telefono');
    const hint = document.getElementById('f-telefono-hint');
    if (!inp || !hint) return;
    const val = inp.value.trim();
    if (!val) { hint.style.display='none'; return; }
    if (esUsuarioWhatsApp(val)) {
      hint.textContent = 'Usuario @ detectado — se usará para WhatsApp';
      hint.style.display='block'; hint.style.color='var(--ok)';
      return;
    }
    const dig = val.replace(/\D/g,'');
    if (dig.length>0 && dig.length<7) {
      hint.textContent = 'Número muy corto — verifica';
      hint.style.display='block'; hint.style.color='var(--warn)';
    } else if (dig.length>=10) {
      hint.textContent = '✓ Número válido';
      hint.style.display='block'; hint.style.color='var(--ok)';
    } else { hint.style.display='none'; }
  }


  /* =====================================================
     FORMULARIO VENTA
     ===================================================== */
   function openForm(venta) {
     editingId = venta ? venta.id : null;
     document.getElementById('form-validation-error').classList.add('hidden');

     navigateTo('new-sale');

     document.getElementById('form-title').textContent = editingId ? 'Editar venta' : 'Registrar nueva venta';
     document.getElementById('save-sale-button').textContent = editingId ? 'Actualizar venta' : 'Guardar venta';

    const vendedorSelect = document.getElementById('f-vendedor');
    const entregaSelect = document.getElementById('f-entrega-por');
    const miNombre = currentRole.vendedor || 'Samir';

    if (venta) {
      document.getElementById('f-cliente').value = venta.cliente_nombre || '';
      document.getElementById('f-telefono').value = venta.cliente_telefono || '';
      document.getElementById('cs-programa').value = venta.cliente_programa || '';

      let items = null;
      if (venta.items_camisa) {
        try { items = JSON.parse(venta.items_camisa); } catch (e) { items = null; }
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        const cant = Number(venta.cantidad) || 1;
        const abonoPorUnidad = cant > 0 ? Math.round((Number(venta.abono) || 0) / cant) : (Number(venta.abono) || 0);
        items = Array.from({ length: cant }, () => ({
          genero: venta.genero || 'Hombre',
          color: venta.color || '',
          talla: venta.talla || '',
          programa: venta.cliente_programa || '',
          modelo: normalizarModelo(venta.modelo),
          abono: abonoPorUnidad
        }));
      }
      document.getElementById('f-cantidad').value = items.length;

      const uniforme = items.every(it => it.genero === items[0].genero && it.color === items[0].color && it.talla === items[0].talla);
      const toggle = document.getElementById('f-detalle-individual');

      if (uniforme) {
        toggle.checked = false;
        document.getElementById('cs-modelo').value = items[0].modelo || normalizarModelo(venta.modelo) || 'Viejo';
        document.getElementById('cs-genero').value = items[0].genero || 'Hombre';
        document.getElementById('cs-color').value = items[0].color || '';
        document.getElementById('cs-talla').value = items[0].talla || '';
        const totalAbono = items.reduce((sum, it) => sum + (Number(it.abono) || 0), 0);
        document.getElementById('cs-abono-total').value = totalAbono;
        document.getElementById('cs-programa').value = items[0].programa || '';
        document.getElementById('camisa-simple-block').classList.remove('hidden');
        document.getElementById('camisa-items-container').classList.add('hidden');
        document.getElementById('camisa-items-container').innerHTML = '';
        actualizarTotalAbono();
      } else {
        toggle.checked = true;
        document.getElementById('camisa-simple-block').classList.add('hidden');
        document.getElementById('camisa-items-container').classList.remove('hidden');
        renderCamisaItemsFromData(items);
      }

      document.getElementById('f-precio').value = venta.precio_unitario || 39000;
      document.getElementById('f-costo').value = venta.costo_unitario || 30000;
      document.getElementById('f-estado').value = venta.estado || 'Pedido';
      entregaSelect.value = venta.entrega_por || '';
      document.getElementById('f-fecha').value = venta.fecha || '';
      document.getElementById('f-fecha-entrega').value = venta.fecha_entrega || '';
      document.getElementById('f-fecha-entrega-pendiente').checked = !venta.fecha_entrega;
      document.getElementById('f-fecha-entrega').disabled = !venta.fecha_entrega;
      const lugarVal = venta.lugar_entrega || '';
      const lugarSel = document.getElementById('f-lugar-entrega');
      const lugarOtroInp = document.getElementById('f-lugar-otro');
      if (lugarVal && !LUGARES_ENTREGA.includes(lugarVal)) {
        lugarSel.value = 'Otro';
        if (lugarOtroInp) lugarOtroInp.value = lugarVal;
      } else {
        lugarSel.value = lugarVal;
        if (lugarOtroInp) lugarOtroInp.value = '';
      }
      lugarSel.disabled = !venta.fecha_entrega;
      actualizarLugarOtro();
      document.getElementById('f-nota').value = venta.nota || '';
    } else {
      document.getElementById('f-cliente').value = '';
      document.getElementById('f-telefono').value = '';
      document.getElementById('f-cantidad').value = 1;
      document.getElementById('f-detalle-individual').checked = false;
      document.getElementById('cs-modelo').value = 'Viejo';
      document.getElementById('cs-genero').value = '';
      document.getElementById('cs-color').value = '';
      document.getElementById('cs-talla').value = '';
      document.getElementById('cs-abono-total').value = 20000;
       document.getElementById('cs-programa').value = '';
      document.getElementById('cs-color').value = '';
      document.getElementById('cs-talla').value = '';
      document.getElementById('camisa-simple-block').classList.remove('hidden');
      document.getElementById('camisa-items-container').classList.add('hidden');
      document.getElementById('camisa-items-container').innerHTML = '';
      actualizarTotalAbono();
      document.getElementById('f-precio').value = 39000;
      document.getElementById('f-costo').value = 30000;
      document.getElementById('f-estado').value = '';
      document.getElementById('f-fecha').value = hoyColombia();
      document.getElementById('f-fecha-entrega').value = '';
      document.getElementById('f-fecha-entrega-pendiente').checked = true;
      document.getElementById('f-fecha-entrega').disabled = true;
      document.getElementById('f-lugar-entrega').value = '';
      document.getElementById('f-lugar-entrega').disabled = true;
      const otroInp = document.getElementById('f-lugar-otro');
      if (otroInp) otroInp.value = '';
      actualizarLugarOtro();
      document.getElementById('f-nota').value = '';
      entregaSelect.value = '';
    }

    // Vendedor: siempre el usuario autenticado; solo el administrador puede cambiarlo.
    if (currentRole.role === 'admin') {
      vendedorSelect.disabled = false;
      vendedorSelect.innerHTML = opcionesVendedoresHtml(venta ? (venta.vendedor || miNombre) : miNombre);
    } else {
      vendedorSelect.disabled = true;
      vendedorSelect.innerHTML = opcionesVendedoresHtml(currentRole.vendedor || miNombre);
    }

    document.getElementById('form-card').classList.remove('hidden');
    document.getElementById('form-card').scrollIntoView({ behavior: 'smooth' });
  }

  function closeForm() {
    editingId = null;
    document.getElementById('form-card').classList.add('hidden');
    document.getElementById('form-validation-error').classList.add('hidden');
  }

   async function saveVenta() {
     const errorContainer = document.getElementById('form-validation-error');
     errorContainer.classList.add('hidden');

     const items = collectCamisaItems();

     const payload = {
       cliente_nombre: document.getElementById('f-cliente').value.trim(),
       cliente_telefono: document.getElementById('f-telefono').value.trim(),
       cliente_programa: items.map(i => i.programa).filter(Boolean).join(', '),
       modelo: items[0] ? normalizarModelo(items[0].modelo) : 'Viejo',
       genero: items[0] ? items[0].genero : 'Hombre',
       color: items.map(i => i.color).filter(Boolean).join(', '),
       talla: items.map(i => i.talla).filter(Boolean).join(', '),
       cantidad: items.length,
       precio_unitario: parseFloat(document.getElementById('f-precio').value),
       costo_unitario: parseFloat(document.getElementById('f-costo').value),
abono: items.reduce((sum, it) => sum + (isNaN(it.abono) ? 0 : it.abono), 0),
        estado: document.getElementById('f-estado').value,
       vendedor: document.getElementById('f-vendedor').value,
        entrega_por: document.getElementById('f-entrega-por').value || null,
        fecha: document.getElementById('f-fecha').value,
        fecha_entrega: document.getElementById('f-fecha-entrega-pendiente').checked
          ? null
          : (document.getElementById('f-fecha-entrega').value || null),
        lugar_entrega: (() => {
          const sel = document.getElementById('f-lugar-entrega').value;
          const otro = document.getElementById('f-lugar-otro')?.value.trim() || '';
          if (sel === 'Otro') return otro || null;
          return sel || null;
        })(),
        nota: document.getElementById('f-nota').value.trim(),
        items_camisa: JSON.stringify(items)
     };

     if (currentRole.role !== 'admin' && currentRole.vendedor) {
       payload.vendedor = currentRole.vendedor;
     }

     const faltantes = [];
     if (!payload.cliente_nombre) faltantes.push("Nombre del cliente");
     if (!payload.cliente_telefono) faltantes.push("Teléfono");
     if (items.length === 0) faltantes.push("Al menos una camisa (revisa la Cantidad)");
     if (!esModoIndividual()) {
       if (!items[0] || !items[0].genero) faltantes.push("Género (todas las camisas)");
       if (!items[0] || !items[0].color) faltantes.push("Color (todas las camisas)");
       if (!items[0] || !items[0].talla) faltantes.push("Talla (todas las camisas)");
       const abonoTotal = items.reduce((sum, it) => sum + (isNaN(it.abono) ? 0 : it.abono), 0);
       if (isNaN(abonoTotal) || abonoTotal < 0) faltantes.push("Abono total válido");
     } else {
       items.forEach((it, idx) => {
         if (!it.genero) faltantes.push(`Género de la camisa #${idx + 1}`);
         if (!it.color) faltantes.push(`Color de la camisa #${idx + 1}`);
         if (!it.talla) faltantes.push(`Talla de la camisa #${idx + 1}`);
         if (isNaN(it.abono) || it.abono < 0) faltantes.push(`Abono válido de la camisa #${idx + 1}`);
       });
     }
     if (isNaN(payload.cantidad) || payload.cantidad <= 0) faltantes.push("Cantidad válida");
     if (isNaN(payload.precio_unitario)) faltantes.push("Precio por camisa");
     if (isNaN(payload.costo_unitario)) faltantes.push("Costo por camisa");
     if (!payload.estado) faltantes.push("Estado");
     if (!payload.fecha) faltantes.push("Fecha del pedido");
      if (!document.getElementById('f-fecha-entrega-pendiente').checked && !payload.fecha_entrega) faltantes.push("Fecha de entrega");
      if (!document.getElementById('f-fecha-entrega-pendiente').checked && !payload.lugar_entrega) {
        const sel = document.getElementById('f-lugar-entrega').value;
        if (sel === 'Otro') faltantes.push("Especifica el lugar (cuando eliges Otro)");
        else faltantes.push("Lugar de entrega");
      }
      if (!document.getElementById('f-fecha-entrega-pendiente').checked && payload.fecha && payload.fecha_entrega) {
        if (payload.fecha_entrega < payload.fecha) faltantes.push("La fecha de entrega no puede ser anterior a la fecha del pedido (" + payload.fecha + ")");
        if (!editingId && payload.fecha_entrega < hoyColombia()) faltantes.push("La fecha de entrega no puede ser pasada (hoy es " + hoyColombia() + ")");
      }

      if (faltantes.length > 0) {
        errorContainer.innerHTML = `<b>⚠️ Por favor completa los campos obligatorios:</b><br>• ${faltantes.join('<br>• ')}`;
        errorContainer.classList.remove('hidden');
        errorContainer.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (!document.getElementById('f-fecha-entrega-pendiente').checked && payload.fecha_entrega && payload.fecha_entrega < hoyColombia() && editingId) {
        mostrarToast('⚠️ La fecha de entrega es pasada (' + payload.fecha_entrega + '), verifica que sea correcta.', 'warning');
      }

      if (payload.estado === 'Liquidado') {
       const ventaCheck = editingId
          ? { ...ventasCache.find(v => v.id === editingId), ...payload, id: editingId }
          : { ...payload, id: null };
        const check = puedeMarcarPagado(ventaCheck);
        if (!check.ok) {
          errorContainer.innerHTML = `<b>⚠️ No se puede marcar como Liquidado:</b><br>• ${check.faltas.join('<br>• ')}`;
         errorContainer.classList.remove('hidden');
         errorContainer.scrollIntoView({ behavior: 'smooth' });
         return;
       }
     }

     try {
       let error;
       if (editingId) {
         ({ error } = await supabaseClient.from('ventas').update(payload).eq('id', editingId));
       } else {
         ({ error } = await supabaseClient.from('ventas').insert(payload));
       }

        if (error) { mostrarToast('Error al guardar: ' + error.message, 'error'); return; }
        const eraEdicion = !!editingId;
        await loadVentas();
        openForm(null);
        if (eraEdicion) navigateTo('orders');
        mostrarToast(eraEdicion ? '✅ Venta actualizada correctamente.' : '✅ Venta registrada correctamente.');
     } catch (err) {
       mostrarToast('Error inesperado al guardar la venta.', 'error');
     }
   }

   /* =====================================================
      3. GANANCIAS Y LIQUIDACIONES (SAMIR & VALENTINA)
      ===================================================== */
  function abonosProveedorPorVentaId(ventaId) {
    const venta = ventasCache.find(v => v.id === ventaId);
    if (!venta) return { abonado: 0, costoTotal: 0, pendiente: 0 };

    const costoVenta = (Number(venta.costo_unitario) || 0) * (Number(venta.cantidad) || 1);
    const compraId = venta.compra_id;
    if (!compraId) return { abonado: 0, costoTotal: costoVenta, pendiente: costoVenta };

    // Lo pagado a Yesenia por este pedido se guarda por separado (abono_yesenia),
    // distinto del abono que da el cliente (abono).
    let abonado = Number(venta.abono_yesenia) || 0;

    // Respaldo: si el pedido no tiene abono propio pero la compra tiene aportes,
    // se distribuyen proporcionalmente al costo de cada pedido.
    if (!abonado) {
      const pedidos = ventasCache.filter(v => v.compra_id === compraId);
      const costoTotalCompra = pedidos.reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);
      const aportes = compraAportesCache.filter(a => a.compra_id === compraId);
      const totalAportado = aportes.reduce((s, a) => s + (Number(a.monto) || 0), 0);
      if (costoTotalCompra > 0) {
        abonado = (costoVenta / costoTotalCompra) * totalAportado;
      }
    }

    abonado = Math.round(abonado);
    return {
      abonado,
      costoTotal: costoVenta,
      pendiente: Math.max(costoVenta - abonado, 0)
    };
  }

  /* =====================================================
     2. MÓDULO: COMPRAS AL PROVEEDOR
     ===================================================== */
  async function loadCompras() {
    showLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('compras_proveedor')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) logError('loadCompras', error);
      comprasCache = data || [];

      await loadCompraAportes();
      renderCompras();
    } catch (e) { logError('loadCompras', e); }
    finally { showLoading(false); }
  }

  async function loadCompraAportes() {
    try {
      const { data, error } = await supabaseClient
        .from('compra_aportes')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) { logError('loadCompraAportes', error); return; }
      compraAportesCache = data || [];
    } catch (e) { logError('loadCompraAportes', e); }
  }

  function comprasVisibles() {
    if (currentRole.role === 'admin' || !currentRole.vendedor) return comprasCache;
    const misVentasIds = new Set(
      ventasCache.filter(v => v.vendedor === currentRole.vendedor && v.compra_id).map(v => v.compra_id)
    );
    return comprasCache.filter(c => misVentasIds.has(c.id));
  }

  function pedidosDisponiblesParaCompra(excludeCompraId) {
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;
    return ventasCache.filter(v => {
      if (v.compra_id && v.compra_id !== excludeCompraId) return false;
      if (v.finalizado) return false;
      if (!esAdmin && v.vendedor !== miNombre) return false;
      return true;
    });
  }

  function renderCompras() {
    const banner = document.getElementById('compras-privacy-banner');
    if (currentRole.role === 'admin') {
      banner.innerHTML = '🛡️ <span><b>Modo Administrador:</b> Viendo todos los abonos a Yesenia registrados.</span>';
    } else {
      banner.innerHTML = `🔒 <span><b>Acceso Privado:</b> Estás viendo únicamente los abonos a Yesenia donde tienes pedidos propios (${currentRole.vendedor}).</span>`;
    }

    let rows = comprasVisibles();
    const qc = (document.getElementById('filter-compras-search')?.value || '').toLowerCase().trim();
    if (qc) {
      rows = rows.filter(c => {
        if ((c.comprador || '').toLowerCase().includes(qc)) return true;
        if ((c.proveedor || '').toLowerCase().includes(qc)) return true;
        if ((c.fecha || '').includes(qc)) return true;
        if ((c.id || '').toLowerCase().includes(qc)) return true;
        const pedidos = ventasCache.filter(v => v.compra_id === c.id);
        return pedidos.some(p =>
          (p.cliente_nombre || '').toLowerCase().includes(qc) ||
          (p.cliente_telefono || '').toLowerCase().includes(qc)
        );
      });
    }
    if (ordenTablas.compras) rows = ordenarFilas(rows, 'compras', REGISTRO_ORDEN.compras.campos);
    const body = document.getElementById('compras-body');
    document.getElementById('compras-empty-state').classList.toggle('hidden', rows.length > 0);

    const page = paginationState.compras;
    const start = page * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    body.innerHTML = pageRows.map(c => {
      const pedidos = ventasCache.filter(v => v.compra_id === c.id);
      const cantidad = pedidos.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
      const costoTotal = pedidos.reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);
      const aportesCompra = compraAportesCache.filter(a => a.compra_id === c.id);
      const aportadoAportes = aportesCompra.reduce((s, a) => s + (Number(a.monto) || 0), 0);
      const abonoPedidos = pedidos.reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
      const aportado = Math.max(aportadoAportes, abonoPedidos);
      const saldo = costoTotal - aportado;
      const puedeGestionar = currentRole.role === 'admin' || c.comprador === currentRole.vendedor;
      const acciones = puedeGestionar
        ? `<button class="btn-small" onclick="openCompraModal('${c.id}')" type="button">Editar</button>
           <button class="btn-danger" onclick="deleteCompra('${c.id}')" type="button">Eliminar</button>`
        : `<button class="btn-small" onclick="openCompraModal('${c.id}')" type="button">Ver / Abonar</button>`;

      const personasAbono = [...new Set(aportesCompra.map(a => a.persona).filter(Boolean))];
      const quienesAbonanHtml = personasAbono.length === 0
        ? '<span style="color:var(--muted);">—</span>'
        : personasAbono.map(p =>
            p === currentRole.vendedor
              ? `<b style="color:var(--thread);">${escSimple(p)}</b>`
              : escSimple(p)
          ).join(', ');

      const grupos = new Map();
      pedidos.forEach(p => {
        const clave = claveCliente(p);
        if (!grupos.has(clave)) grupos.set(clave, { pedidos: [], telefono: '' });
        grupos.get(clave).pedidos.push(p);
      });
      grupos.forEach(g => {
        g.nombre = etiquetaClienteGrupo(g.pedidos);
        const telMuestra = g.pedidos.find(pp => String(pp.cliente_telefono || '').trim());
        g.telefono = telMuestra ? String(telMuestra.cliente_telefono).trim() : '';
        g.cantidad = g.pedidos.reduce((s, pp) => s + (Number(pp.cantidad) || 1), 0);
        g.abono = g.pedidos.reduce((s, pp) => s + (Number(pp.abono_yesenia) || 0), 0);
        g.costo = g.pedidos.reduce((s, pp) => s + (Number(pp.costo_unitario) || 0) * (Number(pp.cantidad) || 1), 0);
      });
      const detallePedidos = pedidos.length === 0
        ? '<span style="color:var(--muted);">—</span>'
        : [...grupos.values()].map(g => {
            const resto = g.costo - g.abono;
            const telTag = g.telefono ? ` <span style="color:var(--muted); font-weight:400;">(${escSimple(g.telefono)})</span>` : '';
            const pedidosTag = g.pedidos.length > 1 ? `<span class="sub-tag" style="display:inline-block; margin:0;">· ${g.pedidos.length} pedidos</span>` : '';
            return `
              <div style="line-height:1.7; border-bottom:1px dashed var(--line); padding:3px 0;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <b>${escSimple(g.nombre)}</b>${telTag}
                  <span class="sub-tag" style="display:inline-block; margin:0;">×${g.cantidad} camisa(s)</span>${pedidosTag}
                  <span class="sub-tag" style="display:inline-block; margin:0; color:var(--ok); font-weight:700;">Abono ${fmt(g.abono)}</span>
                  <span class="sub-tag" style="display:inline-block; margin:0; color:${resto > 0 ? 'var(--warn)' : 'var(--ok)'};">${resto > 0 ? 'Saldo ' + fmt(resto) : 'Liquidado'}</span>
                </div>
              </div>`;
          }).join('');

      return `
        <tr>
          <td>${formatearFechaHumana(c.fecha)}<span class="sub-tag">🕐 ${c.hora || ''}</span></td>
          <td><b>${c.proveedor || ''}</b></td>
          <td>${c.comprador || ''}</td>
          <td>${quienesAbonanHtml}</td>
          <td>
            <div style="font-weight:700; margin-bottom:4px;">${cantidad} camisa(s)</div>
            <div class="sub-tag" style="margin-bottom:2px;">${grupos.size} cliente(s) · ${pedidos.length} pedido(s) incluido(s)</div>
            <div>${detallePedidos}</div>
          </td>
          <td class="money">${fmt(costoTotal)}</td>
          <td class="money" style="color:var(--ok);">${fmt(aportado)}</td>
          <td class="money" style="color:${saldo > 0 ? 'var(--warn)' : 'var(--ok)'};">${saldo > 0 ? fmt(saldo) + ' pendiente' : 'Liquidado'}</td>
          <td>
            <div class="action-group">
              ${acciones}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    let pagContainer = document.getElementById('compras-pagination');
    if (!pagContainer) {
      pagContainer = document.createElement('div');
      pagContainer.id = 'compras-pagination';
      body.parentElement.appendChild(pagContainer);
    }
    pagContainer.innerHTML = renderPagination(rows.length, page, 'compras', 'irPaginaCompras');

    marcarOrdenTabla('compras');

    renderComprasDeudaBox();
  }
  function irPaginaCompras(p) { paginationState.compras = p; renderCompras(); }

  function itemsDeVentaParaAbono(v) {
    let items = null;
    if (v.items_camisa) {
      try { const p = JSON.parse(v.items_camisa); if (Array.isArray(p) && p.length) items = p; } catch (e) { items = null; }
    }
    if (!items || items.length === 0) {
      const cant = Number(v.cantidad) || 1;
      const abonoTotal = Number(v.abono) || 0;
      items = Array.from({ length: cant }, () => ({
        genero: v.genero || '',
        color: v.color || '',
        talla: v.talla || '',
        programa: v.cliente_programa || '',
        abono: cant > 0 ? Math.round(abonoTotal / cant) : 0
      }));
    }
    return items;
  }

  function personasSeleccionadasActuales() {
    return Array.from(document.querySelectorAll('.cp-persona-check:checked')).map(cb => cb.dataset.persona);
  }

  function pedidosDePersonasSeleccionadas() {
    const personas = personasSeleccionadasActuales();
    if (personas.length === 0) return [];
    return pedidosDisponiblesPickers.filter(v => personas.includes(claveCliente(v)));
  }

  // Reparte el abono total de una persona entre sus pedidos (proporcional al costo de cada pedido).
  function distribuirAbonoPersona(abonoTotal, pedidos) {
    const r = {};
    if (!pedidos || pedidos.length === 0) return r;
    if (!(abonoTotal > 0)) {
      pedidos.forEach(v => { r[v.id] = 0; });
      return r;
    }
    const costos = pedidos.map(v => (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1));
    const costoTotal = costos.reduce((a, b) => a + b, 0);
    let asignado = 0;
    pedidos.forEach((v, idx) => {
      if (idx === pedidos.length - 1) {
        r[v.id] = abonoTotal - asignado;
      } else {
        const parte = costoTotal > 0 ? Math.floor(abonoTotal * costos[idx] / costoTotal) : 0;
        asignado += parte;
        r[v.id] = parte;
      }
    });
    return r;
  }

  // Reparto equitativo por camisa (híbrido): $ total se divide entre camisas, no por costo.
  function distribuirAbonoEquitativo(abonoTotal, pedidos) {
    const r = {};
    if (!pedidos || pedidos.length === 0) return r;
    if (!(abonoTotal > 0)) { pedidos.forEach(v => { r[v.id] = 0; }); return r; }
    const totalCamisas = pedidos.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
    let asignado = 0;
    pedidos.forEach((v, idx) => {
      if (idx === pedidos.length - 1) r[v.id] = abonoTotal - asignado;
      else {
        const parte = totalCamisas > 0 ? Math.floor(abonoTotal * (Number(v.cantidad) || 1) / totalCamisas) : 0;
        asignado += parte;
        r[v.id] = parte;
      }
    });
    return r;
  }

  function renderPedidosPicker(compra) {
    const yaAsignados = new Set(compra ? ventasCache.filter(v => v.compra_id === compra.id).map(v => v.id) : []);
    const disponibles = pedidosDisponiblesParaCompra(compra ? compra.id : null);
    const picker = document.getElementById('cp-pedidos-picker');
    const soloAportes = compraSoloAportes;

    pedidosDisponiblesPickers = disponibles;

    const porPersona = new Map();
    disponibles.forEach(v => {
      const clave = claveCliente(v);
      if (!porPersona.has(clave)) porPersona.set(clave, { clave, pedidos: [], displayTelefono: '' });
      porPersona.get(clave).pedidos.push(v);
    });
    porPersona.forEach(g => {
      g.displayNombre = etiquetaClienteGrupo(g.pedidos);
      const telMuestra = g.pedidos.find(p => String(p.cliente_telefono || '').trim());
      g.displayTelefono = telMuestra ? String(telMuestra.cliente_telefono).trim() : '';
    });

    if (porPersona.size === 0) {
      picker.innerHTML = '<p style="color:var(--muted); margin:6px 0;">No hay pedidos disponibles para incluir en una compra.</p>';
      actualizarResumenCompraModal();
      return;
    }

    const bloques = [];
    porPersona.forEach((grupo, clave) => {
      const pedidos = grupo.pedidos;
      const nombre = grupo.displayNombre;
      const telefono = grupo.displayTelefono;
      const cant = pedidos.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
      const costo = pedidos.reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);
      const estaEnCompra = pedidos.some(v => yaAsignados.has(v.id));
      const checked = estaEnCompra ? 'checked' : '';
      const abonoPrev = pedidos
        .filter(v => yaAsignados.has(v.id))
        .reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
      const vendedores = [...new Set(pedidos.map(v => v.vendedor).filter(Boolean))].join(', ');
      const telLabel = telefono ? ` · ${escSimple(telefono)}` : '';
      const pedidosLabel = pedidos.length > 1 ? ` · ${pedidos.length} pedidos` : '';

      const tieneVarios = pedidos.length > 1;
      let sublistaHtml = '';
      if (tieneVarios) {
        sublistaHtml = `
            <div class="reparto-box">
              <div class="reparto-header">
                <span class="reparto-title">Desglose por pedido</span>
                <span class="reparto-hint">Sugerido equitativo por camisa · ajusta cada fila si necesitas</span>
              </div>
              <div class="pedidos-sublista">
                ${pedidos.map(p => {
                  const costoPedido = (Number(p.costo_unitario) || 0) * (Number(p.cantidad) || 1);
                  const cantPedido = Number(p.cantidad) || 1;
                  const abPedido = yaAsignados.has(p.id) ? (Number(p.abono_yesenia) || 0) : 0;
                  const fechaTxt = p.fecha ? formatearFechaHumana(p.fecha).replace(/^📅\s*/,'') : '?';
                  const estadoBadge = p.estado ? `<span class="badge-estado ${claseEstado(p.estado)}" style="font-size:10px; padding:2px 6px;">${escSimple(normalizarEstado(p.estado))}</span>` : '';
                  return `
                  <div class="pedido-sub-row">
                    <div class="sub-info">
                      <b>${escSimple(fechaTxt)} · ×${cantPedido} camisa(s) · ${fmt(costoPedido)}</b>
                      <span class="sub-tag">${estadoBadge} ${p.costo_unitario ? `costo ${fmt(p.costo_unitario)} c/u` : ''}</span>
                    </div>
                    <span class="camisa-abono-campo">
                      <input type="number" class="cp-pedido-abono" data-pedido-id="${p.id}" data-persona="${escSimple(clave)}" min="0" step="1000" placeholder="$ Abono" value="${abPedido || ''}" ${soloAportes ? 'disabled' : ''}>
                    </span>
                  </div>`;
                }).join('')}
              </div>
              <div class="reparto-preview">
                <span>Suma desglose:</span> <b class="cp-sub-total" data-persona="${escSimple(clave)}">$0</b>
                <span style="color:var(--muted);">· Total arriba:</span> <b class="cp-total-preview" data-persona="${escSimple(clave)}">$0</b>
              </div>
            </div>`;
      }

      bloques.push(`
        <div class="pedido-block persona-block" data-persona="${escSimple(clave)}">
          <label class="pedido-check-row">
            <input type="checkbox" class="cp-persona-check" data-persona="${escSimple(clave)}" ${checked} ${soloAportes ? 'disabled' : ''}>
            <span><b>${escSimple(nombre)}</b>${telLabel}${vendedores ? ' — ' + escSimple(vendedores) : ''} — ${cant} camisa(s)${pedidosLabel}</span>
            <span class="pedido-costo-tag">${fmt(costo)}</span>
          </label>
          <div class="pedido-detalle ${checked ? '' : 'hidden'}">
            <div class="camisa-detalle-row">
              <span class="camisa-detalle-info">💵 Abono total que paga a Yesenia</span>
              <span class="camisa-abono-campo">
                <input type="number" class="cp-persona-abono" data-persona="${escSimple(clave)}" data-costo="${costo}" min="0" step="1000" placeholder="$ Abono" value="${abonoPrev || ''}" ${soloAportes ? 'disabled' : ''}>
              </span>
            </div>
            <div class="camisa-detalle-row">
              <span class="camisa-detalle-info">Restante (costo − abono)</span>
              <span class="cp-persona-restante" data-persona="${escSimple(clave)}"></span>
            </div>
            ${sublistaHtml}
          </div>
        </div>`);
    });

    picker.innerHTML = bloques.join('');

    picker.querySelectorAll('.cp-persona-check').forEach(cb => {
      if (soloAportes) cb.disabled = true;
      cb.addEventListener('change', () => {
        const block = cb.closest('.persona-block');
        const detalle = block ? block.querySelector('.pedido-detalle') : null;
        if (detalle) detalle.classList.toggle('hidden', !cb.checked);
        actualizarResumenCompraModal();
        actualizarRestantesAbono();
        actualizarPreviewsTodas();
      });
    });
    picker.querySelectorAll('.cp-persona-abono').forEach(inp => {
      inp.addEventListener('input', () => {
        const clave = inp.dataset.persona;
        sincronizarSubInputsDesdeTotal(clave);
        actualizarResumenCompraModal();
        actualizarRestantesAbono();
        actualizarPreviewsTodas();
      });
    });
    picker.querySelectorAll('.cp-pedido-abono').forEach(inp => {
      inp.addEventListener('input', () => {
        const clave = inp.dataset.persona;
        sincronizarTotalDesdeSubInputs(clave);
        actualizarResumenCompraModal();
        actualizarRestantesAbono();
        actualizarPreviewsTodas();
      });
    });

    actualizarResumenCompraModal();
    actualizarRestantesAbono();
    actualizarPreviewsTodas();
  }

   function actualizarResumenCompraModal() {
     const pedidos = pedidosDePersonasSeleccionadas();
     let cantidad = 0, costo = 0;
     pedidos.forEach(v => {
       cantidad += Number(v.cantidad) || 1;
       costo += (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1);
     });

     const personas = personasSeleccionadasActuales();
     let abonoClientes = 0;
     document.querySelectorAll('.cp-persona-abono').forEach(inp => {
       if (personas.includes(inp.dataset.persona)) abonoClientes += parseFloat(inp.value) || 0;
     });

     document.getElementById('cp-resumen-cantidad').textContent = cantidad;
     document.getElementById('cp-resumen-costo').textContent = fmt(costo);
     const abonoEl = document.getElementById('cp-resumen-abono');
     if (abonoEl) abonoEl.textContent = fmt(abonoClientes);
     const restoTotal = costo - abonoClientes;
     const restoEl = document.getElementById('cp-resumen-restante');
     if (restoEl) {
       restoEl.textContent = restoTotal >= 0 ? ('-' + fmt(restoTotal)) : fmt(-restoTotal);
       restoEl.classList.toggle('warn', restoTotal > 0);
     }
   }

   // Actualiza, por persona, el restante (costo − abono) mostrado junto al input de abono.
   function actualizarRestantesAbono() {
     document.querySelectorAll('.persona-block').forEach(block => {
       const inp = block.querySelector('.cp-persona-abono');
       const restEl = block.querySelector('.cp-persona-restante');
       if (!inp || !restEl) return;
        const costo = parseFloat(inp.dataset.costo) || 0;
        const abono = parseFloat(inp.value) || 0;
        const resto = costo - abono;
        restEl.textContent = resto >= 0 ? '- ' + fmt(resto) : fmt(-resto);
        restEl.style.color = resto >= 0 ? 'var(--warn)' : 'var(--ok)';
      });
    }

    function sincronizarSubInputsDesdeTotal(clave) {
      let totalInp = null;
      document.querySelectorAll('.cp-persona-abono').forEach(el => { if (el.dataset.persona === clave) totalInp = el; });
      if (!totalInp) return;
      const subInputs = [];
      document.querySelectorAll('.cp-pedido-abono').forEach(el => { if (el.dataset.persona === clave) subInputs.push(el); });
      if (subInputs.length === 0) return;
      const total = parseFloat(totalInp.value) || 0;
      const pedidosPersona = pedidosDisponiblesPickers.filter(v => claveCliente(v) === clave);
      if (pedidosPersona.length !== subInputs.length) return;
      if (!(total > 0)) { subInputs.forEach(inp => { inp.value = ''; }); return; }
      const reparto = distribuirAbonoEquitativo(total, pedidosPersona);
      subInputs.forEach(inp => {
        const id = inp.dataset.pedidoId;
        inp.value = reparto[id] != null ? reparto[id] : '';
      });
    }

    function sincronizarTotalDesdeSubInputs(clave) {
      let totalInp = null;
      document.querySelectorAll('.cp-persona-abono').forEach(el => { if (el.dataset.persona === clave) totalInp = el; });
      const subInputs = [];
      document.querySelectorAll('.cp-pedido-abono').forEach(el => { if (el.dataset.persona === clave) subInputs.push(el); });
      if (!totalInp || subInputs.length === 0) return;
      let suma = 0;
      subInputs.forEach(inp => { suma += parseFloat(inp.value) || 0; });
      const actual = parseFloat(totalInp.value) || 0;
      if (suma !== actual) totalInp.value = suma > 0 ? suma : '';
    }

    function actualizarPreviewsTodas() {
      document.querySelectorAll('.persona-block').forEach(block => {
        const clave = block.dataset.persona || (block.querySelector('.cp-persona-abono') ? block.querySelector('.cp-persona-abono').dataset.persona : null);
        if (!clave) return;
        let subTotalEl = null, totalPrevEl = null;
        block.querySelectorAll('.cp-sub-total').forEach(el => { if (el.dataset.persona === clave) subTotalEl = el; });
        block.querySelectorAll('.cp-total-preview').forEach(el => { if (el.dataset.persona === clave) totalPrevEl = el; });
        const subInputs = [];
        block.querySelectorAll('.cp-pedido-abono').forEach(el => { if (el.dataset.persona === clave) subInputs.push(el); });
        if (subInputs.length === 0) return;
        let sumaSub = 0;
        subInputs.forEach(inp => { sumaSub += parseFloat(inp.value) || 0; });
        const totalVal = parseFloat(block.querySelector('.cp-persona-abono')?.value) || 0;
        if (subTotalEl) subTotalEl.textContent = fmt(sumaSub);
        if (totalPrevEl) totalPrevEl.textContent = fmt(totalVal);
        if (subTotalEl) subTotalEl.style.color = sumaSub === totalVal && totalVal > 0 ? 'var(--ok)' : (sumaSub !== totalVal ? 'var(--warn)' : 'var(--muted)');
      });
    }

   function openCompraModal(compraId = null) {
    editingCompraId = compraId;
    const title = document.getElementById('compra-modal-title');
    const aportesSection = document.getElementById('cp-aportes-section');

     document.getElementById('cp-error').classList.add('hidden');

     if (compraId) {
       const c = comprasCache.find(x => x.id === compraId);
       if (!c) return;
       compraSoloAportes = currentRole.role !== 'admin' && c.comprador !== currentRole.vendedor;
       title.textContent = compraSoloAportes ? 'Abono a Yesenia — aportes' : 'Editar abono a Yesenia';
       document.getElementById('cp-fecha').value = c.fecha || '';
       document.getElementById('cp-comprador').value = c.comprador || 'Samir';
       document.getElementById('cp-observaciones').value = c.observaciones || '';
       ['cp-fecha', 'cp-comprador', 'cp-observaciones'].forEach(id => {
         document.getElementById(id).disabled = compraSoloAportes;
       });
       document.getElementById('cp-save-btn').classList.toggle('hidden', compraSoloAportes);
       renderPedidosPicker(c);
       aportesSection.classList.remove('hidden');
       renderPedidosDetalleCompra();
     } else {
      compraSoloAportes = false;
      title.textContent = 'Nuevo abono a Yesenia';
      document.getElementById('cp-fecha').value = hoyColombia();
      document.getElementById('cp-comprador').value = currentRole.role === 'admin' ? '' : (currentRole.vendedor || '');
      document.getElementById('cp-observaciones').value = '';
      ['cp-fecha', 'cp-comprador', 'cp-observaciones'].forEach(id => {
        document.getElementById(id).disabled = currentRole.role === 'admin' ? false : true;
      });
      document.getElementById('cp-save-btn').classList.remove('hidden');
      renderPedidosPicker(null);
      aportesSection.classList.add('hidden');
    }

    renderAbonoAdicional();
    document.getElementById('compra-modal').classList.remove('hidden');
    bloquearScrollFondo();
  }

  function closeCompraModal() {
    editingCompraId = null;
    compraSoloAportes = false;
    document.getElementById('compra-modal').classList.add('hidden');
    desbloquearScrollFondo();
  }

    async function saveCompra() {
      const errEl = document.getElementById('cp-error');
      errEl.classList.add('hidden');

      if (compraSoloAportes) {
        errEl.textContent = 'No tienes permisos para editar esta compra.';
        errEl.classList.remove('hidden');
        return;
      }

      const fecha = document.getElementById('cp-fecha').value;
     const comprador = document.getElementById('cp-comprador').value;
     const proveedor = 'Yesenia';
     const observaciones = document.getElementById('cp-observaciones').value.trim();
     const pedidosSeleccionados = pedidosDePersonasSeleccionadas().map(v => v.id);

     if (!fecha) { errEl.textContent = 'Ingresa la fecha de la compra.'; errEl.classList.remove('hidden'); return; }
     if (!comprador) { errEl.textContent = 'Selecciona quién realizó la compra.'; errEl.classList.remove('hidden'); return; }
     if (pedidosSeleccionados.length === 0) { errEl.textContent = 'Selecciona al menos una persona para esta compra.'; errEl.classList.remove('hidden'); return; }

     const pedidosObjs = pedidosSeleccionados.map(id => ventasCache.find(v => v.id === id)).filter(Boolean);
     const costoTotal = pedidosObjs.reduce((s, v) => s + (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1), 0);

     const payload = { fecha, comprador, proveedor, observaciones, total: costoTotal, hora: horaColombia() };

     try {
       let error;
       let compraIdGuardada = editingCompraId;

       if (editingCompraId) {
         ({ error } = await supabaseClient.from('compras_proveedor').update(payload).eq('id', editingCompraId));
       } else {
         const { data, error: insertError } = await supabaseClient.from('compras_proveedor').insert(payload).select().single();
         error = insertError;
         if (!error && data) compraIdGuardada = data.id;
       }

       if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return; }

       // Desvincular pedidos que ya no están seleccionados (edición)
       if (editingCompraId) {
         const anteriores = ventasCache.filter(v => v.compra_id === editingCompraId);
         for (const v of anteriores) {
           if (!pedidosSeleccionados.includes(v.id)) {
             await supabaseClient.from('ventas').update({ compra_id: null, estado: 'Pedido' }).eq('id', v.id);
           }
         }
       }

        // Vincular pedidos seleccionados: si la persona tiene desglose por pedido (varios pedidos),
        // se respeta lo escrito en cada fila; si no, se reparte equitativo por camisa.
        const abonoPorPedido = {};
         document.querySelectorAll('.cp-persona-check:checked').forEach(cb => {
           const block = cb.closest('.persona-block');
           const persona = cb.dataset.persona;
           const pedidosPersona = pedidosDisponiblesPickers.filter(v => claveCliente(v) === persona);
          let porPedido = {};
          const subInputs = [];
          if (block) block.querySelectorAll('.cp-pedido-abono').forEach(el => { if (el.dataset.persona === persona) subInputs.push(el); });
          if (subInputs.length > 0) {
            subInputs.forEach(inp => { const id = inp.dataset.pedidoId; porPedido[id] = parseFloat(inp.value) || 0; });
            const sumaSub = Object.values(porPedido).reduce((a,b)=>a+b,0);
            let totalVal = 0;
            if (block) { const t = block.querySelector('.cp-persona-abono'); if (t) totalVal = parseFloat(t.value) || 0; }
            if (sumaSub === 0 && totalVal > 0) porPedido = distribuirAbonoEquitativo(totalVal, pedidosPersona);
            pedidosPersona.forEach(v => { if (porPedido[v.id] == null) porPedido[v.id] = 0; });
          } else {
            const abonoVal = block ? parseFloat(block.querySelector('.cp-persona-abono')?.value) || 0 : 0;
            porPedido = distribuirAbonoEquitativo(abonoVal, pedidosPersona);
          }
          pedidosPersona.forEach(v => {
            const items = itemsDeVentaParaAbono(v);
            const totalPedido = porPedido[v.id] || 0;
            const cantItems = items.length || 1;
            const base = Math.floor(totalPedido / cantItems);
            const resto = totalPedido - base * cantItems;
            items.forEach((it, idx) => { it.abono_yesenia = base + (idx < resto ? 1 : 0); });
            abonoPorPedido[v.id] = { items, abono: totalPedido };
          });
        });

        for (const id of pedidosSeleccionados) {
          const upd = { compra_id: compraIdGuardada };
          if (abonoPorPedido[id]) {
            upd.items_camisa = JSON.stringify(abonoPorPedido[id].items);
            upd.abono_yesenia = abonoPorPedido[id].abono;
          }
          await supabaseClient.from('ventas').update(upd).eq('id', id);
        }

        // Registrar el aporte a Yesenia de forma automática: quien tiene la sesión
        // iniciada aporta la suma de los abonos ingresados por persona, con fecha de hoy.
        await registrarAporteAutomatico(compraIdGuardada, comprador);

        await loadVentas();
        await loadCompras();
        await loadCompraAportes();

        openCompraModal(compraIdGuardada);
        // Sugerir marcar como Liquidado si quedó al día y estaba en Entregado
        await sugerirLiquidadoParaVarios(pedidosSeleccionados);
     } catch (err) {
        errEl.textContent = 'Error inesperado al guardar la compra.';
        errEl.classList.remove('hidden');
      }
    }

   async function deleteCompra(id) {
    const compra = comprasCache.find(x => x.id === id);
    if (compra && currentRole.role !== 'admin' && compra.comprador !== currentRole.vendedor) {
      mostrarToast('No puedes eliminar una compra que no es tuya.', 'error');
      return;
    }
    if (!confirmar('¿Eliminar esta compra? Los pedidos asociados quedarán disponibles nuevamente; no se eliminarán.')) return;
    try {
      await supabaseClient.from('compra_aportes').delete().eq('compra_id', id);
      await supabaseClient.from('ventas').update({ compra_id: null, estado: 'Pedido' }).eq('compra_id', id);
      await supabaseClient.from('compras_proveedor').delete().eq('id', id);

      if (editingCompraId === id) closeCompraModal();
      await loadVentas();
      await loadCompras();
    } catch (e) { logError('deleteCompra', e); }
  }

   /* ---------- ABONOS INGRESADOS POR PERSONA EN EL MODAL ---------- */
   // Suma de los abonos ingresados por persona (personas marcadas) en el picker.
   function abonoClientesSeleccionados() {
     let total = 0;
     document.querySelectorAll('.cp-persona-check:checked').forEach(cb => {
       const block = cb.closest('.persona-block');
       if (block) total += parseFloat(block.querySelector('.cp-persona-abono').value) || 0;
     });
     return total;
   }

   // Muestra el detalle de los pedidos incluidos en el abono actual del modal.
   function renderPedidosDetalleCompra() {
     const cont = document.getElementById('cp-pedidos-detalle');
     if (!cont) return;
     if (!editingCompraId) { cont.innerHTML = ''; return; }
     const pedidos = ventasCache.filter(v => v.compra_id === editingCompraId);
     if (pedidos.length === 0) { cont.innerHTML = ''; return; }
     cont.innerHTML = `
       <h4 style="margin:0 0 8px; color:var(--thread-dark);">Pedido(s) que cubre este abono</h4>
        ${pedidos.map(p => {
          const cant = Number(p.cantidad) || 1;
          const ab = Number(p.abono_yesenia) || 0;
          const costo = (Number(p.costo_unitario) || 0) * cant;
          const resto = costo - ab;
         return `
           <div class="camisa-detalle-row">
             <span class="camisa-detalle-info">
               <b>${escSimple(p.cliente_nombre || 'Sin cliente')}</b>
               <span style="color:var(--muted);"> · ${escSimple(p.vendedor || '')}</span>
               <span class="sub-tag">×${cant} camisa(s) · ${badgeModeloVenta(p)} · Costo ${fmt(costo)}</span>
             </span>
             <span class="camisa-abono-campo" style="flex:0 0 150px;">
               <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:700;">Abono a Yesenia</div>
               <div class="money" style="color:var(--ok); text-align:left; margin-top:2px;">${fmt(ab)}</div>
             </span>
             <span class="camisa-abono-campo" style="flex:0 0 130px;">
               <div style="font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:700;">Restante</div>
               <div class="money" style="color:${resto > 0 ? 'var(--warn)' : 'var(--ok)'}; text-align:left; margin-top:2px;">${resto > 0 ? fmt(resto) : 'Liquidado'}</div>
             </span>
           </div>`;
       }).join('')}
     `;
   }

   // Registra automáticamente el aporte a Yesenia:
   // persona = quien tiene la sesión iniciada (vendedor); si la sesión es de
   // administrador (sin vendedor), se usa el comprador de la compra.
   // Si ya existe un aporte automático previo de esa persona, se reemplaza
   // para que el registro refleje siempre el valor actual del abono.
   async function registrarAporteAutomatico(compraId, compradorFallback = '') {
     const persona = currentRole.vendedor
       || compradorFallback
       || ((comprasCache.find(c => c.id === compraId) || {}).comprador || '')
       || '';
     if (!compraId || !persona) return false;
     const monto = abonoClientesSeleccionados();
     if (!(monto > 0)) return false;
     const fecha = hoyColombia();
     try {
       await supabaseClient.from('compra_aportes').delete()
         .eq('compra_id', compraId).eq('persona', persona).eq('observacion', '');
       const { error } = await supabaseClient.from('compra_aportes').insert({
         compra_id: compraId, persona, monto, fecha, observacion: ''
       });
       if (error) { mostrarToast('Error al registrar el aporte automático: ' + error.message, 'error'); return false; }
       return true;
     } catch (e) {
       logError('registrarAporteAutomatico', e);
       mostrarToast('Error al registrar el aporte automático.', 'error');
       return false;
     }
   }

   /* ---------- ABONO ADICIONAL A YESENIA (pagar el saldo restante) ---------- */
   // Pedidos del usuario actual dentro de un abono (para admin: todos los del abono).
   function pedidosMiosEnCompra(compraId) {
     const miNombre = currentRole.vendedor;
     return ventasCache.filter(v =>
       v.compra_id === compraId && (!miNombre || v.vendedor === miNombre)
     );
   }

   // Saldo pendiente de un pedido con Yesenia (costo − abonado a Yesenia).
   function saldoPedidoCompra(v) {
     const costo = (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1);
     return Math.max(costo - (Number(v.abono_yesenia) || 0), 0);
   }

    // "Abonar más a Yesenia" removido por solicitud: el flujo ahora es
    // editar el abono via el desglose equitativo del picker (app.v2.js:2588).
    function renderAbonoAdicional() {
      const section = document.getElementById('cp-abono-adicional');
      if (section) section.classList.add('hidden');
      return;
    }

   // Actualiza el total de la sección "Abonar más" según los montos por pedido.
   function actualizarTotalAbonoAdicional() {
     const totalEl = document.getElementById('cp-abono-adicional-total');
     if (!totalEl) return;
     let total = 0;
     document.querySelectorAll('#cp-abono-adicional .caa-monto').forEach(inp => {
       total += parseFloat(inp.value) || 0;
     });
     totalEl.textContent = fmt(total);
     const errEl = document.getElementById('cp-abono-adicional-error');
     if (errEl) errEl.classList.add('hidden');
   }

   async function registrarAbonoAdicional() {
     const errEl = document.getElementById('cp-abono-adicional-error');
     errEl.classList.add('hidden');
     if (!editingCompraId) return;

     const conSaldo = pedidosMiosEnCompra(editingCompraId).filter(v => saldoPedidoCompra(v) > 0);
     if (conSaldo.length === 0) {
       errEl.textContent = 'No hay saldo pendiente para abonar.';
       errEl.classList.remove('hidden');
       return;
     }

     const extras = {};
     let total = 0;
     document.querySelectorAll('#cp-abono-adicional .caa-monto').forEach(inp => {
       const val = parseFloat(inp.value) || 0;
       extras[inp.dataset.id] = val;
       total += val;
     });

     if (total <= 0) {
       errEl.textContent = 'Ingresa un monto mayor que cero en al menos un pedido.';
       errEl.classList.remove('hidden');
       return;
     }

     for (const v of conSaldo) {
       const extra = extras[v.id] || 0;
       if (extra < 0) {
         errEl.textContent = 'Los montos no pueden ser negativos.';
         errEl.classList.remove('hidden');
         return;
       }
       if (extra > saldoPedidoCompra(v)) {
         errEl.textContent = `El abono de "${escSimple(v.cliente_nombre || 'este pedido')}" supera su saldo (${fmt(saldoPedidoCompra(v))}).`;
         errEl.classList.remove('hidden');
         return;
       }
     }

     try {
       for (const v of conSaldo) {
         const extra = extras[v.id] || 0;
         if (extra <= 0) continue;
         const nuevoAbono = (Number(v.abono_yesenia) || 0) + extra;
         const upd = { abono_yesenia: nuevoAbono };
         const items = itemsDeVentaParaAbono(v);
         const cantItems = items.length || 1;
         const base = Math.floor(extra / cantItems);
         const resto = extra - base * cantItems;
         items.forEach((it, idx) => { it.abono_yesenia = (Number(it.abono_yesenia) || 0) + base + (idx < resto ? 1 : 0); });
         upd.items_camisa = JSON.stringify(items);
         await supabaseClient.from('ventas').update(upd).eq('id', v.id);
       }

       const persona = document.getElementById('cp-abono-adicional-persona')
         ? document.getElementById('cp-abono-adicional-persona').value
         : '';
       if (persona) {
         await supabaseClient.from('compra_aportes').insert({
           compra_id: editingCompraId, persona, monto: total, fecha: hoyColombia(), observacion: 'Abono adicional'
         });
       }

        await loadVentas();
        await loadCompras();
        await loadCompraAportes();
        openCompraModal(editingCompraId);
        mostrarToast('✅ Pagos adicionales a Yesenia registrados.');
        await sugerirLiquidadoParaVarios(conSaldo.map(v=>v.id));
     } catch (err) {
       logError('registrarAbonoAdicional', err);
       errEl.textContent = 'Error inesperado al registrar los pagos.';
       errEl.classList.remove('hidden');
     }
   }

   /* =====================================================
     3. GANANCIAS Y LIQUIDACIONES (SAMIR & VALENTINA)
     ===================================================== */
   async function loadLiquidaciones() {
    try {
      const { data, error } = await supabaseClient
        .from('liquidaciones')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) logError('loadLiquidaciones', error);
      liquidacionesCache = data || [];
      renderLiquidaciones();
      renderTable();
    } catch (e) { logError('loadLiquidaciones', e); }
  }

  // Balance entre socios: se basa en liquidaciones registradas por pedido (50% de ganancia).
  // Cada pedido de Samir/Valentina genera una obligación del 50% de la ganancia hacia el otro socio.
  // Lo no liquidado en Liquidaciones queda como saldo pendiente.
  function calcularDeudaSocios() {
    let deudaSamirAVal = 0;
    let deudaValASamir = 0;
    let gananciaPendienteSamir = 0;
    let gananciaPendienteVal = 0;

    ventasCache.forEach(v => {
      if (v.vendedor !== 'Samir' && v.vendedor !== 'Valentina') return;
      const pendiente = saldoSocioPendientePedido(v);
      const gananciaTotal = mitadGananciaPedido(v) * 2;
      if (v.vendedor === 'Samir') {
        deudaSamirAVal += pendiente;
        gananciaPendienteSamir += gananciaTotal;
      } else if (v.vendedor === 'Valentina') {
        deudaValASamir += pendiente;
        gananciaPendienteVal += gananciaTotal;
      }
    });

    return {
      gananciaPendienteSamir: Math.round(gananciaPendienteSamir),
      gananciaPendienteVal: Math.round(gananciaPendienteVal),
      deudaSamirAVal: Math.round(deudaSamirAVal),
      deudaValASamir: Math.round(deudaValASamir),
      pagadoSamirAVal: 0,
      pagadoValASamir: 0,
      saldoPendienteSamir: Math.round(deudaSamirAVal),
      saldoPendienteVal: Math.round(deudaValASamir)
    };
  }

  function renderLiquidaciones() {
    const d = calcularDeudaSocios();
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;

    const samirCard = document.getElementById('stat-ganancia-samir')?.closest('.card');
    const valCard = document.getElementById('stat-ganancia-val')?.closest('.card');

    if (!esAdmin && miNombre !== 'Samir') {
      if (samirCard) samirCard.classList.add('hidden');
    } else if (samirCard) {
      samirCard.classList.remove('hidden');
      document.getElementById('stat-ganancia-samir').textContent = fmt(
        ventasCache.filter(v => v.vendedor === 'Samir').reduce((s, v) =>
          s + ((Number(v.precio_unitario) || 0) - (Number(v.costo_unitario) || 0)) * (Number(v.cantidad) || 1) / 2, 0
        )
      );
    }

    if (!esAdmin && miNombre !== 'Valentina') {
      if (valCard) valCard.classList.add('hidden');
    } else if (valCard) {
      valCard.classList.remove('hidden');
      document.getElementById('stat-ganancia-val').textContent = fmt(
        ventasCache.filter(v => v.vendedor === 'Valentina').reduce((s, v) =>
          s + ((Number(v.precio_unitario) || 0) - (Number(v.costo_unitario) || 0)) * (Number(v.cantidad) || 1) / 2, 0
        )
      );
    }

    let balCard = document.getElementById('card-balance-socios');
    if (!balCard) {
      balCard = document.getElementById('stat-balance-socios')?.closest('.card');
      if (balCard) balCard.id = 'card-balance-socios';
    }

    const totalPendiente = d.deudaSamirAVal + d.deudaValASamir;

    if (!balCard) return;

    balCard.innerHTML = `
      <div class="eyebrow">💰 Balance entre socios</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px; border:1px solid var(--line); border-radius:8px; padding:10px; margin-top:8px;">
        <div>
          <b>Samir</b> le debe liquidar a <b>Valentina</b>:<br>
          <b class="money" style="color:${d.deudaSamirAVal > 0 ? 'var(--warn)' : 'var(--ok)'};">${fmt(d.deudaSamirAVal)}</b>
        </div>
        <div>
          <b>Valentina</b> le debe liquidar a <b>Samir</b>:<br>
          <b class="money" style="color:${d.deudaValASamir > 0 ? 'var(--warn)' : 'var(--ok)'};">${fmt(d.deudaValASamir)}</b>
        </div>
      </div>
      <div style="margin-top:10px; padding:10px; border-radius:8px; background:${totalPendiente > 0 ? 'var(--warn)' : 'var(--ok)'}22;">
        <b>${totalPendiente > 0 ? `⚠️ Total pendiente por liquidar: ${fmt(totalPendiente)}` : '✅ Cuentas al día entre socios'}</b>
      </div>
    `;

    const body = document.getElementById('liquidaciones-body');
    const empty = document.getElementById('liquidaciones-empty');

    const ql = (document.getElementById('filter-liquidaciones-search')?.value || '').toLowerCase().trim();
    let liquidacionesFiltradas = liquidacionesCache;
    if (ql) {
      liquidacionesFiltradas = liquidacionesCache.filter(l => {
        const venta = ventasCache.find(v => v.id === l.venta_id);
        return (l.pagador || '').toLowerCase().includes(ql) ||
          (l.receptor || '').toLowerCase().includes(ql) ||
          (l.nota || '').toLowerCase().includes(ql) ||
          (l.fecha || '').includes(ql) ||
          (venta && (venta.cliente_nombre || '').toLowerCase().includes(ql));
      });
    }
    if (liquidacionesFiltradas.length === 0) {
      body.innerHTML = '';
      empty.classList.remove('hidden');
      const wrap0 = body.closest('.table-wrap');
      const pag0 = wrap0.querySelector('.pagination');
      if (pag0) pag0.innerHTML = '';
    } else {
      empty.classList.add('hidden');
      const rowsLiq = ordenarFilas(liquidacionesFiltradas, 'liquidaciones', REGISTRO_ORDEN.liquidaciones.campos);
      const page = paginationState.liquidaciones;
      const start = page * PAGE_SIZE;
      const pageRows = rowsLiq.slice(start, start + PAGE_SIZE);

      body.innerHTML = pageRows.map(l => {
        const venta = ventasCache.find(v => v.id === l.venta_id);
        const pedidoLabel = venta
          ? `<b>${venta.cliente_nombre || 'Cliente'}</b><span class="sub-tag">${venta.fecha || ''}</span>`
          : (l.venta_id ? 'Pedido eliminado' : '—');
        const puedeBorrar = currentRole.role === 'admin' || currentRole.vendedor === l.pagador;
        const acciones = puedeBorrar
          ? `<button class="btn-danger" onclick="deleteLiquidacion('${l.id}')" type="button">Borrar</button>`
          : '<span style="color:var(--muted);">—</span>';
        return `
        <tr>
          <td>${formatearFechaHumana(l.fecha)}<span class="sub-tag">🕐 ${l.hora || ''}</span></td>
          <td>${pedidoLabel}</td>
          <td><b>${l.pagador}</b></td>
          <td><b>${l.receptor}</b></td>
          <td class="money" style="color:var(--ok);">${fmt(l.monto)}</td>
          <td>${l.nota || '—'}</td>
          <td>
            <div class="action-group" style="flex-direction:row;">
              ${acciones}
            </div>
          </td>
        </tr>
      `;
      }).join('');

      const wrap = body.closest('.table-wrap');
      let pagContainer = wrap.querySelector('.pagination');
      if (!pagContainer) {
        pagContainer = document.createElement('div');
        pagContainer.className = 'pagination';
        wrap.appendChild(pagContainer);
      }
      pagContainer.innerHTML = renderPagination(liquidacionesFiltradas.length, page, 'liquidaciones', 'irPaginaLiquidaciones');
      marcarOrdenTabla('liquidaciones');
    }
  }
  function irPaginaLiquidaciones(p) { paginationState.liquidaciones = p; renderLiquidaciones(); }

  function openLiquidacionModal() {
    document.getElementById('lq-pagador').value = '';
    document.getElementById('lq-receptor').value = '';
    document.getElementById('lq-monto').value = '';
    document.getElementById('lq-fecha').value = hoyColombia();
    document.getElementById('lq-nota').value = '';
    document.getElementById('lq-error').classList.add('hidden');
    renderLiquidacionPedidosSelect();
    document.getElementById('liquidacion-modal').classList.remove('hidden');
    bloquearScrollFondo();
  }

  function closeLiquidacionModal() {
    document.getElementById('liquidacion-modal').classList.add('hidden');
    desbloquearScrollFondo();
  }

  async function saveLiquidacion() {
    const pagador = document.getElementById('lq-pagador').value;
    const receptor = document.getElementById('lq-receptor').value;
    const ventaId = document.getElementById('lq-pedido').value;
    const monto = parseFloat(document.getElementById('lq-monto').value);
    const fecha = document.getElementById('lq-fecha').value;
    const nota = document.getElementById('lq-nota').value.trim();
    const errEl = document.getElementById('lq-error');

    errEl.classList.add('hidden');
    if (!pagador || !receptor) {
      errEl.textContent = 'Selecciona quién paga y quién recibe.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!ventaId) {
      errEl.textContent = 'Selecciona el pedido que estás liquidando.';
      errEl.classList.remove('hidden');
      return;
    }
    if (pagador === receptor) {
      errEl.textContent = 'El pagador y el receptor deben ser diferentes.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!fecha || isNaN(monto) || monto <= 0) {
      errEl.textContent = 'Ingresa un monto válido mayor que cero.';
      errEl.classList.remove('hidden');
      return;
    }

    const venta = ventasCache.find(v => v.id === ventaId);
    if (!venta) {
      errEl.textContent = 'El pedido seleccionado no existe.';
      errEl.classList.remove('hidden');
      return;
    }
    if (venta.vendedor !== pagador) {
      errEl.textContent = `Solo ${venta.vendedor} puede registrar la liquidación de sus propios pedidos.`;
      errEl.classList.remove('hidden');
      return;
    }
    const receptorEsperado = otroSocioDe(pagador);
    if (receptor !== receptorEsperado) {
      errEl.textContent = `Para pedidos de ${pagador}, el receptor debe ser ${receptorEsperado}.`;
      errEl.classList.remove('hidden');
      return;
    }
    const saldoPendiente = saldoSocioPendientePedido(venta);
    if (monto > saldoPendiente + 1) {
      errEl.textContent = `El monto supera el saldo pendiente de este pedido (${fmt(saldoPendiente)}).`;
      errEl.classList.remove('hidden');
      return;
    }

     const { error } = await supabaseClient.from('liquidaciones').insert({
       venta_id: ventaId, fecha, pagador, receptor, monto, nota, hora: horaColombia()
     });

     if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return; }

     const entradaTemp = { id: 'new_' + Date.now(), venta_id: ventaId, fecha, pagador, receptor, monto: Number(monto), nota };
     liquidacionesCache = [entradaTemp, ...liquidacionesCache];

     try { renderLiquidaciones(); } catch (e) { logError('renderLiquidaciones', e); }
     try { renderTable(); } catch (e) { logError('renderTable', e); }
     closeLiquidacionModal();

      await loadLiquidaciones();
      await loadVentas();
      await sugerirLiquidadoSiListo(ventaId);
   }

  async function deleteLiquidacion(id) {
    const liquidacion = liquidacionesCache.find(x => x.id === id);
    if (liquidacion && currentRole.role !== 'admin' && currentRole.vendedor !== liquidacion.pagador) {
      mostrarToast('No puedes eliminar una liquidación que no es tuya.', 'error');
      return;
    }
    if (!confirmar('¿Eliminar este registro de pago?')) return;
    try {
      await supabaseClient.from('liquidaciones').delete().eq('id', id);
      await loadLiquidaciones();
      renderTable();
    } catch (e) { logError('deleteLiquidacion', e); }
  }


  /* =====================================================
     4. MÓDULO: USUARIOS (SÓLO ADMIN)
     ===================================================== */
  async function loadUsuarios() {
    try {
      const { data, error } = await supabaseClient
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) { logError('loadUsuarios', error); return; }
      usuariosCache = data || [];
      renderUsuariosTable();
    } catch (err) { logError('loadUsuarios', err); }
  }

  function renderUsuariosTable() {
    const body = document.getElementById('usuarios-body');
    const emptyState = document.getElementById('users-empty-state');

    if (usuariosCache.length === 0) {
      body.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = 'No hay usuarios registrados en la base de datos.<br><button class="btn btn-gold" onclick="openUserModal()" type="button">Crear usuario</button>';
      return;
    }

    const qu = (document.getElementById('filter-usuarios-search')?.value || '').toLowerCase().trim();
    let usuariosFiltrados = usuariosCache;
    if (qu) {
      usuariosFiltrados = usuariosCache.filter(u =>
        (u.nombre || '').toLowerCase().includes(qu) ||
        (u.correo || '').toLowerCase().includes(qu) ||
        (u.rol || '').toLowerCase().includes(qu)
      );
    }
    if (usuariosFiltrados.length === 0) {
      body.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = 'Sin resultados para "' + escSimple(qu) + '".';
      return;
    }
    emptyState.classList.add('hidden');
    const usuariosOrdenados = ordenarFilas(usuariosFiltrados, 'usuarios', REGISTRO_ORDEN.usuarios.campos);
    body.innerHTML = usuariosOrdenados.map(u => `
      <tr>
        <td><b>${u.nombre || 'Sin nombre'}</b></td>
        <td>${u.correo}</td>
        <td>
          <span class="badge-estado ${u.rol === 'admin' ? 'estado-Liquidado' : 'estado-Comprado'}">
            ${u.rol === 'admin' ? 'ADMINISTRADOR' : 'VENDEDOR'}
          </span>
        </td>
        <td>${u.created_at ? formatearFechaHumana(u.created_at.split('T')[0]) : '—'}</td>
        <td>
          <div class="action-group" style="flex-direction:row;">
            <button class="btn-small" onclick="editUser('${u.id}')" type="button">Editar</button>
            <button class="btn-danger" onclick="deleteUser('${u.id}')" type="button">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');

    marcarOrdenTabla('usuarios');
  }

  function openUserModal(user = null) {
    editingUserId = user ? user.id : null;
    document.getElementById('user-modal-title').textContent = editingUserId ? 'Editar Usuario' : 'Nuevo Usuario';
    document.getElementById('u-nombre').value = user ? user.nombre : '';
    document.getElementById('u-correo').value = user ? user.correo : '';
    document.getElementById('u-rol').value = user ? user.rol : '';
    document.getElementById('u-password').value = '';

    const passwordInput = document.getElementById('u-password');
    const passwordLabel = document.getElementById('u-password-label');
    const passwordHint = document.getElementById('u-password-hint');
    if (editingUserId) {
      // El correo de un usuario ya existente no se puede cambiar (identifica su cuenta de acceso),
      // y la contraseña sólo se puede establecer al crear el usuario.
      document.getElementById('u-correo').disabled = true;
      // password disabled when editing existing user
      passwordInput.style.display = 'none';
      passwordLabel.style.display = 'none';
      passwordHint.style.display = 'none';
    } else {
      document.getElementById('u-correo').disabled = false;
      passwordInput.style.display = '';
      passwordLabel.style.display = '';
      passwordHint.style.display = '';
    }

    document.getElementById('user-error').classList.add('hidden');
    document.getElementById('user-modal').classList.remove('hidden');
    bloquearScrollFondo();
  }

  function closeUserModal() {
    editingUserId = null;
    document.getElementById('user-modal').classList.add('hidden');
    desbloquearScrollFondo();
  }

  async function saveUser() {
    const nombre = document.getElementById('u-nombre').value.trim();
    const correo = document.getElementById('u-correo').value.trim().toLowerCase();
    const password = document.getElementById('u-password').value;
    const rol = document.getElementById('u-rol').value;
    const errEl = document.getElementById('user-error');
    const saveBtn = document.querySelector('#user-modal .btn-gold');

    errEl.classList.add('hidden');
    if (!nombre || !correo || !rol) {
      errEl.textContent = 'Nombre, correo y rol son obligatorios.';
      errEl.classList.remove('hidden');
      return;
    }

    if (editingUserId) {
      // Editar un usuario existente: solo se puede cambiar nombre y rol (correo y contraseña quedan fijos).
      try {
        const { error } = await supabaseClient.from('usuarios').update({ nombre, rol }).eq('id', editingUserId);
        if (error) { errEl.textContent = error.message; errEl.classList.remove('hidden'); return; }
        closeUserModal();
        await loadUsuarios();
      } catch (err) {
        errEl.textContent = 'Error al guardar el usuario.';
        errEl.classList.remove('hidden');
      }
      return;
    }

    // Crear usuario nuevo: se necesita una contraseña para poder iniciar sesión.
    if (!password || password.length < 6) {
      errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errEl.classList.remove('hidden');
      return;
    }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Creando...'; }

    try {
      // Guarda la sesión del administrador para restaurarla después, porque signUp()
      // reemplaza automáticamente la sesión activa del navegador por la del nuevo usuario.
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const adminSession = sessionData?.session || null;

      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email: correo, password });

      if (signUpError) {
        errEl.textContent = signUpError.message;
        errEl.classList.remove('hidden');
        if (adminSession) await supabaseClient.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
        return;
      }

      // Restaura la sesión del administrador antes de escribir en la tabla usuarios.
      if (adminSession) {
        await supabaseClient.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
        currentUser = adminSession.user;
      }

      const { error: insertError } = await supabaseClient.from('usuarios').insert({ nombre, correo, rol });
      if (insertError) { errEl.textContent = insertError.message; errEl.classList.remove('hidden'); return; }

      closeUserModal();
      await loadUsuarios();
      mostrarToast(`✅ Usuario creado. Ahora ${nombre} puede iniciar sesión con ${correo} y la contraseña que ingresaste.`);
    } catch (err) {
      errEl.textContent = 'Error inesperado al crear el usuario.';
      errEl.classList.remove('hidden');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar Usuario'; }
    }
  }

  function editUser(id) {
    const u = usuariosCache.find(x => x.id === id);
    if (u) openUserModal(u);
  }

  async function deleteUser(id) {
    if (!confirmar('¿Eliminar este usuario?')) return;
    try {
      await supabaseClient.from('usuarios').delete().eq('id', id);
      await loadUsuarios();
      mostrarToast('Usuario eliminado');
    } catch (err) { logError('deleteUser', err); mostrarToast('Error al eliminar usuario', 'error'); }
  }


  /* =====================================================
     5. EXPORTACIÓN EXCEL
     ===================================================== */
  function exportarCompraExcel() {
    try {
      // Fix: el usuario filtra por Pedido y ve 3 pedidos (11 camisas). El export anterior usaba pedidosPorComprar()
      // que excluye con compra_id (Sara tiene compra_id pero sigue en Pedido) y daba 7. Ahora respeta filtros.
      const fe = document.getElementById('filter-estado')?.value || '';
      let dataset;
      if (fe) {
        dataset = getVentasFiltradas().filter(v => normalizarEstado(v.estado) === fe);
      } else {
        dataset = pedidosPorComprar();
      }
      if (dataset.length === 0) {
        mostrarToast('✅ No hay pedidos pendientes de comprar al proveedor.');
        return;
      }

      // Combina pedidos iguales: suma las unidades por Género/Color/Talla.
      // Fix: pedidos viejos en modo simple guardaban items.length=1 con cantidad=4/6 -> contar cantidad, no 1.
      const agg = {};
      dataset.forEach(v => {
        let items = null;
        if (v.items_camisa) {
          try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
        }
        const sinDetalle = !(items && Array.isArray(items) && items.length > 0);
        if (!items || !Array.isArray(items) || items.length === 0) {
          items = [{ genero: v.genero, color: v.color, talla: v.talla, modelo: v.modelo }];
        }
        const cant = Number(v.cantidad) || 1;
        const pesoPorItem = sinDetalle ? cant : (items.length === 1 ? cant : cant / items.length);
        // Si la división no es entera (datos inconsistentes), repartir el resto en las primeras filas
        const base = Math.floor(pesoPorItem);
        const resto = Math.round((pesoPorItem - base) * items.length);
        items.forEach((it, idx) => {
          const veces = sinDetalle ? cant : (items.length === 1 ? cant : base + (idx < resto ? 1 : 0));
          const key = `${it.genero || ''}|${it.color || ''}|${it.talla || ''}|${normalizarModelo(it.modelo)}`;
          if (!agg[key]) agg[key] = { genero: it.genero || '', color: it.color || '', talla: it.talla || '', modelo: normalizarModelo(it.modelo), cantidad: 0 };
          agg[key].cantidad += veces;
        });
      });

      const listaCompra = Object.values(agg)
        .sort((a, b) =>
          (a.modelo || '').localeCompare(b.modelo || '') ||
          (a.color || '').localeCompare(b.color || '') ||
          (a.talla || '').localeCompare(b.talla || '') ||
          (a.genero || '').localeCompare(b.genero || '')
        )
        .map(g => ({ Cantidad: g.cantidad, Género: g.genero, Color: g.color, Talla: g.talla, Versión: etiquetaModelo(g.modelo) }));

      // Totales para la hoja de resumen.
      let totalCamisas = 0;
      let totalVenta = 0;
      let totalCosto = 0;
      dataset.forEach(v => {
        const cant = Number(v.cantidad) || 1;
        totalCamisas += cant;
        totalVenta += (Number(v.precio_unitario) || 0) * cant;
        totalCosto += (Number(v.costo_unitario) || 0) * cant;
      });

      const resumen = [
        ['FECHA DE EXPORTACIÓN', formatearFechaHumana(hoyColombia()).replace(/^📅\s*/, '')],
        [],
        ['Pedidos por comprar', dataset.length],
        ['Camisas por comprar', totalCamisas],
        ['Valor venta total', '$' + Math.round(totalVenta).toLocaleString('es-CO')],
        ['Costo estimado total', '$' + Math.round(totalCosto).toLocaleString('es-CO')],
        ['Ganancia estimada', '$' + Math.round(totalVenta - totalCosto).toLocaleString('es-CO')]
      ];

      // Detalle por pedido (referencia interna). Fix: respeta cantidad si items.length=1 (dato viejo).
      const detalle = [];
      dataset.forEach(v => {
        let items = null;
        if (v.items_camisa) {
          try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
        }
        const sinDetalle = !(items && Array.isArray(items) && items.length > 0);
        if (!items || !Array.isArray(items) || items.length === 0) {
          items = [{ genero: v.genero, color: v.color, talla: v.talla, programa: v.cliente_programa, modelo: v.modelo }];
        }
        const cant = Number(v.cantidad) || 1;
        const peso = sinDetalle ? cant : (items.length === 1 ? cant : cant / items.length);
        const base = Math.floor(peso);
        const resto = Math.round((peso - base) * items.length);
        items.forEach((it, idx) => {
          const veces = sinDetalle ? cant : (items.length === 1 ? cant : base + (idx < resto ? 1 : 0));
          // Duplicar fila por cada camisa para que el detalle sume la cantidad real
          for (let k = 0; k < (veces || 1); k++) {
            detalle.push({
              'ID Pedido': v.id || '',
              'Cliente': v.cliente_nombre || '',
              'Vendedor': v.vendedor || '',
              'Lugar Entrega': v.lugar_entrega || '',
              'Entrega Por': v.entrega_por || '',
              'Género': it.genero || '',
              'Color': it.color || '',
              'Talla': it.talla || '',
              'Bordado': it.programa || '',
              'Versión': etiquetaModelo(it.modelo)
            });
          }
        });
      });

      const wb = XLSX.utils.book_new();

      const wsLista = XLSX.utils.json_to_sheet(listaCompra);
      wsLista['!cols'] = [{ wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 11 }];
      XLSX.utils.book_append_sheet(wb, wsLista, 'Lista de compra');

      const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 26 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const wsDetalle = XLSX.utils.json_to_sheet(detalle);
      wsDetalle['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por pedido');

      XLSX.writeFile(wb, `Compra_camisas_${hoyColombia()}.xlsx`);
    } catch (err) {
      mostrarToast('Error al exportar: ' + (err.message || err), 'error');
    }
  }

  function exportarExcelCompleto() {
    if (currentRole.role !== 'admin') return;

    const data = getVentasFiltradas().sort(ordenarPorEntrega);
    if (data.length === 0) {
      mostrarToast('No hay datos para exportar con los filtros actuales.', 'error');
      return;
    }

    const headers = [
      'ID Pedido', 'Fecha Pedido', 'Fecha Entrega', 'Día de entrega', 'Estado',
      'Vendedor', 'Cliente', 'Teléfono', 'Lugar de entrega', 'Entrega por', 'Nota',
      'Género', 'Color', 'Talla', 'Bordado', 'Versión',
      'Precio Unitario', 'Costo Unitario',
      'Cantidad', 'Venta Total', 'Costo Total', 'Abono Cliente',
      'Saldo Pendiente Cliente', 'Pagado al Proveedor', 'Saldo Pendiente Proveedor',
      'Ganancia Total', 'Me queda (Saldo - Ganancia/2)'
    ];

    const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const fmt = n => (n == null || isNaN(n)) ? '' : '$' + Math.round(n).toLocaleString('es-CO');
    const fmtNum = n => (n == null || isNaN(n)) ? '' : String(Math.round(n));

    const statusBg = { 'Pedido':'#F3F4F6','Comprado':'#DBEAFE','Bordando':'#F3E8FF','Listo para entrega':'#ECFCCB','Entregado':'#DBEAFE','Liquidado':'#D1FAE5' };
    const statusFg = { 'Pedido':'#4B5563','Comprado':'#1E40AF','Bordando':'#7C3AED','Listo para entrega':'#3F6212','Entregado':'#1E3A5F','Liquidado':'#065F46' };

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reporte</x:Name><x:WorksheetOptions><x:FreezePanes/><x:FrozenNoSplit/><x:SplitHorizontal>1</x:SplitHorizontal><x:TopRowBottomPane>1</x:TopRowBottomPane></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>td,th{border:1px solid #CBD5E1;padding:4px 8px;font-family:Calibri,sans-serif;font-size:10pt}th{background:#1E293B;color:#FFF;font-weight:700;text-align:center}.c{text-align:center}.r{text-align:right}.m{mso-number-format:'\\0022$\\0022#,##0';text-align:right}</style></head><body><table>`;

    // Header
    html += '<tr>' + headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>';

    let lastPedidoId = null;
    let rowToggle = false;
    let excelRow = 2; // fila 1 es header, para fórmulas AA = W - Z/2

    data.forEach(v => {
      if (v.id !== lastPedidoId) { rowToggle = !rowToggle; lastPedidoId = v.id; }
      const bg = rowToggle ? '#F8FAFC' : '#FFFFFF';
      let items = null;
      if (v.items_camisa) {
        try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        items = [{ genero: v.genero || '', color: v.color || '', talla: v.talla || '', programa: v.cliente_programa || '' }];
      }

      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const costo = Number(v.costo_unitario) || 0;
      const abono = Number(v.abono) || 0;
      const pagosProv = abonosProveedorPorVentaId(v.id);
      // Para el Excel por camisa: totales por pedido se reparten por item (fix ganancia duplicada)
      const sinDet = !(items && Array.isArray(items) && items.length > 0);
      const nItems = sinDet ? 1 : items.length;
      const cantPorItemBase = sinDet ? cant : (nItems === 1 ? cant : Math.floor(cant / nItems));
      const restoCant = sinDet ? 0 : (nItems === 1 ? 0 : cant - cantPorItemBase * nItems);

      let diaSemana = '';
      if (v.fecha_entrega) {
        try {
          diaSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date(v.fecha_entrega + 'T12:00:00').getDay()] || '';
        } catch (e) { logError('diaSemana', e); }
      }

      const venClr = v.vendedor === 'Samir' ? 'background:#EFF6FF;color:#1D4ED8;font-weight:700' : v.vendedor === 'Valentina' ? 'background:#FDF2F8;color:#BE185D;font-weight:700' : '';

      const e = normalizarEstado(v.estado || '');
      const eBg = statusBg[e] || 'transparent';
      const eFg = statusFg[e] || '#000';

      items.forEach((it, idx) => {
        const cantItem = sinDet ? cant : (nItems === 1 ? cant : cantPorItemBase + (idx < restoCant ? 1 : 0));
        const ventaItem = precio * cantItem;
        const costoItem = costo * cantItem;
        const abonoItem = (it.abono != null && it.abono !== '' && !isNaN(Number(it.abono))) ? Number(it.abono) : (abono / nItems);
        const abonoYesItem = (it.abono_yesenia != null && it.abono_yesenia !== '' && !isNaN(Number(it.abono_yesenia))) ? Number(it.abono_yesenia) : (pagosProv.abonado / nItems);
        const saldoItem = ventaItem - abonoItem;
        const pendProvItem = costoItem - abonoYesItem;
        const gananciaItem = ventaItem - costoItem;
        html += '<tr style="background:' + bg + '">' +
          '<td class="c">' + esc(v.id) + '</td>' +
          '<td class="c">' + esc(v.fecha) + '</td>' +
          '<td class="c">' + esc(v.fecha_entrega || 'Pendiente por definir') + '</td>' +
          '<td class="c">' + esc(diaSemana) + '</td>' +
          '<td style="background:' + eBg + ';color:' + eFg + ';font-weight:700;text-align:center">' + esc(e) + '</td>' +
          '<td style="' + venClr + ';text-align:center">' + esc(v.vendedor) + '</td>' +
          '<td>' + esc(v.cliente_nombre) + '</td>' +
          '<td class="c">' + esc(v.cliente_telefono) + '</td>' +
          '<td>' + esc(v.lugar_entrega) + '</td>' +
          '<td>' + esc(v.entrega_por || 'Sin asignar') + '</td>' +
          '<td>' + esc(v.nota) + '</td>' +
          '<td class="c">' + esc(it.genero) + '</td>' +
          '<td class="c">' + esc(capitalizarColor(it.color)) + '</td>' +
          '<td class="c">' + esc(it.talla) + '</td>' +
          '<td>' + esc(it.programa) + '</td>' +
          '<td class="c">' + esc(etiquetaModelo(it.modelo)) + '</td>' +
          '<td class="m">' + fmtNum(precio) + '</td>' +
          '<td class="m">' + fmtNum(costo) + '</td>' +
          '<td class="c">' + fmtNum(cantItem) + '</td>' +
          '<td class="m" x:fmla="=Q' + excelRow + '*S' + excelRow + '">' + fmtNum(ventaItem) + '</td>' +
          '<td class="m" x:fmla="=R' + excelRow + '*S' + excelRow + '">' + fmtNum(costoItem) + '</td>' +
          '<td class="m">' + fmtNum(abonoItem) + '</td>' +
          '<td class="m" x:fmla="=T' + excelRow + '-V' + excelRow + '">' + fmtNum(saldoItem) + '</td>' +
          '<td class="m">' + fmtNum(abonoYesItem) + '</td>' +
          '<td class="m" x:fmla="=U' + excelRow + '-X' + excelRow + '">' + fmtNum(pendProvItem) + '</td>' +
          '<td class="m" x:fmla="=T' + excelRow + '-U' + excelRow + '">' + fmtNum(gananciaItem) + '</td>' +
          '<td class="m" x:fmla="=W' + excelRow + '-Z' + excelRow + '/2">' + fmtNum(saldoItem - gananciaItem/2) + '</td>' +
          '</tr>';
        excelRow++;
      });
    });

    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Reporte_Ventas_Camisas_IUB_' + hoyColombia() + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  /* =====================================================
     ACCIONES DIRECTAS VENTAS
     ===================================================== */
  async function updateEstado(id, estado, selectEl) {
    const venta = ventasCache.find(v => v.id === id);
    if (estado === 'Liquidado' && venta) {
      const check = puedeMarcarPagado(venta);
      if (!check.ok) {
        mostrarToast('No puedes marcar como Liquidado:\n\n• ' + check.faltas.join('\n• '), 'error');
        if (selectEl) selectEl.value = selectEl.dataset.prev || venta.estado;
        return;
      }
    }

    try {
      await supabaseClient.from('ventas').update({ estado }).eq('id', id);
      await loadVentas();
    } catch (err) {
      if (selectEl && venta) selectEl.value = selectEl.dataset.prev || venta.estado;
    }
  }

  async function addAbono(id) {
    const venta = ventasCache.find(v => v.id === id);
    if (!venta) return;

    const entrada = prompt(`Cliente: ${venta.cliente_nombre}\nAbono actual (total): ${fmt(venta.abono)}\n\n¿Cuánto abono adicional ingresará el cliente?\n\n(Si el pedido tiene varias camisas, usa "Editar" para repartir el abono entre cada una)`, '0');
    if (entrada === null) return;

    const monto = parseFloat(entrada);
    if (isNaN(monto) || monto <= 0) { mostrarToast('Ingresa un monto válido.', 'error'); return; }

    const nuevoAbono = (Number(venta.abono) || 0) + monto;
    const payload = { abono: nuevoAbono };

    if (venta.items_camisa) {
      try {
        const items = JSON.parse(venta.items_camisa);
        if (Array.isArray(items) && items.length > 0) {
          const abonoPorItem = monto / items.length;
          items.forEach((it, i) => { items[i].abono = (Number(items[i].abono) || 0) + abonoPorItem; });
          payload.items_camisa = JSON.stringify(items);
        }
      } catch (e) { logError('addAbono:parseItems', e); }
    }

    try {
      await supabaseClient.from('ventas').update(payload).eq('id', id);
      await loadVentas();
      mostrarToast('Abono agregado correctamente');
    } catch (err) { logError('addAbono:update', err); mostrarToast('Error al agregar abono', 'error'); }
  }

  async function deleteVenta(id) {
    if (!confirmar('¿Deseas borrar permanentemente este pedido?')) return;
    try {
      await supabaseClient.from('ventas').delete().eq('id', id);
      await loadVentas();
    } catch (err) {}
  }


  /* =====================================================
     HISTORIAL DE PEDIDOS (finalizados)
     ===================================================== */
  async function finalizarVenta(id) {
    const venta = ventasCache.find(v => v.id === id);
    if (!venta) return;
    if (normalizarEstado(venta.estado) !== 'Liquidado') {
      mostrarToast('Para finalizar el pedido, primero debes marcarlo como Liquidado.', 'error');
      return;
    }
    if (!confirmar(`¿Finalizar el pedido de ${venta.cliente_nombre || 'cliente'}?\n\nPasará al Historial de pedidos y dejará de aparecer en "Pedidos".`)) return;
    try {
      await supabaseClient.from('ventas').update({ finalizado: true }).eq('id', id);
      await loadVentas();
      mostrarToast('✅ Pedido finalizado y movido al historial.');
    } catch (err) {
      logError('finalizarVenta', err);
      mostrarToast('Error al finalizar el pedido.', 'error');
    }
  }

  async function restaurarPedido(id) {
    if (!confirmar('¿Restaurar este pedido a la lista de pedidos activos?')) return;
    try {
      await supabaseClient.from('ventas').update({ finalizado: false }).eq('id', id);
      await loadVentas();
      mostrarToast('✅ Pedido restaurado a "Pedidos".');
    } catch (err) {
      logError('restaurarPedido', err);
      mostrarToast('Error al restaurar el pedido.', 'error');
    }
  }

  function renderHistorial() {
    let rowsBase = ventasCache.filter(v => v.finalizado);
    const qh = (document.getElementById('filter-historial-search')?.value || '').toLowerCase().trim();
    if (qh) {
      rowsBase = rowsBase.filter(v => (
        (v.cliente_nombre || '').toLowerCase().includes(qh) ||
        (v.cliente_telefono || '').toLowerCase().includes(qh) ||
        (v.vendedor || '').toLowerCase().includes(qh) ||
        (v.estado || '').toLowerCase().includes(qh) ||
        (v.fecha || '').includes(qh) ||
        (v.id || '').toLowerCase().includes(qh)
      ));
    }
    const rows = ordenarFilas(rowsBase, 'historial', REGISTRO_ORDEN.historial.campos);
    const body = document.getElementById('historial-body');
    if (!body) return;
    document.getElementById('historial-empty-state').classList.toggle('hidden', rows.length > 0);

    const totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
    if (paginationState.historial > totalPages - 1) paginationState.historial = totalPages - 1;
    const start = paginationState.historial * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    body.innerHTML = pageRows.map(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = Number(v.precio_unitario) || 0;
      const abonoCliente = Number(v.abono) || 0;
      const venta = precio * cant;
      const restanteCliente = venta - abonoCliente;
      const items = itemsParaDashboard(v);

      return `
        <tr>
          <td>${v.fecha ? formatearFechaHumana(v.fecha) : ''}</td>
          <td><b>${v.vendedor || ''}</b></td>
          <td>
            <b>${v.cliente_nombre || ''}</b>
            <span class="sub-tag">📞 ${v.cliente_telefono || ''}</span>
          </td>
          <td>
            <div style="margin-bottom:6px;">${badgeModeloVenta(v)}</div>
            <div style="font-size:12px; line-height:1.6;">${items.join('<br>')}</div>
          </td>
          <td><b>${cant}</b></td>
          <td class="money">${fmt(venta)}</td>
          <td class="money">${fmt(abonoCliente)}</td>
          <td class="money" style="color:${restanteCliente > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmt(restanteCliente)}</td>
          <td>
            <span class="humano-fecha">${textoFechaEntrega(v)}</span>
            <span class="sub-tag">📍 ${escSimple(v.lugar_entrega || 'Sin definir')} · 🚚 ${escSimple(v.entrega_por || 'Sin asignar')}</span>
          </td>
          <td><span class="badge-estado ${claseEstado(v.estado || '')}">${escSimple(normalizarEstado(v.estado) || '—')}</span></td>
          <td>
            <div class="action-group">
              <button class="btn-small restaurar-button" data-id="${v.id}" type="button">Restaurar</button>
              <button class="btn-danger borrar-historial-button" data-id="${v.id}" type="button">Borrar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.restaurar-button').forEach(button => {
      button.addEventListener('click', () => restaurarPedido(button.dataset.id));
    });

    document.querySelectorAll('.borrar-historial-button').forEach(button => {
      button.addEventListener('click', () => deleteVenta(button.dataset.id));
    });

    const pagContainer = document.getElementById('historial-pagination');
    if (pagContainer && rows.length > PAGE_SIZE) {
      pagContainer.style.display = '';
      pagContainer.innerHTML = renderPagination(rows.length, paginationState.historial, 'historial', 'irPaginaHistorial');
    } else if (pagContainer) {
      pagContainer.style.display = 'none';
    }
    marcarOrdenTabla('historial');
  }

  function irPaginaHistorial(p) { paginationState.historial = p; renderHistorial(); }


