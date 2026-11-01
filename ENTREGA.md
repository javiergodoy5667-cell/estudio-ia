# Entrega — Estudio (Fase 1)

- **App publicada:** https://javiergodoy5667-cell.github.io/estudio-ia/
- **Repo:** https://github.com/javiergodoy5667-cell/estudio-ia (público)
- **Cuaderno nuevo:** `proyectos/generador-imagenes/linderman_imagenes.ipynb` (regenerado)
- **Código local:** `proyectos/estudio-ia/app/` (es su propio repo git; agregado a `.gitignore` del repo Linderman)

## Fase 0 — resultados

**1. `--enable-cors-header` existe y sirve**

- `comfy/cli_args.py` línea 67: `parser.add_argument("--enable-cors-header", ...)`.
- `server.py` líneas 283-286: si se pasa el flag se usa `create_cors_middleware(origen)`; **si no**, se usa `create_origin_only_middleware()`, que devuelve **403** cuando `Sec-Fetch-Site: cross-site` o cuando no coincide el host con el origen.
- Prueba real (ComfyUI local `--cpu`, `python probar_cors.py`):

```
SIN flag (puerto 8189):
  GET /system_stats con Origin: http://localhost:8000  -> HTTP 403
  OPTIONS /prompt                                       -> HTTP 403

CON --enable-cors-header "http://localhost:8000" (puerto 8190):
  GET  /system_stats  -> 200 | Access-Control-Allow-Origin: http://localhost:8000
  POST /prompt        -> 400 (rechaza el flujo vacío, NO 403) | ACAO presente
  OPTIONS /prompt     -> 200 | ACAO presente
```

**2. `/view` se puede leer desde otro origen**

```
GET /view?filename=no_existe.png&type=output (con Origin)
  -> 404 pero con Access-Control-Allow-Origin: http://localhost:8000
```

Con el archivo real la respuesta es 200 y el cuerpo es la imagen: se puede bajar como
archivo y guardar en IndexedDB (que es lo que hace la app).

**3. WebSocket `/ws` por el túnel**

```
GET /ws?clientId=prueba (con Origin de otro sitio)
  -> HTTP/1.1 101 Switching Protocols
```

Funciona. Aun así la app tiene el plan B: consulta `/history/<id>` cada 1,5 s.

**Prueba con navegador de verdad:** Chrome (por Playwright) cargó la app servida en
`http://localhost:8000` con el generador en `http://127.0.0.1:8192` (ComfyUI arrancado con
`--enable-cors-header "http://localhost:8000"`): el indicador quedó **verde "Generador listo"**
y el botón Crear se habilitó al escribir una idea. Con un link muerto (`127.0.0.1:9999`) queda
rojo y la hoja muestra el aviso correspondiente.

Ese mismo ComfyUI arrancado con el origen exacto de Pages
(`--enable-cors-header "https://javiergodoy5667-cell.github.io"`) devuelve
`Access-Control-Allow-Origin: https://javiergodoy5667-cell.github.io` (verificado con `curl`).

Lo que **no** se pudo probar en esta máquina es la app publicada hablando con el ComfyUI local:
Chrome bloquea que una página pública (`https://…github.io`) pida algo en `127.0.0.1`
(protección de red privada: `Permission was denied … loopback address space`). En producción no
pasa: el generador es un dominio público `https://….trycloudflare.com`.

## Tabla de "terminado" (sección 13)

