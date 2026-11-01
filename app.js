// Estudio: la app. Acá se arma la pantalla y se conecta todo.

import { CONFIG } from "./config.js";
import { Generador } from "./api.js";
import { flujoImagen, perfilDe, nombreBonito } from "./flujos.js";
import * as Galeria from "./galeria.js";
import { $, $$, avisar, confirmar, descargar, nombreArchivo, fechaCorta, esperar } from "./ui.js";

const generador = new Generador();
const guardadoLocal = {
  get: (c) => {
    try {
      return localStorage.getItem(c);
    } catch {
      return null;
    }
  },
  set: (c, v) => {
    try {
      localStorage.setItem(c, v);
    } catch {
      /* modo incógnito */
    }
  },
};

const estado = {
  modo: "img",
  formato: CONFIG.formatoInicial,
  listo: false,
  trabajando: false,
  modelos: [],
  modelo: "",
  resultado: null, // { blob, idea, formato, semilla, ancho, alto }
  ultimaIdea: "",
  avisoLento: null,
};

/* ============ pantallas ============ */

function ir(nombre) {
  $$(".pantalla").forEach((p) => {
    const activa = p.id === "pantalla-" + nombre;
    p.classList.toggle("activa", activa);
    p.hidden = !activa;
  });
  $$(".menu-item").forEach((b) => b.classList.toggle("activo", b.dataset.ir === nombre));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (nombre === "galeria") pintarGaleria();
}

$$("[data-ir]").forEach((b) => (b.onclick = () => ir(b.dataset.ir)));

/* ============ estado del generador ============ */

function pintarEstado() {
  const caja = $("#estado");
  caja.classList.toggle("listo", estado.listo);
  $("#estadoTexto").textContent = estado.listo ? "Generador listo" : "Generador apagado";
  actualizarBoton();
}

function actualizarBoton() {
  const texto = $("#idea").value.trim();
  $("#crear").disabled = estado.trabajando || !texto || !estado.listo;
}

async function saludar() {
  estado.listo = await generador.saludar();
  pintarEstado();
  return estado.listo;
}

function recordarLink(link) {
  guardadoLocal.set(CONFIG.claveLink, link);
}

// Muestra el problema dentro de la hoja de conectar (nunca con ventanas del navegador).
function avisarLink(mensaje) {
  abrirHoja();
  $("#errorLink").textContent = mensaje;
  $("#errorLink").hidden = false;
}

async function conectar(link) {
  const limpio = Generador.limpiarLink(link);
  if (!limpio) {
    avisarLink("Ese link no se entiende. Copialo otra vez del cuaderno.");
    return false;
  }
  generador.usar(limpio);
  $("#errorLink").hidden = true;
  $("#estadoTexto").textContent = "Revisando…";
  const vive = await generador.saludar(limpio);
  if (!vive) {
    estado.listo = false;
    pintarEstado();
    avisarLink("No respondió. Revisá que el cuaderno esté prendido y que el link sea el de recién.");
    return false;
  }
  recordarLink(limpio);
  estado.listo = true;
  pintarEstado();
  await cargarModelos();
  cerrarHoja();
  avisar("Generador conectado.");
  return true;
}

function abrirHoja() {
  $("#capaConectar").hidden = false;
  document.body.classList.add("sangrado");
  $("#link").value = guardadoLocal.get(CONFIG.claveLink) || "";
  $("#errorLink").hidden = true;
  setTimeout(() => $("#link").focus(), 120);
}

function cerrarHoja() {
  $("#capaConectar").hidden = true;
  document.body.classList.remove("sangrado");
}

$("#estado").onclick = abrirHoja;
$("#cerrarConectar").onclick = cerrarHoja;
$("#capaConectar").onclick = (e) => {
  if (e.target.id === "capaConectar") cerrarHoja();
};
$("#guardarLink").onclick = () => conectar($("#link").value);
$("#link").addEventListener("keydown", (e) => {
  if (e.key === "Enter") conectar($("#link").value);
});

/* ============ modelos ============ */

async function cargarModelos() {
  const lista = await generador.modelos();
  estado.modelos = lista;
  if (!lista.length) {
    estado.modelo = "";
    return;
  }
  const preferido = lista.find((n) => n.toLowerCase().includes(CONFIG.modeloPreferido.toLowerCase()));
  const bonito = lista.find((n) => perfilDe(n) === "realvis");
  estado.modelo = preferido || bonito || lista[0];
  console.info("Modelo en uso:", nombreBonito(estado.modelo), estado.modelo);
}

