# KUMA — Pixel Bear UI (design handoff)

This document is the single source of truth for the new UI. It **replaces the previous dark-theme UI** entirely.
Everything needed is in this folder:

```
kuma-ui-handoff/
├─ DESIGN.md               ← this file (spec)
├─ CLAUDE_CODE_PROMPT.md   ← the prompt to run in Claude Code
├─ sprites/                ← 53 pixel-art PNGs (copy to /public/sprites)
├─ reference/              ← exact markup of every designed screen (01–10)
└─ tools/                  ← Python scripts that generated the sprites (optional)
```

`reference/*.html` are the real artboards from the design canvas. They use a small template syntax:
`{{name}}` = value returned by `renderVals()` in the `<script>` at the bottom of the file, `<sc-if value>` = conditional,
`<sc-for list as>` = loop. All positions, sizes, colors and copy in them are final — when this spec and a reference file
disagree, **the reference file wins**.

---

## 1. Concept

- Gamified learning app for **all ages** (no age bands, **no chat**). 5 subjects: Математик, Англи хэл, Байгалийн ухаан, Түүх, Computer Science.
- Charlie-app style **dress-up pet**: the user owns a **pixel brown bear**. Learning keeps the bear healthy; skipping makes it tired and sad.
- Coins from tasks/lessons buy **stage background colors** (MVP) and **outfits** (scarf, glasses, grad cap, headphones).
- Duolingo-style **learning path** drawn as a pixel forest with isometric stepping stones.
- Visual language: flat bold color blocks + big grotesk headlines (Onest) + crisp pixel art (bear, icons, numbers in Pixelify Sans).

## 2. Non-negotiable rules

1. **Pixel art must stay crisp.** Every sprite `<img>` gets `image-rendering: pixelated` (class `px`). Scale sprites by **integer factors only** (1×, 2×, 3×). Never `object-fit: cover` a sprite into a non-integer box, never blur, never add border-radius to a sprite.
2. Mobile first: design frame is **390 × 844**. On wider screens center a `max-width: 430px` column; the page background around it is `--paper`.
3. Fonts: **Onest** (UI text, 400–800) and **Pixelify Sans** (numbers: XP, coins, streak, counters; 500–700). Load both with the **cyrillic** subset (`next/font/google` if Next.js).
4. No emoji anywhere in the UI. Icons are either the pixel PNGs in `sprites/` or simple inline stroke SVGs (2.2px stroke) shown in the reference files.
5. All UI copy is Mongolian, exactly as written in the reference files.
6. Every animation is disabled under `prefers-reduced-motion: reduce`.
7. Real semantic elements: `<button>`, `<a>`, `<nav>`; icon-only controls get `aria-label`. Touch targets ≥ 44px.

## 3. Design tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `--violet` | `#7A5CF5` | primary brand, welcome bg, unit card, avatar bg |
| `--indigo` | `#22106E` | primary CTA bg, selected tab, reward screen bg, night |
| `--lemon` | `#F3F66C` | active/current, highlights, wordmark |
| `--lime` | `#D4F55E` | success, done, "continue" CTA |
| `--pink` | `#F2CDE0` | rewards, progress card |
| `--sky` | `#AEDDF3` | rest day, CS subject |
| `--lavender` | `#D9D2F2` | tired state |
| `--stone` | `#CBCAC1` | lesson top panel, neglected state, stat tiles alt `#DEDCD3` |
| `--paper` | `#EFEEE9` | app background |
| `--ink` | `#19152E` | text, outlines, hard shadows |
| `--muted` | `#5E5A6E` | secondary text (`#6E6A7C` for inactive icons) |
| `--white` | `#FFFFFF` | pills, cards |
| `--danger-text` | `#8A3A5C` | "coin хүрэхгүй" |
| `--ok-text` | `#2F7A4C` | "Таных / Сонгосон" |

Tailwind (if used) — extend `theme.colors` with the same names.

### Type scale (Onest unless noted)
- Display: 150px/0.95, weight 700, letter-spacing −6px (reward minutes "15")
- H1: 30–32px, weight 600, −0.8 to −1px
- H2: 24–26px, weight 600, −0.5px
- Card title: 16–17px, weight 600–700
- Body: 15px, weight 500
- Label (uppercase): 12–13px, weight 700, letter-spacing 0.06–0.1em
- Numbers: Pixelify Sans 700, 14–17px in pills, 22px in reward tiles

