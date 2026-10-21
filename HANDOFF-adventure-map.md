# Handoff: адал явдлын газрын зураг ба boss тулаан

Дараагийн session-д энэ ажлыг үргэлжлүүлэхэд хэрэгтэй бүх мэдээлэл (2026-10-21).

## Одоогийн төлөв

| | |
|---|---|
| Branch | `feat/adventure-map` (origin-той ижил, `main` дээр rebase хийсэн) |
| PR | [#4](https://github.com/pinecone-studio/pinequest-s5-episode-2-team-1/pull/4): «feat(mobile): адал явдлын газрын зураг ба boss тулаан» |
| Label | `enhancement`, `documentation` |
| Reviewer | `Shinebayr11` (review хүссэн, хариу хүлээж байна) |
| Commit | 11 жижиг commit, тус бүр ≤24 файл, тус бүр `tsc --noEmit` давна |
| CI | repo-д CI алга; merge-д 1 approve хэрэгтэй |
| Нөөц | хуучин 13 commit-ын түүх локал `backup/adventure-map-2026-10-21` branch-д (push хийгээгүй) |
| Commit хийгээгүй | зөвхөн энэ файл |

## Хэрэглэгчийн шаардлага (заавал мөрдөх)

- **Commit/push/PR зөвхөн хэрэглэгчийн нэрээр:** `mbulganbat <m.bulganbat@gmail.com>`. `Co-Authored-By: Claude`, «Generated with Claude» гэх мэт мөр хэзээ ч бичихгүй.
- **Commit жижиг, тус тусдаа:** нэг commit-д ихдээ 20–40 файл. Push-ийг commit бүрээр нь хийнэ.
- **PR-д label тавина:** repo-д байгаа: `enhancement`, `documentation`, `bug` гэх мэт.
- **Баавгай = «манай баавгай»:** жинхэнэ sprite (`map_bear.png`)-аас гаргана, гараар шинээр зурсан баавгайг хэрэглэгч хүлээж аваагүй. Нүүрийг задлахгүй, бүхэлд нь шилжүүлнэ.
- **Баавгай хөвөхгүй:** газар дээрээ зогсож, pixel frame-ээр амьсгална.
- **Хөдөлгөөн Scott Pilgrim EX маягийн:** frame-by-frame анимаци, hit-stop, анивчилт, оч, чичиргээ. Нүдээр дагахуйц удаан, зөөлөн байна (хэрэглэгч «хэт хурдан» гэж хоёр удаа хэлсэн).
- **UI текст монголоор.** Хэрэглэгч монголоор (латин үсгээр) бичдэг; хариуг монголоор өгнө.
- **Хэрэглэгч `npm` ашигладаг.** bun/yarn/pnpm lock файл үүсгэхгүй, `.gitignore`-д ignore хийсэн.

## Юу хийсэн

1. **Адал явдлын газрын зураг** (`mobile/src/components/PathMap.tsx`, `mobile/src/lib/pixelBear/path.ts`, `world.json`)
   - 3 бүлэг (ой → тал → мөсөн уул) доороос дээш үргэлжилнэ. Бүлэг бүр 16 цэгтэй, хооронд нь 2 гүүр чулуу.
   - Түвшин (Шат) бүр нэг цэг: `currentNode = me.level - 1`. 48-р шатнаас цааш сүүлийн boss дээр зогсоно.
   - Бүлэг бүрийн төгсгөлд boss. Ялсны дараа туг болон «Ялсан» гарна.
   - Баавгай сүүлд харсан цэгээсээ (`kv: pq.path.seen.<userId>`) алхаж ирнэ, хамгийн ихдээ 6 алхам.
   - Web дээрх scroll алдааг зассан: `onLayout`-ийн оронд `useWindowDimensions`.
2. **Boss тулаан** (`mobile/src/components/BossArena.tsx`, `mobile/src/app/task/[subject].tsx`)
   - `/task/<subject>?boss=<unit>` хаягаар нээгдэнэ. Ердийн даалгаврын 5 асуулт тулаан болно.
   - Boss-ын амь = олонх зөв (3), баавгайн зүрх = 3 буруу. Тоог серверийн task-аас сэргээнэ, flag хийсэн асуулт тоологдохгүй.
   - Boss бүр өөрийн гэрийн дэвсгэртэй (`lair_0..2`). Дэвсгэр ба дүрүүд чичирнэ, HUD хөдлөхгүй.
   - **Сондгой хариулт (холоос):** баавгай гараа өргөж од шиднэ (бэлдэх → цэнэглэх → шидэх → дагах), boss ид шид шиднэ.
   - **Тэгш хариулт (ойроос):** баавгай 4 хөлөөрөө давхиж очоод босож сарвуудна. Хулуун шидтэн баавгайн урд хүртэл гулсаж, хадуураа өргөөд дүүжилнэ.
   - Цохилт бүрт hit-stop 80ms, цагаан анивчилт, оч эсвэл ул мөр, дэлгэц чичрэх, хойш түлхэгдэх.
   - Довтлогч тал нөгөөгийнхөө урд зурагдана (zIndex). Довтолгооны sprite-уудыг урьдчилж ачаална.
   - «Motion бууруулах» асаалттай бол бүх хөдөлгөөн унтарна.
3. **Boss-ууд:** 1. «Хулуун шидтэн» (хэрэглэгчийн өгсөн зураг, 8 frame + хадуур), 2. «Талын мангас», 3. «Мөсөн мангас» (энэ хоёр нь 1 frame-тэй, цагаан дүрсээр анивчина).
4. **Sprite sheet туслах** (`mobile/src/components/pixel/Sprite.tsx`): `SheetFrame`, `SheetLoop`, `frameSize`.

## Гол файлууд

| Файл | Үүрэг |
|---|---|
| `docs/design/pixel-bear/tools/mapgen_world.py` | Газрын зураг + `world.json`, мангас boss, туг, гэр, баавгайн тулааны 13 frame, 4 хөлийн давхилт, оч, ул мөр |
| `docs/design/pixel-bear/tools/boss_pumpkin.py` | Хулуун шидтэн (`reference/boss_pumpkin_ref.png`-оос), 8 frame sheet, хадуур, ид шидийн бөмбөг |
| `mobile/scripts/build-sprites.py` | Эх PNG-ийг 1x/2x/3x болгож `mobile/src/sprites/index.ts`-ийг үүсгэнэ |
| `mobile/src/lib/pixelBear/path.ts` | Цэгүүд, `BOSSES` (sheet, frame, гэр, зэвсэг), `BOSS_FRAME`, `HOVER`, хичээлийн сэдвүүд |
| `mobile/src/components/BossArena.tsx` | Тулааны бүх хөдөлгөөн ба хугацаа |
| `mobile/src/components/PathMap.tsx` | Газрын зураг, алхаж буй баавгай, boss |
| `mobile/src/app/(tabs)/path.tsx` | Замын дэлгэц, CTA, boss руу орох |

### Frame-ийн дараалал

- **Баавгай `bear_battle` (13):** 0 зогсох, 1 амьсгал, 2 ирмэх, 3 шидэх, 4 цочих, 5 цагаан, 6 бэлдэх, 7 цэнэглэх, 8 дагах, 9–10 гүйх, 11 хумсаа өргөх, 12 сарвуудах.
- **Баавгай `bear_gallop` (4):** тэнийх, хумих, урд газардах, хойд түлхэх.
- **Хулуу `boss_pumpkin_sheet` (8):** 0–2 хөвөх, 3 ид шид, 4 цочих, 5 цагаан, 6 давхих, 7 цохих.
- **Хадуур `fx_scythe` (3):** өргөсөн (толгойн ард зурагдана), дүүжлэх, цохих.

### Хугацаа (`BossArena.tsx`)

| Хэсэг | Тогтмолууд |
|---|---|
| Од / ид шид | `WINDUP 130`, `STRIKE 110`, `FLY 360`, `HITSTOP 80` |
| Баавгай давхих | `GALLOP_STEP 120` × 8 = `DASH 960`, `CLAW_UP 140`, `RETURN 640` |
| Boss давхих | `BOSS_DASH 960`, `BOSS_WINDUP 240`, `SWING 140`, `SCYTHE_HOLD 360`, `BOSS_RETURN 800` |
| Тайван үеийн frame | `TICK 160` |

## Ажиллуулах, шалгах

- **Node 24:** nvm-д `~/.nvm/versions/node/v24.14.1/bin` байгаа. `export PATH=$HOME/.nvm/versions/node/v24.14.1/bin:$PATH`.
- **API:** `cd api && npm run dev` (8787).
- **Апп:** `cd mobile && npx expo start -c` (QR код); web дээр http://localhost:8081.
- **Асуултын сан хоосон бол:** `cd api && npm run questions:import`. Одоо локал DB-д 315 асуулт бий.
- **Шууд тулаан руу:** http://localhost:8081/task/math?boss=0.
- **Шатыг өөрчлөх (локал DB):** `npx wrangler d1 execute DB --local --command "UPDATE users SET xp = 1500 WHERE id = 1"`. 1500 XP = 16-р шат = 1-р boss. Хэрэглэгчийн `bulganbat` бүртгэл одоо 1500 XP-тэй.
- **Sprite шинэчлэх:** генератор → `python3 mobile/scripts/build-sprites.py` → `git diff --name-only --diff-filter=M -- mobile/assets/sprites | xargs git checkout --`. Энэ сүүлийн алхам өөрчлөгдөөгүй PNG-ийг Pillow дахин шахаж үүсгэсэн «өөрчлөлт»-ийг буцаана.
- **Тест бүртгэл:** browser-ийн JS-ээс `/auth/register` руу санамсаргүй нууц үгтэйгээр үүсгэж, `localStorage['surgalt.session']`-д token-ийг хадгална. Дууссаны дараа `tasks`, `task_questions`, `seen_questions`, `point_ledger`, `sessions`, `users`-ээс устгана.

### Анхаарах зүйлс

- **Metro файлын өөрчлөлтийг барихгүй байх нь бий.** Тэр үед `expo start --clear`-ээр дахин асаана. Bundle-д код орсон эсэхийг шалгахдаа bundle-ийн текстээс тодорхой мөрийг хайна.
- **Browser pane нуугдсан эсвэл Claude-ийн цонх харагдахгүй үед `requestAnimationFrame` зогсдог.** Хөдөлгөөн хэмжихийн өмнө pane-ийг ил гаргаж, frame тоолж шалгана.
- **Хэрэглэгч pane дээр зэрэг дарж болно.** Тулаан өөрөө ахих тохиолдол гарсан.
- **Zsh-д `$c:refs`-ийг `:r` модификатор гэж уншина.** `${c}:refs/...` гэж бичнэ.

## Үлдсэн ажил, санаа

- [ ] Shinebayr11-ийн review-ийг хүлээж, сэтгэгдэл гарвал засаад PR-ийг нэгтгэх.
- [ ] Утсан дээр (Expo Go) бүрэн шалгах. Ялангуяа Android дээр «алга болох» асуудал давтагдах эсэх.
- [ ] Boss-ыг ялахыг заавал болгох эсэхийг хэрэглэгчээс асуух. Одоо ахиц XP-ээр явдаг тул ялагдсан ч цааш явж болно.
- [ ] 2, 3-р бүлгийн мангасуудад frame ба зэвсэг нэмэх (одоо 1 frame-тэй, гулсаж очиж цохино).
- [ ] Баавгайн гар болон 4 хөлийн бие кодоор зурагдсан тул энгийн харагддаг. Зураачийн frame-ээр солих боломжтой.
- [ ] Буцахдаа баавгай хоёр хөлөөрөө ухарч гүйдэг. Эргэж 4 хөлөөр буцах бол sprite-ийг толин тусгалаар эргүүлэх хэрэгтэй.
- [ ] Хулуун шидтэний эх зургийн лицензийг шалгах (asset pack-аас авсан эсэх).
- [ ] PR нэгдсэний дараа локал `backup/adventure-map-2026-10-21` branch-ийг устгах.
