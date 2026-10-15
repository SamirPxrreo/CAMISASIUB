/* =============================================================================
   SERVICE WORKER — Camisas IUB
   =============================================================================
   Por que: la app se declara PWA pero no tenia service worker, asi que no
   cacheaba nada. GitHub Pages sirve con `Cache-Control: max-age=600`, o sea
   que en el celular habia que bajarse el bundle entero cada 10 minutos. Con
   datos moviles eso es lo que hacia que "no cargara".

   Estrategia (deliberadamente conservadora para que nadie se quede pegado
   en una version vieja):

   - Navegacion (abrir la app) ....... red primero, cache de respaldo.
                                      El HTML SIEMPRE llega fresco si hay red,
                                      por eso nunca se ve una version vieja.
   - Archivos estaticos .............. stale-while-revalidate. Se sirven al
                                      instante desde la cache y se actualizan
                                      por detras para la proxima vez.
   - API de Supabase ................. SIEMPRE en red, NUNCA cacheada.
                                      Cachear respuestas de API daria datos
      viejos y podria filtrar sesiones de otro dispositivo.

   El UpdateNotifier avisa cuando hay version nueva; al pulsar "Actualizar"
   envia SKIP_WAITING para que este worker se retire y recargue limpio.
   ============================================================================= */

const VERSION = 'v1';
const CACHE_SHELL = `camisasiub-shell-${VERSION}`;
const CACHE_ASSETS = `camisasiub-assets-${VERSION}`;

// El "shell" minimo para que la app arranque sin conexion.
const SHELL = ['./', './index.html', './manifest.json'];

// Todo lo que se sirve desde cache y se refresca por detras.
const ES_ESTATICO = /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico|json)$/i;

const esSupabase = (url) =>
  url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in');

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((n) => n.startsWith('camisasiub-') && n !== CACHE_SHELL && n !== CACHE_ASSETS)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// El UpdateNotifier lo usa para forzar la recarga sin dejar caches viejas.
self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;

  if (peticion.method !== 'GET') return;

  let url;
  try {
    url = new URL(peticion.url);
  } catch {
    return;
  }

  // 1) API de Supabase: jamas cachear.
  if (esSupabase(url) || url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 2) Navegacion: red primero, con el shell cacheado como respaldo sin conexion.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_SHELL).then((c) => c.put('./index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 3) Estaticos: servir de inmediato desde cache y refrescar por detras.
  if (ES_ESTATICO.test(url.pathname)) {
    evento.respondWith(
      caches.open(CACHE_ASSETS).then(async (cache) => {
        const guardado = await cache.match(peticion);
        const red = fetch(peticion)
          .then((respuesta) => {
            if (respuesta && respuesta.status === 200 && respuesta.type === 'basic') {
              cache.put(peticion, respuesta.clone());
            }
            return respuesta;
          })
          .catch(() => guardado);
        return guardado || red;
      })
    );
  }
});