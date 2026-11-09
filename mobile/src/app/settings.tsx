import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { PixelText } from '@/components/pinecones';
import { Enter, PressScale, Sprite } from '@/components/pixel';
import { PlanCard } from '@/components/profile/PlanCard';
import { sectionTitle } from '@/components/profile/Overview';
import { BackButton, Card, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { S } from '@/i18n/strings';
import { confirm } from '@/lib/confirm';
import { goBack } from '@/lib/nav';

/** Тохиргоо (профайлын шүд icon): нэр, баавгай солих, миний багц, гарах. */
export default function SettingsScreen() {
  const { me, signOut } = useAuth();

  async function onLogout() {
    if (await confirm(S.auth.logoutConfirm, S.auth.logout)) await signOut();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/profile')} />
        <View accessibilityRole="header">
          <PixelText text={P.settings.toUpperCase()} px={3} color={colors.ink} shadow={colors.stone} />
        </View>
      </View>

      <Enter index={0} style={styles.section}>
        <Text style={sectionTitle}>{S.profile.title}</Text>
        <PressScale accessibilityRole="link" accessibilityLabel={P.editProfile} onPress={() => router.push('/avatar')}>
          <Card style={styles.row}>
            <View style={styles.icon}>
              <Sprite id="icon_pencil_30x30" />
            </View>
            <View style={styles.texts}>
              <Text style={styles.title}>{P.editProfile}</Text>
              <Text style={styles.sub}>{P.editProfileSub}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </PressScale>
      </Enter>

      {me ? (
        <Enter index={1} style={styles.section}>
          <Text style={sectionTitle}>{S.plans.myPlan}</Text>
          <PlanCard plan={me.plan ?? 'free'} />
        </Enter>
      ) : null}

      <Enter index={2} style={styles.section}>
        <Text style={sectionTitle}>{P.account}</Text>
        {me ? <Text style={styles.sub}>{`@${me.username}`}</Text> : null}
        {/* Профайл ачаалагдаагүй (офлайн) байсан ч гарч болно. */}
        <Button title={S.auth.logout} variant="white" onPress={onLogout} />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  section: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.trackAlt, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  chevron: { fontFamily: fonts.bold, fontSize: 26, color: colors.mutedIcon },
});
