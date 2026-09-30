# AGENTS.md — cómo trabajar en este repo

Lee esto **antes** de tocar nada. Está escrito para una IA (o una persona)
que va a seguir trabajando en Camisas IUB sin saber nada del proyecto.

La documentación larga y el historial están en [PROYECTO.md](PROYECTO.md).
Este archivo es el resumen operativo: lo que hay que saber para no romper nada.

---

## 1. Qué es esto

App web para llevar el control de un negocio de venta de camisas: pedidos,
cobros, compras al proveedor y liquidaciones entre los dos socios.

- **Dueño:** Samir. Decide todo lo que toque dinero o reglas de negocio.
- **Usuarios:** Samir y Valentina. Los dos trabajan desde el celular.
- **Vive en:** <https://SamirPxrreo.github.io/CAMISASIUB/>

---

## 2. Reglas que no se rompen

1. **No se toca la lógica de dinero sin preguntarle a Samir.** Cálculos de
   saldo, reparto de abonos, liquidaciones, porcentajes entre socios. Si un
   cambio parece "solo cosmético" pero está cerca de un cálculo, se pregunta.
2. **No se rediseña estructura que no se pidió.** Samir ha rechazado varios
   rediseños. Preguntar antes de cambiar cómo se ve o cómo se navega.
3. **No se escriben datos de negocio reales de prueba.** Se puede leer y
   probar en el navegador, pero no se guardan pedidos, abonos ni liquidaciones
   de mentira. Para probar el portapapeles o el diseño alcanza con el DOM.
4. **No se sube nada a GitHub sin que lo pida.** El flujo de despliegue está
   en la sección 6. Cada push publica el sitio.
5. **PowerShell no edita los archivos de código.** `Set-Content`, `Out-File` y
   `Get-Content` sin `-Encoding UTF8` rompen los acentos y dejan el archivo con
   caracteres rotos. Usar las herramientas de edición, o Node. Ver sección 5.

---

## 3. Archivos

| Archivo | Qué es | ¿Se toca? |
|---|---|---|
| `index.html` | Estructura: login, sidebar, secciones, los 11 modales | Con cuidado |
| `app.v2.js` | **Toda la lógica.** Supabase, cálculos, renders | Solo con permiso para el dinero |
| `enhance.v2.js` | Mejoras de presentación, sin lógica | Sí |
| `deslizar-modal.js` | Arrastrar la hoja del celular para cerrarla. Solo presentación | Sí |
| `styles.v2.css` | El CSS servido. Contiene el diseño v3 pegado al final | Sí, pero por bloques (ver 4) |
| `redesign-v3.css` | **Fuente** del diseño v3. Es lo que se edita | Sí, este es el que se edita |
| `estados-v3.css` | Colores por estado. Se pega dentro de `redesign-v3.css` | Sí |
| `hoja-modal.css` | **Fuente** de los modales estilo celular | Sí |
| `aplicar-diseno.js` | Pega el diseño v3 al final de `styles.v2.css` (`--quitar` lo saca) | No |
| `auditar-contraste.js` | Mide contraste WCAG. Se carga a mano en el navegador | No |
| `preparar-despliegue.js` | Cambia el `?v=` de los scripts (parte del deploy) | No |
| `revisar-sql.js` | Linter de SQL, para antes de pegar en Supabase | No |
| `verificar-seguridad.js` | Comprueba que la anon key no lee ni escribe | No |
| `aplicar-paso-*.sql` | Migraciones. **Ya ejecutadas**; son referencia | No (salvo el paso 8, pendiente) |
| `PROYECTO.md` | Documentación técnica e historial completo | Sí, al final de cada sesión |

> Los archivos se llaman `*.v2.*`. Los nombres `styles.css` / `app.js` ya no existen.

---

## 4. El diseño v3 vive al final del CSS

`styles.v2.css` tiene **dos partes**:

1. El CSS original (unas 3.200 líneas) — **no se toca**.
2. Al final, un bloque que empieza con `REDISEÑO VISUAL v3` — el diseño actual.

