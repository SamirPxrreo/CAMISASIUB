# Sistema de Diseño — Camisas IUB (Impeccable Modern v5.0)

Sistema visual y componentes para la aplicación web interna de **Camisas IUB**.

---

## 1. Principios de Diseño

1. **Claridad Operacional (Distill & Clarify)**:
   - Toda información crítica (saldos pendientes, abonos, estado de camisas, deudas entre socios) destaca de inmediato con tipografía de alto contraste y jerarquía estricta.
   - En mensajes a clientes y vistas de pedidos, las prendas se identifican como `[Mujer|Hombre] [Color] Talla [Talla]` (ej. *Mujer Negro Talla S*), eliminando abreviaturas confusas como `(M)` y omitiendo referencias técnicas a "Versión 1".
   - Si la prenda corresponde a la Versión 2, se incluye una insignia discreta `v2`.

2. **Diseño Móvil Primero (Thumb-First & Sticky Navigation)**:
   - Barra de navegación lateral fija (`lg:sticky lg:top-0 lg:h-screen`) con área de contenido desplazable independiente (`overflow-y-auto`), evitando que el pie del sidebar se desplace hacia abajo al navegar por tablas largas.
   - Paginación dinámica por hojas numeradas (15 elementos por página) en Pedidos, Cuentas, Historial, Compras y Liquidaciones.
   - Navegación URL mediante hash (`#dashboard`, `#orders`, `#calendar`, etc.) para compartir enlaces directos y sincronización con el historial del navegador.
   - Experiencia móvil PWA (`manifest.json` y viewport-fit) lista para "Agregar a la pantalla de inicio" como app instalada.
   - Botones táctiles amplios y cómodos para uso en ruta.

3. **Microinteracciones y Animaciones con Propósito**:
   - Selector de estado animado (`StatusDropdown`): reemplaza los selects nativos por un menú desplegable con chips semánticos, puntos de color y transiciones suaves con Framer Motion.
   - Botón de confirmación con fusible (*Bencho Inline Confirm*): barra regresiva de 4 segundos que permite arrepentirse antes de ejecutar una eliminación destructiva.
   - Floating Label Inputs con esquinas de 26px y saltos elásticos de letras en el inicio de sesión.

---

## 2. Sistema de Temas Integrales (100% Cobertura)

La aplicación cuenta con 5 temas que transforman completamente la atmósfera visual:

| Tema | Color Primario | Acento / Gradiente | Uso / Atmósfera |
|---|---|---|---|
| **Menta Fresh** | Esmeralda (`#059669`) | Verde Menta (`#10b981`) | Fresco, sereno y limpio |
| **Lavanda Soft** | Violeta (`#7c3aed`) | Lila Pastel (`#a78bfa`) | Creativo y moderno |
| **Atardecer Cálido** | Naranja Coral (`#ea580c`) | Melocotón (`#f97316`) | Energético y amigable |
| **Noche Elegante** | Índigo Neón (`#818cf8`) | Deep Navy (`#090d16` / `#131b2e`) | Modo oscuro con contraste WCAG AAA |
| **Pastel Clásico** | Índigo Suave (`#6366f1`) | Slate Luminoso (`#f8fafc`) | Institucional equilibrado |

---

## 3. Estados de Pedidos (6 Estados Semánticos)

Diseñados en tonos pastel en modo claro y con luminiscencia translúcida de alto contraste en modo oscuro:

| Estado | Modo Claro (Fondo / Texto) | Modo Oscuro (Noche Elegante) |
|---|---|---|
| **Pedido** | `bg-amber-50 text-amber-900 border-amber-200` | `rgba(245, 158, 11, 0.16)` / `#fde68a` |
| **Comprado** | `bg-sky-50 text-sky-900 border-sky-200` | `rgba(14, 165, 233, 0.16)` / `#7dd3fc` |
| **Bordando** | `bg-purple-50 text-purple-900 border-purple-200` | `rgba(168, 85, 247, 0.16)` / `#d8b4fe` |
| **Listo para entrega** | `bg-emerald-50 text-emerald-900 border-emerald-200` | `rgba(16, 185, 129, 0.16)` / `#6ee7b7` |
| **Entregado** | `bg-blue-50 text-blue-900 border-blue-200` | `rgba(59, 130, 246, 0.16)` / `#93c5fd` |
| **Liquidado** | `bg-teal-50 text-teal-900 border-teal-200` | `rgba(20, 184, 166, 0.16)` / `#5eead4` |

---

## 4. Módulo de Configuración & Catálogo Dinámico

- **Colores de Camisas**: Gestión completa (alta, edición de nombre y muestra hexadecimal, eliminación y restablecimiento a valores iniciales). Sincronizado en tiempo real con el selector de pedidos de `NewSaleModal`.
- **Lugares de Entrega**: Configuración dinámica de sedes y puntos de entrega (crear, editar, eliminar y restablecer a predeterminados). Opciones sincronizadas directamente con el registro de pedidos.
- **Usuarios & Accesos**: Creación de cuentas con roles diferenciados (`ADMINISTRADOR` / `VENDEDOR`), correo y contraseña.

---

## 5. Componentes Exclusivos de Interacción

- **`CustomSelect`**: Selector desplegable flotante con físicas de resorte (Framer Motion), búsqueda integrada, muestras visuales de color y cierre automático por clic exterior.
- **`OrderDetailModal`**: Modal detallado para pedidos con múltiples prendas; desglosa cada camisa con su estado individual, bordado, talla, saldos y botón directo para copiar mensaje a WhatsApp.
- **`StatusDropdown`**: Selector de estados con insignias semánticas y transiciones suaves sin menús nativos del navegador.

---

<div align="center">
<sub>Guía de Estilo y Sistema de Componentes — Camisas IUB</sub>
</div>
