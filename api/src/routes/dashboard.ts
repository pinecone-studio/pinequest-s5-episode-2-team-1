// Dashboard: GET /dashboard (хуудас) ба GET /dashboard/stats (тоо). Линктэй хүн бүр нэвтрэлтгүй харна: зөвхөн
// нэгтгэсэн тоо (нэр, id байхгүй). Гадны script, font ачаалахгүй.
// Доорх HTML нь TS template literal тул client JS-д backtick, "${", backslash бичихгүй.
import { Hono } from 'hono';
import { z } from 'zod';
import type { DashboardStatsResponse } from '../../../shared/types';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { loadStats } from '../services/stats';

export const dashboardRoutes = new Hono<AppEnv>();

/** Нийтэд нээлттэй тул ижил хүсэлтийг isolate бүрт 60 сек хадгална: олон хүн зэрэг нээсэн ч D1 уншилт өсөхгүй. */
const STATS_TTL_MS = 60_000;
const statsCache = new Map<number, { at: number; body: DashboardStatsResponse }>();

/** ?days=7..90 (анхдагч 30), өдрүүд UB цагаар. */
dashboardRoutes.get('/stats', async (c) => {
  const days = z.coerce.number().int().min(7).max(90).safeParse(c.req.query('days') ?? 30);
  if (!days.success) throw new ApiError(400, 'BAD_REQUEST', 'days=7..90');
  const now = Date.now();
  let hit = statsCache.get(days.data);
  if (!hit || now - hit.at > STATS_TTL_MS) {
    hit = { at: now, body: await loadStats(c.env.DB, days.data, now) };
    statsCache.set(days.data, hit);
  }
  c.header('Cache-Control', 'public, max-age=60');
  return c.json<DashboardStatsResponse>(hit.body);
});

dashboardRoutes.get('/', (c) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  c.header('X-Robots-Tag', 'noindex');
  c.header('Referrer-Policy', 'no-referrer');
  return c.html(DASHBOARD_HTML);
});

