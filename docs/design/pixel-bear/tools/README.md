# Sprite tools (optional)

Python 3 + Pillow + numpy. Used to generate the PNGs in `../sprites`.

- `pix.py <src.png> <out.png> <block>` — cuts a transparent AI-generated bear image onto a clean pixel grid.
- `build.py` — bear states (tired/neglected), outfits (scarf, glasses, grad cap, headphones), heads, 12×12 icons.
- `navicons.py` — bottom-nav pixel icons (ger, signpost, cart, backpack, flag) + grey "off" versions.
- `mapgen.py` — learning-path forest map, isometric stones/pedestals, props, map bear + blink frame.
- `mapgen_world.py` — adventure map: 3 units stacked upward (forest, steppe, snow), boss sprites, victory flag,
  and the node/trail positions the app reads (`mobile/src/lib/pixelBear/world.json`). Self-contained: runs as is.
- `boss_pumpkin.py` — first-unit boss: cuts `reference/boss_pumpkin_ref.png` onto its 25×45 pixel grid (drops the
  background and reflection) and draws the green magic orb `fx_magic.png`.

The battle bear (`bear_battle.png`) is not made here: `mobile/scripts/bear-sprites.ts` (TypeScript, Node 24) draws it
from `map_bear.png` and writes `mobile/src/lib/pixelBear/bear.json`; animated previews live in `../previews/`.

The scripts expect the original ChatGPT bear images and intermediate `raw_*.png` files in the working directory; they are kept for reference and future regeneration, not needed by the app.
