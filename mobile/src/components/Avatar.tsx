import type { AvatarLook, ItemStyle } from '@shared/types';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

// Өөрийн энгийн "chibi" дүр. Давхарга: үсний ар тал → хөл/доод хувцас → гутал → гар →
// цамц → толгой/нүүр → үс → нэмэлт эд зүйл. viewBox 120 × 160.

const DEFAULT: Required<Pick<AvatarLook, 'skin' | 'hair' | 'top' | 'bottom' | 'shoes'>> = {
  skin: { shape: 'base', color: '#F9D7BE' },
  hair: { shape: 'short', color: '#2A2522' },
  top: { shape: 'tshirt', color: '#60A5FA' },
  bottom: { shape: 'pants', color: '#1E3A8A' },
  shoes: { shape: 'sneakers', color: '#F3F4F6' },
};

/** #RRGGBB өнгийг amount (−1..1)-ээр бараан/цайвар болгоно. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(Math.max(0, Math.min(255, v)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

function HairBack({ s }: { s: ItemStyle }) {
  if (s.shape !== 'long') return null;
  return <Path d="M28 50 Q28 14 60 14 Q92 14 92 50 L95 96 Q87 101 80 94 L80 62 L40 62 L40 94 Q33 101 25 96 Z" fill={s.color} />;
}

function Bottom({ s }: { s: ItemStyle }) {
  const dark = shade(s.color, -0.2);
  if (s.shape === 'skirt') {
    return <Path d="M40 113 L80 113 L89 136 Q60 142 31 136 Z" fill={s.color} stroke={dark} strokeWidth={1.5} />;
  }
  if (s.shape === 'shorts') {
    return (
      <G>
        <Rect x={40} y={113} width={40} height={12} rx={5} fill={s.color} />
        <Rect x={42} y={118} width={17} height={14} rx={4} fill={s.color} />
        <Rect x={61} y={118} width={17} height={14} rx={4} fill={s.color} />
        <Line x1={60} y1={118} x2={60} y2={130} stroke={dark} strokeWidth={1.5} />
      </G>
    );
  }
  return (
    <G>
      <Rect x={40} y={113} width={40} height={12} rx={5} fill={s.color} />
      <Rect x={42} y={118} width={17} height={28} rx={5} fill={s.color} />
      <Rect x={61} y={118} width={17} height={28} rx={5} fill={s.color} />
      <Line x1={60} y1={118} x2={60} y2={128} stroke={dark} strokeWidth={1.5} />
    </G>
  );
}

function Shoes({ s }: { s: ItemStyle }) {
  const dark = shade(s.color, -0.35);
  if (s.shape === 'gutal') {
    // Монгол гутал: өндөр түрийтэй, хошуу нь дээш эргэсэн
    const trim = s.trim ?? '#F59E0B';
    const boot = (dx: number, flip: boolean) => (
      <G transform={flip ? `translate(${120 + dx} 0) scale(-1 1)` : `translate(${dx} 0)`}>
        <Path d="M44 130 L58 130 L58 147 Q58 152 52 152 L41 152 Q34 152 35 146 Q36 143 40 145 L44 145 Z" fill={s.color} />
        <Rect x={44} y={134} width={14} height={3} fill={trim} />
        <Path d="M36 146 Q34 141 38 141" stroke={trim} strokeWidth={2} fill="none" strokeLinecap="round" />
      </G>
    );
    return (
      <G>
        {boot(0, false)}
        {boot(0, true)}
      </G>
    );
  }
  return (
    <G>
      <Rect x={37} y={142} width={22} height={10} rx={5} fill={s.color} stroke={dark} strokeWidth={1.2} />
      <Rect x={61} y={142} width={22} height={10} rx={5} fill={s.color} stroke={dark} strokeWidth={1.2} />
      <Line x1={39} y1={149} x2={57} y2={149} stroke={dark} strokeWidth={1.2} />
      <Line x1={63} y1={149} x2={81} y2={149} stroke={dark} strokeWidth={1.2} />
    </G>
  );
}

function Top({ s }: { s: ItemStyle }) {
  const dark = shade(s.color, -0.2);
  if (s.shape === 'deel') {
    const trim = s.trim ?? '#FACC15';
    return (
      <G>
        <Rect x={25} y={81} width={13} height={31} rx={6} fill={s.color} />
        <Rect x={82} y={81} width={13} height={31} rx={6} fill={s.color} />
        <Rect x={25} y={106} width={13} height={5} fill={trim} />
        <Rect x={82} y={106} width={13} height={5} fill={trim} />
        <Path d="M38 84 Q38 79 46 79 L74 79 Q82 79 82 84 L86 138 L34 138 Z" fill={s.color} />
        {/* энгэр (диагональ) ба бүс */}
        <Path d="M52 80 Q66 88 80 96" stroke={trim} strokeWidth={4} fill="none" strokeLinecap="round" />
        <Rect x={35} y={110} width={50} height={7} fill={trim} />
        <Circle cx={74} cy={92} r={2} fill={trim} />
      </G>
    );
  }
  if (s.shape === 'hoodie') {
    return (
      <G>
        <Path d="M40 82 Q60 70 80 82 L76 88 Q60 80 44 88 Z" fill={dark} />
        <Rect x={25} y={81} width={13} height={31} rx={6} fill={s.color} />
        <Rect x={82} y={81} width={13} height={31} rx={6} fill={s.color} />
        <Rect x={36} y={80} width={48} height={40} rx={11} fill={s.color} />
        <Rect x={46} y={102} width={28} height={11} rx={5} fill={dark} />
        <Line x1={55} y1={84} x2={54} y2={96} stroke={shade(s.color, 0.6)} strokeWidth={2} strokeLinecap="round" />
        <Line x1={65} y1={84} x2={66} y2={96} stroke={shade(s.color, 0.6)} strokeWidth={2} strokeLinecap="round" />
      </G>
    );
  }
  // футболк
  return (
    <G>
      <Rect x={25} y={81} width={13} height={15} rx={6} fill={s.color} />
      <Rect x={82} y={81} width={13} height={15} rx={6} fill={s.color} />
      <Rect x={36} y={80} width={48} height={40} rx={11} fill={s.color} />
      <Path d="M52 80 Q60 88 68 80" stroke={dark} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

function HairFront({ s }: { s: ItemStyle }) {
  const c = s.color;
  switch (s.shape) {
    case 'spiky':
      return <Path d="M30 52 L27 30 L38 34 L40 15 L50 27 L58 8 L65 25 L75 11 L77 29 L89 23 L86 38 L91 52 Q80 36 60 38 Q41 36 30 52 Z" fill={c} />;
    case 'bun':
      return (
        <G>
          <Circle cx={60} cy={15} r={11} fill={c} />
          <Path d="M30 52 Q29 19 60 19 Q91 19 90 52 Q84 35 68 33 Q60 40 46 37 Q36 40 30 52 Z" fill={c} />
        </G>
      );
    case 'long':
      return <Path d="M30 56 Q27 18 60 18 Q93 18 90 56 Q86 36 72 31 Q62 41 44 36 Q34 42 30 56 Z" fill={c} />;
    default:
      return <Path d="M30 52 Q29 19 60 19 Q91 19 90 52 Q84 35 68 33 Q60 40 46 37 Q36 40 30 52 Z" fill={c} />;
  }
}

function Accessory({ s }: { s: ItemStyle }) {
  const c = s.color;
  switch (s.shape) {
    case 'glasses':
      return (
        <G>
          <Circle cx={49} cy={54} r={8} stroke={c} strokeWidth={2.5} fill="#FFFFFF" fillOpacity={0.25} />
          <Circle cx={71} cy={54} r={8} stroke={c} strokeWidth={2.5} fill="#FFFFFF" fillOpacity={0.25} />
          <Line x1={57} y1={53} x2={63} y2={53} stroke={c} strokeWidth={2.5} />
        </G>
      );
    case 'cap':
      return (
        <G>
          <Path d="M29 42 Q30 14 60 14 Q90 14 91 42 Z" fill={c} />
          <Path d="M58 38 Q88 33 104 42 Q88 47 58 43 Z" fill={shade(c, -0.25)} />
          <Circle cx={60} cy={15} r={3} fill={shade(c, -0.25)} />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d="M27 52 Q27 13 60 13 Q93 13 93 52" stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Rect x={20} y={44} width={13} height={21} rx={6} fill={c} />
          <Rect x={87} y={44} width={13} height={21} rx={6} fill={c} />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M38 27 L41 7 L51 19 L60 3 L69 19 L79 7 L82 27 Z" fill={c} stroke={shade(c, -0.35)} strokeWidth={1.5} strokeLinejoin="round" />
          <Circle cx={60} cy={20} r={3} fill="#E5484D" />
          <Circle cx={47} cy={22} r={2} fill="#3B82F6" />
          <Circle cx={73} cy={22} r={2} fill="#22C55E" />
        </G>
      );
    default:
      return null;
  }
}

export function Avatar({ look, size = 120 }: { look: AvatarLook; size?: number }) {
  const skin = (look.skin ?? DEFAULT.skin).color;
  const hair = look.hair ?? DEFAULT.hair;
  const top = look.top ?? DEFAULT.top;
  const bottom = look.bottom ?? DEFAULT.bottom;
  const shoes = look.shoes ?? DEFAULT.shoes;
  const longTop = top.shape === 'deel';

  return (
    <Svg width={size} height={(size * 160) / 120} viewBox="0 0 120 160">
      <HairBack s={hair} />
      {/* хөл */}
      <Rect x={44} y={116} width={12} height={30} rx={5} fill={skin} />
      <Rect x={64} y={116} width={12} height={30} rx={5} fill={skin} />
      {!longTop && <Bottom s={bottom} />}
      <Shoes s={shoes} />
      {/* гар */}
      <Rect x={27} y={84} width={10} height={31} rx={5} fill={skin} />
      <Rect x={83} y={84} width={10} height={31} rx={5} fill={skin} />
      {/* хүзүү */}
      <Rect x={54} y={74} width={12} height={10} rx={3} fill={shade(skin, -0.08)} />
      <Top s={top} />
      {/* толгой, чих */}
      <Circle cx={31} cy={55} r={6} fill={skin} />
      <Circle cx={89} cy={55} r={6} fill={skin} />
      <Circle cx={60} cy={50} r={30} fill={skin} />
      {/* нүүр */}
      <Ellipse cx={49} cy={55} rx={4} ry={5} fill="#2D2A3E" />
      <Ellipse cx={71} cy={55} rx={4} ry={5} fill="#2D2A3E" />
      <Circle cx={50.5} cy={53} r={1.5} fill="#FFFFFF" />
      <Circle cx={72.5} cy={53} r={1.5} fill="#FFFFFF" />
      <Ellipse cx={42} cy={64} rx={5} ry={3} fill="#FF8FA3" opacity={0.55} />
      <Ellipse cx={78} cy={64} rx={5} ry={3} fill="#FF8FA3" opacity={0.55} />
      <Path d="M53 66 Q60 72 67 66" stroke="#2D2A3E" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <HairFront s={hair} />
      {look.accessory ? <Accessory s={look.accessory} /> : null}
    </Svg>
  );
}
