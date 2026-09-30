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
| `deslizar-modal.js` | Arrastrar la hoja del celular para cerrarla. Solo presentación. |
| `migracion.sql` | Migraciones de Supabase (ver sección 9). |
| `aplicar-paso-*.sql` | Migraciones por paso. Casi todas ya ejecutadas (ver sección 9). |
| `redesign-v3.css` | **Fuente** del diseño v3. Es el archivo que se edita, no `styles.v2.css`. |
| `estados-v3.css` | Colores por estado del pedido. Se pega dentro de `redesign-v3.css`. |
| `hoja-modal.css` | **Fuente** del bloque de modales estilo celular. |
| `aplicar-diseno.js` | Pega el diseño v3 al final de `styles.v2.css`. `--quitar` lo saca. |
| `auditar-contraste.js` | Mide el contraste (WCAG) de los dos temas. Se carga a mano en el navegador. |
| `revisar-sql.js` | Linter de SQL, para correr antes de pegar algo en Supabase. |
| `verificar-seguridad.js` | Comprueba que la anon key no lee ni escribe nada. |
| `preparar-despliegue.js` | Cambia el `?v=` de los scripts. Parte del despliegue. |
| `AGENTS.md` | **Leer antes de tocar nada.** Reglas, trampas conocidas y flujo. |
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
48. **Política de 3 deployments (2026-09-25, commit `c3adc07`, ajustable en `089d642`):** `clean-deployments.ps1` deja **siempre 3**, en estos roles y con estas palabras exactas (la salida del script las usa para que no haya confusión):
    1. **El que acabas de subir** (el que está en vivo)
    2. **El que estaba antes de subir el nuevo**
    3. **El más viejo que haya disponible** (ancla, **no se borra nunca**)
    Los que quedan en el medio se eliminan. El ancla no se mueve nunca, así que la política se estabiliza sola tras cada push. Ancla actual: `019625c` (2026-09-18).
    > Nota importante de vocabulario: el rol **2) sí avanza en cada push** (es el penúltimo). Lo que se queda fijo es el **3)**. Una simulación de 3 pushes seguidos lo confirma: el 1) y el 2) rotan, el 3) no cambia jamás.
    Uso: `.\clean-deployments.ps1` (o `-Total 4` si algún día se quieren más). El token va en `$env:GH_TOKEN` o en `token.txt` (ambos fuera del repo).
