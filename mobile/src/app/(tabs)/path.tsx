import type { Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/AuthContext';
import { useTabBarSpace } from '@/components/BottomNav';
import { MAP_H, PathMap } from '@/components/PathMap';
import { PressScale } from '@/components/pixel';
import { TopBar } from '@/components/TopBar';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { currentNode, lessonTitle, NODE_COUNT, NODES, type NodeStatus } from '@/lib/pixelBear/path';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const CTA_SPACE = 112;

/** 04 · Сурах зам (pixel ойн газрын зураг). */
export default function PathScreen() {
  const { me, refreshMe } = useAuth();
  const { subject: savedSubject, setSubject } = usePixelBear();
  const subject: Subject = savedSubject ?? 'math';
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const scroll = useRef<ScrollView>(null);
  const [viewH, setViewH] = useState(0);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  const current = me ? currentNode(me) : 0;

  // Одоогийн зангилааг дэлгэцийн дунд харуулна (XP өсөхөд зөөлөн гүйлгэнэ)
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (!viewH) return;
    const total = MAP_H + CTA_SPACE + barSpace;
    const y = Math.max(0, Math.min(total - viewH, NODES[current].y - viewH * 0.55));
    scroll.current?.scrollTo({ y, animated: scrolledOnce.current });
    scrolledOnce.current = true;
  }, [current, viewH, barSpace]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2200);
    return () => clearTimeout(t);
  }, [note]);

  if (!me) return null;
  const limitReached = me.todayTasks >= me.dailyLimit;

  function start() {
    if (limitReached) {
      setNote(S.home.limitReached);
      return;
    }
    router.push(`/task/${subject}`);
  }

  function onNode(i: number, status: NodeStatus) {
    if (status === 'lock') setNote(S.path.locked);
    else if (status === 'done') setNote(`${lessonTitle(subject, i)} · ${S.path.done}`);
    else start();
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        onLayout={(e: LayoutChangeEvent) => setViewH(e.nativeEvent.layout.height)}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: CTA_SPACE + barSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <PathMap current={current} subject={subject} onNodePress={onNode} />
      </ScrollView>

      <View style={[styles.header, { top: insets.top + 6 }]} pointerEvents="box-none">
        <TopBar xp="level" onMap />
        <View style={styles.row2} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${S.path.subjectMenu}: ${subjectNames[subject]}`}
            accessibilityState={{ expanded: menu }}
            onPress={() => setMenu((m) => !m)}
            style={styles.dropdown}
          >
            <Text style={styles.dropText}>{subjectNames[subject]}</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d={menu ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </Svg>
          </Pressable>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{S.path.levelBadge(me.tier)}</Text>
          </View>
        </View>
        {menu ? (
          <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={styles.menu}>
            {SUBJECTS.map((s) => (
              <Pressable
                key={s}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: s === subject }}
                onPress={() => {
                  setSubject(s);
                  setMenu(false);
                }}
                style={[styles.menuItem, s === subject && { backgroundColor: colors.indigo }]}
              >
                <Text style={[styles.menuText, s === subject && { color: colors.white }]}>{subjectNames[s]}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </View>

      {note ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.toast, { bottom: barSpace + 96 }]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{note}</Text>
        </Animated.View>
      ) : null}

      <View style={[styles.cta, { bottom: barSpace + 12 }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.ctaSmall} numberOfLines={1}>
            {S.path.chapter(1, subjectNames[subject], Math.min(current, NODE_COUNT), NODE_COUNT)}
          </Text>
          <Text style={styles.ctaTitle} numberOfLines={1}>
            {lessonTitle(subject, current)}
          </Text>
        </View>
        <PressScale accessibilityRole="button" accessibilityLabel={`${S.path.start}: ${lessonTitle(subject, current)}`} onPress={start} style={styles.ctaBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M7 4.5v15l13-7.5z" fill={colors.ink} />
          </Svg>
          <Text style={styles.ctaBtnText}>{S.path.start}</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#D6E6C3' },
  scrollContent: { alignItems: 'center' },
  header: { position: 'absolute', left: 20, right: 20, gap: 10 },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdown: {
    height: 40,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  badge: { height: 30, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: colors.lime, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 0.7, color: colors.ink },
  menu: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 20, padding: 6, gap: 4, borderWidth: 2, borderColor: colors.ink },
  menuItem: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  menuText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.ink,
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white, textAlign: 'center' },
  cta: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    height: 72,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...hardShadow(4),
  },
  ctaSmall: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.3, color: colors.ink },
  ctaBtn: {
    height: 48,
    paddingLeft: 14,
    paddingRight: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.lemon,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaBtnText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink },
});
