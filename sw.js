// Guarda la app para que abra sin internet. Nunca guarda nada del generador.

const VERSION = "estudio-v3"; // subir el número en CADA cambio publicado
const CACHE = VERSION + "-shell";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./api.js",
  "./flujos.js",
  "./galeria.js",
  "./ui.js",
  "./manifest.webmanifest",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
  "./fuentes/inter.woff2",
  "./fuentes/bricolage-grotesque.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Lo del generador no se toca nunca.
function esDelGenerador(url) {
  return url.hostname.endsWith("trycloudflare.com") || ["8188", "8189", "8190", "8191", "8192"].includes(url.port);
}

self.addEventListener("fetch", (e) => {
  const pedido = e.request;
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) {
    if (esDelGenerador(url)) return; // ni se guarda ni se sirve del caché
    // Lo de afuera: primero el caché, si no hay, la red
    e.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ||
          fetch(pedido)
            .then((r) => {
              const copia = r.clone();
              caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
              return r;
            })
            .catch(() => Response.error())
      )
    );
    return;
  }

  const esImagen = pedido.destination === "image" || /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);
  if (esImagen) {
    // Íconos: primero el caché
    e.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ||
          fetch(pedido).then((r) => {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
            return r;
          })
      )
    );
    return;
  }

  // HTML, JS y CSS: primero la red, y si no hay red, lo guardado
  e.respondWith(
    fetch(pedido)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(pedido).then((guardado) => guardado || caches.match("./index.html")))
  );
});
