import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SheetFrame, Sprite } from '@/components/pixel';
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
  welcome: 'bear_home_welcome_1320x840',
};
const ITEM_SPRITES: Record<ItemId, SpriteKey> = {
  glasses: 'item_glasses_98x44',
  gradcap: 'item_gradcap_78x44',
  headphones: 'item_headphones_142x70',
};

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
  return (
    <View style={{ marginTop: meta.offset[1] * px, transform: [{ translateX: shift }] }}>
      <SheetFrame id={SHEETS[anim]} frames={meta.frames.length} cols={meta.columns} frame={frame} label={label} />
      {worn.map((id) => {
        const it = items[id];
        const [x, y] = it.loose ? [0, 1].map((k) => Math.round((head[k] + prev.current[k]) / 2)) : head;
        return <Sprite key={id} id={ITEM_SPRITES[id]} style={{ position: 'absolute', left: (x + it.at[0]) * px, top: (y + it.at[1]) * px }} />;
      })}
    </View>
  );
}
