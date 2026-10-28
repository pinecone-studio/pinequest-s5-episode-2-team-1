import { blank, readPng, type Img } from './png.ts';

const plainReference = readPng(new URL('../../docs/design/pixel-bear/sprites/bear_idle.png', import.meta.url));
const headReference = readPng(new URL('../../docs/design/pixel-bear/sprites/bear_idle_scarf.png', import.meta.url));
const onHead = (rx: number, ry: number) => {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const u = rx + dx, v = ry + dy;
    if (v >= 0 && v < 66 && u >= 0 && u < headReference.w && headReference.d[(v * headReference.w + u) * 4 + 3] > 128) return true;
  }
  return false;
};
const officerArt = readPng(new URL('../../docs/design/pixel-bear/reference/uniforms/officer-costume.png', import.meta.url));
function officerColor(rx: number, ry: number, cap: boolean): number[] | undefined {
  const [left, top, width, height] = cap ? [210, 90, 660, 410] : [5, 603, 1076, 735];
  const u = cap ? (rx - 18) / 46 : (rx - 5) / 72;
  const v = cap ? ry / 29 : (ry - 66) / 46;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return;
  const x = Math.floor(left + u * width), y = Math.floor(top + v * height);
  const i = (y * officerArt.w + x) * 4;
  return officerArt.d[i + 3] > 128 ? Array.from(officerArt.d.subarray(i, i + 3)) : undefined;
}

