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
- **⚠️ Política de deployments:** GitHub conserva *todos* los deployments de Pages. Para no acumularlos, `clean-deployments.ps1` deja siempre **3**: el **más viejo** (ancla, nunca se borra), el **penúltimo** (rollback de un paso) y el **último** (el que está en vivo). Los del medio se eliminan. El borrado requiere primero marcarlos "inactivos" vía API (los "active" dan error 422 si no son los únicos).
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
- **💳 Cuentas:** saldo total por cliente sumando sus pedidos activos, agrupado por `claveCliente` (tel/@). KPIs (total por cobrar, clientes con deuda, deuda promedio) + botón **🧾 Factura** que abre un modal para elegir pedidos y camisas concretas y generar un comprobante imprimible con el mismo formato del recibo.
- **💰 Liquidaciones:** pagos entre socios (50% de la ganancia por pedido). Selecciona pedido con saldo pendiente.
- **📊 Resúmenes / 📈 Reportes:** estadísticas, ventas, por vendedor, por cliente, compras, KPIs. Exportaciones Excel: `exportarCompraExcel` (SheetJS, lista de compra) y `exportarExcelCompleto` (ExcelJS, 2 hojas con estilos, colores por estado/vendedor, zebra por pedido, `autoFilter` y header fijo; **solo admin**).
- **⚙️ Configuración (solo admin):** CRUD de filas en `usuarios`.
- **📚 Historial:** pedidos finalizados (restaurar / 🧾 recibo / borrar; `✏️ Editar` solo admin).

### Flujo de un "Abono a Yesenia" (modal)
1. `+ Nuevo abono` → se eligen clientes agrupados por contacto (`claveCliente` tel/@) — 1 checkbox por cliente sumando camisas/costo. Se escribe **"Abono total que paga a Yesenia"** por cliente; si el cliente tiene varios pedidos se muestra desglose editable por pedido (sugerido equitativo por camisa: `total ÷ camisas`).
2. Al guardar (`saveCompra`): se vincula cada pedido (`compra_id`), se reparte el abono según el desglose por pedido (si hay sub-inputs se respeta; si no, equitativo por camisa) en `abono_yesenia` (`distribuirAbonoEquitativo`), **sin tocar el abono del cliente**.
3. `registrarAporteAutomatico` inserta/actualiza una fila en `compra_aportes` (persona = quien tiene la sesión, monto = total abonado).
4. "Ver / Abonar" (modal): para abonar más, se edita el abono y se ajusta el desglose por pedido directamente. La sección infinita `Abonar más a Yesenia` fue removida para evitar el menú eterno.

### Perfil de permisos en Abonos Yesenia
- **Admin:** ve y edita todo.
- **Vendedor comprador** del abono (`comprador === vendedor`): puede editar el abono.
- **Vendedor que solo participa** (tiene pedidos en el abono): modal en modo "solo ver" + sección "Abonar más a Yesenia" para sus propios pedidos.

