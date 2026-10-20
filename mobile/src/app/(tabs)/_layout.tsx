import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { S } from '@/i18n/strings';

type IconName = keyof typeof Ionicons.glyphMap;
const icon =
  (name: IconName) =>
  ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={String(color)} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: S.tabs.home, tabBarIcon: icon('home') }}
      />
      <Tabs.Screen
        name="duel"
        options={{ title: S.tabs.duel, tabBarIcon: icon('flash') }}
      />
      <Tabs.Screen
        name="shop"
        options={{ title: S.tabs.shop, tabBarIcon: icon('bag-handle') }}
      />
    </Tabs>
  );
}
