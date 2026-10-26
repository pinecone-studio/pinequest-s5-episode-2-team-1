import type { BookLesson, LessonsResponse, Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useTabBarSpace } from '@/components/BottomNav';
import { PathMap } from '@/components/PathMap';
import { PressScale } from '@/components/pixel';
import { TopBar } from '@/components/TopBar';
import { colors, fonts, hardShadow, radius } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { kvGet, kvSet } from '@/lib/kv';
import { usePixelBear } from '@/lib/mock/pixelBear';
import { STAGES, stageDone } from '@shared/path';
import { bossAhead, currentNode, gateOf, lessonAt, lessonTitle, type NodeStatus, pathLayout, pathLessons, unitOf } from '@/lib/pixelBear/path';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];
const CTA_SPACE = 112;
/** Нэг дор алхах хамгийн олон зангилаа (олон шат ахисан бол сүүлийн хэсгийг л алхана) */
const MAX_WALK = 6;

/** 04 · Сурах зам (адал явдлын газрын зураг). */
export default function PathScreen() {
  const { me, refreshMe } = useAuth();
  const { subject: savedSubject, setSubject } = usePixelBear();
  const subject: Subject = savedSubject ?? 'math';
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // ScrollView бүтэн дэлгэцийг эзэлдэг (толгой, цэс дээр нь хөвнө); web дээр onLayout анх ажилладаггүй
  const viewH = useWindowDimensions().height;
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** шат сонгох цонх нээгдсэн зангилаа */
  const [sheet, setSheet] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshMe();
    }, [refreshMe]),
  );

  // Замын сэдвүүд = хэрэглэгчийн ангийн сурах бичгийн хичээлүүд; ачаалж амжаагүй, алдаа гарсан бол хуучин сэдвүүд
  const [book, setBook] = useState<{ subject: Subject; lessons: BookLesson[] } | null>(null);
  useEffect(() => {
    let alive = true;
    api<LessonsResponse>(`/me/lessons/${subject}`)
      .then((r) => alive && setBook({ subject, lessons: r.lessons }))
      .catch(() => alive && setBook(null));
    return () => {
      alive = false;
    };
  }, [subject]);
  const lessons = book?.subject === subject ? book.lessons : [];
  // Замын урт = хичээлийн тоо + boss: хичээл бүр нэг зангилаа
  const n = pathLessons(lessons.length);
  const layout = useMemo(() => pathLayout(n), [n]);

  // Хичээл бүр өөрийн сурах замтай: хичээл солиход тэр хичээлийн хамгийн сүүлд хүрсэн зангилаа гарна.
  const path = me?.paths[subject];
  const current = path ? currentNode(n, path) : 0;
  const bossFight = !!path && bossAhead(n, current, path.bossesBeaten);
  const unit = layout.units[unitOf(n, current)];
  const userId = me?.id;

  // Баавгай сүүлд харсан зангилаанаасаа одоогийнх руу алхана (апп хаагдсан ч төхөөрөмж дээр санана)
  const [from, setFrom] = useState<number | null>(null);
  useEffect(() => {
    if (userId === undefined) return;
    let alive = true;
    setFrom(null); // өөр хичээлийн замаас алхаж ирэхгүй
    const key = `pq.path.seen.${userId}.${subject}`;
    void kvGet<number>(key).then((seen) => {
      if (!alive) return;
      setFrom(seen === null || seen >= current ? current : Math.max(seen, current - MAX_WALK));
      void kvSet(key, current);
    });
    return () => {
      alive = false;
    };
  }, [userId, subject, current]);

  // Одоогийн зангилааг дэлгэцийн дунд харуулна (XP өсөхөд зөөлөн гүйлгэнэ)
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (userId === undefined) return; // ScrollView нь me ирсний дараа л mount болно
    const total = layout.height + CTA_SPACE + barSpace;
    const y = Math.max(0, Math.min(total - viewH, layout.nodes[current].y - viewH * 0.55));
    scroll.current?.scrollTo({ y, animated: scrolledOnce.current });
    scrolledOnce.current = true;
  }, [userId, current, viewH, barSpace, layout]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2200);
    return () => clearTimeout(t);
  }, [note]);

  if (!me) return null;
  /** Зангилааны давсан шат ба дараагийн нээлттэй шат */
  const doneAt = (i: number) => stageDone(path?.stages ?? {}, i, current);
  const nextStage = Math.min(STAGES, doneAt(current) + 1);
  const openStage = (i: number, k: number) => {
    setSheet(null);
    router.push(`/task/${subject}?node=${i}&stage=${k}`);
  };
  function start() {
    if (bossFight) router.push(`/task/${subject}?boss=${gateOf(n, current)}`);
    else openStage(current, nextStage);
  }

  function onNode(i: number, status: NodeStatus) {
    const gate = gateOf(n, i);
    // Admin: дурын хаалга руу шууд, дурын зангилааны шат руу
    if (me?.admin && gate >= 0) return router.push(`/task/${subject}?boss=${gate}`);
    if (me?.admin) return setSheet(i);
    if (status === 'lock') setNote(S.path.locked);
    else if (gate >= 0) status === 'current' ? start() : setNote(`${lessonTitle(subject, i, lessons)} · ${S.path.done}`);
    else setSheet(i);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: CTA_SPACE + barSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <PathMap layout={layout} current={current} stages={path?.stages ?? {}} from={from} beaten={path?.bossesBeaten ?? 0} subject={subject} lessons={lessons} onNodePress={onNode} />
      </ScrollView>

      <View style={[styles.header, { top: insets.top + 6 }]} pointerEvents="box-none">
        <TopBar onMap />
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
            {lessonAt(lessons, current)?.chapter ??
              S.path.chapter(unitOf(n, current) + 1, subjectNames[subject], current - unit.start, unit.boss - unit.start + 1)}
          </Text>
          <Text style={styles.ctaTitle} numberOfLines={1}>
            {lessonTitle(subject, current, lessons)}
          </Text>
        </View>
        <PressScale accessibilityRole="button" accessibilityLabel={`${S.path.start}: ${lessonTitle(subject, current, lessons)}`} onPress={start} style={styles.ctaBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M7 4.5v15l13-7.5z" fill={colors.ink} />
          </Svg>
          <Text style={styles.ctaBtnText}>{bossFight ? S.path.start : S.path.stages[nextStage - 1]}</Text>
        </PressScale>
      </View>

      {sheet === null ? null : (
        <Pressable accessibilityLabel={S.path.close} onPress={() => setSheet(null)} style={[styles.sheetBack, { paddingBottom: barSpace + 12 }]}>
          {/* цонхон дээр дарвал хаагдахгүй */}
          <Animated.View entering={FadeInDown.duration(180)} style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {lessonTitle(subject, sheet, lessons)}
            </Text>
            <Text style={styles.sheetHint}>{S.path.stageHint}</Text>
            {S.path.stages.map((name, k) => {
              const stage = k + 1;
              const done = doneAt(sheet) >= stage;
              const open = !!me.admin || stage <= doneAt(sheet) + 1;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`${stage}. ${name}, ${done ? S.path.stageDone : open ? S.path.stageOpen : S.path.stageLocked}`}
                  accessibilityState={{ disabled: !open }}
                  onPress={() => (open ? openStage(sheet, stage) : setNote(S.path.stageLocked))}
                  style={[styles.stageRow, { backgroundColor: done ? colors.lime : open ? colors.lemon : colors.paper, opacity: open ? 1 : 0.6 }]}
                >
                  <Text style={styles.stageNo}>{stage}</Text>
                  <Text style={styles.stageName}>{name}</Text>
                  <Text style={styles.stageState}>{done ? `✓ ${S.path.stageDone}` : open ? `▶ ${S.path.stageOpen}` : '🔒'}</Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setSheet(null)} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>{S.path.close}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // газрын зургийн доод захын (1-р бүлэг) өнгө: доод карт, цэсний ард хоосон ногоон зурвас гарахгүй
  root: { flex: 1, backgroundColor: '#2E1766' },
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
  sheetBack: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,16,40,0.45)', justifyContent: 'flex-end' },
  sheet: {
    marginHorizontal: 12,
    padding: 16,
    gap: 10,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    ...hardShadow(4),
  },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3, color: colors.ink },
  sheetHint: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted },
  stageRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageNo: { fontFamily: fonts.pixel, fontSize: 20, color: colors.ink, width: 22, textAlign: 'center' },
  stageName: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  stageState: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  sheetClose: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  sheetCloseText: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
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