49. **Limpieza de código muerto y escapado de HTML (2026-09-25):** se borraron ~191 líneas sin uso: el cluster "Abonar más a Yesenia" (`registrarAbonoAdicional`, `renderAbonoAdicional`, `pedidosMiosEnCompra`, `saldoPedidoCompra`, `actualizarTotalAbonoAdicional`), `formatearDetalleCamisa`, `itemsCamisaVenta`, `distribuirAbonoPersona` (duplicada de `distribuirAbonoEquitativo`), el binding inefectivo de `.editar-button` en `DOMContentLoaded` (corría antes de `checkSession()`), los campos `pagadoSamirAVal`/`pagadoValASamir` (siempre 0), la variable `estadoTxt` y la clave `camisasIUB_refresh` de localStorage. Además, **todo dato que viene de la base y se inyecta en HTML ahora pasa por `escSimple`/`escAttr`/`argOnClick`**: se corrigieron las inyecciones en las tarjetas del inicio, la tabla de Pedidos y Historial, Compras, Liquidaciones, Usuarios, Cuentas, los alerts y el detalle de camisas (incluido el campo Bordado). `argOnClick` protege los `onclick="funcion('...')"` (Cuentas → Factura/Pedidos, copiar @ y el mensaje de WhatsApp).
50. ~~**Sincronización entre dispositivos (2026-09-25, commit `f0c6a0f`):**~~ **QUITADA el 2026-09-26 — ya no existe.** A Samir no le gustó cómo pasaba dentro de la página. Se borró el módulo completo de las 3 capas (Realtime de Supabase, sondeo y refresco al volver a la pestaña) junto con el botón 🔔 "Hay cambios de otro dispositivo" y ~201 líneas. **La app ya no se refresca sola:** los datos se cargan al iniciar sesión y después de cada acción que los cambia (guardar venta, abono, compra, liquidación, etc.). Para ver cambios hechos en otro dispositivo hay que recargar la página. Lo que **sí** se conserva es el aviso ⬆️ "Hay una versión nueva" (`revisarVersionNueva`), que es otra cosa: avisa cuando se desplegó un JS nuevo, no sincroniza datos. Si algún día se quiere volver a sincronizar, está en el historial de git (`git show 9662bff:app.v2.js` y `git show b9495aa:app.v2.js`).
51. **Modal de abono, buscador global y sugerencias de cliente (2026-09-25):** cuatro mejoras pedidas por Samir, todas probadas:
    - **Modal de abono** (`abrirModalAbono`): reemplaza el `prompt()` del navegador. Muestra cliente, abono actual y saldo con color, input numérico con Enter, **fichas rápidas** (10k/20k/30k/50k/**Todo el saldo**) y confirmación extra si se abona más que el saldo. Cierra con Cancelar, X y Escape.
    - **Buscador global `Ctrl+K` / `Cmd+K`** (`abrirBuscador`): desde cualquier pantalla. Con 2+ letras busca pedidos por nombre, teléfono, bordado o lugar, y muestra el saldo en verde/rojo. Sin acentos ("bruno" encuentra "Bruno Díaz"). Con menos de 2 letras lista las secciones (Configuración solo para admin). Flechas + Enter. Al abrir un pedido va a Pedidos y lo **resalta 2,2 s** (`buscador-resaltada`). Requiere `data-id` en las filas de Pedidos e Historial.
    - **Sugerencias de cliente** (`pintarSugerenciasCliente`): con 2+ letras en el nombre salen fichas clicables con nombre, teléfono y nº de pedidos. Al tocar una se rellenan **nombre, teléfono y vendedor habitual** de una vez. Una persona con dos teléfonos aparece como dos fichas. Si el teléfono escrito **no** coincide con el del archivo, avisa en rojo que son dos personas distintas.
    - **Confirmación y papelera** (`confirmarFuerte`, commit `c475e30`): los 4 borrados pasan por un modal propio que muestra **qué se borra** y con el foco en **Cancelar** (no se acepta con Enter sin querer). Los pedidos ya **no se borran de verdad**: se marcan con `eliminado_at` y hay un botón 🗑️ Eliminados para recuperarlos. Si la columna no existe, la app lo detecta y cae al borrado definitivo avisando una vez.
52. **Navegación del formulario y franja de pendientes (2026-09-25, commit `7a4632c`):** cambios pedidos por Samir:
    - **Cancelar en Nueva Venta → Inicio**, tanto creando como editando. Antes editando iba a Pedidos y creando dejaba la pantalla vacía. Toda la lógica está en `closeForm()`; el `onclick` del botón ya no la lleva.
    - **Guardar una venta → SIEMPRE a Pedidos**, no solo al editar. Si la validación falla **no** navega: se queda con los errores para no perder lo escrito.
    - **Se quitó la franja de "pendientes del día"** del Inicio. Samir no le gustó. Se borraron el código que la generaba, `navegarInicio()` y sus estilos CSS, para no dejar código muerto.
53. **Se quitó la sincronización y las camisas nuevas salen en blanco (2026-09-26):** dos cambios pedidos por Samir:
    - **Fuera la sincronización entre dispositivos** (ver #50). Se borraron `TABLAS_SINCRONIZADAS`, `INTERVALO_SONDEO_MS`, `canalSync`, `temporizadorSync`, `pendientesSync`, `syncEnVuelo`, `usuarioOcupado()`, `ultimaEntradaUsuario`, `mostrarAvisoSync()`, `ocultarAvisoSync()`, `aplicarCambiosExternos()`, `loadCuentasSilencioso()`, `renderResumenesSiVisible()`, `pedidoEsMio()`, `marcarCambioPendiente()`, `detectarCambios()`, `iniciarSync()`, `detenerSync()`, los listeners `visibilitychange`/`focus`/`input` y el CSS de `#sync-aviso`. `iniciarSync`/`detenerSync` se sustituyeron por `iniciarControlVersion`/`detenerControlVersion`, que solo maneja el aviso ⬆️ de versión nueva. **Al entrar a la app los datos se cargan una vez y ya no se refrescan solos.**
    - **El botón `+` ya no copia la camisa anterior**: cada fila nueva sale en blanco (`camisaVacia()`), solo con lo automático puesto (versión 1, estado Pedido y costo a Yesenia). Para telas iguales hay que llenar de nuevo, a propósito.
    - **El costo a Yesenia se recalcula bien con el valor puesto**: como la camisa en blanco ya trae 30.000, el criterio `dataset.user` se cambió de "el campo está vacío" a "el valor **sigue siendo el sugerido** para la versión/talla actuales" (`marcar()` en `renderCamisaItemsFromData`). Así una camisa en blanco sube a 32.000/34.000/36.000 al cambiar a 2XL/3XL/4XL y a 31.000 en versión 2, pero si el usuario escribe otro número a mano ya no se le pisa.
    - `migracion.sql` **no** se toca: las 4 tablas siguen en la publicación `supabase_realtime` de Supabase. Se decidió **no tocar Supabase** porque sin clientes suscritos no se manda ningún mensaje y el ahorro sería imperceptible. Si algún día se cambia de idea, son cuatro `ALTER PUBLICATION supabase_realtime DROP TABLE public.<tabla>;` (solo en el SQL Editor de Supabase, no afecta al sitio).
54. **Multiplicador ×N de camisas y fin del salto automático (2026-09-26):** Sara pidió "5 camisas talla S de mujer negras y 1 talla M de hombre blanca, todas con bordado" y había que llenar 6 filas repetidas a mano. Ahora cada fila tiene su propia cantidad:
    - **`cantidad` en la fila, no en la base.** Al leer, `agruparCamisas()` junta las camisas idénticas (misma clave: modelo, género, color, talla, bordado, precio, costo, abono y **estado**) en una fila con `×N`. Al guardar, `collectCamisaItems()` **despliega** la fila en N objetos y **`cantidad` no se guarda**: el formato de `items_camisa` sigue siendo una camisa por objeto, exactamente igual que antes. Un pedido guardado con 5 camisas iguales se abre como una fila "×5 iguales".
    - **El caso de Sara = 2 filas.** Llenar una vez y poner 5, luego `+` para la otra. Antes 6 filas.
    - **⧉ Duplicar** copia la fila de abajo con cantidad 1, para cuando son iguales salvo un dato (misma talla, bordados distintos). Se cambia en la copia y las originales quedan intactas.
    - **🗑️ quita la fila entera** (y sus N camisas). **El `+` de arriba ya no hace scroll**: se puede apretar varias veces seguidas y después llenar, sin que la página salte. Ese era el otro pedido de Samir.
    - **Dos renders a propósito:** `renderCamisaItemsFromData()` agrupa (solo al cargar datos) y `pintarCamisas()` no agrupa (tras `+`, `−`, `⧉`, `🗑️`). Si ⧉ agrupara, la copia se fusionaría con su original y sería imposible cambiarle un solo dato.
    - **Contador de arriba = camisas, no filas.** Los `− n +` de cada fila no pueden bajar de 1 (para eso está 🗑️) ni pasar de `MAX_CAMISAS_PEDIDO` (30) sumando todo.
    - **La validación habla en filas:** "Género de la fila #2 (×3 camisas)" en vez de repetir 3 veces "Género de la camisa #4".
55. **Iconos de la cabecera de camisa invisibles en tema oscuro (2026-09-26):**Samir avisó que los iconos no se veían en oscuro. La causa no era el emoji: `<button>` **no hereda `color`**, el navegador le aplica `color: buttontext` (negro) desde su hoja de estilos, así que 🗑️ y ⧉ salían **negros sobre el azul marino** (`--card` `#1a1f3d`): contraste **1.31:1**, prácticamente invisible. En claro no se notaba (negro sobre blanco = 21:1). El bug venía de antes (la papelera anterior ya lo tenía); lo heredó el botón de duplicar.
    - **Regla para el futuro:** si se crea un `<button>` con un ícono, hay que **declarar `color` explícitamente**. No confiar en la herencia.
    - Arreglo: `color: var(--muted)` (5.6:1 en claro, 6.4:1 en oscuro), se quitó el `opacity: 0.6` que lo apagaba más, y ahora ⧉ se pone azul al pasar el mouse y 🗑️ se pone rojo (`.camisa-item-del--borrar`), porque no es la misma acción.
    - **Pendiente de decidir:** los botones primarios de la app también fallan en oscuro y son preexistentes. `white` sobre `--thread` `#8b93f8` da **2.75:1**, y al hover peor (2.05, porque en oscuro `--thread-dark` es MÁS claro: `#a5b0ff`). Igual `.sidebar-item.active` (2.75) y `.btn-success` (2.54). Ver la sección 10.
56. **Contraste de toda la app, los dos temas (2026-09-26):** se auditó **cada botón de la página** con la fórmula de contraste WCAG (la del enunciado: 0.2126R + 0.7152G + 0.0722B sobre la luminancia relativa, y `(L1+0.05)/(L2+0.05)`), midiendo el color que el navegador ya había resuelto. Resultado: **26 de 26 elementos en verde, ninguno por debajo de 4.5:1**, en claro y en oscuro.

    | Elemento | Claro antes | Claro ahora | Oscuro antes | Oscuro ahora |
    |---|---|---|---|---|
    | `.btn` | 9.42 | 9.42 | **2.75** | **5.69** |
    | `.btn` al hover | — | — | **2.05** | **7.65** |
    | `.btn-gold` ("Guardar venta") | **2.74** | **5.72** | 7.38 | 7.38 |
    | `.btn-success` | **4.04** | **6.47** | **2.54** | **6.24** |
    | `.btn-danger` | 4.99 | 4.99 | 6.69 | 6.69 |
    | `.btn-ghost` | 14.93 | 14.93 | 16.25 | 16.25 |
    | `.sidebar-item.active` | 9.42 | 9.42 | **2.75** | **5.69** |
    | 🗑️ / ⧉ de camisa | 5.58 | 5.58 | **1.31** | **6.45** |

    **El patrón que se aplicó:** texto claro sobre fondo claro es un problema en ambos temas, porque en oscuro `--thread` y `--ok` son colores claros. La solución fue **tinta oscura encima** (`#1a1e4e` azul, `#06281a` verde), sin tocar el fondo, para que los botones sigan viéndose igual de vivos. Es el truco que el proyecto ya usaba en `.btn-gold` para el tema oscuro; ahora se aplica a los dos temas y a los demás botones.

    **Dos details que quedaron escritos en el CSS para que no se pierdan:**
    - El tema **claro es el que NO lleva atributo** (`applyTheme` hace `removeAttribute`), el oscuro es `[data-theme="dark"]`. Por eso lo específico de cada tema va en bloque aparte y la regla base es el tema claro.
    - Para `.btn` en oscuro se usa `:not(.btn-gold):not(.btn-danger):not(.btn-ghost)`, porque esas tres variantes tienen su propio color y ya pasaban.
    - **Probar `--gold-ink` (#7d5a0e) NO sirve** para texto sobre `--gold`: da 2.29:1, peor que el blanco. Es un dorado oscuro sobre un dorado claro.
57. **Botones "fantasma" invisibles en oscuro (2026-09-26, regresión propia):** el arreglo de #56 dejó **22 botones invisibles**. El selector era:

    ```css
    [data-theme="dark"] .btn,                              /* <- este sobraba */
    [data-theme="dark"] .btn:not(.btn-gold):not(.btn-danger):not(.btn-ghost) { color: #1a1e4e }
    ```

    El `:not()` solo protegía al **segundo** selector. En el HTML los botones de variante llevan **las dos clases** (`class="btn-ghost btn modal-x"`), así que el primer selector, el pelado, también los alcanzaba y les plantaba `#1a1e4e` (azul casi negro) encima de su fondo **transparente**: contraste **1.02:1**, literalmente invisible. Afectaba al botón del tema (🌙 Sistema), Salir, Actualizar, 🗑️ Eliminados, todos los "Cancelar" y "Cerrar" de los modales y todas las ✕ de cerrar.
    - **Arreglo:** quitar el selector pelado y dejar solo el del `:not()`.
    - **Por qué no se detectó antes:** la comprobación anterior creó un `<button class="btn-ghost">` **de prueba**, sin la clase `btn`. Ese elemento no existía en la página y por eso no lo alcanzaba el selector, así que dio un contraste falso de 16:1. **Lección: las pruebas de contraste tienen que usar los elementos reales del HTML, no unos de laboratorio.** Desde entonces la auditoría recorre el DOM real.

    Además se subió `.stepper-btn:disabled` de `opacity: 0.32` a `0.5`: con 0.32 el `−` deshabilitado quedaba en 2.67:1 en oscuro (no se veía que estaba apagado), y el `opacity` mezcla con el fondo, así que el resultado dependía del tema. Con 0.5 da 4.58:1 en los dos.

    **Auditoría final:** 49 elementos interactivos medidos en cada tema, **0 con problema**. El único que sale mal (`.search-clear`, 1.0) es por diseño: tiene `opacity: 0` hasta que escribes en el buscador.
58. **Avisos de cambios de los demás (2026-09-26):** Samir pidió un aviso como el de "hay versión nueva", pero que saliera cuando **la otra persona** guarda algo. Importante: **esto no es la sincronización que se quitó** (ver #50). Aquí no se recarga nada solo, no hay sondeo, no hay lógica de "no te interrumpo" y no hay botón en la esquina. Solo se escucha y sale un aviso abajo que dice qué hizo la otra persona.
    - **Usa `broadcast` de Realtime, no `postgres_changes`.** Cada acción que cambia datos (guardar venta, abono, compra, liquidación) manda un mensaje con QUÉ hizo y QUIÉN lo hizo. Ventajas frente a escuchar la tabla: se sabe el autor (una fila de `ventas` solo trae `vendedor`, que es quién VENDIÓ, no quién la editó), el mensaje puede ser legible ("Valentina registró un abono en el pedido de Kiara"), y **no hay que tocar Supabase** porque el broadcast no usa la publicación `supabase_realtime`.
    - **Nadie se avisa a sí mismo**, por dos barreras: el canal va con `config: { broadcast: { self: false } }` (el emisor no recibe su propio mensaje, ni desde otra pestaña del mismo navegador) y además se compara `payload.autor` y `payload.autorEmail` contra `currentUser`.
    - **Al tocar el aviso** se recarga (ventas, compras, liquidaciones, usuarios, y cuentas/resúmenes si están a la vista). Si no se toca, se oculta solo a los 12 s. Varios cambios seguidos **se acumulan** ("Valentina y 2 cambios más") en vez de pisarse.
    - Avisa de: pedido nuevo, pedido modificado, abono, compra a Yesenia y liquidación. **NO avisa de borrar/vaciar la papelera** (lo pidió Samir así).
    - Si Realtime no está disponible, `iniciarAvisos` captura el error y la app sigue normal: solo deja de avisar.
59. **Colores de los estados del pedido, los dos temas (2026-09-26):** "Listo para entrega" era **ilegible en oscuro**: 1.89:1 en la insignia y 1.88:1 en el selector. La causa era que su color `#3f6212` (un verde oscuro) estaba **escrito a mano** y no tenía versión para el tema oscuro, mientras que los demás estados sí la tenían (o usaban variables que cambian solas). Verde oscuro sobre fondo oscuro = no se ve.
    - **La solución de fondo son tokens `--estado-*`:** uno por estado, con su valor para claro y para oscuro. Así es imposible que a un estado nuevo se le olvide la versión del otro tema. Se agregaron a `:root` y a `[data-theme="dark"]`, y todas las reglas de `.estado-*` y `select.estado-select.estado-*` ahora usan `var(--estado-…)`. **Ya no queda ningún hex escrito a mano en las reglas de estado**, y se pudieron borrar los `[data-theme="dark"] .estado-Bordando` que existían solo para tapar ese hueco.
    - **Los valores se calcularon, no se eligieron a ojo.** Se compuso el fondo translúcido de cada estado sobre la superficie real de cada tema y se buscó la luminosidad, conservando el tono, que llegara a 4.6:1 con el **cambio mínimo** (el color sigue reconociéndose). Cambios: Bordando `#8b3fd9`→`#802dd6` (3.95→4.61), Entregado `#1d5fd6`→`#1c5dd1` (4.45→4.63), Liquidado `#1e7a4c`→`#1b7045` (4.04→4.65) y **Listo en oscuro `#3f6212`→`#6ca81f` (1.89→4.62)**. Los otros cinco no se movieron porque ya pasaban.
    - Resultado medido: **16 elementos (8 estados × insignia y selector) en verde en los dos temas**, mínimo 4.55:1. Antes había cuatro por debajo de 4.5 y uno en 1.89:1.
60. **El Inicio se dibujaba dos veces al entrar (2026-09-26):** Samir reportó que al abrir la página se veía toda la animación del Inicio y medio segundo después se repetía, "como si cargara dos veces".
    - **Los datos NO se cargaban dos veces.** Medido con un espía que cuenta llamadas al arrancar: `loadVentas`, `loadCompras`, `loadLiquidaciones` y `loadUsuarios`, **una cada una**.
    - **Lo que se repetía era el DIBUJO:** `renderDashboard` se llamaba **2 veces**. La causa: `loadVentas()` ya llama a `renderDashboard()` por dentro (en la lista de renders que hace tras llenar `ventasCache`), y al final de `syncUserRoleAndShow` se llamaba `navigateTo(…)`, que lo llamaba otra vez. Al rehacer el `innerHTML`, las animaciones reinician: `pageIn` 0.26 s en el contenedor y `riseIn` 0.25 s en las ~10 tarjetas de cifras.
    - **No rompía nada** (ni datos duplicados ni peticiones de más) pero se veía el parpadeo y se gastaba un render completo. Y era una bomba de tiempo: el día que los cargos se agruparan en un `Promise.all`, el segundo dibujo vendría **antes** de que llegaran los datos y se vería el Inicio vacío seguido del lleno. Con el arreglo, el orden de los cargos ya no importa.
    - **Arreglo:** `navigateTo(section, opciones)` acepta `opciones.sinRender`, que solo muestra la sección y marca el ítem del menú lateral, sin redibujar. Se usa **únicamente** en el arranque (`navigateTo('dashboard', { sinRender: true })`), donde los cargadores ya dejaron el Inicio pintado. Los otros 11 `navigateTo` del código (clics del menú, después de guardar) siguen redibujando igual, porque ahí sí hace falta.
    - **Verificado con el mismo espía:** `renderDashboard` 2 → 1 al arrancar, los cuatro cargadores siguen en 1; el Inicio queda pintado (4.533 caracteres) con el ítem del menú activo; los clics del menú a Inicio, Resúmenes y Pedidos siguen redibujando; y `sinRender` también cierra el menú lateral, no solo salta el redibujo.
    - **El doble `renderTable` se dejó a propósito:** viene de que `loadVentas` y `loadLiquidaciones` refrescan la tabla de Pedidos porque las liquidaciones cambian la columna del saldo. No se ve porque Pedidos arranca oculto, y quitarlo sí rompería los saldos.
    - **Cómo volver a medirlo:** el espía se meta con un `<script>` justo después de la línea que carga `app.v2.js` en `index.html` (antes de que dispare `DOMContentLoaded`), envolviendo las funciones globales. Con `checkSession()` y la base simulada se reproduce el arranque completo sin tocar la base real.

---

## 8bis. Cambios del 2026-09-29 (sesión con Samir)

Todo commiteado y en producción. Último commit de la sesión: `58abda1`.

### 62. **Color "Mostaza"** (`app.v2.js`)
   Añadido a `COLORES_DISPONIBLES`. Sin más cambios: la lista alimenta el `<select>` de color de cada camisa.

### 63. 🔴 **`updateEstado` ya no borra estados — se resolvió con un modal** (#14 y resumen #1)
   Era el pendiente más grave: el dropdown de Estado aplicaba el mismo estado a **todas** las camisas, así que un pedido con 4 Bordando y 2 Listo para entrega perdía las 2 "Listo" al elegir "Bordando", sin aviso.
   - La columna Estado ahora es un **botón** con el estado general (`Bordando ▾` o `Mixto ⚠️ ▾`). Al abrirlo, `abrirModalEstadosCamisa(id)` pinta **un dropdown por camisa** en `#estados-camisa-modal`, y `guardarEstadosCamisa()` escribe solo lo que se cambió.
   - Cada `<select>` es independiente: cambiar uno no toca los demás. **Esto es lo que arregla la pérdida de datos**, no una confirmación.
   - Valida lo mismo que antes: para `Liquidado` todas deben estar Entregado/Liquidado y `puedeMarcarPagado()` debe dar `ok`.
   - El estado general que se persiste sigue siendo **el más atrasado** (`ORDEN_ESTADOS`).
   - `estadosCuentasHtml` ahora pone cada estado en su propia línea (`display:block`) para que la columna no se ensanche.
   - **`updateEstado` sigue existiendo y ya no se llama desde la tabla**; no se borró (la usan otras cosas), pero ya no pisa estados desde el pedido.

### 64. 🪟 **Editar pedido = modal flotante, sin salir de Pedidos**
   - `openForm(venta)` ya no hace `navigateTo('new-sale')` cuando viene de **Editar**: mueve el **mismo** `#form-card` dentro de `#editar-modal` con `appendChild`. **No se copió el formulario** a propósito: copiarlo habría duplicado los IDs (`f-cliente`, `f-vendedor`…), y `getElementById` seguiría devolviendo el del `<section>` oculto, rompiendo todo.
   - `sacarFormDelModal()` lo devuelve a su sección. Se llama en `closeForm()` y en `saveVenta` antes de `openForm(null)`.
   - `seccionAntesDeEditar` recuerda de dónde se abrió: **cerrar con la X o Cancelar vuelve a Pedidos** (o a donde fuera), ya no manda a Inicio.
   - `closeForm(irA)` acepta `null` para cerrar sin navegar — lo usa `navigateTo` cuando el modal está abierto, y evita la recursión `closeForm → navigateTo → closeForm`.
   - `Escape` cierra el modal (`app.v2.js`, bloque de cierre de modales).
   - **Ancho:** `.modal-card.modal-card-huge` con `max-width: 1180px`. **OJO:** el selector lleva **dos clases a propósito**: el `.modal-card` base (520px) está *definido después* en el archivo y con una sola clase el modal se quedaba en 520px. Es la misma trampa que el `.btn-small` documentado más arriba.
   - **Teléfono:** en `max-width: 720px` los tres grids del formulario bajan a `minmax(120px, 1fr)` (venían en 200/140/150) y con menos padding, así caben **2 columnas** en vez de 1. En el computador no cambia nada.
   - Se oculta `#editar-modal-body #form-title` porque el modal ya tiene su título y salía **"Editar venta" dos veces**.

### 65. 🧵 **Abonos Yesenia: el modal cierra al guardar**
   `saveCompra` ya no re-abría el modal con `openCompraModal(compraIdGuardada)`, que dejaba el bloque "Pedido(s) que cubre este abono" debajo. Ahora: `closeCompraModal()` + `mostrarToast('✅ Abono a Yesenia guardado.')` y uno se queda en la lista.
   Ese bloque se **eliminó de verdad** (div en el HTML, `renderPedidosDetalleCompra()` y la variable `aportesSection` en el JS, y el CSS `.aportes-section`): ~30 líneas muertas.

### 66. ✅ **Se puede completar un abono a medias desde "Nuevo abono"**
   El problema: `pedidosDisponiblesParaCompra` sacaba **todo** pedido con `compra_id`, así que un pedido pagado a medias no aparecía nunca y había que ir a Editar el pedido a escribir el valor a mano.
   - Ahora el filtro solo esconde los que **ya están saldados** (`pendiente <= 1`); los demás aparecen aunque pertenezcan a otra visita.
   - El picker muestra el aviso "Ya habías abonado $X de $Y en una visita anterior. Abona solo lo que falta: $Z" y el input dice "(solo lo que falta)".
   - Las tarjetas del resumen cambiaron a "Costo por pagar" / "Pagas ahora" / "Queda pendiente", y `actualizarResumenCompraModal` suma **pendientes**, no costos (cuando nada se abonó antes, pendiente === costo y no cambia nada).
   - **`saveCompra` ahora SUMA en vez de pisar** (`basePorItem` + parte nueva). Solo cuando el pedido es de **otra** visita: si es de la misma que se está editando, el input es el total de esa compra y se reemplaza, o al reeditar un abono se contaría dos veces.

### 67. 🆕 **Tabla `compra_pedidos` — cada visita a Yesenia por separado** (migración 6)
   El pedido de Sara pagó $30.000 el domingo y el resto días después. Como `ventas.compra_id` es **una sola columna**, el pedido se "movía" de una visita a la otra: la primera fila perdía al cliente y la nueva mostraba el **acumulado** ($60.000) como si se hubiera pagado todo ese día. No había forma de mostrarlo bien porque el dato no existía.
   - `compra_pedidos(compra_id, venta_id, monto)` = el renglón de la visita: qué pedido cubrió y cuánto se le pagó **ese día**.
   - `pedidosDeVisita(id)` y `pagadoEnVisita(id)`: usan los renglones si existen; si no (abono guardado antes de la migración), caen al comportamiento anterior. **Los abonos viejos no cambian de aspecto.**
   - El **saldo del pedido NO cambia**: sigue viniendo de `items_camisa[].abono_yesenia`, que es el acumulado. Solo cambia cómo se muestra la lista.
   - `renderPedidosPicker` prellena el input con `montoEnVisita` (no el acumulado) — si no, abrir un abono de $30.000 mostraría $60.000 y se pagaría de más.
   - `deleteCompra` solo desvincula los pedidos que **siguen** apuntando a esa visita.
   - RLS: `FOR ALL TO authenticated`, verificado desde afuera (lectura sin sesión = 0 filas, escritura = 401 *"row-level violates RLS"*).
   - **Aplicada el 2026-09-29.** Ver `aplicar-paso-6-compra-pedidos.sql`.

### 68. **Columnas "Proveedor" y "Comprador" fuera de la lista de abonos**
   "Proveedor" siempre decía Yesenia y "Comprador" repetía "Quién abona". Se quitaron **solo de la tabla** y sus dos comparadores de orden. El campo `comprador` **sigue existiendo**: define permisos (`puedeGestionar`) y el filtro "Persona que realiza el abono" del modal.

### 69. ⚠️ **Lección: no tocar `app.v2.js` con PowerShell**
   Al borrar código con `Set-Content -Encoding UTF8` se **rompieron los acentos** y el archivo quedó con `SyntaxError: Invalid regular expression: /[̀-ͯ]/g` (el regex de `sinAcentos`). Es el mismo riesgo que advierte `preparar-despliegue.js` en su encabezado. **Para editar `app.v2.js` usar el editor o Node**, nunca `Set-Content`/`Out-File`. Si se hace, `git checkout -- app.v2.js` y `node --check` para verificar.

### 70. 🟠 **Se intentó el rediseño de la lista de abonos a tarjetas y se revirtió**
   Se cambió la tabla por una lista de tarjetas (commit `3d62cd6`) a pedido de "se ve muy fea". Al día siguiente Samir pidió volver a la tabla: *"la tabla podia quedar tal cual como estaba, yo solo queria cambiar la ventana de editar abono"*. Revertido en `612b3cf`.
   **Regla para el futuro:** en este proyecto, los cambios de estructura visual que no se pidieron explícitamente se preguntan primero. SeLostroaron tablas de la app; la tabla de abonos es de las que mejor funcionan.

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

### Pendiente de ejecutar: hora con segundos (2026-09-30)

La función `guardar_abono_yesenia` rellenaba `compras_proveedor.hora` con
`to_char(now() ..., 'HH24:MI')`, o sea **sin segundos**. Dos abonos del mismo
minuto quedaban con la misma hora y no se distinguían al ordenar.

La app ya manda y muestra `HH:MM:SS` (`horaColombia()` y `horaDeVenta()` en
`app.v2.js`); faltaba que Postgres guardara los segundos también.

Archivo: `aplicar-paso-8-hora-con-segundos.sql`. **El cuerpo de la función
está copiado byte a byte del paso 7**, y lo único que cambia es el formato en
los dos lugares (UPDATE e INSERT). La parte que reparte plata es idéntica, y
eso se comprobó revirtiendo el cambio y comparando con el paso 7.

```bash
node revisar-sql.js   # pasarlo por el linter antes de pegarlo
```

La cabecera del .sql trae un `SELECT` que solo mira (no cambia nada) para
revisar el tipo de la columna. En Postgres `TIME` sin precisión ya alcanza
para guardar segundos (`TIME(0)` los guarda). Solo si la columna resulta ser
`varchar` de 5 caracteres o menos hay que ensancharla primero, porque
`"16:10:23"` son 8.

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
- **Leer `AGENTS.md` antes de tocar nada.** Tiene la lista de trampas que ya se pisaron, con la explicación de por qué pasó cada una.
- **El diseño se edita en `redesign-v3.css`, no en `styles.v2.css`.** Después se corre `node aplicar-diseno.js`, que lo pega al final. Ver sección 13 bis.
- **Nunca dejar `will-change: transform` en reposo, ni `animation: ... both`.** Los dos dejan un `transform` permanente, y eso rompe el `position: sticky` de los hijos. Ver sección 14 bis.
- **Medir el contraste antes de dar un color por bueno:** `await window.__auditarContraste()` (ver `auditar-contraste.js`).

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

### ✅ Estado al cierre — 2026-09-28 (para retomar en otro PC)

> Este bloque **reemplaza** al de 2026-09-25 (más abajo, marcado como histórico).

- **HEAD:** `447fb6e` — botones dorados con negro cálido. **Commits totales: 97.**
- **Deployments (3):** 1) el que acabas de subir (vivo) · 2) el que estaba antes del push · 3) el más viejo (ancla fija `019625c`). Limpieza con `.\clean-deployments.ps1` + token en `$env:GH_TOKEN` o `token.txt` (ambos en `.gitignore`).
- **Entorno de trabajo:** hay copia en `C:\Users\Usuario\Documents\CAMISASIUB` (clon real con `origin` configurado, así que se edita y se sube desde ahí). Git instalado; identidad de commit `SamirPxrreo <samir@example.com>`.
- **Velocidad de publicación medida:** `git push` ≈ **1,3 s**; GitHub Pages publica ≈ **35 s** después. Total ~35 s. *No* se puede acelerar con una key SSH: el build es de GitHub.
- **Migraciones en Supabase:** pasos **1 a 5 aplicados**, incluida la columna `eliminado_at` y su índice (la papelera quedó activa: los borrados son reversibles). El paso 6 quedó **anulado a propósito**: no se toca `supabase_realtime` porque, sin clientes suscritos, no cuesta nada. La alternativa está anotada en `migracion.sql` y en la entrada 53.
- **Herramientas en la raíz del repo (nuevas el 2026-09-26):**
  | Archivo | Para qué |
  |---|---|
  | `README.md` | Documentación del proyecto. |
  | `verificar-seguridad.js` | `node verificar-seguridad.js` comprueba el RLS desde afuera **sin tocar datos** (las sondas de escritura usan un UUID inexistente y cuerpo vacío). |
  | `preparar-despliegue.js` | Pasos del despliegue. |
