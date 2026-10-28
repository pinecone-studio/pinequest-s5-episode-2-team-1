import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Sprite } from '@/components/pixel';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { finishTour, tourNode, type TourTarget, useTourActive } from '@/lib/tour';

interface Step {
  /** байхгүй бол картыг голд нь харуулна (мэндчилгээ, төгсгөл) */
  target?: TourTarget;
  title: string;
  body: string;
}

const steps = (name: string): Step[] => [
  { title: S.tour.welcomeTitle(name), body: S.tour.welcome },
  { target: 'xp', title: S.tour.xpTitle, body: S.tour.xp },
  { target: 'stats', title: S.tour.statsTitle, body: S.tour.stats },
  { target: 'feed', title: S.tour.feedTitle, body: S.tour.feed },
  { target: 'nav.path', title: S.tour.pathTitle, body: S.tour.path },
  { target: 'nav.shop', title: S.tour.shopTitle, body: S.tour.shop },
  { target: 'nav.duel', title: S.tour.duelTitle, body: S.tour.duel },
  { target: 'avatar', title: S.tour.profileTitle, body: S.tour.profile },
  { title: S.tour.doneTitle, body: S.tour.done },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Тодруулах хүрээ элементээс хэр том */
const PAD = 6;
/** Хөшгийн нүх дөрвөлжин тул хүрээний булан бага зэрэг л бөөрөнхий (булангийн гэрэлтэх цэг харагдахгүй) */
const HOLE_R = 6;
/** Карт ба тодруулсан хэсгийн зай */
const GAP = 14;
/** colors.ink-ийн бараан хөшиг */
const DIM = 'rgba(25,21,46,0.74)';

/**
 * Аппын танилцуулга (lib/tour.ts): дэлгэцийг бараан хөшгөөр бүрхэж, Нүүр ба доод цэсний хэсэг бүрийг ээлжлэн
 * тодруулж, баавгай тайлбарлана. Хөшиг нь нүхний дөрвөн талын тэгш өнцөгт: нүх нь дараагийн хэсэг рүү гулсана.
 * Танилцуулгын үеэр доорх аппыг дарахгүй; «Алгасах» эсвэл Android-ийн буцах товч дуусгана.
 */
export function FirstTour() {
  const active = useTourActive();
  const { me } = useAuth();
  if (!active || !me) return null;
  return <Tour userId={me.id} name={me.name ?? me.username} />;
}

function Tour({ userId, name }: { userId: number; name: string }) {
  const [list] = useState(() => steps(name));
  const [i, setI] = useState(0);
  // аль алхмын хэмжээс болохыг хадгална: хэмжиж дуустал картыг хуучин байрлалд нь харуулахгүй
  const [spot, setSpot] = useState<{ i: number; rect: Rect | null } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const root = useRef<ComponentRef<typeof View>>(null);
  const win = useWindowDimensions();
  const step = list[i];
  const last = i === list.length - 1;
  const done = () => finishTour(userId);

  useEffect(() => {
    let cancelled = false;
    const node = step.target ? tourNode(step.target) : undefined;
    if (!node || !root.current) {
      setSpot({ i, rect: null });
      return;
    }
    root.current.measureInWindow((ox, oy) => {
      node.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        // нуугдсан (өөр tab дээрх) элемент 0 хэмжээтэй: картыг голд нь
        const rect = w > 0 && h > 0 ? { x: x - ox - PAD, y: y - oy - PAD, w: w + PAD * 2, h: h + PAD * 2 } : null;
        setSpot({ i, rect });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [i, step.target, win.width, win.height]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finishTour(userId);
      return true;
    });
    return () => sub.remove();
  }, [userId]);

  const hole = spot?.i === i ? spot.rect : null;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    // тодруулах зүйлгүй алхамд нүх голдоо цэг болж агшина
    const r = hole ?? { x: size.w / 2, y: size.h / 2, w: 0, h: 0 };
    const t = { duration: 280 };
    x.value = withTiming(r.x, t);
    y.value = withTiming(r.y, t);
    w.value = withTiming(r.w, t);
    h.value = withTiming(r.h, t);
    ring.value = withTiming(hole ? 1 : 0, t);
  }, [hole, size, x, y, w, h, ring]);

  // нүхний дээд, доод, зүүн, баруун талын хөшиг; бүхэл pixel дээр: хоёр хөшгийн зааг дээр цайвар/бараан зураас гарахгүй
  const above = useAnimatedStyle(() => ({ height: Math.max(Math.round(y.value), 0) }));
  const below = useAnimatedStyle(() => ({ top: Math.round(y.value) + Math.round(h.value) }));
  const before = useAnimatedStyle(() => ({ top: Math.round(y.value), height: Math.round(h.value), width: Math.max(Math.round(x.value), 0) }));
  const after = useAnimatedStyle(() => ({ top: Math.round(y.value), height: Math.round(h.value), left: Math.round(x.value) + Math.round(w.value) }));
  const outline = useAnimatedStyle(() => ({ left: x.value, top: y.value, width: w.value, height: h.value, opacity: ring.value }));

  const ready = spot?.i === i;
  const place = !hole
    ? styles.middle
    : hole.y + hole.h / 2 < size.h / 2
      ? { top: hole.y + hole.h + GAP }
      : { bottom: size.h - hole.y + GAP };

  return (
    <View
      ref={root}
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      accessibilityViewIsModal
      accessibilityLabel={S.tour.label}
    >
      <Animated.View pointerEvents="none" style={[styles.dim, styles.above, above]} />
      <Animated.View pointerEvents="none" style={[styles.dim, styles.below, below]} />
      <Animated.View pointerEvents="none" style={[styles.dim, styles.before, before]} />
      <Animated.View pointerEvents="none" style={[styles.dim, styles.after, after]} />
      <Animated.View pointerEvents="none" style={[styles.outline, outline]} />

      {ready ? (
        <Animated.View key={i} entering={FadeIn.duration(220)} style={[styles.cardWrap, place]} pointerEvents="box-none">
          <View style={styles.card} accessibilityLiveRegion="polite">
            <View style={styles.head}>
              <Sprite id="head_idle_44x38" />
              <Text accessibilityRole="header" style={styles.title}>
                {step.title}
              </Text>
            </View>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.foot}>
              <View style={styles.dots} accessible accessibilityLabel={S.tour.step(i + 1, list.length)}>
                {list.map((_, k) => (
                  <View key={k} style={[styles.dot, k === i && styles.dotOn]} />
                ))}
              </View>
              {last ? null : (
                <Pressable accessibilityRole="button" onPress={done} style={styles.skip}>
                  <Text style={styles.skipText}>{S.tour.skip}</Text>
                </Pressable>
              )}
              <Button title={last ? S.tour.start : S.tour.next} variant="lemon" small onPress={last ? done : () => setI(i + 1)} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  above: { left: 0, right: 0, top: 0 },
  below: { left: 0, right: 0, bottom: 0 },
  before: { left: 0 },
  after: { right: 0 },
  outline: { position: 'absolute', borderRadius: HOLE_R, borderWidth: 3, borderColor: colors.lemon },
  cardWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  middle: { top: 0, bottom: 0, justifyContent: 'center' },
  card: {
    alignSelf: 'stretch',
    gap: 8,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 19, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dashed },
  dotOn: { width: 18, backgroundColor: colors.violet },
  skip: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  skipText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
});
