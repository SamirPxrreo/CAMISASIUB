# Camisas IUB — Sistema de control de ventas

Aplicación web para controlar la venta de camisas del negocio de Samir y Valentina, con base de datos en **Supabase (Postgres)**. Se **despliega automáticamente en GitHub Pages** con cada `git push` a la rama `main`.

- **Página pública:** <https://SamirPxrreo.github.io/CAMISASIUB/>
- **Repo:** <https://github.com/SamirPxrreo/CAMISASIUB>

---

## 1. Archivos y ubicación

| Archivo | Descripción |
|---|---|
| `index.html` | Estructura de la app (login, sidebar, secciones, modales). Carga `styles.v2.css`, `app.v2.js` y `enhance.v2.js`. |
| `styles.v2.css` | Todo el diseño (claro/oscuro, responsive, impresión). |
| `app.v2.js` | **Toda la lógica**: Supabase, cálculos, renders. No tocar cálculos ni flujos de dinero sin confirmar. |
| `enhance.v2.js` | Solo mejoras visuales (etiquetas móvil, animación de avisos). No tiene lógica de negocio. |
| `migracion.sql` | Migraciones de Supabase (ver sección 9). |
| `PROYECTO.md` | Este documento. |
| `backup/` | Copia de seguridad (ver sección 11). |

> ⚠️ Los archivos se llaman `*.v2.*` (no `styles.css` / `app.js` — esos nombres ya no existen).
- No hay build, ni npm, ni dependencias locales: los CDN de Supabase y SheetJS se cargan en el `<head>` de `index.html`.

---

## 2. Cómo ejecutar

1. **En línea (normal):** abrir <https://SamirPxrreo.github.io/CAMISASIUB/>.
2. Iniciar sesión con un correo/contraseña de Supabase Auth.
3. **Probar cambios en local:** abrir `index.html` con el navegador (doble clic o arrastrar a Chrome). La base está en la nube (Supabase), así que funciona igual en cualquier PC.

### Cómo publicar cambios (despliegue)

El sitio vive en GitHub Pages y se **reconstruye solo con cada `git push` a `main`**:

```bash
git add .
git commit -m "descripcion del cambio"
git push origin main
```

- Luego la URL pública queda actualizada (el build de Pages tarda ~1–2 min; a veces el primer intento falla y hay que re-dispararlo vía API `POST /pages/builds`).
- **⚠️ Política de deployments:** GitHub conserva *todos* los deployments de Pages. Para no acumularlos, se borran los antiguos dejando siempre **2**: el más reciente (estado actual) y el `07d914b` (último de respaldo). El borrado requiere primero marcarlos "inactivos" vía API (los "active" dan error 422 si no son los únicos).
- El acceso a la API de despliegue usa un **token personal (`repo`)**. No compartir ni subir este token al repo.

> No requiere servidor para la app; solo el `git push` para publicar.

### Credenciales Supabase (ya embebidas en `index.html`)
```js
const SUPABASE_URL = "https://ifdbpaduvpadotpmojas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GnC8zI1oNOWrRTxO8iVqEA_E-yf68uq";
```

---

## 3. Stack técnico

- **Lenguaje:** HTML + CSS + JavaScript puro (ES2020+), sin frameworks.
- **Backend:** Supabase (Auth + Postgres). Cliente JS v2 (`@supabase/supabase-js`).
- **Moneda:** COP (pesos colombianos). Formato con `fmt()` → `$1.234.567`.
- **Zona horaria:** Colombia (`America/Bogota`).
- **Idioma del código:** variables, funciones y textos en español.

---

## 4. Roles, usuarios y permisos

### Configuración por defecto (`USER_ROLES_DEFAULT`)
```js
"admin@gmail.com": { nombre: "Administrador", role: "admin",   vendedor: null },
"samir@gmail.com": { nombre: "Samir",         role: "vendedor", vendedor: "Samir" },
"val@gmail.com":   { nombre: "Valentina",     role: "vendedor", vendedor: "Valentina" }
```

- `role === 'admin'` → ve todo, puede editar/borrar todo, gestiona usuarios.
- `role === 'vendedor'` → solo ve/edita **sus propios pedidos** y los abonos a Yesenia donde tiene pedidos.

