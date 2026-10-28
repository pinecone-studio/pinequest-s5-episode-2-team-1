# KUMA — product promo video (Remotion)

A 30-second product video for KUMA, built with Remotion, React and TypeScript.
It has two compositions that share the same scenes:

| Composition    | Size      | Output                             |
| -------------- | --------- | ---------------------------------- |
| `KumaVertical` | 1080×1920 | `out/kuma-promo-1080x1920.mp4`     |
| `KumaWide`     | 1920×1080 | `out/kuma-promo-1920x1080.mp4`     |

Both run at 30 fps for 900 frames (30 s). Preview stills are in `out/stills/`.

This folder is separate from the app. It does not import anything from `mobile/` or `api/`.

## Storyboard

| Time    | Scene (`src/scenes/`)       | What happens |
| ------- | --------------------------- | ------------ |
| 0–3 s   | `Hook.tsx`                  | "Хичээлээ давтах уйтгартай юу?" A line strikes through "уйтгартай", then "Тоглоом болгоё." |
| 3–7 s   | `Reveal.tsx`                | The KUMA wordmark drops in, with the app's own welcome tagline. The real home screen rises in 3D. |
| 7–11 s  | `Features.tsx` → `MapFeature`  | 01 Сурах зам: map, then tap a node, then the lesson popup, then a real textbook problem answered correctly. |
| 11–15 s | `Features.tsx` → `BearFeature` | 02 Баавгай найз: the bear on home, then the shop, then the outfits tab. Pixel items float around the phone. |
| 15–19 s | `Features.tsx` → `DuelFeature` | 03 Тулаан: a live 1v1 duel question, a correct tap that wins the round, then the result. |
| 19–24 s | `Value.tsx`                 | "Сурах бичиг дээрх сэдвүүд. Тоглоом шиг." Four fact chips, plus the real grade picker. |
| 24–30 s | `Cta.tsx`                   | The cheering bear, the wordmark, "KUMA-г туршаад үз" and the web address. |

## Preview and render

```bash
npm install
```

```bash
npm run studio
```

`npm run studio` opens Remotion Studio, where you can scrub the timeline and switch between the two compositions.

To render the videos:

```bash
npm run render
```

```bash
npm run render:wide
```

To render one PNG for each beat into `out/stills/`, for both compositions:

```bash
npm run stills
```

You can also pick the composition and frames yourself:

```bash
node scripts/stills.mjs KumaVertical 24,150,650
```

## Editing

### Text

All copy is in `src/config.ts` → `COPY`, in Mongolian. Headlines are arrays, with one entry per line. The
kinetic animation splits each line into words, so you only need to edit the strings.

### Timing

- **Scene lengths:** `src/config.ts` → `SCENES`, in frames at 30 fps. The total length is the sum of all scenes.
  Both compositions read it automatically.
- **Transitions:** `TRANSITION` sets the overlap length in frames. The transition type for each cut is set in
  `src/Video.tsx` → `presentations`.
- **Animation inside a scene:** delays are local frame numbers, counted from the start of that scene's sequence.
  Each scene after the first starts `TRANSITION / 2` frames before its cut.

### Screens and taps in a feature

In `src/scenes/Features.tsx`, each feature lists:

- `screens`: `{ src, at, mode }`.
  - `src` is a file in `public/screens/`, without the extension.
  - `at` is the frame where that screen becomes current.
  - `mode` is either `'push'` (navigation slide) or `'fade'` (in-place change).
- `taps`: `{ at, x, y }`. The touch indicator glides to each point and presses at frame `at`.
  `x` and `y` use the app's 390×844 CSS-pixel space, the same space as the screenshots. You can read them off a
  screenshot by dividing its pixel position by 3.

Set the tap frame about 3 frames before the screen it causes. That way, the press lands just before the UI reacts.

### Voice-over

The narration is in `src/config.ts` → `VOICE`, with one Mongolian line per beat. Write each line the way it should
be spoken: spell numbers out as words, and write "Кума" for KUMA. `at` is the number of frames after the scene's cut
where the line starts.

To regenerate the audio:

```bash
node scripts/voice.mjs
```

- The script sends **one** TTS request for all lines. It uses the model and voice set in `VOICE_STYLE`.
- It reads the free-tier `GEMINI_API_KEY` from the environment, `api/.dev.vars` or the root `.env.local`. It never
  uses the billing key `GEMINI_TTS_API_KEY`.
