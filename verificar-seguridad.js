// ============================================================================
//  Verificación de la seguridad de la base (Supabase).
//
//  POR QUÉ EXISTE: la SUPABASE_ANON_KEY está escrita en index.html, o sea que
//  es pública: cualquiera que abra el código del sitio la puede copiar. Esta
//  script comprueba qué puede hacer alguien con ESA key, sin iniciar sesión.
//
//  QUÉ NO HACE: no modifica ningún dato. Todas las sondas de escritura usan un
//  UUID que no existe o un cuerpo vacío, así que aunque la operación esté
//  permitida no se toca nada real.
//
//  CÓMO USAR:  node verificar-seguridad.js
//
//  INTERPRETAR (importante, para no asustarse de más):
//    · SELECT que devuelve filas       🔴 la anon key puede LEER datos de clientes
//    · SELECT que devuelve 0 filas     🟢 o hay RLS, o la tabla está vacía
//    · INSERT 401 + "row-level security policy"   🟢 RLS está activo en esa tabla
//    · INSERT 400/422 (columnas)        🔴 NO hay RLS: acepta escritura
//    · UPDATE/DELETE que devuelven 204 🟡 AMBIGUO. Un 204 no distingue
//      "te dejaron y no hubo coincidencia" de "RLS te lo negó". Con el UUID
//      falso no hay forma de diferenciarlo desde afuera, y probarlo con un id
//      real destruiría datos. Se resuelve con la consulta del final.
// ============================================================================

const SUPABASE_URL = "https://ifdbpaduvpadotpmojas.supabase.co";
const ANON = "sb_publishable_GnC8zI1oNOWrRTxO8iVqEA_E-yf68uq";
const ID_FALSO = "00000000-0000-0000-0000-000000000000"; // formato válido, no existe
const TABLAS = ['ventas', 'usuarios', 'compras_proveedor', 'compra_aportes', 'liquidaciones'];

const hdr = { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' };

const linea = (c) => console.log('-'.repeat(74));
const titulo = (t) => { console.log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74)); };

async function pedir(metodo, ruta, cuerpo) {
  const opts = { method: metodo, headers: hdr };
  if (cuerpo !== undefined) opts.body = JSON.stringify(cuerpo);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, opts);
  const texto = await r.text();
  let j = null; try { j = JSON.parse(texto); } catch (e) { /* no es JSON */ }
  return { status: r.status, json: j, texto, msg: (j && (j.message || j.hint)) || texto.slice(0, 120) };
}

