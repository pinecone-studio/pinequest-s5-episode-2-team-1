import { clanTitle } from '@shared/clan';
import type { LeagueClanDto } from '@shared/types';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ClanEmblem } from '@/components/clan/ClanEmblem';
import { Muted } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { L } from '@/i18n/league';

/** Өөр ангийн товч мэдээлэл: зөвхөн icon, нэр, байр, гишүүдийн тоо, нэргүй баавгай (урилгын код, хүүхдийн нэр байхгүй). */
export function ClanSheet({ clan, onClose }: { clan: LeagueClanDto | null; onClose: () => void }) {
  return (
    <Modal transparent visible={clan !== null} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={L.close}>
        {clan ? (
          <Pressable style={styles.sheet} accessibilityViewIsModal onPress={() => undefined}>
            <View style={styles.head}>
              <ClanEmblem icon={clan.icon} />
              <Text accessibilityRole="header" style={styles.title}>
                {clanTitle(clan.name)}
              </Text>
            </View>
            <Muted>{`${clan.rank}-р байр · ${L.members(clan.members)} · ${L.weekXp(clan.weekXp)} ${L.weekLabel}`}</Muted>
            <View style={styles.looks}>
              {clan.looks.map((look, i) => (
                <Avatar key={i} size={44} border={2} look={look} />
              ))}
            </View>
            <Button title={L.close} variant="secondary" onPress={onClose} />
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 32, gap: 12, ...hardShadow(4) },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flexShrink: 1, fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink },
  looks: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
