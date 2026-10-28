# KUMA costume source pack

The 19 supplied PNGs are preserved byte for byte in `references/`: 16 dressed bears and three
parts sheets (`undead-parts`, `cyber-parts`, `deel-parts`). The same designs were
run through PixelLab `unzoom_image` and saved in `pixellab/native/`. PixelLab's
unzoom result has an opaque white canvas, so `make-cutouts.py` removes only
white pixels connected to the outer edge and writes `pixellab/cutouts/`.
`pixellab/cutout-contact.png` is a review sheet, not a game sprite sheet.
`manifest.json` records each original filename, PixelLab job, and detected size.

Run `python3 docs/design/pixel-bear/costumes/make-cutouts.py` after replacing
native images. Keep the supplied references unchanged. The detected native
pixel grids vary from 111×169 to 386×257; do not stretch these cutouts over the
game's 82×140 bear. They are faithful design references for fitting clothes to
the existing character.

## PixelLab trial pilot

- Witch idle, 84×140: job `7e62021c-f6ac-4991-bb12-960a20c211c4`.
- Witch home motions: `thriving` `e7b1d1f1-f216-4ade-a0da-83bbc99321da`,
  `happy` `2bbcccf8-36c9-41a6-b4c4-69e2e9644faa`,
  `tired` `6154966b-e982-4a0a-967c-5f9712c2244c`,
  `neglected` `f9b52f40-db77-4a29-a41f-ac3ad5195e4c`,
  `ouch` `9eb1dcc9-9480-4b0a-98e8-4312978a0e17`,
  `welcome` opens the arms in job `2c86f64a-f985-40de-810d-cf55c76f03cf`;
  the hug target is job `c0be5924-959c-4943-ac5a-edb605eeee30` and the
  four-frame hug continuation is job `f4c2424c-1d30-4ea6-bd1d-ec6fd2ae9889`.
- `sleep` starts from the existing seated bear, edited as a witch in job
  `21334ce6-8c90-47cc-a8c8-67d26a145fe4`, then animated in job
  `b26abdb3-d03d-4121-8f70-4ba82a4982c3`.
- `mobile/scripts/witch-pilot.ts` generates 21 sheets and APNG previews from
  seven motions and three fur colours. Six motions have five frames; `welcome`
  has eight and ends in a hug. The source frame PNGs remain in
  `pixellab/pilot/witch/`; `qa-poses.png` shows their active poses side by side.
  Every frame has transparent background and was visually reviewed. Run
  `cd mobile && node scripts/witch-pilot.ts` to rebuild them.
- `mobile/scripts/costume-fur.ts` preserves the witch's purple and gold while
  changing exposed fur for black and white bears. This mask was visually
  reviewed on the seven generated motions. Other outfits need separate masks.
- The 84×140 animation canvas touches the hat brim on a few frame edges.
  These are pilots and are not registered as purchasable outfits. A wider idle
  study and its three fur variants are also in the pilot folder.
- The PixelLab mummy edit changed the bear's face and was rejected. The
  supplied mummy design and its transparent cutout remain intact.
- An `animate_image` attempt with a pinned last frame (job
  `07c32e63-8abf-4665-8f6d-858cbbce2493`) completed without returning an
  image; the successful welcome continuation above uses an unpinned input.

The current PixelLab subscription is trial; `transfer_outfit`, which preserves
an existing animation's poses, requires Tier 1. The KUMA app has seven home
animations plus 57 battle, 33 lesson, and 49 tutor frames. Finish and inspect
all contexts and three fur colours before adding an outfit to the shop catalog
and server cosmetics. Otherwise it would disappear during play.

## Local shop review

The shop's `Загварууд` category shows all 16 full costume cutouts as selectable
previews. App copies live in `mobile/assets/costume-gallery/`; the three parts
sheets stay in the source pack. The category is preview-only until the costumes
fit every game animation. `shop-local-review.png` records the local web review.

## Witch motion review page

`pixellab/pilot/witch/review.html` compares all three fur colours for each state;
`review-local.png` is a local screenshot. To view it from the repository root:

```bash
python3 -m http.server 8090 --directory docs/design/pixel-bear/costumes/pixellab/pilot/witch
```

Open `http://localhost:8090/review.html`.
