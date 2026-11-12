import { Pen } from './gfx/pen.js';
import { Bits } from './gfx/bits.js';
import { readTheme } from './theme.js';
import { PLATES } from './plates/index.js';

const $ = (s, el = document) => el.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fx = (v) => +v.toFixed(3);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const CPU = { willReadFrequently: true };
const LEAD = 12;
const TRIP = 760;
const HAIR_UP_TO = 1.5;

const boot = window.__stack;
const root = document.documentElement;
if (!boot) {
  root.classList.remove('js');
  throw new Error('layout script missing');
}
const view = $('#view');
const track = $('#track');
const rail = $('#rail');
const nav = $('nav', rail);
const layerBox = $('#layers');
const calloutBox = $('#callouts');
const mqDesk = matchMedia('(min-width: 960px) and (min-height: 600px)');
const mqCalm = matchMedia('(prefers-reduced-motion: reduce)');

let pen;
let bits;

const NONE = 0;
const STALE = 1;
const READY = 2;

let stops = [];
function buildLayers() {
  stops = boot.items.map((li, k) => {
    const layer = el('div', 'pl');
    const hit = el('div', 'pl-hit');
    const inner = el('div', 'pl-in');
    const lo = el('canvas', 'pl-c');
    const bc = el('canvas', 'pl-c pl-b');
    const hi = el('canvas', 'pl-c');
    bc.width = bc.height = hi.width = hi.height = 0;
    inner.append(el('div', 'pl-bg'), lo, bc, hi);
    layer.append(hit, inner);
    layer.style.zIndex = 100 - k;
    layerBox.append(layer);
    li.removeAttribute('id');
    return {
      k,
      id: li.dataset.plate,
      li,
      title: $('.ttl', li).textContent,
      group: $('h2', li.closest('.group')).textContent,
      desc: $('.desc', li).textContent,
      plate: PLATES[li.dataset.plate],
      layer,
      hit,
      lo,
      bc,
      hi,
      loCtx: lo.getContext('2d', CPU),
      bcCtx: bc.getContext('2d', CPU),
      hiCtx: hi.getContext('2d', CPU),
      loS: NONE,
      bcS: NONE,
      hiS: NONE,
      cells: null,
      dirty: true,
      rolled: false,
      clock: 0,
      a: 0,
      vis: false,
      on: false,
      live: false,
      at: 0,
      bitT: 0,
      tf: '',
      oLo: -1,
      oBc: -1,
      oHi: -1,
      oCo: 0,
    };
  });
}
const N = boot.items.length;
const heads = boot.heads;

let L = null;
let sig = '';

const S = {
  y: -1,
  e: 0,
  f: 0,
  active: -1,
  hover: -1,
  peek: -1,
  t: 0,
  dirty: true,
  eShown: -1,
  drawn: 0,
  cost: 3,
  pace: 1,
  seat: 0,
  still: false,
  shown: 0,
  whole: false,
  staged: false,
};

function draw(s) {
  pen.quad(-5, -5, 5, 5, -0.62, 'shadow');
  pen.quad(-5, -5, 5, 5, 0, 'paper', 'line', 1.25);
  s.plate.draw(pen, s.clock);
}

function paint(s, ctx, res, lod) {
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, L.w, L.h);
  pen.to(ctx, L.u, L.w / 2, L.top, res, lod ? L.lod : L.fine);
  draw(s);
}

function size(canvas, ctx, w, h) {
  if (canvas.width === w && canvas.height === h) return;
  canvas.width = w;
  canvas.height = h;
  ctx.fontSet = '';
}

function tick(s, dt) {
  s.clock += dt;
  s.plate.update?.(s.clock, dt);
}

// Draws the small thumbnail used in the tower, running the plate forward first so it opens mid-story.
function paintLo(s) {
  if (!s.rolled) {
    s.rolled = true;
    for (let i = 0; i < 50; i++) tick(s, 0.12);
  }
  size(s.lo, s.loCtx, Math.round(L.w * L.resLo), Math.round(L.h * L.resLo));
  paint(s, s.loCtx, L.resLo, true);
  s.loS = READY;
}

