/**
 * Paleta de botones por FUNCIÓN.
 *
 * Antes cada botón elegía color por costumbre y quedaban tres verdes distintos
 * (WhatsApp, Abonar y el verde de "copiado"), dos.indigos para lo mismo, y el
 * botón Finalizar cambiaba de color según el estado en vez de según su función.
 *
 * Reglas:
 *   esmeralda  → dinero que entra (abonos, pagos, guardar, finalizar habilitado)
 *   whatsapp   → contacto externo (verde oficial de marca, no esmeralda)
 *   indigo     → acción de marca / navegación / editar (lo remapea el tema activo)
 *   slate      → neutro (copiar, cerrar, deshabilitado)
 *   rose       → destructivo (borrar, eliminar, vaciar papelera)
 */

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-2xl text-xs font-black ' +
  'transition-all cursor-pointer active:scale-95 shrink-0';

const ICONO =
  'inline-flex items-center justify-center gap-1.5 rounded-2xl border ' +
  'transition-all cursor-pointer active:scale-95 shrink-0';

/** Dinero que entra y acción positiva principal. */
export const btnDinero = `${BASE} px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs`;

/** Mismo, pero atenuado cuando todavía no se puede usar. */
export const btnDineroInactivo =
  `${BASE} px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200/80`;

/** Contacto por WhatsApp: verde oficial, para que no se confunda con "Dinero". */
export const btnWhatsapp =
  `${BASE} px-3.5 py-2.5 text-white shadow-xs ` +
  `bg-[#25D366] hover:bg-[#1eb955]`;

export const btnWhatsappIcono =
  `${ICONO} p-2.5 border-[#b8ecd0] text-[#128c3e] bg-[#e9fbf0] hover:bg-[#d7f7e4]`;

/** Acción de marca / editar. Indigo: el tema activo lo recolorea. */
export const btnEditar =
  `${BASE} px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200`;

/** Acción de marca sólida (navegación principal). */
export const btnPrimario =
  `${BASE} px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs`;

/** Neutro: copiar, cerrar, acciones sin consecuencia. */
export const btnNeutro =
  `${BASE} px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700`;

export const btnNeutroIcono =
  `${ICONO} p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200`;

/** Destructivo: siempre rosa, nunca rojo puro. */
export const btnDestructivo =
  `${BASE} px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/90`;

/** Destructivo cuadrado, solo icono. Mismo tamaño que los demás iconos. */
export const btnIconoDestructivo =
  `${ICONO} p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200/90`;

export const btnDestructivoSolido =
  `${BASE} px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs`;

/** Contenedor de un grupo de acciones. */
export const grupoAcciones = 'flex flex-wrap items-center justify-center gap-1.5';
export const grupoAccionesIzq = 'flex flex-wrap items-center gap-2';

/* ------------------------------------------------------------------
   Elementos que NO son acciones de acción. Aplicar un token de botón
   a un icono de fila o a una pestaña los infla de tamaño y les pone
   fondo permanente, así que tienen su propia variante discreta.
   ------------------------------------------------------------------ */

/** Icono dentro de una fila densa (lápiz, cerrar, duplicar): sin fondo hasta el hover. */
export const btnIconoSutil =
  'inline-flex items-center justify-center rounded-xl text-slate-400 transition-colors ' +
  'cursor-pointer shrink-0 border border-transparent ' +
  'hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200';

/** Igual, pero con acento de peligro solo al pasar el cursor. */
export const btnIconoSutilDestructivo =
  'inline-flex items-center justify-center rounded-xl text-slate-400 transition-colors ' +
  'cursor-pointer shrink-0 border border-transparent ' +
  'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200';

/** Selectores segmentados (pestañas, rangos de fecha): no llevan escala ni sombra al pulsar. */
export const btnPestana =
  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ' +
  'cursor-pointer select-none shrink-0';

export const btnPestanaActiva = `${btnPestana} bg-white text-slate-900 shadow-xs`;
export const btnPestanaInactiva = `${btnPestana} text-slate-600 hover:text-slate-900 hover:bg-white/60`;