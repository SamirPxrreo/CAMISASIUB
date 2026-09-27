// ============================================================================
//  prepara-despliegue.js — pone el ?v= de los scripts y del CSS igual al
//  commit que se va a publicar, para que nunca haya que editarlo a mano.
//
//  POR QUÉ EXISTE: el ?v= es lo que hace que el navegador no se quede con el
//  JS viejo. Si no se cambia, Samir veía bugs "ya corregidos" porque su
//  navegador seguía con el código anterior. El 26-09 se cambió a mano 8 veces
//  en un solo día, y una de esas se hizo con PowerShell, que le destrozó los
//  acentos a index.html. Este script lo hace siempre bien y en un comando.
//
//  LA VERSIÓN ES FECHA Y HORA, no el SHA del commit. Se intentó el SHA y no
//  puede funcionar: cambiar el ?v= cambia el archivo, eso cambia el commit, y
//  el commit es lo que se iba a usar de nombre. El ?v= jamás podría coincidir
//  con el commit que lo contiene. La fecha y hora es única y no tiene ese
//  problema.
//
//  POR QUÉ EN NODE Y NO EN POWERSHELL: `Get-Content` de PowerShell, sin BOM,
//  lee el archivo como ANSI y rompe los acentos al volver a escribirlo. Node
//  lee y escribe UTF-8 sin adivinar. Además el script verifica que el archivo
//  siga siendo UTF-8 válido, sin BOM y con finales de línea CRLF.
//
//  USO:
//    node preparar-despliegue.js            -> solo muestra qué haría
//    node preparar-despliegue.js --aplicar  -> cambia el ?v=
//    node preparar-despliegue.js --version 20260926-v2   -> texto a mano
//
//  El flujo completo queda:
//    git add . ; git commit -m "..."
//    node preparar-despliegue.js --aplicar
//    git add index.html ; git commit --amend --no-edit
//    git push
//    (el sitio publica solo, ~35 s)
//
//  Ver PROYECTO.md, punto 61.
// ============================================================================

const fs = require('fs');
const { execSync } = require('child_process');

const ARCHIVO = 'index.html';
const args = process.argv.slice(2);
const aplicar = args.includes('--aplicar');
const iManual = args.indexOf('--version');
const manual = iManual >= 0 ? args[iManual + 1] : null;

const linea = (c) => console.log('-'.repeat(70));

// --- 1. Qué versión va a ser -------------------------------------------------
// OJO, y esto se costó una corrección: NO puede ser el SHA del commit, porque
// cambiar el ?v= cambia el archivo, y eso cambia el commit, y el commit es lo
// que iba a ser el nombre. Es un huevo y gallina: el ?v= jamás puede coincidir
// con el commit que lo contiene. Se probó y quedó en 2f41423 con el HEAD en
// 615364b. Por eso es fecha y hora: única, legible y sin esa paradoja.
let version = manual;
if (!version) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  version = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
if (!/^[A-Za-z0-9._-]{1,40}$/.test(version)) {
  console.error('La versión solo puede llevar letras, números, punto, guion y guion bajo: ' + version);
  process.exit(1);
}

// --- 2. Estado del archivo ANTES de tocarlo ----------------------------------
const bufAntes = fs.readFileSync(ARCHIVO);
if (bufAntes[0] === 0xEF && bufAntes[1] === 0xBB && bufAntes[2] === 0xBF) {
  console.error('index.html tiene BOM. No se toca nada hasta quitarlo a mano.');
  process.exit(1);
}
let texto = bufAntes.toString('utf8');
const mojibakeAntes = (texto.match(/Ã|â€|Â/g) || []).length;
if (mojibakeAntes > 0) {
  console.error(`index.html ya tiene ${mojibakeAntes} señal(es) de texto dañado (Ã / â€).`);
  console.error('No se modifica nada hasta arreglarlo a mano, para no grabarlo en el commit.');
  process.exit(1);
}

const antes = texto.match(/\?v=[A-Za-z0-9._-]+/g) || [];

// --- 3. Modo consulta --------------------------------------------------------
if (!aplicar) {
  linea();
  console.log('Ponería el ?v= en: ' + version);
  linea();
  console.log('Archivos que referencia:');
  antes.forEach(v => {
    const n = (texto.match(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log('  ' + v + '   (' + n + ' lugar(es))');
  });
  const distintos = [...new Set(antes)];
  if (distintos.length > 1) {
    console.log('');
    console.log('⚠️  OJO: hoy los tres NO tienen el mismo ?v= (' + distintos.join(', ') + ').');
    console.log('    Se van a igualar. Si eso fue a propósito, cancela.');
  }
  if (version === antes[0]) {
    console.log('');
    console.log('⚠️  El ?v= ya es ese (mismo minuto). Si cambiaste algo, vuelve a correrlo');
    console.log('    en otro minuto, o escribe --version a mano.');
  }
  linea();
  console.log('Para aplicarlo:  node preparar-despliegue.js --aplicar');
  linea();
  process.exit(0);
}

// --- 4. Aplicar --------------------------------------------------------------
const nuevo = texto.replace(/\?v=[A-Za-z0-9._-]+/g, '?v=' + version);
if (nuevo === texto) {
  console.log('No había ningún ?v= que cambiar (ya estaba en ' + version + ').');
  process.exit(0);
}
fs.writeFileSync(ARCHIVO, Buffer.from(nuevo, 'utf8'));

// --- 5. Verificar que el archivo quedó bien ----------------------------------
const bufDespues = fs.readFileSync(ARCHIVO);
const textoDespues = bufDespues.toString('utf8');
const problemas = [];
if (bufDespues[0] === 0xEF && bufDespues[1] === 0xBB && bufDespues[2] === 0xBF) problemas.push('le puso BOM');
if ((textoDespues.match(/Ã|â€|Â/g) || []).length > 0) problemas.push('daño el texto');
if (/(?<!\r)\n/.test(textoDespues)) problemas.push('metió finales de línea LF sueltos');
if (!/Cami|ventas|Ventas|pedido/.test(textoDespues)) problemas.push('el texto se ve raro');
const sinZmismatch = (textoDespues.match(/\?v=/g) || []).length === (nuevo.match(/\?v=/g) || []).length;
if (!sinZmismatch) problemas.push('cambió la cantidad de ?v=');

if (problemas.length) {
  console.error('FALLÓ la verificación, se revierte: ' + problemas.join(' / '));
  fs.writeFileSync(ARCHIVO, bufAntes);
  process.exit(1);
}

const despues = [...new Set(textoDespues.match(/\?v=[A-Za-z0-9._-]+/g) || [])];
linea();
console.log('Listo. ?v= ahora es: ' + despues.join(', '));
console.log('UTF-8 sin BOM: ok | texto sano: ok | CRLF: ok');
linea();
console.log('Falta hacer:');
console.log('  git add index.html');
console.log('  git commit --amend --no-edit');
console.log('  git push');
linea();
