# Сурах Аян (PoC)

6–10-р ангийн хүүхдүүдэд зориулсан gamified хичээлийн апп. Өдөр бүр хичээлийн даалгавар хийж оноо, XP
цуглуулна; дараалал (streak) өсөх тусам оноо нь үржинэ. Оноогоороо дүрдээ хувцас авч, ижил түвшний
хүүхдүүдтэй бооцоотой real-time тулаан хийнэ.

- `mobile/` — Expo SDK 57 (Expo Go), expo-router, TypeScript, react-native-svg, expo-secure-store
- `api/` — Cloudflare Workers (Hono) + D1 + Durable Objects (`DuelRoom`, WebSocket Hibernation)
- `shared/types.ts` — API ба WebSocket-ийн гэрээ (хоёр тал `import type`-аар хуваалцана)

Апп-ын түр нэр `mobile/src/constants/brand.json`-д байна. Тоглоомын бүх тогтмол
`api/src/config/game.ts`-д, UI-ийн бүх текст `mobile/src/i18n/strings.ts`-д төвлөрсөн.

---

## 1. Шаардлага

- **Node 24** (Expo 57, wrangler 4, Vitest 5 нь Node ≥ 22 шаарддаг). `node -v` → `v24.x` байх ёстой.
  - macOS + Homebrew: `brew install node@24`, дараа нь `~/.zshrc`-д PATH нэмнэ (Apple Silicon:
    `/opt/homebrew/opt/node@24/bin`, Intel: `/usr/local/opt/node@24/bin`):

    ```bash
    echo 'export PATH="/opt/homebrew/opt/node@24/bin:$PATH"' >> ~/.zshrc
    ```

  - nvm ашигладаг бол repo дотор `nvm install && nvm use` (`.nvmrc` = 24).
- Утсан дээр **Expo Go** (SDK 57-г дэмждэг хувилбар).
- Компьютер ба утаснууд **нэг Wi-Fi**-д байна.

## 2. Анх удаа тохируулах (clone хийсний дараа)

```bash
git clone https://github.com/pinecone-studio/pinequest-s5-episode-2-team-1.git
```

```bash
cd pinequest-s5-episode-2-team-1/api && npm install && cp .dev.vars.example .dev.vars && npm run db:migrate
```

```bash
cd ../mobile && npm install
```

- `api/.dev.vars` дотор `ADMIN_TOKEN=` — дурын урт санамсаргүй мөр (seed, бот, асуулт import хийхэд).
- **Gemini түлхүүр (заавал биш):** repo-ийн root дээр `.env.local` файл үүсгэж `GEMINI_API_KEY=...` гэж
  бичнэ (эсвэл `api/.dev.vars`-д). Үнэгүй түлхүүрийг https://aistudio.google.com/apikey -оос авна.
  Түлхүүргүй ч апп `api/seed/questions.json`-ийн шалгасан 315 асуултаар бүрэн ажиллана.
  `npm run dev` эхлээд `api/.dev.vars`-ийг, дараа нь `../.env.local`-ийг уншина; хоёулаа git-д орохгүй.
- Анх асаасны дараа асуултын санг нэг удаа оруулна (доорх 3-р хэсгийн "Асуултын сан").

## 3. Демо ажиллуулах

### VS Code-оор (хамгийн хялбар)

1. Repo-ийн root хавтсыг нээнэ: `code .` (эсвэл File → Open Folder). "Trust" гэж асуувал зөвшөөрнө.
2. `Cmd+Shift+P` → **Tasks: Run Task** → **Демо эхлүүлэх**. Доод panel-д "API сервер", "Expo (QR код)"
   хоёр terminal зэрэг нээгдэнэ.
3. "Expo (QR код)" terminal дахь QR-ийг утсаараа уншуулна.
4. Зогсоохдоо terminal бүрт `Ctrl+C` (эсвэл `Cmd+Shift+P` → **Tasks: Terminate Task**).

