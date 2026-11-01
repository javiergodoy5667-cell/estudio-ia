// Arma el trabajo que entiende el generador. Reusa la lógica que ya funcionaba
// en la página vieja (mismos nodos, mismos modelos), sin inventar nada.

import { CONFIG } from "./config.js";

// El nombre del archivo del modelo dice qué estilo conviene usar
export function perfilDe(nombreArchivo) {
  const n = (nombreArchivo || "").toLowerCase();
  if (n.includes("lustify")) return "lustify";
  if (n.includes("realvis")) return "realvis";
  if (n.includes("noob") || n.includes("illustrious") || n.includes("wai")) return "noob";
  if (n.includes("pony")) return "pony";
  return "sdxl";
}

const PERFILES = {
  lustify: { pasos: 30, cfg: 4, sampler: "dpmpp_2m_sde", sched: "karras", pre: "" },
  realvis: { pasos: 30, cfg: 5, sampler: "dpmpp_2m_sde", sched: "karras", pre: "" },
  noob: {
    pasos: 28,
    cfg: 5,
    sampler: "euler_ancestral",
    sched: "normal",
    pre: "masterpiece, best quality, newest, absurdres, highres, ",
  },
  pony: { pasos: 28, cfg: 7, sampler: "euler_ancestral", sched: "normal", saltoClip: -2, pre: "score_9, score_8_up, score_7_up, " },
  sdxl: { pasos: CONFIG.pasos, cfg: CONFIG.cfg, sampler: CONFIG.sampler, sched: CONFIG.programador, pre: "" },
};

export function ajustesDe(perfil) {
  return PERFILES[perfil] || PERFILES.sdxl;
}

export function nombreBonito(nombreArchivo) {
  const n = (nombreArchivo || "").replace(/\.safetensors$/i, "");
  const perfil = perfilDe(nombreArchivo);
  const bonitos = {
    lustify: "Personas realistas",
    realvis: "Fotos realistas",
    noob: "Anime y personajes",
    pony: "Pony",
  };
  return bonitos[perfil] || n;
}

// Flujo de texto a imagen. Es el mismo que ya funcionaba en la página vieja.
export function flujoImagen({ modelo, idea, ancho, alto, semilla, formato }) {
  const perfil = ajustesDe(perfilDe(modelo));
  const texto = (perfil.pre || "") + idea;

  return {
    1: { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: modelo } },
    9: { class_type: "VAELoader", inputs: { vae_name: "sdxl_vae_fp16_fix.safetensors" } },
    4: { class_type: "EmptyLatentImage", inputs: { width: ancho, height: alto, batch_size: 1 } },
    2: { class_type: "CLIPTextEncode", inputs: { text: texto, clip: ["1", 1] } },
    3: { class_type: "CLIPTextEncode", inputs: { text: CONFIG.negativo, clip: ["1", 1] } },
    5: {
      class_type: "KSampler",
      inputs: {
        seed: semilla,
        steps: perfil.pasos,
        cfg: perfil.cfg,
        sampler_name: perfil.sampler,
        scheduler: perfil.sched,
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    6: { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["9", 0] } },
    7: { class_type: "SaveImage", inputs: { filename_prefix: "estudio", images: ["6", 0] } },
  };
}
