# Baja las tipografÃ­as de la maqueta (Bricolage Grotesque e Inter) y las deja
# dentro de la app, para que el diseÃ±o se vea igual y funcione sin internet.
import os
import re
import urllib.request

CSS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter:wght@400;500;600&display=swap"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = AQUI
os.makedirs(DESTINO, exist_ok=True)

pedido = urllib.request.Request(CSS, headers={"User-Agent": UA})
css = urllib.request.urlopen(pedido, timeout=30).read().decode()

bloques = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)
latinos = {}
for b in bloques:
    familia = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    rango = re.search(r"unicode-range:\s*([^;]+);", b)
    url = re.search(r"url\((https://[^)]+)\)", b)
    if not rango or not url:
        continue
    if rango.group(1).strip().startswith("U+0000-00FF"):
        latinos[familia] = url.group(1)

print("Encontrados:", ", ".join(latinos))

for familia, url in latinos.items():
    nombre = familia.lower().replace(" ", "-") + ".woff2"
    ruta = os.path.join(DESTINO, nombre)
    datos = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()
    with open(ruta, "wb") as f:
        f.write(datos)
    print(f"Guardado {nombre}: {len(datos)} bytes")