- **⚠️ Al desplegar, cambiar el `?v=` de los `<script>` en `index.html`.** Es lo único manual que queda: si no se cambia, el navegador sirve el JS viejo y se ven bugs ya corregidos (pasó el 2026-09-25 y costó tres intentos). `preparar-despliegue.js` lo hace, y `versionDeEsteScript()` en `app.v2.js` detecta la versión vieja y avisa arriba: *"⬆️ Hay una versión nueva"*. Como respaldo, **Ctrl+Shift+R** en el navegador.

### 🕗 Estado al cierre — 2026-09-25 (histórico, superado por el de arriba)

- **HEAD en ese momento:** `7a4632c` — navegación del formulario + se quitó la franja de pendientes. Antes: `089d642` (rótulos de deployments), `c475e30` (modal de confirmación + papelera), `d949977` (sugerencias de cliente), `2ec5140` (franja de pendientes, ya eliminada), `ce67356` (buscador Ctrl+K), `1b8511d` (modal de abono), `b222070` (contador de camisas), `9662bff` (sincronización entre dispositivos, **retirada el 2026-09-26**, ver entrada 53).
- **Deployments (3):** 1) el que acabas de subir (vivo) · 2) el que estaba antes del push · 3) el más viejo (ancla fija `019625c`).
- **Velocidad de publicación medida:** `git push` ≈ **1,3 s**; GitHub Pages publica ≈ **35 s** después.
- **Migración de la papelera:** aplicada ese día. `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS eliminado_at timestamptz;` (migracion.sql, sección 5). **Si algún día se pierde, la app avisa una vez y hace borrado definitivo** — es seguro aplicarla o no.