function paintHi(s) {
  size(s.hi, s.hiCtx, Math.round(L.w * L.res), Math.round(L.h * L.res));
  paint(s, s.hiCtx, L.res, false);
  s.hiS = READY;
}

// Reads how much ink the plate puts in each character cell, for the binary version.
function sample(s) {
  s.cells = bits.sample(L.cols, L.rows, L.res / L.cw, L.res / L.ch, (ctx) => {
    pen.to(ctx, L.u, L.w / 2, L.top, 1, L.mask);
    draw(s);
  });
  s.dirty = false;
}

function paintBits(s) {
  if (!s.cells || s.dirty) sample(s);
  const w = L.cols * L.cw;
  const h = L.rows * L.ch;
  if (s.bc.width !== w || s.bc.height !== h) {
    s.bc.width = w;
    s.bc.height = h;
    s.bc.style.width = w / L.res + 'px';
    s.bc.style.height = h / L.res + 'px';
  }
  bits.stamp(s.bcCtx, s.cells, L.cols, L.rows, s.k);
  s.bcS = READY;
  s.bitT = S.t;
}

function drop(s, which) {
  s[which].width = s[which].height = 0;
  s[which + 'S'] = NONE;
  s[which === 'hi' ? 'oHi' : 'oBc'] = -1;
}

let coRail;
function buildLabels() {
  coRail = el('div', 'co-rail');
  calloutBox.append(coRail);
  for (const s of stops) {
    const c = el('div', 'callout');
    c.append(el('h3', 'co-ttl', s.title), el('p', 'co-desc', s.desc));
    const out = $('.out', s.li);
    if (out) {
      const a = el('a', 'co-out', out.textContent);
      a.href = out.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      c.append(a);
    }
    coRail.append(c);
    s.callout = c;
  }
  ticks = el('div', 'ticks');
  ticks.setAttribute('aria-hidden', 'true');
  for (const s of stops) {
    s.tick = el('i', s.k && s.group !== stops[s.k - 1].group ? 'g' : '');
    ticks.append(s.tick);
  }
  $('#stage').append(ticks);
}
let ticks;

// Re-measures the page and resizes every layer; runs on load, resize and zoom.
function layout() {
  const G = boot.measure();
  const now = JSON.stringify(G);
  if (now === sig) return;
  sig = now;

  const first = !L;
  const key = [G.w, G.h, G.res, G.s0.toFixed(4)].join('|');
  const redraw = !L || key !== L.key;
  L = G;
  L.key = key;
  boot.settle(L);

  L.px = (v) => Math.round(v * L.dpr) / L.dpr;
  L.resLo = L.res * clamp(L.s0 * 1.5, 0.35, 0.8);
  L.lod = { k: 0.95 / (1.25 * L.s0), lod: true };
  L.fine = L.res <= HAIR_UP_TO ? { hair: 1 / L.res } : undefined;
  const cw = clamp(Math.round(L.u / 6), 7, 9);
  L.cw = Math.round(cw * L.res);
  L.ch = Math.round(cw * 1.65 * L.res);
  L.cols = Math.ceil((L.w * L.res) / L.cw);
  L.rows = Math.ceil((L.h * L.res) / L.ch);
  L.mask = { mask: true, lw: (1.25 * L.cw) / L.res };

  if (redraw) {
    const s100 = L.hw / 100;
    const t100 = L.hh / 100;
    layerBox.style.setProperty('--s0', L.s0.toFixed(4));
    layerBox.style.setProperty('--plane', `matrix(${s100},${t100},${-s100},${t100},${L.w / 2},${L.top - L.hh})`);
    bits.cell(L.cw, L.ch);
    for (const s of stops) {
      s.layer.style.width = L.w + 'px';
      s.layer.style.height = L.h + 'px';
      s.layer.style.transformOrigin = `${L.w / 2}px ${L.top}px`;
      if (s.loS) s.loS = STALE;
      if (s.bcS) s.bcS = STALE;
      if (s.hiS) s.hiS = STALE;
      s.cells = null;
    }
    if (first) {
      const t0 = performance.now();
      for (const s of stops) {
        paintLo(s);
        if (performance.now() - t0 > 250) break;
      }
    }
  }

  L.trackTop = track.getBoundingClientRect().top + window.scrollY;
  for (const s of stops) {
    s.a = L.open + s.k * L.pitch;
    s.callout.style.transform = `translate3d(${fx(L.labelX)}px,${fx(L.cy + s.k * L.pitch + (L.desk ? -LEAD : L.labelY))}px,0)`;
  }
  if (L.desk) {
    for (const name of ['--label-w', '--lead-x', '--lead-h']) calloutBox.style.removeProperty(name);
    rail.style.removeProperty('--index');
    rail.classList.remove('open');
  } else {
    calloutBox.style.setProperty('--label-w', L.labelW + 'px');
    calloutBox.style.setProperty('--lead-x', L.leadX + 'px');
    calloutBox.style.setProperty('--lead-h', L.labelY + 'px');
    let tallest = 0;
    for (const s of stops) tallest = Math.max(tallest, s.callout.offsetHeight);
    if (tallest && Math.abs(tallest - L.labelH) > 1) {
      boot.labelH = tallest;
      return layout();
    }
  }

  if (S.staged) choreograph();
  else L.margin = 40;
  S.dirty = true;
  S.eShown = -1;
  S.still = false;
}

