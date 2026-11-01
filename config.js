// Ajustes de Estudio. Todo lo que se puede cambiar sin tocar la lógica vive acá.

export const CONFIG = {
  // Dónde se recuerda el link del generador
  claveLink: "estudio.link",

  // Versión del caché: subir el número en CADA cambio publicado
  versionCache: "estudio-v1",

  // Modelo por defecto (se busca en la lista del generador; si no está, se usa el primero)
  modeloPreferido: "RealVisXL",

  // Ajustes de la imagen
  pasos: 30,
  cfg: 5,
  sampler: "dpmpp_2m_sde",
  programador: "karras",

  // Formatos y sus tamaños para SDXL
  formatos: {
    "9:16": { ancho: 768, alto: 1344, nombre: "Vertical" },
    "4:5": { ancho: 896, alto: 1120, nombre: "Post" },
    "1:1": { ancho: 1024, alto: 1024, nombre: "Cuadrada" },
    "16:9": { ancho: 1344, alto: 768, nombre: "Horizontal" },
  },

  formatoInicial: "9:16",

  // Lo que nunca queremos que salga
  negativo:
    "lowres, worst quality, low quality, blurry, deformed, bad anatomy, bad hands, extra fingers, watermark, text, cartoon, 3d, painting, illustration",

  // Cada cuánto se pregunta si el generador está prendido (solo con la app visible)
  cadaCuantoRevisar: 30000,

  // Cuánto se espera el saludo del generador
  esperaSaludo: 8000,

  // Cada cuánto se pregunta si la imagen ya está (si el aviso en vivo no llega)
  cadaCuantoPreguntar: 1500,

  // Aviso de "esto tarda demasiado"
  avisoLento: 240000,
};
