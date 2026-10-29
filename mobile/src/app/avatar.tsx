import type { AvatarBody, BearFur, MeResponse } from '@shared/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, errorText } from '@/api/client';
import { useMe, useAuth } from '@/auth/AuthContext';
import { SpeechBubble } from '@/components/AuthShell';
import { Avatar, type PortraitLook } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FlowTop } from '@/components/onboarding/FlowTop';
import { Enter, Pop, PressScale } from '@/components/pixel';
import { BackButton, Card, Chip, ErrorText, Screen, TextField } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';
import { S } from '@/i18n/strings';
import { goBack } from '@/lib/nav';

// үсний дээж: avatar-sprites.ts-ийн ramp-ийн дунд өнгө
const FURS: { id: BearFur; hex: string }[] = [
  { id: 'brown', hex: '#b66b45' },
  { id: 'black', hex: '#3f3946' },
  { id: 'white', hex: '#f5f2f7' },
];

/**
 * Профайл үүсгэх (бүртгүүлсний дараах 2-р алхам) ба профайлаас «Зураг солих»: профайлын нэр, баавгайн үсний өнгө,
 * цээжний цагаан толбо. Том хөрөг сонголт бүрт шууд солигдоно. Царайг сонгуулахгүй: Нүүрэн дээрх баавгай өөрөө янз
 * бүрийн царай гаргадаг тул хөрөг хадгалсан (эсвэл анхдагч тайван) царайгаа үлдээнэ.
 */
export default function AvatarScreen() {
  const me = useMe();
  const { setMe } = useAuth();
  // хадгалсны дараа profileSet үнэн болох тул горимыг эхэнд нь тогтооно
  const [editing] = useState(me.profileSet);
  // хуучин кэшэлсэн профайлд name, үс, царай байхгүй байж болно
  const [name, setName] = useState(me.name ?? me.username);
  const [look, setLook] = useState<PortraitLook>({ fur: me.look.fur ?? 'brown', face: me.look.face ?? 'calm', chest: me.look.chest ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = (patch: Partial<PortraitLook>) => setLook((l) => ({ ...l, ...patch }));

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(S.avatar.nameEmpty);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api<MeResponse>('/me/avatar', { method: 'PUT', body: { name: trimmed, ...look } satisfies AvatarBody });
      setMe(res.me);
      // анх бол Нүүр рүү: хичээлээ сонгоогүй бол тэндээс 3-р алхам (onboarding) руу шилжинэ
      if (editing) goBack();
      else router.replace('/');
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      {editing ? (
        <View style={styles.top}>
          <BackButton onPress={() => goBack()} />
          <Text accessibilityRole="header" style={type.h1}>
            {S.avatar.editTitle}
          </Text>
        </View>
      ) : (
        <FlowTop step={2} />
      )}

      <Enter index={0} style={styles.hero}>
        {editing ? null : <SpeechBubble size="lg">{S.avatar.bubble}</SpeechBubble>}
        <Pop trigger={`${look.fur}${look.chest}`}>
          <Avatar size={172} border={6} look={look} label={S.avatar.preview(name.trim())} />
        </Pop>
      </Enter>

      <Enter index={1}>
        <Card style={styles.card}>
          <TextField label={S.avatar.name} hint={S.avatar.nameHint} value={name} onChangeText={setName} maxLength={20} autoCapitalize="words" />

          <View style={styles.group}>
            <Text style={styles.label}>{S.avatar.fur}</Text>
            <View accessibilityRole="radiogroup" style={styles.row}>
              {FURS.map((f) => {
                const on = look.fur === f.id;
                return (
                  <PressScale
                    key={f.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={S.avatar.furs[f.id]}
                    onPress={() => pick({ fur: f.id })}
                    style={[styles.option, styles.furOption, on && styles.on]}
                  >
                    <View style={[styles.swatch, { backgroundColor: f.hex }]} />
                    <Text style={styles.optionText}>{S.avatar.furs[f.id]}</Text>
                  </PressScale>
                );
              })}
            </View>
          </View>

          <View style={styles.group}>
            <Text style={styles.label}>{S.avatar.chest}</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              <Chip label={S.avatar.chestOn} selected={look.chest} onPress={() => pick({ chest: true })} />
              <Chip label={S.avatar.chestOff} selected={!look.chest} onPress={() => pick({ chest: false })} />
            </View>
          </View>

          <ErrorText>{error}</ErrorText>
          <Button title={editing ? S.avatar.save : S.avatar.continue} onPress={save} loading={busy} />
        </Card>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 12, gap: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { alignItems: 'center', gap: 14 },
  card: { gap: 18, borderWidth: 2, borderColor: colors.line },
  group: { gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { flex: 1, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  on: { borderColor: colors.violet, backgroundColor: colors.trackAlt },
  furOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.ink },
  optionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