- **Cambios 2026-09-25:**
  1. **Camisas por fila** (`d18a596`) — fuera el campo Cantidad y la casilla "por separado"; ahora contador `− [n] +` y 🗑️ por fila. Ver #47.
  2. **Política de 3 deployments** (`c3adc07`) — ancla + penúltimo + último. Ver #48 y sección 12.
  3. **Limpieza y escapado** — ~191 líneas muertas fuera y todo dato de la base escapado en HTML. Ver #49.
- **Pendiente / abierto:**
   1. ✅ ~~**RLS de Postgres en Supabase — sin verificar.**~~ **VERIFICADO Y CORRECTO (2026-09-26).** Se comprobó desde afuera con la anon key (que es pública, está en el HTML), sin iniciar sesión:
       - `SELECT` en las 5 tablas → **0 filas**: los datos no se pueden leer sin sesión.
       - `INSERT` con la anon key → **401 "new row violates row-level security policy"** en las 5 tablas: **RLS está activo en todas**.
       - `UPDATE`/`DELETE` con un id inexistente → 204. **Un 204 no prueba nada**: no se puede distinguir "te dejaron y no hubo coincidencia" de "RLS te lo negó", y probarlo con un id real destruiría datos.
       - Políticas del proyecto (SQL Editor): las 5 tablas tienen `app_camisas`, `cmd=ALL`, `roles={authenticated}`, `qual=true`. Y la consulta `WHERE 'anon' = ANY(roles)` devuelve **0 filas**: **no existe ninguna política para el rol `anon`**.
       - **Conclusión: la anon key no puede leer, escribir ni borrar nada.** La separación admin/vendedor del navegador es comodidad, no la única defensa. Está correcto.
       - **Tabla sobrante:** existe `liquidaciones_ganancias` con política para `{public}` y `with_check` nulo. Se verificó aparte: sin sesión da 0 filas y el INSERT da 401, o sea que la condición `auth.role() = 'authenticated'` la protege igual. La app **no la usa** (cero referencias en el código y en los 92 commits). Se puede borrar con `DROP TABLE liquidaciones_ganancias;` si se quiere limpiar, pero no urge.
       - **Para reverificarlo:** `node verificar-seguridad.js` (en la raíz). No modifica datos: las sondas de escritura usan un UUID inexistente y un cuerpo vacío.
   1.b. 🟢 **Perder lo escrito al guardar si se caía la conexión — ya no pasa (2026-09-26).** En realidad los guardados nunca lo perdían: hacen `return` antes de limpiar el formulario, así que el trabajo se conservaba. Lo que faltaba era el mensaje: salía el texto crudo de Supabase en inglés, y el `catch` de `saveVenta` se comía el error sin registrarlo. Ahora `esFalloDeRed()` distingue caída de señal de error de datos, los 5 guardados (venta, compra, liquidación, usuario y crear usuario) avisan con palabras de gente **recordando que nada se perdió**, los errores que se perdían van por `logError`, y hay una franja fija arriba (34 px) que aparece sin conexión y avisa cuando vuelve.
   1.c. ✅ **El Inicio se dibujaba dos veces al entrar — resuelto (2026-09-26).** Ver entrada 60. `renderDashboard` se llamaba 2 veces porque `loadVentas()` ya dibuja el Inicio y `navigateTo('dashboard')` lo volvía a dibujar, reiniciando las animaciones (`pageIn` 0.26 s + `riseIn` 0.25 s en ~10 tarjetas). Los datos siempre se cargaron una sola vez. Resuelto con `navigateTo(section, { sinRender: true })`, que se usa solo en el arranque.
