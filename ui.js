// Piezas chiquitas de pantalla: avisos, confirmación, descargas y fechas.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

let temporizadorAviso = null;

// Aviso abajo, en español y sin ventanas del navegador.
export function avisar(texto, tipo = "info") {
  let caja = $("#aviso");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "aviso";
    caja.className = "aviso";
    document.body.appendChild(caja);
  }
  caja.textContent = texto;
  caja.dataset.tipo = tipo;
  caja.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => caja.classList.remove("visible"), 4200);
}

// Confirmación dentro de la app (nunca alert/confirm del navegador).
export function confirmar({ titulo, texto, si = "Borrar", no = "Mejor no" }) {
  return new Promise((listo) => {
    const capa = document.createElement("div");
    capa.className = "capa";
    capa.innerHTML = `
      <div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="dlgTitulo">
        <h3 id="dlgTitulo"></h3>
        <p></p>
        <div class="dialogo-botones">
          <button type="button" class="boton-suave" data-no></button>
          <button type="button" class="boton-peligro" data-si></button>
        </div>
      </div>`;
    capa.querySelector("h3").textContent = titulo;
    capa.querySelector("p").textContent = texto;
    capa.querySelector("[data-si]").textContent = si;
    capa.querySelector("[data-no]").textContent = no;

    const cerrar = (valor) => {
      capa.remove();
      document.removeEventListener("keydown", escape);
      listo(valor);
    };
    const escape = (e) => {
      if (e.key === "Escape") cerrar(false);
    };
    capa.querySelector("[data-si]").onclick = () => cerrar(true);
    capa.querySelector("[data-no]").onclick = () => cerrar(false);
    capa.onclick = (e) => {
      if (e.target === capa) cerrar(false);
    };
    document.addEventListener("keydown", escape);
    document.body.appendChild(capa);
    capa.querySelector("[data-no]").focus();
  });
}

// Nombre con la fecha, como pide el cuaderno: estudio-AAAAMMDD-HHMMSS.png
export function nombreArchivo(fecha = new Date()) {
  const dos = (n) => String(n).padStart(2, "0");
  const dia = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
  return `estudio-${dia}-${hora}.png`;
}

export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function fechaCorta(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

export function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
