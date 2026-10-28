# KUMA — Instagram campaign

Thirteen 1080 × 1350 (4:5) posters for KUMA, plus a contact sheet and captions: 10 for the whole app and a 3-poster series (11–13) on talking with the bear. Every poster is a plain HTML page. The pages use the app's own colours, fonts, pixel sprites and real screenshots, and Playwright renders them to PNG.

```
posters/                 final PNGs (sRGB, 1080×1350, no alpha)
campaign-preview.png     contact sheet of all 13 (2400×2250)
captions/captions.md     caption, hashtags, alt text and goal for each poster
source/brand.css         shared brand primitives: tokens, type, chips, phone frame, snips
source/kit.js            builds phone frames and screenshot crops from data attributes
source/posters/*.html    one page per poster (edit these)
source/contact-sheet.html
assets/screens/          real app screenshots (390×844 pt at 3x), captured from a local build
assets/sprites/          pixel sprites copied from mobile/assets/sprites (@3x)
assets/fonts/            Onest, Pixelify Sans (SIL OFL, licences included)
scripts/render.mjs       renderer
scripts/capture-tutor.mjs  captures the live tutor screens (local only)
```

## Render

```bash
npm install
npm run render            # all posters + campaign-preview.png
npm run render -- 04 07   # only posters 04 and 07 (the preview is rebuilt too)
npm run preview           # only the contact sheet
```

Each page renders at 2x and is downscaled to 1080×1350 with Lanczos, so text and UI edges stay clean. To work on a poster live, open its HTML file in Chrome at a 1080×1350 viewport.

## Edit

- **Copy:** the text is plain HTML in `source/posters/NN-*.html`. Headlines use `.headline` or `.display` (Onest 800), small labels use `.eyebrow`, and the logo and numerals use `.pixel` or `.wordmark` (Pixelify Sans).
- **Colours:** use the `:root` tokens in `brand.css`. They match `mobile/src/constants/theme.ts`; `--night` and `--abyss` are campaign-only darker steps of the indigo.
- **Phone with a real screen:**
  ```html
  <div class="phone" data-src="path.png" data-sb="#2b1457" data-dark style="--pw:380px; left:…; top:…"></div>
  ```
  - `data-src` is a file in `assets/screens/`.
  - `data-sb` is the status-bar colour (the top colour of the screen).
  - `data-dark` turns the status-bar text white.
- **Crop of a real screen:**
  ```html
  <div class="snip" data-src="lesson-correct.png" data-crop="x y w h" style="width:…"></div>
  ```
  - The crop box is in the screenshot's 390×844 point space.
  - The height follows from the width, so the crop is never stretched.
- **Sprite-sheet frame:** use `<div class="frame" data-src="../../assets/sprites/…" style="--cols;--rows;--c;--r">`.
- **Pixel sprites:** keep `image-rendering: pixelated` (the `.sprite` class does this) so upscaled pixels stay sharp.
- **Safe area:** keep important content inside the 72 px margin (`--margin`). The KUMA logo at the top left and the URL sign-off at the bottom are the campaign frame; keep them on every poster.

## Profile picture

`profile/kuma-profile-bear.png` (recommended) and `profile/kuma-profile-wordmark.png` are 1080×1080. Instagram crops them to a circle and shows them as small as 110 px, so all key content stays inside the inscribed circle. The bear face reads best at small sizes. Sources are in `source/profile/`. To render:

```bash
node scripts/render.mjs --file source/profile/bear.html --out profile/kuma-profile-bear.png --w 1080 --h 1080
```

## Re-capture screenshots

The screens come from the local app (see `marketing-video/scripts/capture.mjs`). Copy fresh ones into `assets/screens/` with the same file names and re-render. Two things to know:

- `onboarding-grade.png` was taken before grades 11–12 opened and lists grades 6–10. Poster 07 crops it to grades 6–8 only. Re-capture it before showing the full list.
- The map screenshots use the Halloween chapter skin. Re-capture them if the season changes.

## Tutor screens (posters 11–13)

