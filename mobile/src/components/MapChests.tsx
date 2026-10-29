import { Pressable, StyleSheet } from 'react-native';
import { Motion, Sprite } from '@/components/pixel';
import { S } from '@/i18n/strings';
import type { PathLayout } from '@/lib/pixelBear/path';

/** Дарах талбай (dp, газрын зургийн масштабаас өмнө): гар утсанд 56-аас багагүй */
const HIT = 56;

/**
 * 3-р бүлгийн нууц хайрцгууд зангилааныхаа хажууд (замын төв рүү). Хичээлийг давсны дараа савлаж «нээх» дуудна;
 * түгжээтэй нь бүдэг, нээсэн нь онгорхой (дахин дарвал гарсан шагналаа харна).
 */
export function MapChests({
  layout,
  current,
  opened,
  onOpen,
  open = false,
}: {
  layout: PathLayout;
  current: number;
  /** нээсэн хайрцгийн зангилаанууд (SubjectPath.chests) */
  opened: readonly number[];
  onOpen: (node: number) => void;
  /** шүүгч: хичээлээ давахаас өмнө ч нээж болно */
  open?: boolean;
}) {
  return (
    <>
      {layout.nodes
        .filter((n) => n.kind === 'chest')
        .map((n) => {
          const done = opened.includes(n.i);
          const ready = !done && (open || n.i < current);
          // зам голдоо ойртох талд: зангилаа зүүн талд бол баруун тийш
          const left = n.x < 195 ? n.x + 22 : n.x - 22 - HIT;
          const label = done ? S.path.chestOpened : ready ? S.path.chestReady : S.path.chestLocked;
          return (
            <Pressable
              key={n.i}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ disabled: !done && !ready }}
              disabled={!done && !ready}
              onPress={() => onOpen(n.i)}
              style={[styles.hit, { left, top: n.y - 38 }]}
            >
              {ready ? (
                <>
                  <Motion preset="ring" style={styles.glow}>
                    <Sprite id="map_ring_88x44" style={styles.glowTint} />
                  </Motion>
                  <Motion preset="wiggle" originBottom>
                    <Sprite id="map_chest_40x30" />
                  </Motion>
                </>
              ) : (
                <Sprite id={done ? 'map_chest_open_42x39' : 'map_chest_40x30'} style={done ? null : styles.locked} />
              )}
            </Pressable>
          );
        })}
    </>
  );
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', width: HIT, height: HIT, alignItems: 'center', justifyContent: 'flex-end' },
  locked: { opacity: 0.55 },
  glow: { position: 'absolute', bottom: -10, transform: [{ scale: 0.6 }] },
  glowTint: { tintColor: '#FFD25A' },
});
