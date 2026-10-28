// Профайлаас «Баавгайгаа хуваалцах»: хүүхдийн баавгай, хоч, шат, дарааллыг 1080×1350 (Instagram-ын босоо пост) зураг
// болгож хуваалцана. Зураг зөвхөн вэб дээр canvas-аар үүснэ (апп-д дэлгэцийн агшин авах сан байхгүй); утсан дээр текстээр.
// Зурган дээр хувийн мэдээлэл (нэр, анги, профайлын код) бичихгүй: хүүхдийн өөрөө сонгосон хоч л гарна.
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { avatarSprite, type PortraitLook } from '@/components/Avatar';
import { APP_NAME } from '@/constants/app';
import { colors, fonts } from '@/constants/theme';
import { S } from '@/i18n/strings';
import { sprites } from '@/sprites';

export interface BearCard {
  name: string;
  look: PortraitLook;
  level: number;
  streak: number;
}

const W = 1080;
const H = 1350;
/** Хөргийн тойргийн төв, радиус (160 px хөргийг 4 дахин томруулна: пиксел зураг хурц хэвээр) */
const CX = W / 2;
const CY = 610;
const R = 330;

export const canShareCardImage = () => Platform.OS === 'web' && typeof document !== 'undefined';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fg: string) {
  ctx.font = `600 40px ${fonts.semibold}`;
  const w = ctx.measureText(text).width + 64;
  const h = 76;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 2);
}

/** Картын PNG. */
export async function renderBearCard(card: BearCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  await Promise.all([fonts.pixel, fonts.bold, fonts.semibold].map((f) => document.fonts.load(`64px ${f}`).catch(() => [])));

  ctx.fillStyle = colors.violet;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = colors.lemon;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `140px ${fonts.pixel}`;
  ctx.fillText(APP_NAME, W / 2, 200);

  // хөрөг: ягаан тойрог, доороосоо тогтсон баавгай (Avatar-тай ижил)
  const source = sprites[avatarSprite(card.look, 160)].source;
  const asset = Asset.fromModule(source);
  const bear = await loadImage(asset.localUri ?? asset.uri);
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = colors.pink;
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  const size = 160 * 4.4;
  ctx.drawImage(bear, CX - size / 2, CY + R - size, size, size);
  ctx.restore();
  ctx.lineWidth = 14;
  ctx.strokeStyle = colors.white;
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = colors.white;
  ctx.textAlign = 'center';
  ctx.font = `76px ${fonts.bold}`;
  ctx.fillText(card.name, W / 2, CY + R + 120, W - 120);

  // шат, дараалал (0 өдрийн дарааллыг харуулахгүй)
  const y = CY + R + 230;
  const gap = 24;
  ctx.font = `600 40px ${fonts.semibold}`;
  const pills = [
    { text: S.profile.cardLevel(card.level), bg: colors.lemon },
    ...(card.streak > 0 ? [{ text: S.profile.cardStreak(card.streak), bg: colors.white }] : []),
  ].map((p) => ({ ...p, w: ctx.measureText(p.text).width + 64 }));
  let x = W / 2 - (pills.reduce((sum, p) => sum + p.w, 0) + gap * (pills.length - 1)) / 2;
  for (const p of pills) {
    pill(ctx, p.text, x + p.w / 2, y, p.bg, colors.ink);
    x += p.w + gap;
  }

  ctx.fillStyle = colors.lemon;
  ctx.font = `48px ${fonts.bold}`;
  ctx.fillText(S.profile.cardCta, W / 2, H - 70, W - 120);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png'));
}

/**
 * Картыг хуваалцах цонхоор (утасны browser: Instagram, Messenger…), эс бөгөөс татаж авна (компьютерийн browser).
 * Хүүхэд цонхыг хаавал 'cancelled'.
 */
export async function shareBearCard(card: BearCard, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderBearCard(card);
  const file = new File([blob], `${APP_NAME.toLowerCase()}-bear.png`, { type: 'image/png' });
  const nav = globalThis.navigator;
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
