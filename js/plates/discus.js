import { clamp01 } from './util.js';

const M = 0.141;
const CX = -4.05;
const HALF = (34.92 / 2) * (Math.PI / 180);
const BEST = 53.89;
const HAND = 1.6;
const PEAK = 0.2;

const ROUND = [
  { d: 51.4, dir: 8 },
  { d: 48.9, dir: -9 },
  { d: BEST, dir: -2 },
];
const high = (r, u) => (HAND * (1 - u) + r.d * PEAK * 4 * Math.pow(u, 1.15) * (1 - Math.pow(u, 1.15))) * M;
const STEPS = 28;
const CAGE = { r: 0.74, tall: 0.78, from: Math.PI * 0.36, to: Math.PI * 1.64, bays: 6 };

const EACH = 6;

function land(r) {
  const a = (r.dir * Math.PI) / 180;
  return [CX + r.d * M * Math.cos(a), r.d * M * Math.sin(a)];
}

// Three discus throws from the cage into the sector; the best one is flagged.
export default {
  draw(g, t) {
    const cycle = EACH * ROUND.length + 3;
    const tt = t % cycle;
    const cur = Math.min(ROUND.length - 1, Math.floor(tt / EACH));
    const done = tt >= EACH * ROUND.length;

    const reach = 62 * M;
    for (const s of [-1, 1]) g.line(CX, 0.006, 0, CX + Math.cos(HALF) * reach, 0.006, s * Math.sin(HALF) * reach, 'line', 1.25);
    for (const d of [30, 40, 50, 60]) {
      g.ring(CX, 0, d * M, 0.006, null, 'soft', 1, d === 50 ? undefined : [2, 4], -HALF, HALF);
      g.text(String(d), CX + Math.cos(HALF) * d * M, 0, Math.sin(HALF) * d * M + 0.32, { s: 8.5, c: 'ink3' });
    }
    g.ring(CX, 0, 0.34, 0.008, 'paper', 'line', 1.25);
    g.ring(CX, 0, CAGE.r, 0.006, null, 'soft', 1, undefined, CAGE.from, CAGE.to);
    for (const y of [CAGE.tall / 3, (CAGE.tall * 2) / 3]) g.ring(CX, 0, CAGE.r, y, null, 'soft', 0.75, undefined, CAGE.from, CAGE.to);
    for (let i = 0; i <= CAGE.bays * 2; i++) {
      const a = CAGE.from + ((CAGE.to - CAGE.from) * i) / (CAGE.bays * 2);
      const x = CX + Math.cos(a) * CAGE.r;
      const z = Math.sin(a) * CAGE.r;
      if (i % 2) g.line(x, 0.006, z, x, CAGE.tall, z, 'soft', 0.75);
      else g.line(x, 0, z, x, CAGE.tall, z, 'line', 1.25);
    }
    g.ring(CX, 0, CAGE.r, CAGE.tall, null, 'line', 1.25, undefined, CAGE.from, CAGE.to);

    for (let i = 0; i < ROUND.length; i++) {
      const r = ROUND[i];
      const landed = done || i < cur || (i === cur && (tt - i * EACH) / EACH > 0.62);
      if (!landed) continue;
      const [x, z] = land(r);
      if (r.d === BEST) {
        g.line(x, 0, z, x, 0.95, z, 'deep', 1.25);
        g.poly([x, 0.95, z, x + 0.36, 0.82, z, x, 0.69, z], 'deep');
      } else g.dot(x, 0.008, z, 2.2, 'paper', 'line', 1.25);
    }

    if (!done) {
      const r = ROUND[cur];
      const k = clamp01(((tt - cur * EACH) / EACH - 0.12) / 0.5);
      if (k > 0) {
        const a = (r.dir * Math.PI) / 180;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        g.A = k < 1 ? 1 : clamp01(1 - ((tt - cur * EACH) / EACH - 0.62) / 0.3);
        g.begin().m(CX, HAND * M, 0);
        for (let i = 1; i <= STEPS; i++) {
          const u = (k * i) / STEPS;
          g.l(CX + r.d * M * u * ca, high(r, u), r.d * M * u * sa);
        }
        g.stroke('line', 1.25);
        if (k < 1) {
          const x = CX + r.d * M * k * ca;
          const z = r.d * M * k * sa;
          const y = high(r, k);
          g.line(x, 0.006, z, x, y, z, 'soft', 0.75, [1, 3]);
          g.ring(x, z, 0.09, 0.008, 'soft');
          g.ring(x, z, 0.13, y, 'deep', 'deep', 1);
        }
        g.A = 1;
      }
    }
  },
};