// Maps a scroll offset to the layer in focus (fractional); negative while the tower is still closed.
function focusAt(y) {
  if (y <= 0) return -1;
  if (y < L.open) return y / L.open - 1;
  return Math.min(N - 1, (y - L.open) / L.pitch);
}

const P = { e: 0, f: 0, sc: 1, pitch: 0, top: 0, x: 0 };
// Where the whole stack sits at a scroll offset: openness, focus, scale, spacing and position.
function pose(y, out) {
  const fa = focusAt(y);
  const e = fa >= 0 ? 1 : 1 - Math.pow(-fa, 1.6);
  const f = fa > 0 ? fa : 0;
  out.e = e;
  out.f = f;
  out.sc = e === 1 ? 1 : Math.exp(Math.log(L.s0) * (1 - e));
  out.pitch = L.p0 + (L.pitch - L.p0) * e;
  out.top = L.y0 + (L.cy - L.y0) * e - f * L.pitch;
  out.x = L.x + (L.x0 - L.x) * (1 - e);
  return out;
}

function between(a, b, u, f, out) {
  out.e = a.e + (b.e - a.e) * u;
  out.f = f;
  out.sc = a.sc * Math.pow(b.sc / a.sc, u);
  out.pitch = a.pitch + (b.pitch - a.pitch) * u;
  out.top = a.top + (b.top - a.top) * u;
  out.x = a.x + (b.x - a.x) * u;
  return out;
}
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(2 - 2 * u, 3) / 2);

const layerAt = (p, k) => `translate3d(${fx(p.x)}px,${fx(p.top + k * p.pitch - L.top)}px,0) scale(${+p.sc.toFixed(5)})`;
const railAt = (p) => `translate3d(${fx(L.dx * (1 - p.e))}px,0,0)`;
const rowAt = (p, dy) => `translate3d(0,${fx(dy * (1 - p.e))}px,0)`;
const labelsAt = (p) => `translate3d(0,${fx(p.top - L.cy)}px,0)`;

// Every element that moves with the pose, paired with the transform it takes.
const movers = () => [
  ...stops.map((s) => [s.layer, (p) => layerAt(p, s.k)]),
  ...stops.map((s) => [s.li, (p) => rowAt(p, L.legend[s.k].dy)]),
  ...heads.map((h, i) => [h, (p) => rowAt(p, L.groups[i].y)]),
  [rail, railAt],
  [coRail, labelsAt],
];

let timeline = null;
if (typeof ScrollTimeline === 'function') {
  try {
    timeline = new ScrollTimeline({ source: root, axis: 'block' });
  } catch {
    timeline = null;
  }
}
const running = [];
let driven = false;

function release() {
  for (const a of running) a.cancel();
  running.length = 0;
  driven = false;
  L.margin = 40;
}

