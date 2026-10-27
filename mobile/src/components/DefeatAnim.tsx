import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { frameSize, SheetFrame } from '@/components/pixel';
import defeats from '@/lib/pixelBear/defeats.json';
import type { SpriteKey } from '@/sprites';

export type DefeatKey = keyof typeof defeats;

/**
 * Ялагдсан дайсан (scripts/defeat-sprites.ts): анивчиж → унаж → хэвтээд → алтан гэрэл болж уусна, сүүлийн (хоосон)
 * frame-дээ үлдэнэ. Тулааны эхнээс нуугдмал mount хийгдэнэ (`active` = false): зураг нь бэлэн тул ялагдах агшинд
 * хоосон frame гарахгүй. `still` = хөдөлгөөнгүй (motion бууруулсан, аль хэдийн ялагдсан): унасан байдлаар зогсоно.
 * `drop` = хөвдөг дайсан унахдаа газар хүртэл буух зай (dp).
 */
export function DefeatAnim({
  id,
  k,
  active,
  still,
  drop = 0,
  label,
}: {
  id: SpriteKey;
  k: DefeatKey;
  active: boolean;
  still: boolean;
  drop?: number;
  label: string;
}) {
  const d = defeats[k];
  const [frame, setFrame] = useState(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (still) {
      timers.push(setTimeout(() => setFrame(d.lying), 0));
      y.value = drop;
    } else {
      let t = 0;
      d.durations.forEach((ms, i) => {
        timers.push(setTimeout(() => setFrame(i), t));
        t += ms;
      });
      // унах frame-үүдийн үед (анивчилтын дараа) газар хүртэл бууна
      y.value = withTiming(drop, { duration: d.durations.slice(1, 5).reduce((a, b) => a + b, 0), easing: Easing.in(Easing.quad) });
    }
    return () => timers.forEach(clearTimeout);
  }, [active, still, d, drop, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // sheet нь тулааны frame-ээс `pad` pixel-ээр өргөн (хэвтсэн бие тайрагдахгүй): тэр хэмжээгээр ухраан зурна
  const off = -d.pad * (frameSize(id, d.durations.length, d.columns).width / d.frameSize.w);
  return (
    <Animated.View
      style={[{ position: 'absolute', left: off, top: off, opacity: active ? 1 : 0 }, style]}
      pointerEvents="none"
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <SheetFrame id={id} frames={d.durations.length} cols={d.columns} frame={frame} label={active ? label : undefined} />
    </Animated.View>
  );
}
