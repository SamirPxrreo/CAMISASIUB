// Auditoría de contraste del DISEÑO (WCAG), para los dos temas.
//
// Por qué existe: la primera versión de esta medición dio falsos, y las
// lecciones están escritas acá para no repetirlas.
//
// 1) Hay que COMBINAR los fondos con alfa. Las insignias de estado usan un
//    tinte translúcido (rgba(...,0.13)); si se mide el rgba como si fuera
//    sólido, el cálculo se va y da números que no existen.
// 2) Solo hay que medir lo que se VE. Tomar el primer elemento que coincide
//    en el DOM puede ser uno oculto (por ejemplo un botón con clase
//    .hidden), y sus colores calculados no dicen nada.
// 3) Hay que APAGAR transiciones antes de medir. El body tiene
//    `transition: background-color`, y al cambiar de tema el navegador puede
//    quedarse en el color anterior: se midió 1.07 en vez de 15 porque el
//    body seguía oscuro mientras el texto ya era claro. Artefacto, no diseño.
// 4) Un `linear-gradient` NO se mide con backgroundColor (queda `transparent`)
//    ni con getComputedStyle del texto. Si no se detecta, el medidor se sube
//    al padre, mide blanco contra blanco y reporta 1.09, que no existe.
//    Ahora esos casos se marcan "gradiente" y se revisan a mano.
//
// Uso: en el navegador, `await window.__auditarContraste()`.
window.__auditarContraste = async function () {
  // ---- utilidades de color ----
  const parse = (c) => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  };
  const sobre = (fg, bg) => ({
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // Fondo real: sube por los ancestros COMBINANDO las capas con alfa.
  const fondoReal = (el) => {
    const capas = [];
    let p = el;
    while (p) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0) { capas.push(c); if (c.a === 1) break; }
      p = p.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) base = sobre(capas[i], base);
    return base;
  };

  // Texto real: si el texto es transparente, hay que subir al padre.
  const textoReal = (el) => {
    let p = el, c = parse(getComputedStyle(p).color);
    while (p && c && c.a === 0) { p = p.parentElement; c = p ? parse(getComputedStyle(p).color) : null; }
    return c;
  };

  const seVe = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    let p = el;
    while (p) { if (p.classList && p.classList.contains('hidden')) return false; p = p.parentElement; }
    return true;
  };

  const SELECTORES = [
    '.page-title', '.page-sub', '.section-title', '.form-section-title', 'label',
    '.card .value', '.card .eyebrow', '.card .sub', '.sub-tag', '.hint', '.mini-label',
    '.btn', '.btn-gold', '.btn-success', '.btn-ghost', '.btn-danger', '.btn-small',
    '.estado-camisa-btn',
    '.sidebar-item', '.sidebar-item.active', '.table-wrap thead th', '.table-wrap tbody td',
    '.badge-estado', '.badge-modelo', '.humano-fecha', '.pagination-info',
    '.error-msg', '.empty', '.cliente-chip', '.chip', '.pedido-costo-tag'
  ];

  const medir = (sel) => {
    const els = Array.from(document.querySelectorAll(sel)).filter(seVe);
    if (!els.length) return { sel, n: 0, ratio: null, nota: 'nada visible' };

    let peor = 99, muestra = null, total = 0, ok = 0;
    const conGradiente = new Set();

    els.forEach((el) => {
      const cs = getComputedStyle(el);
      const fg = textoReal(el);
      if (!fg) return;

      // Lección 4: si hay gradiente o imagen de fondo, no se puede medir.
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        const csPadre = el.parentElement ? getComputedStyle(el.parentElement) : null;
        const hayGradientePropio = cs.backgroundImage.includes('gradient');
        const hayGradientePadre = csPadre && csPadre.backgroundImage !== 'none';
        if (hayGradientePropio || hayGradientePadre) {
          conGradiente.add(cs.color);
          return;
        }
      }

      const bg = fondoReal(el);
      const fgc = fg.a < 1 ? sobre(fg, bg) : fg;
      const rr = ratio(fgc, bg);
      total++;
      if (rr >= 4.5) ok++;
      if (rr < peor) {
        peor = rr;
        muestra = { texto: cs.color, fondo: `rgb(${bg.r}, ${bg.g}, ${bg.b})` };
      }
    });

    const res = { sel, n: total, mal: total - ok, ratio: total ? +peor.toFixed(2) : null, ok: total > 0 && total === ok, muestra };
    if (conGradiente.size) res.gradientes = Array.from(conGradiente);
    return res;
  };

  const correr = () => SELECTORES.map(medir);
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // Lección 3: apagar transiciones y animaciones.
  const congelado = document.createElement('style');
  congelado.id = '__sin-transiciones';
  congelado.textContent = '*,*::before,*::after{transition:none !important;animation:none !important;}';
  document.head.appendChild(congelado);

  const res = {};
  for (const tema of ['light', 'dark']) {
    if (typeof applyTheme === 'function') applyTheme(tema);
    await esperar(250);
    res[tema] = correr();
  }
  if (typeof applyTheme === 'function') applyTheme('dark');
  congelado.remove();

  const todos = [...res.light.map((m) => ({ ...m, tema: 'claro' })), ...res.dark.map((m) => ({ ...m, tema: 'oscuro' }))];
  const malos = todos.filter((m) => m.ratio !== null && !m.ok);
  const conGradiente = todos.filter((m) => m.gradientes && m.gradientes.length);

  return {
    revisados: SELECTORES.length * 2,
    conProblema: malos.length,
    minimo: Math.min(...todos.filter((m) => m.ratio).map((m) => m.ratio)),
    malos,
    revisarAMano: conGradiente
  };
};
'__auditarContraste listo: llamas await window.__auditarContraste()';
