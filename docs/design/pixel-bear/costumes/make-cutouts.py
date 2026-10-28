"""Remove PixelLab unzoom's opaque white canvas from supplied pixel-art references."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent / "pixellab"
SOURCE = ROOT / "native"
OUTPUT = ROOT / "cutouts"
OUTPUT.mkdir(parents=True, exist_ok=True)


def cutout(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    seen = bytearray(width * height)
    queue = deque()

    def background(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return r >= 248 and g >= 248 and b >= 248

    def add(x: int, y: int) -> None:
        index = y * width + x
        if not seen[index] and background(x, y):
            seen[index] = 1
            queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)
    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        if x:
            add(x - 1, y)
        if x + 1 < width:
            add(x + 1, y)
        if y:
            add(x, y - 1)
        if y + 1 < height:
            add(x, y + 1)
    image.save(OUTPUT / path.name)


for source in sorted(SOURCE.glob("*.png")):
    cutout(source)
print(f"{len(list(OUTPUT.glob('*.png')))} transparent reference cutouts")
