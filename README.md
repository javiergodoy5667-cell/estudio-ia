# Estudio

App para crear imágenes desde el teléfono o la compu, usando tu generador de Kaggle.
Es una página web instalable: no hay que bajar nada de una tienda.

## Qué hace hoy (Fase 1)

- Conectarse al generador pegando el link del cuaderno de Kaggle.
- Crear imágenes en 4 formatos: 9:16, 4:5, 1:1 y 16:9.
- Mostrar el avance real (paso X de N) y dejar cancelar.
- Bajar la imagen, pedir "otra igual" y guardarla en la galería del teléfono.
- Galería que guarda la imagen completa: sigue ahí aunque apagues Kaggle.

Efectos, Plantillas, Video, Voz y Mejorar se ven, pero avisan "Llega en la próxima fase".

## Cómo usarla en el teléfono

1. Abrí el link de la app en Chrome.
2. Menú (⋮) → **Agregar a pantalla de inicio**. Queda el ícono de Estudio.
3. Prendé tu cuaderno en Kaggle (Run All) y copiá el link que termina en `/app`.
4. En la app, tocá la píldora de arriba ("Generador apagado") y pegá ese link. Guardar.
5. Escribí una idea, elegí el formato y tocá **Crear**.

El link del generador cambia cada vez que prendés Kaggle: hay que volver a pegarlo.

## Cómo se actualiza

El código vive en GitHub (`estudio-ia`). Cada vez que se sube un cambio a `main`,
GitHub publica la versión nueva sola. En la app, cuando cambia algo:

1. Subir el número de versión en `sw.js` (`estudio-v1` → `estudio-v2`).
2. Subir los archivos.
3. Cerrar y abrir la app en el teléfono (dos veces, para que entre la versión nueva).

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | La pantalla: Crear, Efectos, Galería, Plantillas |
| `styles.css` | Colores, letras y medidas de la maqueta |
| `app.js` | Une todo: pantallas, botones y estados |
| `api.js` | Habla con el generador (ComfyUI) |
| `flujos.js` | Arma el trabajo de imagen (mismos nodos que la página vieja) |
| `galeria.js` | Guarda las imágenes en el teléfono |
| `ui.js` | Avisos, confirmaciones y descargas |
| `config.js` | Ajustes que se pueden cambiar sin tocar la lógica |
| `sw.js` | Deja la app abierta sin internet |
| `manifest.webmanifest` | Nombre e íconos para instalarla |
| `iconos/`, `fuentes/` | Íconos y tipografías de la maqueta |

## Para el que programa

- No usa framework ni paso de compilación: módulos ES normales.
- La app se sirve desde GitHub Pages y habla con ComfyUI por el túnel de Kaggle.
- Para que el navegador no bloquee esa conversación, el cuaderno arranca ComfyUI con
  `--enable-cors-header "https://javiergodoy5667-cell.github.io"` (el origen exacto de
  Pages, nunca `*`).
- Probado sin tarjeta con `python -m http.server` y Chrome; el detalle de cada prueba
  está en `ENTREGA.md`.