### Shape
- Radii: pills `999px`; cards `22–28px`; stage `32px`; bottom sheet/nav top corners `28–36px`.
- Hard "game" shadow (no blur): `0 4px 0 #19152E` on the path CTA card, `0 5–6px 0 #19152E` on round nodes, with a `2–3px solid #19152E` border.
- Soft shadows are not used.

### Background colors the user can buy (stage bg)
| Name | Hex | Price (coin) |
|---|---|---|
| Нимбэг | `#F3F66C` | owned (default, equipped) |
| Тал | `#A9D18E` | owned |
| Ягаан | `#F2CDE0` | 60 |
| Хөх тэнгэр | `#9FD0F2` | 60 |
| Лаванда | `#D9D2F2` | 90 |
| Говь | `#EBCF9B` | 90 |
| Улбар | `#F7A97E` | 120 |
| Шөнө | `#22106E` | 1 000 |

On `Шөнө` (dark) the halo becomes `rgba(122,92,245,0.45)` and decoration text/`Zz` turns white.

## 4. Sprites (`sprites/` → `/public/sprites/`)

Native size in pixels → display at the listed integer scale.

| File | Native | Scale | Use |
|---|---|---|---|
| `bear_idle_scarf.png` | 82×140 | 2× (164×280) / 1× | default bear (happy state). Top 14 rows are empty padding for hats |
| `bear_cheer_scarf.png` | 90×126 | 2× / 3× | thriving state, welcome, correct answer, reward |
| `bear_tired_scarf.png` | 82×140 | 2× | tired state, wrong answer |
| `bear_neglected_scarf.png` | 82×140 | 2× | neglected state |
| `bear_sleep.png` | 95×127 | 2× | rest day / streak freeze |
| `bear_idle.png`, `bear_cheer.png` | 82×140, 90×126 | 2× | bear without scarf |
| `outfit_scarf/glasses/gradcap/headphones.png` | 82×140 | 2× stage, 1× cards | bear wearing each outfit (full-body renders) |
| `outfit_full_demo.png` | 82×140 | 1× | scarf + glasses + cap (style board) |
| `head_happy/idle/tired/neglected/sleep.png` | ~70×60 | ~0.55–2× | avatar, calendar faces |
| `icon_coin/flame/star/heart.png` | 12×12 | 1.5–4× | coin, streak, XP, energy/lives |
| `icon_mystery_box.png` | 14×11 | 2–3.5× | mystery box |
| `nav_{home,path,shop,bag,crew}_{on,off}.png` | ~20×20 | 2× | bottom nav (on = color, off = grey) |
| `map_unit1.png` | 195×380 | 2× (390×760) | baked path map for unit 1 (forest, stones, pedestals) |
| `map_bear.png` + `map_bear_blink.png` | 34×61 | 2× | small bear on the map (+ blink frame) |
| `map_sapling/gift/qblock.png` | ~19×20 | 2× | props on pedestals |
| `map_cloud_a/b.png` | 32×11 / 24×11 | 2× | drifting clouds |
| `map_ring.png` | 44×22 | 2× | pulsing ring under the current node |
| `map_arrow.png` | 11×10 | 2× | "you are here" arrow |
| `map_butterfly_sheet.png` | 14×5 (2 frames 7×5) | 2× | butterfly flap sprite sheet |
| `tile_stone_done/lock.png`, `tile_pedestal_*.png`, `tree_pine_*.png` | — | 2× | loose pieces for building future maps dynamically |

## 5. The bear

### States (driven by `energy` 0–100 and streak)
| State key | Energy | Sprite | Chip text | Mood line (home) | Animation |
|---|---|---|---|---|---|
| `thriving` | 80–100 | `bear_cheer_scarf` | Гэрэлтэж байна | 7 хоног дараалан сурлаа. Баавгай чинь хөвж байна! | `float` + sparkles/coins twinkle |
| `happy` | 50–79 | `bear_idle_scarf` | Сэргэлэн | Өнөөдрийн 3 даалгавраас 1-ийг хийлээ. | `bob` + hearts |
| `tired` | 20–49 | `bear_tired_scarf` | Ядарсан | Өчигдөр алгассан. Нэг хичээл хийгээд сэргээе. | `breathe` + sweat drop + "zz" |
| `neglected` | 0–19 | `bear_neglected_scarf` | Сүнсгүй | Streak тасарлаа. 2 хичээл хийвэл баавгай сэргэнэ. | `sway` + pixel rain cloud + fly |
| `sleep` | rest day | `bear_sleep` | Амарч байна | Амралтын өдөр. Streak хамгаалагч ажиллаж байна. | `breathe` + moon + "Zz" |

