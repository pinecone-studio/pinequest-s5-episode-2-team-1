import { STAGES, stageDone } from '@shared/path';
import type { BookLesson, LessonsResponse, Subject } from '@shared/types';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { MapHeader } from '@/components/MapHeader';
import { useTabBarSpace } from '@/components/BottomNav';
import { NodePopover, POPOVER_INSET } from '@/components/NodePopover';
import { MAP_H, PathMap, useMapScale } from '@/components/PathMap';
import { setChapterTheme, themeOf } from '@/constants/chapterTheme';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import {
  BOSSES,
  bossAhead,
  chapterAtY,
  currentNode,
  gateOf,
  lessonAt,
  lessonTitle,
  MAP_CHAPTERS,
  type NodeStatus,
  pathLayout,
  pathLessons,
  pathSubject,
  statusOf,
  unitOf,
} from '@/lib/pixelBear/path';

/** Popover-ын өндрийг хэмжихээс өмнөх тооцоо */
const POP_EST = 180;
/** Popover зангилааны доор хэр холоос эхлэх: чулуу (цагирагтай) ба boss-ын арал (шошготой) */
const popOffset = (boss: boolean) => (boss ? 74 : 50);
/** Зангилааны дээд талд харагдах зай: boss-ын томорсон бие өндөр */
const nodeHead = (boss: boolean) => (boss ? 120 : 44);

