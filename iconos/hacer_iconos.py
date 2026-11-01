# Dibuja el ícono de Estudio (192 y 512 px): fondo oscuro y una "E" ámbar.
from PIL import Image, ImageDraw

FONDO = (14, 14, 16, 255)
AMBAR = (255, 184, 77, 255)


def icono(lado, ruta):
    img = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Cuadrado redondeado de fondo
    radio = int(lado * 0.22)
    d.rounded_rectangle([0, 0, lado - 1, lado - 1], radius=radio, fill=FONDO)

    # "E" de tres barras: gruesa, geométrica, legible a 48 px
    ancho_barra = int(lado * 0.115)
    alto_barra = int(lado * 0.115)
    x0 = int(lado * 0.30)
    x1 = int(lado * 0.70)
    ys = [int(lado * 0.30), int(lado * 0.50), int(lado * 0.70)]
    for i, y in enumerate(ys):
        fin = x1 if i == 2 else x1 - int(lado * 0.06)
        d.rounded_rectangle([x0, y - alto_barra // 2, fin, y + alto_barra // 2], radius=alto_barra // 2, fill=AMBAR)
    # Palito vertical que une las barras
    d.rounded_rectangle(
        [x0 - ancho_barra // 2, ys[0] - alto_barra // 2, x0 + ancho_barra // 2, ys[2] + alto_barra // 2],
        radius=ancho_barra // 2,
        fill=AMBAR,
    )
    img.save(ruta, "PNG")
    print("Listo:", ruta, img.size)


if __name__ == "__main__":
    import os

    aqui = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(aqui, exist_ok=True)
    icono(192, os.path.join(aqui, "icono-192.png"))
    icono(512, os.path.join(aqui, "icono-512.png"))