Rules (MVP, adjust to the existing backend if it already has an equivalent):
- Completing a lesson: energy +15 (cap 100). Completing all daily tasks: +10.
- Each day without a lesson: energy −30. A rest day (1/week or "Streak хамгаалагч" item) skips the decay and shows `sleep`.
- 1 lesson lifts `tired` → `happy`; 2 lessons lift `neglected` → `tired`.
- 7+ day streak and energy ≥ 80 → `thriving` (higher rare-item drop chance on hard challenges).

### Stage
The bear always stands on a rounded "stage" card whose background is the **user-selected bg color** (section 3). The state is shown by the bear sprite, the chip, the energy pill and decorations — not by the bg.

## 6. Motion (copy these keyframes)

```css
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.975)}}           /* origin 50% 100% */
@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}           /* origin 50% 100% */
@keyframes twinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
@keyframes shadow{0%,100%{transform:scaleX(1);opacity:.22}50%{transform:scaleX(.72);opacity:.12}}
/* path screen */
@keyframes hop{0%,40%,100%{transform:translateY(0) scale(1,1)}46%{transform:translateY(2px) scale(1.06,.92)}56%{transform:translateY(-22px) scale(.95,1.06)}66%{transform:translateY(0) scale(1.07,.92)}72%{transform:translateY(0) scale(1,1)}}
@keyframes blink{0%,88%,94%,100%{opacity:0}89%,93%{opacity:1}}                        /* steps(1), 3.6s, on map_bear_blink */
@keyframes ring{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
@keyframes arrow{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}      /* steps(2) 1s */
@keyframes wiggle{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-8deg)}82%{transform:rotate(8deg)}88%{transform:rotate(-5deg)}94%{transform:rotate(3deg)}}
@keyframes flap{0%{background-position:0 0}100%{background-position:-28px 0}}           /* steps(2) .32s on butterfly sheet at 28x10 */
@keyframes driftA{0%{transform:translateX(-90px)}100%{transform:translateX(470px)}}     /* 38s linear */
@keyframes driftB{0%{transform:translateX(420px)}100%{transform:translateX(-80px)}}     /* 52s linear */
@media (prefers-reduced-motion: reduce){ /* set animation:none on all of the above */ }
```
Durations: float 2.6s, bob 1.6s, breathe 3s, sway 2.8s, hop 2.8s, ring 1.6s, wiggle 3s, sapling sway 2.4s (±4deg), mystery block bob 1.6s `steps(4)` (−8px).
Stage bg color change: `transition: background-color .35s`.

## 7. Shared components

- **StatPill** — white pill, height 40–44, padding `0 12px 0 10px`, pixel icon 20–22px + Pixelify number. Variants: XP (star + `920/1000` + 4px progress bar violet on `#E6E3F5`), Streak (flame), Coin.
- **Avatar** — 44–48px violet circle (2px white border on the map), `head_idle.png` anchored to the bottom.
- **BottomNav** — fixed bottom, height 86, white, top radius 28, `border-top: 2px solid #E6E4DD`, 5 equal columns, **icon-only** (Charlie style):
  `Нүүр` (ger) · `Сурах зам` (signpost) · `Дэлгүүр` (cart) · `Цүнх` (backpack) · `Баг` (flag).
  Active = `_on` sprite + 6px ink dot below; inactive = `_off` sprite. Each link has `aria-label` and the active one `aria-current="page"`. Sizes: home 40×36, shop 44×38, others 40×40.
- **BearStage** — 350×330 (home) / 350×290 (shop), radius 32, user bg color, white translucent 240px halo circle, ground shadow ellipse, bear centered with feet ~30px above the bottom, state chip (top-left) + energy pill (top-right, heart icon + 52px bar + %).
- **TaskCard** — 3-column grid, 150px tall, radius 24, colored bg (lime done / pink / violet hard), label, title, reward pill (coin + `+30`) or ink check circle when done. Hard tasks show the mystery-box icon ("item унах боломжтой").
- **Primary button** — 60px pill, indigo bg, white 18px/600 text. **Continue (lesson)** — lime bg, ink text, uppercase letter-spaced. **Path CTA** — lemon pill with ink border and play triangle.
- **Segmented tabs** — white 46px pill container, 2 tabs, selected = indigo bg/white text.
- **BgSwatch** — 4-column grid; 64px color block radius 18, 3px ink ring when selected, check badge when equipped, name + status (`Таных` / coin price / `1 000 · хүрэхгүй` at 55% opacity).
- **OutfitCard** — 2-column grid, 120px, top 62px tile shows the outfit sprite at 1× cropped to the head/neck, name + status; selected ring violet 3px.
- **CalendarFace** — 7-column grid, 44px cells radius 14, bg by state, bear head sprite 34px tall at the bottom; future days dashed `2px #D8D6CE` with the day number; today has a 2px ink ring.