61. **Los botones dorados se veían con la letra forzada (2026-09-27):** Samiroxinó que "Guardar venta" y "Exportar Excel completo", que son amarillos, no se veían bien con las letras. No era un problema de contraste sino de **estética**:
    - Hay **13 botones dorados** en la app y son los de acción principales: Guardar venta, Exportar Excel completo, Nuevo abono, Registrar pago (varios), Crear usuario, Guardar compra, Generar PDF, y el botón del modal de confirmación cuando la acción no es destructiva.
    - El texto era `#1a1e4e`, **el mismo azul marino de los hilos de la app** (es el color de los enlaces, del borde de foco y de `--thread`). Azul y ámbar son complementarios, así que el botón parecía de otro producto.
    - Se cambió a `#241a0a`, un casi negro **cálido**, que acompaña al dorado en vez de competir con él. De paso subió el contraste:

      | texto | claro normal/hover | oscuro normal/hover |
      |---|---|---|
      | `#1a1e4e` marino (antes) | 5.72 / 5.09 | 7.38 / 6.53 |
      | `#241a0a` negro cálido (ahora) | **6.24 / 5.55** | **8.05 / 7.12** |
      | `#000000` negro puro | 7.66 / 6.81 | 9.88 / 8.74 |

      Se descartó el negro puro: contrasta más, pero al lado de un dorado se ve plano. Se midió también el hover, porque `.btn-gold:hover` aplica `brightness(0.94)` y oscurece el fondo: el texto tiene que aguantar los dos casos.
    - **OJO, no volver a intentar `--gold-ink`:** da 2.29:1, porque es un dorado oscuro sobre un dorado claro.
    - **De paso se borró una regla muerta:** estaba `.btn-gold.btn-small { color: … }`, pero esa combinación **no existe** en la app (la única variante que se combina con `.btn-small` es `.btn-danger`, en el botón "Vaciar papelera"). Y estaba a medias: arreglaba el `color` pero no el `background`, que `.btn-small` pone en `transparent`. Con la regla puesta, un `btn btn-gold btn-small` habría salido con letra oscura y **sin fondo**. Ahora el comentario de esa sección dice que, si algún día se usa esa combinación, hay que devolver **los dos** valores.
    - **Verificado sobre los 13 botones reales del DOM** (no sobre botones de laboratorio), en los dos temas y en los dos estados: 13/13 con `color: rgb(36, 26, 10)`, 6.24:1 en claro y 8.05:1 en oscuro, y 5.55 / 7.12 al pasar el mouse.
  2. 🟠 **Los 5 bugs de dinero — uno resuelto, cuatro en pausa** (Samir los revisa uno por uno porque cambian números que él ve). El primero quedó cerrado:
     - ✅ **Pérdidas entre socios — resuelto por decisión de Samir (2026-09-25).** Cuando un pedido se vende por **debajo del costo**, la pérdida **no genera deuda** entre socios: se la come quien vendió. Consecuencia asumida: el balance queda **más alto** que la suma de las mitades de las ganancias. Ejemplo: Samir gana $9.000 en un pedido y pierde $2.000 en otro → ganancia real $7.000 → la mitad real es $3.500, pero el balance pide $4.500 (ignora la pérdida). Como esto es deliberado y no un error, `renderLiquidaciones` ahora muestra una nota al pie de la tarjeta: *"Este monto no descuenta $X por pedidos vendidos por debajo del costo"*. Solo aparece si hay pérdidas reales; no se tocó la matemática.
     - ⏸️ **`abonoClienteTotal` cae a `v.abono`** cuando la suma de abonos por camisa da 0. **Decidido: no tocar** — el fallback es a propósito para que los pedidos antiguos (anteriores al abono por camisa) muestren bien su abono; cambiarlo rompería pedidos viejos.
     - ⏸️ **`addAbono` repartía sin redondear** (`monto / items.length`). **Resuelto (2026-09-25)** con el mismo patrón `Math.floor` + residuo que ya usa el resto del código: se guarda `7143, 7143, …, 7142` en vez de `7142.857142857143`. **Importante: el error real era microscópico** (del orden de 1e-11 pesos) y no se veía nunca, porque `fmt()` redondea al pintar. El ejemplo que seCitó al principio (10.000 en 3 camisas dando 9999,999…) **era falso**: ese caso particular daba 10.000 exactos por casualidad del punto flotante. Solo fallaban ciertas combinaciones (12.345/7, 99.999/7, 1/7). La mejora real es que el dato guardado queda limpio, no que antes fuera incorrecto.
     - ⏸️ **`updateEstado` sobrescribe el estado de TODAS las camisas** del pedido. Si un pedido tiene 4 Bordando y 2 Listo para entrega y eliges "Bordando" en el dropdown, las 2 se pierden. Es el comportamiento documentado en #37, pero es pérdida de datos real.
     - ⏸️ **`saveCompra` no es atómico**: N `UPDATE` secuenciales sin transacción. Si falla el tercero, quedan pedidos con `compra_id` y `abono_yesenia` inconsistentes.
  3. 🟡 `Shift+rueda` no desplaza las tablas de Resúmenes: los listeners se atan a las `.table-wrap` existentes al cargar y esas se crean después.
  4. 🟡 `xlsx@0.18.5` (CDN) tiene CVEs públicos sin parche; se puede migrar a la versión de SheetJS mantenida o quitar esa librería.
