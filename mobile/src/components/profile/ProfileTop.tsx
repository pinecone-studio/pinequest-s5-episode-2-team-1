import type { Me } from '@shared/types';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Enter, FurContext } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { P } from '@/i18n/profile';
import { S } from '@/i18n/strings';
import { bgById, outfitById, parseWorn, wornItems } from '@/lib/pixelBear/catalog';

/**
 * Профайлын дээд хэсэг: дэлгэцийн өргөнөөр тасалсан баавгай (дарвал солих; нэр нь header-т), @хоч · нэгдсэн он, анги / найз / хүсэлтийн тоо,
 * "Найз нэмэх" ба QR товч.
 */
export function ProfileTop({
  me,
  joinedAt,
  friends,
  requests,
  showCode,
  onToggleCode,
}: {
  me: Me;
  joinedAt: number;
  friends: number;
  requests: number;
  showCode: boolean;
  onToggleCode: () => void;
}) {
  const worn = parseWorn(me.look.outfit);
  const bg = bgById(me.look.bg);
  return (
    <>
      {/* баавгайг томоор, бүсэлхийгээр нь тасалж дэлгэцийн өргөнөөр харуулна */}
      <Enter index={0} style={styles.banner}>
        <Pressable accessibilityRole="button" accessibilityLabel={P.changeLook} onPress={() => router.push('/avatar')}>
          <FurContext.Provider value={me.look.fur ?? 'brown'}>
            <PreviewStage
              bg={bg}
              items={wornItems(worn)}
              name={S.profile.levelChip(me.level)}
              alt={S.shop.previewAlt(outfitById(worn.at(-1) ?? 'scarf').name, bg.name)}
              height={380}
              style={styles.stage}
            />
          </FurContext.Provider>
        </Pressable>
      </Enter>

      <Enter index={1} style={styles.identity}>
        <Text style={styles.joined}>{P.joined(me.username, joinedAt)}</Text>
        <View style={styles.counts}>
          <Count value={P.gradeValue(me.grade)} label={P.grade} />
          <Count value={String(friends)} label={P.friends} onPress={() => router.push('/friends')} />
          <Count value={String(requests)} label={P.requests} hot={requests > 0} onPress={() => router.push('/friends?tab=requests')} />
        </View>
        <View style={styles.actions}>
          <Button title={`+ ${S.friends.add}`} variant="lemon" small onPress={() => router.push('/scan')} style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={P.qrA11y}
            accessibilityState={{ expanded: showCode }}
            onPress={onToggleCode}
            style={({ pressed }) => [styles.qr, showCode && styles.qrOn, pressed && { transform: [{ translateY: 2 }] }]}
          >
            <Text style={[styles.qrText, showCode && { color: colors.white }]}>QR</Text>
          </Pressable>
        </View>
      </Enter>
    </>
  );
}

/** `onPress`: найз, хүсэлтийн тоон дээр дарвал найзуудын хуудас нээгдэнэ. */
function Count({ value, label, hot, onPress }: { value: string; label: string; hot?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.count, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.countValue, hot && { color: colors.violet }]}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // header-ийн доор шууд, Screen-ий 20dp padding-ийг давж бүтэн өргөнөөр
  banner: { height: 250, marginHorizontal: -20, marginTop: -16, overflow: 'hidden' },
  stage: { borderRadius: 0 },
  identity: { gap: 10 },
  joined: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: -4 },
  counts: { flexDirection: 'row', paddingVertical: 4 },
  count: { flex: 1, gap: 2, minHeight: 44 },
  countValue: { fontFamily: fonts.pixelNum, fontSize: 22, color: colors.ink },
  countLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qr: {
    width: 56,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...hardShadow(3),
  },
  qrOn: { backgroundColor: colors.indigo },
  qrText: { fontFamily: fonts.pixel, fontSize: 18, color: colors.ink },
});