/* ============ tipos y formatos ============ */

const MODOS = [
  { id: "img", label: "Imagen", pregunta: "¿Qué imagen querés?", ejemplo: "Un astronauta tomando café en una terraza, atardecer", tiempo: "≈ 40 s" },
  { id: "vid", label: "Video", pronto: true },
  { id: "voz", label: "Voz", pronto: true },
  { id: "hd", label: "Mejorar", pronto: true },
];

function pintarModos() {
  const caja = $("#modos");
  caja.innerHTML = "";
  MODOS.forEach((m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "modo" + (estado.modo === m.id ? " activa" : "");
    b.innerHTML = m.label + (m.pronto ? ' <span class="pronto">Pronto</span>' : "");
    b.onclick = () => {
      if (m.pronto) {
        avisar("Llega en la próxima fase.");
        return;
      }
      estado.modo = m.id;
      pintarModos();
    };
    caja.appendChild(b);
  });
  const actual = MODOS.find((m) => m.id === estado.modo) || MODOS[0];
  $("#pregunta").textContent = actual.pregunta || "¿Qué imagen querés?";
  $("#idea").placeholder = actual.ejemplo || "";
  $("#tiempo").textContent = actual.tiempo || "≈ 40 s";
}

function pintarFormatos() {
  const caja = $("#formatos");
  caja.innerHTML = "";
  Object.keys(CONFIG.formatos).forEach((f) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "formato" + (estado.formato === f ? " activo" : "");
    b.textContent = f;
    b.setAttribute("aria-pressed", String(estado.formato === f));
    b.onclick = () => {
      estado.formato = f;
      pintarFormatos();
    };
    caja.appendChild(b);
  });
}

$("#idea").addEventListener("input", actualizarBoton);
$("#idea").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 900) {
    e.preventDefault();
    crear();
  }
});

/* ============ crear ============ */

function mostrarProgreso(texto, porcentaje) {
  $("#progreso").hidden = false;
  $("#progresoTexto").textContent = texto;
  $("#barraRelleno").style.width = Math.max(0, Math.min(100, porcentaje || 0)) + "%";
}

function cerrarProgreso() {
  $("#progreso").hidden = true;
  $("#barraRelleno").style.width = "0%";
}

async function crear() {
  if (estado.trabajando) return;
  const idea = $("#idea").value.trim();
  if (!idea) return;
  if (!estado.listo) {
    avisar("Prendé tu cuaderno en Kaggle y pegá el link nuevo.", "error");
    abrirHoja();
    return;
  }
  if (!estado.modelo) await cargarModelos();
  if (!estado.modelo) {
    avisar("El generador no tiene modelos listos. Revisá Kaggle.", "error");
    return;
  }

  estado.trabajando = true;
  estado.ultimaIdea = idea;
  $("#crear").disabled = true;
  $("#resultado").hidden = true;
  mostrarProgreso("Enviando… (la primera vez tarda más)", 2);

  const medidas = CONFIG.formatos[estado.formato];
  const semilla = Math.floor(Math.random() * 2 ** 32);

  try {
    const flujo = flujoImagen({
      modelo: estado.modelo,
      idea,
      ancho: medidas.ancho,
      alto: medidas.alto,
      semilla,
      formato: estado.formato,
    });

    const id = await generador.pedir(flujo);
    mostrarProgreso("Trabajando…", 5);

    const relojLento = setTimeout(() => {
      avisar("Está tardando más de lo normal. Podés cancelar o seguir esperando.");
    }, CONFIG.avisoLento);
    estado.avisoLento = relojLento;

    const imagenes = await generador.esperar(id, {
      alPaso: (paso, total) => mostrarProgreso(`Trabajando… paso ${paso} de ${total}`, (paso / total) * 100),
      maximo: 15 * 60 * 1000,
    });
    clearTimeout(relojLento);

    const imagen = imagenes[0];
    mostrarProgreso("Bajando la imagen…", 100);
    const blob = await generador.traer(imagen);
    await mostrarResultado({ blob, idea, formato: estado.formato, semilla, ancho: medidas.ancho, alto: medidas.alto });
  } catch (e) {
    console.error("No se pudo crear:", e, e.detalle || "");
    const mensaje = e.cancelado ? "Cancelaste la imagen." : e.message || "Algo salió mal.";
    avisar(mensaje, "error");
  } finally {
    clearTimeout(estado.avisoLento);
    estado.trabajando = false;
    cerrarProgreso();
    actualizarBoton();
  }
}

