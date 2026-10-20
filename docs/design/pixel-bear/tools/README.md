# Sprite tools (optional)

Python 3 + Pillow + numpy. Used to generate the PNGs in `../sprites`.

- `pix.py <src.png> <out.png> <block>` — cuts a transparent AI-generated bear image onto a clean pixel grid.
- `build.py` — bear states (tired/neglected), outfits (scarf, glasses, grad cap, headphones), heads, 12×12 icons.
- `navicons.py` — bottom-nav pixel icons (ger, signpost, cart, backpack, flag) + grey "off" versions.
- `mapgen.py` — learning-path forest map, isometric stones/pedestals, props, map bear + blink frame.

The scripts expect the original ChatGPT bear images and intermediate `raw_*.png` files in the working directory; they are kept for reference and future regeneration, not needed by the app.
