import type { PublicProfile, SubjectSkill } from '@shared/types';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BracketBar } from '@/components/BracketBar';
import { Enter, FurContext, Sprite } from '@/components/pixel';
import { PreviewStage } from '@/components/PreviewStage';
import { Card, ProgressBar, SectionTitle } from '@/components/ui';
import { colors, fonts, radius, subjectTheme } from '@/constants/theme';
import { isActiveSubject } from '@/constants/subjects';
import { type } from '@/constants/type';
import { S, subjectNames } from '@/i18n/strings';
import { BACKGROUNDS, bgById, OUTFITS, outfitById, parseWorn, wornItems } from '@/lib/pixelBear/catalog';
import type { SpriteKey } from '@/sprites';

/**
 * Бусдад харагдах профайл (Миний профайл дээр урьдчилан, Найзын профайл дээр бүтнээр): баавгай нь сонгосон
 * дэвсгэр, хувцастайгаа, шат, дараалал, хичээл бүрийн ахиц, цуглуулга. `index` = эхний Enter-ийн дугаар.
 */
export function ProfileView({ profile, index = 0 }: { profile: PublicProfile; index?: number }) {
  const bg = bgById(profile.look.bg);
  const worn = parseWorn(profile.look.outfit);
  const outfit = outfitById(worn.at(-1) ?? 'scarf');
  const bgs = BACKGROUNDS.filter((b) => profile.collection.bgs.includes(b.id));
  const outfits = OUTFITS.filter((o) => profile.collection.outfits.includes(o.id));

  return (
    <>
      <Enter index={index}>
        {/* найзын профайл дээр баавгай нь тэр хүний сонгосон өнгөөр */}
        <FurContext.Provider value={profile.look.fur ?? 'brown'}>
          <PreviewStage bg={bg} items={wornItems(worn)} name={S.profile.levelChip(profile.level)} alt={S.shop.previewAlt(outfit.name, bg.name)} />
        </FurContext.Provider>
      </Enter>

      <Enter index={index + 1} style={styles.identity}>
        <View style={styles.photo}>
          <Avatar size={72} border={4} look={profile.look} label={S.avatar.preview(profile.name ?? profile.username)} />
        </View>
        <Text accessibilityRole="header" style={type.h2} numberOfLines={1}>
          {profile.name ?? profile.username}
        </Text>
        <Text style={type.small}>@{profile.username}</Text>
        <Text style={type.small}>{S.profile.meta(profile.grade, profile.joinedAt)}</Text>
        <View style={styles.bar}>
          <BracketBar
            value={profile.levelXp}
            max={profile.levelXpNeeded}
            segments={12}
            color={colors.violet}
            label={S.profile.xpLabel(profile.levelXp, profile.levelXpNeeded)}
          />
        </View>
      </Enter>

      <Enter index={index + 2} style={styles.tiles}>
        <StatTile icon="icon_flame_24x24" label={S.profile.streak} value={profile.streak} sub={S.profile.days} />
        <StatTile icon="icon_heart_24x24" label={S.profile.studied} value={profile.studyDays} sub={S.profile.days} />
        <StatTile icon="icon_star_24x24" label={S.profile.wins} value={profile.duels.won} sub={S.profile.ofDuels(profile.duels.played)} />
      </Enter>

      <Enter index={index + 3} style={styles.section}>
        <SectionTitle>{S.profile.skills}</SectionTitle>
        <Card style={styles.skills}>
          {profile.skills.filter((s) => isActiveSubject(s.subject)).map((s) => (
            <SkillRow key={s.subject} skill={s} />
          ))}
        </Card>
      </Enter>

      <Enter index={index + 4} style={styles.section}>
        <SectionTitle>{S.profile.collection}</SectionTitle>
        <Card>
          <Text style={styles.count}>{S.profile.bgCount(bgs.length, BACKGROUNDS.length)}</Text>
          <View style={styles.wrap}>
            {bgs.map((b) => (
              <View
                key={b.id}
                accessible
                accessibilityLabel={S.shop.bgPreview(b.name)}
                style={[styles.swatch, { backgroundColor: b.hex }, b.id === bg.id && styles.swatchOn]}
              />
            ))}
          </View>
          <Text style={styles.count}>{S.profile.outfitCount(outfits.length, OUTFITS.length)}</Text>
          <View style={styles.wrap}>
            {outfits.map((o) => (
              <View key={o.id} accessible accessibilityLabel={o.name} style={[styles.outfit, { backgroundColor: o.tile }, worn.includes(o.id) && styles.swatchOn]}>
                <Sprite id={o.card} style={{ marginTop: o.imgTop }} />
              </View>
            ))}
          </View>
        </Card>
      </Enter>
    </>
  );
}

function StatTile({ icon, label, value, sub }: { icon: SpriteKey; label: string; value: number; sub: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value} ${sub}`}>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <View>
        <View style={styles.tileValueRow}>
          <Sprite id={icon} />
          <Text style={styles.tileValue}>{value}</Text>
        </View>
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function SkillRow({ skill }: { skill: SubjectSkill }) {
  const theme = subjectTheme[skill.subject];
  const line = S.profile.skillLine(skill.level, skill.bossesBeaten);
  const accuracy = S.profile.accuracy(skill.correct, skill.answered);
  return (
    <View style={styles.skill} accessible accessibilityLabel={`${subjectNames[skill.subject]}: ${line}, ${accuracy}`}>
      <View style={[styles.glyph, { backgroundColor: theme.bg }]}>
        <Text style={[styles.glyphText, { color: theme.fg }]} numberOfLines={1}>
          {theme.glyph}
        </Text>
      </View>
      <View style={styles.skillBody}>
        <View style={styles.skillHead}>
          <Text style={styles.skillName}>{subjectNames[skill.subject]}</Text>
          <Text style={styles.skillAcc}>{accuracy}</Text>
        </View>
        <Text style={styles.skillLine}>{line}</Text>
        <ProgressBar value={skill.correct} max={skill.answered} height={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 2 },
  // профайлын зураг тайзны доод ирмэгт давхарлана
  photo: { marginTop: -48, marginBottom: 6 },
  bar: { alignSelf: 'stretch', paddingHorizontal: 18, marginTop: 8 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 104, padding: 12, borderRadius: 22, backgroundColor: colors.white, justifyContent: 'space-between' },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileValue: { fontFamily: fonts.pixelNum, fontSize: 24, lineHeight: 27, color: colors.ink },
  tileSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  section: { gap: 10 },
  skills: { gap: 16 },
  skill: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: { width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  glyphText: { fontFamily: fonts.extrabold, fontSize: 15 },
  skillBody: { flex: 1, gap: 4 },
  skillHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  skillName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  skillAcc: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  skillLine: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  count: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 12, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.ink },
  outfit: { width: 64, height: 56, borderRadius: 16, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', overflow: 'hidden' },
});
