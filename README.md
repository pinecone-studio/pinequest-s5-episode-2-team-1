# Сурах Аян (PoC)

6–10-р ангийн хүүхдүүдэд зориулсан gamified хичээлийн апп. Өдөр бүр хичээлийн даалгавар хийж оноо, XP
цуглуулна; дараалал (streak) өсөх тусам оноо нь үржинэ. Оноогоороо дүрдээ хувцас авч, ижил түвшний
хүүхдүүдтэй бооцоотой real-time тулаан хийнэ.

- `mobile/` — Expo SDK 58 (Expo Go), expo-router, TypeScript, react-native-svg, expo-secure-store
- `api/` — Cloudflare Workers (Hono) + D1 + Durable Objects (`DuelRoom`, WebSocket Hibernation)
- `shared/types.ts` — API ба WebSocket-ийн гэрээ (хоёр тал `import type`-аар хуваалцана)

Апп-ын түр нэр `mobile/src/constants/brand.json`-д байна. Тоглоомын бүх тогтмол
`api/src/config/game.ts`-д, UI-ийн бүх текст `mobile/src/i18n/strings.ts`-д төвлөрсөн.

---

## 1. Шаардлага

- **Node 24** (Expo 58, wrangler 4, Vitest 5 нь Node ≥ 22 шаарддаг). Энэ компьютер дээр Homebrew-ийн
  `node@24` суусан, системийн Node 20-д хүрэхгүй. Terminal бүрт эхлээд:

  ```bash
  export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
  ```

  Байнга ашиглах бол энэ мөрийг `~/.zshrc`-д нэмнэ.
- Утсан дээр **Expo Go**-ийн хамгийн сүүлийн хувилбар (SDK 58).
- Компьютер ба утаснууд **нэг Wi-Fi**-д байна.

## 2. Анх удаа тохируулах

```bash
cd api
npm install
cp .dev.vars.example .dev.vars
```

`api/.dev.vars` дотор:

- `GEMINI_API_KEY=` — https://aistudio.google.com/apikey -оос авсан үнэгүй түлхүүр (асуулт үүсгэхэд).
- `ADMIN_TOKEN=` — дурын урт санамсаргүй мөр (seed скрипт, бот ашиглана).

```bash
npm run db:migrate
cd ../mobile
npm install
```

## 3. Демо ажиллуулах

Гурван terminal (бүгдэд нь эхлээд дээрх `export PATH=...`):

**1) API**

```bash
cd api
npm run dev
```

`0.0.0.0:8787` дээр асч, `http://<компьютерийн LAN IP>:8787` гэж хаягаа хэвлэнэ.

**2) Асуултын сан** (демогийн өмнө нэг удаа, сервер ажиллаж байхад)

```bash
cd api
npm run seed:questions
```

Gemini-ээр 9 хослол (3 түвшин × 3 хичээл) тус бүрт ~40 асуулт үүсгэнэ. Free tier-ийн минутын хязгаарт
багтаахын тулд дараалан, завсартай явна (~10–15 мин). Хязгаар хэтэрвэл өөрөө хүлээгээд үргэлжилнэ.
LLM-гүйгээр туршихад хослол бүрт 6 бэлэн асуулт оруулдаг `npm run seed:fixtures` бий.

**3) Апп**

```bash
cd mobile
npx expo start
```

Утсаараа QR уншуулна. Апп API-ийн хаягийг Expo-ийн host IP-ээс автоматаар (`http://<IP>:8787`)
гаргана. Нэвтрэх дэлгэцийн доор `✓ Сервертэй холбогдлоо · http://…` гэж харагдвал холболт зөв.
Хаягийг гараар тогтоох бол `mobile/.env` файлд `EXPO_PUBLIC_API_URL=http://192.168.x.x:8787`
гэж бичээд `npx expo start -c`-ээр дахин асаана.

**Демогийн өмнө цэвэрлэх.** e2e тест туршилтын хэрэглэгчид үүсгэдэг. Цэвэр өгөгдлөөр эхлэх бол
`npm run dev`-ээ зогсоогоод доорхыг ажиллуулж, серверээ дахин асаагаад seed хийнэ:

```bash
cd api
npm run db:reset
```

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
  ledger-ийн нийлбэр. `-- --slow` нэмбэл 30 сек no-show-г бас шалгана; `-- --only tasks|shop|duel`.
- Mobile: `cd mobile && npm run typecheck`.

## 6. LAN-аар ажиллахгүй бол

1. Утас, компьютер нэг Wi-Fi-д байгаа эсэх (зочны Wi-Fi ихэвчлэн төхөөрөмжүүдийг хооронд нь хаадаг).
2. macOS Firewall: System Settings → Network → Firewall, `node`/`workerd`-д ирэх холболтыг зөвшөөрнө.
3. Утасны browser-оор `http://<IP>:8787/health` нээгдэж байгаа эсэх.

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
ADMIN_TOKEN=... npm run seed:questions -- --url https://surgalt-api.<subdomain>.workers.dev
```

`mobile/.env`: `EXPO_PUBLIC_API_URL=https://surgalt-api.<subdomain>.workers.dev`. Утас Metro-д LAN-аар
хүрэхгүй бол `npx expo start --tunnel`.

Free plan дээр нэвтрэхэд CPU хязгаарын алдаа (1102) гарвал `api/src/config/game.ts`-ийн
`PBKDF2_ITERATIONS`-ийг багасгана; hash бүр өөрийн iteration-ийг хадгалдаг тул хуучин хэрэглэгчид
нэвтэрсээр байна.

## 7. LLM (асуулт үүсгэлт)

- Provider: `LLM_PROVIDER` (`wrangler.jsonc` → `vars`). Хоосон бол `GEMINI_API_KEY` байвал Gemini
  (`GEMINI_MODEL`, анхдагч `gemini-3.8-flash`), үгүй бол Workers AI.
- Workers AI local dev-д ч Cloudflare руу ханддаг тул `npx wrangler login` хийгээд `npm run dev:ai`.
- Загвар JSON-д `solution` (бодолт)-ыг `correctIndex`-ээс өмнө бичнэ. Сервер schema, кирилл текст,
  4 ялгаатай сонголтыг шалгаж, давхардлыг хаяж, сонголтуудыг холино. Хадгалах бүтэц нь
  `{ prompt, options[4], correctIndex, explanation }`.
- Pool босгоос доош орвол (хэрэглэгчийн хараагүй асуулт < 15 эсвэл нийт < 30) background-д 20
  асуултаар нөхнө. Тулааны асуултыг хурдны тулд зөвхөн pool-оос авна.
- Утсан дээрх "Асуулт буруу байна" товч асуултыг flagged болгож, дахин гаргахгүй.

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
api/scripts/               seed-questions, duel-bot, e2e
mobile/src/app/            дэлгэцүүд (expo-router)
mobile/src/components/     Avatar (SVG давхарга), товч, карт…
```

Онооны бүх өөрчлөлт `point_ledger`-д шалтгаан, холбоос id-тайгаа бичигдэнэ. Escrow, тооцоо,
худалдан авалт бүгд нэг D1 batch-аар хийгдэнэ: `CHECK (points >= 0)` оноо хүрэлцэхгүй үед batch-ийг
буцаана, төлөв шилжүүлэх `tx` nonce нь давхар accept/settle-ээс хамгаална.

## 9. PoC-д хийгдээгүй

Эцэг эхийн хяналт, чат, push мэдэгдэл, найз, leaderboard, App Store, admin panel. Нэвтрэх
оролдлогын хязгаар, session-ий хугацаа, тулааны дахин тоглолт зэрэг production асуудлууд ч орхигдсон.
