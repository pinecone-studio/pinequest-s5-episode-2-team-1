import { type ComponentProps, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { Pop, Sprite } from '@/components/pixel';
import { colors } from '@/constants/theme';
import type { SpriteKey } from '@/sprites';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface NavItem {
  route: string;
  label: string;
  on: SpriteKey;
  off: SpriteKey;
}

/** Charlie маягийн зөвхөн icon-той цэс: гэр · даалгавар · заагч · тэрэг · туг. */
const ITEMS: NavItem[] = [
  { route: 'index', label: 'Нүүр', on: 'nav2_home_on_30x30', off: 'nav2_home_off_30x30' },
  { route: 'tasks', label: 'Өнөөдрийн даалгавар', on: 'nav2_tasks_on_30x30', off: 'nav2_tasks_off_30x30' },
  { route: 'path', label: 'Сурах зам', on: 'nav2_path_on_30x30', off: 'nav2_path_off_30x30' },
  { route: 'shop', label: 'Дэлгүүр', on: 'nav2_shop_on_30x30', off: 'nav2_shop_off_30x30' },
  { route: 'duel', label: 'Баг', on: 'nav2_crew_on_30x30', off: 'nav2_crew_off_30x30' },
];

const BAR_H = 64;
const PAD = 6;

/** Доод цэсний эзлэх өндөр (дэлгэцүүд контентоо үүнээс дээш байрлуулна). */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return BAR_H + Math.max(insets.bottom, 12) + 12;
}

/**
 * Хөвдөг цагаан pill цэс. Идэвхтэй tab-ын ард саарал капсул spring-ээр гулсана.
 */
export function BottomNav({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const activeName = state.routes[state.index]?.name;
  const items = ITEMS.filter((it) => state.routes.some((r) => r.name === it.route));
  const activeIndex = Math.max(0, items.findIndex((it) => it.route === activeName));
  const [itemW, setItemW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!itemW) return;
    const target = activeIndex * itemW;
    x.value = reduce ? target : withSpring(target, { damping: 18, stiffness: 220, mass: 0.8 });
  }, [activeIndex, itemW, reduce, x]);

  const capsule = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Үндсэн цэс"
        style={styles.bar}
        onLayout={(e: LayoutChangeEvent) => setItemW((e.nativeEvent.layout.width - PAD * 2) / items.length)}
      >
        {itemW ? <Animated.View style={[styles.capsule, { width: itemW }, capsule]} /> : null}
        {items.map((item) => {
          const route = state.routes.find((r) => r.name === item.route)!;
          const active = activeName === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.item}
            >
              <Pop trigger={active} from={0.7}>
                <Sprite id={active ? item.on : item.off} />
              </Pop>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    height: BAR_H,
    paddingHorizontal: PAD,
    borderRadius: BAR_H / 2,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E4E2EA',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  capsule: {
    position: 'absolute',
    left: PAD,
    top: 5,
    bottom: 5,
    borderRadius: 26,
    backgroundColor: '#ECEBF1',
  },
  item: { flex: 1, height: BAR_H - 4, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
});