Task бүр Homebrew-ийн Node 24-ийг өөрөө PATH-ийн урд тавьдаг. Харин VS Code-д **гараар нээсэн terminal**
macOS-ийн login shell тул `/etc/zprofile` (path_helper) PATH-ийг дахин эрэмбэлж системийн хуучин Node-ийг
сонгож болзошгүй ("Wrangler requires at least Node.js v22"). Ийм бол 1-р хэсгийн `~/.zshrc` мөрийг нэмээд
terminal-аа шинээр нээнэ. Бусад task: "Бот тоглогч", "Асуултын сан сэргээх", "Сурах бичиг оруулах", "Шалгалт".

### Terminal-аар

Гурван terminal (`node -v` → `v24.x` байх ёстой):

**1) API**

```bash
cd api
npm run dev
```

`0.0.0.0:8787` дээр асч, `http://<компьютерийн LAN IP>:8787` гэж хаягаа хэвлэнэ.

**2) Асуултын сан** (сервер ажиллаж байхад)

Шалгаж цэвэрлэсэн 315 асуулт `api/seed/questions.json`-д git дотор хадгалагдсан. Local DB хоосон
бол (шинэ компьютер, `db:reset`-ийн дараа) нэг командаар сэргээнэ:

```bash
cd api
npm run questions:import
```

Асуулт нэмэх бол Gemini-ээр (хослол бүрийг 40 хүртэл):

```bash
npm run seed:questions -- --model gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite
```

Free tier-ийн квот бага тул нэг хүсэлтэд 10 асуулт үүсгэж, эхний загварын өдрийн квот дуусах эсвэл
ачаалалтай (503) үед дараагийнх руу автоматаар шилжинэ. `--tier 1`, `--subject mongolian`,
`--parallel 2` гэж шүүж болно. Шинээр нэмсэн асуултаа шалгасны дараа `npm run questions:export`-ээр
`seed/questions.json`-оо шинэчилнэ. LLM-гүйгээр туршихад хослол бүрт 6 бэлэн асуулт оруулдаг
`npm run seed:fixtures` бий.

**3) Апп**

```bash
cd mobile
npx expo start
```

Утсаараа QR уншуулна. Апп API-ийн хаягийг Expo-ийн host IP-ээс автоматаар (`http://<IP>:8787`)
гаргана. Нэвтрэх дэлгэцийн доор `✓ Сервертэй холбогдлоо · http://…` гэж харагдвал холболт зөв.
Хаягийг гараар тогтоох бол `mobile/.env` файлд `EXPO_PUBLIC_API_URL=http://192.168.x.x:8787`
гэж бичээд `npx expo start -c`-ээр дахин асаана.

**Демогийн өмнө.** Local DB одоо цэвэр: хэрэглэгч байхгүй, асуултын сан шалгагдсан. e2e тест
туршилтын хэрэглэгчид үүсгэдэг тул демогийн өмнө ажиллуулахгүй байх нь дээр. `npm run db:reset` бүх
хэрэглэгч, асуулт, сурах бичгийн санг устгадаг тул хийсэн бол дараа нь заавал `npm run questions:import`
(сурах бичиг оруулсан бол `npm run books:import` ч) ажиллуулна.

## 4. Демо сценари (хүлээн авах шалгуур)

1. Хоёр утас QR уншуулж, 7-р анги ба 6-р анги гэж бүртгүүлнэ. Хоёулаа **Түвшин 1**, 50 оноотой эхэлнэ.
2. Хоёулаа нэг даалгавар хийнэ (5 асуулт). Асуулт бүрийн дараа зөв/буруу болон тайлбар гарна.
   Төгсгөлд оноо, туршлага (XP) нэмэгдэж, 🔥 дараалал 1 болно.
3. А **Тулаан** tab → Математик → бооцоо. Онооны 20%-иас их тоо оруулахад улаан анхааруулга гарч товч
   идэвхгүй болно; сервер ч мөн татгалзана.
