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

/** профайл зургийн дугуй (цагаан хүрээтэй): чулуунаас (48 × 36) жижиг */
const PIN = 28;
/** чулууны тал өргөн (PathMap: 48 px tile зангилааны x дээр төвлөрнө) */
const STONE_HALF_W = 24;
/** чулууны төв зангилааны y-ээс доош (PathMap: tile-ийн дээд ирмэг n.y − 14, өндөр 36) */
const STONE_CY = 4;
/** сумны цухуйлт: дугуй чулуунаас ийм зайтай, сум нь чулууны ирмэгт хүрнэ */
const TAIL = 5;
/** зангилааны төвөөс дугуйн төв хүртэл */
const DX = STONE_HALF_W + TAIL + PIN / 2;

/**
 * Candy Crush шиг: найз бүрийн профайл зураг тэдний одоогийн зангилааны хажууд, зам руу заасан сумтай дугуйгаар
 * харагдана. Дугуй нь замын шугамаас холдох талд байрлана (placePin): зам, арлыг халхлахгүй. Нэг зангилаанд
 * олон бол нэг зураг + «+N». Дарвал (эхний) найзын профайл нээгдэнэ.
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
        const [f] = here;
        const extra = here.length - 1;
        const { side, dy } = placePin(layout, node);
        const cx = Math.max(PIN / 2, Math.min(MAP_W - PIN / 2, n.x + side * DX));
        return (
          <Pressable
            key={f.code}
            accessibilityRole="button"
            accessibilityLabel={extra > 0 ? S.path.friendsHere(f.name, extra) : S.path.friendHere(f.name)}
            onPress={() => onPress(f.code)}
            // 28 + 2 × 8 = 44 px дарах талбай
            hitSlop={8}
            style={[styles.pin, { left: cx - PIN / 2, top: n.y - PIN / 2 + dy }]}
          >
            <View style={[styles.tail, side > 0 ? { left: -TAIL } : { right: -TAIL }]} />
            <Avatar size={PIN} border={2} look={f.look} />
            {extra > 0 ? (
              <View style={[styles.more, side > 0 ? { right: -10 } : { left: -10 }]} pointerEvents="none">
                <Text style={styles.moreText}>+{extra}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </>
  );
}

/**
 * Дугуйн тал (−1 зүүн, 1 баруун) ба босоо шилжилт: өмнөх, дараагийн зангилаанаас хамгийн их холдох тал, багтахгүй
 * бол нөгөө тал. Чулууны төвтэй нэг түвшинд; тэр талд хөрш зангилаа байвал түүн рүү очих шугамаас бага зэрэг холдоно.
 */
export function placePin(layout: PathLayout, node: number): { side: -1 | 1; dy: number } {
  const n = layout.nodes[node];
  const near = [layout.nodes[node - 1], layout.nodes[node + 1]].filter((m) => m !== undefined);
  const away = near.reduce((s, m) => s + (n.x - m.x), 0) || n.x - MAP_W / 2;
  // +N тэмдэг гадагш 10 px цухуйна
  const reach = DX + PIN / 2 + 10;
  const fits = (side: number) => n.x + side * reach <= MAP_W && n.x + side * reach >= 0;
  let side: -1 | 1 = away < 0 ? -1 : 1;
  if (!fits(side) && fits(-side)) side = side === 1 ? -1 : 1;
  const onSide = near.find((m) => Math.sign(m.x - n.x) === side);
  const dy = STONE_CY + (!onSide ? 0 : onSide.y < n.y ? 6 : -6);
  return { side, dy };
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    zIndex: 3,
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
  tail: { position: 'absolute', top: PIN / 2 - 4.5, width: 9, height: 9, backgroundColor: colors.white, transform: [{ rotate: '45deg' }] },
  more: {
    position: 'absolute',
    top: -8,
    minWidth: 18,
    paddingHorizontal: 3,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