// Bakes the poses into scroll-driven keyframes so the compositor moves the stack (desktop only).
function choreograph() {
  endTrip();
  release();
  if (!timeline || !L.desk || L.trackTop !== 0) return;
  const max = L.span;
  if (Math.abs(root.scrollHeight - root.clientHeight - max) > 1.5) return;
  const ys = [];
  for (let i = 0; i <= 40; i++) ys.push((L.open * i) / 40);
  ys.push(max);
  const poses = ys.map((y) => pose(y, {}));
  const run = (node, at) => {
    const frames = poses.map((p, i) => ({ offset: ys[i] / max, transform: at(p) }));
    running.push(node.animate(frames, { timeline, fill: 'both' }));
  };
  try {
    for (const [node, at] of movers()) run(node, at);
    driven = true;
    proven = 0;
    L.margin = L.vh * 0.5;
  } catch {
    byHand();
  }
}

function byHand() {
  release();
  timeline = null;
  S.dirty = true;
  S.eShown = -1;
}

let proven = 0;
// Checks that the scroll timeline really tracks the scroll position, and falls back to the frame loop if not.
function prove() {
  if (++proven !== 3) return;
  const at = running[0]?.effect?.getComputedTiming().progress;
  const want = clamp(window.scrollY / L.span, 0, 1);
  if (at == null || Math.abs(at - want) > 0.004) byHand();
}

function fade(s, node, cache, v) {
  const o = Math.round(clamp(v, 0, 1) * 200);
  if (s[cache] === o) return;
  s[cache] = o;
  node.style.opacity = o / 200;
}

// Applies the current pose to the DOM; returns 0 if nothing moved, 1 if it moved, 2 if it jumped.
function dress() {
  const y = window.scrollY - L.trackTop;
  if (y === S.y && !S.dirty && !trip) return 0;
  const jump = Math.abs(y - S.y);
  S.y = y;
  S.dirty = false;

  let p;
  if (trip && Math.abs(y - trip.y) > 1.5) endTrip();
  if (trip) {
    const u = (performance.now() - trip.t0) / TRIP;
    p = between(trip.from, trip.to, ease(clamp(u, 0, 1)), trip.f, P);
    if (u >= 1) endTrip();
  } else p = pose(y, P);
  const going = trip !== null;
  const e = (S.e = p.e);
  const f = (S.f = p.f);
  const sc = p.sc;
  const full = smooth(0.5, 0.8, sc);

  for (const s of stops) {
    const py = p.top + s.k * p.pitch;
    const ad = Math.abs(s.k - f);
    const vis = s.loS !== NONE && py - L.top * sc < L.full + L.margin && py + L.bot * sc > -L.margin;
    if (vis !== s.vis) {
      s.vis = vis;
      s.layer.style.visibility = vis ? 'visible' : 'hidden';
    }
    if (vis) {
      if (!driven) {
        const tf = e === 1 ? `translate3d(${fx(p.x)}px,${L.px(py - L.top)}px,0)` : layerAt(p, s.k);
        if (tf !== s.tf) s.layer.style.transform = s.tf = tf;
      }
      const lines = full * (1 - smooth(0.3, 0.8, ad));
      const digits = full * smooth(0.24, 0.72, ad);
      let thumb = 1 - full;
      if (s.hiS) fade(s, s.hi, 'oHi', Math.max(0.005, lines));
      else thumb += lines;
      if (s.bcS) fade(s, s.bc, 'oBc', Math.max(0.005, digits));
      else thumb += digits;
      fade(s, s.lo, 'oLo', thumb);
    }

    const o = e < 0.7 || ad > 0.62 ? 0 : Math.round((1 - smooth(0.14, 0.48, ad)) * smooth(0.7, 1, e) * 100);
    if (o !== s.oCo) {
      s.oCo = o;
      s.callout.style.opacity = o / 100;
      if (s.on !== o > 0) s.callout.classList.toggle('on', (s.on = o > 0));
    }
    const live = o > 0 && ad < 0.3;
    if (live !== s.live) s.callout.classList.toggle('live', (s.live = live));
  }

  if (e !== S.eShown) {
    S.eShown = e;
    if (!driven) {
      rail.style.transform = railAt(p);
      for (const s of stops) s.li.style.transform = rowAt(p, L.legend[s.k].dy);
      heads.forEach((h, i) => (h.style.transform = rowAt(p, L.groups[i].y)));
    }
    nav.style.setProperty('--legend', clamp(1 - e * 5, 0, 1).toFixed(2));
    if (L.desk) nav.style.setProperty('--spine', smooth(0.55, 1, e).toFixed(2));
    else {
      rail.style.setProperty('--index', clamp(1 - e * 3.2, 0, 1).toFixed(2));
      rail.classList.toggle('open', e > 0.34);
      ticks.style.opacity = smooth(0.6, 1, e).toFixed(2);
    }
  }
  if (!driven) coRail.style.transform = labelsAt(p);

  showPeek();
  setActive(e > 0.5 ? clamp(Math.round(f), 0, N - 1) : -1);
  return jump > 70 ? 2 : jump > 0 || going ? 1 : 0;
}