4. Б лобби дээр (3 сек тутам шинэчлэгдэнэ) сорилтыг **Хүлээн авах** → хоёулангийнх нь бооцоо түр
   хасагдаж, А-гийн утас өрөө рүү автоматаар орно. 3 асуулт, тус бүр 20 сек: хамгийн түрүүнд зөв
   хариулсан нь авна, буруу хариулсан нь тэр асуултад дахин хариулахгүй. Дуусахад ялагчид +бооцоо,
   ялагдагчид −бооцоо хоёр утсан дээр зэрэг харагдана (тэнцвэл бооцоо буцна).
5. **Дэлгүүр** → эд зүйл сонгож оноогоор авахад шууд өмсөгдөж avatar өөрчлөгдөнө.
6. Өдөрт 10 даалгавар хийсний дараа 11 дэх нь эхлэхгүй ("Өнөөдрийн 10 даалгавраа хийчихлээ").

### Ганцаараа турших (бот тоглогч)

```bash
cd api
npm run bot
```

Лобби дахь (Түвшин 1) эхний сорилтыг хүлээн авч, 2–8 секундэд хариулна.

```bash
npm run bot -- --create math --stake 3 --accuracy 0.6
```

Бот өөрөө сорилт үүсгэнэ, утаснаасаа хүлээн авна. Бусад сонголт: `--user`, `--grade`, `--min`/`--max`
(сек), `--loop`, `--url`.

## 5. Шалгалт

```bash
cd api
npm run typecheck
npm test
npm run e2e
```

- `npm test` — цэвэр функцүүдийн Vitest unit тест: UTC+8 өдрийн хил, streak, хамгаалалт, үржвэр,
  level, бооцооны хязгаар, LLM-ийн хариуны шалгалт, тулааны engine.
- `npm run e2e` — ажиллаж буй dev сервер дээр бүтэн урсгал: даалгавар, хамгаалалт ("цаг хугацаа"
  дуурайж), өдрийн хязгаар, дэлгүүр, бодит WebSocket-оор тулаан (ялалт, тэнцээ, 10 сек салалт),
  сурах бичгийн сан (түр хавтаснаас оруулах, дахин оруулах, хуудас солих/хасах, устгах), ledger-ийн
  нийлбэр. `-- --slow` нэмбэл 30 сек no-show-г бас шалгана; `-- --only tasks|shop|duel|books`.
- Mobile: `cd mobile && npm run typecheck`.

## 6. LAN-аар ажиллахгүй бол

1. Утас, компьютер нэг Wi-Fi-д байгаа эсэх (зочны Wi-Fi ихэвчлэн төхөөрөмжүүдийг хооронд нь хаадаг).
2. macOS Firewall: System Settings → Network → Firewall, `node`/`workerd`-д ирэх холболтыг зөвшөөрнө.
3. Утасны browser-оор `http://<IP>:8787/health` нээгдэж байгаа эсэх.
4. Wi-Fi солих бүрт компьютерийн IP өөрчлөгдөнө: `npx expo start -c`-г дахин асаагаад шинэ QR-ийг
   уншуулна (API-г дахин асаах шаардлагагүй). Expo буруу сүлжээний IP сонговол
   `REACT_NATIVE_PACKAGER_HOSTNAME=<IP> npx expo start -c`.
5. Expo Go "Project is incompatible" гэвэл утсан дээрх Expo Go-ийн SDK-тэй тааруулна
   (одоо SDK 57): `npm install expo@~57.0.0 && npx expo install --fix`.

**Нөөц хувилбар: workers.dev руу deploy** (Free plan хангалттай; DuelRoom нь SQLite-backed):

```bash
cd api
npx wrangler login
npx wrangler d1 create surgalt
```

Гарсан `database_id`-г `wrangler.jsonc`-ийн хоёр газар (үндсэн ба `env.ai`) тавина. Дараа нь:

