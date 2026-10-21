# Sprite tools (optional)

Python 3 + Pillow + numpy. Used to generate the PNGs in `../sprites`.

- `pix.py <src.png> <out.png> <block>` — cuts a transparent AI-generated bear image onto a clean pixel grid.
- `build.py` — bear states (tired/neglected), outfits (scarf, glasses, grad cap, headphones), heads, 12×12 icons.
- `navicons.py` — bottom-nav pixel icons (ger, signpost, cart, backpack, flag) + grey "off" versions.
- `mapgen.py` — learning-path forest map, isometric stones/pedestals, props, map bear + blink frame.
- `mapgen_world.py` — adventure map: 3 units stacked upward (forest, steppe, snow), boss sprites, victory flag,
  and the node/trail positions the app reads (`mobile/src/lib/pixelBear/world.json`). Self-contained: runs as is.
- `bear_moves.py` — battle bear frames from `map_bear.png`: shaded pixel arms/legs drawn by a tiny z-buffer rig
  (throw, claw, hurt) and an 8-frame two-legged run plus a front-facing turn frame. `--preview <dir>` writes 8× sheets.
- `boss_pumpkin.py` — first-unit boss: cuts `reference/boss_pumpkin_ref.png` onto its 25×45 pixel grid (drops the
  background and reflection) and draws the green magic orb `fx_magic.png`.

The scripts expect the original ChatGPT bear images and intermediate `raw_*.png` files in the working directory; they are kept for reference and future regeneration, not needed by the app.