### Cómo se determina el rol al iniciar sesión (`syncUserRoleAndShow`)
1. Se busca el correo en la tabla `usuarios` (columna `correo`) → si existe, usa `rol` y `nombre`.
2. Si no existe, se usa `USER_ROLES_DEFAULT[email]`.
3. Si tampoco, se crea un rol vendedor con `vendedor = parte antes del @`.

> Los correos **admin@gmail.com / samir@gmail.com / val@gmail.com** con sus contraseñas se crearon en Supabase Auth. El registro de usuarios nuevos dentro de la app (módulo Configuración, solo admin) **no** crea el usuario de Auth; solo agrega la fila en `usuarios`.

---

## 5. Modelo de datos (Supabase)

> ⚠️ **IMPORTANTE:** el negocio maneja **dos montos distintos** por pedido (ver sección 6): el abono del `cliente` y el `abono_yesenia`. La tabla `ventas` tiene la columna **`abono_yesenia`** (migración ya aplicada, ver sección 9).

### `ventas` — un pedido de camisas (una fila por pedido/cliente)
| Columna | Tipo | Uso |
|---|---|---|
| `id` | uuid | PK |
| `cliente_nombre`, `cliente_telefono` | text | Cliente |
| `cliente_programa`, `genero`, `color`, `talla` | text | Datos resumen de la camisa |
| `modelo` | text | `Viejo` / `Nuevo`. Las ventas antiguas sin valor se leen como `Viejo`. (migración en sección 9) |
| `cantidad` | int | Nº de camisas del pedido |
| `precio_unitario` | numeric | Precio de venta al cliente (por camisa) |
| `costo_unitario` | numeric | **Costo que hay que pagar a Yesenia por camisa** (ej. 30.000) |
| `abono` | numeric | **Abono que dio el CLIENTE al vendedor** (ej. Diego pagó 20.000) |
| `abono_yesenia` | numeric | **Abono que el VENDEDOR pagó a Yesenia** por este pedido (ej. 30.000). ⚠️ columna nueva. |
| `estado` | text | `Pedido`, `Comprado`, `Bordando`, `Listo para entrega`, `Entregado`, `Liquidado` |
| `vendedor` | text | Quién vendió (Samir / Valentina) |
| `entrega_por` | text | Quién entrega el pedido (opcional) |
| `fecha`, `fecha_entrega`, `lugar_entrega`, `nota` | | Fechas y detalle de entrega |
| `items_camisa` | jsonb | Detalle **por camisa/unidad**: `[{ genero, color, talla, modelo, programa, precio, costo, abono, abono_yesenia, estado }, ...]` |
| `compra_id` | uuid | FK a `compras_proveedor` (abono de Yesenia al que pertenece) |
| `finalizado` | bool | `true` = movido al Historial |
| `created_at` | timestamptz | |

### `compras_proveedor` — un "abono a Yesenia" (una visita/abono)
| Columna | Uso |
|---|---|
| `id` | PK |
| `fecha`, `hora` | Cuándo se abonó |
| `comprador` | Quién hizo el abono (Samir / Valentina / Yesenia) |
| `proveedor` | Siempre `Yesenia` |
| `total`, `observaciones` | Resumen |

### `compra_aportes` — aportes de cada persona dentro de un abono
| Columna | Uso |
|---|---|
| `id` | PK |
| `compra_id` | FK a `compras_proveedor` |
| `persona` | Quién aportó (Samir / Valentina / …) |
| `monto` | Cuánto aportó |
| `fecha`, `observacion` | |

> **Regla de negocio:** `venta.abono_yesenia` es la fuente de verdad de cuánto se pagó a Yesenia por un pedido. `compra_aportes` es un registro histórico auxiliar para saber quién puso el dinero.

### `liquidaciones` — pagos entre socios (reparto 50/50)
| Columna | Uso |
|---|---|
| `venta_id` | FK a `ventas` (el pedido que se liquida) |
| `pagador`, `receptor` | Samir ↔ Valentina |
| `monto`, `fecha`, `hora`, `nota` | |

### `usuarios` — usuarios de la app (gestión admin)
`id`, `nombre`, `correo`, `rol` (`admin`/`vendedor`), `created_at`.

---

## 6. ⭐ Concepto clave: DOS ABONOS DISTINTOS

Es la parte más importante del negocio y de la app:

| Concepto | Campo | Ejemplo |
|---|---|---|
| **Abono del cliente** | `venta.abono` + `items[].abono` | El cliente Diego paga 20.000 al vendedor por su camisa. |
| **Abono a Yesenia** | `venta.abono_yesenia` + `items[].abono_yesenia` | El vendedor le paga **30.000 a Yesenia** por esa camisa (costo). |