`tutor-*.png` come from a real Gemini Live session on the local app, recorded by `scripts/capture-tutor.mjs`. To run it again:

1. Start the local API with a free-tier `GEMINI_API_KEY` and `TUTOR_SPEECH=live`. Do not use `.env.local` as it is: its `TUTOR_SPEECH=tts` uses the billing TTS key.
2. Start the web app on :8081.
3. Run `KUMA_TOKEN=… KUMA_USER_ID=… node scripts/capture-tutor.mjs <questionId>`.

The kid's spoken question was a generated voice clip fed to Chromium's fake microphone (`KUMA_MIC_FILE`). The bear's replies, the chalk text and every UI state are the app's real output. Poster 11 quotes the question that was spoken; the speech recogniser's own transcript of it was less clean, so no poster shows that line.

## Poster goals

| # | Poster | Goal | Main visual |
|---|---|---|---|
| 01 | Танилц | Product reveal | KUMA wordmark, map on a phone, bear |
| 02 | Асуудал | Name the pain: endless, boring drills | Fading repeated headline, unchecked exercise list, sleeping bear |
| 03 | Шийдэл | One benefit: 5-question tasks with explanations | Giant 5, lesson screen, explanation card |
| 04 | Сурах зам | Main feature: chapter map with stages and a boss | Full-bleed real map, lesson popup, stage cards |
| 05 | Тулаан | 1v1 with friends by code | Diagonal split, two duel screens, pixel VS |
| 06 | Баавгай найз | Rewards: dress up the bear | Bear with real outfit items, shop cards |
| 07 | Хэрхэн | 3 steps from start to reward | Three cards with real UI crops |
| 08 | Өдөр тутам | Fits a school day; daily streak | Day-to-night gradient, timeline, home screen |
| 09 | Яагаад KUMA | Built on the textbook chapters for grades 6–12 | Grade staircase 6→12, real chapter header |
| 10 | Эхэл | Conversion | Wordmark, bear, two phones, URL button |
| 11 | Баавгайгаас асуу | Voice tutor: ask the bear about a missed problem | Chalk-green, voice bars, kid's question, live tutor screen |
| 12 | Самбар дээр | The bear's words are written on the board | Real chalkboard crop from a live session |
| 13 | Ээлжлэн ярина | How a talk goes: prepare, explain, your turn | Three real tutor screens |

## Copy sources

Every claim maps to the app:

| Claim | Source |
|---|---|
| 6–12-р ангийн математик | `GAME.GRADE_MAX = 12` (api/src/config/game.ts), grade picker 6–12, problems for math 6–12 in production |
| Сурах бичгийн бүлэг, сэдэв | the map reads lessons from the textbook table of contents (BOOKS database) |
| Суурь, Дунд, Ахисан шат; бүлгийн төгсгөлд boss | path stages and chapter boss (`onboarding.chapterWon`) |
| 5 асуулттай богино даалгавар | `questionsPerTask: 5`; onboarding benefits copy |
| Хариулт бүрийн дараа тайлбар | lesson feedback card (`lesson-correct.png`) |
| Найзтайгаа 1v1, 6 оронтой код | duel lobby (`duel-code.png`, `duel-create.png`) |
| Хувцас, дэвсгэр; item names | shop and `mobile/src/lib/pixelBear/catalog.ts` |
| Өдөр алгасахгүй бол баавгай чинь өсөж… | onboarding benefits copy (`mobile/src/i18n/strings.ts`) |
| Офлайн дасгал | offline mode and offline practice pack |
| Баавгайтай дуугаар ярилцах, «Баавгайгаас асуух» | `mobile/src/app/tutor.tsx`, `useBearTalk`; the button shows after a wrong answer when online |
| Самбар дээр бичнэ | the tutor writes the bear's speech on the board as chalk (`tutor.tsx`) |
| Ээлжлэн ярина, «Би ярья» | mic turns on when the bear finishes; the "Би ярья" button interrupts |
| surgalt.pinequest-team1.workers.dev | production web build |

The campaign does not use invented numbers, prices, reviews or awards. Do not add claims such as "free" or "in the App Store" unless they become true.
