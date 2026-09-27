<div align="center">

# Camisas IUB

**Sistema de control de ventas, compras y liquidaciones de un negocio de camisas**

[🌐 Ver la app en vivo](https://samirpxrreo.github.io/CAMISASIUB/)

HTML + CSS + JavaScript puro · Supabase · GitHub Pages

<!-- Reemplaza esta línea por una captura de la app cuando tengas una buena.
     Sugerencia: la pantalla de Pedidos, que es donde se ve todo el flujo.
     <img src="docs/captura.png" alt="Captura de la app" width="900"> -->

</div>

---

## Qué es

Una aplicación web para llevar el control de un negocio de venta de camisas:
los pedidos que entran, lo que se ha cobrado, lo que se le debe al proveedor y
cuánto le toca a cada socio.

Está pensada para **los dos socios** del negocio, que trabajan desde
dispositivos distintos, así que todo está diseñado para que sea rápido de
llenar con el celular en la mano.

### Lo que hace

| | |
|---|---|
| 📋 **Pedidos** | Alta, edición y cambio de estado. El estado se lleva **por camisa**, no por pedido: un mismo pedido puede tener 3 camisas bordando y 2 listas para entregar |
| ✕ **Multiplicador** | Si un cliente pide 5 camisas iguales, llenas la fila una vez, pones `5` y ya. No 5 filas repetidas |
| 💳 **Cuentas por cliente** | Cuánto se le ha cobrado y cuánto debe cada persona, con historial |
| 🧵 **Abonos al proveedor** | Las compras al proveedor, con reparto de aportes entre socios |
| 💰 **Liquidaciones** | Los pagos entre socios y el balance de ganancias |
| 📚 **Historial** | Pedidos finalizados |
| 📊 **Resúmenes** | Estadísticas por período, vendedor y cliente |
| 📈 **Reportes** | Exportación a Excel con diseño, y factura personalizada |
| 🗑️ **Papelera** | Borrar un pedido es reversible: se puede restaurar, borrar uno para siempre o vaciarla |
| 🔔 **Avisos** | Cuando la otra persona guarda algo, sale un aviso. No se actualiza solo: tú decides cuándo |
| 🔎 **Buscador global** | `Ctrl+K` desde cualquier pantalla |
| 🌙 **Tema claro y oscuro** | Los dos se ven bien, medidos con contraste WCAG |
| 👥 **Roles** | Administrador y vendedor, con lo que cada uno puede ver |

### Los estados de un pedido

`Pedido → Comprado → Bordando → Listo para entrega → Entregado → Liquidado`

Cada estado tiene su color, y cada camisa lleva el suyo. El estado que se
guarda a nivel de pedido es **el más atrasado** de todas sus camisas, para que
al ordenar por estado no se pierda nada.

---

## Cómo está hecho

**Vanilla JS. Sin framework, sin build, sin npm.** Los únicos scripts externos
son los CDNs de Supabase, SheetJS y ExcelJS, cargados en el `<head>`. No hay
paso de compilación: se edita el archivo, se sube, se publica.

```
index.html          Estructura: login, sidebar, secciones, modales
app.v2.js           Toda la lógica (Supabase, cálculos, renders)
enhance.v2.js       Mejoras de presentación, sin lógica de negocio
styles.v2.css       Todo el diseño: claro/oscuro, responsive, impresión
migracion.sql       Migraciones de Supabase
PROYECTO.md         Documentación técnica completa
```

### Correrlo en local

No necesita servidor ni instalación. Clona y abre:

```bash
git clone https://github.com/SamirPxrreo/CAMISASIUB.git
cd CAMISASIUB
```

Luego **abre `index.html` en el navegador**. Como la base está en la nube, todo
funciona igual que en el sitio publicado.

Si prefieres servirlo por HTTP (recomendado, algunos navegadores son más
estrictos con `file://`):

```bash
npx serve .
```

---

## Sobre la seguridad

**La `SUPABASE_ANON_KEY` está en el código y es pública.** Eso es a propósito:
es la forma en que funciona Supabase sin un backend propio. La protección real
está en las **políticas de RLS** de Postgres, no en el navegador.

Está verificado que la anon key **no puede leer, escribir ni borrar nada** sin
iniciar sesión: las cinco tablas tienen RLS activo y ninguna política para el
rol `anon`. Para volver a comprobarlo:

```bash
node verificar-seguridad.js
```

No modifica datos: las sondas de escritura usan un UUID inexistente.

Aun así, la separación entre lo que ve un administrador y lo que ve un vendedor
se aplica **en el navegador**. Eso es comodidad, no una barrera: alguien con
acceso al panel de Supabase siempre puede ver todo.

---

## Cómo se publica

Cada `git push` a `main` publica el sitio. Tarda unos 35 segundos.

```bash
git add .
git commit -m "descripción del cambio"
node preparar-despliegue.js --aplicar   # actualiza el ?v= de los scripts
git add index.html
git commit --amend --no-edit
git push
```

El paso del `?v=` no es opcional: es lo que evita que el navegador se quede con
el JavaScript viejo. `preparar-despliegue.js` lo pone con fecha y hora para que
no haya que acordarse.

GitHub Pages guarda todos los deployments, así que después de subir se limpian
para dejar siempre 3 (el vivo, el anterior para hacer rollback y el más viejo
como ancla):

```powershell
$env:GH_TOKEN = "ghp_..."   # scope: repo
.\clean-deployments.ps1
```

---

## Documentación

**[PROYECTO.md](PROYECTO.md)** tiene todo el detalle técnico: la estructura del
código, el modelo de datos, cada función de cálculo de dinero, el historial
completo de cambios y los problemas conocidos que están pendientes.

Ese archivo es la referencia para mantener la app. El README es solo la
puerta de entrada.

---

<div align="center">
<sub>Hecho en Colombia 🇨🇴 · Pesos y hora de Colombia en toda la app</sub>
</div>