| Casilla | Estado | Prueba |
|---|---|---|
| Fase 0 completa con los 3 puntos | **hecho** | salidas de arriba (`probar_cors.py`, `probar_flujo.py`) |
| Cuaderno con `--enable-cors-header` al origen exacto; `/app` vieja sigue | **hecho** | `armar_cuaderno.py` parcheado + `.ipynb` regenerado; el `.ipynb` contiene `--enable-cors-header`, `https://javiergodoy5667-cell.github.io` y las rutas `/app`, `/linderman/*` intactas |
| App publicada en Pages con link fijo; Actions en cada push | **hecho** | corrida "Publicar en GitHub Pages" = success; `curl` del sitio da 200 |
| PWA instalable sin errores de manifiesto; SW red primero; versión sube; nada del generador en caché | **parcial** | medido con Playwright sobre el sitio publicado: el navegador lee el manifiesto (`Estudio`, 4 íconos, `standalone`) y hay **1 service worker registrado**; `sw.js` (versión `estudio-v2`) cachea solo el shell, excluye `trycloudflare.com` y sube el número en cada cambio. **No probado** instalando en un Android real |
| Conectar: limpia el link, prueba `/system_stats`, recuerda el último, indicador verde/rojo | **hecho** | navegador real: verde "Generador listo"; con link muerto queda rojo y la hoja muestra "No respondió…" (8 s de espera); el link se guarda en `localStorage` |
| Crear en los 4 formatos con tamaños exactos; progreso real; Cancelar | **parcial** | tamaños en `config.js` (768×1344, 896×1120, 1024×1024, 1344×768); progreso por WebSocket con plan B; cancelar hace `POST /interrupt`. **No se generó una imagen real** (ver abajo) |
| Bajar, Otra igual y Galería con el archivo en IndexedDB | **parcial** | código completo; `guardar/listar/borrar` con IndexedDB; **no probado con una imagen real** por falta de modelo local |
| Errores de la tabla 9 probados (link malo, apagado, cancelar, incógnito) | **parcial** | link malo y apagado probados en navegador; cancelar y cuota de IndexedDB tienen su ruta de código, no probados |
| Diseño igual a la maqueta; capturas 390 px y 1280 px | **hecho** | `capturas/movil-390.png` (390 px), `capturas/pc-1280.png` (1280 px), `capturas/movil-efectos.png` y `capturas/movil-error.png`, tomadas con Playwright: colores, radios, tipografías locales y menú abajo en teléfono / al costado en compu |
| Sin textos técnicos visibles; sin negocios concretos; nada de Higgsfield | **hecho** | textos revisados: "idea", "variación", "formato", "paso X de N" |

## Decisiones distintas al prompt

1. **Tipografías propias:** en vez de pedirlas a Google cada vez, se bajaron Bricolage
   Grotesque e Inter a `fuentes/` y se sirven desde la app. Se ve igual y funciona sin internet.
2. **`?generador=<link>` en la dirección:** si viene, la app lo limpia, lo guarda y se conecta.
   Sirvió para probar sin tocar el teléfono y sirve para mandarle el link a alguien.
3. **Carpeta `app/` como repo propio:** el repo público se armó con esa carpeta como raíz y se
   agregó a `.gitignore` del repo Linderman, para no mezclar los dos historiales.
4. **El origen de Pages incluye el nombre del repo:** el sitio vive en
   `https://javiergodoy5667-cell.github.io/estudio-ia/`, pero el origen que pide CORS es solo
   `https://javiergodoy5667-cell.github.io` (el navegador no mira la ruta).
5. **Aviso de link malo dentro de la hoja:** si el link no responde, se abre la hoja de conectar
   con el mensaje en rojo, en vez de dejarlo solo en la consola.

## Errores conocidos y lo que falta

- **No se pudo crear una imagen de verdad en esta máquina.** Los tres checkpoints de
  `C:\Users\casaa\lt` están vacíos (0 bytes) y no hay tarjeta. El flujo de la app se probó
  contra ComfyUI real: `/prompt` lo acepta y ejecuta `EmptyLatentImage` y `VAELoader`, y falla
  al abrir el checkpoint (archivo local vacío, no un error del flujo). En Kaggle los modelos
  los baja el cuaderno.
- **Se reemplazó el VAE local**: `models/vae/sdxl_vae_fp16_fix.safetensors` estaba en 0 bytes
  (el error "header too small" que salía en `comfy.log`); se bajó el archivo real de 334 MB y
  el viejo quedó como `.danado`. Es un arreglo de la instalación local, no de la app.
- **Sin probar en teléfono Android real**: la instalación PWA (ícono en pantalla de inicio)
  hay que confirmarla en el teléfono de Javier.
- **Cancelar y "se cortó la conexión"** tienen su camino escrito, pero no se ejercitaron contra
  una generación real.
- **Efectos, Plantillas, Video, Voz y Mejorar** son pantallas visibles con el aviso "Llega en la
  próxima fase", como pide la Fase 1.