// Nudges the resting stack onto whole device pixels so thin lines stay sharp.
function seat() {
  let d = 0;
  if (driven && S.e === 1) {
    const top = (L.cy - L.top - S.f * L.pitch) * L.dpr;
    d = (Math.round(top) - top) / L.dpr;
    if (Math.abs(d) * L.dpr < 0.02) d = 0;
  }
  if (d === S.seat) return;
  S.seat = d;
  layerBox.style.transform = calloutBox.style.transform = `translate3d(0,${d.toFixed(4)}px,0)`;
}

function showPeek() {
  if (!L) return;
  const k = L.desk && S.e < 0.02 ? S.hover : -1;
  if (k === S.peek) return;
  if (S.peek >= 0) stops[S.peek].layer.classList.remove('up');
  S.peek = k;
  if (k >= 0) stops[k].layer.classList.add('up');
}

function setHover(k) {
  if (k === S.hover) return;
  if (S.hover >= 0) stops[S.hover].li.classList.remove('hot');
  S.hover = k;
  if (k >= 0) stops[k].li.classList.add('hot');
  showPeek();
}

function listen() {
  for (const s of stops) {
    for (const node of [s.hit, s.li]) {
      node.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && setHover(s.k));
      node.addEventListener('pointerleave', () => setHover(-1));
    }
    s.hit.addEventListener('click', () => goTo(s.k));
    $('a.item', s.li).addEventListener('click', (e) => {
      e.preventDefault();
      goTo(s.k);
    });
  }
  $('.name a')?.addEventListener('click', (e) => {
    e.preventDefault();
    goTo(-1);
  });
}

let hashTimer = 0;
function setActive(k) {
  if (k === S.active) return;
  if (S.active >= 0) {
    stops[S.active].li.classList.remove('active');
    stops[S.active].layer.classList.remove('cur');
    stops[S.active].tick.classList.remove('on');
  }
  S.active = k;
  if (k >= 0) {
    stops[k].li.classList.add('active');
    stops[k].layer.classList.add('cur');
    stops[k].tick.classList.add('on');
  }
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const u = new URL(location.href);
    u.hash = k >= 0 ? stops[k].id : '';
    history.replaceState(null, '', u);
  }, 400);
}

function goTo(k, instant) {
  if (!L) return;
  const top = k < 0 ? 0 : L.trackTop + stops[clamp(k, 0, N - 1)].a;
  if (instant || mqCalm.matches) window.scrollTo({ top, behavior: 'auto' });
  else if (k >= 0 ? S.e < 1 : S.e === 1 && S.f > 0.5) travel(top);
  else window.scrollTo({ top, behavior: 'smooth' });
}

