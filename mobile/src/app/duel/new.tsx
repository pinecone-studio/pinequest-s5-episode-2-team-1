import type { CreateDuelBody, DuelResponse, DuelVisibility, Subject } from '@shared/types';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { Button } from '@/components/Button';
import { StakeStepper } from '@/components/duel/StakeStepper';
import { PixelText } from '@/components/pinecones';
import { StepCard } from '@/components/duel/StepCard';
import { SubjectPicker } from '@/components/duel/SubjectPicker';
import { TeamSizePicker } from '@/components/duel/TeamSizePicker';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BackButton, ErrorText, Screen } from '@/components/ui';
import { DUEL_SUBJECTS } from '@/constants/subjects';
import { colors, fonts, radius } from '@/constants/theme';
import { useLobbyOnce } from '@/hooks/useLobbyOnce';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

/** Тулаан үүсгэх: 1 хичээл → 2 горим → 3 бооцоо → 4 хэнтэй, доор нь наалттай товч. Үүсгэмэгц лобби руу буцаж өрсөлдөгчөө хүлээнэ. */
export default function NewDuel() {
  const { lobby, error: loadError } = useLobbyOnce();
  const { width } = useWindowDimensions();
  const [subject, setSubject] = useState<Subject>(DUEL_SUBJECTS[0]);
  const [teamSize, setTeamSize] = useState(1);
  const [stakeText, setStakeText] = useState('1');
  const [visibility, setVisibility] = useState<DuelVisibility>('public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const max = lobby?.maxStake ?? 0;
  const stake = Number.parseInt(stakeText, 10);
  const invalid = !Number.isInteger(stake) || stake < 1 || stake > max;
  const shown = Number.isInteger(stake) ? stake : 0;
  const matching = lobby ? lobby.open.filter((d) => d.subject === subject && d.stake <= max).length : 0;

  async function create() {
    setBusy(true);
    setError('');
    try {
      await api<DuelResponse>('/duels', { body: { subject, stake, visibility, teamSize } satisfies CreateDuelBody });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack('/duel');
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const footer = (
    <>
      <ErrorText>{error}</ErrorText>
      <Button
        title={teamSize > 1 ? S.duel.createTeamButton(teamSize, shown) : S.duel.createButton(shown)}
        variant="lemon"
        disabled={!lobby || invalid}
        loading={busy}
        onPress={create}
      />
    </>
  );

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} footer={footer}>
      <View style={styles.header}>
        <BackButton onPress={() => goBack('/duel')} />
        <View accessibilityRole="header">
          {/* 273dp өргөн: 375-аас нарийн дэлгэцэд буцах товчтой багтахгүй тул 2 болгоно */}
          <PixelText text={S.duel.createTitle} px={width >= 375 ? 3 : 2} color={colors.ink} shadow={colors.stone} />
        </View>
      </View>

      {!lobby ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.violet} />
          <ErrorText>{loadError}</ErrorText>
        </View>
      ) : (
        <>
          <StepCard n={1} title={S.duel.subject}>
            <SubjectPicker value={subject} onChange={setSubject} />
            {matching > 0 ? (
              <Pressable accessibilityRole="link" onPress={() => goBack('/duel')} style={styles.matching}>
                <Text style={styles.matchingText}>{S.duel.matching(matching, subject)}</Text>
              </Pressable>
            ) : null}
          </StepCard>

          <StepCard n={2} title={S.duel.mode} hint={S.duel.modeHint(teamSize)}>
            <TeamSizePicker value={teamSize} onChange={setTeamSize} />
          </StepCard>

          {max < 1 ? (
            <StepCard n={3} title={S.duel.stake} hint={S.duel.notEnough} danger>
              {null}
            </StepCard>
          ) : (
            <StepCard n={3} title={S.duel.stake} hint={invalid && stake > max ? S.duel.stakeTooHigh(max) : S.duel.stakeMax(max)} danger={invalid}>
              <StakeStepper value={stakeText} onChange={setStakeText} invalid={invalid} />
            </StepCard>
          )}

          <StepCard n={4} title={S.duel.who} hint={visibility === 'private' ? S.duel.visPrivateHint : S.duel.visPublicHint}>
            <SegmentedTabs
              label={S.duel.who}
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'public', label: S.duel.visPublic },
                { value: 'private', label: S.duel.visPrivate },
              ]}
            />
          </StepCard>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loading: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  matching: { backgroundColor: colors.lavender, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10 },
  matchingText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.indigo },
});