/** 04 · Сурах зам (адал явдлын газрын зураг). */
export default function PathScreen() {
  const { me, refreshMe } = useAuth();
  const { subject: savedSubject, setSubject } = usePixelBear();
  const subject = pathSubject(savedSubject);
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // ScrollView бүтэн дэлгэцийг эзэлдэг (толгой, цэс дээр нь хөвнө); web дээр onLayout анх ажилладаггүй
  const { height: viewH, width: viewW } = useWindowDimensions();
  // газрын зураг дэлгэцийн өргөнд томорно: зургийн y → дэлгэцийн y × k
  const k = useMapScale();
  // Толгойн бодит өндөр (scroll padding), сонгосон зангилаа, popover-ын өндөр, харагдаж буй бүлэг
  // Газрын зураг stat-уудын самбарын доороос эхэлнэ (mapTop); бүлгийн баннер зураг дээр хөвөх тул харагдах хэсгийн
  // дээд зах нь баннерын доод зах (headerH)
  const [mapTop, setMapTop] = useState(insets.top + 56);
  const [headerH, setHeaderH] = useState(insets.top + 140);
  // толгойн өндөр анх хэмжигдсэн эсэх: бүлгийн баннерын бичвэр солигдож өндөр өөрчлөгдөхөд дахин голлуулахгүй
  const [headerReady, setHeaderReady] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [cardH, setCardH] = useState(0);
  // Popover-ын зай (scroll padding): нээгдэхэд нэмэгдэнэ, хаахад газрын зураг доош үсрэхгүйн тулд гүйлгэж дууссаны дараа хасна
  const [pad, setPad] = useState(false);
  const padNode = useRef(0);
  const reduce = useReducedMotion();
  // дэлгэцийн төвд байгаа бүлэг; scroll хийтэл одоогийн зангилааных
  const [visible, setVisible] = useState<number | null>(null);
  const scrollY = useRef(0);

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
  const chapterIdx = visible ?? chapterAtY(layout.nodes[current].y);
  const chapter = MAP_CHAPTERS[chapterIdx].themeId;
  const theme = themeOf(chapter);

  // Самбарын theme: дэлгэцийн төвд байгаа бүлгийн; өөр tab руу гарахад үндсэн theme
  useFocusEffect(
    useCallback(() => {
      setChapterTheme(chapter);
      return () => setChapterTheme('default');
    }, [chapter]),
  );
  useEffect(() => setVisible(null), [layout, current]);
  useEffect(() => {
    setSel(null);
    setPad(false);
  }, [subject]);

  // Сүүлийн зангилаануудын popover газрын зургийн доод захаас хэтэрнэ: зөвхөн тэр хэсэгт нэмэлт scroll зай
  const popH = cardH || POP_EST;
  const padAt = layout.nodes[Math.min(padNode.current, layout.nodes.length - 1)];
  const reserve = pad ? Math.max(0, padAt.y * k + popOffset(padAt.kind === 'boss') + popH + 40 - MAP_H * k) : 0;
  /** popover-ын зайгүй үеийн хамгийн доод scroll: газрын зургийн доод зах цэсний дээд ирмэгт */
  const baseMax = mapTop + MAP_H * k + barSpace - viewH;
  /** `mapY` цэгийг толгой, доод цэсийн хоорондох хэсгийн төвд гаргах scroll */
  const centerOn = (mapY: number) => Math.max(0, Math.min(baseMax, mapTop + mapY * k + 4 - (headerH + (viewH - barSpace - headerH) / 2)));

  // Одоогийн зангилааг дэлгэцийн дунд харуулна (XP өсөхөд зөөлөн гүйлгэнэ)
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (userId === undefined) return; // ScrollView нь me ирсний дараа л mount болно
    scroll.current?.scrollTo({ y: centerOn(layout.nodes[current].y), animated: scrolledOnce.current });
    scrolledOnce.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, current, viewH, barSpace, headerReady, layout]);

  // Зангилаа ба доорх popover бүхэлдээ харагдахаар аажуухан гүйлгэнэ (padding нэмэгдсэний дараа; popover-ын бодит
  // өндөр хэмжигдэх, толгой өндөрсөхөд дахин шалгана). Хоёулаа багтахгүй бол зангилаа нь харагдана.
  useEffect(() => {
    if (sel === null) return;
    const node = layout.nodes[sel];
    const boss = node.kind === 'boss';
    const top = mapTop + node.y * k - nodeHead(boss);
    const bottom = mapTop + node.y * k + popOffset(boss) + popH + 28;
    let y = scrollY.current;
    if (bottom - y > viewH - barSpace) y = bottom - (viewH - barSpace);
    if (top - y < headerH) y = top - headerH;
    if (y !== scrollY.current) scroll.current?.scrollTo({ y: Math.max(0, y), animated: !reduce });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, cardH, headerH, mapTop]);

  const onHeaderHeight = useCallback((panel: number, total: number) => {
    setMapTop(panel);
    setHeaderH(total);
    setHeaderReady(true);
  }, []);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
    setVisible(chapterAtY((scrollY.current + (headerH + viewH - barSpace) / 2 - mapTop) / k));
    if (sel === null && pad && scrollY.current <= baseMax + 1) setPad(false);
  }

  function closeCard() {
    setSel(null);
    if (scrollY.current > baseMax + 1) scroll.current?.scrollTo({ y: Math.max(0, baseMax), animated: !reduce });
    else setPad(false);
  }

  if (!me) return null;
  /** Зангилааны давсан шат (1 Суурь, 2 Дунд, 3 Ахисан) ба дараагийн нээлттэй шат (бүгд давсан бол null) */
  const doneAt = (i: number) => stageDone(path?.stages ?? {}, i, current);
  const nextStage = (i: number) => (doneAt(i) >= STAGES ? null : doneAt(i) + 1);
  const xp = me.questionsPerTask * me.xpPerCorrect;

  /** Сонгосон зангилааг эхлүүлнэ: хаалга бол тулаан, бусад нь тэр зангилааны дараагийн шат (admin бүгд давсан бол Суурь) */
  function start(i: number) {
    const gate = gateOf(n, i);
    if (gate >= 0) return router.push(`/task/${subject}?boss=${gate}`);
    router.push(`/task/${subject}?node=${i}&stage=${nextStage(i) ?? 1}`);
  }

  function onNode(i: number, _status: NodeStatus) {
    // Admin: дурын хаалга руу шууд; бусад зангилааны popover-оос дурын шат руу
    if (me?.admin && gateOf(n, i) >= 0) return router.push(`/task/${subject}?boss=${gateOf(n, i)}`);
    padNode.current = i;
    setPad(true);
    setSel(i);
  }

  // одоогийн зангилааны цагираг: давсан шат бүр нэг хэсэг (хаалганд шат байхгүй)
  const ring = gateOf(n, current) >= 0 ? 0 : doneAt(current);
  const selNode = sel === null ? null : layout.nodes[sel];
  const selUnit = sel === null ? null : layout.units[unitOf(n, sel)];
  const selStatus = sel === null ? null : statusOf(sel, current);
  // Дээд баннер: харагдаж буй бүлэг, номын бүлгийн нэр (номгүй бол хичээлийн нэр)
  const chapterTitle = lessonAt(lessons, layout.units[chapterIdx].start)?.chapter;
  const over = S.path.chapterOver(chapterIdx + 1);
  // Popover: хаалга бол тулаан (зөвхөн одоогийнх), бусад нь дараагийн шат (түгжээтэй бол admin-аас бусад нь хаалттай)
  const selGate = sel === null ? -1 : gateOf(n, sel);
  const selNext = sel === null ? null : nextStage(sel);
  const canStart =
    sel !== null && selStatus !== null && (selGate >= 0 ? selStatus === 'current' && bossFight : (selStatus !== 'lock' || !!me.admin) && (selNext !== null || !!me.admin));
  const action =
    selStatus === null
      ? ''
      : selGate >= 0
        ? canStart
          ? S.path.startXp(xp)
          : selStatus === 'lock'
            ? S.path.lockedBtn
            : S.path.doneBtn
        : selStatus === 'lock' && !me.admin
          ? S.path.lockedBtn
          : selNext === null && !me.admin
            ? S.path.allStages
            : S.path.startStage(S.path.stages[(selNext ?? 1) - 1], xp);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: mapTop, paddingBottom: reserve + barSpace }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={onScroll}
      >
        {/* хоосон газар дарахад түр карт хураагдана; зангилаа өөрийн дарилтыг авна */}
        <Pressable accessible={false} onPress={closeCard}>
          <PathMap layout={layout} current={current} stages={path?.stages ?? {}} ring={ring} beaten={path?.bossesBeaten ?? 0} subject={subject} lessons={lessons} selected={sel} onNodePress={onNode} chests={path?.chests ?? []} onChest={(i) => router.push(`/chest?subject=${subject}&node=${i}`)} />
        </Pressable>

        {sel !== null && selNode && selUnit && selStatus ? (
          <NodePopover
            // popover-ын өнгө нь сонгосон зангилааны бүлгийнх
            theme={themeOf(MAP_CHAPTERS[unitOf(n, sel)].themeId)}
            top={mapTop + selNode.y * k + popOffset(selNode.kind === 'boss')}
            arrowX={Math.max(24, Math.min(viewW - POPOVER_INSET * 2 - 24, selNode.x * k - POPOVER_INSET))}
            title={lessonTitle(subject, sel, lessons)}
            sub={
              selStatus === 'lock' && !me.admin
                ? S.path.locked
                : selGate >= 0
                  ? BOSSES[selGate].soldier
                    ? S.path.soldierFight
                    : S.path.bossFight
                  : `${S.path.lessonOf(sel - selUnit.start + 1, selUnit.boss - selUnit.start)} · ${S.path.stars(doneAt(sel), STAGES)}`
            }
            action={action}
            canStart={canStart}
            onStart={() => start(sel)}
            onClose={closeCard}
            onHeight={setCardH}
          />
        ) : null}
      </ScrollView>

      <MapHeader
        theme={theme}
        subject={subject}
        over={chapterTitle ? `${subjectNames[subject].toUpperCase()} · ${over}` : over}
        title={chapterTitle ?? subjectNames[subject]}
        onSubject={setSubject}
        onHeight={onHeaderHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // газрын зургийн доод захын (Нарны ордны хаалга) өнгө: сүүлийн popover-ын доорх зай газрын зурагтай нийлнэ
  root: { flex: 1, backgroundColor: '#8A5424' },
  scrollContent: { alignItems: 'center' },
});