Por qué difieren: a Yesenia hay que pagarle el **costo completo** por camisa (30.000). Si el cliente solo abonó 20.000, el vendedor pone los 10.000 restantes de su bolsillo de forma provisional, y al final se reparte la **ganancia** (precio − costo) 50/50 entre Samir y Valentina.

Reglas en el código:
- El módulo **Abonos Yesenia** trabaja SIEMPRE con `abono_yesenia` (nunca toca `abono`).
- El botón **"+ Abono"** en la tabla de pedidos y el formulario de venta trabajan con `abono` (cliente).
- `abonosProveedorPorVentaId(ventaId)` es la función central: devuelve `{ abonado, costoTotal, pendiente }` usando `venta.abono_yesenia`. Si es 0, reparte los aportes de `compra_aportes` proporcionalmente al costo (respaldo).

---

## 7. Secciones de la app

- **🏠 Inicio (dashboard):** accesos rápidos, KPIs, alertas (vencidas, tiempo muerto por estado, recordatorios de entrega, clientes con deuda alta) y dos listas separadas: "Pedidos que vendí" y "Pedidos que debo entregar".
- **➕ Nueva Venta / edición:** formulario con modo simple e individual (por camisa), con versión **1/2** (por defecto 1). El "Abono recibido del cliente" se reparte por camisa en `items[].abono`.
- **📋 Pedidos:** tabla con Abono Cliente, Saldo Cliente, Pagado a Proveedor, Falta Pagar. Columna Entrega muestra `📍 lugar · 🚚 quien entrega`. Cambio de estado directo por dropdown (aplica a todas las camisas) + badge de estado por camisa. Botones: Editar, + Abono (cliente), 🧾 Recibo (imprimir), Finalizar, Borrar.
- **🛍️ Abonos Yesenia:** lista de abonos (compras). Botón "+ Nuevo abono". Cada fila agrupa por contacto (tel/@) — 1 fila por cliente con `cliente(s) · pedido(s)`, muestra Camisas/Abono/Saldo agregados. Botón "Ver / Abonar" abre el modal con desglose editable equitativo por camisa.
- **💰 Liquidaciones:** pagos entre socios (50% de la ganancia por pedido). Selecciona pedido con saldo pendiente.
- **📊 Resúmenes / 📈 Reportes:** estadísticas, ventas, por vendedor, por cliente, compras, KPIs. Exportaciones Excel.
- **⚙️ Configuración (solo admin):** CRUD de filas en `usuarios`.
- **📚 Historial:** pedidos finalizados (restaurar / 🧾 recibo / borrar).

### Flujo de un "Abono a Yesenia" (modal)
1. `+ Nuevo abono` → se eligen clientes agrupados por contacto (`claveCliente` tel/@) — 1 checkbox por cliente sumando camisas/costo. Se escribe **"Abono total que paga a Yesenia"** por cliente; si el cliente tiene varios pedidos se muestra desglose editable por pedido (sugerido equitativo por camisa: `total ÷ camisas`).
2. Al guardar (`saveCompra`): se vincula cada pedido (`compra_id`), se reparte el abono según el desglose por pedido (si hay sub-inputs se respeta; si no, equitativo por camisa) en `abono_yesenia` (`distribuirAbonoEquitativo`), **sin tocar el abono del cliente**.
3. `registrarAporteAutomatico` inserta/actualiza una fila en `compra_aportes` (persona = quien tiene la sesión, monto = total abonado).
4. "Ver / Abonar" (modal): para abonar más, se edita el abono y se ajusta el desglose por pedido directamente. La sección infinita `Abonar más a Yesenia` fue removida para evitar el menú eterno.

### Perfil de permisos en Abonos Yesenia
- **Admin:** ve y edita todo.
- **Vendedor comprador** del abono (`comprador === vendedor`): puede editar el abono.
- **Vendedor que solo participa** (tiene pedidos en el abono): modal en modo "solo ver" + sección "Abonar más a Yesenia" para sus propios pedidos.

---

## 8. Cambios recientes (historial de la sesión)