const NEAR = 0.4;
let touching = false;
let settleTimer = 0;
let settling = false;
// On phones, eases a scroll that stopped near an entry onto that entry.
function settle() {
  settling = false;
  if (!L || L.desk || touching || trip || mqCalm.matches) return;
  const y = window.scrollY - L.trackTop;
  let to;
  if (y < L.open) to = y < L.open * 0.3 ? 0 : y > L.open * 0.6 ? L.open : -1;
  else {
    const k = clamp(Math.round((y - L.open) / L.pitch), 0, N - 1);
    to = Math.abs(y - stops[k].a) < L.pitch * NEAR ? stops[k].a : -1;
  }
  if (to < 0 || Math.abs(to - y) < 1) return;
  settling = true;
  window.scrollTo({ top: L.trackTop + to, behavior: 'smooth' });
}
const rest = () => {
  clearTimeout(settleTimer);
  if (!settling) settleTimer = setTimeout(settle, 130);
};
addEventListener('scroll', rest, { passive: true });
addEventListener('scrollend', () => ((settling = false), rest()));
addEventListener('wheel', () => (settling = false), { passive: true });
addEventListener('touchstart', () => ((touching = true), (settling = false), clearTimeout(settleTimer)), { passive: true });
for (const type of ['touchend', 'touchcancel']) addEventListener(type, (e) => ((touching = e.touches.length > 0), rest()), { passive: true });

let trip = null;
// Jumps the scroll to an entry and animates the stack straight from its current pose to the new one.
function travel(top) {
  const now = performance.now();
  const from = trip ? between(trip.from, trip.to, ease(clamp((now - trip.t0) / TRIP, 0, 1)), trip.f, {}) : pose(window.scrollY - L.trackTop, {});
  endTrip();
  const y = top - L.trackTop;
  const to = pose(y, {});
  trip = { from, to, f: to.e === 1 ? to.f : from.f, y, t0: now, anims: [] };
  if (driven) {
    const poses = [];
    for (let i = 0; i <= 24; i++) poses.push(between(from, to, ease(i / 24), trip.f, {}));
    const run = (node, at) => trip.anims.push(node.animate(poses.map((p) => ({ transform: at(p) })), { duration: TRIP, fill: 'forwards' }));
    for (const [node, at] of movers()) run(node, at);
  }
  window.scrollTo({ top, behavior: 'auto' });
  S.dirty = true;
}

function endTrip() {
  if (!trip) return;
  for (const a of trip.anims) a.cancel();
  trip = null;
  S.dirty = true;
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  const here = S.e < 0.5 ? -1 : clamp(Math.round(S.f), 0, N - 1);
  if (e.key === 'j' || e.key === 'ArrowRight') goTo(Math.min(N - 1, here + 1));
  else if (e.key === 'k' || e.key === 'ArrowLeft') goTo(here - 1);
});

function goToHash(instant) {
  const s = stops.find((x) => '#' + x.id === location.hash);
  if (s) goTo(s.k, instant);
}
addEventListener('hashchange', () => goToHash());

const LIVE = 0.7;
const alive = (k) => (S.e > 0.5 ? Math.abs(k - S.f) < LIVE : k === 0 && S.e < 0.3);

// Canvas housekeeping, one job per frame: paints layers that are near, frees ones that are far.
function tend(moved, began) {
  const here = clamp(Math.round(S.f), 0, N - 1);
  const free = !moved || driven;
  let did = false;
  for (let i = 0; i < 2 * N; i++) {
    const d = (i + 1) >> 1;
    const k = i & 1 ? here + d : here - d;
    if (k < 0 || k >= N) continue;
    const s = stops[k];
    const away = Math.abs(k - S.f);
    if (s.loS !== READY) {
      paintLo(s);
      did = true;
      if (performance.now() - began > (S.whole ? 7 : 100)) return true;
      continue;
    }
    if (did) continue;
    let job = null;
    if (away < 1.5 && s.hiS !== READY && (free || away < 1.2)) job = paintHi;
    else if (away < 2.6 && (s.bcS !== READY || (s.dirty && (!alive(k) || (away > 0.3 && S.t - s.bitT > 0.18)))) && (free || away < 1.9)) job = paintBits;
    if (job) {
      job(s);
      return true;
    }
    if (!moved) {
      if (s.hiS && away > 3.2) drop(s, 'hi');
      if (s.bcS && away > 3.6) drop(s, 'bc');
    }
  }
  return did;
}

const bill = new MessageChannel();
let billFrom = 0;
// Measures what a redraw really costs and lowers the redraw rate on slow machines.
bill.port1.onmessage = () => {
  if (!billFrom) return;
  S.cost += (Math.min(40, performance.now() - billFrom) - S.cost) * 0.12;
  billFrom = 0;
  if (S.pace === 1 && S.cost > 11.5) S.pace = 2;
  else if (S.pace === 2 && S.cost > 26) S.pace = 4;
  else if (S.pace === 4 && S.cost < 21) S.pace = 2;
  else if (S.pace === 2 && S.cost < 8.5) S.pace = 1;
};

