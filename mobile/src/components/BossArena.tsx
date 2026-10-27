import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BearSkillFx } from '@/components/BearSkillFx';
import { DefeatAnim } from '@/components/DefeatAnim';
import { AnimatedBar, frameSize, Motion, Pop, SheetFrame, SheetLoop, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { tagFrames } from '@/lib/pixelBear/anim';
import bear from '@/lib/pixelBear/bear.json';
import golems from '@/lib/pixelBear/golems.json';
import { BOSS_FRAME, type Boss, HOVER } from '@/lib/pixelBear/path';
import { SKILL_HIT, skillOf } from '@/lib/pixelBear/skills';
import type { SpriteKey } from '@/sprites';

// Баавгайн frame бүр өөрийн хугацаатай, tag-аар бүлэглэгдсэн (mobile/scripts/bear-sprites.ts → bear.json).
type Tag = keyof typeof bear.tags;
const frames = (tag: Tag) => tagFrames(bear, tag);
const ms = (frame: number) => bear.frames[frame].duration;
const span = (tag: Tag) => frames(tag).reduce((t, f) => t + ms(f), 0);
/** tag эхэлснээс `name` frame гарах хүртэлх хугацаа */
const until = (tag: Tag, name: string) => {
  const fs = frames(tag);
  return fs.slice(0, fs.findIndex((f) => bear.frames[f].name === name)).reduce((t, f) => t + ms(f), 0);
};

// Цохилтын дараалал (Scott Pilgrim маягийн "juice"): бэлдэх → цохих → сум нисэх → онох агшинд хөлдөх (hit-stop)
// → цагаан анивчилт + оч + дэлгэц чичрэх → хойш түлхэгдэж зөөлөн буцах.
// Зөгийн бал шидэх: савыг ард аваачих (удаан) → smear → гаргах: сав нумаар удаан ниснэ (нүдээр дагахаар) → дагах → буцах
const WINDUP_MS = until('throw', 'throwSmear');
const RELEASE_AT = until('throw', 'release');
const STRIKE_MS = 110;
const FLY_MS = 900;
const HIT_AT = RELEASE_AT + FLY_MS;
const HITSTOP_MS = 80;
// Ойроос сарвуудах: бэлдэх (суух) → 2 хөлөөрөө гүйх → тоормослох → хумсаа өргөх → smear → сарвуудах → урагшаа харж
// эргэх → толин тусгалаар гүйж буцах → тоормослох → эргэж boss руу харна
const READY_MS = span('ready');
// гүйлтийн бүтэн frame-ууд + тоормослох frame (сүүлийн алхам тасрахгүй)
const DASH_MS = span('run') + ms(frames('run')[0]) + span('brake');
const RETURN_MS = span('run') - ms(frames('run')[0]) + span('brake');
const CLAW_HIT = until('claw', 'claw');
// Boss давхиж цохих: нүдээр дагахуйц удаан гулсаж баавгайн яг урд зогсоод, хадуураа өргөж барьснаа дүүжилнэ
const BOSS_DASH_MS = 960;
const BOSS_WINDUP_MS = 240;
const SWING_MS = 140;
const SCYTHE_HOLD_MS = 360;
const BOSS_RETURN_MS = 800;
const TICK_MS = 160; // frame анимацийн хурд (~6 fps, pixel art-ийн хэмнэл)

/** Boss ба баавгайн хөл зогсох шугам (arena-ийн дээд талаас) */
const GROUND = 300;
const BOSS_LEFT = 28;
const BEAR_RIGHT = 44;
const BEAR_SHEET: SpriteKey = 'bear_battle_1050x1188';
const { width: BEAR_W } = frameSize(BEAR_SHEET, bear.frames.length, bear.columns);
/** sheet-ийн pixel → dp */
const PX = BEAR_W / bear.frameSize.w;
/** хөлийн доод ирмэг frame-ийн дээд талаас (dp); доор нь газрын сүүдэр */
const BEAR_FEET = bear.feet * PX;
/** баавгай frame-ийн голд: зүүн, баруун талын хоосон зай (гар сунах, оч) */
const BEAR_PAD = bear.pad * PX;
/** гаргах frame-ийн сарвуу (frame-ийн зүүн дээд булангаас, dp): од эндээс ниснэ */
const PAW = { x: bear.paw[0] * PX, y: bear.paw[1] * PX };
const BLINK = frames('blink')[0];
/** манарсан баавгайн толгойн орой (frame-ийн зүүн дээд булангаас, dp): эргүүлэг үүн дээр эргэлдэнэ */
const HEAD = { x: bear.head[0] * PX, y: bear.head[1] * PX };
const DIZZY: SpriteKey = 'fx_dizzy_sheet_204x26';
const DIZZY_LOOP = [0, 1, 2, 3, 4, 5];
/** дараалан хэдэн удаа цохиулбал баавгай манарна */
const DAZE_AFTER = 2;
/** амь дуусахад унаад хэвтэх frame; сүнс хэвтсэн биеийн дээд талаас (dp) гарч дээшилнэ */
const FALLEN = frames('fall').at(-1) as number;
const DOWN = { x: bear.down[0] * PX, y: bear.down[1] * PX };
const SOUL: SpriteKey = 'fx_soul_sheet_248x122';
const SOUL_LOOP = [0, 1, 2, 3];
const SOUL_RISE = 22;
/** баавгайн шидэх зөгийн балны сав ба boss-д тусаж хагарах эффект (scripts/bear-sprites.ts: PixelLab VFX) */
const HONEY_JAR: SpriteKey = 'btn_honey_jar_30x30';
const SHATTER: SpriteKey = 'fx_honey_shatter_414x456';
const SHATTER_MS = 80; // эх нь 63ms: нүдээр дагахуйц удаан
type Spark = { id: SpriteKey; at: Point; frame: number; frames: number; cols: number; pivot: Point };
const smooth = Easing.inOut(Easing.sin);

type Point = { x: number; y: number };
type BossPose = 'idle' | keyof typeof BOSS_FRAME;
/** сум / оч: нэг зураг эсвэл grid sheet-ийн давталт */
type Fx = { id: SpriteKey; frames: number; cols: number };
const HONEY_SHOT: Fx = { id: HONEY_JAR, frames: 1, cols: 1 };
const MAGIC_SHOT: Fx = { id: 'fx_magic_22x22', frames: 1, cols: 1 };

/** PixelLab-аар хөдөлгөсөн дайсны (golems.json) tag-ийн frame-ууд ба хугацаа */
type Golem = (typeof golems)[keyof typeof golems];
const gFrames = (g: Golem, tag: keyof Golem['tags']) => tagFrames(g, tag);
const gUntil = (g: Golem, tag: keyof Golem['tags'], name: string) => {
  const fs = gFrames(g, tag);
  return fs.slice(0, fs.findIndex((f) => g.frames[f].name === name)).reduce((t, f) => t + g.frames[f].duration, 0);
};

const bossSize = (boss: Boss) => frameSize(boss.battle, boss.frames, boss.cols);

/** Boss-ын нүд ба баавгайн сарвууны од: сум эндээс ниснэ / энд онох */
function aim(boss: Boss, width: number): { boss: Point; bear: Point; bossTop: number } {
  const { width: w, height: h } = bossSize(boss);
  const bossTop = GROUND - h - (boss.floats ? 24 : 0);
  return {
    boss: { x: BOSS_LEFT + w / 2, y: bossTop + h * 0.35 },
    bear: { x: width - BEAR_RIGHT - BEAR_W + PAW.x, y: GROUND - BEAR_FEET + PAW.y },
    bossTop,
  };
}

/** Хариулт бүрт нэг цохилт: сондгой хариултад холоос (баавгай од, boss ид шид), тэгшид давхиж очоод ойроос
 * (баавгай сарвуудна, boss цохино) довтолно; зөв бол баавгай, буруу бол boss довтлогч. */
export interface Strike {
  n: number;
  correct: boolean;
  /** энэ хариултыг оруулаад дараалсан зөвийн тоо: COMBO_AT-аас дээш бол баавгайн хүчтэй skill */
  combo?: number;
}

/**
 * Boss тулааны самбар (хичээлийн дээд самбарын бүтэн дэвсгэр): boss-ын гэр, дүрүүд, сум, оч, HUD. Boss-ын амь =
 * `needed` зөв хариулт, баавгайн зүрх = `hearts` буруу хариулт. Баавгай frame-ээр (pixel бүхэл алхмаар) амьсгалж,
 * нүдээ ирмэж, довтолж, цочино; хөвөхгүй. Sheet-тэй boss (Хулуун шидтэн) мөн frame-ээр хөвж, ид шид шидэж, цочино;
 * дан зурагтай boss цагаан дүрсээр анивчина. `insetTop` = төхөөрөмжийн дээд зай (HUD, дүрүүд түүний доор).
 */
export function BossArena({
  boss,
  hits,
  misses,
  needed,
  hearts,
  strike,
  message,
  insetTop,
}: {
  boss: Boss;
  hits: number;
  misses: number;
  needed: number;
  hearts: number;
  strike: Strike | null;
  message: string;
  insetTop: number;
}) {
  const reduce = useReducedMotion();
  const width = useWindowDimensions().width;
  const won = hits >= needed;
  const lost = misses >= hearts;
  const size = bossSize(boss);
  const { bossTop } = aim(boss, width);
  // PixelLab-аар хөдөлгөсөн дайсан: амьсгалын давталт (idle tag), довтлох/цочих үед `bossAct` frame
  const golem: Golem | null = boss.anim ? golems[boss.anim] : null;
  const [bossIdle, setBossIdle] = useState(golem ? gFrames(golem, 'idle')[0] : 0);
  const [bossAct, setBossAct] = useState<number | null>(null);
  useEffect(() => {
    if (!golem || reduce) return;
    const seq = gFrames(golem, 'idle');
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      const f = seq[i++ % seq.length];
      setBossIdle(f);
      t = setTimeout(next, golem.frames[f].duration);
    };
    next();
    return () => clearTimeout(t);
  }, [golem, reduce]);

  const [tick, setTick] = useState(0);
  const [bossPose, setBossPose] = useState<BossPose>('idle');
  const [weapon, setWeapon] = useState<number | null>(null); // boss-ын зэвсгийн frame (давхиж цохих үед)
  // Баавгай: тайван үед idle tag (амьсгал, ping-pong), хааяа нүдээ ирмэнэ; цохилтын үед `act` (mirror = буцаж гүйх)
  const [idle, setIdle] = useState(frames('idle')[0]);
  const [act, setAct] = useState<{ frame: number; mirror: boolean } | null>(null);
  // Дараалан DAZE_AFTER удаа цохиулбал манарна (толгой унжиж, дээр нь эргүүлэг эргэлдэнэ); дараагийн цохилт хүртэл
  const [dazed, setDazed] = useState(false);
  const wrongRun = useRef({ n: -1, run: 0 });
  // Амь дуусах цохилт: баавгай унаж хэвтээд биеэс нь сүнс гарна
  const [down, setDown] = useState(false);
  // Ялагдсан дайсан: 'play' = эцсийн цохилтоор унаж уусна, 'still' = аль хэдийн ялагдсан (унасан байдлаар)
  const [ko, setKo] = useState<'play' | 'still' | null>(null);
  // ялагдсан дайсантай дараагийн асуултуудад тулаан тоглохгүй (даалгавар 5 асуулт хүртэл үргэлжилнэ)
  const koDone = useRef(false);
  /** дайсныг унагасан цохилтын дугаар (түүний skill эффект дуустал харагдана) */
  const [koN, setKoN] = useState(-1);
  // цохилтгүйгээр (аль хэдийн ялагдсан даалгаврыг дахин нээх, шинэ даалгавар) хэвтсэн/зогссон байдал шууд тогтоно
  useEffect(() => {
    if (strike) return;
    const t = setTimeout(() => {
      setDown(lost);
      if (won && boss.defeat) {
        koDone.current = true;
        setKo((k) => k ?? 'still');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [strike, lost, won, boss.defeat]);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, [reduce]);
  useEffect(() => {
    if (reduce || down) return;
    const seq = frames(dazed ? 'daze' : 'idle');
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      const f = !dazed && i > 0 && i % (seq.length * 3) === 0 ? BLINK : seq[i % seq.length]; // 3 амьсгал тутам ирмэнэ
      i++;
      setIdle(f);
      t = setTimeout(next, ms(f));
    };
    next();
    return () => clearTimeout(t);
  }, [reduce, dazed, down]);
  // Boss хөвөх: 2 tick тутам дараагийн давхарга (0/1/2px), ялагдсан бол газардана
  const hover = bossPose === 'idle' && !won ? HOVER[Math.floor(tick / 2) % HOVER.length] : 0;
  const bossFrame = bossPose === 'idle' ? hover : BOSS_FRAME[bossPose];

  // Сум ба оч: сум үргэлж mount, харагдах эсэхийг shared value удирдана (worklet JS state уншихгүй)
  const [shot, setShot] = useState<Fx>(HONEY_SHOT);
  const [spark, setSpark] = useState<Spark | null>(null);
  const [damage, setDamage] = useState(0); // boss-д онох бүрт шинэ «-1» хөвөн гарна
  const fly = useSharedValue(0);
  const charge = useSharedValue(0); // дайсан skill-ээ гартаа цэнэглэх (0 → 1), шидэх агшинд алга
  const route = useSharedValue({ fx: 0, fy: 0, tx: 0, ty: 0, spin: 0 });
  const bossX = useSharedValue(0);
  const bearX = useSharedValue(0);
  const bossWhite = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  useEffect(() => {
    if (!strike) return;
    // дараалсан буруу хариултын тоо (effect дахин ажиллахад давхар тоолохгүй)
    if (wrongRun.current.n !== strike.n) wrongRun.current = { n: strike.n, run: strike.correct ? 0 : wrongRun.current.run + 1 };
    // `lost` нь strike-тэй нэг render-т өөрчлөгддөг тул энэ effect-ийг дахин тоглуулахгүй
    const dead = !strike.correct && lost;
    const daze = !dead && wrongRun.current.run >= DAZE_AFTER;
    // эцсийн зөв цохилт: дайсан цочихын оронд ялагдлын анимациар унана
    if (koDone.current) return;
    const finish = strike.correct && won && !!boss.defeat;
    if (finish) {
      koDone.current = true;
      setTimeout(() => setKoN(strike.n), 0); // effect дотор шууд setState хийхгүй
    }
    if (reduce) {
      const t = setTimeout(() => {
        setDazed(daze);
        setDown(dead);
        if (finish) setKo('still');
      }, 0);
      return () => clearTimeout(t);
    }
    const at = aim(boss, width);
    const melee = strike.n % 2 === 0; // давхиж очоод ойроос
    const claw = strike.correct && melee;
    const bossDash = !strike.correct && melee;
    const arrive = READY_MS + DASH_MS; // гүйж очоод тоормослож дуусах агшин
    const hitAt = claw ? arrive + CLAW_HIT : bossDash ? BOSS_DASH_MS + BOSS_WINDUP_MS + SWING_MS : HIT_AT;
    const [from, to] = strike.correct ? [at.bear, at.boss] : [at.boss, at.bear];
    const dir = strike.correct ? -1 : 1; // зөв: баавгай зүүн тийш дайрна, boss зүүн тийш түлхэгдэнэ; буруу: эсрэгээрээ
    const [attacker, target]: SharedValue<number>[] = strike.correct ? [bearX, bossX] : [bossX, bearX];

    // boss-ын биеийн баруун зах: PixelLab дайсны frame-д довтолгооны эффектийн хоосон зай байдаг тул биеэр нь
    const bossRight = golem
      ? BOSS_LEFT + ((golem.cx + golem.bw / 2) * bossSize(boss).width) / golem.frameSize.w
      : BOSS_LEFT + bossSize(boss).width;
    const bearBody = width - BEAR_RIGHT - BEAR_W + BEAR_PAD;
    if (claw) {
      // суугаад арагш бага зэрэг (anticipation) → boss-ын дэргэд хүртэл гүйж сарвуудаад → эргэж харан буцаж гүйнэ
      bearX.value = withSequence(
        withTiming(3, { duration: READY_MS, easing: Easing.out(Easing.quad) }),
        withTiming(-(bearBody - bossRight + 8), { duration: DASH_MS, easing: smooth }),
        withDelay(span('claw') + span('turn'), withTiming(0, { duration: RETURN_MS, easing: smooth })),
      );
    } else if (bossDash) {
      // баавгайн яг урд хүртэл гулсаж, хадуураа дүүжлээд буцна
      bossX.value = withSequence(
        withTiming(bearBody - bossRight - 2, { duration: BOSS_DASH_MS, easing: smooth }),
        withDelay(BOSS_WINDUP_MS + SWING_MS + SCYTHE_HOLD_MS, withTiming(0, { duration: BOSS_RETURN_MS, easing: smooth })),
      );
    } else {
      route.value = { fx: from.x, fy: from.y, tx: to.x, ty: to.y, spin: strike.correct ? 1 : 0 };
      setShot(strike.correct ? HONEY_SHOT : (boss.shot ?? MAGIC_SHOT));
      attacker.value = withSequence(
        withTiming(-dir * 7, { duration: WINDUP_MS, easing: Easing.out(Easing.quad) }), // бэлдэх: арагшаа
        withTiming(dir * 26, { duration: RELEASE_AT - WINDUP_MS + STRIKE_MS, easing: Easing.in(Easing.quad) }), // цохих: огцом урагш
        withDelay(FLY_MS, withTiming(0, { duration: 420, easing: smooth })), // буцах
      );
      fly.value = 0;
      fly.value = withDelay(RELEASE_AT, withTiming(1, { duration: FLY_MS, easing: Easing.linear }));
      if (!strike.correct) charge.value = withSequence(withTiming(1, { duration: RELEASE_AT, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: 0 }));
    }
    // hit-stop: оносон тал HITSTOP_MS хөлдөөд дараа нь хойш түлхэгдэнэ
    target.value = withDelay(
      hitAt + HITSTOP_MS,
      withSequence(withTiming(dir * 16, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 420, easing: smooth })),
    );
    const step = (v: number) => withTiming(v, { duration: 35 });
    const k = finish ? 2 : 1; // эцсийн цохилт хүчтэй чичирнэ
    shakeX.value = withDelay(hitAt, withSequence(step(5 * k), step(-4 * k), step(3 * k), step(-2 * k), step(k), step(0)));
    shakeY.value = withDelay(hitAt, withSequence(step(-3 * k), step(2 * k), step(-k), step(0)));
    if (strike.correct && boss.white) {
      bossWhite.value = withDelay(hitAt, withSequence(withTiming(1, { duration: 0 }), withDelay(HITSTOP_MS + 40, withTiming(0, { duration: 120 }))));
    }

    // Pose ба очны frame (JS timer)
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    /** tag-ийн frame-уудыг `t0`-оос өөр өөрийн хугацаагаар; дуусах агшныг буцаана */
    const play = (tag: Tag, t0: number, mirror = false) =>
      frames(tag).reduce((t, f) => {
        later(t, () => setAct({ frame: f, mirror }));
        return t + ms(f);
      }, t0);
    /** `t0`–`t1` хооронд tag-ийг давтана (гүйлт); сүүлийн `tail` ms-ийг дараагийн frame-д үлдээнэ */
    const loop = (tag: Tag, t0: number, t1: number, mirror: boolean) => {
      const fs = frames(tag);
      for (let t = t0, k = 0; t < t1; k++) {
        const f = fs[k % fs.length];
        later(t, () => setAct({ frame: f, mirror }));
        t += ms(f);
      }
    };
    const rest = (t: number) => later(t, () => setAct(null));
    later(0, () => setDazed(false)); // цохилт эхлэхэд манаралаас сэргэнэ
    // оносон boss анивчаад цочино
    const hit = (set: (p: 'flash' | 'hurt' | 'idle') => void) => {
      later(hitAt, () => set('flash'));
      later(hitAt + HITSTOP_MS + 40, () => set('hurt'));
      later(hitAt + 560, () => set('idle'));
    };
    // оносон баавгай: цагаан анивчиж (hit-stop) цочино; дараалан цохиулсан бол толгой нь унжиж манарна
    /** PixelLab дайсны tag-ийг `t0`-оос тоглуулж, дуусмагц амьсгал руу буцна */
    const playBoss = (g: Golem, tag: keyof Golem['tags'], t0: number) => {
      const end = gFrames(g, tag).reduce((t, f) => {
        later(t, () => setBossAct(f));
        return t + g.frames[f].duration;
      }, Math.max(0, t0));
      later(end, () => setBossAct(null));
    };
    /** баавгай онох агшинд boss: PixelLab дайсан цагаан анивчиж цочино, бусад нь pose-оор */
    const bossHit = () => (finish ? later(hitAt, () => setKo('play')) : golem ? playBoss(golem, 'hurt', hitAt) : hit(setBossPose));
    const hurt = () => {
      const end = play('hurt', hitAt);
      if (dead) {
        // ганхаж, өвдөг сулраад ар тийшээ унаж хэвтэнэ → сүнс гарна
        const fallen = play('fall', end);
        return later(fallen, () => {
          setDown(true);
          setAct(null);
        });
      }
      if (!daze) return rest(end);
      const dazedAt = play('dazeIn', end);
      later(dazedAt, () => {
        setDazed(true);
        setAct(null);
      });
    };
    if (claw) {
      play('ready', 0);
      loop('run', READY_MS, arrive - span('brake'), false);
      const turn = play('claw', play('brake', arrive - span('brake')));
      const home = turn + span('turn') + RETURN_MS;
      play('turn', turn);
      loop('run', turn + span('turn'), home - span('brake'), true);
      play('brake', home - span('brake'), true);
      rest(play('turn', home));
      bossHit();
    } else if (strike.correct) {
      rest(play('throw', 0));
      bossHit();
    } else if (golem) {
      // PixelLab дайсан: довтлох хөдөлгөөний онох frame (impact) нь ойроос бол баавгайд хүрэх, холоос бол сум гарах агшинд
      playBoss(golem, 'attack', (bossDash ? hitAt : RELEASE_AT) - gUntil(golem, 'attack', 'impact'));
      hurt();
    } else if (bossDash) {
      // boss хадуураа өргөөд гулсана → баавгайн урд дүүжилж цохино → хадуураа нууж буцна
      setBossPose('dash');
      setWeapon(0);
      later(BOSS_DASH_MS + BOSS_WINDUP_MS, () => {
        setBossPose('strike');
        setWeapon(1);
      });
      later(hitAt, () => setWeapon(2));
      later(hitAt + SCYTHE_HOLD_MS, () => {
        setBossPose('idle');
        setWeapon(null);
      });
      hurt();
    } else {
      later(RELEASE_AT, () => setBossPose('cast'));
      later(HIT_AT + 120, () => setBossPose('idle'));
      hurt();
    }
    // оч: зөгийн бал boss-д тусвал сав хагарч бал цацагдана (7 frame), бусад нь 3 frame-ийн оч
    const honey = strike.correct && !melee;
    // эцсийн цохилт: дайсан дээр алтан KO дэлбэрэлт (унах анимацийн өмнө)
    const skill = skillOf(strike.n, strike.combo ?? 0);
    const fx = finish
      ? { id: 'fx_ko_burst_768x576' as const, frames: 12, cols: 4, pivot: [0.5, 0.5], ms: 70 }
      : strike.correct && skill !== 'honey'
        ? { ...SKILL_HIT[skill], pivot: [0.5, 0.5] }
        : honey
        ? { id: SHATTER, frames: bear.honey.frames, cols: bear.honey.columns, pivot: bear.honey.pivot, ms: SHATTER_MS }
        : !strike.correct && boss.impact
          ? { ...boss.impact, pivot: [0.5, 0.5], ms: 70 }
          : { id: melee ? ('fx_slash_144x48' as const) : strike.correct ? ('fx_spark_90x30' as const) : ('fx_spark_magic_90x30' as const), frames: 3, cols: 3, pivot: [0.5, 0.5], ms: 70 };
    const { width: fw, height: fh } = frameSize(fx.id, fx.frames, fx.cols);
    const pivot = { x: fw * fx.pivot[0], y: fh * fx.pivot[1] };
    for (let frame = 0; frame < fx.frames; frame++)
      later(hitAt + frame * fx.ms, () => setSpark({ id: fx.id, at: to, frame, frames: fx.frames, cols: fx.cols, pivot }));
    later(hitAt + fx.frames * fx.ms, () => setSpark(null));
    if (strike.correct) later(hitAt, () => setDamage((n) => n + 1));
    return () => timers.forEach(clearTimeout);
  }, [strike, lost, won, reduce, boss, golem, width, fly, charge, route, bossX, bearX, bossWhite, shakeX, shakeY]);

  const shotStyle = useAnimatedStyle(() => {
    const p = fly.value;
    const r = route.value;
    return {
      opacity: p > 0 && p < 1 ? 1 : 0,
      transform: [
        { translateX: r.fx + (r.tx - r.fx) * p - 15 },
        { translateY: r.fy + (r.ty - r.fy) * p - Math.sin(Math.PI * p) * 40 - 15 },
        { rotate: `${-p * 540 * r.spin}deg` }, // зөгийн балны сав эргэлдэн ниснэ
      ],
    };
  });
  const chargeStyle = useAnimatedStyle(() => ({
    opacity: charge.value > 0.02 ? 1 : 0,
    transform: [{ translateX: route.value.fx - 15 }, { translateY: route.value.fy - 15 }, { scale: 0.25 + charge.value * 0.75 }],
  }));
  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }] }));

  // Ялагдсан boss бүдгэрнэ (онсны дараа); ялагдсан баавгай бүдгэрэхгүй — унаж хэвтээд сүнс нь гарна
  const bossFade = useSharedValue(1);
  useEffect(() => {
    bossFade.value = withDelay(reduce ? 0 : HIT_AT + HITSTOP_MS, withTiming(won && !boss.defeat ? 0.2 : 1, { duration: 500 }));
  }, [won, reduce, bossFade, boss.defeat]);
  const bossStyle = useAnimatedStyle(() => ({ opacity: bossFade.value, transform: [{ translateX: bossX.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bossX.value }] }));
  const bossWhiteStyle = useAnimatedStyle(() => ({ opacity: bossWhite.value }));
  const bearStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bearX.value }] }));

  const bossLeft = Math.max(0, needed - hits);
  const heartsLeft = Math.max(0, hearts - misses);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Дэлхий (дэвсгэр + дүрүүд + сум) цохилтоор чичирнэ; HUD хөдлөхгүй */}
      <Animated.View style={[StyleSheet.absoluteFill, worldStyle]}>
        <Sprite id={boss.lair} style={styles.lair} />
        <View style={[StyleSheet.absoluteFill, { top: insetTop }]}>
          {boss.floats ? (
            // сүүдэр хөвөх frame-тэй хамт жижгэрнэ
            <Animated.View
              style={[styles.shadow, { width: 68 - hover * 10, left: BOSS_LEFT + size.width / 2 - 34 + hover * 5, top: GROUND - 6 }, shadowStyle]}
            />
          ) : null}
          {/* Довтолж буй тал баавгай/boss-ын урд зурагдана (давхиж очихдоо ард нь нуугдахгүй) */}
          <Animated.View
            style={[
              styles.abs,
              { left: BOSS_LEFT, top: bossTop, zIndex: bossPose === 'dash' || bossPose === 'strike' || bossAct !== null ? 3 : 1 },
              bossStyle,
            ]}
          >
            {/* өргөсөн хадуур толгойн ард, дүүжлэхэд урд */}
            {weapon === 0 && boss.weapon ? <Weapon {...boss.weapon} frame={0} /> : null}
            {/* ялагдсан үед тулааны дүр нуугдана (хэмжээ нь хэвээр: ялагдлын sheet түүнтэй ижил байрлалд) */}
            <View style={ko && boss.defeat ? styles.gone : null}>
              {golem ? (
                <SheetFrame id={boss.battle} frames={boss.frames} cols={boss.cols} frame={bossAct ?? bossIdle} label={boss.name} />
              ) : boss.frames > 1 ? (
                <SheetFrame id={boss.battle} frames={boss.frames} frame={bossFrame} label={boss.name} />
              ) : (
                <Motion preset="breathe" originBottom>
                  <Sprite id={boss.battle} label={boss.name} />
                  {boss.white ? (
                    <Animated.View style={[StyleSheet.absoluteFill, bossWhiteStyle]}>
                      <Sprite id={boss.white} />
                    </Animated.View>
                  ) : null}
                </Motion>
              )}
            </View>
            {boss.defeat ? (
              <DefeatAnim id={boss.defeat.id} k={boss.defeat.k} active={!!ko} still={ko === 'still'} drop={boss.floats ? 24 : 0} label={boss.name} />
            ) : null}
            {weapon !== null && weapon > 0 && boss.weapon ? <Weapon {...boss.weapon} frame={weapon} /> : null}
          </Animated.View>

          <Animated.View style={[styles.abs, { right: BEAR_RIGHT, top: GROUND - BEAR_FEET, zIndex: 2 }, bearStyle]}>
            {/* буцахдаа толин тусгал: бие frame-ийн голд тул байрнаасаа хөдлөхгүй */}
            <View style={act?.mirror ? styles.mirror : null}>
              <SheetFrame
                id={BEAR_SHEET}
                frames={bear.frames.length}
                cols={bear.columns}
                frame={act?.frame ?? (down ? FALLEN : reduce && dazed ? frames('daze')[0] : idle)}
                label={dazed ? S.boss.bearDazed : S.boss.bear}
              />
            </View>
            {down && !act ? <Soul reduce={reduce} /> : null}
            {dazed && !act && !down ? (
              <View style={[styles.abs, { left: HEAD.x - 17, top: HEAD.y - 24 }]}>
                <SheetLoop id={DIZZY} frames={DIZZY_LOOP.length} loop={DIZZY_LOOP} ms={110} />
              </View>
            ) : null}
          </Animated.View>

          {strike?.correct && !reduce && ko !== 'still' && (koN === -1 || koN === strike.n) ? (
            <BearSkillFx
              n={strike.n}
              skill={skillOf(strike.n, strike.combo ?? 0)}
              bearFeet={{ x: width - BEAR_RIGHT - BEAR_W / 2, y: GROUND }}
              bossFeet={{ x: BOSS_LEFT + (golem ? (golem.cx * size.width) / golem.frameSize.w : size.width / 2), y: GROUND }}
              runAt={READY_MS}
              hitAt={strike.n % 2 === 0 ? READY_MS + DASH_MS + CLAW_HIT : HIT_AT}
              releaseAt={RELEASE_AT}
            />
          ) : null}
          {shot.frames > 1 ? (
            <Animated.View style={[styles.abs, styles.origin, styles.shot, chargeStyle]}>
              <SheetLoop id={shot.id} frames={shot.frames} cols={shot.cols} loop={Array.from({ length: shot.frames }, (_, i) => i)} ms={80} />
            </Animated.View>
          ) : null}
          <Animated.View style={[styles.abs, styles.origin, styles.shot, shotStyle]}>
            {shot.frames > 1 ? (
              <SheetLoop id={shot.id} frames={shot.frames} cols={shot.cols} loop={Array.from({ length: shot.frames }, (_, i) => i)} ms={80} />
            ) : (
              <Sprite id={shot.id} />
            )}
          </Animated.View>
          {spark ? (
            <View style={[styles.abs, { zIndex: 4, left: spark.at.x - spark.pivot.x, top: spark.at.y - spark.pivot.y }]}>
              <SheetFrame id={spark.id} frames={spark.frames} cols={spark.cols} frame={spark.frame} />
            </View>
          ) : null}
          {damage > 0 ? <Damage key={damage} at={aim(boss, width).boss} reduce={reduce} /> : null}
        </View>
      </Animated.View>

      {/* Довтолгоонд л гардаг зургуудыг урьдчилж ачаална: анх гарах агшинд хоосон харагдаж "алга болохгүй" */}
      <View style={styles.preload}>
        {['fx_slash_144x48', 'fx_spark_90x30', 'fx_spark_magic_90x30', 'fx_magic_22x22', HONEY_JAR, SHATTER, boss.weapon?.sheet, boss.white, boss.shot?.id, boss.impact?.id, boss.defeat?.id, 'fx_ko_burst_768x576']
          .filter((id): id is SpriteKey => !!id)
          .map((id) => (
            <Sprite key={id} id={id} />
          ))}
      </View>

      <View style={[StyleSheet.absoluteFill, { top: insetTop }]}>
        {/* Тулааны тоглоомын маягийн амийн зурвас: boss зүүн, баавгай баруун; амь нь голоос гадагш биш, гаднаас голруу хасагдана */}
        <View style={styles.bars}>
          <HpBar side="left" name={boss.name} value={bossLeft / needed} segments={needed} label={S.boss.hpLabel(boss.name, bossLeft, needed)} />
          <Sprite id="hud_skull_34x30" style={styles.skull} />
          <HpBar side="right" name={S.boss.bearName} value={heartsLeft / hearts} segments={hearts} label={S.boss.heartsLabel(heartsLeft, hearts)} />
        </View>

        {/* алдаа зэрэг хоосон үед хөөс гарахгүй (тайлбар нь доорх самбарт) */}
        {message ? (
          <Pop trigger={message} from={0.85} style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{message}</Text>
            </View>
          </Pop>
        ) : null}

      </View>
    </View>
  );
}