El diseño se edita en `redesign-v3.css` (+ `estados-v3.css`) y después:

```bash
node aplicar-diseno.js          # pega el bloque al final de styles.v2.css
node aplicar-diseno.js --quitar # lo saca y vuelve el diseño viejo
```

**Por qué así:** CSS aplica "la última regla que gana". Poniendo el diseño al
final no hay que reescribir 3.000 líneas, y para volver atrás basta con borrar
un bloque. Además el cambio es **100% aditivo**: el CSS viejo queda intacto.

Los cambios de la hoja del celular (`will-change`, `top`, el asa) están en la
parte 1, en el bloque `MODALES ESTILO APP NATIVA`. Esos se editan a mano en
`styles.v2.css` **y** en `hoja-modal.css`, que es su fuente.

---

## 5. Errores que ya se cometieron (no repetirlos)

Estos son reales, todos pasaron en este repo:

### Editar con PowerShell rompe los acentos
`Set-Content` / `Out-File` escriben en ANSI. `Get-Content` sin `-Encoding UTF8`
lee en ANSI. Resultado: `SintaxError` o acentos rotos en el archivo.
**Usar las herramientas de edición, o Node con `fs.readFileSync/writeFileSync`
en UTF-8.** El `?v=` del `index.html` ya se rompió así una vez.

### Los finales de línea importan
Los archivos están en **CRLF**. Al hacer un buscar-y-reemplazar con plantillas
que usan `\n`, no coincide nada y parece que el archivo está roto. Normalizar
antes de comparar.

### La especificidad muerde, en las dos direcciones
- El CSS viejo tiene reglas con `!important` (`.pagination-active`, línea ~2197).
  Un `!important` viejo gana a cualquier regla normal, sin importar cuánta
  especificidad tenga la nueva. Hay que volver a usar `!important`.
- `:not(.a):not(.b)` **suma** especificidad: cada `:not()` cuenta como su
  argumento. Una regla `[data-theme="dark"] .btn` normal (0,2,0) pierde contra
  una con tres `:not()` (0,5,0), aunque la nueva esté después.
- Y al revés: el bloque de diseño v3 va al final, así que pisa al CSS viejo.
  Por eso, cuando un arreglo va en la parte 1 y el diseño lo deshace, el
  arreglo se repite dentro del bloque del diseño.

### `background-size` no aplica a un color sólido
`background: var(--x) center / 40px 5px no-repeat` **pinta el color en todo el
cajón**, no una barrita de 40px. `background-size` solo manda sobre imágenes.
Para dibujar una barra de tamaño fijo hay que usar un gradiente:
`background: linear-gradient(var(--x), var(--x)) center / 40px 5px no-repeat`.

### `transform` y `will-change: transform` rompen `position: sticky`
Cualquier `transform`, **aunque valga 0**, convierte al elemento en bloque
contenedor, y los `position: sticky` de los hijos dejan de funcionar. Igual
`will-change: transform`, que se comporta como un transform permanente.
Fue la causa de que el texto se viera detrás del título del modal en el iPhone.
No dejar `will-change: transform` en reposo, ni `animation: ... both` (el
`both` incluye `forwards`: el transform final queda pegado para siempre).

### Un chequeo puede detectarse a sí mismo
Si un script busca texto dañado o un valor viejo, y el propio script **nombra
ese valor en un comentario**, se deniega a sí mismo. Pasó tres veces en una
sesión. Buscar la forma exacta (con punto y coma) y comentar solo en contexto
que no se pueda confundir con una declaración.

### El entorno de pruebas miente en tres cosas
1. **Las animaciones y transiciones están congeladas** (`currentTime` = 0). Un
   elemento a mitad de animación se queda ahí para siempre. Por eso
   `deslizar-modal.js` saca la clase con un `setTimeout` y no con
   `animationend`.
2. **Las capturas salen desescaladas.** Una ventana de 1000px reales se ve como
   de 800 en la captura. Para poner un `@media` a prueba hay que mirar
   `window.innerWidth`, no el ancho de la imagen.
