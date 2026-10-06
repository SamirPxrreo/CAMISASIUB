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
| 🌙 **Tema claro y oscuro** | Los dos se ven bien, medidos con contraste WCAG (372 mediciones, 0 problemas) |
| 📱 **En el celular** | Los modales bajan como hojas nativas, con la barrita para arrastrar y cerrar. El título queda fijo mientras se desplaza |
| 👥 **Roles** | Administrador y vendedor, con lo que cada uno puede ver |

### Los estados de un pedido

`Pedido → Comprado → Bordando → Listo para entrega → Entregado → Liquidado`

Cada estado tiene su color, y cada camisa lleva el suyo. El estado que se
guarda a nivel de pedido es **el más atrasado** de todas sus camisas, para que
al ordenar por estado no se pierda nada.

El botón de estado va **sólido** con su color, no en tinte: en la columna
"Estado" se ve de un vistazo en qué va cada pedido. Los seis colores están
medidos contra su fondo en los dos temas (mínimo 4.5:1).

---

## Cómo está hecho

**Vanilla JS. Sin framework, sin build, sin npm.** Los únicos scripts externos
son los CDNs de Supabase, SheetJS y ExcelJS, cargados en el `<head>`. No hay
paso de compilación: se edita el archivo, se sube, se publica.

Este repo tiene **lo mínimo que el sitio necesita**:

```
index.html       Estructura: login, sidebar, secciones, los 11 modales
app.v2.js        Toda la lógica (Supabase, cálculos, renders)
enhance.v2.js    Mejoras de presentación, sin lógica de negocio
deslizar-modal.js  Arrastrar la hoja del celular para cerrarla
styles.v2.css    El CSS que se sirve
favicon.ico / favicon.png   El ícono de la pestaña
```

`styles.v2.css` es **generado**: se arma pegando al final varios CSS fuente que
viven fuera de este repo. Está completo y no depende de ningún otro archivo, así
que el sitio funciona con solo estos 6.

### Lo que no está en el repo, a propósito

El esquema de la base, las migraciones, las reglas internas y las herramientas
de trabajo se guardan **fuera del repo**, en la máquina donde se desarrolla.

La razón: GitHub Pages sirve **todo** lo que hay en la rama publicada, sin mirar
el `.gitignore`. Con la documentación dentro, cualquiera podía descargar con un
clic el esquema de la base de datos, los correos de las cuentas y la lista de
bugs conocidos. Eso no sirve ni para correr el sitio.

Si clonás el repo y querés trabajar en serio, vas a necesitar esas piezas
aparte. Para despliegue y para consultas puntuales alcanza con lo que está acá.

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
npx serve .              # queda en el puerto 3000 por defecto
```

**Para probarlo en el celular**, que es como más se usa, hay que abrirlo por la
IP de la compu y no por `localhost`:

```bash
npx serve -l 3400 .
```

y entrar desde el celular a `http://<IP-de-la-compu>:3400`. La IP se ve con
`ipconfig` en Windows.

> Ojo: por `http://192.168.x.x` el navegador **no** considera un contexto
> seguro, y `navigator.clipboard` no existe. Por eso el botón "Copiar para
> WhatsApp" tiene un camino de respaldo con un `textarea` oculto, y no solo la
> API moderna.

---

## Migraciones de la base

La base está en Supabase (Postgres). Los cambios de esquema están en
`migraciones/aplicar-paso-*.sql`, en orden. **Casi todas ya se ejecutaron**: están ahí
como referencia del esquema, no se vuelven a correr.

La única pendiente ahora es `aplicar-paso-8-hora-con-segundos.sql`, para que
la hora se guarde con segundos (`HH:MM:SS`) y no solo con minutos.

Antes de pegar cualquier cosa en el SQL Editor, pasarla por el linter:

```bash
node herramientas/revisar-sql.js
```

Detecta variables no declaradas, `IF`/`END` desbalanceados, `jsonb` donde la
columna es texto, y `COALESCE` faltantes.

---

## Sobre la seguridad

**La `SUPABASE_ANON_KEY` está en el código y es pública.** Eso es a propósito:
es la forma en que funciona Supabase sin un backend propio. La protección real
está en las **políticas de RLS** de Postgres, no en el navegador.

Está verificado que la anon key **no puede leer, escribir ni borrar nada** sin
iniciar sesión: las cinco tablas tienen RLS activo y ninguna política para el
rol `anon`. Para volver a comprobarlo:

```bash
node herramientas/verificar-seguridad.js
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
node deploy/preparar-despliegue.js --aplicar   # actualiza el ?v= de los scripts
git add index.html
git commit --amend --no-edit
git push
```

El paso del `?v=` no es opcional: es lo que evita que el navegador se quede con
el JavaScript viejo. `deploy/preparar-despliegue.js` lo pone con fecha y hora para que
no haya que acordarse.

GitHub Pages guarda todos los deployments, así que después de subir se limpian
para dejar siempre 3:

1. **el que acabas de subir** — el vivo
2. **el anterior** — para hacer rollback de un paso
3. **el ANCLA FIJO: `59a5516`** — no cambia nunca, por más pushes que haya

El ancla es un commit concreto, no "el más viejo". Esa diferencia importa: con la
regla de "conservar los 3 más recientes" el tercer puesto rodaba en cada push, y
el 59a5516 se habría perdido en el siguiente.

```powershell
$env:GH_TOKEN = "ghp_..."   # scope: repo
.\deploy\clean-deployments.ps1           # pregunta antes de borrar
.\deploy\clean-deployments.ps1 -Si       # sin preguntar, para correr sin interacción
```

El script **siempre imprime qué conserva y qué borra antes de borrar**, porque
borrar un deployment no tiene vuelta atrás.

---

## Documentación

### Si vienes a trabajar en esto

Lee primero **[AGENTS.md](AGENTS.md)**. Está escrito para que una IA (o una
persona nueva) pueda trabajar acá sin saber nada del proyecto. Tiene:

- Las reglas que no se rompen (no tocar el dinero sin preguntar, no subir sin
  que lo pidan, no escribir datos de prueba).
- **Las trampas que ya se pisaron**, con el porqué de cada una. Todas son
  reales y cuestan tiempo: editar con PowerShell rompe los acentos, un
  `transform` silencio rompe el `position: sticky`, `background-size` no
  aplica a un color sólido, y varias más.
- Cómo medir el contraste y cómo probar las reglas de celular sin un celular.
- Lo que Samir decidió que **no** se haga, para no volver a proponerlo.

Después, **[PROYECTO.md](docs/PROYECTO.md)** tiene el detalle técnico a fondo: la
estructura del código, el modelo de datos, cada función de cálculo de dinero, el
historial completo de cambios y los problemas pendientes.

---

<div align="center">
<sub>Hecho en Colombia 🇨🇴 · Pesos y hora de Colombia en toda la app</sub>
</div>