> ⚠️ En 2026-09-25 se eliminó el código de la sección "Abonar más a Yesenia"
> (`registrarAbonoAdicional`, `renderAbonoAdicional`, `pedidosMiosEnCompra`,
> `saldoPedidoCompra`, `actualizarTotalAbonoAdicional`): el div `#cp-abono-adicional`
> ya no existe en el HTML, así que eran ~110 líneas muertas que además escribían
> en `ventas` y `compra_aportes` sin haberse probado en meses. Para abonar más se
> edita el abono en el desglose del picker.

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
39. **Operaciones diarias (4 ítems):** **(a) Alertas de tiempo muerto** — `calcularAlertas()` avisa camisas atascadas en `Pedido` (≥3 d), `Comprado` (≥5 d) o `Bordando` (≥7 d) contando por estado (`UMBRAL_DIAS_ESTADO` + `diasTranscurridos()`), con nota si en Pedido ya tiene `compra_id`; también avisa pedidos "Listo para entrega" sin fecha o sin entregarse ≥2 d desde su fecha (`alertasTiempoMuerto`/`alertasListosSinEntrega`). **(b) "🗓️ Recordar mañana" — ~~botón + recordatorios en localStorage~~ ELIMINADO (2026-09-13).** **(c) Arqueo de caja** — ~~nueva sección `💵 Caja`~~ **ELIMINADA** por decisión de Samir (2026-09-13); si se quiere recuperar, está en el historial de git (commit `09cd13b`). **(d) Recibo imprimible v2** — botón `🧾 Recibo` en Pedidos e Historial (`imprimirRecibo(id)`): ventana autocontenida con **plantilla nueva (2026-09-13, refinada 4690df0)** — header CAMISAS IUB + RECIBO #ID, 2 tarjetas (Cliente / Entrega), tabla Descripción (color · talla · género · modelo) + Cant/Precio/Abono, bloque totales (Total/Abono/Saldo), notas y footer (sin ubicación Ibagué ni firmas, a pedido de Samir). Botones Imprimir/Cerrar, auto-print.
40. **Despliegue en GitHub Pages + limpieza de deployments:** el sitio se publica en <https://SamirPxrreo.github.io/CAMISASIUB/> con cada `git push` a `main` (Pages `build_type=legacy`). Se eliminan los deployments históricos (GitHub conserva todos y no deja borrar los "active" salvo marcar su estado `inactive` vía API primero: `POST /deployments/{id}/statuses` con `{"state":"inactive"}` y luego `DELETE`). La política de conservación **cambió el 2026-09-25**: ahora son 3 (último + penúltimo + ancla), ver #48 y sección 12.
41. **Abonos Yesenia — filtro por persona (admin):** en "Nuevo abono a Yesenia" el admin elige "Persona que realiza el abono" (Samir/Valentina); ahora el picker filtra y solo muestra los pedidos de esa persona (antes mostraba todos mezclados). Texto cambiado de "Persona que realizó la compra" → "Persona que realiza el abono" (`index.html:643`, `app.v2.js:3488` + `renderPedidosPicker` + `onchange` en `openCompraModal`).
42. **Inicio — "Pedidos que debo entregar" agrupa por cliente:** `ordenarPorEntrega()` ahora ordena `fecha_entrega` → `entrega_por` → `cliente_nombre` → `fecha` → `id`, así los 2 pedidos de "Aleja Sandoval" para el mismo lunes quedan pegados (antes quedaban separados por fecha de creación).
43. **WhatsApp copiar sin estado:** `renderOrderCard()` → `detalleWhatsApp` ya no incluye " — Listo para entrega" (solo "Mujer · Negro · L · LICENCIATURA"). En la tarjeta del inicio el estado sigue visible para el vendedor, pero al copiar para el cliente no sale.
44. **💳 Cuentas por cliente + factura personalizada (2026-09-18, commit `923ca26`):** nueva sección en el menú. `getCuentasAgrupadas()` agrupa las ventas no finalizadas por `claveCliente` (tel/@) y calcula `vendido`/`abono`/`saldo` sumando por pedido; KPIs de total por cobrar, clientes con deuda y deuda promedio. Botón **🧾 Factura** → `openFacturaModal(clave)` permite marcar pedidos y camisas concretas y `generarFacturaPersonalizada()` imprime con la misma plantilla del recibo. Botón **👁️ Pedidos** → `verPedidosCliente`.
45. **Excel con diseño real (2026-09-18, commit `6b86c41`):** `exportarExcelCompleto()` con **ExcelJS** en lugar de un CSV pelado: 2 hojas (`Reporte` 27 col + `Cuentas` 18 col) con fórmulas de Excel (Venta=`Q*S`, Saldo=`T-V`, Ganancia=`T-U`, "Me queda"=`W-Z/2`), zebra por pedido, colores por estado y por vendedor, `autoFilter` y header congelado. Solo admin. `exportarCompraExcel` sigue con SheetJS.
46. **Fixes varios (2026-09-18, commits `e16306c`…`abaef9a`):** alertas de "Listo para entrega" agrupadas por cliente (no 5 avisos del mismo pedido); Excel con columna Color 16 y BOM UTF-8; `abonosProveedorPorVentaId` solo reparte proporcional si **no** hay `abono_yesenia` definido (no cuando es `0` explícito), para que "Abono $240k / Saldo $60k" cuadre; hora de pedido en la tabla; la caja de deuda sin duplicados; botón `🔄 Actualizar`; una sola `×` en los buscadores.
47. **Camisas por fila con `+`/`−` y papelera (2026-09-25, commit `d18a596`):** se eliminaron el campo **Cantidad** y la casilla **"Llenar cada camisa por separado"** — el detalle por camisa es ahora el único modo. En su lugar hay un contador `− [n] +` (`camisa-mas`/`camisa-menos`/`camisa-total`): `+` agrega una fila **copiando la última camisa** y enfocando el primer campo vacío, `−` quita la última, y cada fila tiene 🗑️ (`eliminarFilaCamisa(index)`) para quitar esa camisa concreta con confirmación. Mínimo 1, máximo `MAX_CAMISAS_PEDIDO = 30`. Las filas se renumeran solas. **Fix de paso:** `numOrBlank()` evita que un campo de dinero vacío se redibuje como `value="NaN"`, y al editar un pedido antiguo sin precio por camisa las filas heredan `precio_unitario`/`costo_unitario` (antes había que digitarlos uno por uno). La sección "Pago y Costos" queda oculta en el HTML (sus campos `f-precio`/`f-costo`/`f-estado` se usan como default y respaldo).
48. **Política de 3 deployments (2026-09-25, commit `c3adc07`):** `clean-deployments.ps1` ya no deja los 2 más nuevos sino **3**: el último (vivo), el penúltimo (rollback) y **el más viejo (ancla, nunca se borra)**. Como el ancla no se borra, la política se estabiliza sola tras cada push. Ancla actual: `019625c`. Ver sección 12.
49. **Limpieza de código muerto y escapado de HTML (2026-09-25):** se borraron ~191 líneas sin uso: el cluster "Abonar más a Yesenia" (`registrarAbonoAdicional`, `renderAbonoAdicional`, `pedidosMiosEnCompra`, `saldoPedidoCompra`, `actualizarTotalAbonoAdicional`), `formatearDetalleCamisa`, `itemsCamisaVenta`, `distribuirAbonoPersona` (duplicada de `distribuirAbonoEquitativo`), el binding inefectivo de `.editar-button` en `DOMContentLoaded` (corría antes de `checkSession()`), los campos `pagadoSamirAVal`/`pagadoValASamir` (siempre 0), la variable `estadoTxt` y la clave `camisasIUB_refresh` de localStorage. Además, **todo dato que viene de la base y se inyecta en HTML ahora pasa por `escSimple`/`escAttr`/`argOnClick`**: se corrigieron las inyecciones en las tarjetas del inicio, la tabla de Pedidos y Historial, Compras, Liquidaciones, Usuarios, Cuentas, los alerts y el detalle de camisas (incluido el campo Bordado). `argOnClick` protege los `onclick="funcion('...')"` (Cuentas → Factura/Pedidos, copiar @ y el mensaje de WhatsApp).

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
- **Política "3 deployments" (vigente desde 2026-09-25):** `clean-deployments.ps1` deja siempre **3**, ordenados de más nuevo a más viejo:

  | # | Cuál | Rol | ¿Se borra? |
  |---|---|---|---|
  | 1 | el **último** | el que está en vivo | nunca |
  | 2 | el **penúltimo** | rollback de un paso atrás | nunca |
  | 3 | el **más viejo** | ancla / línea base | **nunca** (queda fijo para siempre) |

  Los del medio se eliminan. Como el más viejo nunca se borra, la política se estabiliza sola: tras cada `git push` quedan 3 y el ancla no se mueve. Uso: `.\clean-deployments.ps1` (o `-Total 4` si algún día se quieren más). El ancla actual es `019625c` (2026-09-19) — los deployments anteriores a ese ya no existen, se borraron en limpiezas pasadas.