1. **Detalle por pedido en Abonos Yesenia:** columna Camisas con desglose por pedido (cliente, ×cant, Abono, Saldo/Liquidado); el modal muestra "Pedido(s) que cubre este abono".
2. **Corrección aportado/saldo y deuda con Yesenia:** aporte automático que no se registraba en sesión admin y se duplicaba al editar; se arregló con respaldo al comprador y reemplazo al guardar. La caja de deuda usa el abono exacto de cada pedido.
3. **Login con Enter** en correo/contraseña.
4. **Limpieza del modal de abono:** se eliminaron "Aporte registrado automáticamente", la lista de aportes y la caja de liquidación; quedó detalle + "Abonar más a Yesenia" + Cerrar.
5. **"Abonar más a Yesenia":** sección en el modal con un input **por pedido** para pagar el saldo restante (antes era imposible para vendedores no-compradores).
6. **Separación abono cliente vs abono Yesenia:** se introdujo `abono_yesenia` (columna + dentro de `items_camisa[].abono_yesenia`) para que el modal de Yesenia ya no pise el abono del cliente.
7. **Volver a Pedidos automáticamente** tras editar una venta ("Actualizar venta").
8. **Inicio:** dos listas separadas: "Pedidos que vendí" y "Pedidos que debo entregar" (el usuario pidió mantenerlas por separado, no fusionarlas).
9. **Pedidos:** la tabla se ordena por fecha de pedido (más recientes primero).
10. **Abono a Yesenia:** se quitó el campo "Proveedor" (siempre es Yesenia, fijo en el código). En el nuevo abono el "comprador" se auto-llena con la sesión del vendedor (bloqueado); el admin lo elige. En "Abonar más a Yesenia" hay selector "¿Quién abona?": admin elige, vendedor queda fijo a su sesión.
11. **Versión de camisa (1/2):** selector en Nueva Venta (modo simple e individual), se guarda en `ventas.modelo` y en `items_camisa[].modelo` con valores internos `Viejo`/`Nuevo`; badge de versión en Pedidos, Historial, tarjetas del inicio y modal de Abonos Yesenia; comparativa "Camisas por versión" en Resúmenes; columna **Versión** (última) en las exportaciones Excel.
12. **Ordenamiento por clic en encabezados:** todas las tablas (Pedidos, Historial, Abonos Yesenia, Liquidaciones, Usuarios y los rankings de Resúmenes) se ordenan al hacer clic en el título de la columna (▲ asc / ▼ desc, alternando). Sistema en `ordenTablas`/`REGISTRO_ORDEN` con comparadores por tipo (fecha, número, texto).
13. **Inicio (tarjetas de pedidos):** cada tarjeta muestra ahora **📍 lugar de entrega** y **🚚 quién la entrega** (`entrega_por`); los pedidos sin persona de entrega asignada solo aparecen en "Pedidos que vendí", nunca en "Pedidos que debo entregar".
14. **Nueva Venta — asteriscos honestos:** solo marcan obligatorio lo que realmente se valida (Nombre, Teléfono, Vendedor, Cantidad, Género, Color, Talla, Precio, Costo, Estado, Fecha del pedido). Versión, Abono total, Persona que entrega, Fecha y Lugar de entrega ya no muestran asterisco (son opcionales/por defecto).
15. **Tabla de Pedidos más usable:** la columna de **Acciones queda fija** al lado derecho (sticky) y la **rueda del mouse desplaza la tabla horizontalmente** para no tener que arrastrar la barra de scroll.
16. **Colores por estado en el select de Pedidos:** el dropdown de estado (Pedido 👝, Comprado, Bordado, Entregado, Pagado) se tiñe con el color de cada estado, igual que las insignias.
17. **Balance entre socios simplificado:** la tarjeta de Liquidaciones muestra solo "Samir le debe liquidar a Valentina: $X", "Valentina le debe liquidar a Samir: $Y" y "Total pendiente por liquidar: $X+$Y" (o "Cuentas al día"). Los montos siguen siendo el 50% de la ganancia de cada pedido (`mitadGananciaPedido`).
18. **Tarjetas del inicio reordenadas:** ahora se leen como las leería quien entrega: primero 📅 fecha de entrega + 📍 lugar y persona que entrega + vendedor; después 👤 cliente + teléfono/WhatsApp + saldo; luego estado y versión; al final la descripción de las camisas.
19. **"Modelo Viejo/Nuevo" → "Versión 1/2":** solo cambió la etiqueta visible (badges, formulario, Resúmenes, Excel). En la base se siguen guardando los valores `Viejo`/`Nuevo`, así que **no hay que cambiar nada en Supabase**.
20. **Tablas en teléfono:** celdas más compactas y columna de Acciones angosta con solo iconos (✏️ Editar, 💰 Abono, ✅ Finalizar, 🧾 Recibo, 🗑️ Borrar, ↩️ Restaurar, 👁️ Ver/Abonar; encabezado ⚙️), manteniéndola fija al lado derecho. En computador sigue igual.
21. **Menú con iconos:** cada opción del menú lateral lleva su emoji (🏠 ➕ 📋 📚 🧵 💰 💵 📊 📈 ⚙️), más ☰ Menú y 🚪 Salir.
22. **Agrupación por contacto en Abonos Yesenia:** `claveCliente()` (tel dígitos/@) + `etiquetaClienteGrupo()` — 1 checkbox por cliente sumando camisas/costo, tabla agrupa por `claveCliente` y deuda no duplica (Milher 2 pedidos → 1 fila $38k).
23. **Deuda con Yesenia pulida:** card con dot warn/ok, pill total, grid 2 columnas para admin (Valentina/Valu), descripción con badge-estado y fecha humana, sin duplicados.
24. **Scroll Shift+rueda:** `Shift+rueda` = horizontal, rueda sola = vertical (`app.v2.js:194`); hints `🔄 Mantén Shift+rueda` en 5 tablas (`styles.v2.css:829`).
25. **Filtros buscables:** buscador en Historial, Abonos Yesenia, Liquidaciones, Usuarios (`filter-historial/compras/liquidaciones/usuarios-search`) con debounce 300ms y paginación reseteada.
26. **Nueva Venta autocomplete:** `datalist#clientes-sugeridos` (40 recientes), autocompleta teléfono/vendedor, hints y validación de teléfono/@ (`actualizarDatalistClientes`, `onClienteInput`, `validarTelefonoInput`).
27. **Reparto híbrido equitativo:** `distribuirAbonoEquitativo()` por camisa (no por costo) con desglose editable por pedido en `reparto-box`/`pedido-sub-row` (`app.v2.js:2588`), preview verde/rojo y sincronización total↔sub-inputs.
28. **Quitar Abonar más infinito:** removido `div#cp-abono-adicional` (menú eterno de 8 pedidos) — ahora se edita el abono directamente en el desglose.
29. **Bloquear scroll fondo modal:** `body.modal-lock` + `overscroll-behavior:contain` (`styles.v2.css:1470`), `bloquearScrollFondo()` en `open*Modal` y `desbloquearScrollFondo()` en `close*Modal`; fix `Escape` vía `close*Modal`.
30. **Pedidos columna Entrega:** `📍 lugar · 🚚 quien entrega` como en Inicio (`app.v2.js:1798/4059`), fecha intacta.
31. **Lugar Otro con texto libre:** `LUGARES_ENTREGA` + `Otro`, `div#f-lugar-otro-wrap` con `actualizarLugarOtro()`, guarda texto custom si `Otro`, validación específica, sin migración.
32. **Excel con lugar/entrega:** `exportarCompraExcel` detalle agrega `Lugar Entrega`/`Entrega Por`, `exportarExcelCompleto` agrega columna `Entrega por` (`Sin asignar`) y mantiene `Versión`.
33. **Validación fechas:** `fecha_entrega >= fecha` bloqueante, `fecha_entrega < hoy` bloqueante para nuevos y warning para ediciones (`mostrarToast`).
34. **Botón Actualizar PWA:** `🔄 Actualizar` solo arriba junto a `☰ Menú` (`index.html:108`), `hardRefresh()` limpia `caches` y bustea `?v=Date.now()` para la app instalada.
35. **Inicio alerta espaciada:** `#dashboard-alertas` flex gap 10px + margin-bottom 22px (`styles.v2.css:1862`) separa `⚠️ Andrea — debe $114k` de `⚡ Accesos rápidos`.
36. **6 estados + finalizar solo si Liquidado + sugerencia auto:** `ESTADOS=['Pedido','Comprado','Bordando','Listo para entrega','Entregado','Liquidado']` con `normalizarEstado()`/`claseEstado()` (fix página en blanco por `Listo para entrega`), `statusBg/Fg` y CSS `estado-Listo-para-entrega/Bordando/Liquidado` (`app.v2.js:11`, `styles.v2.css:1357`), botón `Finalizar` deshabilitado si `!==Liquidado` + badge `✅ Listo para liquidar` cuando `Entregado` y `puedeMarcarPagado().ok` (`app.v2.js:1821/1827`), sugerencia `confirm` tras abono/liquidación (`sugerirLiquidadoSiListo`).
37. **Precio, costo, abono y estado POR CAMISA:** `items_camisa[]` ahora guarda `precio`, `costo`, `abono` y `estado` por camisa (misma fila de venta, sin migración: es jsonb). Helpers únicos de dinero en `app.v2.js:349`: `precioDeItem`/`costoDeItem`, `precioTotalVenta`/`costoTotalVenta`/`abonoClienteTotal` (suma por camisa con respaldo a la fórmula vieja `precio_unitario*cantidad` para pedidos anteriores), `estadosItemsVenta`/`estadoGeneralVenta` (`Mixto` cuando difieren, no se persiste: al guardar se rollupea al estado más atrasado según `ORDEN_ESTADOS`), `todosItemsListosEntrega` (todas Entregado/Liquidado) y `estadosTodosLiquidado` (finalizables). Tabla Pedidos/Historial: badge de estado por camisa + dropdown global que aplica el estado a TODAS las camisas (`updateEstado` reescribe `items_camisa[].estado`); la columna Estado muestra el estado más atrasado y, si mezcla, una filita con la cuenta por estado (`estadosCuentasHtml`, ej. "Bordando ×4 · Listo para entrega ×2"), badge "✅ Listo para liquidar" exige todas entregadas, `Finalizar` solo si todas Liquidado. Filtro por estado incluye el pedido si ALGUNA camisa coincide. Formulario: en modo individual cada fila tiene Precio venta, Costo Yesenia, Abono y Estado (`camisa-item-money`); en modo simple las camisas heredan `f-precio`/`f-costo`/`f-estado`. Abonos Yesenia: `abonosProveedorPorVentaId` prefiere la suma de `items[].abono_yesenia`, reparto equitativo proporcional al costo de cada camisa. Excel: `exportarExcelCompleto` con precio/costo/estado por camisa; `exportarCompraExcel` solo lista las camisas en estado `Pedido` (y totales) cuando el filtro es "por comprar". Sin cambios en Supabase.
38. **Costo a proveedor sugerido por talla y versión:** `costoProveedorSugerido()` (`app.v2.js`, `EXTRA_TALLAS_COSTO`) calcula el costo Yesenia: v1 base $30.000 (S..XL), 2XL +$2.000 (32.000), 3XL +$4.000 (34.000), 4XL +$6.000 (36.000); **versión 2 = +$1.000** (31.000, 33.000, 35.000, 37.000). Se autocompleta el campo Costo al elegir talla/versión en modo simple (`cs-talla`/`cs-modelo`) y en cada fila del modo individual (`ci-talla`/`ci-modelo`); si el usuario edita el costo a mano, ya no se pisa. Al editar una venta existente el costo registrado manda. Hint en el formulario. Sin cambios en Supabase.
39. **Operaciones diarias (4 ítems):** **(a) Alertas de tiempo muerto** — `calcularAlertas()` avisa camisas atascadas en `Pedido` (≥3 d), `Comprado` (≥5 d) o `Bordando` (≥7 d) contando por estado (`UMBRAL_DIAS_ESTADO` + `diasTranscurridos()`), con nota si en Pedido ya tiene `compra_id`; también avisa pedidos "Listo para entrega" sin fecha o sin entregarse ≥2 d desde su fecha (`alertasTiempoMuerto`/`alertasListosSinEntrega`). **(b) "🗓️ Recordar mañana"** — botón en la tarjeta del inicio que guarda un recordatorio en localStorage (`camisasIUB_recordatorios`, `recordarEntrega`/`hayRecordatorio`): se muestra como alerta `🗓️ Recordatorios de entrega` con enlace WhatsApp cuando la fecha es hoy/pasada y el pedido sigue sin entregar; el botón alterna guardado/borrado (✅ Recordado). [**⚠️ Pendiente: Samir pidió eliminarlo el 2026-09-13 — ver sección 13.**] **(c) Arqueo de caja** — ~~nueva sección `💵 Caja`~~ **ELIMINADA** por decisión de Samir (2026-09-13); si se quiere recuperar, está en el historial de git (commit `09cd13b`). **(d) Recibo imprimible** — botón `🧾 Recibo` en Pedidos e Historial (`imprimirRecibo(id)`) que abre una ventana autocontenida con datos del pedido, desglose por camisa (color, talla, género, precio, abono), total, abono, saldo, entrega y bordados; lista para imprimir. `escSimple` para escapar texto en recibo. Sin cambios en Supabase.
40. **Despliegue en GitHub Pages + limpieza de deployments:** el sitio se publica en <https://SamirPxrreo.github.io/CAMISASIUB/> con cada `git push` a `main` (Pages `build_type=legacy`). Se eliminaron los deployments históricos (GitHub conserva todos y no deja borrar los "active" salvo marcar su estado `inactive` vía API primero: `POST /deployments/{id}/statuses` con `{"state":"inactive"}` y luego `DELETE`). Quedaron solo **2 deployments**: el actual y el `07d914b` de respaldo. Documentado en secciones 2 y 12.

