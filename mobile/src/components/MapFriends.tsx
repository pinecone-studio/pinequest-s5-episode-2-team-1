import type { BearLook } from '@shared/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LiveBear } from '@/components/LiveBear';
import { FurContext } from '@/components/pixel';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { parseWorn, wornItems } from '@/lib/pixelBear/catalog';
import { MAP_W, type PathLayout } from '@/lib/pixelBear/path';

export interface MapFriend {
  code: string;
  name: string;
  look: BearLook;
  /** газрын зураг дээрх зангилаа (currentNode) */
  node: number;
}

/** LiveBear-ийн бүтэн stage (164 × 280) → газрын зураг дээр жижиг баавгай */
const STAGE_W = 164;
const STAGE_H = 280;
const SCALE = 0.26;
const W = STAGE_W * SCALE;
const H = STAGE_H * SCALE;
/** нэг зангилаан дээр олон найз байвал (эсвэл миний зангилаа бол) хажуу тийш нь эгнүүлнэ */
const GAP = 34;

/**
 * Газрын зураг дээр найзуудын баавгай (өөрийн үс, өмссөн хувцастайгаа) тэдний одоо байгаа зангилаан дээр зогсоно,
 * нэртэй. Нэг зангилаанд хэд байвал эгнэнэ; миний зангилаа бол миний цагирагийг халхлахгүй баруун тийш шилжинэ.
 * Дарвал найзын профайл нээгдэнэ.
 */
export function MapFriends({
  layout,
  current,
  friends,
  onPress,
}: {
  layout: PathLayout;
  /** миний одоогийн зангилаа */
  current: number;
  friends: readonly MapFriend[];
  onPress: (code: string) => void;
}) {
  const byNode = new Map<number, MapFriend[]>();
  for (const f of friends) byNode.set(f.node, [...(byNode.get(f.node) ?? []), f]);
  return (
    <>
      {[...byNode].flatMap(([node, here]) => {
        const n = layout.nodes[node];
        if (!n) return [];
        const mine = node === current ? 1 : 0;
        return here.map((f, k) => {
          const x = n.x - W / 2 + (k + mine - (here.length + mine - 1) / 2) * GAP;
          return (
            <Pressable
              key={f.code}
              accessibilityRole="button"
              accessibilityLabel={S.path.friendHere(f.name)}
              onPress={() => onPress(f.code)}
              style={[styles.friend, { left: Math.max(0, Math.min(MAP_W - W, x)), top: n.y - H + 14, zIndex: 3 + k }]}
            >
              <View style={styles.bearBox} pointerEvents="none">
                <View style={styles.stage}>
                  <FurContext.Provider value={f.look.fur ?? 'brown'}>
                    <LiveBear anim="thriving" w={STAGE_W} items={wornItems(parseWorn(f.look.outfit))} />
                  </FurContext.Provider>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {f.name}
              </Text>
            </Pressable>
          );
        });
      })}
    </>
  );
}

const styles = StyleSheet.create({
  friend: { position: 'absolute', width: W, alignItems: 'center' },
  bearBox: { width: W, height: H, overflow: 'visible' },
  stage: { width: STAGE_W, height: STAGE_H, transform: [{ scale: SCALE }], transformOrigin: 'top left' },
  name: {
    marginTop: -6,
    maxWidth: 64,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.ink,
  },
});
