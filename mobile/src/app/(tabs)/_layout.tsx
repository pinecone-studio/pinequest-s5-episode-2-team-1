import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/constants/theme';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { S } from '@/i18n/strings';

export default function TabsLayout() {
  const { ready, subject } = usePixelBear();
  const { me } = useAuth();
  const online = useOnline();
  // хуучин кэшэлсэн профайлд profileSet байхгүй (undefined): /me шинэчлэгдтэл чиглүүлэхгүй
  const needsProfile = me?.profileSet === false && online;

  // Анх орсон хэрэглэгч эхлээд профайлаа үүсгээд (нэр, баавгай), дараа нь хичээлээ сонгоно (02 · Хичээл сонгох).
  // Профайлыг офлайн хадгалж чадахгүй тул сүлжээгүй үед алгасна.
  useEffect(() => {
    if (needsProfile) router.replace('/avatar');
    else if (ready && subject === null) router.replace('/onboarding');
  }, [needsProfile, ready, subject]);

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