// Moves a plate on by the time since it was last drawn; after a pause it resumes rather than catching up.
function advance(s) {
  tick(s, S.t - s.at < 0.25 ? S.t - s.at : 0.016);
  s.at = S.t;
  s.dirty = true;
}

let prev = performance.now();
// The frame loop: places the stack, redraws the live plate(s), then does one housekeeping job.
function frame(now) {
  const began = performance.now();
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  S.t += dt;

  if (window.devicePixelRatio !== L.dpr) layout();
  if (driven && proven < 3) prove();
  const moved = dress();
  if (!S.shown) {
    S.shown = now;
    root.classList.add('go');
  } else if (!S.whole && stops.every((s) => s.loS === READY)) {
    S.whole = true;
  } else if (!S.staged && now - S.shown > 400 && S.whole) {
    S.staged = true;
    $('#sketch')?.remove();
    choreograph();
    S.dirty = true;
  }

  let drew = false;
  const due = now - S.drawn;
  const calm = mqCalm.matches;
  if (!calm && S.e > 0.5) {
    const a = clamp(Math.floor(S.f), 0, N - 1);
    const b = Math.min(a + 1, N - 1);
    const la = alive(a) && stops[a].hiS === READY;
    const lb = b !== a && alive(b) && stops[b].hiS === READY;
    const two = la && lb;
    if ((la || lb) && due >= (moved ? (two ? 30 : 46) : (14 * S.pace) / (two ? 2 : 1))) {
      const s = two ? (stops[a].at <= stops[b].at ? stops[a] : stops[b]) : stops[la ? a : b];
      advance(s);
      paintHi(s);
      S.drawn = now;
      drew = !two;
    }
  } else if (!calm && S.e < 0.3 && stops[0].loS === READY && due >= (moved ? 46 : 30 * S.pace)) {
    const s = stops[0];
    advance(s);
    paintLo(s);
    if (S.e > 0.02 && s.hiS === READY) paintHi(s);
    S.drawn = now;
  }

  const busy = moved < 2 && tend(moved, began);
  if (busy) S.dirty = true;
  if (drew && !busy && !moved && !billFrom) {
    billFrom = began;
    bill.port2.postMessage(0);
  }

  if (!moved && !S.still) seat();
  S.still = !moved;

  requestAnimationFrame(frame);
}

function start() {
  const theme = readTheme();
  pen = new Pen(theme);
  bits = new Bits(theme);
  buildLayers();
  buildLabels();
  listen();
  layout();
  new ResizeObserver(layout).observe(view);
  addEventListener('resize', layout);
  mqDesk.addEventListener('change', layout);

  const faces = ['500 12px "JetBrains Mono"', '500 12px Inter'];
  if (document.fonts && !faces.every((f) => document.fonts.check(f))) {
    const loaded = Promise.all(faces.map((f) => document.fonts.load(f))).catch(() => {});
    loaded.then(() => {
      bits.cell(L.cw, L.ch, true);
      for (const s of stops) {
        if (s.hiS) s.hiS = STALE;
        if (s.bcS) s.bcS = STALE;
      }
      sig = '';
      layout();
    });
  }

  goToHash(true);
  requestAnimationFrame((t) => {
    prev = t;
    frame(t);
  });

  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const scratch = document.createElement('canvas');
  const sctx = scratch.getContext('2d', CPU);
  let i = 0;
  const warm = () => {
    if (i >= N) {
      scratch.width = scratch.height = 0;
      return;
    }
    const s = stops[i++];
    size(scratch, sctx, Math.round(L.w * L.res), Math.round(L.h * L.res));
    paint(s, sctx, L.res, false);
    if (!s.cells) sample(s);
    idle(warm);
  };
  idle(warm);
}

if (document.hidden || performance.getEntriesByType('paint').length) start();
else requestAnimationFrame(() => setTimeout(start, 0));