/**
 * Амийн зурвас: ясан дэгээтэй бараан хүрээ, хэсэгт хуваагдсан улаан амь. Хасагдсан хэсэг эхлээд шар-улбараар үлдэж,
 * хэсэг хугацааны дараа хорогдоно (цохилтын хэмжээ харагдана).
 */
function HpBar({ side, name, value, segments, label }: { side: 'left' | 'right'; name: string; value: number; segments: number; label: string }) {
  const [chip, setChip] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setChip(value), value < chip ? 650 : 0);
    return () => clearTimeout(t);
  }, [value, chip]);
  const left = side === 'left';
  const anchor = left ? { right: 0 } : { left: 0 };
  return (
    <View style={styles.barCol} accessible accessibilityLabel={label}>
      <View style={styles.barBody}>
        <View style={styles.barTrack}>
          <AnimatedBar value={chip} color="#FFB347" height={16} style={[styles.barFill, anchor]} />
          <AnimatedBar value={value} color="#D8323F" height={16} style={[styles.barFill, styles.barRed, anchor]} />
          {Array.from({ length: segments - 1 }, (_, k) => (
            <View key={k} style={[styles.barDivider, { left: `${((k + 1) / segments) * 100}%` }]} />
          ))}
        </View>
        <Sprite id="hud_cap_20x28" style={[styles.cap, left ? { left: -12 } : { right: -12, transform: [{ scaleX: -1 }] }]} />
      </View>
      <Text style={[styles.barName, { textAlign: left ? 'left' : 'right' }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/** Хэвтсэн биеэс гарах сүнс: тодорч, ганхаж дээшилснээ агаарт зөөлөн хөвнө. */
function Soul({ reduce }: { reduce: boolean }) {
  const rise = useSharedValue(reduce ? 1 : 0);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    rise.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
    bob.value = withDelay(2200, withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, rise, bob]);
  const { width: w, height: h } = frameSize(SOUL, SOUL_LOOP.length);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 3) * 0.85,
    transform: [
      { translateY: -rise.value * SOUL_RISE - bob.value * 5 },
      { translateX: Math.sin(rise.value * Math.PI * 3) * 4 * (1 - rise.value) },
    ],
  }));
  return (
    <Animated.View style={[styles.abs, { left: DOWN.x - w / 2, top: DOWN.y - h + 72 }, style]}>
      <SheetLoop id={SOUL} frames={SOUL_LOOP.length} loop={SOUL_LOOP} ms={180} label={S.boss.bearSoul} />
    </Animated.View>
  );
}

