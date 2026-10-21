import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/constants/theme';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { S } from '@/i18n/strings';

export default function TabsLayout() {
  const { ready, subject } = usePixelBear();

  // Анх орсон хэрэглэгч эхлээд хичээлээ сонгоно (02 · Хичээл сонгох)
  useEffect(() => {
    if (ready && subject === null) router.replace('/onboarding');
  }, [ready, subject]);

  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
    >
      <Tabs.Screen name="index" options={{ title: S.tabs.home }} />
      <Tabs.Screen name="tasks" options={{ title: S.tabs.tasks }} />
      <Tabs.Screen name="path" options={{ title: S.tabs.path }} />
      <Tabs.Screen name="shop" options={{ title: S.tabs.shop }} />
      <Tabs.Screen name="duel" options={{ title: S.tabs.duel }} />
    </Tabs>
  );
}
