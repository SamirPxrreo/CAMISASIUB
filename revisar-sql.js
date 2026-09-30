// Revision precisa del SQL. El checker anterior contaba parentesis y
// palabras sueltas, y daba falsos positivos. Aqui se cuentan solo
// afirmaciones de plpgsql: IF/END IF, LOOP/END LOOP, BEGIN/END.
const fs = require('fs');
const t = fs.readFileSync('aplicar-paso-7-abono-atomico.sql', 'utf8');

const problemas = [];

// Quitar comentarios y strings para no contar cosas que no son codigo.
const codigo = t
  .replace(/--[^\n]*/g, '')            // comentarios de linea
  .replace(/'(?:[^']|'')*'/g, "''");    // cadenas simples

const cuenta = (re) => (codigo.match(re) || []).length;

// Ojo: un \bIF\b normal cuenta TAMBIEN el IF de "END IF". Por eso se cuentan
// los IF de apertura (los que NO van precedidos de END) y los END IF aparte.
const ifs      = (codigo.replace(/\bEND\s+IF\b/gi, '@@').match(/\bIF\b/gi) || []).length;
const endIf    = cuenta(/\bEND\s+IF\b/gi);
const loops    = cuenta(/\bFOR\b[\s\S]*?\bLOOP\b/gi);
const endLoop  = cuenta(/\bEND\s+LOOP\b/gi);
const begins   = cuenta(/\bBEGIN\b/gi);
const endBare  = (codigo.match(/^\s*END\s*;/gm) || []).length;

if (ifs !== endIf) problemas.push('IF: ' + ifs + ' pero END IF: ' + endIf);
if (loops !== endLoop) problemas.push('LOOP: ' + loops + ' pero END LOOP: ' + endLoop);
if (begins !== endBare) problemas.push('BEGIN: ' + begins + ' pero END;: ' + endBare);

// Parentesis, ya sin comentarios ni cadenas.
let nivel = 0, min = 0;
for (const ch of codigo) {
  if (ch === '(') nivel++;
  else if (ch === ')') { nivel--; if (nivel < min) min = nivel; }
}
if (nivel !== 0) problemas.push('parentesis: queda un saldo de ' + nivel);
if (min < 0) problemas.push('hay un ) de mas');

// Variables.
const decl = codigo.match(/DECLARE([\s\S]*?)BEGIN/);
const declaradas = decl ? [...decl[1].matchAll(/\b(v_\w+)\s+(uuid|text|jsonb|numeric)/g)].map(m => m[1]) : [];
const usadas = [...new Set([...codigo.slice(codigo.indexOf('BEGIN')).matchAll(/\b(v_\w+)/g)].map(m => m[1]))];
const sinDeclarar = usadas.filter(v => !declaradas.includes(v));
const sinUsar = declaradas.filter(v => !usadas.includes(v));
if (sinDeclarar.length) problemas.push('USADAS SIN DECLARAR: ' + sinDeclarar.join(', '));
if (sinUsar.length) problemas.push('declaradas sin usar: ' + sinUsar.join(', '));

// items_camisa es TEXT: no puede llevar ::jsonb.
if (/items_camisa\s*=\s*[^,\n]*::jsonb/i.test(codigo)) {
  problemas.push('items_camisa con ::jsonb — la columna es TEXT, fallaria');
}
// Y debe conservar el dato viejo si no llega nada.
if (!/COALESCE\(v_items,\s*items_camisa\)/i.test(codigo)) {
  problemas.push('items_camisa sin COALESCE: si llega null, se pierde el detalle');
}

console.log('IF/END IF  : ' + ifs + '/' + endIf);
console.log('LOOP/END   : ' + loops + '/' + endLoop);
console.log('BEGIN/END; : ' + begins + '/' + endBare);
console.log('Variables  : ' + declaradas.length + ' declaradas, ' + usadas.length + ' usadas');
console.log('');
if (problemas.length) {
  console.log('PROBLEMAS:');
  problemas.forEach(p => console.log('  x ' + p));
  process.exit(1);
}
console.log('Todo cuadra. Se puede correr.');