async function mostrarResultado(datos) {
  estado.resultado = datos;
  const url = URL.createObjectURL(datos.blob);
  $("#resultadoImagen").src = url;
  $("#resultado").hidden = false;

  let guardada = true;
  try {
    await Galeria.guardar(datos);
    $("#guardado").textContent = "Guardada en tu galería.";
    $("#guardado").classList.remove("malo");
  } catch (e) {
    guardada = false;
    console.warn("No se pudo guardar en la galería:", e);
    $("#guardado").textContent = "No se pudo guardar en galería, bajala.";
    $("#guardado").classList.add("malo");
  }
  if (guardada) avisar("Imagen lista. Guardada en tu galería.");
  pintarUltimas();
}

$("#crear").onclick = crear;

$("#cancelar").onclick = async () => {
  $("#progresoTexto").textContent = "Cancelando…";
  await generador.cancelar();
};

$("#bajar").onclick = () => {
  if (estado.resultado) descargar(estado.resultado.blob, nombreArchivo());
};

$("#otra").onclick = () => {
  if (estado.ultimaIdea) $("#idea").value = estado.ultimaIdea;
  crear();
};

$("#fotoRef").onclick = () => avisar("Llega en la próxima fase.");

/* ============ lo último ============ */

async function pintarUltimas() {
  const caja = $("#ultimas");
  try {
    const items = (await Galeria.listar()).slice(0, 2);
    caja.innerHTML = "";
    $("#vacioUltimas").hidden = items.length > 0;
    items.forEach((item) => caja.appendChild(miniatura(item)));
  } catch (e) {
    console.warn("No se pudo leer la galería:", e);
  }
}

function miniatura(item) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "miniatura";
  b.setAttribute("aria-label", "Ver imagen: " + item.idea);
  const url = URL.createObjectURL(item.blob);
  const img = document.createElement("img");
  img.src = url;
  img.alt = item.idea;
  img.loading = "lazy";
  img.onload = () => setTimeout(() => URL.revokeObjectURL(url), 1500);
  const etiqueta = document.createElement("span");
  etiqueta.className = "formato-etiqueta";
  etiqueta.textContent = item.formato;
  b.append(img, etiqueta);
  b.onclick = () => verImagen(item);
  return b;
}

/* ============ galería ============ */

async function pintarGaleria() {
  const caja = $("#galeria");
  try {
    const items = await Galeria.listar();
    caja.innerHTML = "";
    $("#vacioGaleria").hidden = items.length > 0;
    items.forEach((item) => caja.appendChild(miniatura(item)));
  } catch (e) {
    console.warn("No se pudo abrir la galería:", e);
    avisar("No se pudo abrir la galería.", "error");
  }
}

function verImagen(item) {
  const capa = document.createElement("div");
  capa.className = "visor";
  const url = URL.createObjectURL(item.blob);
  capa.innerHTML = `
    <button type="button" class="boton-suave" data-cerrar>Cerrar</button>
    <img alt="">
    <div class="datos">
      <p><strong>Idea:</strong> <span data-idea></span></p>
      <p><strong>Cuándo:</strong> <span data-fecha></span></p>
      <p><strong>Formato:</strong> <span data-formato></span></p>
      <p><strong>Variación:</strong> <span data-semilla></span></p>
    </div>
    <div class="acciones">
      <button type="button" class="boton-suave" data-bajar>Bajar</button>
      <button type="button" class="boton-peligro" data-borrar>Borrar</button>
    </div>`;
  capa.querySelector("img").src = url;
  capa.querySelector("[data-idea]").textContent = item.idea;
  capa.querySelector("[data-fecha]").textContent = fechaCorta(item.fecha);
  capa.querySelector("[data-formato]").textContent = `${item.formato} · ${item.ancho}×${item.alto}`;
  capa.querySelector("[data-semilla]").textContent = item.semilla;

  const cerrar = () => {
    capa.remove();
    document.body.classList.remove("sangrado");
    URL.revokeObjectURL(url);
  };
  capa.querySelector("[data-cerrar]").onclick = cerrar;
  capa.querySelector("[data-bajar]").onclick = () => descargar(item.blob, nombreArchivo(new Date(item.fecha)));
  capa.querySelector("[data-borrar]").onclick = async () => {
    const seguro = await confirmar({
      titulo: "¿Borrar esta imagen?",
      texto: "Se borra de este teléfono y no se puede recuperar.",
      si: "Borrar",
    });
    if (!seguro) return;
    try {
      await Galeria.borrar(item.id);
      cerrar();
      pintarGaleria();
      pintarUltimas();
      avisar("Imagen borrada.");
    } catch (e) {
      console.warn(e);
      avisar("No se pudo borrar.", "error");
    }
  };

  document.body.classList.add("sangrado");
  document.body.appendChild(capa);
}

