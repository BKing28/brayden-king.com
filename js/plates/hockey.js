import { clamp01, smooth } from './util.js';

const END = -4.0;
const OPEN = 3.95;
const W = 2.7;
const R = 1.45;
const GOAL = END + 0.95;
const BLUE = 2.5;

const BOARDS = [[OPEN, W]];
{
  const corner = (cx, cz, a0, a1) => {
    for (let i = 0; i <= 12; i++) {
      const a = a0 + ((a1 - a0) * i) / 12;
      BOARDS.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]);
    }
  };
  corner(END + R, W - R, Math.PI / 2, Math.PI);
  corner(END + R, -W + R, Math.PI, Math.PI * 1.5);
  BOARDS.push([OPEN, -W]);
}
const LEN = [0];
for (let i = 1; i < BOARDS.length; i++) LEN.push(LEN[i - 1] + Math.hypot(BOARDS[i][0] - BOARDS[i - 1][0], BOARDS[i][1] - BOARDS[i - 1][1]));

function along(s, inset, out) {
  let i = 1;
  while (i < LEN.length - 1 && LEN[i] < s) i++;
  const k = clamp01((s - LEN[i - 1]) / (LEN[i] - LEN[i - 1] || 1));
  const x = BOARDS[i - 1][0] + (BOARDS[i][0] - BOARDS[i - 1][0]) * k;
  const z = BOARDS[i - 1][1] + (BOARDS[i][1] - BOARDS[i - 1][1]) * k;
  const d = Math.hypot(x + 1, z) || 1;
  out[0] = x - ((x + 1) / d) * inset;
  out[1] = z - (z / d) * inset;
  return out;
}

const WING = { x: BLUE - 0.28, z: -W + 0.32 };
const MATES = [
  [END + 1.95, -0.3],
  [0.2, 0.35],
  [1.55, W - 0.5],
];
const THEM = [
  [3.25, 0.95],
  [3.6, -0.7],
  [3.05, 2.05],
];
const FROM = LEN[1] + R * (Math.PI / 2) * 0.3;
const TO = LEN[LEN.length - 2] + (WING.x - (END + R));
const ME = along(FROM - 0.12, 0.44, [0, 0]);
const ride = (s) => 0.09 + 0.15 * (1 - smooth((s - FROM) / 1.1));

const PERIOD = 9.5;
const P = [0, 0];

// A defenseman rims the puck round the boards to a winger at the blue line.
export default {
  draw(g, t) {
    const ph = (t % PERIOD) / PERIOD;

    g.begin();
    BOARDS.forEach(([x, z], i) => (i ? g.l(x, 0.006, z) : g.m(x, 0.006, z)));
    g.fill('paper');
    g.stroke('line', 1.5);
    g.line(OPEN, 0.006, -W, OPEN, 0.006, W, 'soft', 1, [2, 5]);
    g.line(BLUE, 0.007, -W, BLUE, 0.007, W, 'line', 1.75);
    g.line(GOAL, 0.007, -W + 0.3, GOAL, 0.007, W - 0.3, 'soft', 1);
    g.ring(GOAL, 0, 0.55, 0.008, 'tint', 'line', 1, undefined, -Math.PI / 2, Math.PI / 2);
    g.quad(GOAL - 0.36, -0.3, GOAL, 0.3, 0.008, 'paper', 'line', 1.25);
    for (const z of [-1.4, 1.4]) {
      g.ring(END + 2.35, z, 0.8, 0.007, null, 'soft', 1);
      g.dot(END + 2.35, 0.007, z, 1.8, 'soft');
    }
    for (const z of [-1.4, 1.4]) g.dot(BLUE + 0.5, 0.007, z, 1.6, 'soft');

    const drift = Math.sin(t * 0.3) * 0.22;
    THEM.forEach(([x, z], i) => g.ring(x + drift * (i - 1), z + drift * 0.5, 0.15, 0.01, 'paper', 'ink3', 1));
    for (const [x, z] of MATES) g.ring(x, z, 0.15, 0.01, 'tint2', 'line', 1);

    const go = clamp01((ph - 0.14) / 0.5);
    const fade = Math.min(clamp01(ph / 0.04), clamp01((0.86 - ph) / 0.08));
    const reach = FROM + (TO - FROM) * (1 - Math.pow(1 - go, 1.9));
    if (go > 0) {
      g.begin();
      const n = Math.max(2, Math.ceil(go * 70));
      for (let i = 0; i <= n; i++) {
        const at = FROM + ((reach - FROM) * i) / n;
        const q = along(at, ride(at), P);
        if (i) g.l(q[0], 0.009, q[1]);
        else g.m(q[0], 0.009, q[1]);
      }
      g.A = fade;
      g.stroke('deep', 1.25, [3, 3]);
      g.A = 1;
    }
    const got = ph > 0.64 && fade > 0;
    g.ring(WING.x, WING.z, 0.15 + (got ? 0.12 * (1 - smooth((ph - 0.64) / 0.2)) : 0), 0.01, 'tint2', got ? 'deep' : 'line', 1);

    along(reach, ride(reach), P);
    g.A = fade;
    g.ring(P[0], P[1], 0.075, 0.011, 'ink');
    g.A = 1;

    g.ring(ME[0], ME[1], 0.17, 0.012, 'deep', 'deep', 1);
  },
};
