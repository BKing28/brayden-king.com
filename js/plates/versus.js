import { clamp01, outCubic, money, TAU, FLIGHT } from './util.js';

const PED = { x: -1.55, z: -1.55 };
const UNIQUE = { x: -2.25, z: 1.65, out: Math.PI * 0.75 };
const EDITIONS = { x: 1.65, z: -2.25, out: -Math.PI * 0.25 };
const WIDE = 1.3;
const FULL = 1.9;
const N = 5;
const ORDER = [2, 0, 4, 1, 3];
const DUR = 10.5;
const HOLD = 2.6;
const AUCTIONS = [
  { close: 38200, to: 'editions' },
  { close: 61600, to: 'unique' },
  { close: 94000, to: 'editions' },
];
const H = [0, 0, 0];

const ring = (s, n, i, spread, r) => {
  const a = s.out + (i - (n - 1) / 2) * spread;
  return { x: s.x + Math.cos(a) * r, z: s.z + Math.sin(a) * r, at: -9 };
};
const BIG = [0, 1].map((i) => ring(UNIQUE, 2, i, 0.62, 1.62));
const SMALL = ORDER.map((_, i) => ring(EDITIONS, N, i, 0.4, 1.68));

const amount = () => ({ v: 0, was: 0, at: -9 });
const raise = (a, v, t) => {
  a.was = a.v;
  a.v = v;
  a.at = t;
};
const shown = (a, t) => a.was + (a.v - a.was) * outCubic((t - a.at - FLIGHT) / 0.3);

const unique = amount();
const editions = ORDER.map(amount);
const sum = () => editions.reduce((n, e) => n + e.v, 0);

let round = -1;
const A = { t0: 0, n: 0, k: 0, lead: '', was: '', last: null, close: 0, open: 0, to: '' };

function reset(t) {
  round++;
  const a = AUCTIONS[round % AUCTIONS.length];
  A.t0 = t;
  A.close = a.close;
  A.open = a.close / 4;
  A.to = a.to;
  A.n = a.to === 'unique' ? 11 : 10;
  A.k = 0;
  A.lead = A.was = '';
  A.last = null;
  raise(unique, 0, -9);
  unique.was = 0;
  for (const e of editions) {
    raise(e, A.open / N, -9);
    e.was = e.v;
  }
}

const when = (k) => 0.5 + (DUR - 0.9) * (1 - Math.pow(1 - k / (A.n - 1), 1.3));

function bid(t) {
  const k = A.k++;
  const to = k === A.n - 1 ? A.close : Math.round((A.open + (A.close - A.open) * Math.pow((k + 1) / A.n, 0.8)) / 100) * 100;
  if (k % 2 === 0) {
    raise(unique, to, t);
    A.last = BIG[(k / 2) % 2];
    A.was = A.lead;
    A.lead = 'unique';
  } else {
    const j = ORDER[((k - 1) / 2) % N];
    raise(editions[j], editions[j].v + to - sum(), t);
    A.last = SMALL[j];
    A.was = A.lead;
    A.lead = 'editions';
  }
  A.last.at = t;
}

// A Versus auction: the highest bid on the 1/1 against the sum of the bids on the editions.
export default {
  update(t) {
    if (round < 0 || t - A.t0 > DUR + HOLD) reset(t);
    while (A.k < A.n && t - A.t0 >= when(A.k)) bid(t);
  },

  draw(g, t) {
    const el = clamp01((t - A.t0) / DUR);
    const sold = el >= 1;
    const scale = FULL / A.close;

    g.ring(PED.x, PED.z, 1.0, 0.008, null, 'soft', 1);
    if (!sold) g.ring(PED.x, PED.z, 1.0, 0.01, null, 'deep', 1.75, undefined, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - el));
    g.box(PED.x, PED.z, 0.8, 0.8, 0.5, 0, { top: 'tint', left: 'paper', right: 'tint' });
    {
      const a = t * 0.9;
      const y = 1.22 + Math.sin(t * 1.7) * 0.05;
      const r = 0.3;
      const eq = [];
      for (let i = 0; i < 4; i++) eq.push([PED.x + Math.cos(a + (i * TAU) / 4) * r, PED.z + Math.sin(a + (i * TAU) / 4) * r]);
      for (let i = 0; i < 4; i++) {
        const [x0, z0] = eq[i];
        const [x1, z1] = eq[(i + 1) % 4];
        g.line(x0, y, z0, x1, y, z1, 'deep', 1.25);
        g.line(x0, y, z0, PED.x, y + 0.42, PED.z, 'deep', 1.25);
        g.line(x0, y, z0, PED.x, y - 0.42, PED.z, 'deep', 1.25);
      }
    }

    for (const m of BIG) g.ring(m.x, m.z, 0.2 + (1 - clamp01((t - m.at) / 0.5)) * 0.1, 0.008, t - m.at < 0.5 ? 'deep' : 'paper', 'line', 1);
    for (const m of SMALL) g.ring(m.x, m.z, 0.1 + (1 - clamp01((t - m.at) / 0.5)) * 0.08, 0.008, t - m.at < 0.5 ? 'deep' : 'paper', 'line', 1);

    const lead = A.last && t - A.last.at < FLIGHT ? A.was : A.lead;
    const first = lead === 'unique';
    const tall = shown(unique, t) * scale;
    if (tall > 0.004) g.box(UNIQUE.x, UNIQUE.z, WIDE, WIDE, tall, 0, { top: first ? 'deep' : 'paper', left: 'paper', right: 'tint', stroke: first ? 'deep' : 'line', w: 1 });
    else g.quad(UNIQUE.x - WIDE / 2, UNIQUE.z - WIDE / 2, UNIQUE.x + WIDE / 2, UNIQUE.z + WIDE / 2, 0.008, null, 'soft', 1, [2, 3]);

    let y = 0;
    let lands = 0;
    editions.forEach((e, j) => {
      const h = shown(e, t) * scale;
      const fresh = t - e.at < 0.9;
      const top = j === N - 1 && lead === 'editions';
      g.box(EDITIONS.x, EDITIONS.z, WIDE, WIDE, h - 0.012, y, { top: top ? 'deep' : 'paper', left: fresh ? 'tint2' : 'paper', right: fresh ? 'tint2' : 'tint', stroke: top || fresh ? 'deep' : 'line', w: 1 });
      if (SMALL[j] === A.last) lands = y + h / 2;
      y += h;
    });

    const m = A.last;
    if (m && t - m.at < FLIGHT) {
      const big = A.lead === 'unique';
      const s = big ? UNIQUE : EDITIONS;
      g.hop(m.x, 0.02, m.z, s.x, big ? tall : lands, s.z, 1.1, (t - m.at) / FLIGHT, H);
      g.chip(H[0], H[1], H[2], big ? 3.2 : 2.4, 'deep');
    }

    [
      [UNIQUE, tall, shown(unique, t), first],
      [EDITIONS, y, editions.reduce((n, e) => n + shown(e, t), 0), lead === 'editions'],
    ].forEach(([s, top, total, leading]) => {
      if (sold && leading) {
        g.line(s.x, top, s.z, s.x, top + 1.25, s.z, 'deep', 1.25);
        g.poly([s.x, top + 1.25, s.z, s.x + 0.42, top + 1.1, s.z, s.x, top + 0.95, s.z], 'deep');
      } else if (total > 0) g.text(money(Math.round(total / 100) * 100), s.x, top + 0.95, s.z, { s: 10, c: leading ? 'deep' : 'ink3', wt: leading ? 500 : 400 });
    });
  },
};
