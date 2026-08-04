# Camisas IUB — Sistema de control de ventas

Aplicación web de **página única (un solo archivo HTML)** para controlar la venta de camisas del negocio de Samir y Valentina, con base de datos en **Supabase (Postgres)**.

---

## 1. Archivos y ubicación

| Archivo | Descripción |
|---|---|
| `index.html` | **La aplicación completa** (HTML + CSS + JS). Se abre directo en el navegador. |
| `backup/index - backup.html` | Backup anterior (desactualizado, no tocar). |
| `backup/index - backup v2.html` | Backup anterior (desactualizado, no tocar). |
| `PROYECTO.md` | Este documento. |

- Todo el desarrollo se hace **solo en `index.html`**.
- No hay build, ni npm, ni dependencias locales: el archivo carga Supabase desde un CDN (`window.supabase.createClient`).

---

## 2. Cómo ejecutar

1. Abrir `index.html` con el navegador (doble clic o arrastrar a Chrome).
2. Iniciar sesión con un correo/contraseña de Supabase Auth.

> No requiere servidor. La base de datos está en la nube (Supabase), por lo que **funciona igual en cualquier PC** mientras el `index.html` esté actualizado.

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

> ⚠️ **IMPORTANTE:** el negocio maneja **dos montos distintos** por pedido (ver sección 6). La tabla `ventas` debe tener la columna **`abono_yesenia`** (migración en sección 9).

### `ventas` — un pedido de camisas (una fila por pedido/cliente)
| Columna | Tipo | Uso |
|---|---|---|
| `id` | uuid | PK |
| `cliente_nombre`, `cliente_telefono` | text | Cliente |
| `cliente_programa`, `genero`, `color`, `talla` | text | Datos resumen de la camisa |
| `cantidad` | int | Nº de camisas del pedido |
| `precio_unitario` | numeric | Precio de venta al cliente (por camisa) |
| `costo_unitario` | numeric | **Costo que hay que pagar a Yesenia por camisa** (ej. 30.000) |
| `abono` | numeric | **Abono que dio el CLIENTE al vendedor** (ej. Diego pagó 20.000) |
| `abono_yesenia` | numeric | **Abono que el VENDEDOR pagó a Yesenia** por este pedido (ej. 30.000). ⚠️ columna nueva. |
| `estado` | text | `Pedido`, `Comprado`, `Bordado`, `Entregado`, `Pagado` |
| `vendedor` | text | Quién vendió (Samir / Valentina) |
| `entrega_por` | text | Quién entrega el pedido (opcional) |
| `fecha`, `fecha_entrega`, `lugar_entrega`, `nota` | | Fechas y detalle de entrega |
| `items_camisa` | jsonb | Detalle **por camisa/unidad**: `[{ genero, color, talla, programa, abono, abono_yesenia }, ...]` |
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

- **🏠 Inicio (dashboard):** accesos rápidos, estado del negocio, y una sola lista "Pedidos que debo entregar" = lo que vendí + lo que debo entregar (unión sin duplicados).
- **➕ Nueva Venta / edición:** formulario con modo simple e individual (por camisa). El "Abono recibido del cliente" se reparte por camisa en `items[].abono`.
- **📋 Pedidos:** tabla con Abono Cliente, Saldo Cliente, Pagado a Proveedor, Falta Pagar. Botones: Editar, + Abono (cliente), Finalizar, Borrar. Cambio de estado directo.
- **🛍️ Abonos Yesenia:** lista de abonos (compras). Botón "+ Nuevo abono". Cada fila muestra pedidos con su "Abono" (a Yesenia) y "Saldo". Botón "Ver / Abonar" abre el modal; **"💰 Abonar más a Yesenia"** permite registrar otro pago por pedido para cubrir el saldo.
- **💰 Liquidaciones:** pagos entre socios (50% de la ganancia por pedido). Selecciona pedido con saldo pendiente.
- **📊 Resúmenes / 📈 Reportes:** estadísticas, ventas, por vendedor, por cliente, compras, KPIs.
- **⚙️ Configuración (solo admin):** CRUD de filas en `usuarios`.
- **📚 Historial:** pedidos finalizados (restaurar / borrar).

### Flujo de un "Abono a Yesenia" (modal)
1. `+ Nuevo abono` → se eligen personas (clientes) y se escribe **"Abono total que paga a Yesenia"** por persona.
2. Al guardar (`saveCompra`): se vincula cada pedido (`compra_id`), se reparte el abono entre los pedidos de esa persona (proporcional al costo) en `abono_yesenia`, **sin tocar el abono del cliente**.
3. `registrarAporteAutomatico` inserta/actualiza una fila en `compra_aportes` (persona = quien tiene la sesión, monto = total abonado).
4. "Ver / Abonar" (modal): cualquier vendedor con pedidos propios con saldo puede usar **"Abonar más a Yesenia"** escribiendo el monto **por pedido** (aumenta `abono_yesenia` y registra un aporte nuevo con `observacion = 'Abono adicional'`).

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
8. **Inicio:** fusionadas "Pedidos que vendí" + "Pedidos que debo entregar" en una sola lista.

---

## 9. ⚠️ Migración pendiente en Supabase (SQL Editor)

Requiere que la tabla `ventas` tenga la columna `abono_yesenia`. Ejecutar **una vez** en el SQL Editor de Supabase:

```sql
ALTER TABLE ventas ADD COLUMN abono_yesenia numeric DEFAULT 0;

-- Migrar datos existentes: para pedidos ya vinculados a un abono,
-- lo que estaba en "abono" era lo pagado a Yesenia (bug anterior).
UPDATE ventas SET abono_yesenia = abono
WHERE compra_id IS NOT NULL AND (abono_yesenia IS NULL OR abono_yesenia = 0);
```

> Esto ya se ejecutó en la base en la nube, por lo que también aplica a cualquier otro PC. **Nota:** los pedidos viejos que ya estaban en un abono quedaron con el abono del cliente corregible manualmente (su columna "Abono Cliente" mostraba el valor de Yesenia por el bug).

---

## 10. Convenciones y buenas prácticas para continuar

- **Editar solo `index.html`.** No se agregan comentarios al código salvo que el usuario lo pida.
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
- Los respaldos `backup/` están desactualizados; si se necesita un respaldo nuevo, copiar `index.html` a `backup/` con nombre y fecha.
