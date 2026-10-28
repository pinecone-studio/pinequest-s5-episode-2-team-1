# KUMA witch motion pilot

This PR contains only the witch costume study. The supplied source image is preserved byte for byte in `references/witch.png`. PixelLab generated the transparent raw frames in `pixellab/pilot/witch/`. The brown, black, and white fur variants were checked side by side; clothing colours remain purple and gold.

The seven home states are `thriving`, `happy`, `tired`, `neglected`, `sleep`, `ouch`, and `welcome`. Six states have five frames; `welcome` has eight frames and ends with a hug. `sheets/` contains the sprite sheets, and `previews/` contains looping APNGs. `review.html` is a browser page that compares all three fur colours for each state. `review-local.png` is a local screenshot.

To rebuild the sheets and previews from the raw frames:

```bash
cd mobile
node scripts/witch-pilot.ts
```

To view the motion page locally from the repository root:

```bash
python3 -m http.server 8090 --directory docs/design/pixel-bear/costumes/pixellab/pilot/witch
```

Open `http://localhost:8090/review.html`.

This is a review pilot, not an equipable shop item. The hat brim touches the canvas edge in some frames. Battle, lesson, and tutor poses are not fitted, so the costume is not ready for purchase or gameplay.