/** Boss-д онох агшинд «-1» хохирол: дээш хөвж томроод бүдгэрнэ. */
function Damage({ at, reduce }: { at: Point; reduce: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = reduce ? 1 : withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [t, reduce]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
    transform: [{ translateY: -t.value * 44 }, { scale: t.value < 0.15 ? 0.6 + t.value * 4 : 1.2 - (t.value - 0.15) * 0.2 }],
  }));
  return (
    <Animated.View style={[styles.abs, styles.damage, { left: at.x - 30, top: at.y - 34 }, style]}>
      <Text style={styles.damageText}>-1</Text>
    </Animated.View>
  );
}

function Weapon({ sheet, left, top, frame }: { sheet: SpriteKey; left: number; top: number; frame: number }) {
  return (
    <View style={[styles.abs, { left, top }]}>
      <SheetFrame id={sheet} frames={3} frame={frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  preload: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  mirror: { transform: [{ scaleX: -1 }] },
  gone: { opacity: 0 },
  origin: { left: 0, top: 0, zIndex: 4 },
  shot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  damage: { width: 60, alignItems: 'center', zIndex: 5 },
  damageText: {
    fontFamily: fonts.pixel,
    fontSize: 28,
    color: colors.lemon,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  // boss-ын гэр: доод талдаа наалдаж, хэвтээгээр төвлөрнө (430 dp өргөн тул нарийн дэлгэцэнд хоёр захаас тайрагдана)
  lair: { position: 'absolute', bottom: 0, left: '50%', marginLeft: -215 },
  bars: { position: 'absolute', left: 22, right: 22, top: 56, flexDirection: 'row', alignItems: 'flex-start' },
  barCol: { flex: 1, gap: 4 },
  // pixel хүрээ: 2dp бараан тойм → 2dp ягаан ирмэг → амийн зам (радиусгүй)
  barBody: { height: 24, borderWidth: 2, borderColor: '#150F24', backgroundColor: '#3B2D5C', padding: 2 },
  barTrack: { flex: 1, backgroundColor: '#241A36', overflow: 'hidden' },
  barFill: { position: 'absolute', top: 0, borderRadius: 0 },
  // дээд талдаа гэрэл, доод талдаа сүүдрийн зурвас (pixel banding)
  barRed: { borderTopWidth: 4, borderTopColor: '#FF7A7A', borderBottomWidth: 3, borderBottomColor: '#9C1F33' },
  barDivider: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: '#150F24' },
  cap: { position: 'absolute', top: -4 },
  skull: { marginHorizontal: -3, marginTop: -3, zIndex: 1 },
  barName: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors.white,
    textShadowColor: '#150F24',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  bubbleWrap: { position: 'absolute', right: 20, top: 104, maxWidth: 170 },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink },
  shadow: { position: 'absolute', height: 12, borderRadius: radius.pill, backgroundColor: colors.ink, opacity: 0.2 },
});
