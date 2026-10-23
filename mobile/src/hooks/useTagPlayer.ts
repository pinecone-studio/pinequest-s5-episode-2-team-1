import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { type SheetMeta, tagFrames } from '@/lib/pixelBear/anim';

/**
 * Sprite sheet-ийн `once` tag-уудыг нэг удаа, дараа нь `loop`-ийг (нэг эсвэл хэд хэдэн tag дараалан) давтан
 * тоглуулж одоогийн frame-ийг буцаана (`loop` = null бол сүүлийн frame дээр зогсоно). «Motion бууруулах» үед хөдөлгөөнгүй.
 */
export function useTagPlayer<M extends SheetMeta>(
  meta: M,
  once: (keyof M['tags'] & string)[],
  loop: (keyof M['tags'] & string) | (keyof M['tags'] & string)[] | null,
): number {
  const reduce = useReducedMotion();
  const seq = once.flatMap((t) => tagFrames(meta, t));
  const cycle = loop === null ? [] : [loop].flat().flatMap((t) => tagFrames(meta, t));
  const [frame, setFrame] = useState(seq[0] ?? cycle[0] ?? 0);
  const key = `${once.join()}|${[loop].flat().join()}`; // tag-ууд өөрчлөгдвөл шинээр эхэлнэ

  useEffect(() => {
    if (reduce) {
      setFrame(cycle.at(-1) ?? seq.at(-1) ?? 0);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const f = i < seq.length ? seq[i] : cycle.length ? cycle[(i - seq.length) % cycle.length] : undefined;
      if (f === undefined) return;
      i++;
      setFrame(f);
      timer = setTimeout(next, meta.frames[f].duration);
    };
    next();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` нь once/loop-ийг төлөөлнө
  }, [key, reduce, meta]);

  return frame;
}