```bash
npm run db:migrate:remote
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

Seed (ADMIN_TOKEN-оо өөрийнхөөрөө, URL-аа deploy-ийн гаргасан хаягаар солино):

```bash
ADMIN_TOKEN=... npm run seed:questions -- --url https://surgalt-api.<subdomain>.workers.dev --model gemini-3.5-flash-lite
```

`mobile/.env`: `EXPO_PUBLIC_API_URL=https://surgalt-api.<subdomain>.workers.dev`. Утас Metro-д LAN-аар
хүрэхгүй бол `npx expo start --tunnel`. Deploy хийсэн Worker дээр background нөхөлт ~30 секундэд
багтах ёстой тул `wrangler.jsonc`-д `GEMINI_MODEL`-ийг `gemini-3.5-flash-lite` болгох нь найдвартай.

Free plan дээр нэвтрэхэд CPU хязгаарын алдаа (1102) гарвал `api/src/config/game.ts`-ийн
`PBKDF2_ITERATIONS`-ийг багасгана; hash бүр өөрийн iteration-ийг хадгалдаг тул хуучин хэрэглэгчид
нэвтэрсээр байна.

## 7. LLM (асуулт үүсгэлт)

- Provider: `LLM_PROVIDER` (`wrangler.jsonc` → `vars`). Хоосон бол `GEMINI_API_KEY` байвал Gemini,
  үгүй бол Workers AI. Background нөхөлт `GEMINI_MODEL` (анхдагч `gemini-3.8-flash`)-ийг ашиглана.
- **Free tier-ийн квот** (2026-10-20-нд ажигласан): `gemini-3.8-flash` өдөрт 20 хүсэлт; `gemini-3.6-flash`
  ч ойролцоо тоонд хүрээд зогссон; `gemini-3.5-flash-lite` илүү их квоттой. Ачаалалтай үед 503
  ("high demand") түр гардаг тул сервер `retryDelay`-ийг хүндэтгэж дахин оролддог.
- **Чанар** (асуулт бүрийг гараар шалгасан):
  - Түвшин 1-ийн 120 асуултаас 11-д flag тавьсан: 3 давхардал, үсгийн алдаатай нэр томьёо,
    "Ам алдах" хэлцийн буруу тайлбар гэх мэт.
  - Математик, физикийн хариу шалгасан бүх асуултад зөв байсан.
  - Монгол хэлний (дүрэм, хэлц, зүйр үг) асуулт хамгийн эмзэг:
    - `3.8-flash`, `3.6-flash` ~10–20%-д алдаатай;
    - `3.5-flash-lite` тэн хагаст нь алдаатай байсан тул түүний монгол хэлний бүх асуултад flag тавьсан.
  - Түвшин 3-ын монгол хэлэнд background нөхөлт `3.8-flash`-аар 40 асуулт нэмснээс шалгаад 31-ийг үлдээсэн
    (37 болсон). Түвшин 2-ын монгол хэл бага хэвээр (12). Квот сэргэхэд:
    `npm run seed:questions -- --subject mongolian --tier 2 --model gemini-3.8-flash,gemini-3.6-flash`.
- Загвар JSON-д `solution` (бодолт)-ыг `correctIndex`-ээс өмнө бичнэ. Сервер дараахыг шалгаж хаяна:
  - schema-д таарахгүй, кирилл текстгүй, 4 ялгаатай сонголтгүй асуулт;
  - нэг үг дотор латин, кирилл холилдсон ("зохиolyn") эсвэл өөр бичгийн үсэг ("ە") орсон асуулт;
  - тоо, үйлдлээрээ ижил бодлого (жишээ нь `2.4:0.6+1.5`).

  Үлдсэн асуултын сонголтуудыг холино. Хадгалах бүтэц нь `{ prompt, options[4], correctIndex, explanation }`.
