import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedBar, frameSize, Motion, Pop, SheetFrame, Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { tagFrames } from '@/lib/pixelBear/anim';
import bear from '@/lib/pixelBear/bear.json';
import { BOSS_FRAME, type Boss, HOVER } from '@/lib/pixelBear/path';
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
const BEAR_SHEET: SpriteKey = 'bear_battle_896x780';
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
/** баавгайн шидэх зөгийн балны сав ба boss-д тусаж хагарах эффект (scripts/bear-sprites.ts: PixelLab VFX) */
const HONEY_JAR: SpriteKey = 'btn_honey_30x30';
const SHATTER: SpriteKey = 'fx_honey_shatter_414x456';
const SHATTER_MS = 80; // эх нь 63ms: нүдээр дагахуйц удаан
type Spark = { id: SpriteKey; at: Point; frame: number; frames: number; cols: number; pivot: Point };
const smooth = Easing.inOut(Easing.sin);

type Point = { x: number; y: number };
type BossPose = 'idle' | keyof typeof BOSS_FRAME;

/** Boss-ын нүд ба баавгайн сарвууны од: сум эндээс ниснэ / энд онох */
function aim(boss: Boss, width: number): { boss: Point; bear: Point; bossTop: number } {
  const { width: w, height: h } = frameSize(boss.battle, boss.frames);
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
  const size = frameSize(boss.battle, boss.frames);
  const { bossTop } = aim(boss, width);

  const [tick, setTick] = useState(0);
  const [bossPose, setBossPose] = useState<BossPose>('idle');
  const [weapon, setWeapon] = useState<number | null>(null); // boss-ын зэвсгийн frame (давхиж цохих үед)
  // Баавгай: тайван үед idle tag (амьсгал, ping-pong), хааяа нүдээ ирмэнэ; цохилтын үед `act` (mirror = буцаж гүйх)
  const [idle, setIdle] = useState(frames('idle')[0]);
  const [act, setAct] = useState<{ frame: number; mirror: boolean } | null>(null);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, [reduce]);
  useEffect(() => {
    if (reduce) return;
    const seq = frames('idle');
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      const f = i > 0 && i % (seq.length * 3) === 0 ? BLINK : seq[i % seq.length]; // 3 амьсгал тутам ирмэнэ
      i++;
      setIdle(f);
      t = setTimeout(next, ms(f));
    };
    next();
    return () => clearTimeout(t);
  }, [reduce]);
  // Boss хөвөх: 2 tick тутам дараагийн давхарга (0/1/2px), ялагдсан бол газардана
  const hover = bossPose === 'idle' && !won ? HOVER[Math.floor(tick / 2) % HOVER.length] : 0;
  const bossFrame = bossPose === 'idle' ? hover : BOSS_FRAME[bossPose];

  // Сум ба оч: сум үргэлж mount, харагдах эсэхийг shared value удирдана (worklet JS state уншихгүй)
  const [shot, setShot] = useState<SpriteKey>(HONEY_JAR);
  const [spark, setSpark] = useState<Spark | null>(null);
  const [damage, setDamage] = useState(0); // boss-д онох бүрт шинэ «-1» хөвөн гарна
  const fly = useSharedValue(0);
  const route = useSharedValue({ fx: 0, fy: 0, tx: 0, ty: 0, spin: 0 });
  const bossX = useSharedValue(0);
  const bearX = useSharedValue(0);
  const bossWhite = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  useEffect(() => {
    if (!strike || reduce) return;
    const at = aim(boss, width);
    const melee = strike.n % 2 === 0; // давхиж очоод ойроос
    const claw = strike.correct && melee;
    const bossDash = !strike.correct && melee;
    const arrive = READY_MS + DASH_MS; // гүйж очоод тоормослож дуусах агшин
    const hitAt = claw ? arrive + CLAW_HIT : bossDash ? BOSS_DASH_MS + BOSS_WINDUP_MS + SWING_MS : HIT_AT;
    const [from, to] = strike.correct ? [at.bear, at.boss] : [at.boss, at.bear];
    const dir = strike.correct ? -1 : 1; // зөв: баавгай зүүн тийш дайрна, boss зүүн тийш түлхэгдэнэ; буруу: эсрэгээрээ
    const [attacker, target]: SharedValue<number>[] = strike.correct ? [bearX, bossX] : [bossX, bearX];

    const bossRight = BOSS_LEFT + frameSize(boss.battle, boss.frames).width;
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
      setShot(strike.correct ? HONEY_JAR : 'fx_magic_22x22');
      attacker.value = withSequence(
        withTiming(-dir * 7, { duration: WINDUP_MS, easing: Easing.out(Easing.quad) }), // бэлдэх: арагшаа
        withTiming(dir * 26, { duration: RELEASE_AT - WINDUP_MS + STRIKE_MS, easing: Easing.in(Easing.quad) }), // цохих: огцом урагш
        withDelay(FLY_MS, withTiming(0, { duration: 420, easing: smooth })), // буцах
      );
      fly.value = 0;
      fly.value = withDelay(RELEASE_AT, withTiming(1, { duration: FLY_MS, easing: Easing.linear }));
    }
    // hit-stop: оносон тал HITSTOP_MS хөлдөөд дараа нь хойш түлхэгдэнэ
    target.value = withDelay(
      hitAt + HITSTOP_MS,
      withSequence(withTiming(dir * 16, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 420, easing: smooth })),
    );
    const step = (v: number) => withTiming(v, { duration: 35 });
    shakeX.value = withDelay(hitAt, withSequence(step(5), step(-4), step(3), step(-2), step(1), step(0)));
    shakeY.value = withDelay(hitAt, withSequence(step(-3), step(2), step(-1), step(0)));
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
    // оносон boss анивчаад цочино
    const hit = (set: (p: 'flash' | 'hurt' | 'idle') => void) => {
      later(hitAt, () => set('flash'));
      later(hitAt + HITSTOP_MS + 40, () => set('hurt'));
      later(hitAt + 560, () => set('idle'));
    };
    // оносон баавгай: цагаан анивчиж (hit-stop) цочино
    const hurt = () => rest(play('hurt', hitAt));
    if (claw) {
      play('ready', 0);
      loop('run', READY_MS, arrive - span('brake'), false);
      const turn = play('claw', play('brake', arrive - span('brake')));
      const home = turn + span('turn') + RETURN_MS;
      play('turn', turn);
      loop('run', turn + span('turn'), home - span('brake'), true);
      play('brake', home - span('brake'), true);
      rest(play('turn', home));
      hit(setBossPose);
    } else if (strike.correct) {
      rest(play('throw', 0));
      hit(setBossPose);
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
    const fx = honey
      ? { id: SHATTER, frames: bear.honey.frames, cols: bear.honey.columns, pivot: { x: bear.honey.pivot[0] * 2, y: bear.honey.pivot[1] * 2 }, ms: SHATTER_MS }
      : { id: melee ? ('fx_slash_144x48' as const) : strike.correct ? ('fx_spark_90x30' as const) : ('fx_spark_magic_90x30' as const), frames: 3, cols: 3, pivot: null, ms: 70 };
    const { width: fw, height: fh } = frameSize(fx.id, fx.frames, fx.cols);
    const pivot = fx.pivot ?? { x: fw / 2, y: fh / 2 };
    for (let frame = 0; frame < fx.frames; frame++)
      later(hitAt + frame * fx.ms, () => setSpark({ id: fx.id, at: to, frame, frames: fx.frames, cols: fx.cols, pivot }));
    later(hitAt + fx.frames * fx.ms, () => setSpark(null));
    if (strike.correct) later(hitAt, () => setDamage((n) => n + 1));
    return () => timers.forEach(clearTimeout);
  }, [strike, reduce, boss, width, fly, route, bossX, bearX, bossWhite, shakeX, shakeY]);

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
  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }] }));

  // Ялагдсан тал бүдгэрнэ (онсны дараа)
  const bossFade = useSharedValue(1);
  const bearFade = useSharedValue(1);
  useEffect(() => {
    bossFade.value = withDelay(reduce ? 0 : HIT_AT + HITSTOP_MS, withTiming(won ? 0.2 : 1, { duration: 500 }));
    bearFade.value = withDelay(reduce ? 0 : HIT_AT + HITSTOP_MS, withTiming(lost ? 0.45 : 1, { duration: 500 }));
  }, [won, lost, reduce, bossFade, bearFade]);
  const bossStyle = useAnimatedStyle(() => ({ opacity: bossFade.value, transform: [{ translateX: bossX.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bossX.value }] }));
  const bossWhiteStyle = useAnimatedStyle(() => ({ opacity: bossWhite.value }));
  const bearStyle = useAnimatedStyle(() => ({ opacity: bearFade.value, transform: [{ translateX: bearX.value }] }));

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
            style={[styles.abs, { left: BOSS_LEFT, top: bossTop, zIndex: bossPose === 'dash' || bossPose === 'strike' ? 3 : 1 }, bossStyle]}
          >
            {/* өргөсөн хадуур толгойн ард, дүүжлэхэд урд */}
            {weapon === 0 && boss.weapon ? <Weapon {...boss.weapon} frame={0} /> : null}
            {boss.frames > 1 ? (
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
            {weapon !== null && weapon > 0 && boss.weapon ? <Weapon {...boss.weapon} frame={weapon} /> : null}
          </Animated.View>

          <Animated.View style={[styles.abs, { right: BEAR_RIGHT, top: GROUND - BEAR_FEET, zIndex: 2 }, bearStyle]}>
            {/* буцахдаа толин тусгал: бие frame-ийн голд тул байрнаасаа хөдлөхгүй */}
            <View style={act?.mirror ? styles.mirror : null}>
              <SheetFrame id={BEAR_SHEET} frames={bear.frames.length} cols={bear.columns} frame={act?.frame ?? idle} label={S.boss.bear} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.abs, styles.origin, styles.shot, shotStyle]}>
            <Sprite id={shot} />
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
        {['fx_slash_144x48', 'fx_spark_90x30', 'fx_spark_magic_90x30', 'fx_magic_22x22', HONEY_JAR, SHATTER, boss.weapon?.sheet, boss.white]
          .filter((id): id is SpriteKey => !!id)
          .map((id) => (
            <Sprite key={id} id={id} />
          ))}
      </View>

      <View style={[StyleSheet.absoluteFill, { top: insetTop }]}>
        <View style={styles.hp} accessible accessibilityLabel={S.boss.hpLabel(boss.name, bossLeft, needed)}>
          <Text style={styles.hpName} numberOfLines={1}>
            {boss.name}
          </Text>
          <View style={styles.hpTrack}>
            <AnimatedBar value={bossLeft / needed} color={colors.pink} height={12} />
          </View>
        </View>

        <Pop trigger={message} from={0.85} style={styles.bubbleWrap}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{message}</Text>
          </View>
        </Pop>

        <View style={[styles.hearts, { top: GROUND - 160 }]} accessible accessibilityLabel={S.boss.heartsLabel(heartsLeft, hearts)}>
          {Array.from({ length: hearts }, (_, i) => (
            <Sprite key={i} id="icon_heart_24x24" style={i < heartsLeft ? null : styles.heartLost} />
          ))}
        </View>
      </View>
    </View>
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
  hp: { position: 'absolute', left: 24, top: 56, width: 150, gap: 6 },
  hpName: { fontFamily: fonts.extrabold, fontSize: 13, letterSpacing: 0.4, color: colors.white },
  hpTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  bubbleWrap: { position: 'absolute', right: 20, top: 52, maxWidth: 170 },
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
  hearts: { position: 'absolute', right: 30, flexDirection: 'row', gap: 4 },
  heartLost: { opacity: 0.25 },
  shadow: { position: 'absolute', height: 12, borderRadius: radius.pill, backgroundColor: colors.ink, opacity: 0.2 },
});
