import type { Subject } from '@shared/types';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/auth/AuthContext';
import { Sprite } from '@/components/pixel';
import { formatNumber } from '@/components/StatPill';
import { AvatarLink } from '@/components/TopBar';
import { type ChapterTheme, useThemeFade } from '@/constants/chapterTheme';
import { colors, fonts } from '@/constants/theme';
import { S, subjectNames } from '@/i18n/strings';
import { usePixelBear } from '@/lib/mock/pixelBear';
import type { SpriteKey } from '@/sprites';

const SUBJECTS: Subject[] = ['math', 'mongolian', 'physics'];

/**
 * Сурах замын дээд хэсэг (Duolingo шиг, хүрээгүй): самбар дээр аватар · XP · гал · coin жигд зайтай; түүнээс тусдаа,
 * газрын зураг дээр хөвөх харагдаж буй бүлгийн тод баннер (дарахад хичээл солих цэс). Өнгө бүлгийн theme-ийг дагана.
 * Нарийн дэлгэц, том текстэд stat-ууд доош шилжинэ. Тохиргооны цэс байхгүй.
 */
export function MapHeader({
  theme,
  subject,
  over,
  title,
  onSubject,
  onHeight,
}: {
  theme: ChapterTheme;
  subject: Subject;
  /** баннерын дээд жижиг мөр (бүлэг, түвшин) */
  over: string;
  /** баннерын гарчиг (бүлгийн нэр) */
  title: string;
  onSubject: (s: Subject) => void;
  /** stat-уудын самбарын өндөр (газрын зураг үүний доороос эхэлнэ) ба баннер хүртэлх нийт өндөр (харагдах хэсгийн дээд зах) */
  onHeight: (panel: number, total: number) => void;
}) {
  const { me } = useAuth();
  const { coins } = usePixelBear();
  const insets = useSafeAreaInsets();
  const fade = useThemeFade(theme);
  const [menu, setMenu] = useState(false);
  // самбар ба баннерын өндрийг тус тусад нь хэмжинэ (onLayout-ын дараалал баталгаагүй)
  const [panelH, setPanelH] = useState(0);
  const [bannerH, setBannerH] = useState(0);
  useEffect(() => {
    if (panelH && bannerH) onHeight(panelH, panelH + bannerH);
  }, [panelH, bannerH, onHeight]);
  if (!me) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* onLayout энгийн View дээр: Reanimated-ийн Animated.View web дээр onLayout дуудахгүй */}
      <View pointerEvents="box-none">
        <View onLayout={(e: LayoutChangeEvent) => setPanelH(e.nativeEvent.layout.height)}>
          <Animated.View style={[styles.panel, { paddingTop: insets.top + 6 }, fade.panel]}>
            <View style={styles.stats}>
              <AvatarLink size={36} border={2} dotBorder={theme.panel} />
              <View style={styles.stat} accessible accessibilityLabel={`XP ${me.levelXp}/${me.levelXpNeeded}`}>
                <Sprite id="icon_star_24x24" />
                <View style={{ gap: 4 }}>
                  <Animated.Text style={[styles.num, fade.text]}>{`${formatNumber(me.levelXp)}/${formatNumber(me.levelXpNeeded)}`}</Animated.Text>
                  <View style={[styles.track, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          backgroundColor: theme.active,
                          width: `${me.levelXpNeeded > 0 ? Math.max(0, Math.min(1, me.levelXp / me.levelXpNeeded)) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
              <Stat icon="icon_flame_24x24" value={me.streak} label={S.path.streak} text={fade.text} />
              <Stat icon="icon_coin_24x24" value={coins} label="Coin" text={fade.text} />
            </View>
          </Animated.View>
        </View>

        {/* баннер самбараас тусдаа: ард нь газрын зураг харагдана */}
        <View style={styles.bannerWrap} pointerEvents="box-none" onLayout={(e: LayoutChangeEvent) => setBannerH(e.nativeEvent.layout.height)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${over}. ${S.path.subjectMenu}: ${subjectNames[subject]}`}
            accessibilityState={{ expanded: menu }}
            onPress={() => setMenu((m) => !m)}
          >
            <Animated.View style={[styles.banner, fade.banner]}>
              <View style={styles.bannerText}>
                <Text style={styles.over} numberOfLines={2}>
                  {over}
                </Text>
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              </View>
              {/* хичээл солих хэсэг: Duolingo-ийн гарын авлагын товчны байранд */}
              <View style={styles.switch}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d={menu ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </Svg>
              </View>
            </Animated.View>
          </Pressable>
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
                onSubject(s);
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
  );
}

function Stat({ icon, value, label, text }: { icon: SpriteKey; value: number; label: string; text: object }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${formatNumber(value)}`}>
      <Sprite id={icon} />
      <Animated.Text style={[styles.num, text]}>{formatNumber(value)}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  panel: { paddingHorizontal: 16, paddingBottom: 10 },
  bannerWrap: { paddingHorizontal: 16, paddingTop: 10 },
  // жигд зайтай; багтахгүй бол дараагийн мөрөнд шилжинэ
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 6 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  num: { fontFamily: fonts.pixel, fontSize: 16, lineHeight: 18 },
  track: { height: 4, borderRadius: 2, minWidth: 56, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  // газрын зураг дээр тод харагдахаар зөөлөн сүүдэр
  banner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    minHeight: 64,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bannerText: { flex: 1, minWidth: 0, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', gap: 2 },
  over: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 15, letterSpacing: 1, color: 'rgba(255,255,255,0.8)' },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, color: colors.white },
  switch: { width: 56, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1.5, borderLeftColor: 'rgba(0,0,0,0.18)' },
  menu: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 6,
    gap: 4,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  menuItem: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  menuText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