- Pool босгоос доош орвол (хэрэглэгчийн хараагүй асуулт < 15 эсвэл нийт < 30) background-д 20
  асуултаар нөхнө. Тулааны асуултыг хурдны тулд зөвхөн pool-оос авна.
- Утсан дээрх "Асуулт буруу байна" товч асуултыг flagged болгож, дахин гаргахгүй. Андуурсан бол
  `POST /admin/questions/:id/unflag` (`X-Admin-Token`).
- Workers AI local dev-д ч Cloudflare руу ханддаг тул `npx wrangler login` хийгээд `npm run dev:ai`.

## 8. Бүтэц

```
api/src/config/game.ts     тоглоомын бүх тогтмол
api/src/domain/            цэвэр функц: UB өдөр, streak, хамгаалалт, шагнал, level, бооцоо
api/src/duel/engine.ts     тулааны state machine (цэвэр, тесттэй)
api/src/duel/DuelRoom.ts   Durable Object: WebSocket Hibernation + alarm + D1 settle
api/src/llm/               Gemini / Workers AI, prompt, шалгалт
api/src/services/          даалгавар, тулаан (escrow), дэлгүүр, pool
api/src/routes/            REST endpoint-ууд, /duels/:id/ws
api/migrations/            D1 schema, дэлгүүрийн 20 эд зүйл
api/migrations-books/      сурах бичгийн сангийн schema (тусдаа BOOKS database)
api/books/                 номын скан, зураг — git-д орохгүй (11-р хэсэг)
api/scripts/               seed-questions, books (сурах бичиг оруулах), duel-bot, e2e
mobile/src/app/            дэлгэцүүд (expo-router)
mobile/src/components/     Avatar (SVG давхарга), товч, карт…
```

Онооны бүх өөрчлөлт `point_ledger`-д шалтгаан, холбоос id-тайгаа бичигдэнэ. Escrow, тооцоо,
худалдан авалт бүгд нэг D1 batch-аар хийгдэнэ: `CHECK (points >= 0)` оноо хүрэлцэхгүй үед batch-ийг
буцаана, төлөв шилжүүлэх `tx` nonce нь давхар accept/settle-ээс хамгаална.

## 9. PoC-д хийгдээгүй

Эцэг эхийн хяналт, чат, push мэдэгдэл, найз, leaderboard, App Store, admin panel. Нэвтрэх
оролдлогын хязгаар, session-ий хугацаа, тулааны дахин тоглолт зэрэг production асуудлууд ч орхигдсон.

## 10. Pixel Bear UI (дизайн)

UI нь `docs/design/pixel-bear/` дахь дизайн дээр суурилна: `DESIGN.md` (токен, дүрэм, дэлгэц бүрийн тодорхойлолт),
`reference/*.html` (дизайны яг markup), `sprites/` (pixel art эх файлууд).

- **Sprite-ууд crisp байх:** RN-ийн `Image` томруулахдаа бүдгэрүүлдэг тул sprite бүрийг харагдах хэмжээгээр нь
  1x/2x/3x нягтралд nearest-neighbor аргаар урьдчилан томруулсан (`mobile/assets/sprites/`). Шинэ sprite эсвэл хэмжээ
  нэмэхдээ `mobile/scripts/build-sprites.py`-ийн жагсаалтад нэмээд `python3 mobile/scripts/build-sprites.py`
  (Pillow хэрэгтэй) ажиллуулна. Энэ нь `mobile/src/sprites/index.ts`-ийг дахин үүсгэнэ;
  `<Sprite id="icon_coin_24x24" />` гэж ашиглана.
- **Фонт:** Onest (UI) ба Pixelify Sans (тоо), `@expo-google-fonts/*`-оор.
- **Хөдөлгөөн:** `mobile/src/components/pixel/` (react-native-reanimated). Утасны "motion бууруулах" тохиргоо
  асаалттай бол бүх animation зогсоно.