---

## 9. Migraciones en Supabase (base en la nube)

> ✅ **Todas estas migraciones YA se ejecutaron en la base (Postgres en Supabase).** No volver a ejecutarlas si se clona el repo; están aquí como referencia del esquema.

### Aplicadas: columna `abono_yesenia`
```sql
ALTER TABLE ventas ADD COLUMN abono_yesenia numeric DEFAULT 0;
-- Migrar datos existentes: para pedidos ya vinculados a un abono,
-- lo que estaba en "abono" era lo pagado a Yesenia (bug anterior).
UPDATE ventas SET abono_yesenia = abono
WHERE compra_id IS NOT NULL AND (abono_yesenia IS NULL OR abono_yesenia = 0);
```
> **Nota:** los pedidos viejos que ya estaban en un abono quedaron con el abono del cliente corregible manualmente (su columna "Abono Cliente" mostraba el valor de Yesenia por el bug).

### Aplicadas: columna `modelo`
```sql
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS modelo text;
UPDATE ventas SET modelo = 'Viejo' WHERE modelo IS NULL OR trim(modelo) = '';
```

### Aplicadas: 6 estados (2026-09-11)
- `Otro` no requiere migración: `lugar_entrega` es `text` libre, guarda el texto custom directamente.
- Estados finales: `Pedido → Comprado → Bordando → Listo para entrega → Entregado → Liquidado`. El código es compatible hacia atrás con `Bordado`/`Pagado` vía `normalizarEstado()` + `claseEstado()`.
```sql
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_estado_check;
ALTER TABLE ventas ADD CONSTRAINT ventas_estado_check CHECK (estado IN ('Pedido','Comprado','Bordado','Bordando','Listo para entrega','Entregado','Pagado','Liquidado'));
-- migrar datos viejos al nuevo flujo:
UPDATE ventas SET estado='Bordando' WHERE estado='Bordado';
UPDATE ventas SET estado='Liquidado' WHERE estado='Pagado';
```

