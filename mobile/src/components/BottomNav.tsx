import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

/** Charlie маягийн зөвхөн icon-той цэс: гэр · заагч · тэрэг · цүнх · туг. */
const ITEMS: NavItem[] = [
  { route: 'index', label: 'Нүүр', on: 'nav_home_on_40x36', off: 'nav_home_off_40x36' },
  { route: 'path', label: 'Сурах зам', on: 'nav_path_on_40x40', off: 'nav_path_off_40x40' },
  { route: 'shop', label: 'Дэлгүүр', on: 'nav_shop_on_44x38', off: 'nav_shop_off_44x38' },
  { route: 'bag', label: 'Цүнх', on: 'nav_bag_on_40x40', off: 'nav_bag_off_40x40' },
  { route: 'duel', label: 'Баг', on: 'nav_crew_on_40x40', off: 'nav_crew_off_40x40' },
];

export function BottomNav({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Үндсэн цэс"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
    >
      {ITEMS.map((item) => {
        const route = state.routes.find((r) => r.name === item.route);
        if (!route) return null;
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
            <View style={[styles.dot, active && styles.dotOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.line,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  item: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 44 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.ink },
});