- The free tier allows about 10 TTS requests a day.
- It saves `public/voice/full.wav`, splits it at the pauses into `public/voice/line-N.wav`, and writes
  `src/voice-manifest.json`. `src/Video.tsx` places each clip from that manifest.
- It warns when a clip runs into the next line.

If you only change an `at` value, re-split the existing audio without a new request:

```bash
node scripts/voice.mjs --resplit
```

### Look

- **Colours and fonts:** `src/theme.ts` holds the same tokens as `mobile/src/constants/theme.ts`. The fonts are
  Onest for the UI and Pixelify Sans for the wordmark and numbers.
- **Springs:** `src/components/motion.ts` has three presets: `POP` for text and chips, `GLIDE` for camera moves
  and swaps, and `FLOAT` for the phone entering. All animation uses Remotion's `spring()` and `interpolate()`.
  There are no CSS transitions.
- **Reusable pieces:** `src/components/`.
  - `Phone` renders a screenshot inside a device, with screen transitions and the touch indicator.
  - `KineticLine` renders masked word-by-word text.
  - `Backdrop` draws the brand colour, glow, drifting pixel squares and grain.
  - `Sprite` draws crisp pixel art.

## Re-capturing the screenshots

`public/screens/*.png` are real screenshots of the app. They were taken from the local dev build (web on
`:8081`, API on `:8787`) using a **local test account**. They were captured at 390×844 with a device scale of 3,
which gives 1170×2532 images. The duel screens come from a real local duel against `npm run bot` in `api/`.

1. Start the `api` and `web` configs from `.claude/launch.json`.
2. Register a test account against the **local** API (`POST http://localhost:8787/auth/register`).
3. Run the capture:

   ```bash
   npx playwright install chromium
   ```

   ```bash
   KUMA_TOKEN=<local token> KUMA_USER_ID=<local id> npm run capture
   ```

`ONLY=lesson,duel` limits the run to some groups: `welcome`, `lesson`, `home`, `onboarding` or `duel`. The duel
group needs a second local account for the bot (`KUMA_BOT_USER`, which uses the bot's default password). The
script reads correct answers from the local D1 file, so lesson and duel screens show the real "correct" state.

The script refuses to run against anything except localhost. Never capture against production.

## Assets and licences

- **Screenshots:** the KUMA app itself, captured locally.
- **Pixel sprites** (`public/sprites/`): copied from `mobile/assets/sprites/`. These are the team's own art.
- **Fonts** (`public/fonts/`): Onest and Pixelify Sans, both under the SIL Open Font License. The licence texts are
  included. The files are copied from the app's `@expo-google-fonts` packages.
- **Voice-over:** generated with Gemini TTS (`gemini-3.8-flash-lite-tts`, voice `Achird`, the same voice as the in-app
  tutor bear). See "Voice-over" above.
- **Music:** none is bundled. To add a track you hold a licence for, put it in `public/` and add
  `<Audio src={staticFile('…')} />` inside `KumaVideo` in `src/Video.tsx`.

## Copy sources

Every claim on screen maps to the app's code or docs:

| Copy | Source |
| ---- | ------ |
| "Өдөр бүр шинийг сурч, баавгайтайгаа хамт өсөөрэй." | `mobile/src/i18n/strings.ts` → `welcome.tagline` |
| 6–12-р ангийн математик | `api/seed/lesson-questions.json` on `origin/main` has math problems for grades 6–12, and the Cloudflare textbook library has math 6–12. The app still allows only grades 6–10 (`GAME.GRADE_MAX`), and the team plans to open 11–12 soon. Check that this has happened before you publish. Other subjects are left out until their content is finished. |
| Суурь, Дунд, Ахисан шаттай | the lesson stages on the adventure map |
| 5 асуулттай богино даалгавар | `questionsPerTask: 5`, and the onboarding benefits copy |
| Оноо → хувцас, дэвсгэр | the shop (`/cosmetics`, `/shop`) |
| Найзтайгаа 1v1 өрсөлд, ангийнхантайгаа уралд | the duel lobby and `DuelRoom` (same grade only) |
| Boss тулаан, офлайн дасгал | boss gates on the map; the offline practice pack |
| surgalt.pinequest-team1.workers.dev | the production web build |