- **Todo commiteado y deployado en** <https://SamirPxrreo.github.io/CAMISASIUB/>.

---

## 13 bis. REDISEÑO VISUAL v3 (2026-09-30)

Samir pidió un cambio **drastico** de diseño. Se hizo entero en CSS, sin tocar ni una línea de la lógica: la app es el mismo negocio con otra ropa. Va **al final** de `styles.v2.css`, en un bloque marcado `REDISEÑO VISUAL v3`.

**Cómo se vuelve atrás:** `node aplicar-diseno.js --quitar`. Borra el bloque y los colores viejos vuelven. También `node aplicar-diseno.js` lo vuelve a poner.

### Archivos

| Archivo | Qué es |
|---|---|
| `redesign-v3.css` | El diseño: paleta, tipografía, botones, tablas, modales. |
| `estados-v3.css` | Los colores por estado (botón y insignia). Se pega dentro de `redesign-v3.css`. |
| `aplicar-diseno.js` | Pega el bloque al final de `styles.v2.css`, o lo quita con `--quitar`. **Node, no PowerShell.** |
| `auditar-contraste.js` | Mide el contraste (WCAG) de los dos temas. Se carga a mano en el navegador: `await window.__auditarContraste()`. |
| `hoja-modal.css` | Los modales que suben desde abajo. Ya está incluido dentro de `styles.v2.css`. |
| `deslizar-modal.js` | Arrastrar hacia abajo para cerrar el modal. Solo presentación. |

### Lo que se cambió

- **Paleta**: del cálido de bordado (crema, oro) a un gris frío con acento violeta. El dorado sigue como acento secundario.
- **Tipografía y espaciado** con más contraste, sombras azuladas (antes marrones, que sobre fondo crema se veían sucias), esquinas más generosas.
- **Barra lateral** con el ítem activo que sí se nota.
- **Celular**: botones más grandes y campos a 16px (con menos, iOS hace zoom solo al escribir).
- **El botón de estado** va **sólido** con el color de su estado, en vez de tinte. Antes el rediseño se lo había tapado con el color violeta de `.btn-small` y la columna había quedado toda igual.
- **Los `<select>` del modal de estados** también llevan su color. Antes salían del color genérico de campo.

