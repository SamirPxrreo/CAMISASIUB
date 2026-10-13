# Sistema de Diseño — Camisas IUB (Impeccable v4.5 Standard)

Sistema visual profesional para la aplicación interna de control de ventas, compras y liquidaciones de **Camisas IUB**.

---

## 1. Principios de Diseño

1. **Claridad sobre Decoración (Distill & Clarify)**:
   - Todo elemento visual tiene una función operacional. No hay degradados decorativos ni efectos de cristal pesados que ralenticen el scroll en móviles.
   - Las cifras monetarias y estados son los protagonistas: legibilidad instantánea sin ambigüedades.
   - Jerarquía tipográfica estricta: nunca saltar niveles de encabezados (`h1` → `h2` → `h3`).

2. **Ergonomía Móvil (Thumb-First)**:
   - Diseñado para operar con una sola mano en el celular (vendedores y socios en ruta).
   - Barra de navegación inferior fija (`.bottom-nav`) para las 4 tareas primarias + acceso al menú completo.
   - Modales en formato *Bottom Sheet* con asa táctil (`.modal-handle`), arrastre nativo para descartar y cabecera fija.
   - Objetivos táctiles mínimos de 44×44px y tamaño de fuente en inputs ≥ 16px para evitar zoom forzado en iOS Safari.

3. **Cero "AI Slop" (Anti-Patrones Prohibidos)**:
   - **Sin pestañas laterales gruesas** (`side-tabs`): nada de `border-left: 4px solid ...`. Se usan insignias sutiles y chips semánticos.
   - **Sin tarjetas anidadas** (`nested-cards`): las métricas dentro de modales o paneles usan celdas de resumen planas (`.modal-summary-grid`), no tarjetas elevadas con sombra dentro de otra tarjeta.
   - **Sin sombras con brillo de color** (`dark-glow`): todas las sombras son de elevación neutra.
   - **Sin puntos parpadeantes simulados** (`pulsing-dot`): indicadores estables y calmados.
   - **Sin paleta genérica de IA** (`ai-color-palette`): sin gradientes violeta/cian. El estado "Bordando" usa un azul índigo profundo institucional.

4. **Accesibilidad WCAG AA Garantizada**:
   - Contraste texto/fondo mínimo de 4.5:1 en todos los estados (normal, hover, activo, foco).
   - Anillos de foco visibles de alta precisión (`:focus-visible`).
   - Soporte para `prefers-reduced-motion`.

---

## 2. Tokens de Color

### Modo Claro (Light Mode — Slate & Indigo)
- **Fondo base (`--bg`)**: `#f8fafc` (Slate 50)
- **Superficie / Tarjetas (`--card`)**: `#ffffff` (Blanco puro)
- **Superficie silenciada (`--card-muted`)**: `#f1f5f9` (Slate 100)
- **Bordes (`--border`)**: `#e2e8f0` (Slate 200 — 1px crisp)
- **Bordes destacados (`--border-strong`)**: `#cbd5e1` (Slate 300)
- **Texto principal (`--text`)**: `#0f172a` (Slate 900 — 14.5:1 contraste)
- **Texto secundario (`--text-secondary`)**: `#475569` (Slate 600 — 5.3:1 contraste)
- **Texto atenuado (`--text-muted`)**: `#64748b` (Slate 500 — 4.6:1 contraste)
- **Primario / Acción (`--accent`)**: `#4338ca` (Indigo 700 — 6.8:1 contraste)
- **Primario hover (`--accent-hover`)**: `#3730a3` (Indigo 800)
- **Fondo sutil primario (`--accent-subtle`)**: `#eef2ff` (Indigo 50)

### Modo Oscuro (Dark Mode — Deep Slate Navy)
- **Fondo base (`--bg`)**: `#090d16` (Deep Navy)
- **Superficie / Tarjetas (`--card`)**: `#111827` (Slate 900)
- **Superficie elevada (`--card-elevated`)**: `#1e293b` (Slate 800)
- **Bordes (`--border`)**: `#1f293d` (Slate 800)
- **Bordes destacados (`--border-strong`)**: `#334155` (Slate 700)
- **Texto principal (`--text`)**: `#f8fafc` (Slate 50 — 15:1 contraste)
- **Texto secundario (`--text-secondary`)**: `#cbd5e1` (Slate 300 — 10.5:1 contraste)
- **Texto atenuado (`--text-muted`)**: `#94a3b8` (Slate 400 — 5.8:1 contraste)
- **Primario / Acción (`--accent`)**: `#6366f1` (Indigo 500)
- **Primario hover (`--accent-hover`)**: `#818cf8` (Indigo 400)
- **Fondo sutil primario (`--accent-subtle`)**: `#1e1b4b` (Indigo 950)

---

## 3. Estados de Pedidos (6 Estados Semánticos)

Todos calibrados con fondo tintado suave y tipografía sólida de alto contraste:

| Estado | Tono | Modo Claro (Texto / Fondo) | Modo Oscuro (Texto / Fondo) |
|---|---|---|---|
| **Pedido** | Ámbar / Dorado | `#92400e` / `#fef3c7` (5.2:1) | `#fde68a` / `#451a03` (8.1:1) |
| **Comprado** | Cian / Teal | `#0e7490` / `#cffafe` (4.9:1) | `#a5f3fc` / `#164e63` (7.6:1) |
| **Bordando** | Azul Real / Índigo | `#3730a3` / `#e0e7ff` (7.8:1) | `#c7d2fe` / `#1e1b4b` (8.4:1) |
| **Listo para entrega** | Esmeralda | `#047857` / `#d1fae5` (5.1:1) | `#6ee7b7` / `#064e3b` (7.9:1) |
| **Entregado** | Cobalto / Azul | `#1d4ed8` / `#dbeafe` (5.4:1) | `#bfdbfe` / `#1e3a8a` (8.0:1) |
| **Liquidado** | Verde Bosque | `#15803d` / `#dcfce7` (5.0:1) | `#86efac` / `#14532d` (7.7:1) |

---

## 4. Tipografía y Escala

- **Pila tipográfica**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (SF Pro nativo en iOS/macOS, Segoe UI en Windows, Roboto en Android — 0 bytes descargados, cero FOUT).
- **Escala de fuentes**:
  - `Display / H1`: 24px - 28px / peso 700 / tracking -0.025em
  - `H2`: 18px - 20px / peso 600 / tracking -0.015em
  - `H3`: 15px - 16px / peso 600
  - `Cuerpo (Body)`: 14px / peso 400 - 500 / interlineado 1.5
  - `Inputs / Selects`: 15px en desktop, 16px en móvil
  - `Sub-tags / Micro-labels`: 12px / peso 500 (estricto: **nunca < 12px** para evitar fatiga visual)

---

## 5. Elevación y Sombras

Neutras y sin halos de color:
- `--shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- `--shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)`
- `--shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)`
- `--shadow-modal`: `0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)`