3. **Inyectar el `cssText` de una regla `@media` copia el `@media` entero**, que
   no matchea si el ancho no corresponde. Para probar una regla móvil de verdad,
   hay que cambiarle el breakpoint al archivo, medir, y revertirlo.
4. **No se puede probar un iPhone real.** Los arreglos de `position: sticky` en
   Safari móvil se verifican por medición, y se le pide a Samir que confirme.

---

## 6. Desplegar

Cada `git push` a `main` publica el sitio. Tarda ~35 s.

```bash
git add .
git commit -m "descripción del cambio"
node preparar-despliegue.js --aplicar   # actualiza el ?v= de los scripts
git add index.html
git commit --amend --no-edit
git push
```

El paso del `?v=` **no es opcional**: es lo que evita que el navegador se quede
con el JavaScript viejo.

Después, dejar siempre 3 deployments (el vivo, el anterior para rollback y el
más viejo como ancla):

```powershell
$env:GH_TOKEN = (gh auth token)   # si gh CLI está instalado
.\clean-deployments.ps1
```

---

## 7. Migraciones de Supabase

Están en `aplicar-paso-*.sql`. **Casi todas ya se ejecutaron**; son referencia
del esquema, no se vuelven a correr.

Las que están **pendientes** de que las corra Samir en el SQL Editor:

- `aplicar-paso-8-hora-con-segundos.sql` — la hora se guarda con segundos
  (`HH24:MI:SS`). Antes era `HH24:MI`. La cabecera del archivo tiene un `SELECT`
  para revisar el tipo de columna antes de correr nada.

**Antes de pegar cualquier SQL en Supabase, pasarlo por el linter:**

```bash
node revisar-sql.js
```

Detecta variables no declaradas, `IF`/`END` desbalanceados, `jsonb` donde la
columna es texto, y `COALESCE` faltantes.

---

## 8. Medir el contraste

El diseño tiene que pasar WCAG AA (4.5:1 para texto normal). Con la página
abierta en el navegador:

```js
// en la consola del navegador
const src = await (await fetch('/auditar-contraste.js?t=' + Date.now())).text();
(0, eval)(src);
await window.__auditarContraste();
```

Devuelve el mínimo medido y los que fallan, en tema claro y oscuro.

**Aprendió a la fuerza tres cosas** (y las tiene en cuenta):
- Hay que **componer los fondos con alfa**. Las insignias usan tintes
  translúcidos; medirlos como sólidos da números que no existen.
- Hay que medir **solo lo visible**. El primer elemento que coincide en el DOM
  puede ser uno oculto.
- Hay que **apagar transiciones** antes de medir, o el `body` se queda en el
  color del tema anterior y mide 1.07 en vez de 15.
- Un `linear-gradient` **no se puede medir**: los marca aparte para revisarlos
  a mano.

---

## 9. Cosas que Samir decidió que NO se hagan

Para no volver a proponerlas:

- **No rediseñar la lista de abonos.** Se intentó con tarjetas y se revirtió.
  La tabla se queda como estaba.
- **No sincronizar en tiempo real.** Se retiró: no le gustó cómo se comportaba
  dentro de la página.
- **No filtrar filas por usuario a nivel de RLS.** Con dos personas que se
  conocen, el filtro en la app alcanza. La alternativa añade complejidad y
  riesgo.
- **No copiar el formulario para el modal de edición.** Se mueve el nodo
  (`#form-card`), para no duplicar IDs. Duplicar IDs rompe `getElementById`.
- **No usar React ni librerías de UI.** Todo es vanilla.

---

## 10. Al terminar una sesión

1. Actualizar `PROYECTO.md` con lo que se hizo y lo que quedó pendiente.
2. Actualizar este `AGENTS.md` si se descubrió una trampa nueva.
3. Actualizar el `README.md` si cambió la lista de archivos o el flujo.
4. Si hay un `.sql` pendiente, decirlo explícitamente para que lo corra Samir.