(async () => {
  titulo('1. LECTURA — ¿se pueden ver los datos sin iniciar sesión?');

  const lecturas = {};
  for (const t of TABLAS) {
    const r = await pedir('GET', `${t}?select=*&limit=3`);
    if (r.status === 200 && Array.isArray(r.json) && r.json.length > 0) {
      lecturas[t] = 'ABIERTA';
      console.log(`🔴 ${t}: devuelve ${r.json.length} filas SIN autenticar`);
      Object.keys(r.json[0]).slice(0, 12).forEach(k => {
        const v = r.json[0][k];
        if (v === null || v === undefined || v === '') return;
        const s = String(v);
        console.log(`      ${k} = ${s.length > 44 ? s.slice(0, 44) + '…' : s}`);
      });
    } else if (r.status === 200) {
      lecturas[t] = 'cerrada o vacia';
      console.log(`🟢 ${t}: 0 filas (RLS filtrando, o la tabla está vacía)`);
    } else {
      lecturas[t] = 'bloqueada (' + r.status + ')';
      console.log(`🟢 ${t}: HTTP ${r.status} — ${r.msg}`);
    }
  }

  titulo('2. ESCRITURA — ¿hay RLS activo? (INSERT con cuerpo vacío)');
  console.log('El cuerpo vacío siempre falla; lo que importa es POR QUÉ:');
  console.log('  401 + "row-level security policy"  ->  RLS está activo  🛡️');
  console.log('  400/422 (columnas faltantes)       ->  NO hay RLS       🔴\n');

  const rls = {};
  for (const t of TABLAS) {
    const r = await pedir('POST', t, {});
    if (/row-level security/i.test(r.msg)) {
      rls[t] = true;
      console.log(`🛡️  ${t.padEnd(20)} RLS ACTIVO`);
    } else if (r.status === 400 || r.status === 409 || r.status === 422) {
      rls[t] = false;
      console.log(`🔴  ${t.padEnd(20)} SIN RLS — llegó a validar columnas. ${r.msg.slice(0, 60)}`);
    } else {
      rls[t] = null;
      console.log(`🟡  ${t.padEnd(20)} HTTP ${r.status} — ${r.msg.slice(0, 60)}`);
    }
  }

  titulo('3. UPDATE / DELETE — resultado ambiguo, y por qué');
  const r1 = await pedir('DELETE', `ventas?id=eq.${ID_FALSO}`);
  const r2 = await pedir('PATCH', `ventas?id=eq.${ID_FALSO}`, { nota: '__prueba__' });
  console.log(`DELETE con id inexistente -> HTTP ${r1.status}`);
  console.log(`PATCH  con id inexistente -> HTTP ${r2.status}`);
  linea();
  console.log('Un 204 quiere decir "0 filas afectadas", y eso ocurre en DOS casos:');
  console.log('  (a) te dejaron pasar y no había nada que tocar, o');
  console.log('  (b) RLS evaluó la política y la negatively.');
  console.log('');
  console.log('Desde afuera no se puede distinguir. Y NO se puede probar con un id');
  console.log('real porque eso sí borraría o modificaría un pedido de verdad.');
  console.log('Lo resuelve la consulta SQL del final de esta salida.');

  titulo('RESUMEN');
  const lecturasAbiertas = Object.values(lecturas).filter(v => v === 'ABIERTA').length;
  const sinRls = Object.keys(rls).filter(t => rls[t] === false);

  console.log(`Lecturas abiertas para anon : ${lecturasAbiertas === 0 ? 'ninguna 🟢' : lecturasAbiertas + ' 🔴'}`);
  console.log(`Tablas sin RLS             : ${sinRls.length === 0 ? 'ninguna 🟢' : sinRls.join(', ') + ' 🔴'}`);
  console.log(`Update/Delete              : ambiguo 🟡 (resolver con la consulta de abajo)`);
  linea();

  if (lecturasAbiertas === 0 && sinRls.length === 0) {
    console.log(`
La base está BIEN en lo esencial: la anon key no puede leer nada y todas las
tablas tienen RLS. La separación admin/vendedor que hace el navegador es
comodidad, no la única defensa — eso es lo correcto.

Falta una comprobación que la anon key no puede hacer (necesita el SQL Editor
de Supabase, panel > SQL Editor > New query):

  SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies WHERE schemaname = 'public'
  ORDER BY tablename, cmd;

Cómo leerlo:
  · Si alguna fila tiene  roles = {anon}      -> esa política deja pasar a
    cualquiera con la anon key. Hay que cambiarla a  roles = {authenticated}.
  · Si todas tienen      roles = {authenticated}  -> todo bien, nada que hacer.
  · Si  qual  dice  true  y  cmd  dice ALL   -> la política deja escribir a
    cualquier usuario autenticado, incluido un vendedor sobre pedidos de otro.
    Eso ya es decisión del negocio, no un agujero.

Y para confirmar los permisos de tabla (a veces el problema no son las
políticas sino los GRANT):

  SELECT table_name, grantee, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee = 'anon'
  ORDER BY table_name, privilege_type;

Si aparecen UPDATE o DELETE para  grantee = anon, hay que revocarlos:
  REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
`);
  } else {
    console.log('\n🔴 HAY QUE CORREGIR. Ver PROYECTO.md, punto 60.');
  }
})();
