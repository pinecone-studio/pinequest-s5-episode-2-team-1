import type { CreateDuelBody, DuelVisibility, Subject } from '@shared/types';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Card, Muted } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { StakeStepper } from './StakeStepper';
import { SubjectPicker } from './SubjectPicker';
import { TeamSizePicker } from './TeamSizePicker';

/** Сорилт үүсгэх: горим (1 vs 1 … 5 vs 5), хичээл, бооцоо, хэнтэй. */
export function CreateDuelCard({
  subject,
  onSubject,
  max,
  matching,
  loading,
  onCreate,
}: {
  subject: Subject;
  onSubject: (s: Subject) => void;
  max: number;
  /** Сонгосон хичээлээр хүлээж буй тулааны тоо */
  matching: number;
  loading: boolean;
  onCreate: (body: CreateDuelBody) => void;
}) {
  const [teamSize, setTeamSize] = useState(1);
  const [stakeText, setStakeText] = useState('1');
  const [visibility, setVisibility] = useState<DuelVisibility>('public');
  const stake = Number.parseInt(stakeText, 10);
  const invalid = !Number.isInteger(stake) || stake < 1 || stake > max;
  const shown = Number.isInteger(stake) ? stake : 0;

  return (
    <Card>
      <Text style={styles.title}>{S.duel.createTitle}</Text>
      <Text style={styles.label}>{S.duel.mode}</Text>
      <TeamSizePicker value={teamSize} onChange={setTeamSize} />
      <Text style={styles.hint}>{S.duel.modeHint(teamSize)}</Text>

      <Text style={styles.label}>{S.duel.subject}</Text>
      <SubjectPicker value={subject} onChange={onSubject} />

      <Text style={styles.label}>{S.duel.stake}</Text>
      {max < 1 ? (
        <Muted>{S.duel.notEnough}</Muted>
      ) : (
        <>
          <StakeStepper value={stakeText} onChange={setStakeText} invalid={invalid} />
          <Text style={[styles.hint, invalid && { color: colors.dangerText, fontFamily: fonts.bold }]}>
            {invalid && stake > max ? S.duel.stakeTooHigh(max) : S.duel.stakeMax(max)}
          </Text>
          <Text style={styles.label}>{S.duel.who}</Text>
          <SegmentedTabs
            label={S.duel.who}
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'public', label: S.duel.visPublic },
              { value: 'private', label: S.duel.visPrivate },
            ]}
          />
          <Text style={styles.hint}>{visibility === 'private' ? S.duel.visPrivateHint : S.duel.visPublicHint}</Text>
          {matching > 0 ? (
            <View style={styles.matching}>
              <Text style={styles.matchingText}>{S.duel.matching(matching, subject)}</Text>
            </View>
          ) : null}
          <Button
            title={teamSize > 1 ? S.duel.createTeamButton(teamSize, shown) : S.duel.createButton(shown)}
            variant="lemon"
            disabled={invalid}
            loading={loading}
            onPress={() => onCreate({ subject, stake, visibility, teamSize })}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted, marginTop: 2 },
  hint: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  matching: { backgroundColor: colors.lavender, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  matchingText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.indigo },
});
