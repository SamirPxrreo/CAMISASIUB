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

  function initSearchClears() {
    function updateVisibility(input) {
      if (!input || !input.id) return;
      const btn = document.querySelector(`.search-clear[data-target="${input.id}"]`);
      if (!btn) return;
      btn.classList.toggle('visible', !!input.value);
    }
    // Delegado para inputs dinámicos (dash se re-renderiza)
    document.addEventListener('input', (e) => {
      if (e.target.matches && e.target.matches('.search-input, .dash-search')) {
        updateVisibility(e.target);
      }
    });
    // Inicial
    document.querySelectorAll('.search-input, .dash-search').forEach(updateVisibility);
    // Delegado para clicks en X
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.search-clear');
      if (!btn) return;
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.value = '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
      if (target.id === 'dash-search-ventas') dashFiltroVentas = '';
      if (target.id === 'dash-search-entregas') dashFiltroEntregas = '';
      target.focus();
      updateVisibility(target);
      if (target.id === 'filter-search') { paginationState.orders = 0; renderTable(); }
      if (target.id === 'filter-historial-search') { paginationState.historial = 0; renderHistorial(); }
      if (target.id === 'filter-compras-search') { paginationState.compras = 0; renderCompras(); }
      if (target.id === 'filter-liquidaciones-search') { paginationState.liquidaciones = 0; renderLiquidaciones(); }
      if (target.id === 'filter-usuarios-search') { renderUsuariosTable(); }
      if (target.id === 'filter-cuentas-search') { paginationState.cuentas = 0; renderCuentas(); }
      if (target.id === 'dash-search-ventas' || target.id === 'dash-search-entregas') { renderDashboard(); }
    });
    const dashCont = document.getElementById('dashboard-contenido');
    if (dashCont) {
      const obs = new MutationObserver(() => {
        document.querySelectorAll('.dash-search').forEach(updateVisibility);
      });
      obs.observe(dashCont, { childList: true, subtree: true });
    }
  }

  /* ---------- PAGINACIÓN ---------- */
  const PAGE_SIZE = 15;
  let paginationState = { orders: 0, compras: 0, liquidaciones: 0, historial: 0, cuentas: 0 };

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
  const ordenTablas = { liquidaciones: { campo: 'fecha', dir: -1 } };

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
    fecha:    { val: v => fechaHoraVentaParaOrden(v), tipo: 'fecha' },
    vendedor: { val: v => (v.vendedor || '').toLowerCase(), tipo: 'text' },
    cliente:  { val: v => (v.cliente_nombre || '').toLowerCase(), tipo: 'text' },
    cantidad: { val: v => Number(v.cantidad) || 1, tipo: 'num' },
    venta:    { val: v => precioTotalVenta(v), tipo: 'num' },
    abono:    { val: v => abonoClienteTotal(v), tipo: 'num' },
    saldo:    { val: v => precioTotalVenta(v) - abonoClienteTotal(v), tipo: 'num' },
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
      costo:    { val: c => ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + costoTotalVenta(v), 0), tipo: 'num' },
      aportado: { val: c => {
        const ap = compraAportesCache.filter(a => a.compra_id === c.id).reduce((s, a) => s + (Number(a.monto) || 0), 0);
        const ab = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
        return Math.max(ap, ab);
      }, tipo: 'num' },
      saldo:    { val: c => {
        const costo = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + costoTotalVenta(v), 0);
        const ap = compraAportesCache.filter(a => a.compra_id === c.id).reduce((s, a) => s + (Number(a.monto) || 0), 0);
        const ab = ventasCache.filter(v => v.compra_id === c.id).reduce((s, v) => s + (Number(v.abono_yesenia) || 0), 0);
        return costo - Math.max(ap, ab);
      }, tipo: 'num' }
    } },
    liquidaciones: { render: renderLiquidaciones, campos: {
      fecha:   { val: l => l.fecha ? l.fecha + ' ' + (l.hora || '00:00') : '', tipo: 'fecha' },
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
    } },
    cuentas: { render: renderCuentas, campos: {
      cliente: { val: r => (r.cliente || '').toLowerCase(), tipo: 'text' },
      vendedor:{ val: r => (r.vendedores || '').toLowerCase(), tipo: 'text' },
      pedidos: { val: r => r.pedidos.length, tipo: 'num' },
      camisas: { val: r => r.camisas, tipo: 'num' },
      vendido: { val: r => r.vendido, tipo: 'num' },
      abono:   { val: r => r.abono, tipo: 'num' },
      saldo:   { val: r => r.saldo, tipo: 'num' }
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
    else if (clave === 'cuentas') paginationState.cuentas = 0;
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
  let dashFiltroVentas = '';
  let dashFiltroEntregas = '';
  let seccionActual = 'dashboard';


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

  // Días enteros entre hoy (Colombia) y una fecha YYYY-MM-DD. Positivo = han pasado N días.
  function diasTranscurridos(fechaStr) {
    if (!fechaStr || !String(fechaStr).trim()) return null;
    const hoy = new Date(hoyColombia() + 'T00:00:00');
    const f = new Date(String(fechaStr).slice(0, 10) + 'T00:00:00');
    if (isNaN(f.getTime())) return null;
    return Math.round((hoy - f) / 86400000);
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

  /* =====================================================
     PER-CAMISA: precio, costo, abono y estado
     Cada camisa de un pedido puede tener SU PROPIO precio de venta,
     costo con Yesenia, abono y estado. Estos helpers son la única
     fuente de verdad del dinero: usan el dato de la camisa si existe
     y si no (pedidos viejos) caen al valor del pedido.
     ===================================================== */
  const ORDEN_ESTADOS = ['Pedido', 'Comprado', 'Bordando', 'Listo para entrega', 'Entregado', 'Liquidado'];

  // Items crudos del jsonb (o null si no hay / no se leen).
  function itemsCrudosVenta(v) {
    if (v && v.items_camisa) {
      try {
        const p = JSON.parse(v.items_camisa);
        if (Array.isArray(p) && p.length) return p;
      } catch (e) { /* venta sin items legibles */ }
    }
    return null;
  }

  // Precio/costo de una camisa: el de la camisa si existe, si no el del pedido.
  function precioDeItem(it, v) { return (it.precio != null && it.precio !== '') ? (Number(it.precio) || 0) : (Number(v.precio_unitario) || 0); }
  function costoDeItem(it, v) { return (it.costo != null && it.costo !== '') ? (Number(it.costo) || 0) : (Number(v.costo_unitario) || 0); }

  // Totales de un pedido sumando camisa por camisa (respaldo = fórmula vieja).
  function precioTotalVenta(v) {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) return (Number(v.precio_unitario) || 0) * (Number(v.cantidad) || 1);
    return crudos.reduce((s, it) => s + precioDeItem(it, v), 0);
  }

  function costoTotalVenta(v) {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) return (Number(v.costo_unitario) || 0) * (Number(v.cantidad) || 1);
    return crudos.reduce((s, it) => s + costoDeItem(it, v), 0);
  }

  function abonoClienteTotal(v) {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) return Number(v.abono) || 0;
    const total = crudos.reduce((s, it) => s + (Number(it.abono) || 0), 0);
    return total || (Number(v.abono) || 0);
  }

  // Estado de cada camisa (las camisas viejas heredan el estado del pedido).
  function estadosItemsVenta(v) {
    const crudos = itemsCrudosVenta(v);
    const ePedido = normalizarEstado(v.estado) || 'Pedido';
    if (!crudos) return [ePedido];
    return crudos.length ? crudos.map(it => normalizarEstado(it.estado || ePedido)) : [ePedido];
  }

  // Estado "general" del pedido: el común si todas las camisas están igual,
  // o "Mixto" si hay camisas en estados distintos.
  function estadoGeneralVenta(v) {
    const es = estadosItemsVenta(v);
    const primero = es[0];
    if (es.every(e => e === primero)) return primero || 'Pedido';
    return 'Mixto';
  }

  function estadosTodosLiquidado(v) {
    return estadosItemsVenta(v).every(e => e === 'Liquidado');
  }

  // Todas las camisas ya fueron entregadas (o liquidadas): se puede liquidar el pedido.
  function todosItemsListosEntrega(v) {
    return estadosItemsVenta(v).every(e => e === 'Entregado' || e === 'Liquidado');
  }

  // Camisas de un pedido que aún faltan por comprar (estado Pedido).
  function itemsPedidoComprar(v) {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) return normalizarEstado(v.estado) === 'Pedido' ? (Number(v.cantidad) || 1) : 0;
    const ePedido = normalizarEstado(v.estado) || 'Pedido';
    return crudos.filter(it => normalizarEstado(it.estado || ePedido) === 'Pedido').length;
  }

  function badgeEstadoItem(estado) {
    const e = normalizarEstado(estado) || 'Pedido';
    return `<span class="badge-estado ${claseEstado(e)}" style="font-size:9.5px;padding:1px 6px;">${escSimple(e)}</span>`;
  }

  function badgeEstadoGeneral(v) {
    const eg = estadoGeneralVenta(v);
    return `<span class="badge-estado ${claseEstado(eg)}" style="${eg === 'Mixto' ? 'color:var(--warn);font-weight:800;' : ''}">${escSimple(eg === 'Mixto' ? 'Mixto ⚠️' : eg)}</span>`;
  }

  // Estado "principal" del pedido para la columna de Estado: el más atrasado
  // (el que se persistiría). Así el dropdown siempre muestra un estado real.
  function estadoResumenVenta(v) {
    const es = estadosItemsVenta(v);
    return es.slice().sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b))[0] || 'Pedido';
  }

  // Cuenta compacta por estado: badge + ×n, ordenada por el orden natural.
  function estadosCuentasHtml(v) {
    const es = estadosItemsVenta(v);
    const dist = [];
    ORDEN_ESTADOS.forEach(e => {
      const n = es.filter(x => x === e).length;
      if (n > 0) dist.push(`${badgeEstadoItem(e)} <b style="color:var(--text);">×${n}</b>`);
    });
    return `<span style="display:block;font-size:10px;color:var(--thread);margin-top:4px;line-height:1.7;">${dist.join(' ')}</span>`;
  }

  // Costo sugerido a proveedor (Yesenia) según versión y talla.
  // v1: $30.000 en S..XL · 2XL +$2.000 · 3XL +$4.000 · 4XL +$6.000
  // v2: +$1.000 sobre la v1 (31.000 en S..XL, 33.000 en 2XL, 35.000 en 3XL, 37.000 en 4XL).
  const EXTRA_TALLAS_COSTO = { '2XL': 2000, '3XL': 4000, '4XL': 6000 };
  function costoProveedorSugerido(modelo, talla) {
    const base = normalizarModelo(modelo) === 'Nuevo' ? 31000 : 30000;
    return base + (EXTRA_TALLAS_COSTO[String(talla || '').trim()] || 0);
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

  function horaDeVenta(v) {
    const ts = (v && (v.updated_at || v.created_at)) || '';
    if (ts) {
      try {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
        }
      } catch (e) { /* sin hora */ }
    }
    return '';
  }

  function fechaHoraVentaParaOrden(v) {
    const ts = (v && (v.updated_at || v.created_at)) || '';
    if (ts) {
      try {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().slice(0, 16).replace('T', ' ');
          return (v.fecha || '') + ' ' + iso;
        }
      } catch (e) {}
    }
    return (v.fecha || '') + ' ' + (horaDeVenta(v) || '');
  }

  function formatearCompradoAt(v) {
    const ts = v && v.comprado_at;
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      const fecha = d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short' });
      const hora = d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
      return `${fecha} · ${hora}`;
    } catch (e) { return ''; }
  }

  // Ordena pedidos por fecha de entrega (ascendente). Los que no tienen fecha
  // ("Pendiente por definir") siempre quedan al final. Desempate: fecha de pedido.
  function ordenarPorEntrega(a, b) {
    const fa = a.fecha_entrega || '9999-12-31';
    const fb = b.fecha_entrega || '9999-12-31';
    if (fa !== fb) return fa < fb ? -1 : 1;
    const ea = (a.entrega_por || '').toLowerCase();
    const eb = (b.entrega_por || '').toLowerCase();
    if (ea !== eb) return ea < eb ? -1 : 1;
    const ca = (a.cliente_nombre || '').toLowerCase().trim();
    const cb = (b.cliente_nombre || '').toLowerCase().trim();
    if (ca !== cb) return ca < cb ? -1 : 1;
    const pa = a.fecha || '9999-12-31';
    const pb = b.fecha || '9999-12-31';
    if (pa !== pb) return pa < pb ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  }

  // Pedidos que aún NO se han comprado en la distribuidora:
  // activos, sin compra asociada y con al menos una camisa en estado Pedido.
  function pedidosPorComprar() {
    return ventasCache.filter(v =>
      !v.finalizado && !v.compra_id && itemsPedidoComprar(v) > 0
    );
  }

  function camisasPorComprar() {
    return pedidosPorComprar().reduce((s, v) => s + itemsPedidoComprar(v), 0);
  }

  function pedidosSinFechaEntrega() {
    return ventasCache.filter(v => !v.finalizado && !v.fecha_entrega);
  }

  /* ---------- Liquidación entre socios por pedido ---------- */
  function mitadGananciaPedido(v) {
    return Math.max((precioTotalVenta(v) - costoTotalVenta(v)) / 2, 0);
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
    const saldoCliente = Math.max(precioTotalVenta(v) - abonoClienteTotal(v), 0);
    if (saldoCliente > 1) {
      faltas.push(`Falta cobrar ${fmt(saldoCliente)} al cliente — revisa si ya terminó de abonar antes de liquidar.`);
    }
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
    if (!v || v.finalizado) return;
    if (!puedeMarcarPagado(v).ok) return;
    if (!todosItemsListosEntrega(v) && !estadosTodosLiquidado(v)) return;
    try {
      const payload = {};
      const crudos = itemsCrudosVenta(v);
      const necesitaLiquidado = !estadosTodosLiquidado(v);
      if (necesitaLiquidado) {
        payload.estado = 'Liquidado';
        if (crudos) {
          crudos.forEach(it => { it.estado = 'Liquidado'; });
          payload.items_camisa = JSON.stringify(crudos);
        }
      }
      payload.finalizado = true;
      payload.updated_at = new Date().toISOString();
      let resFin = await supabaseClient.from('ventas').update(payload).eq('id', v.id);
      if (resFin.error && String(resFin.error.message).toLowerCase().includes('updated_at')) {
        delete payload.updated_at;
        resFin = await supabaseClient.from('ventas').update(payload).eq('id', v.id);
        if (resFin.error) throw resFin.error;
      } else if (resFin.error) throw resFin.error;
      await loadVentas();
      mostrarToast('✅ Pedido liquidado y finalizado automáticamente → Historial.');
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
        return `<option value="${v.id}" data-saldo="${saldo}">${escSimple(v.cliente_nombre || 'Cliente')} - ${escSimple(v.fecha || '?')} - pendiente ${fmt(saldo)}</option>`;
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
        const estadosUnicos = [...new Set(g.ventas.map(v => estadoGeneralVenta(v)).filter(Boolean))];
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

      document.getElementById('f-fecha-entrega-pendiente').addEventListener('change', onFechaEntregaPendienteChange);
      document.getElementById('f-lugar-entrega').addEventListener('change', actualizarLugarOtro);

      // Contador de camisas del pedido: + agrega una fila, − quita la última.
      document.getElementById('camisa-mas').addEventListener('click', agregarCamisa);
      document.getElementById('camisa-menos').addEventListener('click', restarCamisa);

      // Modal de abono del cliente
      document.getElementById('abono-guardar').addEventListener('click', () => addAbono());
      document.getElementById('buscador-input').addEventListener('input', buscarEnBuscador);
      document.getElementById('confirm-si').addEventListener('click', () => resolverConfirm(true));
      document.getElementById('confirm-no').addEventListener('click', () => resolverConfirm(false));
      document.getElementById('abono-monto').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addAbono(); }
      });
      document.getElementById('abono-rapidos').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const inp = document.getElementById('abono-monto');
        const saldo = Number(inp.dataset.saldo) || 0;
        inp.value = chip.dataset.monto === 'saldo' ? (saldo > 0 ? saldo : '') : chip.dataset.monto;
        inp.focus();
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
      document.getElementById('filter-vendedor').addEventListener('change', renderTable);
      document.getElementById('filter-estado').addEventListener('change', renderTable);
       document.getElementById('filter-search').addEventListener('input', debounce(() => { paginationState.orders = 0; renderTable(); }, 300));
      const fh = document.getElementById('filter-historial-search'); if (fh) fh.addEventListener('input', debounce(() => { paginationState.historial = 0; renderHistorial(); }, 300));
      const fc = document.getElementById('filter-compras-search'); if (fc) fc.addEventListener('input', debounce(() => { paginationState.compras = 0; renderCompras(); }, 300));
      const fl = document.getElementById('filter-liquidaciones-search'); if (fl) fl.addEventListener('input', debounce(() => { paginationState.liquidaciones = 0; renderLiquidaciones(); }, 300));
      const fu = document.getElementById('filter-usuarios-search'); if (fu) fu.addEventListener('input', debounce(() => { renderUsuariosTable(); }, 300));
      const fcu = document.getElementById('filter-cuentas-search'); if (fcu) fcu.addEventListener('input', debounce(() => { paginationState.cuentas = 0; renderCuentas(); }, 300));
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

      initSearchClears();

      await checkSession();
   });


  /* =====================================================
     SINCRONIZACIÓN ENTRE DISPOSITIVOS
     Valentina puede guardar desde el teléfono mientras Samir
     mira el computador. Se resuelve en 3 capas:
       1. Realtime de Supabase: aviso instantáneo.
       2. Al volver a la pestaña: refresco (cubre cambiar de dispositivo).
       3. Sondeo cada 60 s: red de seguridad si Realtime se cae.
     Regla de oro: si el usuario está escribiendo o tiene un modal
     abierto, NO se le refresca nada — solo se le avisa.
     ===================================================== */
  const TABLAS_SINCRONIZADAS = ['ventas', 'compras_proveedor', 'compra_aportes', 'liquidaciones'];
  const INTERVALO_SONDEO_MS = 30000;
  let canalSync = null;
  let temporizadorSync = null;
  let pendientesSync = false;
  let syncEnVuelo = false;
  let ultimaEntradaUsuario = 0;

  // ¿Está el usuario a mitad de algo? Si sí, jamás se le refresca.
  // OJO: hay que mirar la SECCIÓN, no #form-card. #form-card nunca lleva la
  // clase hidden en el HTML (solo se la pone closeForm), así que consultarla
  // daba true siempre y, con un cliente ya escrito en el campo, bloqueaba la
  // sincronización para siempre. La visibilidad real la controla la sección.
  function usuarioOcupado() {
    const seccion = document.getElementById('section-new-sale');
    const enFormulario = seccion && !seccion.classList.contains('hidden');
    if (enFormulario) {
      if (editingId) return true;                      // editando un pedido existente
      if ((document.getElementById('f-cliente')?.value || '').trim()) return true;  // pedido nuevo ya empezado
    }
    if (document.querySelector('.modal-backdrop:not(.hidden)')) return true;
    if (document.querySelector('.sidebar-backdrop.show')) return true;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) {
      // cualquier campo con el foco cuenta como "escribiendo", con 4 s de gracia
      if (Date.now() - ultimaEntradaUsuario < 4000) return true;
    }
    return false;
  }

  function mostrarAvisoSync() {
    let aviso = document.getElementById('sync-aviso');
    if (!aviso) {
      aviso = document.createElement('button');
      aviso.id = 'sync-aviso';
      aviso.type = 'button';
      aviso.addEventListener('click', () => aplicarCambiosExternos(true));
      document.body.appendChild(aviso);
    }
    aviso.innerHTML = '🔔 Hay cambios de otro dispositivo <b>· Verlos</b>';
    aviso.classList.remove('hidden');
    clearTimeout(aviso._t);
    // A los 10 s se oculta solo. Si el usuario ya está libre, se aplica.
    aviso._t = setTimeout(() => {
      if (usuarioOcupado()) aviso.classList.add('hidden');
      else aplicarCambiosExternos(true);
    }, 10000);
  }

  function ocultarAvisoSync() {
    const aviso = document.getElementById('sync-aviso');
    if (aviso) { clearTimeout(aviso._t); aviso.classList.add('hidden'); }
  }

  async function aplicarCambiosExternos(silencioso) {
    if (!currentUser) return;
    // Si ya hay una sincronización en marcha, no se pierde este cambio:
    // se marca para repetir al terminar.
    if (syncEnVuelo) { pendientesSync = true; return; }
    syncEnVuelo = true;
    pendientesSync = false;
    ocultarAvisoSync();
    try {
      await loadVentas();          // ya re-renderiza dashboard, pedidos, historial y compras
      await loadLiquidaciones();
      await loadCuentasSilencioso();
      renderResumenesSiVisible();
      console.info('[sync] datos actualizados' + (silencioso ? ' (silencioso)' : ''));
      if (!silencioso) mostrarToast('🔔 Actualizado con cambios de otro dispositivo.', 'info');
    } catch (e) {
      logError('aplicarCambiosExternos', e);
    } finally {
      syncEnVuelo = false;
      // Llegó otro cambio mientras corría esta: se aplica ahora.
      if (pendientesSync && !usuarioOcupado()) {
        pendientesSync = false;
        setTimeout(() => aplicarCambiosExternos(true), 400);
      }
    }
  }

  async function loadCuentasSilencioso() {
    if (seccionActual === 'cuentas') {
      try { renderCuentas(); } catch (e) { logError('sync:renderCuentas', e); }
    }
  }

  function renderResumenesSiVisible() {
    if (seccionActual !== 'summaries') return;
    try { renderResumenes(); } catch (e) { logError('sync:renderResumenes', e); }
  }

  // Llega un cambio por Realtime.
  function marcarCambioPendiente() {
    if (!currentUser) return;
    pendientesSync = true;
    if (usuarioOcupado()) { mostrarAvisoSync(); return; }
    aplicarCambiosExternos(true);
  }

  // Firma barata del estado: solo id + updated_at. Si cambia, hay algo nuevo.
  // OJO: hay que aplicar el MISMO filtro que loadVentas (quitar eliminados).
  // Sin eso, la fila de la papelera estaba en la firma pero no en el cache y
  // la app detectaba "cambios" eternamente, recargando sin parar.
  async function detectarCambios() {
    if (!currentUser || syncEnVuelo) return;
    try {
      const { data, error } = await supabaseClient
        .from('ventas').select('id, updated_at, created_at, finalizado, abono, abono_yesenia, eliminado_at');
      if (error) return;
      const firmaDe = lista => (lista || [])
        .filter(v => !v.eliminado_at)
        .map(r => `${r.id}.${r.updated_at || r.created_at || ''}.${r.finalizado ? 1 : 0}.${r.abono || 0}.${r.abono_yesenia || 0}`)
        .sort().join('|');
      if (firmaDe(data) !== firmaDe(ventasCache)) marcarCambioPendiente();
    } catch (e) { /* silencioso: el sondeo es opcional */ }
  }

  function iniciarSync() {
    detenerSync();
    try {
      canalSync = supabaseClient.channel('sync-camisas-iub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, marcarCambioPendiente)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'compras_proveedor' }, marcarCambioPendiente)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'compra_aportes' }, marcarCambioPendiente)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'liquidaciones' }, marcarCambioPendiente)
        .subscribe();
    } catch (e) { logError('iniciarSync', e); canalSync = null; }
    temporizadorSync = setInterval(detectarCambios, INTERVALO_SONDEO_MS);
  }

  function detenerSync() {
    if (canalSync) { try { supabaseClient.removeChannel(canalSync); } catch (e) {} canalSync = null; }
    if (temporizadorSync) { clearInterval(temporizadorSync); temporizadorSync = null; }
    pendientesSync = false;
    ocultarAvisoSync();
  }

  // Capa 2: al volver a la pestaña o al cambiar de dispositivo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser && !usuarioOcupado()) {
      detectarCambios();
    }
  });
  window.addEventListener('focus', () => {
    if (currentUser && !usuarioOcupado()) detectarCambios();
  });
  // Marca "está escribiendo" para que la sincronización no lo interrumpa.
  document.addEventListener('input', () => { ultimaEntradaUsuario = Date.now(); }, true);

  /* =====================================================
     BUSCADOR GLOBAL (Ctrl+K / Cmd+K)
     Escribe 2 letras y encuentra clientes, pedidos y secciones,
     desde cualquier pantalla. No reemplaza los buscadores propios
     de cada tabla: es un atajo para llegar rápido.
     ===================================================== */
  const SECCIONES_BUSCADOR = [
    { id: 'dashboard', ico: '🏠', txt: 'Inicio' },
    { id: 'new-sale',  ico: '➕', txt: 'Nueva venta' },
    { id: 'orders',    ico: '📋', txt: 'Pedidos' },
    { id: 'cuentas',   ico: '💳', txt: 'Cuentas por cliente' },
    { id: 'history',   ico: '📚', txt: 'Historial' },
    { id: 'purchases', ico: '🧵', txt: 'Abonos Yesenia' },
    { id: 'settlements', ico: '💰', txt: 'Liquidaciones' },
    { id: 'summaries', ico: '📊', txt: 'Resúmenes' },
    { id: 'reports',   ico: '📈', txt: 'Reportes' },
    { id: 'settings',  ico: '⚙️', txt: 'Configuración', soloAdmin: true }
  ];

  let busItems = [];
  let busActivo = 0;

  function normalizarBus(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function resultadosBuscador(q) {
    const nq = normalizarBus(q);
    const salida = [];

    // Pedidos (solo los que le tocan al usuario)
    if (nq.length >= 2) {
      ventasCache
        .filter(v => (currentRole.role === 'admin' || !currentRole.vendedor) || v.vendedor === currentRole.vendedor)
        .forEach(v => {
          const campos = [v.cliente_nombre, v.cliente_telefono, v.cliente_programa, v.lugar_entrega]
            .map(normalizarBus).join(' ');
          if (!campos.includes(nq)) return;
          const precio = precioTotalVenta(v);
          const saldo = precio - abonoClienteTotal(v);
          salida.push({
            grupo: 'Pedidos',
            ico: '📋',
            titulo: v.cliente_nombre || 'Sin nombre',
            sub: [v.cliente_telefono, formatearFechaHumana(v.fecha), estadoGeneralVenta(v)].filter(Boolean).join(' · '),
            dato: saldo > 0 ? `debe ${fmt(saldo)}` : 'al día',
            color: saldo > 0 ? 'var(--warn)' : 'var(--ok)',
            accion: () => { cerrarBuscador(); irAPedido(v.id); }
          });
        });
    }

    // Secciones
    SECCIONES_BUSCADOR
      .filter(s => (!s.soloAdmin || currentRole.role === 'admin') &&
                   (!nq || normalizarBus(s.txt).includes(nq)))
      .forEach(s => salida.push({
        grupo: 'Ir a', ico: s.ico, titulo: s.txt, sub: '', dato: '',
        accion: () => { cerrarBuscador(); navigateTo(s.id); }
      }));

    return salida;
  }

  function pintarBuscador() {
    const cont = document.getElementById('buscador-resultados');
    if (!busItems.length) {
      cont.innerHTML = `<div class="buscador-vacio">Sin resultados. Escribe el nombre o teléfono de un cliente.</div>`;
      return;
    }
    let html = '';
    let grupoActual = null;
    busItems.forEach((it, i) => {
      if (it.grupo !== grupoActual) { grupoActual = it.grupo; html += `<div class="buscador-grupo">${escSimple(it.grupo)}</div>`; }
      html += `<button type="button" class="buscador-item${i === busActivo ? ' activo' : ''}" data-i="${i}">
        <span class="buscador-item-ico">${it.ico}</span>
        <span class="buscador-item-txt">
          <span class="buscador-item-titulo">${escSimple(it.titulo)}</span>
          ${it.sub ? `<span class="buscador-item-sub">${escSimple(it.sub)}</span>` : ''}
        </span>
        ${it.dato ? `<span class="buscador-item-dato" style="color:${it.color || 'var(--muted)'};">${escSimple(it.dato)}</span>` : ''}
      </button>`;
    });
    cont.innerHTML = html;
    cont.querySelectorAll('.buscador-item').forEach(b => {
      b.addEventListener('click', () => { const it = busItems[Number(b.dataset.i)]; if (it) it.accion(); });
      b.addEventListener('mouseenter', () => { busActivo = Number(b.dataset.i); pintarBuscador(); });
    });
  }

  function buscarEnBuscador() {
    const q = document.getElementById('buscador-input').value;
    busItems = resultadosBuscador(q);
    busActivo = 0;
    pintarBuscador();
  }

  function abrirBuscador() {
    if (!currentUser) return;
    const inp = document.getElementById('buscador-input');
    inp.value = '';
    busItems = []; busActivo = 0;
    document.getElementById('buscador-global').classList.remove('hidden');
    bloquearScrollFondo();
    buscarEnBuscador();
    setTimeout(() => inp.focus(), 50);
  }

  function cerrarBuscador() {
    document.getElementById('buscador-global').classList.add('hidden');
    desbloquearScrollFondo();
  }

  // Abre el pedido en la sección correcta y lo deja resaltado un instante.
  function irAPedido(id) {
    navigateTo('orders');
    setTimeout(() => {
      const fila = document.querySelector(`#ventas-body tr[data-id="${id}"]`);
      if (fila) {
        fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fila.classList.add('buscador-resaltada');
        setTimeout(() => fila.classList.remove('buscador-resaltada'), 2200);
      }
    }, 120);
  }

  document.addEventListener('keydown', (e) => {
    const abierto = !document.getElementById('buscador-global').classList.contains('hidden');

    // Ctrl+K / Cmd+K abre y alterna
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      abierto ? cerrarBuscador() : abrirBuscador();
      return;
    }
    if (!abierto) return;

    if (e.key === 'Escape') { e.preventDefault(); cerrarBuscador(); return; }
    if (e.key === 'ArrowDown' && busItems.length) {
      e.preventDefault(); busActivo = (busActivo + 1) % busItems.length; pintarBuscador(); return;
    }
    if (e.key === 'ArrowUp' && busItems.length) {
      e.preventDefault(); busActivo = (busActivo - 1 + busItems.length) % busItems.length; pintarBuscador(); return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const it = busItems[busActivo];
      if (it) it.accion();
    }
  });

  /* =====================================================
     CONFIRMACIÓN Y PAPELERA (borrado lógico)
     Un window.confirm() se pasa con Enter sin querer. Este modal
     muestra QUÉ se va a borrar y por defecto el foco está en
     "Cancelar". Además los pedidos no se borran de verdad: se
     marcan con eliminado_at y hay una papelera para recuperarlos.
     Si la columna eliminado_at no existe en Supabase, la app cae
     sola al borrado de siempre (y avisa una vez).
     ===================================================== */
  let confirmaResolver = null;
  let papeleraActiva = true;      // false = la columna no existe, borrado duro

  function confirmarFuerte(opts) {
    return new Promise(resolve => {
      document.getElementById('confirm-titulo').textContent = opts.titulo || 'Confirmar';
      document.getElementById('confirm-texto').textContent = opts.texto || '';
      const det = document.getElementById('confirm-detalle');
      if (opts.detalle) { det.innerHTML = opts.detalle; det.classList.remove('hidden'); }
      else det.classList.add('hidden');
      const btnSi = document.getElementById('confirm-si');
      btnSi.textContent = opts.botonSi || 'Eliminar';
      btnSi.className = 'btn ' + (opts.peligro === false ? 'btn-gold' : 'btn-danger');
      confirmaResolver = resolve;
      document.getElementById('confirm-modal').classList.remove('hidden');
      bloquearScrollFondo();
      setTimeout(() => document.getElementById('confirm-no').focus(), 60);
    });
  }

  function resolverConfirm(ok) {
    document.getElementById('confirm-modal').classList.add('hidden');
    desbloquearScrollFondo();
    const r = confirmaResolver;
    confirmaResolver = null;
    if (r) r(!!ok);
  }

  // ── Papelera ──
  async function loadEliminados() {
    if (!papeleraActiva) return [];
    const { data, error } = await supabaseClient
      .from('ventas').select('*')
      .not('eliminado_at', 'is', null)
      .order('eliminado_at', { ascending: false });
    if (error) { papeleraActiva = false; return []; }
    return data || [];
  }

  async function abrirEliminados() {
    const cont = document.getElementById('eliminados-lista');
    cont.innerHTML = '<div class="buscador-vacio">Cargando...</div>';
    document.getElementById('eliminados-modal').classList.remove('hidden');
    bloquearScrollFondo();
    const lista = await loadEliminados();
    if (!lista.length) {
      cont.innerHTML = papeleraActiva
        ? '<div class="buscador-vacio">No hay pedidos eliminados.</div>'
        : '<div class="buscador-vacio">La papelela no está activa todavía: falta aplicar la migración <code>eliminado_at</code> en Supabase. Mientras tanto los borrados son definitivos.</div>';
      return;
    }
    cont.innerHTML = lista.map(v => `
      <div class="eliminado-fila" data-id="${v.id}">
        <div class="eliminado-txt">
          <b>${escSimple(v.cliente_nombre || 'Sin nombre')}</b>
          <span>${escSimple(v.cliente_telefono || '')} · ${v.fecha ? formatearFechaHumana(v.fecha) : ''} · ${escSimple(v.vendedor || '')}</span>
          <small>Borrado ${v.eliminado_at ? formatearFechaHumana(String(v.eliminado_at).slice(0, 10)) : ''}</small>
        </div>
        <button type="button" class="btn-ghost btn" data-restaurar="${v.id}">↩️ Restaurar</button>
      </div>`).join('');
    cont.querySelectorAll('[data-restaurar]').forEach(b => {
      b.addEventListener('click', () => restaurarVenta(b.dataset.restaurar));
    });
  }

  function cerrarEliminados() {
    document.getElementById('eliminados-modal').classList.add('hidden');
    desbloquearScrollFondo();
  }

  async function restaurarVenta(id) {
    const { error } = await supabaseClient.from('ventas').update({ eliminado_at: null }).eq('id', id);
    if (error) { mostrarToast('No se pudo restaurar: ' + error.message, 'error'); return; }
    mostrarToast('✅ Pedido restaurado.');
    await loadVentas();
    await abrirEliminados();
  }

  async function deleteVenta(id) {
    const v = ventasCache.find(x => x.id === id);
    if (v && v.finalizado && currentRole.role !== 'admin') {
      mostrarToast('Solo el administrador puede borrar pedidos del historial.', 'error');
      return;
    }
    const camisas = (itemsCrudosVenta(v) || []).length || Number(v?.cantidad) || 0;
    const ok = await confirmarFuerte({
      titulo: 'Eliminar pedido',
      texto: papeleraActiva
        ? 'El pedido sale de Pedidos, pero queda guardado en 🗑️ Eliminados y lo puedes recuperar.'
        : '⚠️ Esto borra el pedido definitivamente, sin opción de recuperarlo.',
      detalle: v ? `<b>${escSimple(v.cliente_nombre || 'Sin nombre')}</b>
        <span>${escSimple(v.cliente_telefono || '')} · ${v.fecha ? formatearFechaHumana(v.fecha) : 'sin fecha'} · ${camisas} camisa(s)</span>` : '',
      botonSi: 'Eliminar pedido'
    });
    if (!ok) return;

    try {
      if (papeleraActiva) {
        const res = await supabaseClient.from('ventas')
          .update({ eliminado_at: new Date().toISOString() }).eq('id', id);
        if (res.error) {
          if (/eliminado_at|column/i.test(String(res.error.message))) {
            // La columna no existe: el proyecto no tiene la migración aplicada.
            papeleraActiva = false;
            mostrarToast('La papelera no está activa: el borrado será definitivo.', 'warning');
            await supabaseClient.from('ventas').delete().eq('id', id);
          } else throw res.error;
        }
      } else {
        await supabaseClient.from('ventas').delete().eq('id', id);
      }
      await loadVentas();
      mostrarToast('Pedido eliminado.');
    } catch (err) {
      logError('deleteVenta', err);
      mostrarToast('No se pudo eliminar el pedido.', 'error');
    }
  }

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

    iniciarSync();
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
    detenerSync();
    currentUser = null;
    location.reload();
  }


  /* =====================================================
     NAVEGACIÓN POR SIDEBAR
     ===================================================== */
  function navigateTo(section) {
    const sections = ['dashboard', 'new-sale', 'orders', 'cuentas', 'purchases', 'settlements', 'summaries', 'reports', 'settings', 'history'];
    seccionActual = section;
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
      // Si se entra por el menú (no por openForm) el formulario arranca vacío:
      // hay que dibujar la camisa para que el contador y las filas coincidan.
      if (!document.querySelector('#camisa-items-container .camisa-item-row')) {
        renderCamisaItemsFromData([camisaVacia()]);
      }
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
    } else if (section === 'cuentas') {
      renderCuentas();
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
      const fm = document.getElementById('factura-modal');
      if (fm && !fm.classList.contains('hidden')) { closeFacturaModal(); return; }
      const cm = document.getElementById('compra-modal');
      if (cm && !cm.classList.contains('hidden')) closeCompraModal();
      const lm = document.getElementById('liquidacion-modal');
      if (lm && !lm.classList.contains('hidden')) closeLiquidacionModal();
      const um = document.getElementById('user-modal');
      if (um && !um.classList.contains('hidden')) { closeUserModal(); return; }
      const am = document.getElementById('abono-modal');
      if (am && !am.classList.contains('hidden')) { cerrarModalAbono(); return; }
      const cmod = document.getElementById('confirm-modal');
      if (cmod && !cmod.classList.contains('hidden')) { resolverConfirm(false); return; }
      const el = document.getElementById('eliminados-modal');
      if (el && !el.classList.contains('hidden')) { cerrarEliminados(); return; }
      const bg = document.getElementById('buscador-global');
      if (bg && !bg.classList.contains('hidden')) { cerrarBuscador(); return; }
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
      // Los borrados lógicos no deben aparecer en ninguna pantalla.
      ventasCache = (data || []).filter(v => !v.eliminado_at);

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

    // Filtro de búsqueda del inicio (por cliente, teléfono, @, lugar).
    const _qV = (dashFiltroVentas || '').trim().toLowerCase();
    const _qE = (dashFiltroEntregas || '').trim().toLowerCase();
    const _coincide = (v, q) => {
      if (!q) return true;
      const tel = String(v.cliente_telefono || '').toLowerCase();
      const hay = [
        v.cliente_nombre || '',
        tel,
        claveCliente(v) || '',
        v.lugar_entrega || '',
        v.vendedor || '',
        v.entrega_por || ''
      ].join(' ').toLowerCase();
      return hay.includes(q);
    };
    const misVentasFiltr = _qV ? misVentas.filter(v => _coincide(v, _qV)) : misVentas;
    const misEntregasFiltr = _qE ? misEntregas.filter(v => _coincide(v, _qE)) : misEntregas;

    const porComprar = camisasPorComprar();
    const porComprarPedidos = pedidosPorComprar().length;
    const sinFecha = pedidosSinFechaEntrega().length;
    let totalPorCobrar = 0;
    ventasCache.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v)) return;
      totalPorCobrar += Math.max(precioTotalVenta(v) - abonoClienteTotal(v), 0);
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
      <div class="dash-two-col">
        <div class="dash-list">
          <div class="dash-list-header">
            <h2>🛒 Pedidos que vendí</h2>
            <span class="dash-list-subtitle">Pedidos vendidos por mí, sin importar quién realiza la entrega.</span>
            <span class="dash-list-count">${_qV ? `${misVentasFiltr.length} de ${misVentas.length}` : misVentas.length}</span>
          </div>
          <div class="dash-search-wrap">
            <div class="search-wrap"><input type="text" id="dash-search-ventas" class="dash-search" placeholder="🔍 Buscar cliente, teléfono o @" value="${escSimple(dashFiltroVentas)}" autocomplete="off"><button class="search-clear" data-target="dash-search-ventas" type="button" aria-label="Limpiar búsqueda">×</button></div>
          </div>
          ${misVentasFiltr.length === 0
            ? (_qV ? '<div class="dash-empty">🔍 Sin resultados para esa búsqueda.</div>' : '<div class="dash-empty">🎉 No hay pedidos pendientes.</div>')
            : misVentasFiltr.map(v => renderOrderCard(v)).join('')
          }
        </div>
        <div class="dash-list">
          <div class="dash-list-header">
            <h2>📦 Pedidos que debo entregar</h2>
            <span class="dash-list-subtitle">Pedidos cuya entrega está asignada a mí.</span>
            <span class="dash-list-count">${_qE ? `${misEntregasFiltr.length} de ${misEntregas.length}` : misEntregas.length}</span>
          </div>
          <div class="dash-search-wrap">
            <div class="search-wrap"><input type="text" id="dash-search-entregas" class="dash-search" placeholder="🔍 Buscar cliente, teléfono o @" value="${escSimple(dashFiltroEntregas)}" autocomplete="off"><button class="search-clear" data-target="dash-search-entregas" type="button" aria-label="Limpiar búsqueda">×</button></div>
          </div>
          ${misEntregasFiltr.length === 0
            ? (_qE ? '<div class="dash-empty">🔍 Sin resultados para esa búsqueda.</div>' : '<div class="dash-empty">🎉 No hay entregas asignadas.</div>')
            : misEntregasFiltr.map(v => renderOrderCard(v)).join('')
          }
        </div>
      </div>
    `;

    calcularAlertas();

    // Buscadores del inicio (pequeñitos, no desordenan): filtran por cliente/tel/@/lugar.
    setTimeout(() => {
      const iv = document.getElementById('dash-search-ventas');
      const ie = document.getElementById('dash-search-entregas');
      if (iv) iv.addEventListener('input', e => {
        dashFiltroVentas = e.target.value;
        const pos = e.target.selectionStart;
        renderDashboard();
        setTimeout(() => {
          const n = document.getElementById('dash-search-ventas');
          if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} }
        }, 0);
      });
      if (ie) ie.addEventListener('input', e => {
        dashFiltroEntregas = e.target.value;
        const pos = e.target.selectionStart;
        renderDashboard();
        setTimeout(() => {
          const n = document.getElementById('dash-search-entregas');
          if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} }
        }, 0);
      });
    }, 0);
  }

  function itemsParaDashboard(v) {
    let items = null;
    if (v.items_camisa) {
      try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [`• ${escSimple(v.genero || '?')} · ${escSimple(capitalizarColor(v.color))} · ${escSimple(v.talla || '?')}`];
    }
    return items.map(it => {
      const base = `${escSimple(it.genero || '?')} · ${escSimple(capitalizarColor(it.color))} · ${escSimple(it.talla || '?')}`;
      let linea = it.programa ? `• ${base} · ${escSimple(it.programa)}` : `• ${base}`;
      const e = it.estado ? normalizarEstado(it.estado) : null;
      if (e && e !== 'Pedido') linea += ` — ${e}`;
      return linea;
    });
  }

  // Detalle de camisas para la tabla de Pedidos/Historial: por camisa muestra
  // género/color/talla, su precio→costo (si la camisa tiene) y su estado propio.
  function itemsDetalleHtml(v) {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) {
      return `<div style="font-size:12px; line-height:1.6;">${itemsParaDashboard(v).join('<br>')}</div>`;
    }
    const mostrarPrecios = crudos.some(it => (it.precio != null && it.precio !== '') || (it.costo != null && it.costo !== ''));
    return `<div style="font-size:12px; line-height:1.7;">` + crudos.map(it => {
      const base = `${it.genero || '?'} · ${capitalizarColor(it.color)} · ${it.talla || '?'}`;
      const progr = it.programa ? ` · <span style="color:var(--thread);">${escSimple(it.programa)}</span>` : '';
      const prec = mostrarPrecios ? ` · <span class="money" style="font-size:11px;">${fmt(precioDeItem(it, v))}/${fmt(costoDeItem(it, v))}</span>` : '';
      const e = it.estado ? normalizarEstado(it.estado) : null;
      const bd = e ? ` ${badgeEstadoItem(e)}` : '';
      return `<div>• ${base}${progr}${prec}${bd}</div>`;
    }).join('') + `</div>`;
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
    const precio = precioTotalVenta(v);
    const abono = abonoClienteTotal(v);
    const saldo = precio - abono;
    const items = itemsParaDashboard(v);
    const telefonoCrudo = String(v.cliente_telefono || '').trim();
    const telefonoLimpio = telefonoCrudo.replace(/\D/g, '');
    const waLink = telefonoLimpio ? `https://wa.me/57${telefonoLimpio}` : '';
    const waUsuario = (!telefonoLimpio && esUsuarioWhatsApp(telefonoCrudo)) ? argOnClick(telefonoCrudo) : '';
    const detalleWhatsApp = items.map(it => it.replace(/^• /, '').replace(/\s—\s.+$/, '').trim()).join('\n     ');
    const msgWhatsApp = encodeURIComponent(
      `📌 *Recordatorio Camisas IUB* 🧵\n\n👤 *Cliente:* ${v.cliente_nombre}\n📞 *Teléfono:* ${v.cliente_telefono}\n👕 *Detalle:* \n     ${detalleWhatsApp}\n🔢 *Cantidad:* ${cant}\n💰 *Saldo Pendiente:* ${fmt(saldo)}\n*Fecha Entrega:* ${textoFechaEntrega(v)}\n📍 *Lugar:* ${v.lugar_entrega || 'Sin definir'}`
    );
    const fechaEntregaDisplay = v.fecha_entrega ? `📅 ${textoFechaEntrega(v)}` : '⏳ Pendiente por definir';

    return `
      <div class="order-card">
        <div class="order-card-row order-card-meta">
          <span class="order-card-date">${fechaEntregaDisplay}</span>
          <span class="order-card-entrega">📍 Entrega: ${v.lugar_entrega ? escSimple(v.lugar_entrega) : 'Por definir'}, ${v.entrega_por ? escSimple(v.entrega_por) : 'Sin asignar'}</span>
          <span class="order-card-vendedor">Vendedor: ${escSimple(v.vendedor || '')}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-client">👤 ${escSimple(v.cliente_nombre || '—')}</span>
          <span class="order-card-phone">📞 ${escSimple(v.cliente_telefono || '—')}${waLink ? ` · <a href="${waLink}" target="_blank" style="color:var(--ok);font-weight:600;text-decoration:none;">WhatsApp</a>` : (waUsuario ? ` · <a href="#" onclick="copiarUsuarioWhatsApp('${waUsuario}');return false;" style="color:var(--ok);font-weight:600;text-decoration:none;">Copiar @</a>` : '')}</span>
          <span class="order-card-saldo" style="color:${saldo > 0 ? 'var(--warn)' : 'var(--ok)'}">💰 ${fmt(saldo)}</span>
        </div>
        <div class="order-card-row">
          <span class="badge-estado ${claseEstado(v.estado)}">${escSimple(normalizarEstado(v.estado))}</span>
          ${badgeModeloVenta(v)}
        </div>
        <hr class="order-card-divider">
        <div class="order-card-items">
          ${items.map(it => `<div class="order-card-item">${it}</div>`).join('')}
        </div>
        <div class="order-card-footer">
          <button class="btn-copy-card" onclick="copiarWhatsApp('${argOnClick(msgWhatsApp)}')" type="button">📋 Copiar para WhatsApp</button>
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

  // Recibo imprimible de un pedido (ventana de impresión autocontenida).
  function imprimirRecibo(ventaId) {
    const venta = ventasCache.find(v => String(v.id) === String(ventaId));
    if (!venta) {
      mostrarToast('No se encontró el pedido.', 'error');
      return;
    }

    const crudos = itemsCrudosVenta(venta);
    const items = crudos && crudos.length
      ? crudos
      : [{
          genero: venta.genero || '?',
          color: venta.color || '?',
          talla: venta.talla || '?',
          precio: Number(venta.precio_unitario) || 0,
          costo: Number(venta.costo_unitario) || 0,
          abono: Number(venta.abono) || 0
        }];

    const filas = items.map((it, i) => {
      const precio = precioDeItem(it, venta);
      const abono = (it.abono != null && it.abono !== '') ? (Number(it.abono) || 0) : 0;
      const modeloTxt = (typeof etiquetaModelo === 'function' ? etiquetaModelo(it.modelo) : (it.modelo || '')) || '';
      const desc = [capitalizarColor(it.color), it.talla ? `Talla ${it.talla}` : '', it.genero || '', modeloTxt].filter(Boolean).join(' · ');
      const prog = it.programa ? `<div class="prog">Bordado: ${escSimple(it.programa)}</div>` : '';
      return `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escSimple(desc)}${prog}</td>
          <td class="c">1</td>
          <td class="money">${fmt(precio)}</td>
          <td class="money">${fmt(abono)}</td>
        </tr>`;
    }).join('');

    const total = precioTotalVenta(venta);
    const abonoTotal = abonoClienteTotal(venta);
    const saldo = total - abonoTotal;
    const fechaEntrega = textoFechaEntrega(venta);
    const programaTexto = items.filter(it => it.programa).map(it => escSimple(it.programa)).join(', ');

    // Plantilla recibo v2 — lista para ajustar con Samir (colores, logo, textos)
    const fechaPedidoTxt = formatearFechaHumana(venta.fecha);
    const saldoPos = Math.max(saldo, 0);
    const estadoPill = stateText(venta);
    const notaTxt = (venta.nota || '').trim();
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recibo #${escSimple(String(venta.id).slice(-6).toUpperCase())} — ${escSimple(venta.cliente_nombre || 'Pedido')}</title>
<style>
  :root{--ink:#0F172A;--muted:#64748B;--line:#E2E8F0;--bg:#F8FAFC;--gold:#B45309}
  *{box-sizing:border-box}
  body{font-family:Inter, Segoe UI, Arial, Helvetica, sans-serif; color:var(--ink); margin:0; background:#fff; font-size:13px; line-height:1.45}
  .sheet{max-width:780px; margin:0 auto; padding:24px}
  .toolbar{display:flex; gap:8px; justify-content:flex-end; margin-bottom:14px}
  .btn{padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:#fff; cursor:pointer; font-weight:700; font-size:12px}
  .btn-primary{background:var(--ink); color:#fff; border-color:var(--ink)}
  .brand{display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:3px solid var(--ink); padding-bottom:14px; margin-bottom:16px}
  .brand h1{margin:0; font-size:26px; letter-spacing:.06em; line-height:1}
  .brand .tag{font-size:11px; color:var(--muted); letter-spacing:.1em; text-transform:uppercase; margin-top:4px}
  .meta{text-align:right; font-size:12px; line-height:1.35}
  .meta .num{font-size:18px; font-weight:800; letter-spacing:.02em}
  .meta .date{color:var(--muted)}
  .meta .pill{display:inline-block; margin-top:6px; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:800; border:1px solid var(--line); background:#fff}
  .grid2{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px}
  @media(max-width:640px){.grid2{grid-template-columns:1fr}}
  .card{border:1px solid var(--line); border-radius:10px; padding:12px; background:var(--bg)}
  .card h3{margin:0 0 8px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)}
  .kv{display:grid; grid-template-columns:108px 1fr; gap:4px 8px; font-size:13px}
  .kv dt{color:var(--muted)}
  .kv dd{margin:0; font-weight:600; word-break:break-word}
  table{width:100%; border-collapse:collapse; border:1px solid var(--line); border-radius:10px; overflow:hidden; margin:0}
  th{background:var(--ink); color:#fff; font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:9px 8px; text-align:left}
  th.c, td.c{text-align:center}
  th.money, td.money{text-align:right}
  td{padding:9px 8px; border-top:1px solid var(--line); vertical-align:top; font-size:13px}
  tr:nth-child(even) td{background:#F8FAFC}
  .prog{font-size:11px; color:#475569; margin-top:3px}
  .totals{display:flex; justify-content:flex-end; margin-top:14px}
  .totals-box{width:340px; border:1px solid var(--line); border-radius:10px; overflow:hidden}
  .row{display:flex; justify-content:space-between; padding:10px 12px; border-top:1px solid var(--line); background:#fff}
  .row:first-child{border-top:none}
  .row.total{background:var(--ink); color:#fff; font-weight:800; font-size:15px}
  .row b{font-variant-numeric:tabular-nums}
  .note{margin-top:12px; border:1px dashed var(--line); border-radius:10px; padding:10px 12px; background:#FFFEFB; font-size:12px; color:#334155}
  .sigs{display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:30px; text-align:center}
  .sig{border-top:1px solid var(--ink); padding-top:8px; font-size:11px; color:var(--muted); margin-top:40px}
  .foot{text-align:center; color:var(--muted); font-size:11px; margin-top:16px; border-top:1px solid var(--line); padding-top:10px}
  @media print{.toolbar{display:none} body{margin:0} .sheet{padding:10mm} @page{margin:10mm}}
</style>
</head>
<body>
  <div class="sheet">
    <div class="toolbar">
      <button class="btn" onclick="window.close()" type="button">Cerrar</button>
      <button class="btn btn-primary" onclick="window.print()" type="button">🖨️ Imprimir / Guardar PDF</button>
    </div>

    <div class="brand">
      <div>
        <h1>CAMISAS IUB</h1>
      </div>
      <div class="meta">
        <div class="num">RECIBO #${escSimple(String(venta.id).slice(-6).toUpperCase())}</div>
        <div class="date">${fechaPedidoTxt} · ${escSimple(vendedorLabel(venta))}</div>
        <div class="pill">${estadoPill}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Cliente</h3>
        <dl class="kv">
          <dt>Nombre</dt><dd>${escSimple(venta.cliente_nombre || '—')}</dd>
          <dt>Teléfono</dt><dd>${escSimple(venta.cliente_telefono || '—')}</dd>
          <dt>Lugar</dt><dd>${escSimple(venta.lugar_entrega || 'Por definir')}</dd>
          ${notaTxt ? `<dt>Nota</dt><dd>${escSimple(notaTxt)}</dd>` : ''}
        </dl>
      </div>
      <div class="card">
        <h3>Entrega</h3>
        <dl class="kv">
          <dt>Fecha</dt><dd>${fechaEntrega}</dd>
          <dt>Entrega por</dt><dd>${escSimple(venta.entrega_por || 'Sin asignar')}</dd>
          <dt>Vendedor</dt><dd>${escSimple(venta.vendedor || '—')}</dd>
          <dt>Pedido del</dt><dd>${fechaPedidoTxt}</dd>
        </dl>
      </div>
    </div>

    <table>
      <thead>
        <tr><th style="width:36px">#</th><th>Descripción</th><th class="c" style="width:52px">Cant.</th><th class="money" style="width:96px">Precio</th><th class="money" style="width:96px">Abono</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    ${programaTexto ? `<div class="note"><b>Bordados:</b> ${programaTexto}</div>` : ''}

    <div class="totals">
      <div class="totals-box">
        <div class="row"><span>Total del pedido</span><b>${fmt(total)}</b></div>
        <div class="row"><span>Abono cliente</span><b>${fmt(abonoTotal)}</b></div>
        <div class="row total"><span>Saldo por pagar</span><b>${fmt(saldoPos)}</b></div>
      </div>
    </div>

    ${notaTxt ? `<div class="note"><b>Nota:</b> ${escSimple(notaTxt)}</div>` : ''}

    <div class="foot">
      Gracias por tu pedido 💙 — Camisas IUB<br>
      ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'short' })} · Este recibo no es factura fiscal
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 150);
    };
  <\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=820,height=720');
    if (!w) {
      mostrarToast('Permite las ventanas emergentes para imprimir.', 'error');
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  function vendedorLabel(v) {
    return escSimple(v.vendedor || 'Sin vendedor');
  }

  function stateText(v) {
    const eg = estadoGeneralVenta(v);
    return eg === 'Mixto' ? 'En proceso (Mixto)' : escSimple(eg);
  }

  // Umbral de días sin avanzar por estado (tiempo muerto).
  const UMBRAL_DIAS_ESTADO = {
    'Pedido': 3,
    'Comprado': 5,
    'Bordando': 7
  };

  // Alertas de tiempo muerto: camisas atascadas en un estado demasiados días.
  // Cuenta camisa por camisa (estadosItemsVenta) y solo de pedidos activos.
  function alertasTiempoMuerto() {
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;
    const listas = [];
    ventasCache.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v)) return;
      if (!esAdmin && v.vendedor !== miNombre) return;
      const dias = diasTranscurridos(v.fecha);
      if (dias === null) return;
      const conteoPorEstado = {};
      estadosItemsVenta(v).forEach(e => {
        if (UMBRAL_DIAS_ESTADO[e]) conteoPorEstado[e] = (conteoPorEstado[e] || 0) + 1;
      });
      Object.entries(conteoPorEstado).forEach(([e, n]) => {
        if (dias <= UMBRAL_DIAS_ESTADO[e]) return;
        const extra = e === 'Pedido'
          ? (v.compra_id ? ' (ya comprado, falta actualizar estado)' : ' — aún no se compra al proveedor')
          : '';
        const camisa = n > 1 ? `${n} camisas` : `1 camisa`;
        listas.push(`• <b>${escSimple(v.cliente_nombre)}</b> (${escSimple(v.vendedor)}) - ${dias} días con ${camisa} en <b>${escSimple(e)}</b>${extra}`);
      });
    });
    return listas;
  }

  // Alerta si un pedido "Listo para entrega" no tiene fecha o lleva días sin entregarse.
  // Agrupa por cliente+vendedor+fecha para no repetir 5 veces el mismo aviso (ej. Sara 5 pedidos iguales).
  function alertasListosSinEntrega() {
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;
    const porClave = new Map();
    ventasCache.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v) || !todosItemsListosEntrega(v)) return;
      if (!esAdmin && v.vendedor !== miNombre) return;
      const clave = `${v.cliente_nombre || ''}|${v.vendedor || ''}|${v.fecha_entrega || ''}`;
      if (!porClave.has(clave)) porClave.set(clave, { cliente: v.cliente_nombre, vendedor: v.vendedor, fecha: v.fecha_entrega, count: 0, dias: null, sinFecha: !v.fecha_entrega });
      const g = porClave.get(clave);
      g.count += 1;
      if (v.fecha_entrega) {
        const d = diasTranscurridos(v.fecha_entrega);
        if (d !== null) g.dias = d;
      }
    });
    const listas = [];
    porClave.forEach(g => {
      if (g.sinFecha) {
        listas.push(`📦 <b>${g.cliente}</b> (${g.vendedor}) — ${g.count} pedido${g.count > 1 ? 's' : ''} en <b>Listo para entrega</b> sin fecha`);
      } else if (g.dias !== null && g.dias >= 2) {
        listas.push(`📦 <b>${g.cliente}</b> (${g.vendedor}) — ${g.count} pedido${g.count > 1 ? 's' : ''} en <b>Listo para entrega</b> desde ${formatearFechaHumana(g.fecha)} (hace ${g.dias} días)`);
      }
    });
    return listas;
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
      if (!v.fecha_entrega || todosItemsListosEntrega(v)) return;
      if (v.fecha_entrega < hoy) {
        alertas.push({ tipo: 'critical', msg: `⏰ Pedido vencido: <b>${escSimple(v.cliente_nombre)}</b> (${escSimple(v.vendedor)}) — debía entregarse el ${formatearFechaHumana(v.fecha_entrega)}` });
      }
    });

    const clientesDeuda = {};
    misVentas.forEach(v => {
      if (estadosTodosLiquidado(v)) return;
      const saldo = precioTotalVenta(v) - abonoClienteTotal(v);
      if (saldo > 0) clientesDeuda[v.cliente_nombre] = (clientesDeuda[v.cliente_nombre] || 0) + saldo;
    });
    Object.entries(clientesDeuda).forEach(([nombre, deuda]) => {
      if (deuda > 100000) alertas.push({ tipo: 'warning', msg: `⚠️ Cliente con deuda alta: <b>${nombre}</b> — debe ${fmt(deuda)}` });
    });

    // Ítem 4 — tiempo muerto por estado (camisa atascada demasiados días).
    const muertos = alertasTiempoMuerto();
    if (muertos.length) {
      alertas.push({ tipo: 'warning', msg: '🕐 <b>Tiempo muerto en estados:</b><br>' + muertos.join('<br>') });
    }

    // "Listo para entrega" sin fecha o sin entregarse.
    const listosSinEntrega = alertasListosSinEntrega();
    if (listosSinEntrega.length) {
      alertas.push({ tipo: 'info', msg: listosSinEntrega.join('<br>') });
    }

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

  // Para texto dentro de atributos: como escSimple pero también escapa la
  // comilla simple, que es la que rompe los onclick="funcion('...')".
  function escAttr(s) {
    return escSimple(s).replace(/'/g, '&#39;');
  }

  // Para incrustar un valor dentro de un onclick="funcion('...')" (comillas
  // dobles por fuera): escapa la barra invertida, la comilla simple y la doble.
  function argOnClick(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;');
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
      const precio = precioTotalVenta(v);
      const costoU = costoTotalVenta(v);
      const abono = abonoClienteTotal(v);
      totalCamisas += cant;
      totalVendido += precio;
      totalCosto += costoU;
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
          porModelo[m].vendido += precioDeItem(it, v);
        });
      } else {
        const m = normalizarModelo(v.modelo);
        const cant = Number(v.cantidad) || 1;
        porModelo[m].camisas += cant;
        porModelo[m].vendido += (Number(v.precio_unitario) || 0) * cant;
      }
    });
    const camisasModelo = porModelo.Viejo.camisas + porModelo.Nuevo.camisas;
    const pctViejo = camisasModelo ? Math.round((porModelo.Viejo.camisas / camisasModelo) * 100) : 0;
    const pctNuevo = 100 - pctViejo;
    const liderModelo = porModelo.Viejo.camisas >= porModelo.Nuevo.camisas ? 'Viejo' : 'Nuevo';
    const pctLider = liderModelo === 'Viejo' ? pctViejo : pctNuevo;

    // ---------- PEDIDOS ----------
    const pedidosActivos = ventasFiltradas.filter(v => !v.finalizado && estadoGeneralVenta(v) !== 'Liquidado').length;
    const pedidosFinalizados = ventasFiltradas.filter(v => v.finalizado).length;
    const entregados = ventasFiltradas.filter(v => todosItemsListosEntrega(v) && estadoGeneralVenta(v) !== 'Liquidado').length;

    // ---------- COMPRAS PENDIENTES (estado actual, sin filtro de período) ----------
    const porComprar = pedidosPorComprar().filter(v =>
      (!fVendedor || v.vendedor === fVendedor) &&
      (!fCliente || (v.cliente_nombre || '') === fCliente)
    );
    const camisasPorComprarN = porComprar.reduce((s, v) => s + itemsPedidoComprar(v), 0);
    const sinFecha = pedidosSinFechaEntrega().filter(v =>
      (!fVendedor || v.vendedor === fVendedor) &&
      (!fCliente || (v.cliente_nombre || '') === fCliente)
    ).length;

    // ---------- POR VENDEDOR ----------
    const porVendedor = {};
    ventasFiltradas.forEach(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = precioTotalVenta(v);
      const costoU = costoTotalVenta(v);
      const abono = abonoClienteTotal(v);
      const nombre = v.vendedor || 'Sin asignar';
      if (!porVendedor[nombre]) porVendedor[nombre] = { camisas: 0, vendido: 0, ganancia: 0, restante: 0 };
      porVendedor[nombre].camisas += cant;
      porVendedor[nombre].vendido += precio;
      porVendedor[nombre].ganancia += precio - costoU;
      porVendedor[nombre].restante += Math.max(precio - abono, 0);
    });

    // ---------- CLIENTES ----------
    const porCliente = {};
    ventasFiltradas.forEach(v => {
      const cant = Number(v.cantidad) || 1;
      const precio = precioTotalVenta(v);
      const abono = abonoClienteTotal(v);
      const nombre = v.cliente_nombre || 'Sin nombre';
      if (!porCliente[nombre]) porCliente[nombre] = { pedidos: 0, camisas: 0, vendido: 0, deuda: 0 };
      porCliente[nombre].pedidos += 1;
      porCliente[nombre].camisas += cant;
      porCliente[nombre].vendido += precio;
      porCliente[nombre].deuda += Math.max(precio - abono, 0);
    });

    // ---------- COMPRAS ----------
    const comprasFiltradas = comprasCache.filter(c =>
      resPeriodoAplica(c.fecha) && (!fVendedor || c.comprador === fVendedor)
    );
    const comprasInvertido = comprasFiltradas.reduce((s, c) => {
      const costo = ventasCache
        .filter(v => v.compra_id === c.id)
        .reduce((ss, v) => ss + costoTotalVenta(v), 0);
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
      b.vendido += precioTotalVenta(v);
      b.costo += costoTotalVenta(v);
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
      // El filtro por estado incluye el pedido si ALGUNA de sus camisas está
      // en ese estado (pedidos que mezclan: ej. 2 Listo para entrega + 4 Bordando
      //). Así no se "pierde" ningún pedido al filtrar.
      if (fe && !estadosItemsVenta(v).includes(fe)) return false;
      if (fs && !(
        (v.cliente_nombre || '').toLowerCase().includes(fs) ||
        (v.cliente_telefono || '').toLowerCase().includes(fs) ||
        (v.vendedor || '').toLowerCase().includes(fs) ||
        (v.id || '').toLowerCase().includes(fs) ||
        (v.fecha || '').includes(fs) ||
        (v.fecha_entrega || '').includes(fs) ||
        (v.lugar_entrega || '').toLowerCase().includes(fs) ||
        (v.estado || '').toLowerCase().includes(fs) ||
        estadosItemsVenta(v).some(e => e.toLowerCase().includes(fs)) ||
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

    // Resumen de pedidos: cantidad exacta filtrada (sin "de total") + saldo cliente
    const _totalBase = ventasCache.filter(v => !v.finalizado && (currentRole.role === 'admin' || v.vendedor === currentRole.vendedor));
    const _totalPedidos = _totalBase.length;
    const _totalCamisas = _totalBase.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
    const _totalSaldo = _totalBase.reduce((s, v) => s + Math.max(precioTotalVenta(v) - abonoClienteTotal(v), 0), 0);
    const _filtradosPedidos = rows.length;
    const _filtradosCamisas = rows.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
    const _filtradosSaldo = rows.reduce((s, v) => s + Math.max(precioTotalVenta(v) - abonoClienteTotal(v), 0), 0);
    const _summaryEl = document.getElementById('orders-summary');
    if (_summaryEl) {
      const _fv = document.getElementById('filter-vendedor')?.value || '';
      const _fe = document.getElementById('filter-estado')?.value || '';
      const _fs = (document.getElementById('filter-search')?.value || '').trim();
      const _filtrando = !!(_fv || _fe || _fs);
      if (_totalPedidos === 0) {
        _summaryEl.classList.add('hidden');
        _summaryEl.innerHTML = '';
      } else if (_filtrando) {
        _summaryEl.innerHTML = `<b>${_filtradosPedidos} pedidos</b> · <b>${_filtradosCamisas} camisas</b> · Saldo cliente: <b>${fmt(_filtradosSaldo)}</b>`;
        _summaryEl.classList.remove('hidden');
      } else {
        _summaryEl.innerHTML = `<b>${_totalPedidos} pedidos</b> · <b>${_totalCamisas} camisas</b> · Saldo cliente: <b>${fmt(_totalSaldo)}</b>`;
        _summaryEl.classList.remove('hidden');
      }
    }

    const body = document.getElementById('ventas-body');
    document.getElementById('empty-state').classList.toggle('hidden', rows.length > 0);

    const page = paginationState.orders;
    const totalPages = Math.ceil(rows.length / PAGE_SIZE) || 1;
    const start = page * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    body.innerHTML = pageRows.map(v => {
      const cant = Number(v.cantidad) || 1;
      const venta = precioTotalVenta(v);
      const abonoCliente = abonoClienteTotal(v);
      const pagosProv = abonosProveedorPorVentaId(v.id);
      const costoPagado = pagosProv.abonado;
      const costoTotal = pagosProv.costoTotal;
      const restanteCliente = venta - abonoCliente;
      const pendienteYesenia = pagosProv.pendiente;
      const eg = estadoResumenVenta(v);
      const esMixto = estadoGeneralVenta(v) === 'Mixto';

      const fechaEntregaHumana = textoFechaEntrega(v);

      const detalle = itemsDetalleHtml(v);

      return `
        <tr data-id="${v.id}">
          <td>${v.fecha ? formatearFechaHumana(v.fecha) : ''}<span class="sub-tag">🕐 ${horaDeVenta(v) || ''}</span></td>
          <td><b>${escSimple(v.vendedor || '')}</b></td>
          <td>
            <b>${escSimple(v.cliente_nombre || '')}</b>
            <span class="sub-tag">📞 ${escSimple(v.cliente_telefono || '')}${(() => { const t = String(v.cliente_telefono || '').trim(); const d = t.replace(/\D/g, ''); if (d) return ` · <a href="https://wa.me/57${d}" target="_blank" style="color:var(--ok);font-weight:600;text-decoration:none;">WhatsApp</a>`; if (esUsuarioWhatsApp(t)) return ` · <a href="#" onclick="copiarUsuarioWhatsApp('${argOnClick(t)}');return false;" style="color:var(--ok);font-weight:600;text-decoration:none;">Copiar @</a>`; return ''; })()}</span>
          </td>
          <td>
            <div style="margin-bottom:6px;">${badgeModeloVenta(v)}</div>
            ${detalle}
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
            <select class="estado-select ${claseEstado(eg)}" data-id="${v.id}" data-prev="${v.estado}">
              ${ESTADOS
                .map(e => `<option value="${e}" ${eg === e ? 'selected' : ''}>${e}</option>`)
                .join('')}
            </select>
            ${v.comprado_at ? `<span class="sub-tag" style="color:var(--teal-ink);">🛒 ${formatearCompradoAt(v)}</span>` : ''}
            ${esMixto ? estadosCuentasHtml(v) : ''}
            ${(() => { const listo = puedeMarcarPagado(v).ok && todosItemsListosEntrega(v); const pend = !pedidoSocioLiquidado(v) || !costoProveedorPagado(v); if (listo) return '<span class="sub-tag" style="color:var(--ok);font-weight:700;">✅ Listo para liquidar</span>'; if (pend) return '<span class="sub-tag" style="color:var(--warn);">Socio/proveedor pendiente</span>'; return ''; })()}
          </td>
          <td>
            <div class="action-group">
              <button class="btn-small editar-button" data-id="${v.id}" type="button">Editar</button>
              <button class="btn-small abono-button" data-id="${v.id}" type="button">+ Abono</button>
              <button class="btn-small recibo-button" data-id="${v.id}" type="button" title="Imprimir recibo del pedido">🧾 Recibo</button>
              <button class="btn-small finalizar-button" data-id="${v.id}" type="button" ${!estadosTodosLiquidado(v) ? 'disabled title="Solo se puede finalizar cuando TODAS las camisas están Liquidado (proveedor y socios liquidados)" style="opacity:0.45;cursor:not-allowed;"' : 'title="Finalizar pedido (mover a Historial)"'}>Finalizar</button>
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
      button.addEventListener('click', () => abrirModalAbono(button.dataset.id));
    });

    document.querySelectorAll('.recibo-button').forEach(button => {
      button.addEventListener('click', () => imprimirRecibo(button.dataset.id));
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
     ITEMS DINÁMICOS DE CAMISA (uno por unidad)
     Las camisas se agregan con el botón + y se quitan con
     − o con la papelera 🗑️ de cada fila. Cada fila se llena
     por separado (versión, género, color, talla, bordado,
     precio, costo, abono y estado propios).
     ===================================================== */
  const TALLAS_DISPONIBLES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  const COLORES_DISPONIBLES = ['Negro', 'Blanco', 'Gris', 'Turquí', 'Azul turquesa', 'Camel', 'Vinotinto', 'Palo de Rosa'];
  const MAX_CAMISAS_PEDIDO = 30;

  // Al redibujar filas, un campo vacío o un NaN (input en blanco) debe quedar vacío.
  function numOrBlank(v) {
    if (v === undefined || v === null || v === '') return '';
    return isNaN(Number(v)) ? '' : v;
  }

  // Una camisa en blanco para empezar un pedido. NaN = campo de dinero vacío
  // (numOrBlank lo vuelve a cadena al pintar, no "NaN").
  function camisaVacia() {
    return { modelo: 'Viejo', genero: '', color: '', talla: '',
             programa: '', precio: NaN, costo: NaN, abono: NaN, estado: 'Pedido' };
  }

  function coloresOptionsHtml(valorSeleccionado) {
    const valorActual = valorSeleccionado || '';
    let html = `<option value="" ${valorActual === '' ? 'selected' : ''} disabled>Selecciona un color</option>`;
    html += COLORES_DISPONIBLES.map(c => `<option value="${c}" ${valorActual === c ? 'selected' : ''}>${c}</option>`).join('');
    return html;
  }

  function renderCamisaItemsFromData(items) {
    const container = document.getElementById('camisa-items-container');
    container.innerHTML = items.map((item, i) => {
      const estadoItem = item.estado ? normalizarEstado(item.estado) : 'Pedido';
      return `
      <div class="camisa-item-row" data-index="${i}">
        <div class="camisa-item-head">
          <span class="camisa-item-number">Camisa #${i + 1}</span>
          <button type="button" class="camisa-item-del" data-index="${i}" title="Quitar esta camisa del pedido" aria-label="Quitar la camisa ${i + 1}">🗑️</button>
        </div>
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
            <input type="text" class="ci-programa" value="${escSimple(item.programa)}" placeholder="Ej. Ingeniería">
          </div>
        </div>
        <div class="camisa-item-money">
          <div>
            <label class="label-required">Precio venta ($)</label>
            <input type="number" class="ci-precio" min="0" value="${numOrBlank(item.precio)}" placeholder="${(document.getElementById('f-precio') || {}).value || 39000}">
          </div>
          <div>
            <label class="label-required">Costo Yesenia ($)</label>
            <input type="number" class="ci-costo" min="0" value="${numOrBlank(item.costo)}" placeholder="${(document.getElementById('f-costo') || {}).value || 30000}">
          </div>
          <div>
            <label class="label-required">Abono recibido ($)</label>
            <input type="number" class="ci-abono" min="0" value="${numOrBlank(item.abono)}" placeholder="0">
          </div>
          <div>
            <label class="label-required">Estado</label>
            <select class="ci-estado">
              ${ESTADOS.map(e => `<option value="${e}" ${estadoItem === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      `;
    }).join('');

    container.querySelectorAll('.ci-abono').forEach(input => {
      input.addEventListener('input', actualizarTotalAbono);
    });

    // Papelera 🗑️ de cada fila: quita esa camisa del pedido.
    container.querySelectorAll('.camisa-item-del').forEach(btn => {
      btn.addEventListener('click', () => eliminarFilaCamisa(Number(btn.dataset.index)));
    });

    container.querySelectorAll('.camisa-item-row').forEach(row => {
      const costoInp = row.querySelector('.ci-costo');
      if (!costoInp) return;
      costoInp.dataset.user = costoInp.value === '' ? '0' : '1';
      costoInp.addEventListener('input', () => {
        costoInp.dataset.user = costoInp.value === '' ? '0' : '1';
      });
      const aplicaCosto = () => {
        if (costoInp.dataset.user === '1') return;
        const talla = row.querySelector('.ci-talla').value;
        if (!talla) return;
        costoInp.value = costoProveedorSugerido(row.querySelector('.ci-modelo').value, talla);
      };
      row.querySelector('.ci-talla').addEventListener('change', aplicaCosto);
      row.querySelector('.ci-modelo').addEventListener('change', aplicaCosto);
    });

    actualizarContadorCamisas();
    actualizarTotalAbono();
  }

  // Lee las filas de camisa del formulario, en el orden en que aparecen.
  function collectCamisaItems() {
    const rows = document.querySelectorAll('#camisa-items-container .camisa-item-row');
    const items = [];
    rows.forEach(row => {
      const val = sel => { const el = row.querySelector(sel); return el ? el.value : ''; };
      const num = sel => parseFloat(val(sel));
      items.push({
        modelo: val('.ci-modelo') || 'Viejo',
        genero: val('.ci-genero'),
        color: val('.ci-color').trim(),
        talla: val('.ci-talla'),
        programa: val('.ci-programa').trim(),
        precio: num('.ci-precio'),
        costo: num('.ci-costo'),
        abono: num('.ci-abono'),
        estado: val('.ci-estado') || 'Pedido'
      });
    });
    return items;
  }

  function actualizarTotalAbono() {
    const items = collectCamisaItems();
    const total = items.reduce((sum, it) => sum + (isNaN(it.abono) ? 0 : it.abono), 0);
    document.getElementById('f-abono').value = total;
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

  // ── Contador de camisas: + agrega, − quita, papelera quita una fila ──

  function actualizarContadorCamisas() {
    const total = document.querySelectorAll('#camisa-items-container .camisa-item-row').length;
    const out = document.getElementById('camisa-total');
    if (out) out.textContent = total;
    const menos = document.getElementById('camisa-menos');
    if (menos) menos.disabled = total <= 1;
    const mas = document.getElementById('camisa-mas');
    if (mas) mas.disabled = total >= MAX_CAMISAS_PEDIDO;
  }

  // Botón +: agrega una fila. Se copia la última camisa para no tener que
  // llenarla de nuevo cuando son iguales; si está vacía, se agrega en blanco.
  // NO se enfoca ningún campo: en el teléfono eso abriría de golpe el menú
  // desplegable de género y taparía la pantalla. El usuario elige su campo.
  function agregarCamisa() {
    const existentes = collectCamisaItems();
    if (existentes.length >= MAX_CAMISAS_PEDIDO) {
      mostrarToast(`Máximo ${MAX_CAMISAS_PEDIDO} camisas por pedido.`, 'error');
      return;
    }
    const ultima = existentes[existentes.length - 1];
    renderCamisaItemsFromData([...existentes, ultima ? { ...ultima } : camisaVacia()]);

    // Solo se acerca la fila nueva, sin robarle el foco al usuario.
    const filas = document.querySelectorAll('#camisa-items-container .camisa-item-row');
    const ultimaFila = filas[filas.length - 1];
    if (ultimaFila) ultimaFila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Botón −: quita la última camisa del pedido.
  function restarCamisa() {
    const existentes = collectCamisaItems();
    if (existentes.length <= 1) {
      mostrarToast('El pedido necesita al menos una camisa.', 'error');
      return;
    }
    renderCamisaItemsFromData(existentes.slice(0, -1));
  }

  // Papelera 🗑️ de una fila: quita esa camisa concreta.
  function eliminarFilaCamisa(index) {
    const existentes = collectCamisaItems();
    if (!existentes[index]) return;
    if (existentes.length <= 1) {
      mostrarToast('El pedido necesita al menos una camisa.', 'error');
      return;
    }
    const it = existentes[index];
    const desc = [it.color, it.talla, it.genero].filter(Boolean).join(' · ') || 'sin datos';
    if (!confirmar(`¿Quitar la camisa #${index + 1} (${desc}) del pedido?\n\nEsto solo la quita del formulario. Para borrar el pedido completo, usa "Borrar" en Pedidos.`)) return;
    renderCamisaItemsFromData(existentes.filter((_, i) => i !== index));
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

  // Suggestions de cliente con nombre y telefono: al tocar una se rellenan
  // los tres campos (nombre, telefono y vendedor habitual) de una vez.
  function pintarSugerenciasCliente(lista) {
    const cont = document.getElementById('f-cliente-sugerencias');
    if (!cont) return;
    if (!lista.length) { cont.innerHTML = ''; cont.classList.add('hidden'); return; }
    cont.classList.remove('hidden');
    cont.innerHTML = lista.map((s, i) => `
      <button type="button" class="cliente-chip" data-i="${i}">
        <b>${escSimple(s.nombre)}</b>
        <span>${escSimple(s.telefono || 'sin teléfono')}</span>
        ${s.ventas > 1 ? `<em>${s.ventas} pedidos</em>` : ''}
      </button>`).join('');
    cont.querySelectorAll('.cliente-chip').forEach(b => {
      b.addEventListener('click', () => {
        const s = lista[Number(b.dataset.i)];
        if (!s) return;
        document.getElementById('f-cliente').value = s.nombre;
        const tel = document.getElementById('f-telefono');
        if (s.telefono) { tel.value = s.telefono; validarTelefonoInput(); }
        const selV = document.getElementById('f-vendedor');
        if (selV && s.vendedor && !editingId && !selV.disabled) selV.value = s.vendedor;
        pintarSugerenciasCliente([]);
        onClienteInput();
        mostrarToast(`Cliente listo: ${s.nombre}${s.telefono ? ' · ' + s.telefono : ''}`, 'info');
      });
    });
  }

  // Agrupa por nombre para sugerir de mas a menos, con conteo de pedidos.
  function sugerenciasCliente(texto, limite) {
    const q = texto.trim().toLowerCase();
    if (q.length < 2) return [];
    const mapa = new Map();
    ventasCache.forEach(v => {
      const nombre = String(v.cliente_nombre || '').trim();
      if (!nombre) return;
      const bajo = nombre.toLowerCase();
      if (!bajo.includes(q) && !q.includes(bajo)) return;
      const tel = String(v.cliente_telefono || '').trim();
      const k = nombre + '|' + tel;
      if (!mapa.has(k)) {
        mapa.set(k, { nombre, telefono: tel, vendedor: v.vendedor || '', ventas: 0, ultima: v.fecha || '' });
      }
      const e = mapa.get(k);
      e.ventas++;
      if (String(v.fecha || '') > String(e.ultima)) e.ultima = v.fecha;
    });
    return [...mapa.values()]
      .sort((a, b) => (b.ventas - a.ventas) || String(b.ultima).localeCompare(String(a.ultima)))
      .slice(0, limite);
  }

  function onClienteInput() {
    const inp = document.getElementById('f-cliente');
    const hint = document.getElementById('f-cliente-hint');
    const telInput = document.getElementById('f-telefono');
    if (!inp || !hint) return;
    const nombre = inp.value.trim().toLowerCase();
    if (!nombre) {
      hint.style.display = 'none';
      pintarSugerenciasCliente([]);
      return;
    }
    const exactos = ventasCache.filter(v=> String(v.cliente_nombre||'').trim().toLowerCase()===nombre);
    if (exactos.length>0) {
      const ultimo = exactos.slice().sort((a,b)=> String(b.fecha||'').localeCompare(String(a.fecha||'')))[0];
      const telActual = telInput ? telInput.value.trim() : '';
      if (telInput && !telActual && ultimo.cliente_telefono) {
        telInput.value = ultimo.cliente_telefono;
        validarTelefonoInput();
      }
      const tel = ultimo.cliente_telefono ? ' · ' + ultimo.cliente_telefono : '';
      const vend = ultimo.vendedor ? ' · vendedor habitual: ' + ultimo.vendedor : '';
      // Si el teléfono ya era otro, avisar: son dos personas distintas.
      const choca = telActual && ultimo.cliente_telefono && telActual !== ultimo.cliente_telefono;
      hint.textContent = choca
        ? `⚠️ Este cliente figura con el teléfono ${ultimo.cliente_telefono}, pero escribiste ${telActual}. Si es otra persona, deja el que pusiste.`
        : 'Cliente existente' + tel + vend + ' · ' + exactos.length + ' pedido(s) previo(s) — teléfono autocompletado si estaba vacío';
      hint.style.display = 'block';
      hint.style.color = choca ? 'var(--warn)' : 'var(--muted)';
      const selV = document.getElementById('f-vendedor');
      if (selV && ultimo.vendedor && !editingId) selV.value = ultimo.vendedor;
      pintarSugerenciasCliente(sugerenciasCliente(nombre, 3));
    } else {
      const sim = sugerenciasCliente(nombre, 3);
      if (sim.length) {
        hint.textContent = 'Toca el cliente para completar los datos:';
        hint.style.display = 'block';
        hint.style.color = 'var(--muted)';
      } else {
        hint.style.display = 'none';
      }
      pintarSugerenciasCliente(sim);
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

      // Defaults de respaldo ANTES de dibujar: las filas los usan como placeholder.
      const pDef = items[0] && items[0].precio != null && items[0].precio !== '' ? items[0].precio : (venta.precio_unitario || 39000);
      const cDef = items[0] && items[0].costo != null && items[0].costo !== '' ? items[0].costo : (venta.costo_unitario || 30000);
      document.getElementById('f-precio').value = pDef;
      document.getElementById('f-costo').value = cDef;
      // Al editar, el costo registrado manda: no se re-autocompleta al cambiar talla/versión.
      document.getElementById('f-costo').dataset.user = '1';

      // Pedidos antiguos pueden no guardar precio/costo por camisa: se heredan del
      // pedido (precio_unitario / costo_unitario) para que las filas queden válidas.
      const sinPrecio = it => it.precio == null || it.precio === '' || isNaN(Number(it.precio));
      const sinCosto = it => it.costo == null || it.costo === '' || isNaN(Number(it.costo));
      items = items.map(it => Object.assign({}, it, {
        precio: sinPrecio(it) ? pDef : it.precio,
        costo: sinCosto(it) ? cDef : it.costo
      }));

      // Siempre se dibujan las filas: ya no existe el modo "todas iguales".
      renderCamisaItemsFromData(items);

      const eiItems = items.map(it => (it.estado ? normalizarEstado(it.estado) : null)).filter(Boolean);
      const rollupEst = eiItems.length
        ? eiItems.slice().sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b))[0]
        : (venta.estado || 'Pedido');
      document.getElementById('f-estado').value = rollupEst;
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
      const cd = document.getElementById('f-cliente-hint');
      if (cd) cd.style.display = 'none';
      pintarSugerenciasCliente([]);
      // Defaults primero: las filas los usan como placeholder de precio/costo.
      document.getElementById('f-precio').value = 39000;
      document.getElementById('f-costo').value = 30000;
      document.getElementById('f-costo').dataset.user = '0';
      document.getElementById('f-estado').value = '';
      // Pedido nuevo: una sola camisa vacía. Se agregan las demás con el botón +.
      renderCamisaItemsFromData([camisaVacia()]);
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

    const compradoBox = document.getElementById('form-comprado-actions');
    const compradoInfo = document.getElementById('form-comprado-info');
    if (venta && venta.comprado_at) {
      compradoBox.classList.remove('hidden');
      compradoInfo.textContent = `🛒 Comprado: ${formatearCompradoAt(venta)}`;
    } else {
      compradoBox.classList.add('hidden');
    }

    document.getElementById('form-card').classList.remove('hidden');
    document.getElementById('form-card').scrollIntoView({ behavior: 'smooth' });
  }

  // Cancelar en Nueva Venta: limpia el formulario y se vuelve al Inicio
  // (tanto si se estaba creando uno nuevo como editando uno existente).
  function closeForm() {
    editingId = null;
    document.getElementById('form-card').classList.add('hidden');
    document.getElementById('form-validation-error').classList.add('hidden');
    const cb = document.getElementById('form-comprado-actions');
    if (cb) cb.classList.add('hidden');
    navigateTo('dashboard');
  }

  async function clearCompradoAt() {
    if (!editingId) return;
    const venta = ventasCache.find(v => v.id === editingId);
    if (!venta || !venta.comprado_at) return;
    if (!confirmar(`¿Eliminar la fecha de compra de "${venta.cliente_nombre || 'este pedido'}"?\n\nQuedará como si nunca se hubiera marcado Comprado (se borrará 🛒 ${formatearCompradoAt(venta)}).`)) return;
    try {
      const payload = { comprado_at: null, updated_at: new Date().toISOString() };
      let res = await supabaseClient.from('ventas').update(payload).eq('id', editingId);
      if (res.error && String(res.error.message).toLowerCase().match(/comprado_at|updated_at/)) {
        delete payload.comprado_at;
        // si no existe la columna, solo actualizar updated_at o nada
        delete payload.updated_at;
        res = await supabaseClient.from('ventas').update({}).eq('id', editingId);
        // fallback: intentar solo con null si la columna existe pero el error es otro
        if (res.error) throw res.error;
      } else if (res.error) throw res.error;
      // Actualizar cache local
      venta.comprado_at = null;
      const box = document.getElementById('form-comprado-actions');
      if (box) box.classList.add('hidden');
      await loadVentas();
      mostrarToast('✅ Fecha de compra eliminada.');
    } catch (e) {
      logError('clearCompradoAt', e);
      mostrarToast('Error al eliminar la fecha de compra.', 'error');
    }
  }
  window.clearCompradoAt = clearCompradoAt;
  window.abrirModalAbono = abrirModalAbono;
  window.cerrarModalAbono = cerrarModalAbono;

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

     const pr1 = items[0] && items[0].precio != null && items[0].precio !== '' ? Number(items[0].precio) : parseFloat(document.getElementById('f-precio').value);
     const co1 = items[0] && items[0].costo != null && items[0].costo !== '' ? Number(items[0].costo) : parseFloat(document.getElementById('f-costo').value);
     const estadosItems = items
       .map(it => (it.estado ? normalizarEstado(it.estado) : null))
       .filter(Boolean);
     payload.estado = estadosItems.length
       ? estadosItems.slice().sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b))[0]
       : String(document.getElementById('f-estado').value || '').trim();
       payload.precio_unitario = isNaN(pr1) ? null : pr1;
      payload.costo_unitario = isNaN(co1) ? null : co1;
      payload.updated_at = new Date().toISOString();
      // Guardar fecha de compra si pasa a Comprado (conservar si ya tenía)
      const yaCompradoAt = editingId ? (ventasCache.find(v => v.id === editingId)?.comprado_at || null) : null;
      if (payload.estado === 'Comprado' && !yaCompradoAt) {
        payload.comprado_at = new Date().toISOString();
      } else if (payload.estado === 'Comprado' && yaCompradoAt) {
        // conservar la primera fecha de compra
      } else if (yaCompradoAt) {
        // si ya tenía fecha y cambia a otro estado, conservarla
        payload.comprado_at = yaCompradoAt;
      }

      if (currentRole.role !== 'admin' && currentRole.vendedor) {
        payload.vendedor = currentRole.vendedor;
      }

     const faltantes = [];
     if (!payload.cliente_nombre) faltantes.push("Nombre del cliente");
     if (!payload.cliente_telefono) faltantes.push("Teléfono");
     if (items.length === 0) faltantes.push("Al menos una camisa (usa + para agregar)");
     items.forEach((it, idx) => {
       if (!it.genero) faltantes.push(`Género de la camisa #${idx + 1}`);
       if (!it.color) faltantes.push(`Color de la camisa #${idx + 1}`);
       if (!it.talla) faltantes.push(`Talla de la camisa #${idx + 1}`);
       if (isNaN(it.abono) || it.abono < 0) faltantes.push(`Abono válido de la camisa #${idx + 1}`);
       const pI = Number(it.precio);
       const cI = Number(it.costo);
       if (isNaN(pI) || pI <= 0) faltantes.push(`Precio de venta de la camisa #${idx + 1}`);
       if (isNaN(cI) || cI < 0) faltantes.push(`Costo (Yesenia) de la camisa #${idx + 1}`);
     });
     if (payload.estado === 'Liquidado' || items.some(it => it.estado === 'Liquidado')) {
       const listas = items.every(it => ['Entregado', 'Liquidado'].includes(it.estado ? normalizarEstado(it.estado) : (payload.estado || 'Pedido') || 'Pedido'));
       if (!listas) faltantes.push("Para liquidar un pedido, TODAS sus camisas deben estar Entregado o Liquidado");
     }
     if (isNaN(payload.cantidad) || payload.cantidad <= 0) faltantes.push("Cantidad válida");
     if (payload.precio_unitario == null || isNaN(payload.precio_unitario) || payload.precio_unitario <= 0) faltantes.push("Precio por camisa");
     if (payload.costo_unitario == null || isNaN(payload.costo_unitario) || payload.costo_unitario < 0) faltantes.push("Costo por camisa");
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
          let res = await supabaseClient.from('ventas').update(payload).eq('id', editingId);
          if (res.error && String(res.error.message).toLowerCase().match(/updated_at|comprado_at/)) {
            delete payload.updated_at; delete payload.comprado_at;
            res = await supabaseClient.from('ventas').update(payload).eq('id', editingId);
          }
          error = res.error;
        } else {
          let res = await supabaseClient.from('ventas').insert(payload);
          if (res.error && String(res.error.message).toLowerCase().match(/updated_at|comprado_at/)) {
            delete payload.updated_at; delete payload.comprado_at;
            res = await supabaseClient.from('ventas').insert(payload);
          }
          error = res.error;
        }

         if (error) { mostrarToast('Error al guardar: ' + error.message, 'error'); return; }
        const eraEdicion = !!editingId;
        await loadVentas();
        // Limpia el formulario y lleva SIEMPRE a Pedidos, tanto al crear uno
        // nuevo como al editar: es donde se ve de inmediato lo que se guardó.
        openForm(null);
        navigateTo('orders');
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

    const costoVenta = costoTotalVenta(venta);
    const compraId = venta.compra_id;
    if (!compraId) return { abonado: 0, costoTotal: costoVenta, pendiente: costoVenta };

    // Lo pagado a Yesenia por este pedido se prefiere camisa por camisa
    // (items[].abono_yesenia); si la venta vieja no tiene ese detalle, se usa
    // el abono_yesenia del pedido.
    let abonado = 0;
    const crudos = itemsCrudosVenta(venta);
    let tieneAbonoDefinido = false;
    if (crudos && crudos.some(it => it.abono_yesenia != null && it.abono_yesenia !== '')) {
      abonado = crudos.reduce((s, it) => s + (Number(it.abono_yesenia) || 0), 0);
      tieneAbonoDefinido = true;
    } else {
      abonado = Number(venta.abono_yesenia) || 0;
      tieneAbonoDefinido = venta.abono_yesenia != null && venta.abono_yesenia !== '';
    }

    // Respaldo solo si no hay abono definido (venta vieja sin campo), no cuando es 0 explícito
    if (!tieneAbonoDefinido) {
      const pedidos = ventasCache.filter(v => v.compra_id === compraId);
      const costoTotalCompra = pedidos.reduce((s, v) => s + costoTotalVenta(v), 0);
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
      const costoTotal = pedidos.reduce((s, v) => s + costoTotalVenta(v), 0);
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
        g.costo = g.pedidos.reduce((s, pp) => s + costoTotalVenta(pp), 0);
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
          <td><b>${escSimple(c.proveedor || '')}</b></td>
          <td>${escSimple(c.comprador || '')}</td>
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
        modelo: normalizarModelo(v.modelo),
        precio: Number(v.precio_unitario) || 0,
        costo: Number(v.costo_unitario) || 0,
        abono: cant > 0 ? Math.round(abonoTotal / cant) : 0,
        abono_yesenia: 0,
        estado: normalizarEstado(v.estado)
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

// Reparto proporcional al costo de cada pedido (híbrido): sugiere dividir el
// $ total según cuánto cuesta cada pedido con Yesenia, no por igual por camisa.
function distribuirAbonoEquitativo(abonoTotal, pedidos) {
    const r = {};
    if (!pedidos || pedidos.length === 0) return r;
    if (!(abonoTotal > 0)) { pedidos.forEach(v => { r[v.id] = 0; }); return r; }
    const costos = pedidos.map(v => costoTotalVenta(v));
    const sumC = costos.reduce((a, b) => a + b, 0);
    let asignado = 0;
    pedidos.forEach((v, idx) => {
      if (idx === pedidos.length - 1) r[v.id] = abonoTotal - asignado;
      else {
        const parte = sumC > 0 ? Math.floor(abonoTotal * costos[idx] / sumC) : Math.floor(abonoTotal / pedidos.length);
        asignado += parte;
        r[v.id] = parte;
      }
    });
    return r;
  }

  function renderPedidosPicker(compra) {
    const yaAsignados = new Set(compra ? ventasCache.filter(v => v.compra_id === compra.id).map(v => v.id) : []);
    let disponibles = pedidosDisponiblesParaCompra(compra ? compra.id : null);
    const picker = document.getElementById('cp-pedidos-picker');
    const soloAportes = compraSoloAportes;

    // Admin: filtrar por persona que realiza el abono (Samir/Valentina).
    const seleccion = document.getElementById('cp-comprador')?.value || '';
    if (currentRole.role === 'admin') {
      if (!seleccion) {
        pedidosDisponiblesPickers = [];
        picker.innerHTML = '<p style="color:var(--muted); margin:6px 0;">Selecciona quién realiza el abono para ver sus pedidos.</p>';
        actualizarResumenCompraModal();
        return;
      }
      if (seleccion === 'Samir' || seleccion === 'Valentina') {
        const filtrados = disponibles.filter(v => v.vendedor === seleccion);
        // Mantener los ya asignados a esta compra aunque el filtro no los incluya (por si se cambió el vendedor).
        const extras = disponibles.filter(v => yaAsignados.has(v.id) && !filtrados.some(f => f.id === v.id));
        disponibles = [...filtrados, ...extras];
      }
    }

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
      const costo = pedidos.reduce((s, v) => s + costoTotalVenta(v), 0);
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
                <span class="reparto-hint">Sugerido proporcional al costo · ajusta cada fila si necesitas</span>
              </div>
              <div class="pedidos-sublista">
                ${pedidos.map(p => {
                  const costoPedido = costoTotalVenta(p);
                  const cantPedido = Number(p.cantidad) || 1;
                  const abPedido = yaAsignados.has(p.id) ? (Number(p.abono_yesenia) || 0) : 0;
                  const fechaTxt = p.fecha ? formatearFechaHumana(p.fecha).replace(/^📅\s*/,'') : '?';
                  const estadoBadge = badgeEstadoGeneral(p);
                  return `
                  <div class="pedido-sub-row">
                    <div class="sub-info">
                      <b>${escSimple(fechaTxt)} · ×${cantPedido} camisa(s) · ${fmt(costoPedido)}</b>
                      <span class="sub-tag">${estadoBadge}</span>
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
       costo += costoTotalVenta(v);
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

    // Admin: al cambiar persona que realiza el abono, filtrar los pedidos que se muestran.
    const selComprador = document.getElementById('cp-comprador');
    if (selComprador) {
      selComprador.onchange = () => {
        if (currentRole.role === 'admin') {
          const comp = editingCompraId ? comprasCache.find(x => x.id === editingCompraId) : null;
          renderPedidosPicker(comp);
        }
      };
    }
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
      if (!comprador) { errEl.textContent = 'Selecciona quién realiza el abono.'; errEl.classList.remove('hidden'); return; }
     if (pedidosSeleccionados.length === 0) { errEl.textContent = 'Selecciona al menos una persona para esta compra.'; errEl.classList.remove('hidden'); return; }

     const pedidosObjs = pedidosSeleccionados.map(id => ventasCache.find(v => v.id === id)).filter(Boolean);
     const costoTotal = pedidosObjs.reduce((s, v) => s + costoTotalVenta(v), 0);

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
              const updDes = { compra_id: null, estado: 'Pedido', updated_at: new Date().toISOString() };
              let rDes = await supabaseClient.from('ventas').update(updDes).eq('id', v.id);
              if (rDes.error && String(rDes.error.message).toLowerCase().includes('updated_at')) {
                delete updDes.updated_at;
                await supabaseClient.from('ventas').update(updDes).eq('id', v.id);
              }
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
            const costos = items.map(it => Number(it.costo) || Number(v.costo_unitario) || 0);
            const sumC = costos.reduce((a, b) => a + b, 0);
            let asignado = 0;
            items.forEach((it, idx) => {
              if (idx === items.length - 1) it.abono_yesenia = totalPedido - asignado;
              else {
                const parte = sumC > 0 ? Math.floor(totalPedido * costos[idx] / sumC) : Math.floor(totalPedido / items.length);
                asignado += parte;
                it.abono_yesenia = parte;
              }
            });
            abonoPorPedido[v.id] = { items, abono: totalPedido };
          });
        });

        for (const id of pedidosSeleccionados) {
          const upd = { compra_id: compraIdGuardada, updated_at: new Date().toISOString() };
          if (abonoPorPedido[id]) {
            upd.items_camisa = JSON.stringify(abonoPorPedido[id].items);
            upd.abono_yesenia = abonoPorPedido[id].abono;
          }
          let resUpd = await supabaseClient.from('ventas').update(upd).eq('id', id);
          if (resUpd.error && String(resUpd.error.message).toLowerCase().includes('updated_at')) {
            delete upd.updated_at;
            await supabaseClient.from('ventas').update(upd).eq('id', id);
          }
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
    const ok = await confirmarFuerte({
      titulo: 'Eliminar abono a Yesenia',
      texto: 'Los pedidos que cubría este abono vuelven a quedar disponibles. No se eliminan.',
      botonSi: 'Eliminar abono'
    });
    if (!ok) return;
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
          const costo = costoTotalVenta(p);
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

   /* =====================================================
     3. GANANCIAS Y LIQUIDACIONES (SAMIR & VALENTINA)
     ===================================================== */
   async function loadLiquidaciones() {
    try {
      const { data, error } = await supabaseClient
        .from('liquidaciones')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });

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
          s + (precioTotalVenta(v) - costoTotalVenta(v)) / 2, 0
        )
      );
    }

    if (!esAdmin && miNombre !== 'Valentina') {
      if (valCard) valCard.classList.add('hidden');
    } else if (valCard) {
      valCard.classList.remove('hidden');
      document.getElementById('stat-ganancia-val').textContent = fmt(
        ventasCache.filter(v => v.vendedor === 'Valentina').reduce((s, v) =>
          s + (precioTotalVenta(v) - costoTotalVenta(v)) / 2, 0
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

    // Regla de negocio (acordada por Samir, 2026-09-25): un pedido vendido por
    // DEBAJO del costo no genera deuda entre socios — la pérdida se la come quien
    // vendió. Como no se descuenta, el balance puede quedar más alto que la suma
    // de las mitades de las ganancias. Se avisa abajo para que no parezca un error.
    const perdidasSinDescontar = Math.round(
      ventasCache.filter(v => v.vendedor === 'Samir' || v.vendedor === 'Valentina').reduce((s, v) => {
        const g = precioTotalVenta(v) - costoTotalVenta(v);
        return s + (g < 0 ? -g / 2 : 0);
      }, 0)
    );

    const notaPerdidas = perdidasSinDescontar > 0 ? `
      <div style="margin-top:8px; padding:9px 11px; border-radius:8px; border:1px dashed var(--line); font-size:12px; line-height:1.5; color:var(--muted);">
        ⚠️ Este monto <b>no descuenta ${fmt(perdidasSinDescontar)}</b> por pedidos vendidos
        por debajo del costo. Esa pérdida queda a cargo de quien vendió y no genera
        deuda entre los dos.
      </div>` : '';

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
      ${notaPerdidas}
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
          ? `<b>${escSimple(venta.cliente_nombre || 'Cliente')}</b><span class="sub-tag">${escSimple(venta.fecha || '')}</span>`
          : (l.venta_id ? 'Pedido eliminado' : '—');
        const puedeBorrar = currentRole.role === 'admin' || currentRole.vendedor === l.pagador;
        const acciones = puedeBorrar
          ? `<button class="btn-danger" onclick="deleteLiquidacion('${l.id}')" type="button">Borrar</button>`
          : '<span style="color:var(--muted);">—</span>';
        return `
        <tr>
          <td>${formatearFechaHumana(l.fecha)}<span class="sub-tag">🕐 ${l.hora || ''}</span></td>
          <td>${pedidoLabel}</td>
          <td><b>${escSimple(l.pagador)}</b></td>
          <td><b>${escSimple(l.receptor)}</b></td>
          <td class="money" style="color:var(--ok);">${fmt(l.monto)}</td>
          <td>${escSimple(l.nota || '—')}</td>
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
    const lq = liquidacionesCache.find(x => x.id === id);
    const ok = await confirmarFuerte({
      titulo: 'Eliminar pago entre socios',
      texto: 'El pedido volverá a mostrar saldo pendiente de liquidar.',
      detalle: lq ? `<b>${escSimple(lq.pagador)} → ${escSimple(lq.receptor)}</b><span>${fmt(lq.monto)} · ${lq.fecha ? formatearFechaHumana(lq.fecha) : ''}</span>` : '',
      botonSi: 'Eliminar pago'
    });
    if (!ok) return;
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
        <td><b>${escSimple(u.nombre || 'Sin nombre')}</b></td>
        <td>${escSimple(u.correo)}</td>
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
    const usr = usuariosCache.find(x => x.id === id);
    const ok = await confirmarFuerte({
      titulo: 'Eliminar usuario',
      texto: 'Dejará de aparecer en la configuración. Sus pedidos no se tocan.',
      detalle: usr ? `<b>${escSimple(usr.nombre || '')}</b><span>${escSimple(usr.correo || '')} · ${usr.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span>` : '',
      botonSi: 'Eliminar usuario'
    });
    if (!ok) return;
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
        // getVentasFiltradas ya incluye pedidos con ALGUNA camisa en ese estado.
        dataset = getVentasFiltradas();
      } else {
        // Sin filtro: todos los que aún tienen al menos una camisa en Pedido, aunque ya tengan abono Yesenia
        dataset = ventasCache.filter(v => !v.finalizado && itemsPedidoComprar(v) > 0);
      }
      if (dataset.length === 0) {
        mostrarToast('✅ No hay pedidos pendientes de comprar al proveedor.');
        return;
      }

      // Combina pedidos iguales: suma las unidades por Género/Color/Talla.
      // Fix: pedidos viejos en modo simple guardaban items.length=1 con cantidad=4/6 -> contar cantidad, no 1.
      // Solo se listan camisas en estado Pedido (las que aún hay que comprar).
      const soloPedido = !fe || fe === 'Pedido';
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
        const eligibles = items.filter(it => soloPedido ? ((it.estado ? normalizarEstado(it.estado) === 'Pedido' : true)) : true);
        if (eligibles.length === 0) return;
        const cant = Number(v.cantidad) || 1;
        const pesoPorItem = sinDetalle ? cant : (eligibles.length === 1 ? cant : cant / eligibles.length);
        // Si la división no es entera (datos inconsistentes), repartir el resto en las primeras filas
        const base = Math.floor(pesoPorItem);
        const resto = Math.round((pesoPorItem - base) * eligibles.length);
        eligibles.forEach((it, idx) => {
          const veces = sinDetalle ? cant : (eligibles.length === 1 ? cant : base + (idx < resto ? 1 : 0));
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

      // Totales para la hoja de resumen (solo camisas en estado Pedido).
      let totalCamisas = 0;
      let totalVenta = 0;
      let totalCosto = 0;
      dataset.forEach(v => {
        const crudos = itemsCrudosVenta(v);
        const solo = soloPedido && crudos ? crudos.filter(it => (it.estado ? normalizarEstado(it.estado) === 'Pedido' : true)) : null;
        if (solo) {
          if (solo.length === 0) return;
          solo.forEach(it => {
            totalCamisas += 1;
            totalVenta += precioDeItem(it, v);
            totalCosto += costoDeItem(it, v);
          });
        } else {
          const cant = Number(v.cantidad) || 1;
          totalCamisas += cant;
          totalVenta += (Number(v.precio_unitario) || 0) * cant;
          totalCosto += (Number(v.costo_unitario) || 0) * cant;
        }
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
      // Solo incluye camisas en estado Pedido cuando el filtro es "por comprar".
      const detalle = [];
      dataset.forEach(v => {
        let items = null;
        if (v.items_camisa) {
          try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
        }
        const sinDetalle = !(items && Array.isArray(items) && items.length > 0);
        const eligibles = (items || []).filter(it => soloPedido ? ((it.estado ? normalizarEstado(it.estado) === 'Pedido' : true)) : true);
        if (eligibles.length === 0) return;
        if (!items || !Array.isArray(items) || items.length === 0) {
          items = [{ genero: v.genero, color: v.color, talla: v.talla, programa: v.cliente_programa, modelo: v.modelo }];
        }
        const cant = Number(v.cantidad) || 1;
        const peso = sinDetalle ? cant : (eligibles.length === 1 ? cant : cant / eligibles.length);
        const base = Math.floor(peso);
        const resto = Math.round((peso - base) * eligibles.length);
        eligibles.forEach((it, idx) => {
          const veces = sinDetalle ? cant : (eligibles.length === 1 ? cant : base + (idx < resto ? 1 : 0));
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
      wsLista['!cols'] = [{ wch: 9 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 11 }];
      XLSX.utils.book_append_sheet(wb, wsLista, 'Lista de compra');

      const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
      wsResumen['!cols'] = [{ wch: 26 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      const wsDetalle = XLSX.utils.json_to_sheet(detalle);
      wsDetalle['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 18 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por pedido');

      XLSX.writeFile(wb, `Compra_camisas_${hoyColombia()}.xlsx`);
    } catch (err) {
      mostrarToast('Error al exportar: ' + (err.message || err), 'error');
    }
  }

  async function exportarExcelCompleto() {
    if (currentRole.role !== 'admin') return;

    const data = getVentasFiltradas().sort(ordenarPorEntrega);
    if (data.length === 0) {
      mostrarToast('No hay datos para exportar con los filtros actuales.', 'error');
      return;
    }

    // ExcelJS genera el .xlsx con 2 hojas y diseño real.
    // SheetJS Community no escribe estilos (por eso se veía simple), y el HTML
    // mete las 2 tablas en la misma hoja (por eso todo salía en Reporte).
    if (typeof ExcelJS === 'undefined') {
      mostrarToast('No se pudo cargar ExcelJS. Revisa tu conexión e intenta de nuevo.', 'error');
      return;
    }
    showLoading(true);

    const headers = [
      'ID Pedido', 'Fecha Pedido', 'Fecha Entrega', 'Día de entrega', 'Estado',
      'Vendedor', 'Cliente', 'Teléfono', 'Lugar de entrega', 'Entrega por', 'Nota',
      'Género', 'Color', 'Talla', 'Bordado', 'Versión',
      'Precio Unitario', 'Costo Unitario',
      'Cantidad', 'Venta Total', 'Costo Total', 'Abono Cliente',
      'Saldo Pendiente Cliente', 'Pagado al Proveedor', 'Saldo Pendiente Proveedor',
      'Ganancia Total', 'Me queda (Saldo - Ganancia/2)'
    ];

    const statusBg = { 'Pedido':'#F3F4F6','Comprado':'#DBEAFE','Bordando':'#F3E8FF','Listo para entrega':'#ECFCCB','Entregado':'#DBEAFE','Liquidado':'#D1FAE5' };
    const statusFg = { 'Pedido':'#4B5563','Comprado':'#1E40AF','Bordando':'#7C3AED','Listo para entrega':'#3F6212','Entregado':'#1E3A5F','Liquidado':'#065F46' };

    const headersCuentas = ['Fecha Pedido','Entrega','Estado','Vendedor','Cliente','Nota','Género','Color','Talla','Precio Unitario','Costo Unitario','Cantidad','Venta Total','Costo Total','Abono Cliente','Saldo Pendiente Cliente','Ganancia Total','Me queda (Saldo - Ganancia/2)'];

    // ---- Estilos compartidos (tu plantilla) ----
    const THEME = {
      headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
      headerFont: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      bodyFont: { name: 'Calibri', size: 10 },
      thinBorder: { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } },
      zebraA: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
      zebraB: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      moneyFmt: '"$"#,##0'
    };
    const hexToArgb = h => 'FF' + String(h || 'FFFFFF').replace('#', '').toUpperCase();
    function styleHeaderRow(row) {
      row.eachCell(c => {
        c.fill = THEME.headerFill;
        c.font = THEME.headerFont;
        c.border = THEME.thinBorder;
        c.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      });
      row.height = 22;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Camisas IUB';
    wb.created = new Date();
    const wsR = wb.addWorksheet('Reporte');
    const wsC = wb.addWorksheet('Cuentas');
    wsR.views = [{ state: 'frozen', ySplit: 1 }];
    wsC.views = [{ state: 'frozen', ySplit: 1 }];
    wsR.autoFilter = 'A1:AA1';
    wsC.autoFilter = 'A1:R1';
    wsR.columns = [{ width: 16 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 13 }, { width: 12 }, { width: 15 }, { width: 14 }, { width: 15 }, { width: 14 }, { width: 20 }, { width: 9 }, { width: 11 }, { width: 9 }, { width: 15 }, { width: 10 }, { width: 12 }, { width: 11 }, { width: 9 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 13 }, { width: 15 }, { width: 12 }, { width: 17 }];
    wsC.columns = [{ width: 12 }, { width: 20 }, { width: 14 }, { width: 12 }, { width: 16 }, { width: 22 }, { width: 9 }, { width: 13 }, { width: 9 }, { width: 12 }, { width: 11 }, { width: 9 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 12 }, { width: 17 }];
    styleHeaderRow(wsR.addRow(headers));
    styleHeaderRow(wsC.addRow(headersCuentas));

    try {
    let lastPedidoId = null;
    let rowToggle = false;
    const MONEY_R = new Set([17, 18, 20, 21, 22, 23, 24, 25, 26, 27]);
    const CENTER_R = new Set([1, 2, 3, 4, 5, 6, 8, 12, 13, 14, 16, 19]);

    data.forEach(v => {
      if (v.id !== lastPedidoId) { rowToggle = !rowToggle; lastPedidoId = v.id; }
      const zebra = rowToggle ? THEME.zebraA : THEME.zebraB;
      let items = null;
      if (v.items_camisa) {
        try { items = JSON.parse(v.items_camisa); } catch (e) { items = null; }
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        items = [{ genero: v.genero || '', color: v.color || '', talla: v.talla || '', programa: v.cliente_programa || '' }];
      }

      const cant = Number(v.cantidad) || 1;
      const abono = Number(v.abono) || 0;
      const pagosProv = abonosProveedorPorVentaId(v.id);
      // Por camisa: totales por pedido se reparten por item (fix ganancia duplicada)
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

      const e = normalizarEstado(v.estado || '');

      items.forEach((it, idx) => {
        const cantItem = sinDet ? cant : (nItems === 1 ? cant : cantPorItemBase + (idx < restoCant ? 1 : 0));
        const pItem = precioDeItem(it, v);
        const cItem = costoDeItem(it, v);
        const ventaItem = pItem * cantItem;
        const costoItem = cItem * cantItem;
        const abonoItem = (it.abono != null && it.abono !== '' && !isNaN(Number(it.abono))) ? Number(it.abono) : (abono / nItems);
        const abonoYesItem = (it.abono_yesenia != null && it.abono_yesenia !== '' && !isNaN(Number(it.abono_yesenia))) ? Number(it.abono_yesenia) : (pagosProv.abonado / nItems);
        const saldoItem = ventaItem - abonoItem;
        const pendProvItem = costoItem - abonoYesItem;
        const gananciaItem = ventaItem - costoItem;
        const eItem = it.estado ? normalizarEstado(it.estado) : e;
        const r = wsR.rowCount + 1;
        const row = wsR.addRow([
          v.id, v.fecha, v.fecha_entrega || 'Pendiente por definir', diaSemana, eItem,
          v.vendedor, v.cliente_nombre, v.cliente_telefono, v.lugar_entrega, v.entrega_por || 'Sin asignar', v.nota,
          it.genero, capitalizarColor(it.color), it.talla, it.programa, etiquetaModelo(it.modelo),
          pItem, cItem, cantItem,
          { formula: `Q${r}*S${r}`, result: ventaItem },
          { formula: `R${r}*S${r}`, result: costoItem },
          abonoItem,
          { formula: `T${r}-V${r}`, result: saldoItem },
          abonoYesItem,
          { formula: `U${r}-X${r}`, result: pendProvItem },
          { formula: `T${r}-U${r}`, result: gananciaItem },
          { formula: `W${r}-Z${r}/2`, result: saldoItem - gananciaItem / 2 }
        ]);
        row.eachCell((cell, colNumber) => {
          cell.font = THEME.bodyFont;
          cell.border = THEME.thinBorder;
          cell.fill = zebra;
          cell.alignment = { vertical: 'center', wrapText: colNumber === 11 };
          if (MONEY_R.has(colNumber)) { cell.numFmt = THEME.moneyFmt; cell.alignment = { horizontal: 'right', vertical: 'center' }; }
          else if (CENTER_R.has(colNumber)) { cell.alignment = { horizontal: 'center', vertical: 'center' }; }
          // Estado con color
          if (colNumber === 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(statusBg[eItem] || '#FFFFFF') } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: hexToArgb(statusFg[eItem] || '#000000') } };
            cell.alignment = { horizontal: 'center', vertical: 'center' };
          }
          // Vendedor con color
          if (colNumber === 6) {
            if (v.vendedor === 'Samir') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1D4ED8' } }; }
            else if (v.vendedor === 'Valentina') { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F8' } }; cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFBE185D' } }; }
            cell.alignment = { horizontal: 'center', vertical: 'center' };
          }
          // Negritas: Saldo y Me queda
          if (colNumber === 23 || colNumber === 27) { cell.font = { name: 'Calibri', size: 10, bold: true }; }
        });
      });
    });
    // ---- Hoja Cuentas (18 columnas, fórmulas =J*L, =M-O, =M-N, =P-Q/2) ----
    const MONEY_C = new Set([10, 11, 13, 14, 15, 16, 17, 18]);
    const CENTER_C = new Set([1, 2, 3, 4, 7, 8, 9, 12]);
    let lastC = null; let toggleC = false;
    data.forEach(v => {
      if (v.id !== lastC) { toggleC = !toggleC; lastC = v.id; }
      const zebraC = toggleC ? THEME.zebraA : THEME.zebraB;
      let itemsC = null;
      try { itemsC = JSON.parse(v.items_camisa); } catch (e) { itemsC = null; }
      if (!itemsC || !Array.isArray(itemsC) || itemsC.length === 0) itemsC = [{ genero: v.genero || '', color: v.color || '', talla: v.talla || '', programa: v.cliente_programa || '' }];
      const cantAllC = Number(v.cantidad) || 1;
      const nIC = itemsC.length;
      const baseC = nIC === 1 ? cantAllC : Math.floor(cantAllC / nIC);
      const restoC = nIC === 1 ? 0 : cantAllC - baseC * nIC;
      const entregaC = (v.fecha_entrega || 'Pendiente por definir') + (v.lugar_entrega ? ' · ' + v.lugar_entrega : '');
      const eCb = normalizarEstado(v.estado || '');
      itemsC.forEach((it, idxC) => {
        const cantItemC = nIC === 1 ? cantAllC : baseC + (idxC < restoC ? 1 : 0);
        const pC = precioDeItem(it, v);
        const cC = costoDeItem(it, v);
        const abC = (it.abono != null && it.abono !== '' && !isNaN(Number(it.abono))) ? Number(it.abono) : (Number(v.abono) || 0) / nIC;
        const eItemC = it.estado ? normalizarEstado(it.estado) : eCb;
        const r = wsC.rowCount + 1;
        const rowC = wsC.addRow([
          v.fecha, entregaC, eItemC, v.vendedor, v.cliente_nombre, v.nota,
          it.genero, capitalizarColor(it.color), it.talla, pC, cC, cantItemC,
          { formula: `J${r}*L${r}`, result: pC * cantItemC },
          { formula: `K${r}*L${r}`, result: cC * cantItemC },
          abC,
          { formula: `M${r}-O${r}`, result: (pC * cantItemC) - abC },
          { formula: `M${r}-N${r}`, result: (pC * cantItemC) - (cC * cantItemC) },
          { formula: `P${r}-Q${r}/2`, result: ((pC * cantItemC) - abC) - (((pC * cantItemC) - (cC * cantItemC)) / 2) }
        ]);
        rowC.eachCell((cell, colNumber) => {
          cell.font = THEME.bodyFont;
          cell.border = THEME.thinBorder;
          cell.fill = zebraC;
          cell.alignment = { vertical: 'center', wrapText: colNumber === 6 };
          if (MONEY_C.has(colNumber)) { cell.numFmt = THEME.moneyFmt; cell.alignment = { horizontal: 'right', vertical: 'center' }; }
          else if (CENTER_C.has(colNumber)) { cell.alignment = { horizontal: 'center', vertical: 'center' }; }
          if (colNumber === 3) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(statusBg[eItemC] || '#FFFFFF') } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: hexToArgb(statusFg[eItemC] || '#000000') } };
            cell.alignment = { horizontal: 'center', vertical: 'center' };
          }
          if (colNumber === 16 || colNumber === 18) { cell.font = { name: 'Calibri', size: 10, bold: true }; }
        });
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Reporte_Ventas_Camisas_IUB_' + hoyColombia() + '.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast('✅ Reporte Excel exportado (Reporte + Cuentas).');
    } catch (err) {
      logError('exportarExcelCompleto', err);
      mostrarToast('Error al exportar: ' + (err.message || err), 'error');
    } finally {
      showLoading(false);
    }
  }

  /* =====================================================
     ACCIONES DIRECTAS VENTAS
     ===================================================== */
  async function updateEstado(id, estado, selectEl) {
    const venta = ventasCache.find(v => v.id === id);
    if (estado === 'Liquidado' && venta) {
      if (!todosItemsListosEntrega(venta)) {
        mostrarToast('Para liquidar un pedido, TODAS sus camisas deben estar Entregado (o Liquidado). Mira el estado de cada camisa.', 'error');
        if (selectEl) selectEl.value = selectEl.dataset.prev || venta.estado;
        return;
      }
      const check = puedeMarcarPagado(venta);
      if (!check.ok) {
        mostrarToast('No puedes marcar como Liquidado:\n\n• ' + check.faltas.join('\n• '), 'error');
        if (selectEl) selectEl.value = selectEl.dataset.prev || venta.estado;
        return;
      }
    }

    try {
      const payload = { estado, updated_at: new Date().toISOString() };
      if (estado === 'Comprado' && !venta.comprado_at) {
        payload.comprado_at = new Date().toISOString();
      } else if (venta.comprado_at) {
        payload.comprado_at = venta.comprado_at;
      }
      const crudos = itemsCrudosVenta(venta);
      if (crudos) {
        crudos.forEach(it => { it.estado = estado; });
        payload.items_camisa = JSON.stringify(crudos);
      }
      let res = await supabaseClient.from('ventas').update(payload).eq('id', id);
      if (res.error && String(res.error.message).toLowerCase().match(/updated_at|comprado_at/)) {
        delete payload.updated_at; delete payload.comprado_at;
        res = await supabaseClient.from('ventas').update(payload).eq('id', id);
        if (res.error) throw res.error;
      } else if (res.error) throw res.error;
      await loadVentas();
      if (estado === 'Liquidado') {
        await sugerirLiquidadoSiListo(id);
      }
    } catch (err) {
      if (selectEl && venta) selectEl.value = selectEl.dataset.prev || venta.estado;
    }
  }

  let abonoVentaId = null;

  function abrirModalAbono(id) {
    const venta = ventasCache.find(v => v.id === id);
    if (!venta) return;
    abonoVentaId = id;

    const abonoActual = abonoClienteTotal(venta);
    const precio = precioTotalVenta(venta);
    const saldo = Math.max(precio - abonoActual, 0);

    document.getElementById('abono-cliente').textContent = venta.cliente_nombre || 'Cliente';
    document.getElementById('abono-actual').textContent = fmt(abonoActual);
    const elSaldo = document.getElementById('abono-saldo');
    elSaldo.textContent = fmt(saldo);
    elSaldo.style.color = saldo > 0 ? 'var(--warn)' : 'var(--ok)';

    const inp = document.getElementById('abono-monto');
    inp.value = '';
    inp.dataset.saldo = saldo;
    const err = document.getElementById('abono-error');
    err.classList.add('hidden');
    err.textContent = '';

    const nota = document.getElementById('abono-nota');
    const camisas = (itemsCrudosVenta(venta) || []).length;
    nota.textContent = camisas > 1
      ? `Se repartirá entre las ${camisas} camisas del pedido. Si necesitas repartirlo distinto, usa "Editar".`
      : 'El abono se suma al que ya tiene el pedido.';

    document.getElementById('abono-modal').classList.remove('hidden');
    bloquearScrollFondo();
    setTimeout(() => inp.focus(), 60);
  }

  function cerrarModalAbono() {
    document.getElementById('abono-modal').classList.add('hidden');
    desbloquearScrollFondo();
    abonoVentaId = null;
  }

  async function addAbono(id) {
    if (!id) id = abonoVentaId;
    const venta = ventasCache.find(v => v.id === id);
    if (!venta) { mostrarToast('No se encontró el pedido.', 'error'); cerrarModalAbono(); return; }

    const errEl = document.getElementById('abono-error');
    const inp = document.getElementById('abono-monto');
    const monto = parseFloat(inp.value);

    if (isNaN(monto) || monto <= 0) {
      errEl.textContent = 'Escribe un monto mayor que cero.';
      errEl.classList.remove('hidden');
      inp.focus();
      return;
    }
    const saldo = Math.max(precioTotalVenta(venta) - abonoClienteTotal(venta), 0);
    if (saldo > 0 && monto > saldo + 1) {
      const ok = confirmar(`El monto (${fmt(monto)}) es mayor que el saldo pendiente (${fmt(saldo)}).\n\n¿Registrarlo de todos modos?`);
      if (!ok) {
        errEl.textContent = `El saldo pendiente es ${fmt(saldo)}.`;
        errEl.classList.remove('hidden');
        return;
      }
    }

    const nuevoAbono = (Number(venta.abono) || 0) + monto;
    const payload = { abono: nuevoAbono, updated_at: new Date().toISOString() };

    if (venta.items_camisa) {
      try {
        const items = JSON.parse(venta.items_camisa);
        if (Array.isArray(items) && items.length > 0) {
          // Reparto exacto: base entera + el resto de pesos a las primeras camisas.
          // Antes se dividia tal cual (monto / items.length) y quedaban decimales:
          // 10.000 en 3 camisas daba 3333.333... y la suma era 9999.999... ≠ 10.000.
          const n = items.length;
          const base = Math.floor(monto / n);
          const resto = Math.round(monto - base * n);
          items.forEach((it, i) => {
            items[i].abono = (Number(items[i].abono) || 0) + base + (i < resto ? 1 : 0);
          });
          payload.items_camisa = JSON.stringify(items);
        }
      } catch (e) { logError('addAbono:parseItems', e); }
    }

    try {
      let res = await supabaseClient.from('ventas').update(payload).eq('id', id);
      if (res.error && String(res.error.message).toLowerCase().includes('updated_at')) {
        delete payload.updated_at;
        res = await supabaseClient.from('ventas').update(payload).eq('id', id);
        if (res.error) throw res.error;
      } else if (res.error) throw res.error;
      await loadVentas();
      cerrarModalAbono();
      mostrarToast('Abono agregado correctamente');
    } catch (err) { logError('addAbono:update', err); mostrarToast('Error al agregar abono', 'error'); }
  }

  // NOTA: deleteVenta vive arriba, en la sección de confirmación y papelera.


  /* =====================================================
     HISTORIAL DE PEDIDOS (finalizados)
     ===================================================== */
  async function finalizarVenta(id) {
    const venta = ventasCache.find(v => v.id === id);
    if (!venta) return;
    if (!estadosTodosLiquidado(venta)) {
      mostrarToast('Para finalizar el pedido, TODAS sus camisas deben estar en estado Liquidado.', 'error');
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
        estadosItemsVenta(v).some(e => e.toLowerCase().includes(qh)) ||
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
      const venta = precioTotalVenta(v);
      const abonoCliente = abonoClienteTotal(v);
      const restanteCliente = venta - abonoCliente;
      const detalle = itemsDetalleHtml(v);
      const esAdmin = currentRole.role === 'admin';

      return `
        <tr data-id="${v.id}">
          <td>${v.fecha ? formatearFechaHumana(v.fecha) : ''}<span class="sub-tag">🕐 ${horaDeVenta(v) || ''}</span></td>
          <td><b>${escSimple(v.vendedor || '')}</b></td>
          <td>
            <b>${escSimple(v.cliente_nombre || '')}</b>
            <span class="sub-tag">📞 ${escSimple(v.cliente_telefono || '')}</span>
          </td>
          <td>
            <div style="margin-bottom:6px;">${badgeModeloVenta(v)}</div>
            ${detalle}
          </td>
          <td><b>${cant}</b></td>
          <td class="money">${fmt(venta)}</td>
          <td class="money">${fmt(abonoCliente)}</td>
          <td class="money" style="color:${restanteCliente > 0 ? 'var(--warn)' : 'var(--ok)'}">${fmt(restanteCliente)}</td>
          <td>
            <span class="humano-fecha">${textoFechaEntrega(v)}</span>
            <span class="sub-tag">📍 ${escSimple(v.lugar_entrega || 'Sin definir')} · 🚚 ${escSimple(v.entrega_por || 'Sin asignar')}</span>
          </td>
          <td>${badgeEstadoGeneral(v)}${v.comprado_at ? `<span class="sub-tag" style="color:var(--teal-ink);">🛒 ${formatearCompradoAt(v)}</span>` : ''}</td>
          <td>
            <div class="action-group">
              ${esAdmin ? `<button class="btn-small editar-historial-button" data-id="${v.id}" type="button">✏️ Editar</button>` : ''}
              <button class="btn-small restaurar-button" data-id="${v.id}" type="button">Restaurar</button>
              <button class="btn-small recibo-button" data-id="${v.id}" type="button" title="Imprimir recibo del pedido">🧾 Recibo</button>
              ${esAdmin ? `<button class="btn-danger borrar-historial-button" data-id="${v.id}" type="button">Borrar</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.editar-historial-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const venta = ventasCache.find(v => v.id === button.dataset.id);
        if (venta) openForm(venta);
      });
    });

    document.querySelectorAll('.restaurar-button').forEach(button => {
      button.addEventListener('click', () => restaurarPedido(button.dataset.id));
    });

    document.querySelectorAll('.recibo-button').forEach(button => {
      button.addEventListener('click', () => imprimirRecibo(button.dataset.id));
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

  /* =====================================================
     CUENTAS POR CLIENTE + FACTURA PERSONALIZADA
     ===================================================== */
  function getCuentasAgrupadas() {
    const esAdmin = currentRole.role === 'admin';
    const miNombre = currentRole.vendedor;
    let base = ventasCache.filter(v => !v.finalizado && !estadosTodosLiquidado(v));
    if (!esAdmin && miNombre) base = base.filter(v => v.vendedor === miNombre);
    const grupos = new Map();
    base.forEach(v => {
      const clave = claveCliente(v);
      if (!grupos.has(clave)) grupos.set(clave, { clave, pedidos: [], telefono: '' });
      grupos.get(clave).pedidos.push(v);
    });
    const filas = [];
    grupos.forEach(g => {
      g.cliente = etiquetaClienteGrupo(g.pedidos);
      const tel = g.pedidos.find(p => String(p.cliente_telefono||'').trim());
      g.telefono = tel ? String(tel.cliente_telefono).trim() : '';
      g.vendedores = [...new Set(g.pedidos.map(p => p.vendedor).filter(Boolean))].join(', ');
      g.pedidos.sort((a,b)=> String(a.fecha||'').localeCompare(String(b.fecha||'')));
      g.camisas = g.pedidos.reduce((s,v)=> s + (Number(v.cantidad)||1), 0);
      g.vendido = g.pedidos.reduce((s,v)=> s + precioTotalVenta(v), 0);
      g.abono = g.pedidos.reduce((s,v)=> s + abonoClienteTotal(v), 0);
      g.saldo = Math.max(g.vendido - g.abono, 0);
      g.ultimaEntrega = g.pedidos.map(v=>v.fecha_entrega).filter(Boolean).sort().pop() || '';
      filas.push(g);
    });
    return filas;
  }

  function renderCuentas() {
    const q = (document.getElementById('filter-cuentas-search')?.value || '').toLowerCase().trim();
    let filas = getCuentasAgrupadas();
    if (q) {
      filas = filas.filter(r => (r.cliente||'').toLowerCase().includes(q) || (r.telefono||'').toLowerCase().includes(q) || r.clave.toLowerCase().includes(q) || (r.vendedores||'').toLowerCase().includes(q));
    }
    filas = ordenarFilas(filas, 'cuentas', REGISTRO_ORDEN.cuentas.campos);
    const body = document.getElementById('cuentas-body');
    const empty = document.getElementById('cuentas-empty-state');
    if (!body) return;
    const totalSaldo = filas.reduce((s,r)=> s + r.saldo, 0);
    const totalClientes = filas.length;
    const totalCamisas = filas.reduce((s,r)=> s + r.camisas, 0);
    const kpis = document.getElementById('cuentas-kpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="card"><div class="eyebrow">Total por cobrar</div><div class="value warn">${fmt(totalSaldo)}</div><div class="sub">${totalClientes} clientes · ${totalCamisas} camisas</div></div>
        <div class="card"><div class="eyebrow">Clientes con deuda</div><div class="value">${filas.filter(r=>r.saldo>0).length}</div><div class="sub">Con saldo &gt; 0</div></div>
        <div class="card"><div class="eyebrow">Deuda promedio</div><div class="value">${fmt(totalClientes ? Math.round(totalSaldo/totalClientes) : 0)}</div><div class="sub">Por cliente</div></div>
      `;
    }
    if (empty) empty.classList.toggle('hidden', filas.length > 0);
    const totalPages = Math.ceil(filas.length / PAGE_SIZE) || 1;
    if (paginationState.cuentas > totalPages - 1) paginationState.cuentas = totalPages - 1;
    const start = paginationState.cuentas * PAGE_SIZE;
    const pageRows = filas.slice(start, start + PAGE_SIZE);
    body.innerHTML = pageRows.map(r => {
      const pedidosTxt = r.pedidos.length === 1 ? '1 pedido' : `${r.pedidos.length} pedidos`;
      const entregaTxt = r.ultimaEntrega ? formatearFechaHumana(r.ultimaEntrega).replace(/^📅\s*/,'') : 'Sin fecha';
      return `
        <tr>
          <td style="max-width:220px;"><b>${escSimple(r.cliente)}</b><span class="sub-tag">📞 ${escSimple(r.telefono||r.clave)} · ${pedidosTxt}</span></td>
          <td>${escSimple(r.vendedores || '—')}</td>
          <td class="c"><b>${r.pedidos.length}</b></td>
          <td class="c">${r.camisas}</td>
          <td class="money">${fmt(r.vendido)}</td>
          <td class="money" style="color:var(--ok)">${fmt(r.abono)}</td>
          <td class="money" style="color:${r.saldo>0?'var(--warn)':'var(--ok)'}"><b>${fmt(r.saldo)}</b></td>
          <td>
            <div class="action-group">
              <button class="btn-small" onclick="openFacturaModal('${argOnClick(r.clave)}')" type="button">🧾 Factura</button>
              <button class="btn-small" onclick="verPedidosCliente('${argOnClick(r.clave)}')" type="button">👁️ Pedidos</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    let pag = document.getElementById('cuentas-pagination');
    if (!pag) { pag = document.createElement('div'); pag.id='cuentas-pagination'; body.parentElement.appendChild(pag); }
    pag.innerHTML = renderPagination(filas.length, paginationState.cuentas, 'cuentas', 'irPaginaCuentas');
    marcarOrdenTabla('cuentas');
  }
  function irPaginaCuentas(p){ paginationState.cuentas = p; renderCuentas(); }
  function verPedidosCliente(clave){
    const inp = document.getElementById('filter-search');
    if (inp) { inp.value = clave; inp.dispatchEvent(new Event('input', {bubbles:true})); }
    navigateTo('orders');
    paginationState.orders = 0; renderTable();
  }
  let facturaClienteClave = null;
  function openFacturaModal(clave){
    facturaClienteClave = clave;
    const grupo = getCuentasAgrupadas().find(g=> g.clave===clave);
    if (!grupo) { mostrarToast('Cliente no encontrado', 'error'); return; }
    document.getElementById('factura-modal-title').textContent = `Factura — ${grupo.cliente}`;
    document.getElementById('factura-modal-sub').textContent = `${grupo.pedidos.length} pedido(s) · ${grupo.camisas} camisa(s) · Saldo ${fmt(grupo.saldo)} · Elige qué pedidos y camisas incluir`;
    const cont = document.getElementById('factura-pedidos-lista');
    cont.innerHTML = grupo.pedidos.map(v=>{
      const crudos = itemsCrudosVenta(v);
      const items = crudos && crudos.length ? crudos : [{genero:v.genero||'', color:v.color||'', talla:v.talla||'', programa:v.cliente_programa||'', precio:v.precio_unitario||0, costo:v.costo_unitario||0, abono:0, estado: v.estado||'Pedido'}];
      const fechaTxt = v.fecha ? formatearFechaHumana(v.fecha).replace(/^📅\s*/,'') : '?';
      const compradoTag = v.comprado_at ? `<span class="sub-tag" style="color:var(--teal-ink)">🛒 ${formatearCompradoAt(v)}</span>` : '';
      const notaTag = v.nota ? `<span class="sub-tag" style="color:var(--warn)">📝 ${escSimple(v.nota.slice(0,60))}${v.nota.length>60?'…':''}</span>` : '';
      return `
        <div class="pedido-block" data-pedido-id="${v.id}">
          <label class="pedido-check-row" style="background:var(--accent-bg); font-weight:700;">
            <input type="checkbox" class="factura-pedido-check" data-pedido-id="${v.id}" checked>
            <span>${escSimple(fechaTxt)} · ${badgeEstadoGeneral(v)} · ${items.length} camisa(s) · ${fmt(precioTotalVenta(v))}</span>
            <span class="pedido-costo-tag">${fmt(abonoClienteTotal(v))} abono</span>
          </label>
          <div class="factura-camisa-lista" style="padding:8px 10px; background:var(--card);">
            ${items.map((it, idx)=>{
              const desc = `${it.genero||'?'} · ${capitalizarColor(it.color)} · ${it.talla||'?'}${it.programa ? ' · '+escSimple(it.programa) : ''}`;
              const p = precioDeItem(it, v);
              const ab = Number(it.abono)||0;
              return `
                <label class="pedido-check-row" style="padding:6px 6px;">
                  <input type="checkbox" class="factura-camisa-check" data-pedido-id="${v.id}" data-item-idx="${idx}" checked>
                  <span style="flex:1">• ${escSimple(desc)} <span class="money" style="font-size:11px; color:var(--muted)">${fmt(p)}/${fmt(ab)}${it.estado ? ' · '+escSimple(it.estado) : ''}</span></span>
                  ${compradoTag} ${notaTag}
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
    cont.querySelectorAll('.factura-pedido-check').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const pid = cb.dataset.pedidoId;
        cont.querySelectorAll(`.factura-camisa-check[data-pedido-id="${pid}"]`).forEach(c=> { c.checked = cb.checked; });
        actualizarResumenFactura();
      });
    });
    cont.querySelectorAll('.factura-camisa-check').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const pid = cb.dataset.pedidoId;
        const pChecks = Array.from(cont.querySelectorAll(`.factura-camisa-check[data-pedido-id="${pid}"]`));
        const all = pChecks.every(c=>c.checked);
        const none = pChecks.every(c=>!c.checked);
        const pedCb = cont.querySelector(`.factura-pedido-check[data-pedido-id="${pid}"]`);
        if (pedCb) pedCb.checked = all;
        if (none) pedCb.checked = false;
        if (!all && !none) pedCb.checked = true;
        actualizarResumenFactura();
      });
    });
    actualizarResumenFactura();
    document.getElementById('factura-modal').classList.remove('hidden');
    bloquearScrollFondo();
  }
  function closeFacturaModal(){ document.getElementById('factura-modal').classList.add('hidden'); desbloquearScrollFondo(); facturaClienteClave=null; }
  function actualizarResumenFactura(){
    const cont = document.getElementById('factura-pedidos-lista');
    if (!cont) return;
    let camisas=0, total=0, abono=0;
    const notasSet = new Set();
    cont.querySelectorAll('.factura-camisa-check:checked').forEach(cb=>{
      const v = ventasCache.find(x=> x.id===cb.dataset.pedidoId);
      if (!v) return;
      const crudos = itemsCrudosVenta(v);
      const it = crudos && crudos[Number(cb.dataset.itemIdx)] ? crudos[Number(cb.dataset.itemIdx)] : null;
      const p = it ? precioDeItem(it, v) : (Number(v.precio_unitario)||0);
      const a = it ? (Number(it.abono)||0) : 0;
      camisas += 1;
      total += p;
      abono += a;
      if (v.nota && String(v.nota).trim()) notasSet.add(String(v.nota).trim());
    });
    document.getElementById('factura-resumen-camisas').textContent = camisas;
    document.getElementById('factura-resumen-total').textContent = fmt(total);
    document.getElementById('factura-resumen-abono').textContent = fmt(abono);
    document.getElementById('factura-resumen-saldo').textContent = fmt(Math.max(total-abono,0));
    const notasPrev = document.getElementById('factura-notas-preview');
    if (notasPrev) {
      if (notasSet.size) notasPrev.innerHTML = `<b>Notas incluidas:</b> ${Array.from(notasSet).map(n=> escSimple(n)).join(' · ')}`;
      else notasPrev.textContent = 'Sin notas en los pedidos seleccionados';
    }
  }
  function generarFacturaPersonalizada(){
    const cont = document.getElementById('factura-pedidos-lista');
    if (!cont || !facturaClienteClave) return;
    const grupo = getCuentasAgrupadas().find(g=> g.clave===facturaClienteClave);
    if (!grupo) return;
    const seleccion = [];
    cont.querySelectorAll('.factura-camisa-check:checked').forEach(cb=>{
      const v = ventasCache.find(x=> x.id===cb.dataset.pedidoId);
      if (!v) return;
      const crudos = itemsCrudosVenta(v);
      const it = crudos && crudos[Number(cb.dataset.itemIdx)] ? crudos[Number(cb.dataset.itemIdx)] : {genero:v.genero, color:v.color, talla:v.talla, programa:v.cliente_programa, precio:v.precio_unitario, costo:v.costo_unitario, abono:0};
      seleccion.push({ venta:v, item:it, pedidoId:v.id });
    });
    if (seleccion.length===0){ document.getElementById('factura-error').textContent='Selecciona al menos una camisa'; document.getElementById('factura-error').classList.remove('hidden'); return; }
    document.getElementById('factura-error').classList.add('hidden');
    // Reusar plantilla de imprimirRecibo pero con múltiples pedidos
    const cliente = grupo.cliente;
    const telefono = grupo.telefono;
    const total = seleccion.reduce((s,x)=> s + precioDeItem(x.item, x.venta), 0);
    const abonoTot = seleccion.reduce((s,x)=> s + (Number(x.item.abono)||0), 0);
    const saldo = Math.max(total - abonoTot, 0);
    const notasUnicas = Array.from(new Set(seleccion.map(x=> String(x.venta.nota||'').trim()).filter(Boolean)));
    const notaTxt = notasUnicas.join(' · ');
    const filas = seleccion.map((x,i)=>{
      const it = x.item; const v = x.venta;
      const p = precioDeItem(it, v);
      const ab = Number(it.abono)||0;
      const desc = [capitalizarColor(it.color), it.talla ? `Talla ${it.talla}` : '', it.genero||'', etiquetaModelo(it.modelo)||''].filter(Boolean).join(' · ');
      const prog = it.programa ? `<div class="prog">Bordado: ${escSimple(it.programa)}</div><div class="prog" style="font-size:10px;color:var(--muted)">Pedido: ${escSimple(v.fecha||'')} · ${escSimple(v.estado||'')}</div>` : `<div class="prog" style="font-size:10px;color:var(--muted)">Pedido: ${escSimple(v.fecha||'')} · ${escSimple(v.estado||'')}</div>`;
      return `<tr><td class="c">${i+1}</td><td>${escSimple(desc)}${prog}</td><td class="c">1</td><td class="money">${fmt(p)}</td><td class="money">${fmt(ab)}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Factura — ${escSimple(cliente)}</title><style>
  :root{--ink:#0F172A;--muted:#64748B;--line:#E2E8F0;--bg:#F8FAFC;--gold:#B45309}
  *{box-sizing:border-box} body{font-family:Inter, Segoe UI, Arial, sans-serif; color:var(--ink); margin:0; background:#fff; font-size:13px; line-height:1.45}
  .sheet{max-width:780px; margin:0 auto; padding:24px} .toolbar{display:flex; gap:8px; justify-content:flex-end; margin-bottom:14px} .btn{padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:#fff; cursor:pointer; font-weight:700; font-size:12px} .btn-primary{background:var(--ink); color:#fff; border-color:var(--ink)}
  .brand{display:flex; justify-content:space-between; align-items:flex-start; gap:16px; border-bottom:3px solid var(--ink); padding-bottom:14px; margin-bottom:16px} .brand h1{margin:0; font-size:26px; letter-spacing:.06em; line-height:1} .meta{text-align:right; font-size:12px; line-height:1.35} .meta .num{font-size:18px; font-weight:800} .meta .date{color:var(--muted)}
  .grid2{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px} @media(max-width:640px){.grid2{grid-template-columns:1fr}} .card{border:1px solid var(--line); border-radius:10px; padding:12px; background:var(--bg)} .card h3{margin:0 0 8px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)} .kv{display:grid; grid-template-columns:108px 1fr; gap:4px 8px; font-size:13px} .kv dt{color:var(--muted)} .kv dd{margin:0; font-weight:600; word-break:break-word}
  table{width:100%; border-collapse:collapse; border:1px solid var(--line); border-radius:10px; overflow:hidden; margin:0} th{background:var(--ink); color:#fff; font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:9px 8px; text-align:left} th.c, td.c{text-align:center} th.money, td.money{text-align:right} td{padding:9px 8px; border-top:1px solid var(--line); vertical-align:top; font-size:13px} tr:nth-child(even) td{background:#F8FAFC} .prog{font-size:11px; color:#475569; margin-top:3px}
  .totals{display:flex; justify-content:flex-end; margin-top:14px} .totals-box{width:340px; border:1px solid var(--line); border-radius:10px; overflow:hidden} .row{display:flex; justify-content:space-between; padding:10px 12px; border-top:1px solid var(--line); background:#fff} .row:first-child{border-top:none} .row.total{background:var(--ink); color:#fff; font-weight:800; font-size:15px} .row b{font-variant-numeric:tabular-nums} .note{margin-top:12px; border:1px dashed var(--line); border-radius:10px; padding:10px 12px; background:#FFFEFB; font-size:12px; color:#334155} .foot{text-align:center; color:var(--muted); font-size:11px; margin-top:16px; border-top:1px solid var(--line); padding-top:10px} @media print{.toolbar{display:none} body{margin:0} .sheet{padding:10mm} @page{margin:10mm}}
  </style></head><body><div class="sheet"><div class="toolbar"><button class="btn" onclick="window.close()" type="button">Cerrar</button><button class="btn btn-primary" onclick="window.print()" type="button">🖨️ Imprimir / Guardar PDF</button></div>
    <div class="brand"><div><h1>CAMISAS IUB</h1><div class="tag">Factura personalizada</div></div><div class="meta"><div class="num">FACTURA — ${escSimple(cliente)}</div><div class="date">${new Date().toLocaleDateString('es-CO',{timeZone:'America/Bogota'})} · ${seleccion.length} camisa(s) · ${grupo.pedidos.length} pedido(s) cliente</div></div></div>
    <div class="grid2"><div class="card"><h3>Cliente</h3><dl class="kv"><dt>Nombre</dt><dd>${escSimple(cliente)}</dd><dt>Teléfono</dt><dd>${escSimple(telefono||'—')}</dd><dt>Entrega</dt><dd>Entrega conjunta</dd></dl></div><div class="card"><h3>Resumen</h3><dl class="kv"><dt>Pedidos incluidos</dt><dd>${seleccion.length} camisas seleccionadas</dd><dt>Total</dt><dd>${fmt(total)}</dd><dt>Abono</dt><dd>${fmt(abonoTot)}</dd><dt>Saldo</dt><dd>${fmt(saldo)}</dd></dl></div></div>
    <table><thead><tr><th style="width:36px">#</th><th>Descripción</th><th class="c" style="width:52px">Cant.</th><th class="money" style="width:96px">Precio</th><th class="money" style="width:96px">Abono</th></tr></thead><tbody>${filas}</tbody></table>
    ${notaTxt ? `<div class="note"><b>Notas de los pedidos:</b> ${escSimple(notaTxt)}</div>` : ''}
    <div class="totals"><div class="totals-box"><div class="row"><span>Total</span><b>${fmt(total)}</b></div><div class="row"><span>Abono</span><b>${fmt(abonoTot)}</b></div><div class="row total"><span>Saldo por pagar</span><b>${fmt(saldo)}</b></div></div></div>
    <div class="foot">Gracias por tu pedido 💙 — Camisas IUB<br>${new Date().toLocaleString('es-CO',{timeZone:'America/Bogota', dateStyle:'full', timeStyle:'short'})} · Este documento no es factura fiscal</div></div><script>window.onload=function(){ setTimeout(function(){ window.print(); },150);}<\/script></body></html>`;
    const w = window.open('', '_blank', 'width=820,height=720');
    if (!w){ mostrarToast('Permite las ventanas emergentes para imprimir.', 'error'); return; }
    w.document.write(html); w.document.close();
  }
  window.closeFacturaModal = closeFacturaModal;
  window.openFacturaModal = openFacturaModal;
  window.generarFacturaPersonalizada = generarFacturaPersonalizada;
  window.verPedidosCliente = verPedidosCliente;