/* ============ efectos y plantillas ============ */

const EFECTOS = [
  ["Acercar despacio", "Suspenso, detalle", "M4 12h16M12 4v16M8 8l8 8M16 8l-8 8"],
  ["Vuelta completa", "Ver todo alrededor", "M20 12a8 8 0 11-3-6.2M20 4v4h-4"],
  ["Dron que sube", "Paisajes, ciudades", "M12 20V6M6 12l6-6 6 6"],
  ["Seguir a la persona", "Gente en movimiento", "M5 12h11M12 7l5 5-5 5"],
  ["Golpe de zoom", "Impacto, sorpresa", "M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"],
  ["Mano temblorosa", "Se ve grabado con celular", "M3 12c3-4 5 4 8 0s5 4 8 0"],
];

function pintarEfectos() {
  const caja = $("#listaEfectos");
  EFECTOS.forEach(([nombre, uso, icono]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "efecto";
    b.innerHTML = `<span class="muestra"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="${icono}"></path></svg></span>
      <span class="nombre"></span><span class="uso"></span>`;
    b.querySelector(".nombre").textContent = nombre;
    b.querySelector(".uso").textContent = uso;
    b.onclick = () => avisar("Llega en la próxima fase.");
    caja.appendChild(b);
  });
}

const PLANTILLAS = [
  ["Anuncio de producto", "Foto → video con precio", "Video 9:16"],
  ["Retrato de estudio", "Tu foto con luz profesional", "Imagen 4:5"],
  ["Mismo personaje", "Una cara en muchas escenas", "Imagen 1:1"],
  ["Persona que habla", "Foto + audio = video", "Video 9:16"],
  ["Escena de película", "Idea → toma de cine", "Video 16:9"],
  ["Portada de YouTube", "Título grande y llamativo", "Imagen 16:9"],
];

function pintarPlantillas() {
  const caja = $("#listaPlantillas");
  PLANTILLAS.forEach(([nombre, que, formato]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "plantilla";
    b.innerHTML = `<span class="muestra"><span class="etiqueta"></span></span>
      <span class="nombre"></span><span class="que"></span>`;
    b.querySelector(".etiqueta").textContent = formato;
    b.querySelector(".nombre").textContent = nombre;
    b.querySelector(".que").textContent = que;
    b.onclick = () => avisar("Llega en la próxima fase.");
    caja.appendChild(b);
  });
}

/* ============ arranque ============ */

async function arrancar() {
  pintarModos();
  pintarFormatos();
  pintarEfectos();
  pintarPlantillas();
  pintarEstado();
  await pintarUltimas();
  pintarGaleria();

  const guardado = guardadoLocal.get(CONFIG.claveLink);
  if (guardado) {
    generador.usar(guardado);
    await saludar();
    if (estado.listo) await cargarModelos();
  }

  // Si el link viene en la dirección (?generador=...), se guarda y se usa.
  const deLaDireccion = new URLSearchParams(location.search).get("generador");
  if (deLaDireccion) {
    await conectar(deLaDireccion);
    history.replaceState(null, "", location.pathname);
  }

  // Revisar cada 30 s, solo con la app visible
  setInterval(() => {
    if (document.visibilityState === "visible" && !estado.trabajando) saludar();
  }, CONFIG.cadaCuantoRevisar);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !estado.trabajando) saludar();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("Sin modo sin conexión:", e));
  }
}

arrancar();
