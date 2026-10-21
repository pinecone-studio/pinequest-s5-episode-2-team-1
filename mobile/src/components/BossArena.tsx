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
import { BOSS_FRAME, type Boss, HOVER } from '@/lib/pixelBear/path';
import type { SpriteKey } from '@/sprites';

// Цохилтын дараалал (Scott Pilgrim маягийн "juice"): бэлдэх → цохих → сум нисэх → онох агшинд хөлдөх (hit-stop)
// → цагаан анивчилт + оч + дэлгэц чичрэх → хойш түлхэгдэж зөөлөн буцах.
// Од шидэх: гараа хажуугаар өргөх (90) → толгойн хажууд оч (90) → цэнэглэх (120) → smear (SMEAR) → гаргах: од ниснэ
const WINDUP_MS = 300;
const SMEAR_MS = 70; // хурдан хөдөлгөөний нэг frame
const STRIKE_MS = 110;
const FLY_MS = 360;
const RELEASE_AT = WINDUP_MS + SMEAR_MS;
const HIT_AT = RELEASE_AT + FLY_MS;
const HITSTOP_MS = 80;
// Ойроос сарвуудах: 2 хөлөөрөө гүйж очоод хумсаа өргөж (smear) сарвуудна; эргэж харан гүйж буцаад дахин boss руу эргэнэ
const RUN_STEP_MS = 96; // 8 frame-ийн гүйлтийн цикл (~1.3 алхам/сек)
const DASH_MS = RUN_STEP_MS * 10;
const CLAW_UP_MS = 140;
const CLAW_HOLD_MS = 220;
const TURN_MS = 110; // урагшаа харсан frame (эргэх агшин)
const RETURN_MS = RUN_STEP_MS * 8;
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
const BEAR_SHEET: SpriteKey = 'bear_battle_1344x122';
const BEAR_FRAMES = 14;
const { width: BEAR_W, height: BEAR_H } = frameSize(BEAR_SHEET, BEAR_FRAMES);
/** bear_battle frame-ууд (docs/design/pixel-bear/tools/bear_moves.py battle) */
const F = {
  idle: 0, breathe: 1, blink: 2, raise: 3, spark: 4, charge: 5, throwSmear: 6, attack: 7, follow: 8,
  hurt: 9, flash: 10, clawUp: 11, clawSmear: 12, claw: 13,
} as const;
/** Баавгай frame-ийн голд: зүүн, баруун талын 14dp хоосон (гар сунах зай) */
const BEAR_PAD = 14;
/** Гаргах frame-ийн сарвуу (frame-ийн зүүн дээд булангаас, dp): од эндээс ниснэ */
const PAW = { x: 0, y: 64 };
/** 2 хөлөөр гүйх 8 frame + урагшаа харсан (эргэх) frame (bear_moves.py run); буцахдаа толин тусгалаар */
const RUN: SpriteKey = 'bear_run_864x122';
const RUN_FRAMES = 9;
const FRONT = 8;
const smooth = Easing.inOut(Easing.sin);

type Point = { x: number; y: number };
type Pose = keyof typeof F;
type BossPose = 'idle' | keyof typeof BOSS_FRAME;

