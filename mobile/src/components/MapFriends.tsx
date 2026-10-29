import type { BearLook } from '@shared/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { MAP_W, type PathLayout } from '@/lib/pixelBear/path';

export interface MapFriend {
  code: string;
  name: string;
  look: BearLook;
  /** газрын зураг дээрх зангилаа (currentNode) */
  node: number;
}

/** профайл зургийн дугуй (цагаан хүрээтэй) */
const PIN = 36;
/** зангилааны төвөөс дугуйн төв хүртэл: арал (72 px) болон замыг халхлахгүй */
const DX = 60;
/** нэг зангилаанд хэд байвал гадагш давхцуулж эгнүүлнэ */
const STACK = 18;
const MAX_SHOWN = 3;

/**
 * Candy Crush шиг: найз бүрийн профайл зураг тэдний одоогийн зангилааны хажууд, зам руу заасан сумтай дугуйгаар
 * харагдана. Дугуй нь замын шугамаас холдох талд байрлана (placePin): зам, арлыг халхлахгүй. Нэг зангилаанд
 * олон бол давхцаж эгнэнэ (3-аас дээш бол +N). Дарвал найзын профайл нээгдэнэ.
 */
export function MapFriends({
  layout,
  friends,
  onPress,
}: {
  layout: PathLayout;
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
        const shown = here.slice(0, MAX_SHOWN);
        const extra = here.length - shown.length;
        const { side, dy } = placePin(layout, node, shown.length);
        return shown.map((f, k) => {
          const cx = Math.max(PIN / 2, Math.min(MAP_W - PIN / 2, n.x + side * (DX + k * STACK)));
          const last = k === shown.length - 1;
          return (
            <Pressable
              key={f.code}
              accessibilityRole="button"
              accessibilityLabel={S.path.friendHere(f.name)}
              onPress={() => onPress(f.code)}
              hitSlop={4}
              style={[styles.pin, { left: cx - PIN / 2, top: n.y - PIN / 2 + dy, zIndex: 3 + MAX_SHOWN - k }]}
            >
              {k === 0 ? <View style={[styles.tail, side > 0 ? { left: -5 } : { right: -5 }]} /> : null}
              <Avatar size={PIN} border={3} look={f.look} />
              {last && extra > 0 ? (
                <View style={styles.more} pointerEvents="none">
                  <Text style={styles.moreText}>+{extra}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        });
      })}
    </>
  );
}

/**
 * Дугуйнуудын тал (−1 зүүн, 1 баруун) ба босоо шилжилт: өмнөх, дараагийн зангилаанаас хамгийн их холдох тал, багтахгүй
 * бол нөгөө тал. Тэр талд хөрш зангилаа байвал түүн рүү очих замын шугамаас босоогоор холдоно.
 */
export function placePin(layout: PathLayout, node: number, count: number): { side: -1 | 1; dy: number } {
  const n = layout.nodes[node];
  const near = [layout.nodes[node - 1], layout.nodes[node + 1]].filter((m) => m !== undefined);
  const away = near.reduce((s, m) => s + (n.x - m.x), 0) || n.x - MAP_W / 2;
  const reach = DX + (count - 1) * STACK + PIN / 2;
  const fits = (side: number) => n.x + side * reach <= MAP_W && n.x + side * reach >= 0;
  let side: -1 | 1 = away < 0 ? -1 : 1;
  if (!fits(side) && fits(-side)) side = side === 1 ? -1 : 1;
  const onSide = near.find((m) => Math.sign(m.x - n.x) === side);
  const dy = !onSide ? -14 : onSide.y < n.y ? 10 : -34;
  return { side, dy };
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  // зангилаа руу заасан сум (Candy Crush-ийн pin шиг)
  tail: { position: 'absolute', top: PIN / 2 - 6, width: 12, height: 12, backgroundColor: colors.white, transform: [{ rotate: '45deg' }] },
  more: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    minWidth: 20,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
