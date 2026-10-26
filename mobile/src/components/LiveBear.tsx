import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SheetFrame, SheetLoop, Sprite } from '@/components/pixel';
import { useTagPlayer } from '@/hooks/useTagPlayer';
import home from '@/lib/pixelBear/bear-home.json';
import items from '@/lib/pixelBear/bear-items.json';
import type { SpriteKey } from '@/sprites';

/** нүүрний баавгайн төлөв бүрийн (BearState) хөдөлгөөн */
export type BearAnim = keyof typeof home;
/** баавгайн өмсөх item (scripts/home-sprites.ts-ийн ITEMS) */
export type ItemId = keyof typeof items;

/** scripts/home-sprites.ts: хөдөлгөөн бүрийн нэг мөр sheet (PixelLab animate_image), 2× */
const SHEETS: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_home_thriving_940x280',
  happy: 'bear_home_happy_1260x260',
  tired: 'bear_home_tired_1092x260',
  neglected: 'bear_home_neglected_1092x260',
  sleep: 'bear_home_sleep_970x260',
  ouch: 'bear_home_ouch_1092x272',
  welcome: 'bear_home_welcome_1320x1260',
};
const ITEM_SPRITES: Record<ItemId, SpriteKey> = {
  glasses: 'item_glasses_98x44',
  gradcap: 'item_gradcap_78x44',
  headphones: 'item_headphones_142x70',
  warrior_helmet: 'item_warrior_helmet_164x160',
  staff00: 'item_staff00_64x192',
  staff03: 'item_staff03_64x192',
  staff04: 'item_staff04_64x192',
  staff05: 'item_staff05_64x192',
  holly_staff: 'item_holly_staff_64x192',
  pestilence_staff: 'item_pestilence_staff_64x192',
  w_staff_256: 'item_w_staff_256_64x192',
};
const HELMET_BASES: Record<BearAnim, SpriteKey> = {
  thriving: 'bear_helmet_base_thriving_940x280',
  happy: 'bear_helmet_base_happy_1260x260',
  tired: 'bear_helmet_base_tired_1092x260',
  neglected: 'bear_helmet_base_neglected_1092x260',
  sleep: 'bear_helmet_base_sleep_970x260',
  ouch: 'bear_helmet_base_ouch_1092x272',
  welcome: 'bear_helmet_base_welcome_1320x1260',
};
const MAGIC_FRAMES = Array.from({ length: 24 }, (_, i) => i);

/**
 * PixelLab-ийн frame-уудаар амьд хөдөлдөг баавгай: `in` нэг удаа (жишээ нь гомдож гараа зөрүүлэх), дараа нь `loop`
 * (хөлөө дэвсэх, хөнжилдөө нойрмоглох) давтагдана. Frame нь анхны sprite-аас (`w` dp өргөн) `offset`-оор шилжсэн
 * тул анхны sprite-ийн байранд яг таарна. `items`-ийг frame бүрийн толгойд тааруулж өмсгөнө: малгай, чихэвч шиг
 * `loose` item толгойг хагас алхам хоцорч (жинтэй юм шиг) дагана. «Motion бууруулах» үед хөдөлгөөнгүй.
 */
export function LiveBear({
  anim,
  w,
  items: worn = [],
  label,
  px = 2,
}: {
  anim: BearAnim;
  w: number;
  items?: ItemId[];
  label?: string;
  /** sheet-ийн pixel → dp (sprite-ийн томруулалт, build-sprites.ts); shortcut: item-үүд 2×-д л бүртгэлтэй */
  px?: number;
}) {
  const meta = home[anim];
  const frame = useTagPlayer(meta, ['in'], 'loop');
  const head = meta.frames[frame].head;
  const prev = useRef(head);
  useEffect(() => {
    prev.current = head;
  }, [head]);
  const shift = meta.offset[0] * px + (meta.frameSize.w * px) / 2 - w / 2; // frame-ийн төв анхны sprite-ийн төвөөс
  const sheet = worn.includes('warrior_helmet') ? HELMET_BASES[anim] : SHEETS[anim];
  return (
    <View style={{ marginTop: meta.offset[1] * px, transform: [{ translateX: shift }] }}>
      <SheetFrame id={sheet} frames={meta.frames.length} cols={meta.columns} frame={frame} label={label} />
      {worn.map((id) => {
        const it = items[id];
        if ('held' in it) {
          const [x, y] = meta.frames[frame].hand;
          const magic = 'magicTip' in it ? (() => {
            const angle = anim === 'happy' ? Math.min(10, Math.max(0, Math.round((94 - y) / 3))) : 0;
            const rad = angle * Math.PI / 180;
            const [dx, dy] = it.magicTip;
            return [dx * Math.cos(rad) - dy * Math.sin(rad), dx * Math.sin(rad) + dy * Math.cos(rad)];
          })() : null;
          // Fingers and staff are baked into one frame at this exact hand pivot.
          return (
            <View key={id} pointerEvents="none" style={{ position: 'absolute', left: (x + it.held.at[0]) * px, top: (y + it.held.at[1]) * px }}>
              <SheetFrame id={it.held.sheets[anim] as SpriteKey} frames={meta.frames.length} cols={meta.columns} frame={frame} />
              {magic ? (
                <View style={{ position: 'absolute', left: (-it.held.at[0] + magic[0] - 11) * px, top: (-it.held.at[1] + magic[1] - 10) * px }}>
                  <SheetLoop id="magic_pestilence_staff_1056x44" frames={24} loop={MAGIC_FRAMES} ms={83} />
                </View>
              ) : null}
            </View>
          );
        }
        const [x, y] = it.loose ? [0, 1].map((k) => Math.round((head[k] + prev.current[k]) / 2)) : head;
        return (
          <Sprite key={id} id={ITEM_SPRITES[id]} style={{ position: 'absolute', left: (x + it.at[0]) * px, top: (y + it.at[1]) * px }} />
        );
      })}
    </View>
  );
}