const DASHBOARD_HTML = /* html */ `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Сурах Аян · Самбар</title>
<style>
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --border: rgba(11, 11, 11, 0.10); --hover: rgba(11, 11, 11, 0.05);
  --s1: #2a78d6; --s2: #eb6834; --up: #006300; --down: #d03b3b; --accent: #2a78d6;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19; --ink: #f0efec; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --border: rgba(255, 255, 255, 0.10); --hover: rgba(255, 255, 255, 0.06);
    --s1: #3987e5; --s2: #d95926; --up: #0ca30c; --down: #e66767; --accent: #3987e5;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1120px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 22px; margin: 0 0 4px; font-weight: 650; }
h2 { font-size: 15px; margin: 0; font-weight: 600; }
.sub { color: var(--ink-2); font-size: 13px; margin: 2px 0 0; }
.muted { color: var(--muted); }
header { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--surface); }
.seg button { border: 0; border-right: 1px solid var(--border); background: none; color: var(--ink-2); padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--hover); color: var(--ink); font-weight: 600; }
.btn { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--ink); padding: 7px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.btn:hover, .seg button:hover { background: var(--hover); }
.error { color: var(--down); font-size: 13px; min-height: 1em; margin: 0 0 12px; }
/* Гол тоо (2 нүд) + 6 карт = 8 нүд: 4 эсвэл 2 баганад хоосон нүдгүй дүүрнэ. */
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
@media (min-width: 900px) { .tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; min-width: 0; }
.tile .label { color: var(--ink-2); font-size: 13px; }
.tile .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
.tile.hero { grid-column: span 2; }
.tile.hero .value { font-size: 52px; line-height: 1.1; }
.delta { font-size: 13px; margin-top: 2px; color: var(--muted); }
.delta.up { color: var(--up); }
.delta.down { color: var(--down); }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 12px; margin-bottom: 12px; }
.split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 12px; align-items: start; }
@media (max-width: 860px) { .split { grid-template-columns: minmax(0, 1fr); } }
.card-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; margin-bottom: 12px; }
.legend { display: flex; gap: 14px; font-size: 13px; color: var(--ink-2); align-items: center; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.chart { position: relative; width: 100%; }
.chart svg { display: block; overflow: visible; }
.grid-line { stroke: var(--grid); stroke-width: 1; }
.axis-line { stroke: var(--axis); stroke-width: 1; }
.tick { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.value-label { fill: var(--ink); font-size: 12px; font-weight: 600; }
.value-sub { fill: var(--ink-2); font-size: 12px; }
.cat-label { fill: var(--ink-2); font-size: 13px; }
.hit { fill: transparent; cursor: default; outline: none; }
.band { fill: transparent; }
.band.on { fill: var(--hover); }
.empty { fill: var(--muted); font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 7px 8px; text-align: right; border-bottom: 1px solid var(--grid); white-space: nowrap; }
th:first-child, td:first-child { text-align: left; }
th { color: var(--ink-2); font-weight: 600; position: sticky; top: 0; background: var(--surface); }
td { font-variant-numeric: tabular-nums; }
.table-wrap { max-height: 420px; overflow: auto; }
.tip { position: fixed; z-index: 10; pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 10px; font-size: 13px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); min-width: 150px; }
.tip .t { color: var(--ink-2); margin-bottom: 4px; }
.tip .r { display: flex; align-items: center; gap: 8px; }
.tip .r b { min-width: 2.5em; text-align: right; font-variant-numeric: tabular-nums; }
.tip .r i { width: 12px; height: 2px; border-radius: 1px; display: inline-block; }
.loading { opacity: 0.55; transition: opacity 0.15s; }
.foot { color: var(--muted); font-size: 12px; margin-top: 16px; }
@media (max-width: 520px) { .tile.hero .value { font-size: 44px; } .tile .value { font-size: 24px; } }
</style>
</head>
<body>
<main id="app">
  <header>
    <div>
      <h1>Сурах Аян · Самбар</h1>
      <p class="sub"><span id="today"></span> · Улаанбаатарын цагаар · <span id="updated"></span></p>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="Хугацаа">
        <button type="button" data-days="7">7 хоног</button>
        <button type="button" data-days="30">30 хоног</button>
        <button type="button" data-days="90">90 хоног</button>
      </div>
      <button class="btn" type="button" id="refresh">Шинэчлэх</button>
    </div>
  </header>
  <p class="error" id="error" role="alert"></p>

  <section class="tiles">
    <div class="card tile hero"><div class="label">Өнөөдөр орсон хүн</div><div class="value" id="k-active"></div><div class="delta" id="k-active-d"></div></div>
    <div class="card tile"><div class="label">Өнөөдөр бүртгүүлсэн</div><div class="value" id="k-signups"></div><div class="delta" id="k-signups-d"></div></div>
    <div class="card tile"><div class="label">Нийт хэрэглэгч</div><div class="value" id="k-users"></div></div>
    <div class="card tile"><div class="label">Сүүлийн 7 хоногт орсон</div><div class="value" id="k-7d"></div><div class="delta" id="k-30d"></div></div>
    <div class="card tile"><div class="label">Өнөөдөр дууссан даалгавар</div><div class="value" id="k-tasks"></div></div>
    <div class="card tile"><div class="label">Өнөөдөр тоглосон тулаан</div><div class="value" id="k-duels"></div></div>
    <div class="card tile"><div class="label">Өнөөдөр баавгайтай ярилцсан</div><div class="value" id="k-tutor"></div></div>
  </section>

  <section class="grid2">
    <div class="card">
      <div class="card-head"><div><h2>Өдөр бүр бүртгүүлсэн</h2><p class="sub">Шинээр бүртгэл үүсгэсэн хүний тоо</p></div></div>
      <div class="chart" id="chart-signups" data-label="Өдөр бүр бүртгүүлсэн хүний тоо"></div>
    </div>
    <div class="card">
      <div class="card-head">
        <div><h2>Өдөр бүр орсон хүн</h2><p class="sub">Тэр өдөр апп-аа нээж ашигласан хүний тоо</p></div>
        <div class="legend"><span><i style="background: var(--s1)"></i>Шинэ</span><span><i style="background: var(--s2)"></i>Буцаж ирсэн</span></div>
      </div>
      <div class="chart" id="chart-active" data-label="Өдөр бүр орсон хүний тоо: шинэ ба буцаж ирсэн"></div>
    </div>
  </section>

  <section class="split">
    <div class="card">
      <div class="card-head"><div><h2>Ангиар</h2><p class="sub">Нийт хэрэглэгч · өнөөдөр орсон</p></div></div>
      <div class="chart" id="chart-grades" data-label="Анги бүрийн хэрэглэгчийн тоо"></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Өдөр бүрийн тоо</h2><p class="sub">Шинэ нь дээрээ</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Өдөр</th><th>Бүртгүүлсэн</th><th>Орсон</th><th>Буцаж ирсэн</th><th>Даалгавар</th><th>Тулаан</th><th>Баавгай</th></tr></thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    </div>
  </section>

  <p class="foot">«Шинэ» = тэр өдөр бүртгүүлсэн, «Буцаж ирсэн» = өмнөх өдрүүдэд бүртгүүлсэн. «Орсон»-ыг 2026-10-26-наас тэмдэглэж эхэлсэн.
    Даалгавар = тэр өдөр эхэлж дуусгасан, тулаан = дууссан тулаан. Хуудас 5 минут тутам өөрөө шинэчлэгдэнэ.</p>
</main>
<div class="tip" id="tip" hidden></div>

<script>
(function () {
  'use strict';
  var WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
  var NS = 'http://www.w3.org/2000/svg';
  var REFRESH_MS = 5 * 60 * 1000;
  var state = { days: 30, data: null, fetchedAt: 0 };

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function compact(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K' : String(n); }
  function weekday(day) { return WEEKDAYS[new Date(day + 'T00:00:00Z').getUTCDay()]; }
  function shortDay(day) { return day.slice(5).replace('-', '/'); }
  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function niceStep(raw) {
    if (raw <= 1) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  // ---- tooltip -------------------------------------------------------------
  var tip = $('tip');
  function showTip(title, rows, x, y) {
    tip.textContent = '';
    var t = document.createElement('div');
    t.className = 't';
    t.textContent = title;
    tip.appendChild(t);
    rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'r';
      var key = document.createElement('i');
      key.style.background = r.color || 'transparent';
      var b = document.createElement('b');
      b.textContent = fmt(r.value);
      var s = document.createElement('span');
      s.textContent = r.label;
      row.appendChild(key); row.appendChild(b); row.appendChild(s);
      tip.appendChild(row);
    });
    tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
    var top = y - h - 12 < 8 ? y + 16 : y - h - 12;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { tip.hidden = true; }
  function bindHover(hit, band, title, rows) {
    function at(e) {
      band.classList.add('on');
      if (e.type === 'focus') { var b = hit.getBoundingClientRect(); showTip(title, rows, b.left + b.width / 2, b.top + 20); }
      else showTip(title, rows, e.clientX, e.clientY);
    }
    function off() { band.classList.remove('on'); hideTip(); }
    hit.addEventListener('pointermove', at);
    hit.addEventListener('focus', at);
    hit.addEventListener('pointerleave', off);
    hit.addEventListener('blur', off);
  }

  // Дээд талаараа 4px бөөрөнхий, суурь дээрээ тэгш багана.
  function topRounded(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'L' + x + ',' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'L' + (x + w - r) + ',' + y + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'L' + (x + w) + ',' + (y + h) + 'Z';
  }

  // ---- багана (1 цуваа эсвэл давхарласан) -------------------------------------
  function columns(box, rows, series) {
    box.textContent = '';
    var W = Math.max(box.clientWidth, 280), H = 230;
    var m = { t: 22, r: 8, b: 26, l: 34 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, base = m.t + ih;
    var totals = rows.map(function (r) { return series.reduce(function (s, se) { return s + r[se.key]; }, 0); });
    var max = Math.max.apply(null, totals);
    var step = niceStep(Math.max(max, 1) / 4), top = step * 4;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': box.getAttribute('data-label') }, box);
    for (var i = 1; i <= 4; i++) {
      var gy = base - (step * i / top) * ih;
      svg('line', { x1: m.l, x2: W - m.r, y1: gy, y2: gy, class: 'grid-line' }, root);
      svg('text', { x: m.l - 6, y: gy + 4, 'text-anchor': 'end', class: 'tick' }, root).textContent = compact(step * i);
    }
    svg('text', { x: m.l - 6, y: base + 4, 'text-anchor': 'end', class: 'tick' }, root).textContent = '0';
    var bandW = iw / rows.length, bw = Math.max(2, Math.min(24, bandW * 0.7));
    var every = rows.length <= 10 ? 1 : rows.length <= 31 ? 5 : 15;
    var bands = svg('g', {}, root), marks = svg('g', {}, root), hits = svg('g', {}, root);
    rows.forEach(function (r, idx) {
      var x0 = m.l + idx * bandW, x = x0 + (bandW - bw) / 2;
      var band = svg('rect', { x: x0, y: m.t, width: bandW, height: ih, class: 'band' }, bands);
      var y = base, drawn = [];
      series.forEach(function (se) {
        var v = r[se.key];
        if (v > 0) { var h = (v / top) * ih; drawn.push({ se: se, y: y - h, h: h }); y -= h; }
      });
      drawn.forEach(function (d, k) {
        // Давхаргын хооронд 2px зай (surface gap); хамгийн дээд хэсэг л бөөрөнхий.
        var h = k > 0 ? Math.max(d.h - 2, 0.5) : d.h;
        if (k === drawn.length - 1) svg('path', { d: topRounded(x, d.y, bw, h, 4), fill: d.se.color }, marks);
        else svg('rect', { x: x, y: d.y, width: bw, height: h, fill: d.se.color }, marks);
      });
      if ((rows.length - 1 - idx) % every === 0) {
        svg('text', { x: x0 + bandW / 2, y: H - 8, 'text-anchor': 'middle', class: 'tick' }, root).textContent = shortDay(r.day);
      }
      if (idx === rows.length - 1) {
        svg('text', { x: x + bw / 2, y: y - 6, 'text-anchor': 'middle', class: 'value-label' }, root).textContent = fmt(totals[idx]);
      }
      var hit = svg('rect', { x: x0, y: m.t, width: bandW, height: ih, class: 'hit', tabindex: '0',
        'aria-label': r.day + ': ' + series.map(function (se) { return se.label + ' ' + r[se.key]; }).join(', ') }, hits);
      var tipRows = series.map(function (se) { return { label: se.label, value: r[se.key], color: se.color }; });
      if (series.length > 1) tipRows.push({ label: 'Нийт', value: totals[idx] });
      bindHover(hit, band, r.day + ' · ' + weekday(r.day), tipRows);
    });
    svg('line', { x1: m.l, x2: W - m.r, y1: base, y2: base, class: 'axis-line' }, root);
    if (max === 0) svg('text', { x: m.l + iw / 2, y: m.t + ih / 2, 'text-anchor': 'middle', class: 'empty' }, root).textContent = 'Энэ хугацаанд өгөгдөл алга';
  }

  // ---- ангиар хэвтээ багана ------------------------------------------------------
  function gradeBars(box, grades) {
    box.textContent = '';
    var W = Math.max(box.clientWidth, 280), rowH = 36, H = grades.length * rowH + 4;
    var labelW = 72, valueW = 130, iw = W - labelW - valueW, bh = 20;
    var max = Math.max(1, Math.max.apply(null, grades.map(function (g) { return g.users; })));
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': box.getAttribute('data-label') }, box);
    svg('line', { x1: labelW, x2: labelW, y1: 0, y2: H, class: 'axis-line' }, root);
    grades.forEach(function (g, i) {
      var y0 = i * rowH, y = y0 + (rowH - bh) / 2, w = (g.users / max) * iw;
      var band = svg('rect', { x: 0, y: y0, width: W, height: rowH, class: 'band' }, root);
      svg('text', { x: 0, y: y0 + rowH / 2 + 4, class: 'cat-label' }, root).textContent = g.grade + '-р анги';
      if (w > 0) {
        var r = Math.min(4, w, bh / 2);
        svg('path', { fill: 'var(--s1)', d: 'M' + labelW + ',' + y + 'L' + (labelW + w - r) + ',' + y + 'Q' + (labelW + w) + ',' + y + ' ' + (labelW + w) + ',' + (y + r) +
          'L' + (labelW + w) + ',' + (y + bh - r) + 'Q' + (labelW + w) + ',' + (y + bh) + ' ' + (labelW + w - r) + ',' + (y + bh) + 'L' + labelW + ',' + (y + bh) + 'Z' }, root);
      }
      var t = svg('text', { x: labelW + w + 8, y: y0 + rowH / 2 + 4 }, root);
      svg('tspan', { class: 'value-label' }, t).textContent = fmt(g.users);
      svg('tspan', { class: 'value-sub', dx: '6' }, t).textContent = '· өнөөдөр ' + fmt(g.activeToday);
      var hit = svg('rect', { x: 0, y: y0, width: W, height: rowH, class: 'hit', tabindex: '0',
        'aria-label': g.grade + '-р анги: ' + g.users + ' хэрэглэгч, өнөөдөр ' + g.activeToday + ' орсон' }, root);
      bindHover(hit, band, g.grade + '-р анги', [
        { label: 'хэрэглэгч', value: g.users, color: 'var(--s1)' },
        { label: 'өнөөдөр орсон', value: g.activeToday },
      ]);
    });
  }

  function table(body, rows) {
    body.textContent = '';
    rows.slice().reverse().forEach(function (r) {
      var tr = document.createElement('tr');
      [r.day + ' ' + weekday(r.day), r.signups, r.active, r.returning, r.tasks, r.duels, r.tutor].forEach(function (v, i) {
        var td = document.createElement('td');
        td.textContent = i === 0 ? v : fmt(v);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function delta(el, diff) {
    el.className = 'delta' + (diff > 0 ? ' up' : diff < 0 ? ' down' : '');
    el.textContent = (diff > 0 ? '▲ +' + diff : diff < 0 ? '▼ −' + Math.abs(diff) : '— 0') + ' өчигдрөөс';
  }

  function render() {
    var d = state.data;
    if (!d) return;
    var rows = d.daily.map(function (r) { return Object.assign({ fresh: r.active - r.returning }, r); });
    var t = rows[rows.length - 1], y = rows[rows.length - 2];
    $('today').textContent = 'Өнөөдөр ' + d.today + ' (' + weekday(d.today) + ')';
    $('updated').textContent = 'шинэчилсэн ' + new Date(d.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar' });
    $('k-active').textContent = fmt(t.active);
    delta($('k-active-d'), t.active - y.active);
    $('k-signups').textContent = fmt(t.signups);
    delta($('k-signups-d'), t.signups - y.signups);
    $('k-users').textContent = fmt(d.totals.users);
    $('k-7d').textContent = fmt(d.totals.active7d);
    $('k-30d').textContent = '30 хоногт ' + fmt(d.totals.active30d);
    $('k-tasks').textContent = fmt(t.tasks);
    $('k-duels').textContent = fmt(t.duels);
    $('k-tutor').textContent = fmt(t.tutor);
    columns($('chart-signups'), rows, [{ key: 'signups', label: 'бүртгүүлсэн', color: 'var(--s1)' }]);
    columns($('chart-active'), rows, [
      { key: 'fresh', label: 'шинэ', color: 'var(--s1)' },
      { key: 'returning', label: 'буцаж ирсэн', color: 'var(--s2)' },
    ]);
    gradeBars($('chart-grades'), d.grades);
    table($('table-body'), rows);
    document.querySelectorAll('.seg button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-days')) === state.days));
    });
  }

  async function refresh() {
    $('app').classList.add('loading');
    try {
      var res = await fetch('/dashboard/stats?days=' + state.days);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.data = await res.json();
      state.fetchedAt = Date.now();
      $('error').textContent = '';
      render();
    } catch (e) {
      $('error').textContent = 'Өгөгдөл татаж чадсангүй (' + (e && e.message ? e.message : e) + '). «Шинэчлэх»-ийг дарна уу.';
    } finally {
      $('app').classList.remove('loading');
    }
  }

  $('refresh').addEventListener('click', refresh);
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () { state.days = Number(b.getAttribute('data-days')); refresh(); });
  });
  var resizeTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 150); });
  setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - state.fetchedAt > REFRESH_MS) refresh();
  });
  refresh();
})();
</script>
</body>
</html>
`;
