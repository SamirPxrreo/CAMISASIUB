/* Mejoras de presentación. No contiene lógica de negocio: etiquetas para vista
   móvil, clases para animar avisos y contadores animados en tarjetas.
   app.v2.js queda intacto. */
(function () {
  var TBODIES = ['ventas-body', 'historial-body', 'compras-body', 'liquidaciones-body', 'usuarios-body'];

  function applyLabels() {
    TBODIES.forEach(function (id) {
      var tbody = document.getElementById(id);
      if (!tbody || !tbody.rows || !tbody.rows.length) return;
      var table = tbody.closest('table');
      if (!table) return;
      var ths = Array.prototype.map.call(
        table.querySelectorAll('thead th'),
        function (th) { return th.textContent.trim(); }
      );
      Array.prototype.forEach.call(tbody.rows, function (tr) {
        Array.prototype.forEach.call(tr.cells, function (td, i) {
          if (!td.hasAttribute('data-label') && ths[i]) td.setAttribute('data-label', ths[i]);
        });
      });
    });
  }

  function watchToasts() {
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.tagName === 'DIV' && n.id !== 'loading-spinner' &&
              n.style && n.style.zIndex === '9999') {
            n.classList.add('toast');
          }
        });
      });
    });
    obs.observe(document.body, { childList: true });
  }

  function nombreSesion() {
    // Antes se sacaba el nombre de la etiqueta de sesion, que dice
    // "Sesión: admin@gmail.com (Administrador)". De ahi salia un fragmento del
    // correo: a la administradora le decia "Admin" (que es el rol, no el
    // nombre) y a Valentina "Val" (tres letras, por cortar en la arroba).
    //
    // Ahora se usa currentRole.nombre, que app.v2.js arma con el nombre real
    // de la tabla de usuarios. Si no esta (un usuario nuevo todavia sin fila),
    // se cae al fragmento del correo como antes, que al menos no queda vacio.
    const rol = window.currentRole;
    if (rol && rol.nombre) {
      const n = String(rol.nombre).trim();
      if (n) return n;
    }
    const who = document.getElementById('who-label');
    const m = who ? who.textContent.match(/Sesión:\s*([^@\s(]+)/) : null;
    if (!m) return '';
    const n = m[1].trim();
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  function saludoHora() {
    try {
      const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }));
      if (h >= 5 && h < 12) return 'Buenos días';
      if (h >= 12 && h < 19) return 'Buenas tardes';
      return 'Buenas noches';
    } catch (e) { return 'Hola'; }
  }

  function fechaHoy() {
    try {
      return new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) { return ''; }
  }

  function ensureGreeting() {
    const cont = document.getElementById('dashboard-contenido');
    if (!cont || !cont.innerHTML.trim()) return;
    const nombre = nombreSesion();
    const crit = cont.querySelectorAll('.alert-item.critical').length;
    const warn = cont.querySelectorAll('.alert-item.warning').length;
    const total = crit + warn;
    let g = cont.querySelector(':scope > .dash-greet');
    if (!g) {
      g = document.createElement('div');
      g.className = 'dash-greet';

      // El <h1> va con el NOMBRE DE LA PANTALLA, no con el saludo.
      //
      // Antes el saludo con el nombre ("Buenas tardes, Samir") era el titulo
      // principal. Con lector de pantalla eso no dice en que pantalla estas: es
      // una linea de cortesia, no un encabezado. Ahora el <h1> es "Inicio", que
      // si responde "donde estoy", y el saludo queda como una linea de apoyo
      // debajo, donde aporta.
      //
      // Las demas pantallas usan .page-title, y este es su equivalente en el
      // Inicio, que lo arma JavaScript y por eso no estaba en el HTML.
      g.innerHTML = '<h1 class="page-title"></h1><p class="dash-saludo"></p><p></p>';
      cont.prepend(g);
    }
    const h1 = 'Inicio';
    const saludo = nombre ? saludoHora() + ', ' + nombre : saludoHora();
    const sub = fechaHoy() + (total > 0 ? ' · <strong>' + total + (total === 1 ? ' asunto pendiente' : ' asuntos pendientes') + '</strong>' : ' · Todo al día');

    if (g.querySelector('h1').textContent !== h1) g.querySelector('h1').textContent = h1;
    if (g.querySelector('.dash-saludo').textContent !== saludo) g.querySelector('.dash-saludo').textContent = saludo;
    if (g.querySelector('p:not(.dash-saludo)').innerHTML !== sub) g.querySelector('p:not(.dash-saludo)').innerHTML = sub;
  }

  function esReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function formatearNumeroES(n) {
    return Math.round(n).toLocaleString('es-CO');
  }

  function animarContador(el) {
    if (!el || el.dataset.countado === '1') return;
    var texto = (el.textContent || '').trim();
    var nums = texto.match(/\d[\d.]*(?:[.,]\d+)?/g);
    if (!nums) return;
    var valor = parseFloat(nums[0].replace(/\./g, '').replace(',', '.'));
    if (!isFinite(valor)) return;
    el.dataset.countado = '1';
    if (esReducedMotion()) return;
    var prefijo = texto.slice(0, texto.indexOf(nums[0]));
    var sufijo = texto.slice(texto.indexOf(nums[0]) + nums[0].length);
    var duracion = 750;
    var t0 = null;
    function paso(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / duracion, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefijo + formatearNumeroES(valor * eased) + sufijo;
      if (p < 1) requestAnimationFrame(paso);
      else el.textContent = texto;
    }
    requestAnimationFrame(paso);
  }

  function procesarContadores() {
    var nodos = document.querySelectorAll('.kpi-value, .card .value, .kpi-card .value');
    Array.prototype.forEach.call(nodos, function (el) {
      if (el.closest('.modal-backdrop')) return;
      animarContador(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLabels();
    ensureGreeting();
    procesarContadores();
    const dash = document.getElementById('dashboard-contenido');
    if (dash) new MutationObserver(ensureGreeting).observe(dash, { childList: true });
    var obs = new MutationObserver(applyLabels);
    TBODIES.forEach(function (id) {
      var tb = document.getElementById(id);
      if (tb) obs.observe(tb, { childList: true, subtree: true });
    });
    watchToasts();
    var obsC = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length) { procesarContadores(); break; }
      }
    });
    obsC.observe(document.body, { childList: true, subtree: true });
  });
})();
