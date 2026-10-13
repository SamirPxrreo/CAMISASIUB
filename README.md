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
| 📋 **Pedidos (Vista en Tarjetas)** | Presentación moderna en cuadros organizada lógicamente con chips de filtro en colores pastel (`Pedido`, `Comprado`, `Bordando`, `Listo`, `Entregado`, `Liquidado`). Con selector flotante animado (`StatusDropdown`), desglose de prendas y enlace directo a WhatsApp. |
| 👕 **Prendas Tipo Polo** | Identificación sin ambigüedades: `[Mujer\|Hombre] [Color] Talla [Talla]` (ej. *Mujer Negro Talla S*). Distinción discreta de `v2` (Versión 2) e invisibilidad de "Versión 1" en mensajes al cliente. |
| 📅 **Calendario de Entregas** | Vista organizada por días de lo que se debe entregar, conteo de camisas, saldos acumulados, botón de copiar mensaje personalizado para el cliente y resumen del pedido. |
| 💳 **Cuentas por Cliente** | Monitoreo de deudas, abonos, saldos pendientes y **generador de recibos / facturas en PDF** listo para impresión o envío. |
| 🧵 **Abonos Yesenia (Compras)** | Control riguroso de deuda y pagos a confección por pedido. Cálculo de costo sugerido automático ($30.000 v1 / $31.000 v2 + extra para tallas especiales 2XL: $2.000, 3XL: $4.000, 4XL: $6.000). |
| 💰 **Liquidaciones entre Socios** | Cálculo exacto de repartición de ganancias: mitad de utilidad neta por pedido (`(Precio - Costo) / 2`). Compensación cruzada transparente entre Samir y Valentina. |
| ⚙️ **Configuración del Sistema** | **Catálogo editable de colores de camisas**: agregar nuevos colores (con selector visual y sugerencias), editar nombres o tonos y restablecer. **Gestión de usuarios**: crear usuarios (vendedores y administradores) con credenciales y roles. |
| 🎨 **Sistema de 5 Temas Integrales** | Cambio total de interfaz: Menta Fresh, Lavanda Soft, Atardecer Cálido, Noche Elegante (Dark Mode con alto contraste WCAG AAA) y Pastel Clásico. |
| 📄 **Paginación Inteligente** | Navegación por hojas numeradas (15 elementos por página) en todas las secciones extensas, con barra lateral fija que nunca se desplaza hacia abajo. |
| 🗑️ **Papelera Segura** | Borrado y restauración de pedidos con confirmación en línea y mecha fusible de seguridad (*Bencho Confirm*). |
| 📈 **Reportes & Resúmenes** | Estadísticas por período, métricas de vendedor y exportación directa a Excel con formato. |

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
│   │   ├── OrdersView.jsx          # Pedidos en tarjetas con chips pastel y StatusDropdown
│   │   ├── StatusDropdown.jsx      # Selector flotante animado de estado por prenda
│   │   ├── CalendarView.jsx        # Calendario de entregas y copiado de mensajes
│   │   ├── CuentasView.jsx         # Cuentas de clientes y generador de recibos PDF
│   │   ├── PurchasesView.jsx       # Abonos Yesenia y compras al proveedor
│   │   ├── SettlementsView.jsx     # Liquidaciones matemáticas exactas entre socios
│   │   ├── SettingsView.jsx        # Configuración: Catálogo de colores y usuarios
│   │   ├── NewSaleModal.jsx        # Modal de creación y edición de pedidos
│   │   ├── Sidebar.jsx             # Barra lateral fija viewport-locked
│   │   ├── Pagination.jsx          # Control de paginación por hojas (1, 2, 3...)
│   │   ├── ThemeModal.jsx          # Selector de temas integrales
│   │   └── FloatingLabelInput.jsx  # Input Bencho floating label para login
│   ├── context/
│   │   ├── AuthContext.jsx         # Autenticación, roles (Admin/Vendedor) y presets
│   │   ├── DataContext.jsx         # Sincronización en tiempo real y CRUD
│   │   └── ThemeContext.jsx        # Estado y persistencia de temas dinámicos
│   ├── lib/
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

Abre en tu navegador `http://localhost:5173` (o la IP local indicada para celular).

Para generar los archivos de producción:

```bash
npm run build
```

Los archivos optimizados se generan en `react-app/dist/`.

---

## 5. Estrategia de Despliegue en GitHub Pages (Ciclo de 3 Versiones)

El repositorio mantiene estrictamente una estrategia de **3 Versiones de Despliegue** para garantizar trazabilidad, alta disponibilidad y capacidad de reversión instantánea:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE 3 DESPLIEGUES                           │
├──────────────────────────────────────────────────────────────────────────┤
│  1. VERSIÓN FIJA (ANCLA)     : Commit 6a8ee5f (Versión Original)        │
│     * Congelada permanentemente como punto de anclaje intocable.         │
│     * No se elimina con nuevos pushes.                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  2. VERSIÓN ANTERIOR         : Commit 6a8ee5f (Rollback de 1 paso)       │
│     * En este despliegue coincide con la fija.                           │
│     * En el PRÓXIMO despliegue, pasará a ser la versión que subimos hoy. │
├──────────────────────────────────────────────────────────────────────────┤
│  3. VERSIÓN NUEVA (VIVA)     : React 19 + Vite + Framer Motion (Actual)  │
│     * La versión moderna en producción activa.                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Regla para Despliegues Futuros:
Cuando se suba un nuevo deployment en el futuro:
- **La Versión Fija**: Sigue siendo el ancla `6a8ee5f`.
- **La Versión Anterior**: Pasa a ser la versión moderna que estamos subiendo hoy.
- **La Versión Nueva**: Será la nueva versión recién compilada.

---

<div align="center">
<sub>Hecho en Colombia 🇨🇴 · Pesos colombianos (COP) y zona horaria de Bogotá en toda la app</sub>
</div>
