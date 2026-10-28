import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { FirstTour } from '@/components/FirstTour';
import { colors } from '@/constants/theme';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { useOnline } from '@/lib/online';
import { markTourPending, startTourIfPending } from '@/lib/tour';
import { S } from '@/i18n/strings';

export default function TabsLayout() {
  const { ready, subject, setSubject } = usePixelBear();
  const { me } = useAuth();
  const online = useOnline();
  // хуучин кэшэлсэн профайлд profileSet байхгүй (undefined): /me шинэчлэгдтэл чиглүүлэхгүй
  const needsProfile = me?.profileSet === false && online;
  // анх орохдоо асуудаг асуултаа бөглөөгүй (хуучин кэшэд onboarded байхгүй = бөглөсөн гэж үзнэ)
  const needsQuiz = me?.onboarded === false && online;

  // Анх орсон хэрэглэгч эхлээд профайлаа үүсгээд (нэр, баавгай), дараа нь асуултад хариулж, хичээлээ сонгоно.
  // Профайлыг офлайн хадгалж чадахгүй тул сүлжээгүй үед алгасна. Хичээл нь төхөөрөмж дээр хадгалагддаг тул шинэ утас,
  // browser дээр хоосон: асуулгаа бөглөсөн бол дахин асуулгүй серверт хадгалсан хичээлээр (хуучин хэрэглэгчид математик).
  const onboarded = me?.onboarded !== false;
  const savedSubject = me?.subject ?? 'math';
  useEffect(() => {
    if (needsProfile) router.replace('/avatar');
    else if (needsQuiz) router.replace('/onboarding');
    else if (ready && subject === null) {
      if (onboarded) setSubject(savedSubject);
      else router.replace('/onboarding');
    }
  }, [needsProfile, needsQuiz, ready, subject, onboarded, savedSubject, setSubject]);

  // Шинэ бүртгэл (асуулгаа бөглөөгүй): профайл, асуулгаа бөглөж Нүүрэнд ирэхэд аппын танилцуулгыг нэг удаа харуулна
  const userId = me?.id;
  const fresh = me?.onboarded === false;
  const settled = !needsProfile && onboarded && ready && subject !== null;
  useEffect(() => {
    if (userId !== undefined && fresh) void markTourPending(userId);
  }, [userId, fresh]);
  useEffect(() => {
    if (userId !== undefined && settled) void startTourIfPending(userId);
  }, [userId, settled]);

  return (
    <View style={{ flex: 1 }}>
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
      <FirstTour />
    </View>
  );
}