## 8. Screens

Routes are suggestions — **map them onto the existing app routes**.

| # | Screen | Suggested route | Reference |
|---|---|---|---|
| 01 | Welcome | `/welcome` | `reference/01-welcome.html` |
| 02 | Subject pick (onboarding) | `/onboarding/subject` | `02-onboarding-subject.html` |
| 03 | Home (bear stage + daily tasks) | `/` | `03-home.html` |
| 04 | Learning path (pixel map) | `/path` | `04-path.html` |
| 05 | Lesson question | `/lesson/[id]` | `05-lesson.html` |
| 06 | Lesson complete / reward | `/lesson/[id]/complete` | `06-lesson-complete.html` |
| 07 | Shop (bg colors + outfits) | `/shop` | `07-shop.html` |
| 08 | Study calendar | `/calendar` | `08-calendar.html` |
| — | Bag (owned items) | `/bag` | not designed: reuse Shop layout showing owned items only, with "Сонгох" |
| — | Crew | `/crew` | not designed: keep existing logic, restyle with tokens/components |
| 09/10 | States board, Style board | — | documentation only, do not ship |

### 01 Welcome
Violet bg with two lighter circles; `KUMA` wordmark (Pixelify 700, 66px, lemon); tagline 27px white; lime + lemon zigzags; twinkling heart/star/coin; `bear_cheer_scarf` at 3× floating; bottom paper sheet (radius 36 top) with indigo "Эхлэх" button and "Надад бүртгэл байгаа" link.

### 02 Subject pick
Back button, 3-segment progress (2 done violet), bear head + speech bubble "Юуг эхэлж сурах вэ? Дараа нь хүссэн үедээ солино.", 5 subject cards (Math lemon w/ "САНАЛ БОЛГОХ" + 3px ink outline when selected, English violet, Science lime, History pink, CS sky), each with a huge faint glyph (½, Aa, H₂O, 1206, </>), indigo "Үргэлжлүүлэх".

### 03 Home
Top row: avatar (→ calendar), XP pill, spacer, streak, coins. Greeting "Сайн уу, {name}" + mood line. BearStage (state + bg). "Өнөөдрийн даалгавар" + "1 / 3 · Бүгд" (→ path). 3 TaskCards. BottomNav (Нүүр active).

### 04 Learning path — pixel forest map
Layers inside the 390-wide column (all positions in display px, map image at 2×):
1. `map_unit1.png` at (0,0) 390×760 — forest, mountains, 16 nodes are baked in.
2. Clouds: `map_cloud_a` top 150 (`driftA`), `map_cloud_b` top 300 (`driftB`).
3. Nodes (center of the top face) — use these for click targets (stones 48×34 at `x-24,y-14`; pedestals 72×54 at `x-36,y-20`):

| i | kind | x | y | i | kind | x | y |
|---|---|---|---|---|---|---|---|
| 0 | done | 140 | 684 | 8 | lock | 220 | 420 |
| 1 | done | 180 | 656 | 9 | pedestal gift | 272 | 382 |
| 2 | done | 220 | 628 | 10 | lock | 220 | 344 |
| 3 | pedestal sapling (unit milestone) | 272 | 590 | 11 | lock | 180 | 316 |
| 4 | done | 220 | 552 | 12 | pedestal mystery (hard) | 128 | 278 |
| 5 | done | 180 | 524 | 13 | lock | 180 | 240 |
| 6 | **pedestal current** | 128 | 486 | 14 | lock | 220 | 212 |
| 7 | lock | 180 | 448 | 15 | pedestal end (next unit) | 272 | 174 |

   Zigzag rule if you build maps dynamically: stone→stone step `(±40, −28)`, any step touching a pedestal `(±52, −38)`, direction flips after every pedestal; runs are `3 stones + pedestal`, then `2 stones + pedestal` repeating.
