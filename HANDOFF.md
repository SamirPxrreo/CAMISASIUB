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

### Notificador de Actualización de la App (`UpdateNotifier.jsx`):
- **Detección Automática de Nuevas Versiones**: Cada 90 segundos y cada vez que el usuario vuelve a la app (evento `visibilitychange`), la aplicación consulta silenciosamente si hay un nuevo bundle de producción desplegado en el servidor.
- **Aviso Flotante Elegante**: Si se detecta una nueva compilación, aparece un banner flotante en la parte superior:
  `⚡ Nueva versión disponible — Hay cambios recientes en la app. [Actualizar]`
- **Actualización con un Toque**: Al pulsar el botón, se vacían las cachés de la PWA / navegador (`caches.delete`) y se recarga la página de inmediato con la versión más reciente.

