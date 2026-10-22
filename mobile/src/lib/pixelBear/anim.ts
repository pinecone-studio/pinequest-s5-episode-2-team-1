// Sprite sheet-ийн tag (scripts/*-sprites.ts-ийн JSON): frame бүр өөрийн хугацаатай.
export interface SheetMeta {
  frames: { name: string; duration: number }[];
  tags: Record<string, { from: number; to: number; direction: string }>;
}

/** tag-ийн frame-ууд; ping-pong бол буцаж давтана */
export function tagFrames<M extends SheetMeta>(meta: M, tag: keyof M['tags'] & string): number[] {
  const { from, to, direction } = meta.tags[tag];
  const f = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return direction === 'pingpong' ? [...f, ...f.slice(1, -1).reverse()] : f;
}
