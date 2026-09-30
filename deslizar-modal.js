/* Deslizar para cerrar los modales, estilo app de celular.
   Solo presentación: no toca reglas de negocio ni datos. El CSS que
   acompaña esto está en hoja-modal.css (va incluido al final de styles.v2.css).

   En el computador no hace nada: sin eventos tactiles, no se dispara. */
(function () {
  'use strict';

  var hoja = null;         // la tarjeta que se está arrastrando
  var inicioY = 0;
  var inicioT = 0;
  var movido = false;
  var CERRAR_PX = 90;      // con sólo estos píxeles ya cuenta como cerrar
  var PROPORCION = 0.3;    // o el 30% de la altura de la hoja

  function esHojaModal(el) {
    return el && el.classList && el.classList.contains('modal-card');
  }

  // Si el contenido de la hoja ya está desplazado, el gesto es para
  // desplazar, no para arrastrar la hoja. Sin esto, no se podría bajar
  // dentro de un formulario largo.
  function contenidoDesplazado(card, punto) {
    var n = punto;
    while (n && n !== card) {
      if (n.scrollTop > 0) return true;
      n = n.parentElement;
    }
    return card.scrollTop > 0;
  }

  // Arma el transform de la hoja mientras se arrastra: baja un poco y se
  // achica. El achique va hasta 5% y solamente por cada 400px de recorrido, o
  // sea que a los 400px ya está al máximo; más allá no sigue encogiendo, para
  // que la hoja nunca se vuelva ilegible.
  //
  // Se usa scale() y no un transform con dos valores sueltos porque asi el
  // navegador puede Promise-resolver solo la parte de la escala.
  function arrastrar(dy) {
    var encogimiento = Math.min(dy / 400, 1) * 0.05;
    return 'translateY(' + dy + 'px) scale(' + (1 - encogimiento).toFixed(4) + ')';
  }

  function alTocar(e) {
    if (!e.touches || e.touches.length !== 1) return;
    var card = e.target.closest ? e.target.closest('.modal-card') : null;
    if (!esHojaModal(card)) return;
    var fondo = card.closest('.modal-backdrop');
    if (!fondo || fondo.classList.contains('hidden')) return;

    hoja = card;
    inicioY = e.touches[0].clientY;
    inicioT = Date.now();
    movido = false;
    hoja._tocaArriba = contenidoDesplazado(hoja, e.target);
    // Si el dedo empezó en el encabezado (o en el asa), el arrastre vale
    // siempre, esté el contenido desplazado o no. El encabezado está fijo, así
    // que arrastrarlo no puede querer decir "desplazar": solo hay una cosa que
    // pueda ser, y es cerrar la hoja.
    hoja._desdeTitulo = empiezaEnTitulo(card, e.target);
  }

  // ¿El punto donde empezó el toque está dentro del encabezado?
  function empiezaEnTitulo(card, nodo) {
    if (!nodo) return false;
    var head = card.querySelector('.modal-head');
    return !!(head && head.contains(nodo));
  }

  function alMover(e) {
    if (!hoja || !e.touches || e.touches.length !== 1) return;
    var dy = e.touches[0].clientY - inicioY;

    // Hacia arriba: deja que el navegador desplace el contenido.
    if (dy <= 0) {
      if (movido) { hoja.classList.remove('arrastrando'); hoja.style.transform = ''; }
      return;
    }
    // El gesto hacia abajo solo cuenta si el contenido estaba arriba...
    // SALVO que el dedo haya empezado en el encabezado, que sí cuenta siempre.
    if (hoja._tocaArriba && !hoja._desdeTitulo) return;

    if (!movido) {
      movido = true;
      hoja.classList.add('arrastrando');
    }
    hoja.style.transform = arrastrar(dy);
    // Sin preventDefault el navegador hace scroll de la página detrás.
    if (e.cancelable) e.preventDefault();
  }

  function cerrarLaHoja(card) {
    card.style.transform = '';
    card.classList.remove('arrastrando', 'cerrando');
    // Reutiliza el cierre que YA existe: la X del modal. Así no hay que
    // duplicar la lógica de cada ventana ni acordarse de devolver el
    // formulario a su sección.
    var x = card.querySelector('.modal-x');
    if (x) { x.click(); return; }
    // Si no tiene X, se usa Escape (que cierra el buscador global).
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  function alSoltar() {
    if (!hoja) return;
    var card = hoja;
    var m = /translateY\((-?[0-9.]+)px\)/.exec(card.style.transform || '');
    var dy = m ? parseFloat(m[1]) : 0;
    var dt = Date.now() - inicioT;
    var alto = card.getBoundingClientRect().height;
    hoja = null;

    if (!movido) return;

    // Cierra si se fue lejos, o si fue un tirón rápido hacia abajo.
    var lejos = dy > Math.max(CERRAR_PX, alto * PROPORCION);
    var rapido = dt < 350 && dy > 45;

    if (lejos || rapido) {
      card.classList.remove('arrastrando');
      card.classList.add('cerrando');
      setTimeout(function () { cerrarLaHoja(card); }, 190);
    } else {
      // Vuelve a su sitio con la animación de entrada.
      card.classList.remove('arrastrando');
      card.style.transform = '';
    }
  }

  document.addEventListener('touchstart', alTocar, { passive: true });
  document.addEventListener('touchmove', alMover, { passive: false });
  document.addEventListener('touchend', alSoltar, { passive: true });
  document.addEventListener('touchcancel', alSoltar, { passive: true });

  /* ──────────────────────────────────────────────────────────────
     Animar la entrada de TODOS los modales, sin tocar app.v2.js.

     Se usa un MutationObserver en vez de parchear cada `open*Modal` a
     mano: así funciona para las once ventanas, incluidas las que se
     agreguen después, y no hay que acordarse.

     Y la clase se quita con un temporizador normal (330 ms) en vez de
     confiar en `animationend`. Motivo, medido el 2026-09-30: con el reloj
     de animación congelado (pestaña sin pintar), la animación se queda
     en su primer frame —translateY(100%)— y el modal queda INVISIBLE
     para siempre. Quitar la clase lo deja en su estado natural, que es
     "sin transform": el modal siempre se ve, con o sin animación.
     ────────────────────────────────────────────────────────────── */
  function animarEntrada(fondo) {
    var card = fondo.querySelector('.modal-card');
    if (!card) return;
    // Quita la clase de una entrada anterior por si se reabrió rápido.
    card.classList.remove('hoja-entrando');
    // Un frame después para que el navegador registre el estado inicial.
    requestAnimationFrame(function () {
      card.classList.add('hoja-entrando');
      setTimeout(function () { card.classList.remove('hoja-entrando'); }, 330);
    });
  }

  function vigilarModales() {
    var modales = document.querySelectorAll('.modal-backdrop');
    for (var i = 0; i < modales.length; i++) {
      (function (fondo) {
        new MutationObserver(function () {
          if (!fondo.classList.contains('hidden')) animarEntrada(fondo);
        }).observe(fondo, { attributes: true, attributeFilter: ['class'] });
      })(modales[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vigilarModales);
  } else {
    vigilarModales();
  }
})();