/** Reference-inspired uniforms, fitted to the existing bear rather than replacing its face. */
export const PROFESSIONAL_IDS = ['doctor_coat', 'officer_coat', 'officer_cap'] as const;
export function professionalPixels(id: string, base: Img, head: [number, number], hands: [number, number][], sleeping: boolean): Img {
  const out = blank(base.w, base.h);
  const doctor = id === 'doctor_coat';
  const white = [233, 243, 248], shadow = [154, 177, 193], ink = [33, 45, 65], blue = [40, 102, 175], silver = [186, 200, 212];
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < base.w && y < base.h && base.d[(y * base.w + x) * 4 + 3] > 128;
  // Each leg keeps its own moving silhouette; the last seven rows remain bare feet.
  const bottoms = [0, 0];
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++)
    if (solid(x, y)) bottoms[x < base.w / 2 ? 0 : 1] = y;
  const footCenters = bottoms.map((bottom, side) => {
    const xs: number[] = [];
    for (let x = side ? Math.floor(base.w / 2) : 0; x < (side ? base.w : Math.floor(base.w / 2)); x++)
      if (solid(x, bottom - 2)) xs.push(x);
    return xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : base.w * (side ? 0.7 : 0.3);
  });
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    const rx = x - head[0] + 6, ry = y - head[1] + 14 - (id === 'officer_cap' ? 0 : 4);
    let color: number[] | undefined;
    if (id === 'officer_cap') {
      color = officerColor(rx, ry, true);
    } else {
      // The shoulders descend from the neck instead of sharing a flat horizontal cut.
      const shoulderTop = 66 + Math.max(0, Math.abs(rx - 41) - 10) * (doctor ? 0.65 : 0.32);
      // Relaxed thighs taper gently into the ankles, with one continuous crotch seam.
      // Build the cloth silhouette from each moving foot, rather than tracing tight fur legs.
      if (!sleeping && ry > 112) {
        const center = head[0] + 35;
        const side = x < center ? 0 : 1;
        const bottom = bottoms[side];
        const cuffCurve = Math.round(1.5 * Math.max(0, 1 - Math.abs(x - footCenters[side]) / 12));
        const hem = bottom - 7 + cuffCurve;
        const top = head[1] + 112 - 10;
        const progress = Math.max(0, Math.min(1, (y - top) / Math.max(1, hem - top)));
        const halfWidth = 12.5 - 2 * progress;
        const hipLeft = head[0] + 14, hipRight = head[0] + 56;
        const leftExtent = center - Math.max(footCenters[0] - halfWidth, hipLeft - progress * 2);
        const rightExtent = Math.min(footCenters[1] + halfWidth, hipRight + progress * 2) - center;
        const radius = Math.min(leftExtent, rightExtent);
        const waistLeft = center - radius, waistRight = center + radius;
        const gap = ry <= 116 ? 0 : Math.min(2.5, (ry - 116) * 0.45);
        const legLeft = side ? center + gap : waistLeft;
        const legRight = side ? waistRight : center - gap;
        if (y <= hem && x >= legLeft && x <= legRight) {
          const edge = x < legLeft + 1 || x > legRight - 1 || y === hem;
          const fold = Math.abs(x - footCenters[side]) < 1 && ry > 119;
          const pants = doctor ? (edge ? [34, 69, 113] : fold ? [46, 88, 143] : [53, 102, 161]) : (edge ? [13, 20, 35] : fold ? [23, 32, 49] : [30, 40, 60]);
          out.d.set([...pants, 255], (y * base.w + x) * 4);
          continue;
        }
      }
      if (!solid(x, y) || (sleeping && ry > 86)) continue;
      // Keep the coat's collar tips below the chin rather than poking up beside it.
      if (doctor && ry < 68 && Math.abs(rx - 41) >= 10 && Math.abs(rx - 41) <= 22) continue;
      const handDistance = Math.min(...hands.map(([hx, hy]) => Math.hypot(x - hx, y - hy)));
      // Fit only the small shoulder wedges beside the collar; never draw a band across the neck.
      const shoulderDistance = Math.abs(rx - 41);
      const shoulderEdge = 64 + Math.max(0, shoulderDistance - 14) * (doctor ? 0.55 : 0.45);
      if (ry < shoulderTop && shoulderDistance >= 14 && shoulderDistance <= (doctor ? 30 : 24) && ry >= shoulderEdge) {
        const shoulder = doctor ? (ry < shoulderEdge + 1 ? shadow : white) : officerColor(rx, 69 + (ry - shoulderEdge), false);
        if (shoulder) out.d.set([...shoulder, 255], (y * base.w + x) * 4);
        continue;
      }
      if (ry < shoulderTop) {
        // Above the shoulders, dress raised arms but preserve the head and bare paws.
        if ((doctor && ry >= 62 && ry < shoulderTop && shoulderDistance <= 30) || onHead(rx, ry + 4) || handDistance < 6 || handDistance > 24 || (rx >= 18 && rx <= 64) || ry + 4 < 20) continue;
        const sleeve = handDistance < 9 ? white : doctor ? white : ink;
        out.d.set([...sleeve, 255], (y * base.w + x) * 4);
        continue;
      }
      if (ry > 112) {
        if (sleeping || handDistance < 9) continue;
        const bottom = bottoms[x < base.w / 2 ? 0 : 1];
        if (y > bottom - 7) {
          if (!doctor) {
            const sole = y >= bottom - 1;
            const edge = !solid(x - 1, y) || !solid(x + 1, y);
            const toe = bottom - y;
            const center = x < base.w / 2 ? 29 : 54;
            const lace = toe >= 4 && toe <= 6 && toe % 2 === 0 && Math.abs(rx - center) <= 3;
            const shine = toe === 3 && Math.abs(rx - center) <= 5;
            const leather = sole ? [9, 11, 16] : edge ? [16, 19, 26] : lace ? [91, 98, 111] : shine ? [65, 73, 86] : [30, 35, 46];
            out.d.set([...leather, 255], (y * base.w + x) * 4);
          } else {
            // White closed medical shoes, with a rounded upper and a light grey sole.
            const sole = y >= bottom - 1;
            const edge = !solid(x - 1, y) || !solid(x + 1, y);
            const shoe = sole ? [180, 190, 202] : edge ? [204, 213, 224] : y === bottom - 6 ? [225, 231, 238] : [249, 251, 253];
            out.d.set([...shoe, 255], (y * base.w + x) * 4);
          }
          continue;
        }
        const edge = !solid(x - 1, y) || !solid(x + 1, y);
        const pants = doctor ? (edge ? [34, 69, 113] : [53, 102, 161]) : (edge ? [13, 20, 35] : [30, 40, 60]);
        out.d.set([...pants, 255], (y * base.w + x) * 4);
        continue;
      }
      const paw = Math.min(...hands.map(([hx, hy]) => Math.hypot(x - hx, y - hy)));
      if (paw < 6) continue;
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1);
      const d = Math.abs(rx - 41);
      color = doctor ? edge ? shadow : white : edge ? [15, 23, 40] : ink;
      // Shirt opening, folded lapels and tie follow the neck in each frame.
      if (doctor) {
        const neckRow = ry - 66;
        if (neckRow >= 0 && neckRow < 23) {
          const opening = Math.max(0, 10 - neckRow * 0.5);
          if (d < opening) {
            // A shallow crew neck follows the chin instead of a straight horizontal shirt edge.
            const neckline = 66 + Math.round(3 * Math.max(0, 1 - (d / 10) ** 2));
            if (ry < neckline) continue;
            color = ry === neckline ? [31, 76, 131] : blue;
          }
          // Broad folded lapels with a notch and a narrow shaded diagonal edge.
          const fold = 14 - neckRow * 0.59 + (neckRow >= 7 && neckRow <= 10 ? 2 : 0);
          if (d >= opening && d <= fold) color = [250, 252, 253];
          if (Math.abs(d - fold) < 1) color = shadow;
        }
      } else {
        // Two distinct white collar points beneath the chin, with a black tie between them.
        const neckRow = ry - 66;
        if (neckRow >= 0 && neckRow <= 12) {
          if (d <= 11 - neckRow / 2) color = [13, 20, 34];
          const outer = 12 - neckRow * 0.55;
          const inner = neckRow < 4 ? 2 + neckRow * 0.7 : 5 - (neckRow - 4) * 0.25;
          if (d >= inner && d <= outer) color = neckRow === 12 ? silver : white;
          if (neckRow >= 3 && neckRow <= 5 && d <= 2) color = [5, 9, 16];
          if (neckRow >= 6 && d <= (neckRow < 11 ? 1.5 : 1)) color = [5, 9, 16];
        }
        // Notched navy lapels taper to the jacket fastening.
        if (neckRow >= 3 && neckRow <= 24) {
          const lapel = 15 - (neckRow - 3) * 0.64;
          if (Math.abs(d - lapel) < 1) color = [10, 16, 28];
          else if (d > lapel && d < lapel + 3) color = [43, 56, 80];
        }
      }
      if (rx === 41 && ry >= 88) color = shadow;
      if (rx >= 43 && rx <= 44 && ry >= 89 && ry % 8 <= 1) color = doctor ? shadow : silver;
      // Patch pockets, pen and hospital badge.
      if (doctor && ry >= 98 && ry <= 111 && ((rx >= 25 && rx <= 34) || (rx >= 49 && rx <= 58))) {
        if (ry === 98 || ry === 111 || rx === 25 || rx === 34 || rx === 49 || rx === 58) color = shadow;
        if (rx >= 28 && rx <= 29 && ry <= 103) color = ink;
        if (rx >= 27 && rx <= 32 && ry >= 106 && ry <= 108) color = silver;
      }
      // Stethoscope tubes and chest piece.
      if (doctor && ((rx === 25 || rx === 55) && ry >= 68 && ry <= 87 || ry === 91 && rx >= 26 && rx <= 35 || (rx === 26 || rx === 35) && ry >= 81 && ry <= 90)) color = blue;
      if (doctor && Math.hypot(rx - 54, ry - 90) <= 3) color = Math.hypot(rx - 54, ry - 90) > 2 ? ink : silver;
      // Officer shoulder boards, buttons and ceremonial braided cords.
      if (!doctor && ry >= 68 && ry <= 72 && d >= 15) color = ry === 69 ? [157, 46, 57] : silver;
      if (!doctor && rx >= 23 && rx <= 38 && ry >= 82 && ry <= 100 && [0, 5, 10].some(k => Math.abs(ry - (88 + k + 5 * Math.sin((rx - 23) / 15 * Math.PI))) < 0.7)) color = silver;
      if (!doctor && ry >= 96 && ry <= 98 && rx >= 48 && rx <= 58) color = [15, 23, 40];
      if (paw >= 6 && paw < 9) color = doctor ? shadow : white;
    }
    if (id === 'officer_coat' && color) {
      const paw = Math.min(...hands.map(([hx, hy]) => Math.hypot(x - hx, y - hy)));
      color = officerColor(rx, ry, false) ?? (ry >= 73 ? ink : undefined);
      if (paw >= 6 && paw < 9) color = white;
    }
    if (color) out.d.set([...color, 255], (y * base.w + x) * 4);
  }
  return out;
}

