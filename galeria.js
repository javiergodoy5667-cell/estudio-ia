// Galería: guarda la imagen ENTERA en el teléfono (no el link, porque el link
// muere cuando se apaga Kaggle).

const NOMBRE_BASE = "estudio-galeria";
const VERSION = 1;
const ALMACEN = "imagenes";

let promesaBase = null;

function abrir() {
  if (promesaBase) return promesaBase;
  promesaBase = new Promise((listo, fallo) => {
    if (!("indexedDB" in window)) {
      fallo(new Error("Este navegador no guarda imágenes."));
      return;
    }
    const pedido = indexedDB.open(NOMBRE_BASE, VERSION);
    pedido.onupgradeneeded = () => {
      const base = pedido.result;
      if (!base.objectStoreNames.contains(ALMACEN)) {
        const almacen = base.createObjectStore(ALMACEN, { keyPath: "id", autoIncrement: true });
        almacen.createIndex("fecha", "fecha");
      }
    };
    pedido.onsuccess = () => listo(pedido.result);
    pedido.onerror = () => fallo(pedido.error || new Error("No se pudo abrir la galería."));
    pedido.onblocked = () => fallo(new Error("La galería está ocupada por otra pestaña."));
  });
  return promesaBase;
}

// Ejecuta una operación y devuelve lo que traiga el pedido al terminar la transacción.
function conAlmacen(modo, hacer) {
  return abrir().then(
    (base) =>
      new Promise((listo, fallo) => {
        let pedido;
        const transaccion = base.transaction(ALMACEN, modo);
        const almacen = transaccion.objectStore(ALMACEN);
        try {
          pedido = hacer(almacen);
        } catch (e) {
          fallo(e);
          return;
        }
        transaccion.oncomplete = () => listo(pedido ? pedido.result : undefined);
        transaccion.onerror = () => fallo(transaccion.error || new Error("No se pudo guardar en la galería."));
        transaccion.onabort = () => fallo(new Error("Se cortó el guardado en la galería."));
      })
  );
}

export async function guardar({ blob, idea, formato, semilla, ancho, alto }) {
  const item = { blob, idea, formato, semilla, ancho, alto, fecha: Date.now() };
  const id = await conAlmacen("readwrite", (almacen) => almacen.add(item));
  return { ...item, id };
}

export async function listar() {
  const items = (await conAlmacen("readonly", (almacen) => almacen.getAll())) || [];
  return [...items].sort((a, b) => b.fecha - a.fecha);
}

export async function borrar(id) {
  await conAlmacen("readwrite", (almacen) => almacen.delete(id));
}

export async function cuantas() {
  return (await conAlmacen("readonly", (almacen) => almacen.count())) || 0;
}
