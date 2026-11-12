import { clamp01, smooth } from './util.js';

const HOUSES = [-2.75, -0.15, 2.45].map((x, i) => ({ x, draws: [0.56, 0.84, 0.34][i] }));
const CHARGED = 0.93;
const Z = -0.75;
const W = 1.5;
const D = 1.4;
const WALL = 0.9;
const ROOF = 0.75;
const BUS = 1.5;
const POLE = -4.3;
const CAB = { w: 0.3, d: 0.6, h: 0.82 };
const UP = 10.5;
const DOWN = 6.5;
const SW = [POLE + 0.5, POLE + 1.25];
const END = 2.45 + W / 2 + CAB.w / 2 + 0.02;
const P = [0, 0, 0];

const dropX = (h) => h.x + W / 2 + CAB.w / 2 + 0.02;
const dropZ = Z + D / 2 - CAB.d / 2 - 0.08;

function along(h, d, out) {
  const run = dropX(h) - POLE;
  if (d <= run) {
    out[0] = POLE + d;
    out[1] = BUS;
  } else {
    out[0] = dropX(h);
    out[1] = BUS - (d - run);
  }
  return out;
}

// A street of houses with batteries: they charge while the grid is up and carry the houses when it drops.
export default {
  draw(g, t) {
    const ph = t % (UP + DOWN);
    const up = ph < UP;
    const level = (h) => CHARGED - h.draws * (up ? 1 - Math.min(1, ph / (UP * 0.85)) : (ph - UP) / DOWN);
    const fade = up ? smooth((ph - 0.5) / 0.6) : 1 - smooth((ph - UP) / 0.4);
    const open = up ? 1 - smooth(ph / 0.45) : smooth((ph - UP) / 0.45);
    const far = SW[1] + (END - SW[1]) * smooth((ph - (up ? 0.3 : UP + 0.3)) / 0.8);
    const live = up ? [SW[1], far] : [far, END];

    g.line(POLE, 0, BUS, POLE, 2.0, BUS, 'line', 1.25);
    for (const y of [1.94, 1.6]) g.line(POLE, y, BUS - 0.38, POLE, y, BUS + 0.38, 'line', 1.25);
    g.line(POLE, 0.006, BUS, SW[0], 0.006, BUS, 'line', 1.25);
    if (live[0] > SW[1]) g.line(SW[1], 0.006, BUS, live[0], 0.006, BUS, 'soft', 1.25, [2, 4]);
    if (live[1] > live[0]) g.line(live[0], 0.006, BUS, live[1], 0.006, BUS, 'line', 1.25);
    if (live[1] < END) g.line(live[1], 0.006, BUS, END, 0.006, BUS, 'soft', 1.25, [2, 4]);
    for (const h of HOUSES) g.line(dropX(h), 0.006, BUS, dropX(h), 0.006, dropZ + CAB.d / 2, 'soft', 1);
    {
      const a = open * 0.85;
      const len = SW[1] - SW[0];
      g.line(SW[1], 0.006, BUS, SW[1] - Math.cos(a) * len, 0.006 + Math.sin(a) * len, BUS, open > 0.02 ? 'deep' : 'line', open > 0.02 ? 1.6 : 1.25);
      g.dot(SW[0], 0.006, BUS, 2, 'paper', 'line', 1.25);
      g.dot(SW[1], 0.006, BUS, 2, 'paper', 'line', 1.25);
    }

    HOUSES.forEach((h, i) => {
      const x0 = h.x - W / 2;
      const x1 = h.x + W / 2;
      const z0 = Z - D / 2;
      const z1 = Z + D / 2;
      g.box(h.x, Z, W, D, WALL, 0, { top: null, left: 'paper', right: 'tint' });
      g.poly([x1, WALL, z0, x1, WALL, z1, x1, WALL + ROOF, Z], 'tint', 'line', 1.25);
      g.poly([x0, WALL, z1, x1, WALL, z1, x1, WALL + ROOF, Z, x0, WALL + ROOF, Z], 'paper', 'line', 1.25);
      g.wall('x', z1 + 0.002, h.x + 0.16, h.x + 0.48, 0, 0.54, 'paper', 'line', 1);
      const dip = up ? 0 : Math.sin(Math.PI * clamp01((ph - UP - 0.25 - i * 0.07) / 0.45));
      g.wall('x', z1 + 0.002, x0 + 0.2, x0 + 0.58, 0.34, 0.66, 'paper', 'line', 1);
      g.A = 1 - 0.8 * dip;
      g.wall('x', z1 + 0.002, x0 + 0.2, x0 + 0.58, 0.34, 0.66, 'tint2', 'line', 1);
      g.A = 1;

      const bx = dropX(h);
      const full = CAB.h;
      g.box(bx, dropZ, CAB.w, CAB.d, full * level(h), 0, { top: 'line', left: 'tint2', right: 'tint2', stroke: 'line', w: 1 });
      g.box(bx, dropZ, CAB.w, CAB.d, full, 0, { top: null, left: null, right: null, stroke: 'line', w: 1 });

      if (up) {
        const k = (t * 0.2 + i * 0.25) % 1;
        const far = dropX(h) - POLE + (BUS - dropZ - CAB.d / 2);
        along(h, k * far, P);
        g.A = fade * clamp01(k * 8) * clamp01((1 - k) * 8);
        g.chip(P[0], 0.03, P[1], 2.4, 'deep');
        g.A = 1;
      } else {
        const k = (t * 0.55 + i * 0.31) % 1;
        g.hop(bx, full * level(h), dropZ, h.x + 0.15, WALL + ROOF * 0.5, Z + D * 0.25, 0.6, k, P);
        g.A = (1 - fade) * clamp01(k * 6) * clamp01((1 - k) * 6);
        g.chip(P[0], P[1], P[2], 2.2, 'deep', null, 1, true);
        g.A = 1;
      }
    });
  },
};