/** Remove the scarf without restoring the idle pose's arms over a moving frame. */
export function professionalBase(base: Img, head: [number, number], hands: [number, number][] = [], trimShoulders = false): Img {
  const out = { ...base, d: new Uint8Array(base.d) };
  const plain = plainReference;
  for (let ry = 60; ry < 116; ry++) for (let rx = 8; rx < 75; rx++) {
    const x = head[0] + rx - 6, y = head[1] + ry - 14;
    if (x < 0 || y < 0 || x >= base.w || y >= base.h) continue;
    const i = (y * base.w + x) * 4, p = (ry * plain.w + rx) * 4;
    if (!base.d[i + 3]) continue;
    const distance = Math.abs(rx - 41);
    const shoulderEdge = 70 + Math.max(0, distance - 10) * 0.65;
    const nearHand = hands.some(([hx, hy]) => Math.hypot(x - hx, y - hy) < 12);
    // Trim only the exposed shoulder wedges to the sloped garment silhouette.
    // The fitted clothing overlay supplies the visible shoulder edge above this base.
    if (trimShoulders && ry >= 66 && ry < shoulderEdge && distance >= 14 && rx >= 12 && rx <= 70 && !nearHand) {
      out.d.fill(0, i, i + 4);
      continue;
    }
    const [r, g, b] = base.d.subarray(i, i + 3);
    const scarf = (g > r * 1.55 && g > b * 1.25 && g > 55) || (r > 175 && g > 120 && b < 105);
    if (plain.d[p + 3] || scarf) out.d.set(plain.d.subarray(p, p + 4), i);
  }
  return out;
}