4. Props: `map_qblock` at (110,240) bob + star twinkle at (150,230) + dark tooltip at (8,236) "Хэцүү сорил / Ховор item!" (second line lemon); `map_gift` at (254,348) wiggle + "+50" coin pill at (302,362); `map_sapling` at (256,550) sway + ink pill "Нахиа ургалаа" (lime text) at (298,562); "2-р бүлэг" white pill at (312,170).
5. Current node: `map_ring` at (84,464) 88×44 pulsing; `map_arrow` at (117,336) bobbing; bear wrapper at (94,368) 68×122 with `hop`, containing `map_bear` and `map_bear_blink` (blink overlay).
6. Butterflies: two 14×10 divs with the sprite sheet (`flap`) moving on small loops near (34,600) and (330,440).
7. Header over the map: row 1 at top 50 (avatar, XP `920/1000`, streak, coins); row 2 at top 104 ("Математик ▾" subject dropdown, lime "ТҮВШИН 3" badge).
8. Bottom CTA card at top 672, height 72: "1-р бүлэг · Бутархай тоо · 3/6" / "Бутархай нэмэх" + lemon "Эхлэх" (→ lesson). Card has 2px ink border and `0 4px 0` hard shadow.
9. BottomNav (Сурах зам active).

### 05 Lesson
Top 446px stone-grey panel (bottom radius 36): close (→ path), hearts pill (lives), speech bubble, bear 2× (`outfit_glasses` while thinking), progress bar (white track, lime fill, `7/10`). Below: label, question (36px), hint, 2×2 answer buttons (60px, radius 20). **Reaction:** correct → lime answer + `bear_cheer_scarf` + bubble "Зөв! +10 XP" + CTA lime "ҮРГЭЛЖЛҮҮЛЭХ"; wrong → pink answer + `bear_tired_scarf` + hint bubble; default CTA indigo "ШАЛГАХ".

### 06 Lesson complete
Indigo bg, giant minutes number + "минут сурлаа", bubble "Өнөөдрийн зорилго биеллээ!", floating cheer bear with rising hearts/coins, 3 reward tiles (+30 Coin, +120 XP, 12 өдөр дараалан), lemon "Mystery box унасан!" card with shaking box + "Нээх", lime "ҮРГЭЛЖЛҮҮЛЭХ".

### 07 Shop (Дэлгүүр)
Title + subtitle + coin pill; preview stage (selected bg + equipped/selected outfit, name chip, action button: `Авах · 60` indigo / `Сонгох` / `Сонгосон` white with green text / `Coin хүрэхгүй` disabled grey); Segmented tabs **Дэвсгэр | Хувцас** (Дэвсгэр is the MVP and default); bg swatch grid or outfit grid. Buying deducts coins and equips.

### 08 Calendar
Close, title "Хичээлийн хуанли", next-month button; month + year (Pixelify); weekday row Да Мя Лх Пү Ба Бя Ня (week starts Monday); face grid (happy lemon, idle lime, tired lavender, neglected stone, rest sky); pink "Сарын явц / {n} өдөр сурлаа / {r} амралт · {m} алгассан" card with `head_happy` at 2× peeking; 3 stone stat tiles (Идэвх минут, Тогтвортой %, Энерги %); legend.

## 9. Data shapes (adapt to existing models; mock only what is missing)

```ts
type BearState = 'thriving' | 'happy' | 'tired' | 'neglected' | 'sleep';
interface BearProfile { energy: number; streak: number; state: BearState; bgId: string; outfitId: string | null; }
interface ShopBg { id: string; name: string; hex: string; price: number; owned: boolean; }
interface Outfit { id: 'scarf' | 'glasses' | 'gradcap' | 'headphones'; name: string; sprite: string; price: number; owned: boolean; }
interface DailyTask { id: string; subject: string; title: string; reward: number; done: boolean; hard?: boolean; }
interface PathNode { id: string; kind: 'done' | 'lock' | 'current' | 'gift' | 'mystery' | 'milestone' | 'end'; lessonId?: string; reward?: number; }
interface CalendarDay { date: string; state: BearState | 'missed' | null; }
```

## 10. Acceptance checklist

- [ ] Old dark UI removed/replaced on every screen listed above; no leftover old components imported.
- [ ] Sprites render crisp at 2× (check on a retina screen); no stretched or blurred pixel art.
- [ ] Onest + Pixelify Sans load with Cyrillic; Mongolian text renders without fallback fonts.
- [ ] Bottom nav uses the pixel icons, icon-only, with aria-labels and the active dot.
- [ ] Home bear state switches correctly for all 5 states; stage uses the user's bg color.
- [ ] Shop: selecting a bg previews it; buying deducts coins; locked items cannot be bought.
- [ ] Path map: current node animates (ring, arrow, hop, blink); nodes are clickable; CTA opens the lesson.
- [ ] Lesson answer reaction (correct/wrong) swaps the bear and the CTA.
- [ ] `prefers-reduced-motion` stops all animation.
- [ ] Lint, type-check and build pass.
