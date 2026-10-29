import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Motion, Sprite } from '@/components/pixel';
import { Screen } from '@/components/ui';
import { fonts, hardShadow, radius } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { OnboardingHeader, ONBOARDING_BG, ONBOARDING_COLORS, ONBOARDING_TOTAL_STEPS } from './OnboardingHeader';

const SLIDES = 3;

function FirstScene() {
  return (
    <View style={[styles.scene, styles.outdoor]}>
      <Sprite id="map_world_sun_390x780" style={StyleSheet.absoluteFill} />
      <View style={styles.sceneShade} />
      <Motion preset="float" style={styles.firstBear}>
        <Sprite id="bear_idle_scarf_164x280" style={{ width: 117, height: 200 }} label="KUMA баавгай" />
      </Motion>
      <View style={styles.speech}>
        <Text style={styles.speechText}>{S.onboarding.intro[0].callout}</Text>
      </View>
    </View>
  );
}

function StudyScene() {
  return (
    <>
      <View style={[styles.scene, styles.classroom]}>
        <Sprite id="classroom_396x864" style={StyleSheet.absoluteFill} />
        <View style={styles.classroomShade} />
        <Sprite id="bear_idle_scarf_164x280" style={styles.studyBear} label="Хичээл хийж буй KUMA баавгай" />
        <View style={styles.idea}>
          <Sprite id="icon_star_36x36" />
        </View>
      </View>
      <View style={styles.features}>
        {S.onboarding.benefits.map((benefit, index) => (
          <View key={benefit.title} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: [ONBOARDING_COLORS.coral, ONBOARDING_COLORS.yellow, ONBOARDING_COLORS.lavender][index] }]}>
              <Sprite id={(['icon_heart_24x24', 'icon_star_24x24', 'icon_flame_24x24'] as const)[index]} />
            </View>
            <Text style={styles.featureText}>{benefit.title}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function GrowthScene() {
  return (
    <>
      <View style={[styles.scene, styles.growth]}>
        <View style={styles.levelUp}>
          <Text style={styles.levelUpText}>LEVEL UP!</Text>
        </View>
        <Motion preset="float" style={styles.cheerBear}>
          <Sprite id="bear_cheer_scarf_180x252" style={{ width: 136, height: 190 }} label="Өсөж буй KUMA баавгай" />
        </Motion>
        <Sprite id="icon_star_36x36" style={styles.growthStar} />
        <Sprite id="icon_heart_36x36" style={styles.growthHeart} />
      </View>
      <View style={styles.xpCard}>
        <View style={styles.xpTop}>
          <Text style={styles.xpLevel}>Lv. 3</Text>
          <Text style={styles.xpValue}>70/100 XP</Text>
        </View>
        <View style={styles.xpTrack}><View style={styles.xpFill} /></View>
      </View>
      <View style={styles.rewards}>
        {[
          ['icon_flame_36x36', '+10 XP'],
          ['btn_honey_36x36', '+1 боргоцой'],
          ['icon_heart_36x36', '+1 амь'],
        ].map(([icon, label]) => (
          <View key={label} style={styles.reward}>
            <Sprite id={icon as 'icon_flame_36x36' | 'btn_honey_36x36' | 'icon_heart_36x36'} />
            <Text style={styles.rewardText}>{label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

export function OnboardingIntro({ index, onNext, onBack }: { index: number; onNext: () => void; onBack?: () => void }) {
  const copy = S.onboarding.intro[index];
  return (
    <Screen background={ONBOARDING_BG} contentStyle={styles.content}>
      <OnboardingHeader step={index} total={ONBOARDING_TOTAL_STEPS} onBack={onBack} />
      <View style={styles.card}>
        <View style={styles.titleWrap}>
          {index === 0 ? <View style={styles.logo}><Sprite id="icon_star_36x36" /></View> : null}
          <Text style={[styles.title, index === 0 && styles.wordmark]}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        {index === 0 ? <FirstScene /> : index === 1 ? <StudyScene /> : <GrowthScene />}
        {index === SLIDES - 1 ? (
          <View style={styles.bridge}>
            <Sprite id="icon_star_24x24" />
            <Text style={styles.bridgeText}>{copy.callout}</Text>
          </View>
        ) : null}

        <View style={{ flex: 1, minHeight: 8 }} />
        <Button title={index === 0 ? S.onboarding.introStart : index === SLIDES - 1 ? S.onboarding.introSetup : S.onboarding.continue} variant="lemon" onPress={onNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingVertical: 12, gap: 14 },
  card: { flex: 1, minHeight: 620, overflow: 'hidden', backgroundColor: ONBOARDING_COLORS.white, borderRadius: 32, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink, padding: 14, gap: 12, ...hardShadow(5) },
  titleWrap: { alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 8 },
  logo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ONBOARDING_COLORS.yellow, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  title: { maxWidth: 310, fontFamily: fonts.extrabold, fontSize: 27, lineHeight: 31, letterSpacing: -0.7, color: ONBOARDING_COLORS.ink, textAlign: 'center' },
  wordmark: { fontFamily: fonts.pixel, fontSize: 42, lineHeight: 44, letterSpacing: 1 },
  subtitle: { maxWidth: 300, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: '#423E4A', textAlign: 'center' },
  scene: { position: 'relative', overflow: 'hidden', borderRadius: radius.lg, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  outdoor: { height: 360, backgroundColor: '#E4B65C' },
  sceneShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(250,194,17,0.08)' },
  firstBear: { position: 'absolute', left: '50%', marginLeft: -58, bottom: 26 },
  speech: { position: 'absolute', left: 22, right: 22, bottom: 14, padding: 12, borderRadius: 16, backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  speechText: { fontFamily: fonts.bold, fontSize: 15, color: ONBOARDING_COLORS.ink, textAlign: 'center' },
  classroom: { height: 250, backgroundColor: '#F7D6A9' },
  classroomShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.12)' },
  studyBear: { position: 'absolute', width: 90, height: 154, left: '50%', marginLeft: -45, bottom: -6 },
  idea: { position: 'absolute', right: 54, top: 52, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  features: { gap: 8 },
  feature: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 16, backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: '#DED8CD' },
  featureIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  featureText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: ONBOARDING_COLORS.ink },
  growth: { height: 242, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#DFF29E' },
  levelUp: { position: 'absolute', top: 18, zIndex: 2, paddingVertical: 7, paddingHorizontal: 16, borderRadius: 12, backgroundColor: ONBOARDING_COLORS.yellow, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink, transform: [{ rotate: '-3deg' }], ...hardShadow(3) },
  levelUpText: { fontFamily: fonts.pixel, fontSize: 18, color: ONBOARDING_COLORS.ink },
  cheerBear: { marginBottom: -10 },
  growthStar: { position: 'absolute', right: 28, top: 82 },
  growthHeart: { position: 'absolute', left: 30, top: 116 },
  xpCard: { gap: 8, padding: 12, borderRadius: 16, backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevel: { fontFamily: fonts.extrabold, fontSize: 16, color: ONBOARDING_COLORS.ink },
  xpValue: { fontFamily: fonts.bold, fontSize: 13, color: '#514D59' },
  xpTrack: { height: 14, overflow: 'hidden', borderRadius: 7, backgroundColor: '#E4E1DA', borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  xpFill: { width: '70%', height: '100%', backgroundColor: ONBOARDING_COLORS.yellow },
  rewards: { flexDirection: 'row', gap: 8 },
  reward: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, backgroundColor: ONBOARDING_COLORS.white, borderWidth: 2, borderColor: '#DED8CD' },
  rewardText: { fontFamily: fonts.bold, fontSize: 11, color: ONBOARDING_COLORS.ink, textAlign: 'center' },
  bridge: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 16, backgroundColor: '#FFF2B8', borderWidth: 2, borderColor: ONBOARDING_COLORS.ink },
  bridgeText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: ONBOARDING_COLORS.ink, textAlign: 'center' },
});