### Errores reales que aparecieron al medir (no se suponían)

| Problema | Medido | Por qué |
|---|---|---|
| Violeta oscuro en los botones | 3.51:1 | El color nuevo en oscuro quedaba corto. Va `--thread: #818cf8` con tinta casi negra. |
| Botón dorado con texto blanco | 3.2:1 | **El mismo error ya documentado en la entrada 61.** El dorado es claro: la letra va oscura. |
| Página actual en oscuro | 2.98:1 | El CSS viejo (línea 2197) lleva `!important` en fondo, texto y borde, y eso gana a cualquier regla normal. |
| Guardar cambios, texto grande | 4.32:1 | El tinte violeta no daba contraste para texto de 17px. |
| Botón dorado (nuevo) | 4.32:1 | Ídem, en claro. |

**Resultado: 372 mediciones en 6 secciones x 2 temas, 0 problemas, peor 4.59** (el mínimo es 4.5).

También se corrigieron restos de la paleta vieja que seguían winning por especificidad: `.badge-modelo.modelo-Nuevo` y `.modelo-Viejo` seguían con el tinte azul y dorado originales.

### Tres cosas que PARECEN bugs y no lo son

1. **Las capturas de este entorno mienten.** En una, el modal salió transparente. Se comprobó con `elementFromPoint`: la tarjeta está opaca y arriba de todo. Es un fallo de render del navegador sin cabeza, de la misma familia que el reloj de animación congelado. No se "arregló" nada porque no había nada que arreglar.
2. **Las transiciones también están congeladas** en este entorno. Al cambiar de tema, el `body` se queda pegado en el color viejo y mide 1.07:1 en vez de 15. `auditar-contraste.js` apaga transiciones y animaciones antes de medir, por eso.
3. **Un `linear-gradient` no se mide con `backgroundColor`**: queda `transparent` y el medidor se sube al padre, mide blanco contra blanco y reporta 1.09, que no existe. `auditar-contraste.js` detecta los gradientes y los marca para revisarlos a mano.

### El asa del modal (la barrita para arrastrar)

Samir pidió que la barrita quedara **arriba del título**, no al lado. Dos causas, ambas reales:

1. **`.modal-head` es `display: flex`** (para poner la X al otro lado del título). Y en un contenedor flex el `::before` no es un bloque arriba: es **un ítem más de la fila**, así que se acomodaba al lado. El arreglo es `flex-wrap: wrap` + `flex: 0 0 100%` en el asa, sin tocar el HTML.
2. **`background-size` solo manda sobre imágenes de fondo.** El asa se armó con `background: var(--asa) center / 40px 5px no-repeat`, que suena a "barrita de 40px centrada", pero un **color sólido no tiene tamaño**: se pintaba en todo el cajón de 356px. Se arregló pintándola con un gradiente de un solo color, que sí es imagen. El comentario en el CSS avisa para que nadie lo "simplifique" de vuelta.

Además el asa era invisible: usaba `var(--line)` = `#e4e7f0` sobre blanco, 1.1:1. Ahora tiene color propio (`--asa`), 2.9:1 en claro y 3.6:1 en oscuro.

Y se le agregó `content: ''` a la regla nueva, que antes dependía de la regla vieja del `@media` de 720px. Funcionaba por casualidad; si esa regla se borraba, el asa desaparecía **sin dar ningún error**.

### Cómo ver el diseño del celular en la compu

Las reglas del asa son de `@media (max-width: 720px)`, y en una pantalla de 800px no se ven. Para revisarlas en la compu hay que subir ese breakpoint a 900px **temporalmente**, mirar, y volverlo a 720px. Se hizo así para probar y se revirtió (verificado: no queda rastro).

### Copiar para WhatsApp del inicio

Samir reportó que no le dejaba copiar la descripción del pedido. **Era un bug real de código:**

```js
navigator.clipboard.writeText(texto).then(...).catch(respaldo)
```

El respaldo estaba en el `.catch()`, que solo se dispara si la promesa se **rechaza**. Pero `navigator.clipboard` **no existe** fuera de contexto seguro (HTTPS o localhost), y ahí la llamada lanza un `TypeError` antes de devolver nada: nunca hay promesa y el respaldo nunca corre. En la compu (localhost) funcionaba; desde el celular por `http://192.168.1.x` no.

`copiarUsuarioWhatsApp` sí tenía la comprobación `if (navigator.clipboard && ...)`, por eso ese botón sí funcionaba y este no.

**Arreglo:** un solo camino para las dos, `copiarAlPortapapeles(texto)`, con dos intentos: la API moderna si existe, y si no un `textarea` oculto + `execCommand('copy')`. En el celular el textarea va con `readonly` (para que no salte el teclado) y se selecciona con `setSelectionRange`, porque en iOS el `select()` a secas no selecciona nada. Y si los dos fallan, **se avisa** en vez de fingir que se copió.

---

## 14 bis. Segunda tanda del 2026-09-30: encabezado fijo, segundos, tabla de usuarios

Todo esto se verificó midiendo en el navegador, no a ojo. Los cuatro pedidos de Samir:

| # | Pedido | Estado |
|---|---|---|
| 1 | El encabezado del modal que quede 100% fijo | **Arreglado**, con dos causas distintas |
| 2 | La hora que guarde también segundos | **Arreglado en la app**; falta que Samir corra el SQL del paso 8 |
| 3 | Achicar la columna "Acciones" de Configuración | **Arreglado** |
| 3b | Cambiar los colores de ADMIN y VENDEDOR | **Arreglado**: ADMIN violeta, VENDEDOR gris |

### 1) El encabezado del modal: DOS causas, no una

Samir reportó que en el iPhone los textos de abajo se veían **detrás** del
encabezado, como si el título fuera transparente. No era una sola cosa:

**Causa 1 — `will-change: transform` estaba siempre.** En la hoja del celular
había `will-change: transform` en estado de reposo, no solo durante el
arrastre. `will-change: transform` se comporta **como si hubiera un
transform**, y cualquier transform (aunque valga 0) convierte al elemento en
**bloque contenedor**. Eso rompe el `position: sticky` de los hijos: el título
dejaba de quedar fijo. Ahora es `will-change: auto`.

**Causa 2 — `top: -6px`.** El título se pegaba 6px por encima del borde de la
hoja, y por esa franja se veía pasar el contenido. Ahora es `top: 0`.

También se le agrego `border-bottom` y una sombra, para que se lea que el
título y el contenido son dos cosas separadas.

**Medido:** con el contenido desplazado 600px, el título se movió **0px**.
Y en reposo: `transform: none`, `will-change: auto`, `animation: none`.

> La animación de entrada de la hoja (`.hoja-entrando`) SÍ lleva un
> transform, pero es de 300ms y la clase se saca sola con un `setTimeout`.
> Mientras se arrastra también hay transform, y eso es lo correcto: en iOS la
> hoja sí se mueve. El problema era el de reposo.

**Cuidado con esto:** el arreglo del `border-bottom` tuvo que ponerse
**dos veces**. Una en el bloque de la hoja, y otra en el bloque del diseño
v3, porque el diseño v3 tiene `.modal-head { border-bottom: none }` y va
después, así que le ganaba. Es la misma trampa de especificidad de siempre,
pero al revés: no es el diseño viejo pisando el arreglo, es el diseño
**nuevo** pisando el arreglo.

### El gesto: arrastrar desde el título con el contenido desplazado

Antes el arrastre solo arrancaba si el contenido estaba arriba del todo, así
que si estabas scrolleado y arrastrabas el título no pasaba nada. Ahora, si
el dedo empieza en el encabezado (o en el asa), el arrastre **siempre**
vale: el encabezado está fijo, así que arrastrarlo no puede querer decir
"desplazar".

Y la hoja se **achica** hasta un 5% mientras la arrastrás, además de bajar.
Es lo que hacen las hojas de iOS y comunica "la estoy cerrando".

### 2) La hora con segundos

Cuatro lugares en `app.v2.js`:

- `horaColombia()` — la que se **guarda** en `compras_proveedor.hora` y `liquidaciones.hora`.
- `horaDeVenta()` — la que se **muestra** de una venta.
- La hora de la lista de ventas.
- El fallback `00:00` de liquidaciones → `00:00:00`.