- **Mock өгөгдөл:** дэвсгэр өнгө, ороолт/төгсөгчийн малгай, сонгосон хичээл backend-д байхгүй тул
  `mobile/src/lib/mock/pixelBear.tsx`-д төхөөрөмж дээр хадгалагдана (Coin = серверийн оноо − mock зарцуулалт).
  Нүдний шил, чихэвч нь серверийн бодит эд зүйл (`acc_glasses`, `acc_headphones`). Баавгайн төлөв, сурах замын
  ахиц, хуанли нь серверийн бодит өгөгдлөөс (дараалал, XP, хамгаалалт) тооцоологдоно.
- **Демо:** Нүүрний баавгайн stage дээр удаан дарвал 5 төлөвийг ээлжлэн харуулна (зөвхөн харагдац, хадгалагдахгүй).
- **Доод цэс (Charlie маягийн):** Нүүр · Даалгавар · Сурах зам · Дэлгүүр · Баг. Icon-ууд нь
  `docs/design/pixel-bear/tools/icons_v2.py`-оор зурагдсан 20px pixel art (1.5×, 30dp). Цүнх нь Дэлгүүрийн дээд буланд.

## 11. Сурах бичгийн сан (local)

Сурах бичгийн хуудас бүрийг файлаар нь хадгалах сан. Одоохондоо компьютер дээрээ (local) ажиллана, дараа
нь багийн Cloudflare руу шилжүүлнэ.

- **Мэдээлэл** (ном, хуудас, дараа нь OCR текст): тусдаа D1 database `surgalt-books` (`BOOKS` binding,
  schema `api/migrations-books/`). Тоглоомын `surgalt` DB-д хүрэхгүй.
- **Хуудасны файл:** R2 bucket `surgalt-books` (`BOOK_FILES`). Local-д `api/.wrangler/state` дотор хадгалагдана.
- **Эх файл:** `api/books/<хавтас>/` — git-д орохгүй (repo public, зохиогчийн эрх). Сан устсан ч
  (`db:reset`) эндээс `books:import`-оор дахин үүснэ. Хавтасны бүтэц, `book.json`: `api/books/README.md`.

### Анх удаа: сан үүсгэх

```bash
cd api
```

```bash
npm run db:migrate
```

Дутуу migration-ийг л нэмнэ: одоо байгаа хэрэглэгч, асуулт устахгүй. Сервер ажиллаж байсан бол шинэ кодыг
найдвартай уншуулахын тулд зогсоогоод (`Ctrl+C`) `npm run dev`-ээр дахин асаана.

### Ном оруулах (ном бүрт)

1. `api/books/` дотор `<хичээл>-<анги>` нэртэй хавтас үүсгэнэ: `mongolian-7`, `math-6`, `physics-9`.
2. Файлаа хийнэ. Хуудасны дараалал = файлын нэрийн дараалал (`2.jpg` < `10.jpg`):
   - биет номын скан: `mongol7.pdf` (эсвэл бүлгээр `01.pdf`, `02.pdf`…);
   - онлайн хувилбарын зураг: `001.jpg`, `002.jpg`… (pdf, jpg, png, webp).
3. Сервер ажиллаж байх ёстой: өөр terminal-д `npm run dev` (эсвэл VS Code-ийн "API сервер" task).
4. Хуудасны дарааллыг шалгана (юу ч оруулахгүй):

   ```bash
   npm run books:import -- --book mongolian-7 --dry
   ```

5. Сан руу оруулна:

   ```bash
   npm run books:import -- --book mongolian-7
   ```

   Анх удаа хавтасны нэрээс `book.json` үүснэ. Он, хэвлэлийн газар, `pageOffset`-ийг засаад дахин
   ажиллуулна: өөрчлөгдөөгүй хуудсыг дахин илгээхгүй, зөвхөн мэдээлэл шинэчлэгдэнэ. `--book`-гүй бол
   `api/books/` доторх бүх номыг оруулна.
