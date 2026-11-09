import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { colors, fonts, hardShadow } from '@/constants/theme';
import { type } from '@/constants/type';

/** Тулаан үүсгэх дэлгэцийн нэг алхам: pixel дугаартай гарчиг, сонголт, доор нь тайлбар (алдаа бол улаан). */
export function StepCard({ n, title, hint, danger, children }: { n: number; title: string; hint?: string; danger?: boolean; children: ReactNode }) {
  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.num}>{n}</Text>
        </View>
        <Text accessibilityRole="header" style={type.h3}>
          {title}
        </Text>
      </View>
      {children}
      {hint ? <Text style={[styles.hint, danger && styles.danger]}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.lemon,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...hardShadow(2),
  },
  num: { fontFamily: fonts.pixelNum, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.muted },
  danger: { color: colors.dangerText, fontFamily: fonts.bold },
});
