import { type ReactNode, type Ref, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Enter, Motion, Pop, SheetFrame, Shake, Sprite, ZoomEnter } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { useTagPlayer } from '@/hooks/useTagPlayer';
import { S } from '@/i18n/strings';
import home from '@/lib/pixelBear/bear-home.json';
import type { SpriteKey } from '@/sprites';

/** Баавгайн байдал: `peek` = нууц үг бичиж байхад нүдээ дарна, `yay` = бүгд зөв, `oops` = алдаа */
export type AuthMood = 'idle' | 'peek' | 'yay' | 'oops';

type Range = [from: number, to: number, direction?: 'forward' | 'pingpong'];
/** mood → апп-ын PixelLab frame-үүд (scripts/home-sprites.ts): `once` нэг удаа, дараа нь `loop` давтана */
const MOODS: Record<AuthMood, { id: SpriteKey; anim: keyof typeof home; once: Range; loop: Range; label: string }> = {
  idle: { id: 'bear_home_happy_1260x260', anim: 'happy', once: [0, 0], loop: [0, 6], label: 'Гараа даллаж буй pixel хүрэн баавгай' },
  peek: { id: 'bear_home_ouch_1092x272', anim: 'ouch', once: [0, 6], loop: [6, 6], label: 'Нүдээ сарвуугаараа дарсан баавгай' },
  yay: { id: 'bear_home_thriving_940x280', anim: 'thriving', once: [0, 0], loop: [0, 4, 'pingpong'], label: 'Гараа өргөж баярласан баавгай' },
  oops: { id: 'bear_home_ouch_1092x272', anim: 'ouch', once: [0, 2], loop: [2, 2], label: 'Гайхсан баавгай' },
};

function MoodBear({ mood }: { mood: AuthMood }) {
  const m = MOODS[mood];
  const meta = useMemo(() => {
    const tag = ([from, to, direction = 'forward']: Range) => ({ from, to, direction });
    return { frames: home[m.anim].frames, tags: { once: tag(m.once), loop: tag(m.loop) } };
  }, [m]);
  const frame = useTagPlayer(meta, ['once'], 'loop');
  return <SheetFrame id={m.id} frames={meta.frames.length} frame={frame} label={m.label} />;
}

// shortcut: серверийн дүрмийг (api/src/lib/auth.ts, config/game.ts AUTH) давхар бичсэн; зөвхөн ✓/✕ харуулахад, шалгалт нь серверт
export const usernameOk = (s: string) => /^[\p{L}\p{N}_]{3,20}$/u.test(s.trim());
export const passwordOk = (s: string) => s.length >= 6 && s.length <= 72;

/**
 * Нэвтрэх/бүртгүүлэх дэлгэцийн хүрээ (Ahead апп-ын onboarding маягаар): лаванда тайз дээр урвалтай баавгай + хэлэх үг,
 * гарчиг, форм (`shake` өөрчлөгдөх бүрт сэгсэрнэ), доод холбоос; `busy` үед баавгайтай loader.
 */
export function AuthShell({
  title,
  sub,
  hello,
  top,
  mood,
  shake,
  busy,
  children,
  link,
  onLink,
}: {
  title: string;
  sub: string;
  /** баавгайн анхны үг (mood = idle) */
  hello: string;
  top?: ReactNode;
  mood: AuthMood;
  shake: number;
  busy: boolean;
  children: ReactNode;
  link: string;
  onLink: () => void;
}) {
  const say = { idle: hello, peek: S.auth.sayPeek, yay: S.auth.sayReady, oops: S.auth.sayOops }[mood];
  return (
    <Screen contentStyle={styles.content}>
      {top}
      <View style={styles.stage}>
        <ZoomEnter style={styles.halo}>
          <Motion preset="breathe">
            <View style={styles.haloCircle} />
          </Motion>
        </ZoomEnter>
        <ZoomEnter delay={150} style={[styles.abs, { left: 6, top: 70 }]}>
          <Motion preset="float">
            <View style={[styles.blob, { width: 34, height: 34, backgroundColor: colors.lime }]} />
          </Motion>
        </ZoomEnter>
        <ZoomEnter delay={250} style={[styles.abs, { right: 14, bottom: 40 }]}>
          <Motion preset="float" delay={800}>
            <View style={[styles.blob, { width: 22, height: 22, backgroundColor: colors.lemon }]} />
          </Motion>
        </ZoomEnter>
        <Motion preset="twinkle" style={[styles.abs, { left: 34, bottom: 70 }]}>
          <Sprite id="icon_star_36x36" />
        </Motion>
        <Motion preset="twinkle" delay={900} style={[styles.abs, { right: 30, top: 96 }]}>
          <Sprite id="icon_heart_36x36" />
        </Motion>
        <Pop trigger={mood} from={0.9} style={styles.bear}>
          <MoodBear key={mood} mood={mood} />
        </Pop>
        <ZoomEnter key={say} delay={mood === 'idle' ? 300 : 0} style={styles.bubbleAt}>
          <SpeechBubble>{say}</SpeechBubble>
        </ZoomEnter>
      </View>
      <Enter index={1} style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.sub}>{sub}</Text>
      </Enter>
      <Enter index={2}>
        <Shake trigger={shake} style={styles.form}>
          {children}
        </Shake>
      </Enter>
      <Enter index={3}>
        <Pressable accessibilityRole="link" onPress={onLink} style={styles.linkWrap}>
          <Text style={styles.link}>{link}</Text>
        </Pressable>
      </Enter>
      <BusyOverlay visible={busy} />
    </Screen>
  );
}

