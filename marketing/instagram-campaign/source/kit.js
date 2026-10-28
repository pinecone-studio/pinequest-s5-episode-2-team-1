// Shared poster helpers. Load at the end of <body>.
//
// <div class="phone" data-src="path.png" style="--pw:420px; left:…; top:…"></div>
//   → device frame + status bar + real screenshot from assets/screens/. The status bar takes the screen's top colour
//     (data-sb, default paper) and light text when data-dark is set.
//
// <div class="snip" data-src="lesson-correct.png" data-crop="x y w h" style="left:…; top:…; width:…"></div>
//   → a crop of a real screenshot. Crop box is in the 390×844 point space of the screenshot (the app's layout units);
//     the element's height is set from its width so the crop is never stretched.

const SCREENS = '../../assets/screens/';
const SB_ICONS = `
<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.5 1.5a4.4 4.4 0 0 0-6.2 0zM1.1 4.5a9.7 9.7 0 0 1 13.8 0l-1.5 1.5a7.6 7.6 0 0 0-10.8 0z" fill="currentColor"/></svg>
<svg viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="20" height="8" rx="2" fill="currentColor"/><rect x="24.6" y="4" width="1.8" height="4" rx=".9" fill="currentColor" opacity=".45"/></svg>`;

for (const el of document.querySelectorAll('.phone[data-src]')) {
  const sb = el.dataset.sb || '#efeee9';
  el.style.setProperty('--sb', sb);
  el.style.setProperty('--sbfg', 'dark' in el.dataset ? '#ffffff' : '#19152e');
  el.innerHTML = `<div class="screen"><div class="status"><span>9:41</span><span class="icons">${SB_ICONS}</span></div>
    <div class="island"></div><img src="${SCREENS + el.dataset.src}" alt=""></div>`;
}

for (const el of document.querySelectorAll('.snip[data-src]')) {
  const [x, y, w, h] = el.dataset.crop.split(/\s+/).map(Number);
  const width = el.getBoundingClientRect().width;
  const k = width / w; // px per screenshot point
  el.style.height = `${h * k}px`;
  el.style.backgroundImage = `url(${SCREENS + el.dataset.src})`;
  el.style.backgroundSize = `${390 * k}px ${844 * k}px`;
  el.style.backgroundPosition = `${-x * k}px ${-y * k}px`;
}

// <div class="frame" data-src="../../assets/sprites/golem_boss_sheet.png" style="--cols:6;--rows:3;--c:0;--r:0;…"> → one sprite-sheet frame
for (const el of document.querySelectorAll('.frame[data-src]')) el.style.backgroundImage = `url(${el.dataset.src})`;

// scripts/render.mjs waits for this before taking the screenshot (CSS background images do not block `load`)
window.kitReady = Promise.all(
  [...document.querySelectorAll('.snip[data-src], .frame[data-src]')].map((el) => {
    const img = new Image();
    img.src = el.dataset.src.includes('/') ? el.dataset.src : SCREENS + el.dataset.src;
    return img.decode().catch(() => {});
  }),
);