---

## 10. Convenciones y buenas prácticas para continuar

- **Diseño/estructura:** editar `index.html` y `styles.v2.css`. **Lógica:** `app.v2.js` (no tocar cálculos ni flujos sin confirmar con Samir). **Mejoras visuales menores:** `enhance.v2.js`.
- Funciones y variables en español; utilidades globales: `fmt()`, `hoyColombia()`, `horaColombia()`, `escSimple()`, `mostrarToast()`, `logError()`, `capitalizarColor()`.
- Estado global en memoria: `ventasCache`, `comprasCache`, `compraAportesCache`, `liquidacionesCache`, `usuariosCache`, `currentRole`. Todo se recarga con `loadVentas()` / `loadCompras()` / `loadCompraAportes()` / `loadLiquidaciones()` / `loadUsuarios()`.
- Validar sintaxis tras cada cambio de JS:
  ```js
  // extraer los <script> y:
  node --check archivo.js
  ```
- **No** tocar los archivos de `backup/`.
- Antes de continuar, confirmar con el usuario (Samir) cualquier cambio que toque la lógica de dinero.

---

## 11. Pendientes / temas a considerar

- Los botones "+ Abono" de la tabla de pedidos son abonos **del cliente**; el pago a Yesenia se hace en **Abonos Yesenia**. Evitar mezclarlos.
- `compra_aportes` con `observacion = ''` es el aporte automático (se reemplaza al re-guardar el abono); los "Abono adicional" usan `observacion = 'Abono adicional'`.
- El registro de usuarios de la app no crea credenciales de Supabase Auth (hacerlo manualmente en el panel).
- Los recordatorios "🗓️ Recordar mañana" y los arqueos de caja viven en **localStorage del navegador** (no en Supabase): se pierden si se usa otro dispositivo o se limpia el navegador.
- Los respaldos en `backup/` son una fotografía de antes de la feature por-camisa (#37). Para un respaldo nuevo, copiar `index.html`, `app.v2.js`, `styles.v2.css`, `enhance.v2.js`, `PROYECTO.md` y `migracion.sql` a `backup/` con nombre y fecha.

---

## 12. Despliegue y GitHub Pages (detalle técnico)

- **Cómo funciona:** cada `git push` a `main` dispara el build de Pages (`build_type=legacy`) y publica <https://SamirPxrreo.github.io/CAMISASIUB/>. No hay acciones de GitHub (Actions): es Pages clásico sobre la rama.
- **Deployments:** GitHub crea un deployment por cada build exitoso y los conserva a todos. La URL canónica siempre apunta al más reciente, pero los obsoletos se acumulan en `<repo>/deployments`.
- **Política "2 deployments":** se borran los antiguos dejando el reciente + uno de respaldo (`07d914b`). Comandos con la API REST (GitHub no permite borrar un deployment "active" salvo que sea el único de su environment, devuelve **422**):
  ```bash
  # 1) marcar inactivo
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary '{"state":"inactive"}' \
    https://api.github.com/repos/SamirPxrreo/CAMISASIUB/deployments/{id}/statuses
  # 2) borrar
  curl -X DELETE -H "Authorization: Bearer $TOKEN" \
    https://api.github.com/repos/SamirPxrreo/CAMISASIUB/deployments/{id}
  ```
- **Build fallido / colgado:** a veces `pages/builds/latest` reporta `"building"` con `updated_at` congelado y el deployment correcto no se crea. Se re-dispara con:
  ```bash
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    https://api.github.com/repos/SamirPxrreo/CAMISASIUB/pages/builds
  ```
- **Token:** las llamadas a la API usan un token personal con scope `repo`. **No** debe subirse al repo ni pegarse en el chat. Si se expone, revocarlo en GitHub → Settings → Developer settings → Personal access tokens.

---

## 13. 📌 Notas de Samir (2026-09-13, pendientes para mañana)

> Lo que Samir pidió que le recuerde mañana. Ideas en borrador, sin decidir aún:

1. **Recibo imprimible (`imprimirRecibo`, #39d):** le gusta, pero quiere **crear una plantilla** (con ayuda) y sobre esa plantilla seguir trabajando/mejorando el formato.
2. **Arqueo de caja (#39c):** ~~no está seguro~~ → **ELIMINADO por decisión de Samir (2026-09-13)**. Si algún día lo quiere, avisa y se puede reimplementar/recuperar de git.
3. **REVISAR con él: todos los cambios que se hicieron esta sesión** (operaciones diarias #39 a–d + docs #40): resumen claro de cada uno.
4. **Eliminar el botón "🗓️ Recordar mañana"** del inicio (`renderOrderCard`, junto a "📋 Copiar"): NO le parece útil como está.
5. **En su lugar, contrato de calendario (proponer solución):** su idea es un botón que conecte con el **Calendario de Apple (iPhone)** y el **Calendario de Google (Android)** para que las **fechas de entrega de los pedidos** aparezcan como recordatorio. Opciones a plantear mañana:
   - (a) Botón único "Sincronizar entregas" en el inicio que exporte TODOS los pedidos con `fecha_entrega` pendiente.
   - (b) En **Nueva Venta**, al guardar, preguntar "¿Quieres recordatorio en el calendario?" por pedido.
   - **Destinatario del recordatorio:** la persona puesta en `entrega_por` (quién entrega el pedido). Si Samir lo entrega → recordatorio para Samir; si Valentina → para Valentina. Decidir si va a 1 solo o a ambos (por si a Valentina se le olvida).
   - Requiere evaluar técnica: websharetarget / `ics` (generar archivo `.ics` con eventos) para iOS y Android, o enlaces `cal:`. Mi propuesta: generar un archivo `.ics` descargable (funciona en ambos calendarios). Confirmar enfoque mañana.
