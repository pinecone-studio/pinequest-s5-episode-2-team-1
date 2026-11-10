import { router } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PressScale } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { SH } from '@/i18n/shop';
import { daysLeft, type ShopEvent } from '@/lib/pixelBear/events';

/** poster-ийн хэмжээ (scripts/poster-sprites.ts: 400×244) */
const RATIO = 400 / 244;
const AUTO_MS = 5000;

/**
 * Дэлгүүрийн дээд banner: идэвхтэй эвент бүр нэг poster (кодоор зурсан pixel үзэгдэл + шинэ хувцастай баавгайнууд), зүүн
 * талд нь нэр, үлдсэн хоног, "Үзэх". Хажуу тийш гүйлгэнэ, 5с тутам өөрөө шилжинэ (reduce motion үед үгүй).
 */
export function EventBanner({ events }: { events: ShopEvent[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const pageRef = useRef(0);
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  // хүүхэд өөрөө гүйлгэвэл автомат шилжилтийн хугацаа шинээр эхэлнэ (гарт нь булаалдахгүй)
  const [touched, setTouched] = useState(0);

  useEffect(() => {
    if (reduce || events.length < 2 || !w) return;
    const t = setInterval(() => ref.current?.scrollTo({ x: ((pageRef.current + 1) % events.length) * w, animated: true }), AUTO_MS);
    return () => clearInterval(t);
  }, [reduce, events.length, w, touched]);

  if (!events.length) return null;
  return (
    <View accessibilityLabel={SH.events} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={styles.wrap}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScrollBeginDrag={() => setTouched((n) => n + 1)}
        onScroll={(e) => {
          const p = w ? Math.round(e.nativeEvent.contentOffset.x / w) : 0;
          if (p === pageRef.current) return;
          pageRef.current = p;
          setPage(p);
        }}
      >
        {w ? events.map((ev) => <Slide key={ev.id} ev={ev} width={w} />) : <View style={styles.placeholder} />}
      </ScrollView>
      {events.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={SH.pageA11y(page + 1, events.length)}>
          {events.map((ev, i) => (
            <View key={ev.id} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Slide({ ev, width }: { ev: ShopEvent; width: number }) {
  const days = daysLeft(ev);
  return (
    // сүүдэр нь card-аас гадна гарах тул slide-ийн доод 10dp-д багтаана
    <View style={{ width, paddingBottom: 10 }}>
      <PressScale scaleTo={0.97} accessibilityRole="button" accessibilityLabel={SH.slideA11y(ev.title, days)} onPress={() => router.push(`/event/${ev.id}`)} style={[styles.card, { backgroundColor: ev.color }]}>
        <Image source={ev.banner} resizeMode="cover" style={styles.poster} />
        <View style={styles.copy}>
          <View style={[styles.chip, { backgroundColor: ev.deep }]}>
            <Text style={styles.chipNew}>{SH.isNew}</Text>
            <Text style={styles.chipText}>{SH.daysLeft(days)}</Text>
          </View>
          <Text style={[styles.title, { color: ev.ink }]} numberOfLines={2}>
            {ev.title}
          </Text>
          <Text style={[styles.tag, { color: ev.ink }]} numberOfLines={2}>
            {ev.tagline}
          </Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{SH.see}</Text>
            <View style={styles.arrow}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M7 17 17 7M9 7h8v8" />
              </Svg>
            </View>
          </View>
        </View>
      </PressScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  placeholder: { aspectRatio: RATIO },
  card: {
    aspectRatio: RATIO,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 5,
  },
  // poster-ийн зүүн 40% нь эвентийн өнгөөр уусдаг тул бичиг тэнд
  copy: { width: '60%', height: '100%', padding: 16, gap: 6, justifyContent: 'space-between' },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingLeft: 4, paddingRight: 10, borderRadius: 13 },
  chipNew: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.ink, backgroundColor: colors.lemon, borderRadius: 9, paddingHorizontal: 6, overflow: 'hidden' },
  chipText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
  title: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 26 },
  tag: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingLeft: 16, paddingRight: 5, borderRadius: 20, backgroundColor: colors.ink },
  ctaText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  // web-д Image эх зургийн хэмжээгээ авдаг тул өргөн, өндрийг заавал өгнө
  poster: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.stone },
  dotOn: { width: 26, backgroundColor: colors.ink },
});
