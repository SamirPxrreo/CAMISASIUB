// ═══════════════════════════════════════════════════════════════════════════
// Aplica el diseño v3 al final de styles.v2.css
// ═══════════════════════════════════════════════════════════════════════════
//
// QUÉ HACE
//   1) Arma el CSS del diseño: (redesign-v3.css − insignias viejas) + estados-v3.css
//   2) Borra el bloque del diseño que hubiera quedado de una corrida anterior
//   3) Lo pega AL FINAL de styles.v2.css, respetando el fin de línea (CRLF)
//   4) Revisa que no se haya roto nada, y si algo está mal NO escribe
//
// POR QUÉ AL FINAL Y NO MODIFICANDO EL CSS VIEJO
//   CSS aplica "la última regla que gana" cuando dos reglas empatan. Poniendo
//   el diseño al final gana sin reescribir 3.000 líneas, y para volver atrás
//   basta con borrar el bloque del final (este script lo hace solo).
//   No se toca ni una línea de HTML ni de JavaScript: la lógica del negocio
//   y los cálculos de dinero no se pueden romper desde acá.
//
// POR QUÉ NODE Y NO POWERSHELL
//   Set-Content / Out-File en PowerShell rompen el UTF-8 de los acentos y
//   dejan caracteres raros. Ver PROYECTO.md, entrada 69.
//
// USO
//   node aplicar-diseno.js
//   node aplicar-diseno.js --quitar    (deja el CSS como estaba antes)
//
const fs = require('fs');

const CSS = 'redesign-v3.css';
const ESTADOS = 'estados-v3.css';
const DESTINO = 'styles.v2.css';
const ANCLA = 'REDISEÑO VISUAL v3';
const VIEJO_INI = '.badge-estado {';
const VIEJO_FIN = '.modelo-Nuevo { background: var(--gold-soft); color: var(--gold-ink); border-color: var(--gold); }';

const quitar = process.argv.includes('--quitar');

// ---- Armar el CSS del diseño ----------------------------------------------
let disenio = fs.readFileSync(CSS, 'utf8');
const estados = fs.readFileSync(ESTADOS, 'utf8');

const ini = disenio.indexOf(VIEJO_INI);
const fin = disenio.indexOf(VIEJO_FIN);
if (ini !== -1 && fin !== -1 && fin > ini) {
  disenio = disenio.slice(0, ini) + estados + disenio.slice(fin + VIEJO_FIN.length);
} else {
  disenio += '\n' + estados;
}

// ---- Quitar el bloque anterior del destino --------------------------------
let dest = fs.readFileSync(DESTINO, 'utf8');
const i = dest.indexOf(ANCLA);
if (i !== -1) {
  const inicio = dest.lastIndexOf('/*', i);
  dest = dest.slice(0, dest.lastIndexOf('\n', inicio - 1) + 1);
  console.log('Bloque del diseño anterior quitado de styles.v2.css.');
}

if (quitar) {
  fs.writeFileSync(DESTINO, Buffer.from(dest, 'utf8'));
  console.log('Diseño quitado. styles.v2.css volvió a su estado original.');
  process.exit(0);
}

// ---- Pegar al final -------------------------------------------------------
const CRLF = dest.includes('\r\n');
const norm = (s) => s.replace(/\r?\n/g, CRLF ? '\r\n' : '\n');
disenio = norm(disenio);
if (!dest.endsWith('\n')) dest += CRLF ? '\r\n' : '\n';
dest += disenio;

// ---- Revisar --------------------------------------------------------------
const problemas = [];
if (dest.split(ANCLA).length - 1 !== 1) problemas.push('el título debería aparecer 1 vez');

const ESTADOS_NOMBRES = ['Pedido', 'Comprado', 'Bordando', 'Listo-para-entrega', 'Entregado', 'Liquidado'];
for (const e of ESTADOS_NOMBRES) {
  if (!dest.includes('.estado-camisa-btn.estado-' + e)) problemas.push('falta el botón del estado ' + e);
  if (!dest.includes('.badge-estado.estado-' + e)) problemas.push('falta la insignia del estado ' + e);
}
if (!dest.includes('[data-theme="dark"] .estado-camisa-btn.estado-Pedido')) problemas.push('falta la versión oscura del botón de estado');

// El dorado es claro: con texto blanco daba 3.2:1. Ver PROYECTO.md entrada 61.
if (/linear-gradient\(135deg, var\(--gold\), #ea580c\);\s*\r?\n\s*color: #ffffff;/.test(dest)) {
  problemas.push('el botón dorado quedó con texto blanco');
}
// La página actual en oscuro daba 2.98:1 mientras ganara el !important viejo.
if (!/pagination-active[\s\S]{0,200}color: #0b1020 !important;/.test(dest)) {
  problemas.push('falta el arreglo de .pagination-active en oscuro');
}
if (!dest.includes('prefers-reduced-motion')) problemas.push('falta prefers-reduced-motion');
if (!dest.includes(':focus-visible')) problemas.push('falta el foco visible');

if (dest.charCodeAt(0) === 0xFEFF) problemas.push('le puso BOM');
if (/Ã|â€|Â/.test(dest)) problemas.push('dañó el texto');
if (CRLF && /(?<!\r)\n/.test(dest)) problemas.push('metió LF sueltos');

if (problemas.length) {
  console.error('FALLO, no se escribió nada:\n  - ' + problemas.join('\n  - '));
  process.exit(1);
}

// ---- Escribir -------------------------------------------------------------
fs.writeFileSync(DESTINO, Buffer.from(dest, 'utf8'));
console.log('Diseño aplicado.');
console.log('  styles.v2.css: ' + dest.split(CRLF ? '\r\n' : '\n').length + ' líneas, fin de línea ' + (CRLF ? 'CRLF' : 'LF'));
console.log('  Volver atrás:  node aplicar-diseno.js --quitar');
