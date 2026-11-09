import { CLAN_ICONS, type ClanIcon } from '@shared/clan';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sprite } from '@/components/pixel';
import { colors, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';

/** Ангийн pixel icon (48px эх; 48 эсвэл 96dp-д бүхэл тоогоор томорч crisp харагдана). */
export function ClanEmblem({ icon, size = 48 }: { icon: ClanIcon; size?: 48 | 96 }) {
  return <Sprite id={`clan_icon_${icon}_48x48`} label={S.clan.icons[icon]} style={{ width: size, height: size }} />;
}

/** Анги үүсгэх, засахад icon сонгох сүлжээ (12 icon, сонгосон нь хүрээтэй). */
export function EmblemPicker({ value, onChange }: { value: ClanIcon; onChange: (icon: ClanIcon) => void }) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={S.clan.iconLabel}>
      {CLAN_ICONS.map((icon) => (
        <Pressable
          key={icon}
          accessibilityRole="radio"
          accessibilityLabel={S.clan.icons[icon]}
          accessibilityState={{ selected: icon === value }}
          onPress={() => onChange(icon)}
          style={({ pressed }) => [styles.cell, icon === value && styles.selected, pressed && { opacity: 0.7 }]}
        >
          <ClanEmblem icon={icon} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  cell: { padding: 3, borderRadius: radius.sm, borderWidth: 3, borderColor: 'transparent' },
  selected: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
});
