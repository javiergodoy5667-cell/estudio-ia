// Todo lo que habla con el generador (ComfyUI en Kaggle, por el túnel).

import { CONFIG } from "./config.js";

export class Generador {
  constructor() {
    this.base = "";
    this.cliente = Math.random().toString(36).slice(2);
    this.aviso = null; // función que recibe el progreso (paso X de N)
  }

  // Acepta el link con o sin "/app" al final, con o sin "/", con espacios de más.
  static limpiarLink(link) {
    let t = String(link || "").trim();
    if (!t) return "";
    if (!/^https?:\/\//i.test(t)) t = "https://" + t;
    try {
      const u = new URL(t);
      u.hash = "";
      u.search = "";
      let camino = u.pathname.replace(/\/+$/, "");
      camino = camino.replace(/\/app$/i, "");
      u.pathname = camino;
      return u.origin + camino;
    } catch {
      return "";
    }
  }

  usar(link) {
    this.base = Generador.limpiarLink(link);
    return this.base;
  }

  // ¿Está prendido? Devuelve true/false. No tira error para no romper la pantalla.
  async saludar(base = this.base) {
    if (!base) return false;
    const corte = new AbortController();
    const reloj = setTimeout(() => corte.abort(), CONFIG.esperaSaludo);
    try {
      const r = await fetch(base + "/system_stats", { signal: corte.signal, cache: "no-store" });
      return r.ok;
    } catch (e) {
      console.warn("No respondió el generador:", e);
      return false;
    } finally {
      clearTimeout(reloj);
    }
  }

  // Lista de modelos instalados. Si falla, se usa el que venga por defecto.
  async modelos() {
    try {
      const r = await fetch(this.base + "/object_info/CheckpointLoaderSimple", { cache: "no-store" });
      if (!r.ok) return [];
      const j = await r.json();
      const lista = (j.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]) || [];
      return lista.filter((n) => !/inpaint/i.test(n));
    } catch (e) {
      console.warn("No se pudo leer la lista de modelos:", e);
      return [];
    }
  }

  // Manda a crear la imagen. Devuelve el número de trabajo.
  async pedir(flujo) {
    let r;
    try {
      r = await fetch(this.base + "/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: flujo, client_id: this.cliente }),
      });
    } catch (e) {
      if (e instanceof TypeError) {
        const err = new Error("El generador no deja entrar a la app. Falta el cambio del cuaderno.");
        err.detalle = e.message;
        throw err;
      }
      throw e;
    }
    if (r.status === 403) {
      const err = new Error("El generador no deja entrar a la app. Falta el cambio del cuaderno.");
      err.detalle = "403";
      throw err;
    }
    let j = {};
    try {
      j = await r.json();
    } catch {
      /* respuesta vacía */
    }
    if (!r.ok || j.error) {
      const detalle = j.node_errors
        ? Object.values(j.node_errors)
            .map((n) => (n.errors || []).map((e) => e.details || e.message).join("; "))
            .join(" | ")
        : "";
      console.error("Error del generador:", j);
      const err = new Error("No se pudo crear la imagen. Probá con otra idea.");
      err.detalle = (j.error?.message || "error") + (detalle ? ": " + detalle : "");
      throw err;
    }
    return j.prompt_id;
  }

  // Avisa el avance en vivo (paso X de N) si el generador lo permite.
  escucharProgreso(id, alAvanzar) {
    let ws;
    try {
      const url = this.base.replace(/^http/i, "ws") + "/ws?clientId=" + this.cliente;
      ws = new WebSocket(url);
    } catch (e) {
      console.warn("Sin aviso en vivo:", e);
      return () => {};
    }
    this.aviso = { id, alAvanzar };
    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === "progress" && m.data?.prompt_id === id) {
        alAvanzar(m.data.value, m.data.max);
      }
    };
    ws.onerror = () => console.warn("Se cortó el aviso en vivo: se sigue preguntando igual.");
    return () => {
      try {
        ws.close();
      } catch {
        /* ya estaba cerrado */
      }
      this.aviso = null;
    };
  }

  // Pregunta si ya está. Plan B del aviso en vivo: cada 1.5 s.
  async esperar(id, { alPaso, maximo = 15 * 60 * 1000 } = {}) {
    const cerrarAviso = alPaso ? this.escucharProgreso(id, alPaso) : () => {};
    const arranque = Date.now();
    let fallos = 0;
    try {
      while (Date.now() - arranque < maximo) {
        await new Promise((r) => setTimeout(r, CONFIG.cadaCuantoPreguntar));
        let j;
        try {
          const r = await fetch(this.base + "/history/" + id, { cache: "no-store" });
          if (!r.ok) throw new Error("respuesta " + r.status);
          j = await r.json();
          fallos = 0;
        } catch (e) {
          fallos++;
          if (fallos >= 3) {
            const err = new Error("Se cortó la conexión. Tu idea quedó guardada, tocá Crear otra vez.");
            err.detalle = e.message;
            throw err;
          }
          continue;
        }
        const h = j[id];
        if (!h) continue;
        const estado = h.status || {};
        if (estado.status_str === "error") {
          const mensajes = estado.messages || [];
          if (mensajes.some((m) => m[0] === "execution_interrupted")) {
            const err = new Error("Cancelaste la imagen.");
            err.cancelado = true;
            throw err;
          }
          const fallo = mensajes.find((m) => m[0] === "execution_error");
          console.error("Error en Kaggle:", fallo);
          const err = new Error("El generador devolvió un error. Probá otra vez.");
          err.detalle = fallo ? fallo[1]?.exception_message : "";
          throw err;
        }
        const imagenes = Object.values(h.outputs || {}).flatMap((o) => o.images || []).filter((im) => im.type === "output");
        if (imagenes.length) return imagenes;
      }
      throw new Error("Tardó demasiado. Podés cancelar o seguir esperando.");
    } finally {
      cerrarAviso();
    }
  }

  // Baja la imagen como archivo (para guardarla y para "Bajar").
  async traer(im) {
    const q = new URLSearchParams({
      filename: im.filename,
      subfolder: im.subfolder || "",
      type: "output",
    });
    const r = await fetch(this.base + "/view?" + q.toString(), { cache: "no-store" });
    if (!r.ok) throw new Error("No se pudo bajar la imagen (" + r.status + ").");
    return await r.blob();
  }

  async cancelar() {
    try {
      await fetch(this.base + "/interrupt", { method: "POST" });
    } catch (e) {
      console.warn("No se pudo cancelar:", e);
    }
  }
}
