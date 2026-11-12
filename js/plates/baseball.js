import { clamp01 } from './util.js';

const D = 16.76;
const RELEASE = [1.83, 0.5];

const X0 = -3.75;
const SX = 7.85 / D;
const SY = 1.5;
const SZ = 1.5;
const PLATE_X = X0 + D * SX;

const PITCHES = [
  { name: 'SI', mph: 94, real: [1.365, 0.149, 0.6, 0.1] },
  { name: 'SL', mph: 86, real: [1.521, 0.295, 0.62, -0.14] },
  { name: 'FF', mph: 95, real: [1.439, 0.175, 0.94, -0.04] },
];

const P = [0, 0, 0];
function at(c, u, ground) {
  const through = (a, m, e) => a + (e - a) * u + (m - (a + e) / 2) * 4 * u * (1 - u);
  P[0] = X0 + D * u * SX;
  P[1] = ground ? 0.006 : through(RELEASE[0], c[0], c[2]) * SY;
  P[2] = through(RELEASE[1], c[1], c[3]) * SZ;
  return P;
}

const PERIOD = 3.6;

const STEPS = 24;
function trace(g, c, upTo, ground, col, w) {
  g.begin();
  for (let i = 0; i <= STEPS; i++) {
    at(c, (upTo * i) / STEPS, ground);
    if (i) g.l(P[0], P[1], P[2]);
    else g.m(P[0], P[1], P[2]);
  }
  g.stroke(col, w);
}

// Three pitches from one release point, each drawn along its tracked path into the strike zone.
export default {
  draw(g, t) {
    const p = PITCHES[Math.floor(t / PERIOD) % PITCHES.length];
    const ph = (t % PERIOD) / PERIOD;
    const k = clamp01((ph - 0.05) / 0.3);
    const hold = clamp01((0.97 - ph) / 0.06);

    const RUB = X0 - 1.7 * SX;
    g.ring(RUB + 0.25, 0, 0.72, 0.006, 'tint', 'line', 1);
    g.quad(RUB - 0.04, -0.3, RUB + 0.04, 0.3, 0.01, 'paper', 'line', 1);
    g.poly([PLATE_X, 0.008, -0.325, PLATE_X, 0.008, 0.325, PLATE_X + 0.12, 0.008, 0.325, PLATE_X + 0.26, 0.008, 0, PLATE_X + 0.12, 0.008, -0.325], 'paper', 'line', 1.25);
    g.quad(PLATE_X - 0.25, 0.5, PLATE_X + 0.5, 1.15, 0.006, null, 'soft', 1);
    g.quad(PLATE_X - 0.25, -1.15, PLATE_X + 0.5, -0.5, 0.006, null, 'soft', 1);

    g.A = hold;
    trace(g, p.real, k, true, 'soft', 1);
    trace(g, p.real, k, false, 'deep', 1.6);

    if (k < 1) {
      const [bx, by, bz] = at(p.real, k);
      g.ring(bx, bz, 0.07, 0.008, 'soft');
      g.dot(bx, by, bz, 3.4, 'paper', 'deep', 1.5);
    }
    g.A = 1;

    const zy0 = 0.48 * SY;
    const zy1 = 1.05 * SY;
    const zw = 0.216 * SZ;
    g.wall('z', PLATE_X, -zw, zw, zy0, zy1, null, 'line', 1.25);
    for (let i = 1; i < 3; i++) {
      const y = zy0 + ((zy1 - zy0) * i) / 3;
      const z = -zw + (2 * zw * i) / 3;
      g.line(PLATE_X, y, -zw, PLATE_X, y, zw, 'soft', 0.75);
      g.line(PLATE_X, zy0, z, PLATE_X, zy1, z, 'soft', 0.75);
    }

    if (k >= 1) {
      g.A = hold;
      g.dot(PLATE_X, p.real[2] * SY, p.real[3] * SZ, 3, 'deep');
      g.A = 1;
    }

    g.line(X0, 0.006, RELEASE[1] * SZ, X0, RELEASE[0] * SY, RELEASE[1] * SZ, 'soft', 1);
    g.dot(X0, RELEASE[0] * SY, RELEASE[1] * SZ, 2.2, 'paper', 'deep', 1.25);
    g.text(`${p.name} ${p.mph}`, X0, RELEASE[0] * SY, RELEASE[1] * SZ, { s: 10, c: 'deep', dy: -14 });
  },
};
