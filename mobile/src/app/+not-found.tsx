import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { S } from '@/i18n/strings';

export default function NotFound() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{S.notFound}</Text>
      <Link href="/" style={styles.link}>
        {S.goHome}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  link: { fontSize: 16, color: colors.primaryDark, fontWeight: '700' },
});
