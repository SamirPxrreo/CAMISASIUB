# Guía de Continuidad y Entrega — Camisas IUB 🚀

> **Documento de Traspaso y Referencia Rápida**  
> Diseñado para que cualquier desarrollador o el propio usuario pueda abrir, editar, compilar y desplegar el proyecto en cualquier computadora sin fricción.

---

## 1. Datos Clave del Proyecto

* **Repositorio en GitHub**: [https://github.com/SamirPxrreo/CAMISASIUB.git](https://github.com/SamirPxrreo/CAMISASIUB.git)
* **Página en Vivo (GitHub Pages)**: [https://samirpxrreo.github.io/CAMISASIUB/](https://samirpxrreo.github.io/CAMISASIUB/)
* **Ramas Principales**:
  * `main`: Producción activa servida directamente por GitHub Pages.
  * `redesign-impeccable`: Rama de desarrollo y sincronización idéntica a `main`.
* **Copia Local Visible**:
  `D:\User\Documents\CAMISASIUB\`

---

## 2. Cómo Continuar en Otro PC (Paso a Paso)

### Paso 1: Prerrequisitos en la nueva máquina
1. **Node.js**: Descargar e instalar la versión LTS (v18 o v20+) desde [nodejs.org](https://nodejs.org/).
2. **Git**: Descargar e instalar desde [git-scm.com](https://git-scm.com/).
3. **Editor recomendado**: VS Code, Cursor o WebStorm.

### Paso 2: Obtener el Código

Si vas a clonar desde cero en el nuevo PC:
```bash
git clone https://github.com/SamirPxrreo/CAMISASIUB.git
cd CAMISASIUB
```

Si copiaste los archivos desde una memoria USB o desde `D:\User\Documents\CAMISASIUB`, simplemente abre esa carpeta en tu terminal.

### Paso 3: Instalar Dependencias
Entra a la carpeta de React e instala los paquetes:
```bash
cd react-app
npm install
```

### Paso 4: Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
La aplicación se abrirá en `http://localhost:5173/` con recarga rápida en vivo (*Hot Module Replacement*).

#### Para probar en celular en la misma red Wi-Fi:
```bash
npx vite --host --port 5173
```
Vite te mostrará en pantalla la dirección de red local (ejemplo: `http://192.168.1.15:5173/`) para abrirla desde el navegador de tu teléfono.

---

## 3. Base de Datos y Supabase

Las credenciales públicas de Supabase ya están configuradas de forma segura en:
`react-app/src/lib/supabase.js`

* **URL del Proyecto**: `https://vyiixbblcskrwhdcmqel.supabase.co`
* **Anon Key**: Configurada en el cliente.
* **Seguridad**: Row Level Security (RLS) habilitada en Postgres.

### Tablas Principales de Supabase:
1. `ventas`: Contiene cada pedido o venta registrada.
   * **Importante**: La columna para el teléfono del cliente se llama `cliente_telefono` (NO `telefono`).
   * Columnas históricas NOT NULL requeridas: `cliente_nombre`, `cliente_telefono`, `color`, `talla`, `genero`, `modelo`, `cliente_programa`, `cantidad`, `precio_unitario`, `costo_unitario`, `abono`, `estado`, `fecha`.
2. `compras_proveedor`: Compras y abonos al taller de confección (Yesenia).
3. `compra_aportes`: Aportes de socios a compras de confección.
4. `compra_pedidos`: Relación de qué pedidos están incluidos en cada compra a confección.
5. `liquidaciones`: Repartición matemática de ganancias (50/50 de utilidad) y compensaciones.
6. `usuarios`: Cuentas del sistema con roles (`admin` y `vendedor`).

---

## 4. Estructura de Archivos del Frontend

```
CAMISASIUB/
├── index.html                      # Raíz servida por GitHub Pages (dist/index.html)
├── assets/                         # Bundles JS/CSS compilados + aliases anti-caché
├── README.md                       # Documentación general del proyecto
├── DESIGN.md                       # Guía de diseño, temas y componentes
├── HANDOFF.md                      # Esta guía de continuidad
├── react-app/                      # Código fuente completo de React
│   ├── package.json                # Dependencias (React 19, Vite 6, Tailwind, Lucide, Framer Motion)
│   ├── vite.config.js              # Configuración de compilación con base relativa ./
│   ├── index.html                  # Plantilla HTML con metatags anti-caché y viewport PWA
│   └── src/
│       ├── main.jsx                # Punto de entrada de React
│       ├── App.jsx                 # Enrutamiento hash (#) y vista principal
│       ├── index.css               # Estilos globales, temas y Tailwind
│       ├── components/
│       │   ├── OrdersView.jsx          # Tablero de pedidos con prendas compactas
│       │   ├── OrderDetailModal.jsx    # Modal detallado para pedidos de varias camisas
│       │   ├── CustomSelect.jsx        # Dropdown propio animado (reemplaza selects nativos)
│       │   ├── StatusDropdown.jsx      # Selector flotante de estados con chips de color
│       │   ├── NewSaleModal.jsx        # Formulario para registrar o editar pedidos
│       │   ├── SettingsView.jsx        # Configuración (Colores, Lugares, Usuarios)
│       │   ├── CalendarView.jsx        # Calendario de entregas y mensajes
│       │   ├── CuentasView.jsx         # Cuentas por cliente y recibos PDF
│       │   ├── PurchasesView.jsx       # Abonos Yesenia (deudas Samir/Valentina)
│       │   ├── SettlementsView.jsx     # Liquidaciones y compensaciones entre socios
│       │   ├── HistoryView.jsx         # Historial enriquecido de compras y visitas
│       │   ├── TrashView.jsx           # Papelera de reciclaje segura
│       │   ├── ReportsView.jsx         # Métricas y exportación a Excel
│       │   ├── SummariesView.jsx       # Resumen ejecutivo
│       │   ├── Sidebar.jsx             # Menú lateral fijo en pantalla
│       │   ├── TopBar.jsx              # Barra superior con avatar, tema y logout
│       │   ├── BottomNav.jsx           # Barra de navegación inferior para móvil
│       │   ├── Pagination.jsx          # Navegación por hojas numeradas (1, 2, 3...)
│       │   ├── InlineDeleteConfirm.jsx # Botón con fusible de tiempo para borrar
│       │   ├── FloatingLabelInput.jsx  # Input con letras flotantes (Bencho style)
│       │   ├── LoginView.jsx           # Pantalla de acceso
│       │   └── ErrorBoundary.jsx       # Atrapador de errores de renderizado
│       ├── context/
│       │   ├── AuthContext.jsx         # Sesión, login, logout y roles (admin/vendedor)
│       │   ├── DataContext.jsx         # Acceso a Supabase, Realtime y catálogos locales
│       │   └── ThemeContext.jsx        # 5 temas visuales con persistencia
│       └── lib/
│           ├── excelExport.js          # Motor ExcelJS: AutoFilter, estilos y hoja Tallas/Colores
│           ├── supabase.js             # Inicialización de Supabase client
│           └── utils.js                # Funciones auxiliares, matemáticas, formatos COP
```

---

## 5. Reglas de Despliegue y Publicación a GitHub Pages

GitHub Pages sirve directamente la **raíz** de la rama `main` del repositorio `https://github.com/SamirPxrreo/CAMISASIUB/`.

### Procedimiento Estándar de Compilación y Publicación:

```powershell
# 1. Situarse en la carpeta react-app y compilar
cd react-app
npm run build

# 2. Copiar los archivos generados en dist/ a la raíz del repositorio
Copy-Item -Path "dist\index.html" -Destination "..\index.html" -Force
Copy-Item -Path "dist\assets\*" -Destination "..\assets\" -Force

# 3. Volver a la raíz, confirmar los cambios y hacer push
cd ..
git add .
git commit -m "Descripción clara de las mejoras realizadas"
git push origin main
git push origin main:redesign-impeccable
```

### Prevención de Pantallas Blancas en Clientes:
- `index.html` incluye cabeceras `Cache-Control: no-store, no-cache, must-revalidate` para forzar a los navegadores a buscar siempre la última versión.
- En `assets/`, además de los nuevos archivos con hash de Vite, se mantienen copias alias con los nombres de hash anteriores para que los clientes que tengan un HTML en caché no reciban un error 404.

---

## 6. Roles y Permisos en la Aplicación

| Característica | Administrador | Vendedor |
|---|---|---|
| **Acceso a Configuración** | ✅ Total (Colores, Lugares, Usuarios) | ❌ Oculto y bloqueado |
| **Ver pedidos de otros vendedores** | ✅ Puede ver y filtrar todos | ❌ Solo ve sus propios pedidos |
| **Vendedor al registrar pedido** | ✅ Puede asignar a cualquier socio/vendedor | 🔒 Bloqueado a su propio nombre |
| **Papelera de reciclaje** | ✅ Ver, restaurar y vaciar definitivamente | ⚠️ Solo restaurar pedidos propios |
| **Liquidaciones y compras** | ✅ Total acceso | ❌ Solo consulta restringida |

---

## 7. Soporte Móvil y PWA ("Agregar al Inicio")

La aplicación está completamente adaptada para usarse como una app instalada en teléfonos inteligentes (Android / iPhone):
- En Chrome (Android): menú de 3 puntos ➔ **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
- En Safari (iOS): botón de compartir ➔ **"Agregar a pantalla de inicio"**.
- Los modales, selectores y tarjetas están calculados con zonas de toque amplias (mínimo 44px de altura) y físicas táctiles suaves.
- Viewport adaptativo `100dvh` para evitar que la barra de direcciones de Android o iOS desplace el navbar inferior hacia arriba.

---

## 8. Sistema de Exportación Excel y Adaptabilidad de Pantalla

### Exportación a Excel con ExcelJS (`excelExport.js`):
- **Botón "Exportar por Comprar" en Pedidos**: Filtra en tiempo real únicamente los pedidos con camisas en estado `'Pedido'` para generar la lista de compras del taller de confección (Yesenia).
- **Hoja "Resumen Tallas y Colores"**: Agrupa estrictamente por **Género, Color y Talla** ignorando el bordado, sumando la cantidad total de prendas idénticas (ej. combina múltiples pedidos de *Mujer Negro S* en una sola fila con la cantidad sumada).
- **Hojas Adicionales del Libro**:
  - *Lista con Bordados*: Agrupada con versión de camisa, género, color, talla y programa de bordado para el taller de bordado.
  - *Detalle Prendas a Comprar*: Registro fila por fila con ID de pedido, cliente, teléfono, costos y notas.
  - *Resumen de Compra*: Métricas de prendas, costo total a pagar a Yesenia, venta proyectada y repartición 50/50 de ganancia entre Samir y Valentina.
- **AutoFilter**: Todas las columnas cuentan con flechas de ordenamiento y filtrado nativas de Excel.
- **Exportación Individual**: Botón en `OrderDetailModal` para descargar un pedido puntual con su resumen de tallas/colores y detalle.

### Responsividad Móvil y Zoom (110% - 125%):
- **Viewport Dinámico (`100dvh`)**: Evita desajustes por la barra de navegación del navegador en teléfonos móviles.
- **Barra de Navegación Docked (`BottomNav.jsx`)**: Anclaje inferior limpio a 64px (`h-16`) con `env(safe-area-inset-bottom, 0px)` y adaptación automática a todos los temas (modo oscuro `#131b2e` y temas claros).
- **Prendas sin Truncamiento (`break-words`)**: Descripciones completas en tarjetas y modales que fluyen naturalmente a múltiples líneas en pantallas pequeñas o zoom alto.

---

## 9. Sistema de Estados de Pedidos y Notificador de Actualizaciones

### Actualización de Estados Multicamisa:
- **Respeto a Restricciones de Supabase**: La base de datos tiene una restricción `ventas_estado_check` que restringe `estado` a `['Pedido', 'Comprado', 'Bordando', 'Listo para entrega', 'Entregado', 'Liquidado']`.
- **Cálculo de Estado General**: Cuando un pedido contiene camisas con diferentes estados, el estado general de la venta se calcula dinámicamente según el estado más retrasado entre sus prendas (en lugar de valores no permitidos como 'Mixto'), garantizando que Supabase acepte la actualización sin errores.
- **Selectores de Estado Interactivos**:
  - Tanto la tarjeta principal del pedido como el modal de detalle (`OrderDetailModal`) cuentan con `StatusDropdown` interactivo con `e.stopPropagation()` y `z-50`.
  - Al cambiar el estado en la cabecera del pedido, se actualizan todas las prendas del pedido simultáneamente (`updateOrderEstadoCompleto`).
  - Al cambiar el estado de una prenda individual, se actualiza solo esa prenda y se recalcula el estado general del pedido (`updateItemEstado`).
- **Actualización Optimista**: La interfaz refleja el cambio de estado de inmediato en memoria local sin esperar la respuesta de la red, brindando respuesta instantánea al usuario.
- **Tablero de Pedidos Limpio y Directo**: Se mantiene la vista de pedidos simple y despejada, con los chips clásicos de estado en tonos pastel y sin filtros complejos de fecha para asegurar que ningún pedido se oculte involuntariamente.
- **Contadores de Estado Sensibles al Usuario y Filtro**: Los minicontadores numéricos de cada chip de estado (`Todos`, `Pedido`, `Comprado`, etc.) se calculan estrictamente filtrando por el vendedor activo:
  - Cuando inicia sesión **Samir**, los contadores reflejan únicamente los pedidos y prendas pertenecientes a Samir.
  - Cuando inicia sesión **Valentina**, los contadores reflejan únicamente sus propios pedidos.
  - Cuando inicia sesión el **Administrador**, los contadores reflejan el consolidado general de todos los socios (o del socio seleccionado en el selector de filtro). Esto previene que se muestren cifras engañosas de pedidos que el usuario no tiene permisos de ver en su pantalla.

### Notificador de Actualización de la App (`UpdateNotifier.jsx`):
- **Detección Automática de Nuevas Versiones**: Cada 90 segundos y cada vez que el usuario vuelve a la app (evento `visibilitychange`), la aplicación consulta silenciosamente si hay un nuevo bundle de producción desplegado en el servidor.
- **Aviso Flotante Elegante**: Si se detecta una nueva compilación, aparece un banner flotante en la parte superior:
  `⚡ Nueva versión disponible — Hay cambios recientes en la app. [Actualizar]`
- **Actualización con un Toque**: Al pulsar el botón, se vacían las cachés de la PWA / navegador (`caches.delete`) y se recarga la página de inmediato con la versión más reciente.

---

## 10. Navegación Fluida, Reglas de 'Liquidado' y Gestión de Abonos Yesenia

### 1. Navegación Calendario ➔ Cuentas y Reset de Scroll:
- **Botón "Ver en Cuentas" en Calendario**: Cada tarjeta de pedido en `CalendarView` cuenta con un botón directo para abrir dicho pedido en la sección de **Cuentas**.
- **Auto-Búsqueda y Auto-Expansión**: Al saltar de Calendario a Cuentas, la vista filtra automáticamente por el nombre del cliente, expande la tarjeta de su cuenta y resalta el pedido con la insignia `🎯 Desde Calendario`.
- **Gestión Completa en Cuentas**: Cada pedido dentro de la cuenta del cliente cuenta con:
  - Selector interactivo `StatusDropdown` para cambiar el estado.
  - Botón **"Prendas"** para inspeccionar las camisas y sus estados individuales en `OrderDetailModal`.
  - Botón **"Editar"** para modificar detalles del pedido.
  - Botón **"Finalizar"** para moverlo al historial una vez completado.
- **Scroll Reset Inmediato**: Cada vez que el usuario cambia de menú/sección (`currentSection`), el contenedor principal de la aplicación reinicia su posición al inicio (`scrollTop = 0` y `window.scrollTo(0, 0)`), evitando que se abra a la altura donde se encontraba la vista previa.

### 2. Reglas de Validación de 'Liquidado' y 'Finalizar Pedido':
- **Bloqueo de Estado 'Liquidado'**:
  - Ningún pedido (ni camisa individual) puede marcarse como `'Liquidado'` a menos que cumpla con los 3 requisitos:
    1. Estar 100% cobrado al cliente (`saldoCliente <= 1`).
    2. Estar 100% pagado a Yesenia (`abonosProveedorPorVentaId.pendiente <= 1`).
    3. Estar 100% liquidado con el otro socio (`saldoSocioPendientePedido <= 1`).
  - Si el usuario intenta pasarlo a `'Liquidado'` sin cumplir alguna condición, el sistema bloquea el cambio y muestra una alerta clara con los pasos pendientes exactos.
- **Botón "Finalizar Pedido"**:
  - Disponible tanto en la tarjeta de `OrdersView`, en `CuentasView`, como en `OrderDetailModal`.
  - Solo permite finalizar si **todas las prendas están en estado 'Liquidado'** (`estadosTodosLiquidado(v)`).
  - Al confirmarse, marca `{ finalizado: true }` en Supabase, lanza confeti y traslada el pedido de inmediato al **Historial de pedidos**.

### 3. Lógica de Abonos a Yesenia (Abono y Seña):
- **Comprador Protegido por Rol**:
  - Cuando inicia sesión un vendedor estándar (**Samir** o **Valentina**), el selector de la persona que entrega el dinero queda fijado y deshabilitado (`disabled`) con un icono de candado.
  - El usuario **Administrador** puede seleccionar libremente entre `Samir`, `Valentina` o `Ambos`.
- **Filtro de Pedidos por Comprador**: El listado de pedidos pendientes del taller muestra únicamente los pedidos pertenecientes al socio que está realizando el pago.
- **Aporte y Seña por Pedido Específico**:
  - Al marcar cualquier pedido pendiente en la lista, se habilita un campo numérico: `Aporte / Seña a este pedido ($)`.
  - Permite ingresar pagos parciales (señas) o el costo completo, mostrando en tiempo real cuánto restará por pagar de esa prenda.
  - Incluye botón de 1 clic para copiar la suma total asignada a los pedidos directamente al campo de aporte del socio.
- **Persistencia Exacta en Supabase**:
  - Se registra el desglose en `compra_pedidos` con el monto puntual pagado a cada pedido.
  - Se actualiza el acumulado `abono_yesenia` y la repartición proporcional en `items_camisa` en la tabla `ventas`, liberando la deuda del pedido en el taller.

---

## 11. Rediseño Impecable de Pedidos, Trazabilidad y Formateo Monetario

### 1. Rediseño Limpio y Balanceado de Pedidos (`OrdersView.jsx`):
- **Eliminación del Ruido Visual**: Se sustituyó el diseño abrumador con múltiples cajas anidadas por una tarjeta moderna, ventilada y equilibrada.
- **Estructura de la Tarjeta**:
  1. *Encabezado*: Avatar del cliente con color del vendedor, nombre claro, insignia de vendedor con color diferenciado, teléfono y estado general fijo (ej. "Mixto" o estado unánime).
  2. *Fila de Fechas*:
     - **Registro**: Fecha y hora legible en que se creó la venta (ej. `13 oct, 09:42 pm`).
     - **Entrega**: Fecha programada para el cliente (`formatearFechaHumana`).
  3. *Resumen Limpio de Prendas*: Lista estilizada con número de camisa (`#1`, `#2`), género, color, talla, versión y bordado, junto con su estado individual y lugar de entrega si aplica.
  4. *Pie Financiero y Acciones Rápidas*:
     - Saldo grande y destacado (`Pagado ✓` en esmeralda o `Resta $XX.XXX` en ámbar).
     - Botón principal **"Ver detalle"** que abre `OrderDetailModal`.
     - Accesos rápidos compactos: WhatsApp directo, Copiar resumen (con animación de check), Editar y Papelera (`InlineDeleteConfirm`).
     - Si todas las prendas están liquidadas, aparece un botón directo para finalizar en 1 clic.
- **Orden de Pedidos Más Recientes Primero**: Los pedidos se ordenan cronológicamente de forma descendente por `created_at` o `fecha` en todas las consultas y filtros.

### 2. Trazabilidad y Auditoría de Cambios de Estado:
- **Resguardo Lejos de la Vista Principal**: Para no sobrecargar la tarjeta, el historial no se muestra en el tablero general.
- **Visualizador Colapsable en `OrderDetailModal`**:
  - Botón desplegable *"Historial y Trazabilidad de Estados"* con contador de eventos registrados.
  - Al abrirse, muestra la línea de tiempo con fecha y hora exacta (`formatearFechaYHora`), detalle del cambio (ej. "Creación del pedido", "Camisa #1 pasó a Comprado") y usuario que ejecutó la acción.
- **Persistencia en Supabase**: Los eventos de auditoría se empaquetan en el campo `items_camisa` como `{ items: [...], historial: [...] }`, permitiendo sincronización en la nube entre dispositivos sin alterar el esquema de PostgreSQL.

### 3. Autoformateo de Miles Colombiano (`formatMiles` y `parseMiles`):
- **Bloqueo de Puntos Manuales**: En todos los inputs de dinero (`NewSaleModal`, `PurchasesView`, `SettlementsView`), se bloquea la tecla punto (`.`) y coma (`,`) para evitar ingresos erróneos de decimales.
- **Formateo Dinámico en Vivo**: Al escribir números, el sistema inserta automáticamente los puntos de miles colombianos (ej. `2500` ➔ `2.500`, `30000` ➔ `30.000`, `150000` ➔ `150.000`).

### 4. Diferenciación de Vendedores por Colores en Todo el Sistema:
- **Samir**: Esquema azul / índigo (`text-indigo-700`, `bg-indigo-50`, `border-indigo-200`).
- **Valentina**: Esquema rosa / fucsia (`text-fuchsia-700`, `bg-fuchsia-50`, `border-fuchsia-200`).
- Aplicado consistentemente en:
  - Tarjetas de pedidos (`OrdersView`).
  - Modal de detalle de pedidos (`OrderDetailModal`).
  - Calendario de entregas (`CalendarView`).
  - Historial de pedidos finalizados (`HistoryView`).
  - Gestión de compras y pagos al taller (`PurchasesView`).

---

## 12. Estandarización de Prendas, Orden del Historial y Bloqueo de Liquidación

### 1. Formato Universal de Prendas (Sin menciones a V1):
- **Cero referencias a V1**: Bajo ninguna circunstancia se muestra el texto `V1` o `Versión 1`. En prendas clásicas o estándar, no se agrega ninguna etiqueta de versión para mantener la interfaz limpia.
- **Distinción Exclusiva de V2**: Únicamente cuando la prenda es de nueva versión (`modelo === 'Nuevo'`), se muestra la insignia `v2` en tono ámbar suave (`bg-amber-500/15 text-amber-700`).
- **Descripción Completa y Limpia**: Estandarizada en todas las tarjetas (`OrdersView`, `CalendarView`, `HistoryView`), modales (`OrderDetailModal`, `NewSaleModal`), recibos PDF y resúmenes de WhatsApp bajo la estructura:
  `[Color] · Talla [Talla] para [Mujer/Hombre]` (ejemplo: `Negro · Talla XL para Mujer`).
- **Numeración de Prendas**: Cada prenda en un pedido múltiple se identifica claramente con su índice (`#1`, `#2`, `#3`) y su programa/bordado destacado en badge índigo.

### 2. Historial de Pedidos Ordenado por Finalización Reciente (`HistoryView.jsx`):
- Los pedidos archivados en el historial se ordenan automáticamente mediante la función `fechaFinalizacionPedido(v)`.
- El pedido que se acaba de finalizar se ubica inmediatamente en la **primera posición (arriba del todo)** del historial.
- El timestamp de finalización se toma del evento `{ tipo: 'finalizado' }` registrado en el historial de auditoría de `items_camisa`, con fallback seguro a `updated_at` o `fecha`.

### 3. Bloqueo Inviolable de Liquidación y Finalización (`finalizarPedido` y `updateItemEstado`):
- Ningún pedido puede pasar a finalizado (ni trasladarse al historial) a menos que cumpla con los 4 pilares:
  1. **100% cobrado al cliente** (`saldoCliente <= 1`).
  2. **100% pagado/abonado a Yesenia** (`abonosProveedorPorVentaId.pendiente <= 1`).
  3. **100% liquidado con el otro socio** (`saldoSocioPendientePedido <= 1`).
  4. **Todas sus camisas en estado Liquidado** (`estadosTodosLiquidado(v)`).
- Si alguna condición no se cumple, el sistema bloquea la acción y le indica al usuario exactamente cuánto falta pagar a Yesenia, cuánto cobrar al cliente o cuánto liquidar al socio.
- Al confirmarse, se sella el evento `finalizado` en Supabase con fecha, hora y autor, asegurando trazabilidad contable total.

---

## 13. Calendario Semanal por Columnas, Modal de Abonos y Tarjetas Reforzadas

### 1. Calendario Semanal por Columnas (`CalendarView.jsx`):
- **Estructura tipo Agenda/Citas**: Diseñado con cuadrícula semanal de 7 columnas (`LUN` a `DOM`), con cabeceras que muestran el día abreviado y el número en grande. El día de hoy (`esHoy`) se resalta con texto índigo y fondo ligeramente tintado.
- **Navegación Intuitiva**: Botones `<` (semana anterior), `Hoy` (regreso inmediato) y `>` (semana siguiente), acompañados del título dinámico del mes (ej. `Octubre De 2026`).
- **Tarjetas de Citas/Pedidos Compactas**:
  - Hora/ID en la parte superior y badge circular del vendedor (`S` o `V`).
  - Nombre del cliente en negrita legible.
  - Tag redondeado de lugar o cantidad de prendas.
  - Resumen de prendas y chip pastel de estado.
  - Saldo en tiempo real (`Pagado ✓` o `Resta $XX.XXX`).
  - Columnas vacías identificadas con la etiqueta limpia `Libre`.
- **Apertura de Ventana Modal (`OrderDetailModal`)**: Al hacer clic en cualquier tarjeta del calendario, se abre el modal interactivo con todas las opciones comunes (WhatsApp directo, copiar para WhatsApp, editar, cambiar estados de cada camisa, registrar abono y finalizar).

### 2. Eliminación de Animaciones Defectuosas en Cuentas (`CuentasView.jsx`):
- Se removió la propiedad `layout` de Framer Motion en las tarjetas de cliente y se reemplazó el contenedor del desplegable por un elemento estructural limpio.
- La apertura y el cierre de los pedidos de cada cliente ocurren de forma instantánea y natural, sin deformaciones visuales, saltos o estiramientos en pantalla.

### 3. Registro de Abonos del Cliente (`AddAbonoModal.jsx`):
- **Botón `Abonar` en Pedidos y Detalle**: Disponible tanto en cada tarjeta de `OrdersView` como dentro de `OrderDetailModal` para pedidos con saldo pendiente.
- **Soporte Multicamisa con Topes Máximos**:
  - En pedidos de varias camisas, permite distribuir el abono por prenda sin permitir superar el saldo individual de cada una.
  - Cuenta con un campo general que distribuye automáticamente el monto recibido entre las prendas que tengan saldo pendiente.
  - Botón de 1 clic: **"Pagar Saldo Completo"**.
  - Validación estricta que impide abonar más del saldo restante total.
- **Persistencia y Auditoría**:
  - Autoformateo de miles colombiano (bloqueo de punto manual).
  - Actualización atómica en Supabase (`ventas.abono` y desglose en `items_camisa`).
  - Registro de auditoría `{ tipo: 'abono_cliente' }` con método de pago y fecha exacta en la trazabilidad.
  - Disparo de confeti al quedar en saldo $0.

### 4. Tarjetas de Pedidos con Bordes Nítidos de 2px (`OrdersView.jsx`):
- Se reforzó el contorno con `border-2 border-slate-200/90 hover:border-indigo-400` y sombra suave, logrando una delimitación visual nítida que separa claramente cada pedido en la pantalla.
- División interna estructurada: encabezado del cliente separado con `border-b` y pie de tarjeta separado con `border-t-2`, brindando orden y jerarquía visual inmediata.

---

## 14. Simplificación de Tarjetas, Botón Rojo de Borrado, Código Corto y Reportes de 2 Opciones

### 1. Código Corto de Pedido (`codigoCortoPedido`):
- Se implementó un identificador compacto y amigable (ej: `#S04`, `#V12`, `#15`, `#A1`) en lugar de IDs largos o alfanuméricos excesivos.
- Muestra la inicial del vendedor (`S` para Samir, `V` para Valentina) acompañada de los dos últimos dígitos, o el ID directo si es numérico corto.
- Visible en: encabezado de tarjeta en `OrdersView`, tarjetas de `CalendarView`, cabecera de `OrderDetailModal`, tabla de vista previa de `ReportsView` y hoja de cálculo de `excelExport.js`.

### 2. Pulido de Tarjetas del Calendario (`CalendarView.jsx`):
- **Eliminación de la Hora**: Se retiró la hora falsa/fija (`10:00`, `Clock`) que cargaba visualmente la vista.
- **Jerarquía Reenfocada**:
  - Código corto `#S04` y badge circular del socio en la fila superior.
  - Nombre del cliente destacado en negrita.
  - Pill de lugar de entrega o número de prendas.
  - Descripción limpia de prendas con `descripcionPrendaHumana` (ej: `Negro Talla XL para Mujer (V2)`).
  - Chip pastel de estado y saldo en tiempo real (`Pagado ✓` o `Resta $XX.XXX`).

### 3. Botones y Flujo de Tarjetas de Pedidos (`OrdersView.jsx`):
- **Botón "Ver"**: Se redujo el texto de "Ver detalle" a simplemente **"Ver"** (con icono `Eye`).
- **Edición Centralizada**: Se quitó el botón de editar de la tarjeta principal para evitar sobrecarga de botones; la opción de "Editar Pedido" queda limpia y exclusivamente dentro de la ventana modal de "Ver" (`OrderDetailModal`).
- **Botón "Finalizar" Restaurado**: Visible en el pie de la tarjeta con icono `CheckCircle2` y texto "Finalizar". Se activa en verde esmeralda cuando todas las prendas están liquidadas, y si faltan requisitos alerta con precisión qué saldo o pago a Yesenia/socio está pendiente.
- **Botón de Borrado Rojo (`InlineDeleteConfirm.jsx`)**: El botón de papelera ahora tiene estilo rojo de por sí (`bg-rose-50 text-rose-600 border-rose-200`) y resalta con mayor intensidad al pasar el cursor (`hover:bg-rose-600 hover:text-white`).

### 4. Ajustes en Modal de Detalle (`OrderDetailModal.jsx`):
- Se eliminó el botón duplicado de `+ Abono` dentro del recuadro de "Saldo Pendiente", ya que la ventana ya cuenta con el botón principal "Abonar" en su barra inferior de acciones.
- Se agregó el código corto `#S04` en el encabezado junto al nombre del cliente.

### 5. Reportes con 2 Botones Exactos y Vista Previa Completa (`ReportsView.jsx` & `excelExport.js`):
- **Exactamente 2 Alcances**:
  1. **"Solo Pedidos por Comprar"**: Filtra pedidos con estado `"Pedido"` pendientes de comprar tela.
  2. **"Todos los Pedidos Activos"**: Exporta todos los pedidos activos (`!v.finalizado`) que figuran en el menú de pedidos sin importar su estado en curso.
- **Vista Previa de Tabla Completa con Scroll**:
  - Se eliminó el recorte de 5 registros (`slice(0, 5)`).
  - La tabla muestra el 100% de los pedidos seleccionados dentro de un contenedor desplazable (`max-h-[520px] overflow-auto`).
  - Cabecera fija (`sticky top-0 z-10`) con fondo sólido para facilitar la navegación y lectura.