- **Comandos equivalents con la API REST** (GitHub no permite borrar un deployment "active" salvo que sea el único de su environment, devuelve **422**):
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

1. **Recibo imprimible (`imprimirRecibo`, #39d):** **✅ Plantilla v2 lista y refinada (2026-09-13):** header CAMISAS IUB + RECIBO #ID + estado, tarjetas Cliente/Entrega, tabla Descripción compacta, totales, notas y footer (sin "Ibagué" ni firmas, quitados a pedido de Samir `4690df0`). Botones Imprimir/Cerrar. Samir la probó y le gustó — queda abierta a ajustar logo/colores/contacto si quiere.
2. **Arqueo de caja (#39c):** ~~no está seguro~~ → **ELIMINADO por decisión de Samir (2026-09-13)**. Si algún día lo quiere, avisa y se puede reimplementar/recuperar de git.
3. **REVISAR con él: todos los cambios que se hicieron esta sesión** (operaciones diarias #39 a–d + docs #40): resumen claro de cada uno.
4. **Eliminar el botón "🗓️ Recordar mañana"** del inicio (`renderOrderCard`, junto a "📋 Copiar"): NO le parece útil como está. → **✅ HECHO (2026-09-13):** se eliminó el botón, todo el sistema de recordatorios (localStorage) y la regla CSS `.btn-copy-ok`.
5. **Calendario → ❌ CERRADO (2026-09-13).** Se implementó el botón "📅 Calendario" con exportación a `.ics` y hoja de compartir en móvil, pero **no funcionó en el teléfono de Samir** y pidió eliminarlo. → **Eliminado por completo** (tarjeta del inicio + función `exportarCalendarioICS`). Si en el futuro quiere retomar recordatorios, recordar: descarga `.ics` por `a.click()` está bloqueada en iOS/Android; el share con archivos no fue fiable. Queda anotado el botón "🗓️ Recordar mañana" también se eliminó (ver punto 4). **Pendiente de Samir queda: nada de calendario por ahora.**

### 🕗 Estado al cierre — 2026-09-15 noche (HISTÓRICO, ya no vigente)

> ⚠️ **Superado por el bloque de 2026-09-25 de más abajo.** Se conserva solo como
> referencia de lo que se hizo ese día; los SHAs y la política de deployments que
> menciona aquí ya no aplican.

- **HEAD en ese momento:** `60ee18d` (fix deuda 12k vs abono 60k) + `b5e6d67` revert + `a94f579` X en búsquedas + `e4e8b8c` fix Azul turquesa en compra + `72979d7` fix abonos + `66d72a1` X en búsquedas + `0cb7ccd` fix Excel + `ce571dc` chore deployments + `60ee18d`. Ver `git log --oneline -15`.
- **Deployments en ese momento (2):** política antigua, reemplazada el 2026-09-25 por la de 3 (ver sección 12).
- **Cambios 2026-09-15:**
  1. **Hora en Pedidos/Historial** `app.v2.js:491` — `horaDeVenta()` (`updated_at || created_at` en `America/Bogota`) bajo `Fecha Pedido` + orden por `fecha+hora`.
  2. **Hora se actualiza al editar** — `saveVenta`/`updateEstado`/`addAbono`/`saveCompra` setean `updated_at`; migración en `migracion.sql:15` (`updated_at timestamptz` + trigger).
  3. **Auto-finalizar** `app.v2.js:597` — al liquidar Yesenia + socio y estar `Entregado`, marca `Liquidado` y `finalizado=true` → Historial sin confirm.
  4. **Historial permisos** `app.v2.js:4763` — vendedor no ve `Borrar`, admin ve `✏️ Editar` en Historial.
  5. **Excel Azul turquesa** `app.v2.js:4538` — columnas Color `16` + BOM UTF-8; `exportarCompraExcel` ahora incluye `Pedido` aunque tenga `compra_id`.
  6. **Búsqueda con X** `index.html:339` `styles.v2.css:660` `app.v2.js:61` — `×` dentro del cuadro en Pedidos/Historial/Abonos/Liquidaciones/Usuarios + Inicio (2 dash).
  7. **Botón Copiar** `app.v2.js:1398` `styles.v2.css:2120` — movido al pie de la tarjeta (`order-card-footer`).
  8. **Deuda vs Abonos Yesenia** `app.v2.js:3061` — `abonosProveedorPorVentaId` solo hace reparto proporcional si no hay `abono_yesenia` definido, no cuando es `0` explícito → `Samir $60k` concuerda con `Abono $240k Saldo $60k` (Kiara Polo 10c).
  9. **Deployments** — `clean-deployments.ps1` + `.gitignore` (`token.txt` local, no se sube).

### ✅ Estado al cierre — 2026-09-25 (para retomar en otro PC)

> Este bloque **reemplaza** el de 2026-09-15 (que quedó 25 commits atrás ycitaba un HEAD inexistente).

- **HEAD:** `bd4f8d1` — `fix(deployments)` sobre `c3adc07` (política de 3), `d18a596` (camisas `+/−` y papelera), `abaef9a` (Cuentas: columna Vendedor). Ver `git log --oneline -10`.
- **Deployments (3):** último = el vivo, penúltimo = rollback, y el **más viejo = ancla fija** (`019625c`). Limpieza con `.\clean-deployments.ps1` + token en `$env:GH_TOKEN` o `token.txt` (ambos en `.gitignore`).
- **Entorno de trabajo:** hay copia en `C:\Users\Usuario\Documents\CAMISASIUB` (clon real con `origin` configurado, así que se edita y se sube desde ahí). Git instalado; identidad de commit `SamirPxrreo <samir@example.com>`.
- **Velocidad de publicación medida:** `git push` ≈ **1,3 s**; GitHub Pages publica ≈ **35 s** después. Total ~35 s. *No* se puede acelerar con una key SSH: el build es de GitHub. La espera se debe a comprobaciones demasiado frecuentes, no a la red.
- **Cambios 2026-09-25:**
  1. **Camisas por fila** (`d18a596`) — fuera el campo Cantidad y la casilla "por separado"; ahora contador `− [n] +` y 🗑️ por fila. Ver #47.
  2. **Política de 3 deployments** (`c3adc07`) — ancla + penúltimo + último. Ver #48 y sección 12.
  3. **Limpieza y escapado** — ~191 líneas muertas fuera y todo dato de la base escapado en HTML. Ver #49.
- **Pendiente / abierto:**
  1. 🔴 **RLS de Postgres en Supabase — sin verificar.** Toda la separación admin/vendedor se decide hoy en el navegador. Si `ventas`, `usuarios` o `liquidaciones` no tienen políticas restrictivas, cualquiera con la anon key (pública, está en el HTML) puede escribir en la base. Se revisa en el panel de Supabase, no desde el código.
  2. 🟠 **Los 5 bugs de dinero — uno resuelto, cuatro en pausa** (Samir los revisa uno por uno porque cambian números que él ve). El primero quedó cerrado:
     - ✅ **Pérdidas entre socios — resuelto por decisión de Samir (2026-09-25).** Cuando un pedido se vende por **debajo del costo**, la pérdida **no genera deuda** entre socios: se la come quien vendió. Consecuencia asumida: el balance queda **más alto** que la suma de las mitades de las ganancias. Ejemplo: Samir gana $9.000 en un pedido y pierde $2.000 en otro → ganancia real $7.000 → la mitad real es $3.500, pero el balance pide $4.500 (ignora la pérdida). Como esto es deliberado y no un error, `renderLiquidaciones` ahora muestra una nota al pie de la tarjeta: *"Este monto no descuenta $X por pedidos vendidos por debajo del costo"*. Solo aparece si hay pérdidas reales; no se tocó la matemática.
     - ⏸️ **`abonoClienteTotal` cae a `v.abono`** cuando la suma de abonos por camisa da 0. **Decidido: no tocar** — el fallback es a propósito para que los pedidos antiguos (anteriores al abono por camisa) muestren bien su abono; cambiarlo rompería pedidos viejos.
     - ⏸️ **`addAbono` repartía sin redondear** (`monto / items.length`). **Resuelto (2026-09-25)** con el mismo patrón `Math.floor` + residuo que ya usa el resto del código: se guarda `7143, 7143, …, 7142` en vez de `7142.857142857143`. **Importante: el error real era microscópico** (del orden de 1e-11 pesos) y no se veía nunca, porque `fmt()` redondea al pintar. El ejemplo que seCitó al principio (10.000 en 3 camisas dando 9999,999…) **era falso**: ese caso particular daba 10.000 exactos por casualidad del punto flotante. Solo fallaban ciertas combinaciones (12.345/7, 99.999/7, 1/7). La mejora real es que el dato guardado queda limpio, no que antes fuera incorrecto.
     - ⏸️ **`updateEstado` sobrescribe el estado de TODAS las camisas** del pedido. Si un pedido tiene 4 Bordando y 2 Listo para entrega y eliges "Bordando" en el dropdown, las 2 se pierden. Es el comportamiento documentado en #37, pero es pérdida de datos real.
     - ⏸️ **`saveCompra` no es atómico**: N `UPDATE` secuenciales sin transacción. Si falla el tercero, quedan pedidos con `compra_id` y `abono_yesenia` inconsistentes.
  3. 🟡 `Shift+rueda` no desplaza las tablas de Resúmenes: los listeners se atan a las `.table-wrap` existentes al cargar y esas se crean después.
  4. 🟡 `xlsx@0.18.5` (CDN) tiene CVEs públicos sin parche; se puede migrar a la versión de SheetJS mantenida o quitar esa librería.
- **Todo commiteado y deployado en** <https://SamirPxrreo.github.io/CAMISASIUB/>.