**Medido:** `16:26:54` → `16:26:56` un segundo después. Y a medianoche da
`00:05:07`, no `24:05:07` (que es el caso borde de `hour12: false`).

En Postgres hay que correr `aplicar-paso-8-hora-con-segundos.sql` (ver
sección 9). El cuerpo de la función va copiado byte a byte del paso 7: solo
cambia el formato, en dos lugares. Se comprobó revirtiendo el cambio y
comparando con el paso 7: la única diferencia es `HH24:MI` → `HH24:MI:SS`.

### 3) La tabla de Configuración

**Por qué estaba tan ancha:** `styles.v2.css` fuerza
`min-width: 1800px` en **todas** las tablas, porque las de ventas y compras
tienen muchas columnas. La de usuarios tiene cinco y ninguna es larga, así
que quedaba estirada en un contenedor de 488px, con scroll lateral para
leer "Acciones". Medido antes: 251 + 475 + 368 + 427 + 280 = **1801px**.

Acortar solo la última columna no servía: el navegador le reparte el
sobrante a las otras. Por eso van los dos cambios juntos:

- `min-width: 720px` para esta tabla (de 1800px a **742px** con contenido real).
- La columna "Acciones" con `width: 1px` + `white-space: nowrap`, que es el
  truco clásico para que una columna se encoja hasta lo que necesitan sus
  botones y no se reparta el sobrante. Quedó en **194px** (era 280px).

Y un tercer detalle que apareció al ver el resultado: la última columna es
`position: sticky` (lo pone el `.table-wrap` general, para que en las tablas
grandes los botones siempre se vean). En esta tapaba las columnas del
medio: se veía Nombre, Correo y Acciones, pero **"Rol / Permisos" quedaba
debajo de Acciones**, justo lo que se quería mirar. Se anuló el sticky en
esta tabla; con scroll horizontal normal se llega a todo, en orden.

### 3b) Los colores de los roles

ADMINISTRADOR usaba el verde de "Liquidado" y VENDEDOR el verde azulado de
"Comprado": dos verdes muy parecidos que costaban de distinguir. Ahora hay
clases propias (`.badge-rol.rol-admin` y `.rol-vendedor`):

| | ADMIN | VENDEDOR |
|---|---|---|
| claro | violeta `#6d28d9`, **5.7:1** | gris `#475569`, **6.5:1** |
| oscuro | violeta `#d8b4fe`, **7.7:1** | gris `#cbd5e1`, **9.0:1** |

El violeta además es el color de la marca, así que ADMIN se lee como
"esto es una excepción" y el gris como lo normal, sin competir por la
atención.

### Cómo se verificaron las reglas de celular sin un celular

Las reglas de la hoja son de `@media (max-width: 720px)` y la ventana de
prueba mide **1000px reales** (las capturas salen de 800 porque la
herramienta las reescala; eso hizo creer que la ventana era de 800).

El método que sí sirve: cambiarle **todos** los `@media (max-width: 720px)`
del archivo a 1200px, medir, y revertir. La primera versión solo cambió el
del bloque de la hoja y el borde del título seguía en 0px, porque el que
importaba estaba en el bloque del diseño, con su propio `@media`.

Y copiar el `cssText` de una regla `@media` **no** sirve: se copia el
`@media` entero, que no matchea, y uno concluye que la regla está rota.

**Lo que NO se puede verificar acá:** el comportamiento real en Safari de un
iPhone. Los arreglos de `position: sticky` se comprobaron por medición, y
Samir tiene que confirmarlos en el celular.

### Verificación general

- 372 mediciones de contraste en 6 secciones × 2 temas: **0 problemas**, peor **4.83** (mínimo 4.5).
- Los modales abren sin errores de consola.
- `node --check` limpio en `app.v2.js` y `deslizar-modal.js`.
- Sin BOM, sin LF sueltos, sin texto dañado en ningún archivo.

---

## 14. Resumen ejecutivo — qué queda pendiente (actualizado 2026-09-30)

Si solo vas a leer una cosa de este documento, lee esto. Ordenado por lo que más duele.

| # | Prioridad | Qué | Estado |
|---|---|---|---|
| 0 | 🔴 | **Correr `aplicar-paso-8-hora-con-segundos.sql` en Supabase.** La hora se guarda sin segundos hasta que se corra: la app ya manda `HH:MM:SS`, pero la función `guardar_abono_yesenia` sigue rellenando `HH24:MI`. La cabecera del .sql trae un `SELECT` que solo mira, para revisar el tipo de la columna antes. | Pendiente, lo corre Samir |
| 1 | 🟠 | **`saveCompra` no es atómico.** N `UPDATE` secuenciales sin transacción: si se corta la señal en el tercero, quedan pedidos con `compra_id` y `abono_yesenia` a medias. **La opción 1 (validar en JS) se descartó por inútil**: valida y después vuelve a escribir, así que la ventana sigue ahí, y dobla las peticiones. Lo que falta es una **función de Postgres** que persista todo en una transacción. | Pendiente — agreed con Samir |
| 2 | 🟡 | **`Shift+rueda`** no desplaza las 4 tablas de Resúmenes (los listeners se atan a las `.table-wrap` que ya existen al cargar; esas se crean después). | Pendiente, bajo riesgo |
| 3 | 🟡 | **`xlsx@0.18.5`** con CVEs públicos sin parche (CDN en el `<head>`). | Pendiente, se puede quitar la librería |
| 4 | ⚪ | **Tabla sobrante** `liquidaciones_ganancias` en Supabase: no la usa la app (0 referencias). Se puede borrar con `DROP TABLE liquidaciones_ganancias;`. | Opcional |
| 5 | ⚪ | **Key SSH:** no acelera nada (el build es de GitHub). Solo evita el prompt del token al hacer push. | Opcional |
| 6 | ⚪ | **Backfill de `compra_pedidos`:** los abonos guardados antes del 2026-09-29 no tienen renglón, así que se muestran como siempre (Samir decidió dejarlos así). Si algún día se quieren separar, hay que reconstruirlos a mano. | Opcional, decidido NO hacer |

**Ya resueltos y no volver a tocar:**
- ✅ **`updateEstado` ya no borra estados** (entrada 63): cada camisa se edita en su propio dropdown dentro de un modal. Era el pendiente más grave.
- ✅ **Abonos a medias**: se completan desde "Nuevo abono", sumando lo pagado en vez de pisarlo (entrada 66).
- ✅ **Cada visita a Yesenia separada** con la tabla `compra_pedidos` (entrada 67).
- ✅ RLS de Postgres: la anon key no lee, escribe ni borra nada. Verificado con `verificar-seguridad.js` y también con `compra_pedidos`.
- ✅ Papelera: borrado lógico con `eliminado_at`, restaurable.
- ✅ Caché: `?v=` versionado + aviso automático de versión nueva.
- ✅ Pérdidas entre socios: regla definida por Samir y explicada en pantalla.
- ✅ Código muerto y XSS: barridos.
- ✅ Aviso de "el otro dispositivo guardó algo": sin recargar nada (ver entrada 58).
- ✅ **Editar pedido es un modal** y no te saca de Pedidos (entrada 64).

**Lo que se decidió NO hacer:**
- La sincronización en tiempo real se retiró (entrada 53): a Samir no le gustó cómo se comportaba dentro de la página.
- No se tocó `supabase_realtime` (las 4 tablas siguen ahí): sin clientes suscritos no cuesta nada.
- No se filtró filas por usuario a nivel de RLS: con dos personas que se conocen, el filtro en la app es suficiente y la alternativa añade complejidad y riesgo.
- **Rediseño visual v3 (2026-09-30):** se hizo, es solo CSS, y se deshace con `node aplicar-diseno.js --quitar`. La lógica no se tocó (entrada 13 bis).
- **No rediseñar la lista de abonos**: se intentó con tarjetas y se revirtió (entrada 70). La tabla se queda como estaba.
- **No copiar el formulario para el modal de edición**: se mueve el nodo, para no duplicar IDs (entrada 64).
