import type { ComponentRef, ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarSpace } from '@/components/BottomNav';
import { colors, fonts, radius } from '@/constants/theme';
import { type } from '@/constants/type';

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  background = colors.paper,
  edges = ['top', 'left', 'right'],
  tabBar,
  scrollRef,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  background?: string;
  edges?: Edge[];
  /** Хөвдөг доод цэсний доор контент нуугдахгүй байх зай */
  tabBar?: boolean;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
}) {
  const barSpace = useTabBarSpace();
  const bottom = tabBar ? { paddingBottom: barSpace + 16 } : null;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.content, bottom, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.violet} /> : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, bottom, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={type.h1}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={[type.h3, { marginTop: 6 }]}>
      {children}
    </Text>
  );
}

export function Muted({ children, center }: { children: ReactNode; center?: boolean }) {
  return <Text style={[type.small, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {children}
    </Text>
  );
}

export function TextField({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedIcon}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  color = colors.violet,
  trackColor = colors.track,
  height = 12,
}: {
  value: number;
  max: number;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.indigo,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, selected ? { backgroundColor: color } : null]}
    >
      <Text style={[styles.chipText, selected ? { color: colors.white } : null]}>{label}</Text>
    </Pressable>
  );
}

/** Дээрээсээ "‹" буцах товч (≥44px). */
export function BackButton({ onPress, label = 'Буцах' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back} hitSlop={8}>
      <Text style={styles.backGlyph}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  fill: { flex: 1 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 16, gap: 12 },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, letterSpacing: 0.3 },
  hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  input: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
    minHeight: 54,
  },
  track: { overflow: 'hidden', width: '100%' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 32, color: colors.ink, marginTop: -3 },
});