6. Шалгана: номын жагсаалт, дараа нь нэг хуудсыг сангаас гаргаж нээх (жишээ нь 45-р хуудас):

   ```bash
   npm run books:list
   ```

   ```bash
   npm run books:page -- --book mongolian-7 --page 45
   ```

Хуудас солих, нэмэх, хасах: хавтас дахь файлаа өөрчлөөд 5-р алхмыг давтана. Өөрчлөгдсөн хуудас л
шинэчлэгдэж, хассан хуудас сангаас устна. Номыг сангаас бүхэлд нь устгах (хавтас хэвээр үлдэнэ):

```bash
npm run books:delete -- --book mongolian-7
```

API: `GET /admin/books`, `GET /admin/books/<хавтас>` (хуудасны жагсаалт), `GET /admin/books/<хавтас>/pages/<дугаар>`
(файл), `.../pages/<дугаар>/text` (текст), бүгд `X-Admin-Token`-тэй.

### Хуудасны текст

`books:import` хуудас бүрийн текстийг PDF-ийн текст давхаргаас Gemini-гүйгээр, үнэгүй гаргана. Хуучин
"Mon" фонтоор эвдэрсэн үгсийг (`Ìàòåìàòèê` → `Математик`) засаж, текстийг `api/books/<хавтас>/text/0045.md`-д
хадгалаад санд оруулна. Хуудас бүрийн чанар нь сайн, муу (эвдэрсэн тэмдэгт олонтой) эсвэл хоосон (текст
давхаргагүй, зураг) гэж тэмдэглэгдэнэ.

Текст давхаргад томьёо (бутархай, язгуур, олонлогийн тэмдэг) ихэвчлэн байдаггүй. Муу, хоосон хуудсыг,
эсвэл томьёо хэрэгтэй бол бүх хуудсыг Gemini-ээр уншуулна (томьёог LaTeX-ээр бичнэ). Сервер ажиллаж,
`.env.local`-д `GEMINI_API_KEY` байх ёстой:

```bash
npm run books:ocr -- --book math-6 --model gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite
```

- Анхдагчаар зөвхөн муу, хоосон хуудсыг уншина. `--all` бол бүх хуудсыг, `--pages 35-40,92` бол заасан хуудсыг.
- Нэг хүсэлтэд 4 хуудас (`--batch`, дээд тал нь 8) явуулдаг бөгөөд ~2–3 минут үргэлжилнэ. Эхний загварын өдрийн
  квот дуусахад `--model`-ийн дараагийнх руу шилжинэ. Дахин ажиллуулахад аль хэдийн уншсан хуудсаа алгасна.
- Уншсан текст `text/`-д хадгалагддаг тул `db:reset`-ийн дараа `books:import` квот зарцуулахгүйгээр сэргээнэ.
- Хуудасны текстийг харах: `npm run books:page -- --book math-6 --page 34 --text`. `text/0034.md`-г гараар
  засаад `books:import` ажиллуулбал засвар санд орно.

### Багийн Cloudflare дээрх сан

Сан багийн Cloudflare account дээр байна: D1 `surgalt-books` ба R2 bucket `surgalt-books`. Workers subdomain нь
`pinequest-team1.workers.dev`. Багийн гишүүнийг Cloudflare dashboard → Manage Account → Members хэсгээс урина.

```bash
npx wrangler login
```

```bash
npm run dev:books
```

`dev:books` горимд тоглоомын DB local хэвээр, сан (`BOOKS`, `BOOK_FILES`) нь Cloudflare дээрх жинхэнэ сан байна
(`remote: true`, `wrangler.jsonc`-ийн `env.books`). Энэ үед `books:import`, `books:list`, `books:ocr`, `books:page`
бүгд Cloudflare-ийн сан дээр ажиллана. Демоны `npm run dev` өөрчлөгдөхгүй, local сантай хэвээр.
Сангийн schema шинэчлэгдвэл (`migrations-books/`): `npm run books:migrate:remote`.
