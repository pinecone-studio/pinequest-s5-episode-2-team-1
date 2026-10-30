import { type ComponentProps, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { Pop, Sprite } from '@/components/pixel';
import { useChapterTheme, useThemeFade } from '@/constants/chapterTheme';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { useOnline } from '@/lib/online';
import { tourRef } from '@/lib/tour';
import type { SpriteKey } from '@/sprites';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface NavItem {
  route: string;
  /** a11y нэр (дэлгэцэнд зөвхөн icon) */
  label: string;
  on: SpriteKey;
  off: SpriteKey;
}

/** Таван tab: гэр · заагч · тэрэг · туг · лигийн тэмдэг (даалгавар түр нуусан). */
const ITEMS: NavItem[] = [
  { route: 'index', label: 'Нүүр', on: 'nav2_home_on_30x30', off: 'nav2_home_off_30x30' },
  // shortcut: "Өнөөдрийн даалгавар" tab түр нуусан (дэлгэц нь (tabs)/tasks.tsx-д хэвээр); буцаахад энэ мөрийг сэргээнэ.
  // { route: 'tasks', label: 'Хичээл', on: 'nav2_tasks_on_30x30', off: 'nav2_tasks_off_30x30' },
  { route: 'path', label: 'Аялал', on: 'nav2_path_on_30x30', off: 'nav2_path_off_30x30' },
  { route: 'shop', label: 'Дэлгүүр', on: 'nav2_shop_on_30x30', off: 'nav2_shop_off_30x30' },
  { route: 'duel', label: 'Зорилго', on: 'nav2_crew_on_30x30', off: 'nav2_crew_off_30x30' },
  { route: 'league', label: 'Лиг', on: 'nav2_league_on_30x30', off: 'nav2_league_off_30x30' },
];

/** Офлайн үед нээгдэхгүй tab-ууд: серверийн өгөгдөл (сурах бичгийн хичээл, тулааны лобби, лиг) шаарддаг. */
const ONLINE_ONLY = new Set(['path', 'duel', 'league']);

/** Tab бүрийн дарах талбай (dp) */
const ITEM_H = 56;
/** tab + самбарын дотор зай + хүрээ */
const BAR_H = ITEM_H + 11;
/** Офлайн үед цэсний дээрх «Офлайн горим» шошго */
const BADGE_H = 30;
const BADGE_GAP = 8;

/** Хөвдөг цэсний доод зай: home indicator-той утсанд түүний дээгүүр, бусад үед 8 dp */
const bottomGap = (inset: number) => Math.max(inset - 12, 8);

/** Доод цэсний эзлэх өндөр (дэлгэцүүд контентоо үүнээс дээш байрлуулна). */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  return BAR_H + bottomGap(insets.bottom) + (online ? 0 : BADGE_H + BADGE_GAP);
}

/**
 * Хөвдөг дугуй булантай, зөвхөн icon-той цэс: идэвхтэй tab-ын icon-ы доор жижиг лайм заагч.
 * Самбарын өнгө идэвхтэй бүлгийн theme-ийг дагана. Офлайн үед Сурах зам, Баг бүдгэрч түгжигдэнэ, цэсний дээр
 * «Офлайн горим» шошго гарна.
 */
export function BottomNav({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useChapterTheme();
  const fade = useThemeFade(theme);
  const online = useOnline();
  const [hint, setHint] = useState(false);
  const activeName = state.routes[state.index]?.name;
  const items = ITEMS.filter((it) => state.routes.some((r) => r.name === it.route));

  // Түгжигдсэн tab дээр байхад офлайн болбол Нүүр рүү
  useEffect(() => {
    const home = state.routes.find((r) => r.name === 'index');
    if (!online && activeName && ONLINE_ONLY.has(activeName) && home) navigateToTab(home.key);
  }, [online, activeName, state.routes, navigateToTab]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 2500);
    return () => clearTimeout(t);
  }, [hint]);

  return (
    <View style={[styles.wrap, { bottom: bottomGap(insets.bottom) }]} pointerEvents="box-none">
      {online ? null : (
        <View style={[styles.badge, hint && styles.badgeHint]} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={styles.badgeText}>{hint ? S.offline.locked : S.offline.badge}</Text>
        </View>
      )}
      <Animated.View
        accessibilityRole="tablist"
        accessibilityLabel="Үндсэн цэс"
        style={[styles.bar, fade.panel, fade.border]}
      >
        {items.map((item) => {
          const route = state.routes.find((r) => r.name === item.route)!;
          const active = activeName === item.route;
          const locked = !online && ONLINE_ONLY.has(item.route);
          return (
            <Pressable
              key={item.route}
              ref={tourRef(`nav.${item.route}`)}
              accessibilityRole="tab"
              accessibilityLabel={locked ? S.offline.lockedTab(item.label) : item.label}
              accessibilityState={{ selected: active, disabled: locked }}
              onPress={() => {
                if (locked) {
                  setHint(true);
                  return;
                }
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigateToTab(route.key);
              }}
              style={[styles.item, locked && { opacity: 0.3 }]}
            >
              <Pop trigger={active} from={0.7}>
                {active ? (
                  <Sprite id={item.on} />
                ) : (
                  <View>
                    {/* tint-ийг animate хийхгүй: web дээр (SVG filter) animated tintColor шинэчлэгддэггүй */}
                    <Sprite id={item.off} style={{ tintColor: theme.icon }} />
                    {/* theme-ийн өнгөөр будсан дүрс дээр анхны цайвар/саарал pixel-ийг хагас тунгалаг давхарлаж дотоод зураасыг хадгална */}
                    <Sprite id={item.off} style={styles.detail} />
                  </View>
                )}
              </Pop>
              {/* идэвхгүй үед ч зай эзэлнэ: tab солиход байрлал үсрэхгүй */}
              <View style={[styles.indicator, active && { backgroundColor: theme.active }]} />
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, right: 8 },
  bar: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  item: { flex: 1, minHeight: ITEM_H, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  indicator: { width: 16, height: 4, borderRadius: 2, marginTop: 4 },
  detail: { position: 'absolute', left: 0, top: 0, opacity: 0.5 },
  badge: {
    alignSelf: 'center',
    height: BADGE_H,
    marginBottom: BADGE_GAP,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  badgeHint: { backgroundColor: colors.violet },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.white },
});
