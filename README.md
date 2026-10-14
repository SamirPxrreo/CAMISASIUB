<div align="center">

# Camisas IUB

**Sistema moderno de control de ventas, compras a confección, liquidaciones entre socios y catálogo de pedidos**

[🌐 Ver la app en vivo](https://samirpxrreo.github.io/CAMISASIUB/)

React 19 · Vite 6 · Tailwind CSS · Framer Motion · Supabase Realtime · GitHub Pages

</div>

---

## 1. Qué es

Una aplicación web moderna diseñada para la gestión operativa y financiera del negocio de venta de camisas tipo Polo **Camisas IUB**. 

Permite a los socios (**Samir y Valentina**) y su equipo de vendedores controlar desde cualquier dispositivo (especialmente celulares en ruta) el ciclo de vida de cada prenda, cuentas por cobrar, pagos al proveedor de confección (Yesenia) y la repartición exacta de ganancias entre socios.

---

## 2. Módulos y Funcionalidades

| Módulo | Descripción |
|---|---|
| 📋 **Pedidos (Vista en Tarjetas)** | Presentación moderna en cuadros con chips pastel (`Pedido`, `Comprado`, `Bordando`, `Listo`, `Entregado`, `Liquidado`). Con selector flotante animado (`StatusDropdown`), vista compacta y botón para abrir el modal detallado de prendas. |
| 📊 **Exportación Excel con AutoFilter (`excelExport.js`)** | Botón **"Exportar por Comprar"** con contador en vivo de prendas en estado `Pedido`. Genera hojas con diseño corporativo, AutoFilter en cada columna, y una hoja dedicada de **`Resumen Tallas y Colores`** que combina y suma cantidades por Género, Color y Talla (sin separar por bordado) ideal para compras al taller de Yesenia. Disponible también para pedidos individuales en `OrderDetailModal`. |
| 🔍 **Detalle de Pedido (`OrderDetailModal`)** | Modal dedicado para pedidos con múltiples prendas: muestra el resumen del cliente, saldos y desglose individual de cada camisa (estado, bordado, género, color, talla, precio), con botón para copiar mensaje formateado de WhatsApp, descarga individual en Excel y acceso rápido a edición. |
| 👕 **Prendas Tipo Polo** | Identificación sin ambigüedades: `[Mujer\|Hombre] [Color] Talla [Talla]` (ej. *Mujer Negro Talla S*). Distinción discreta de `v2` (Versión 2) e invisibilidad de "Versión 1" en mensajes al cliente. Responsividad total con zoom (110%-125%) sin truncamiento de texto. |
| 🎨 **Selectores Desplegables Propios (`CustomSelect`)** | Reemplazo total de menús nativos del navegador por selectores interactivos estilizados con animaciones de resorte (*Framer Motion*), buscador integrado en tiempo real y muestras de color (*color swatches*). |
| 📍 **Lugares de Entrega Configurables** | Catálogo administrable desde Configuración: alta de nuevas sedes o puntos con sugerencias rápidas (Sedes IUB, domicilios Barranquilla/Soledad, centros comerciales), edición de nombres, eliminación segura y restablecimiento a valores predeterminados. |
| 📅 **Calendario de Entregas** | Vista organizada por días de lo que se debe entregar, conteo de camisas, saldos acumulados, botón de copiar mensaje personalizado para el cliente y resumen del pedido. |
| 💳 **Cuentas por Cliente** | Monitoreo de deudas, abonos, saldos pendientes y **generador de recibos / facturas en PDF** listo para impresión o envío. |
| 🧵 **Abonos Yesenia (Compras)** | Control simplificado y transparente de deuda y pagos a confección: desglosado estrictamente en **Deuda de Samir con Yesenia** y **Deuda de Valentina con Yesenia**, con costos sugeridos automáticos ($30.000 v1 / $31.000 v2 + extra para tallas grandes). |
| 💰 **Liquidaciones entre Socios** | Cálculo exacto de repartición de ganancias: mitad de utilidad neta por pedido (`(Precio - Costo) / 2`). Compensación cruzada transparente entre Samir y Valentina. |
| ⚙️ **Configuración del Sistema** | Pestañas independientes para: **Colores de camisas**, **Lugares de entrega**, **Usuarios y accesos** (Admin / Vendedor), **Temas visuales** y **Estrategia de versionado**. |
| 🎨 **Sistema de 5 Temas Integrales** | Cambio total de interfaz: Menta Fresh, Lavanda Soft, Atardecer Cálido, Noche Elegante (Dark Mode con alto contraste WCAG AAA) y Pastel Clásico. La barra móvil inferior (`BottomNav`) se adapta instantáneamente a cada paleta. |
| 📄 **Paginación Inteligente** | Navegación por hojas numeradas (15 elementos por página) en todas las secciones extensas, con barra lateral fija que nunca se desplaza hacia abajo. |
| 🗑️ **Papelera Segura** | Borrado y restauración de pedidos con confirmación en línea y mecha fusible de seguridad (*Bencho Confirm*). Vaciado permanente reservado exclusivamente a administradores. |
| 📈 **Reportes & Analíticas Avanzadas** | Ranking de combinaciones más vendidas (#1, #2, #3), curvas de distribución de tallas, comparativa por género, muestras de colores más pedidos, ranking de bordados académicos universitarios, ticket promedio y exportación a Excel con tablas dinámicas y filtros. |
| 🔗 **Navegación por Enlaces (#)** | Enrutamiento bidireccional mediante URL hash (`#dashboard`, `#orders`, `#calendar`, `#cuentas`, `#history`, `#purchases`, `#settlements`, `#summaries`, `#reports`, `#trash`, `#settings`) para compartir enlaces directos y navegar con los botones atrás/adelante del navegador o celular. |
| 🛡️ **Seguridad y Roles Estrictos** | **Administrador**: acceso total a Configuración, gestión de usuarios, catálogos dinámicos, visualización de todos los pedidos y vaciado permanente de papelera.<br>**Vendedor**: interfaz enfocada exclusivamente en sus propios pedidos y clientes, con selector de vendedor bloqueado a su cuenta y sin acceso a configuraciones administrativas. |
| 📱 **PWA & Responsividad Móvil (100dvh)** | Barra inferior nativa (`BottomNav`) con safe-area-inset para notch/gestos, altura dinámica `100dvh` para evitar saltos por barras del navegador, `viewport-fit=cover`, manifest.json y control estricto de caché. |

---

## 3. Arquitectura y Tecnologías

La aplicación fue completamente modernizada a una arquitectura basada en componentes:

- **Frontend**: React 19, Vite 6, Tailwind CSS v4.
- **Animaciones & Microinteracciones**: Framer Motion (transiciones fluidas, menús flotantes, layout animations).
- **Iconografía & UI**: Lucide Icons, Canvas Confetti, Bencho Floating Labels (corner 26px, letras saltarinas).
- **Backend & Base de Datos**: Supabase Postgres con suscripciones en tiempo real (**Realtime**) y autenticación por correo/contraseña protegida por **Row Level Security (RLS)**.

```
react-app/
├── src/
│   ├── components/
│   │   ├── OrdersView.jsx          # Pedidos en tarjetas con chips de estado, filtros por fecha de entrega y selector de estado interactivo
│   │   ├── OrderDetailModal.jsx    # Modal de inspección detallada de prendas con selector de estado individual y exportación Excel
│   │   ├── CustomSelect.jsx        # Selector flotante animado con búsqueda y muestras de color
│   │   ├── StatusDropdown.jsx      # Selector flotante animado de estado semántico con actualización individual o de pedido completo
│   │   ├── CalendarView.jsx        # Calendario de entregas y copiado de mensajes
│   │   ├── CuentasView.jsx         # Cuentas de clientes y generador de recibos PDF
│   │   ├── PurchasesView.jsx       # Abonos Yesenia y compras al proveedor
│   │   ├── SettlementsView.jsx     # Liquidaciones matemáticas exactas entre socios
│   │   ├── SummariesView.jsx       # Analíticas: camisas más vendidas, curvas de talla, géneros
│   │   ├── ReportsView.jsx         # Reportes avanzados y exportación general a Excel
│   │   ├── SettingsView.jsx        # Configuración: Colores, Lugares, Usuarios y Versiones
│   │   ├── NewSaleModal.jsx        # Modal de creación y edición de pedidos con CustomSelect
│   │   ├── InlineDeleteConfirm.jsx # Botón con barra de mecha regresiva (Bencho Confirm)
│   │   ├── Sidebar.jsx             # Barra lateral fija viewport-locked
│   │   ├── BottomNav.jsx           # Barra de navegación inferior móvil docked 100dvh con temas
│   │   ├── Pagination.jsx          # Control de paginación por hojas (1, 2, 3...)
│   │   ├── ThemeModal.jsx          # Selector de temas integrales
│   │   └── FloatingLabelInput.jsx  # Input Bencho floating label para login
│   ├── context/
│   │   ├── AuthContext.jsx         # Autenticación, roles (Admin/Vendedor) y presets
│   │   ├── DataContext.jsx         # Sincronización en tiempo real, CRUD y catálogos
│   │   └── ThemeContext.jsx        # Estado y persistencia de temas dinámicos
│   ├── lib/
│   │   ├── excelExport.js          # Motor ExcelJS con AutoFilter y hoja Tallas/Colores
│   │   ├── utils.js                # Lógica matemática, colores, formatos y WhatsApp
│   │   └── supabase.js             # Conexión al cliente de Supabase
│   └── index.css                   # Tailwind + variables de tema + contraste WCAG
```

---

## 4. Cómo correrlo en local

```bash
# 1. Clonar el repositorio
git clone https://github.com/SamirPxrreo/CAMISASIUB.git
cd CAMISASIUB/react-app

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# Para probar en celular desde la misma red Wi-Fi:
npx vite --host --port 5173
```

Abre en tu navegador `http://localhost:5173` (o la IP local indicada en consola para celular).

---

## 5. Proceso de Despliegue en GitHub Pages (Ciclo de 3 Versiones)

GitHub Pages sirve directamente la raíz de la rama `main`. Para publicar una nueva versión:

```powershell
# 1. Compilar la aplicación React optimizada
cd react-app
npm run build
cd ..

# 2. Sincronizar el build con la raíz del repositorio y actualizar aliases anti-caché
Copy-Item -Path "react-app\dist\index.html" -Destination "index.html" -Force
Copy-Item -Path "react-app\dist\assets\*" -Destination "assets\" -Force

# 3. Subir los cambios a GitHub
git add .
git commit -m "Deploy: actualización del sistema"
git push origin main
git push origin main:redesign-impeccable
```

### El Ciclo de 3 Versiones:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE 3 VERSIONES                             │
├──────────────────────────────────────────────────────────────────────────┤
│  1. VERSIÓN FIJA (ANCLA)     : Base original estable                     │
│     * Congelada permanentemente como punto de anclaje de referencia.     │
│     * No se altera con nuevos pushes.                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  2. VERSIÓN ANTERIOR         : Commit 9bef987 (Despliegue anterior)      │
│     * Sirve como punto de reversión inmediata si fuera necesario.        │
│     * En el próximo despliegue, pasará a ser la versión que subimos hoy. │
├──────────────────────────────────────────────────────────────────────────┤
│  3. VERSIÓN NUEVA (PRODUCCIÓN): Commit 389ab90 (Lugares + Modales)       │
│     * La versión activa en https://samirpxrreo.github.io/CAMISASIUB/     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Guía para Continuar el Proyecto en Otro PC 💻

Si vas a abrir o clonar el proyecto en otro equipo, sigue estos sencillos pasos:

### Paso 1: Prerrequisitos
- Instalar **[Node.js](https://nodejs.org/)** (versión 18 o superior, LTS recomendada).
- Instalar **[Git](https://git-scm.com/)**.

### Paso 2: Descargar el Código
Elige una de las dos opciones:

* **Opción A (Desde GitHub):**
  ```bash
  git clone https://github.com/SamirPxrreo/CAMISASIUB.git
  cd CAMISASIUB
  ```
* **Opción B (Copia Local en Documentos):**
  Si estás en este mismo equipo o copiaste la carpeta, el proyecto completo y listo se encuentra respaldado en:
  `D:\User\Documents\CAMISASIUB\`

### Paso 3: Instalar Dependencias y Arrancar
```bash
cd react-app
npm install
npm run dev
```
La aplicación arrancará de inmediato en `http://localhost:5173/`.

### Paso 4: Variables y Conexión de Base de Datos
Las credenciales de Supabase están configuradas en `react-app/src/lib/supabase.js`. No requieres configurar variables de entorno adicionales para arrancar en local, pues la clave pública (`anon-key`) y la URL del proyecto están predefinidas y protegidas mediante las políticas RLS de Postgres.

### Paso 5: Buenas Prácticas al Hacer Cambios
1. Haz tus cambios dentro de `react-app/src/`.
2. Prueba visualmente con `npm run dev`.
3. Cuando vayas a subir a GitHub:
   ```powershell
   cd react-app
   npm run build
   Copy-Item -Path "dist\index.html" -Destination "..\index.html" -Force
   Copy-Item -Path "dist\assets\*" -Destination "..\assets\" -Force
   cd ..
   git add .
   git commit -m "Explicación de lo que agregaste"
   git push origin main
   git push origin main:redesign-impeccable
   ```

---

<div align="center">
<sub>Hecho en Colombia 🇨🇴 · Pesos colombianos (COP) y zona horaria de Bogotá en toda la app</sub>
</div>