/** Баавгайн хэлэх үг: бүртгэл, баавгай, асуулт бүгд энэ нэг хөөсийг хэрэглэнэ. `tail` = баавгай аль талд байна. */
export function SpeechBubble({ children, tail = 'bottom', size = 'sm' }: { children: string; tail?: 'bottom' | 'left'; size?: 'sm' | 'lg' }) {
  return (
    <View style={styles.bubble}>
      <Text style={size === 'lg' ? styles.bubbleTextLg : styles.bubbleText} accessibilityLiveRegion="polite">
        {children}
      </Text>
      <View style={[styles.tail, tail === 'left' && styles.tailLeft]} />
    </View>
  );
}

/** Илгээж байх үеийн loader: бүрхэвч дээр цагаан хайрцагнаас баавгай шагайж, гурван цэг ээлжлэн дэвхцэнэ. */
function BusyOverlay({ visible }: { visible: boolean }) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.scrim} accessibilityViewIsModal accessibilityLabel={S.auth.busy}>
        <ZoomEnter style={styles.loader}>
          <Motion preset="bob">
            <Sprite id="avatar_brown_calm_plain_160x160" style={{ width: 96, height: 96 }} />
          </Motion>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <Motion key={i} preset="bob" delay={i * 200}>
                <View style={styles.dot} />
              </Motion>
            ))}
          </View>
          <Text style={styles.loaderText}>{S.auth.busy}</Text>
        </ZoomEnter>
      </View>
    </Modal>
  );
}

/**
 * Ahead маягийн оролт: шошго нь дотроо, фокуслах эсвэл утгатай үед дээш жижгэрч хөвнө; фокуст нил ягаан хүрээ,
 * `valid` өгвөл баруун талд ✓/✕ pop хийнэ (null = хоосон). `right` = нэмэлт товч (нууц үг харах).
 */
export function AuthField({
  label,
  hint,
  valid,
  right,
  inputRef,
  ...props
}: TextInputProps & { label: string; hint?: string; valid: boolean | null; right?: ReactNode; inputRef?: Ref<TextInputInstance> }) {
  const reduce = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const bad = valid === false && !focused;
  const up = focused || !!props.value;
  const lift = useSharedValue(up ? 1 : 0);
  const glow = useSharedValue(0);
  useEffect(() => {
    lift.value = reduce ? (up ? 1 : 0) : withTiming(up ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [up, reduce, lift]);
  useEffect(() => {
    glow.value = withTiming(bad ? 2 : focused ? 1 : 0, { duration: reduce ? 0 : 160 });
  }, [bad, focused, reduce, glow]);
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1], [0, -11]) }, { scale: interpolate(lift.value, [0, 1], [1, 0.76]) }],
  }));
  const boxStyle = useAnimatedStyle(() => ({ borderColor: interpolateColor(glow.value, [0, 1, 2], [colors.line, colors.violet, colors.dangerText]) }));
  return (
    <View style={styles.field}>
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.Text pointerEvents="none" style={[styles.floatLabel, labelStyle]}>
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={valid === false ? hint : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {valid === null ? null : (
          <ZoomEnter key={String(valid)} style={[styles.badge, { backgroundColor: valid ? colors.okText : colors.dangerText }]}>
            <Text style={styles.badgeText} accessibilityLabel={valid ? 'зөв' : 'буруу'}>
              {valid ? '✓' : '✕'}
            </Text>
          </ZoomEnter>
        )}
        {right}
      </Animated.View>
      {hint ? <Text style={[styles.hint, bad && { color: colors.dangerText }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 8, gap: 14 },
  abs: { position: 'absolute' },
  stage: { height: 300, alignItems: 'center', justifyContent: 'flex-end' },
  halo: { position: 'absolute', bottom: 0, alignSelf: 'center' },
  haloCircle: { width: 230, height: 230, borderRadius: 115, backgroundColor: colors.lavender },
  blob: { borderRadius: 999 },
  bear: { marginBottom: -6 },
  bubbleAt: { position: 'absolute', top: 0, right: 0, maxWidth: 190 },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    ...hardShadow(3),
  },
  bubbleText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  bubbleTextLg: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  tail: {
    position: 'absolute',
    left: 22,
    bottom: -8,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  tailLeft: { left: -8, bottom: 18, borderRightWidth: 0, borderTopWidth: 0, borderLeftWidth: 2 },
  head: { alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: colors.ink, textAlign: 'center' },
  sub: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  form: { gap: 14 },
  field: { gap: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingRight: 12,
    minHeight: 60,
  },
  floatLabel: { position: 'absolute', left: 16, top: 18, fontFamily: fonts.medium, fontSize: 16, color: colors.mutedIcon, transformOrigin: 'left center' },
  // web: хүрээ нь box дээр тул браузерын focus outline-ийг давхар харуулахгүй
  input: { flex: 1, minWidth: 0, alignSelf: 'stretch', paddingLeft: 16, paddingTop: 20, paddingBottom: 6, fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, outlineWidth: 0 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.white },
  hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, paddingLeft: 4 },
  linkWrap: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 16, color: colors.indigo },
  scrim: { flex: 1, backgroundColor: 'rgba(25,21,46,0.45)', alignItems: 'center', justifyContent: 'center' },
  loader: { backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 22, paddingHorizontal: 28, alignItems: 'center', gap: 10, ...hardShadow(4) },
  dots: { flexDirection: 'row', gap: 8, height: 16, alignItems: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.violet },
  loaderText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