/** Boss-ын нүд ба баавгайн сарвууны од: сум эндээс ниснэ / энд онох */
function aim(boss: Boss, width: number): { boss: Point; bear: Point; bossTop: number } {
  const { width: w, height: h } = frameSize(boss.battle, boss.frames);
  const bossTop = GROUND - h - (boss.floats ? 24 : 0);
  return {
    boss: { x: BOSS_LEFT + w / 2, y: bossTop + h * 0.35 },
    bear: { x: width - BEAR_RIGHT - BEAR_W + PAW.x, y: GROUND - BEAR_H + PAW.y },
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

  // Баавгайн frame: тайван үед амьсгалж (4 tick тутам), хааяа нүдээ ирмэнэ; цохилтын үед pose-ийн frame
  const [tick, setTick] = useState(0);
  const [pose, setPose] = useState<Pose>('idle');
  const [bossPose, setBossPose] = useState<BossPose>('idle');
  const [weapon, setWeapon] = useState<number | null>(null); // boss-ын зэвсгийн frame (давхиж цохих үед)
  const [run, setRun] = useState<{ frame: number; back: boolean } | null>(null); // гүйж буй frame (back = буцаж)
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, [reduce]);
  const idleFrame = tick % 23 === 22 ? F.blink : tick % 8 < 4 ? F.idle : F.breathe;
  const bearFrame = pose === 'idle' ? idleFrame : F[pose];
  // Boss хөвөх: 2 tick тутам дараагийн давхарга (0/1/2px), ялагдсан бол газардана
  const hover = bossPose === 'idle' && !won ? HOVER[Math.floor(tick / 2) % HOVER.length] : 0;
  const bossFrame = bossPose === 'idle' ? hover : BOSS_FRAME[bossPose];

  // Сум ба оч: сум үргэлж mount, харагдах эсэхийг shared value удирдана (worklet JS state уншихгүй)
  const [shot, setShot] = useState<SpriteKey>('icon_star_24x24');
  const [spark, setSpark] = useState<{ id: SpriteKey; at: Point; frame: number } | null>(null);
  const fly = useSharedValue(0);
  const route = useSharedValue({ fx: 0, fy: 0, tx: 0, ty: 0 });
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
    const hitAt = claw ? DASH_MS + CLAW_UP_MS + SMEAR_MS : bossDash ? BOSS_DASH_MS + BOSS_WINDUP_MS + SWING_MS : HIT_AT;
    const [from, to] = strike.correct ? [at.bear, at.boss] : [at.boss, at.bear];
    const dir = strike.correct ? -1 : 1; // зөв: баавгай зүүн тийш дайрна, boss зүүн тийш түлхэгдэнэ; буруу: эсрэгээрээ
    const [attacker, target]: SharedValue<number>[] = strike.correct ? [bearX, bossX] : [bossX, bearX];

    const bossRight = BOSS_LEFT + frameSize(boss.battle, boss.frames).width;
    const bearBody = width - BEAR_RIGHT - BEAR_W + BEAR_PAD;
    if (claw) {
      // boss-ын дэргэд хүртэл гүйж, сарвуудаад эргэж харан буцаж гүйнэ
      bearX.value = withSequence(
        withTiming(-(bearBody - bossRight + 8), { duration: DASH_MS, easing: smooth }),
        withDelay(CLAW_UP_MS + SMEAR_MS + CLAW_HOLD_MS + TURN_MS, withTiming(0, { duration: RETURN_MS, easing: smooth })),
      );
    } else if (bossDash) {
      // баавгайн яг урд хүртэл гулсаж, хадуураа дүүжлээд буцна
      bossX.value = withSequence(
        withTiming(bearBody - bossRight - 2, { duration: BOSS_DASH_MS, easing: smooth }),
        withDelay(BOSS_WINDUP_MS + SWING_MS + SCYTHE_HOLD_MS, withTiming(0, { duration: BOSS_RETURN_MS, easing: smooth })),
      );
    } else {
      route.value = { fx: from.x, fy: from.y, tx: to.x, ty: to.y };
      setShot(strike.correct ? 'icon_star_24x24' : 'fx_magic_22x22');
      attacker.value = withSequence(
        withTiming(-dir * 7, { duration: WINDUP_MS, easing: Easing.out(Easing.quad) }), // бэлдэх: арагшаа
        withTiming(dir * 26, { duration: SMEAR_MS + STRIKE_MS, easing: Easing.in(Easing.quad) }), // цохих: огцом урагш
        withDelay(FLY_MS, withTiming(0, { duration: 420, easing: smooth })), // буцах
      );
      fly.value = 0;
      fly.value = withDelay(RELEASE_AT, withTiming(1, { duration: FLY_MS, easing: Easing.in(Easing.quad) }));
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
    const running = (t0: number, t1: number, back: boolean) => {
      for (let t = t0, k = 0; t < t1; t += RUN_STEP_MS, k++) later(t, () => setRun({ frame: k % 8, back }));
    };
    // оносон тал анивчаад цочино
    const hit = (set: (p: 'flash' | 'hurt' | 'idle') => void) => {
      later(hitAt, () => set('flash'));
      later(hitAt + HITSTOP_MS + 40, () => set('hurt'));
      later(hitAt + 560, () => set('idle'));
    };
    if (claw) {
      // гүйх → хумсаа өргөх → smear → сарвуудах → урагшаа харж эргэх → толин тусгалаар гүйж буцах → эргэх → зогсох
      running(0, DASH_MS, false);
      later(DASH_MS, () => {
        setRun(null);
        setPose('clawUp');
      });
      later(DASH_MS + CLAW_UP_MS, () => setPose('clawSmear'));
      later(hitAt, () => setPose('claw'));
      const turn = hitAt + CLAW_HOLD_MS;
      later(turn, () => setRun({ frame: FRONT, back: false }));
      running(turn + TURN_MS, turn + TURN_MS + RETURN_MS, true);
      later(turn + TURN_MS + RETURN_MS, () => setRun({ frame: FRONT, back: false }));
      later(turn + TURN_MS * 2 + RETURN_MS, () => {
        setRun(null);
        setPose('idle');
      });
      hit(setBossPose);
    } else if (strike.correct) {
      // шидэх: гараа хажуугаар өргөж оч → толгойн хажууд од цэнэглэгдэнэ → smear → гаргаж гэрэл тэсэрнэ → дагах
      setPose('raise');
      later(90, () => setPose('spark'));
      later(180, () => setPose('charge'));
      later(WINDUP_MS, () => setPose('throwSmear'));
      later(RELEASE_AT, () => setPose('attack'));
      later(RELEASE_AT + 140, () => setPose('follow'));
      later(HIT_AT + 120, () => setPose('idle'));
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
      hit(setPose);
    } else {
      later(RELEASE_AT, () => setBossPose('cast'));
      later(HIT_AT + 120, () => setBossPose('idle'));
      hit(setPose);
    }
    const sparkId: SpriteKey = melee ? 'fx_slash_144x48' : strike.correct ? 'fx_spark_90x30' : 'fx_spark_magic_90x30';
    [0, 1, 2].forEach((frame) => later(hitAt + frame * 70, () => setSpark({ id: sparkId, at: to, frame })));
    later(hitAt + 210, () => setSpark(null));
    return () => timers.forEach(clearTimeout);
  }, [strike, reduce, boss, width, fly, route, bossX, bearX, bossWhite, shakeX, shakeY]);

  const shotStyle = useAnimatedStyle(() => {
    const p = fly.value;
    const r = route.value;
    return {
      opacity: p > 0 && p < 1 ? 1 : 0,
      transform: [
        { translateX: r.fx + (r.tx - r.fx) * p - 12 },
        { translateY: r.fy + (r.ty - r.fy) * p - Math.sin(Math.PI * p) * 40 - 12 },
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

          <Animated.View style={[styles.abs, { right: BEAR_RIGHT, top: GROUND - BEAR_H, zIndex: 2 }, bearStyle]}>
            {run === null ? (
              <SheetFrame id={BEAR_SHEET} frames={BEAR_FRAMES} frame={bearFrame} label={S.boss.bear} />
            ) : (
              // буцахдаа толин тусгал: бие frame-ийн голд тул байрнаасаа хөдлөхгүй
              <View style={run.back ? styles.mirror : null}>
                <SheetFrame id={RUN} frames={RUN_FRAMES} frame={run.frame} label={S.boss.bear} />
              </View>
            )}
          </Animated.View>

          <Animated.View style={[styles.abs, styles.origin, shotStyle]}>
            <Sprite id={shot} />
          </Animated.View>
          {spark ? (
            <View
              style={[
                styles.abs,
                { zIndex: 4, left: spark.at.x - frameSize(spark.id, 3).width / 2, top: spark.at.y - frameSize(spark.id, 3).height / 2 },
              ]}
            >
              <SheetFrame id={spark.id} frames={3} frame={spark.frame} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Довтолгоонд л гардаг зургуудыг урьдчилж ачаална: анх гарах агшинд хоосон харагдаж "алга болохгүй" */}
      <View style={styles.preload}>
        {[RUN, 'fx_slash_144x48', 'fx_spark_90x30', 'fx_spark_magic_90x30', 'fx_magic_22x22', 'icon_star_24x24', boss.weapon?.sheet, boss.white]
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
