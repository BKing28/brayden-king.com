import { clamp01, smooth, outBack } from './util.js';

const BASE = -4.15;
const HOOP = { x: 0, z: -3.25, y: 2.0, r: 0.3 };
const BOARD = -3.68;
const ARC = 4.2;
const KEY = { half: 1.15, to: -0.95 };
const HAND = 0.95;
const PLAYS = [
  { a: -0.84, lift: 1.3 },
  { a: 0.6, lift: 1.45 },
  { a: 0.06, lift: 1.25, rare: true },
].map((p) => ({ ...p, spot: { x: HOOP.x + Math.sin(p.a) * (ARC + 0.3), z: HOOP.z + Math.cos(p.a) * (ARC + 0.3) } }));

const SLOTS = 4;
const SLOT = (i) => -2.85 + i * 1.15;
const SHELF = 3.3;
const CUBE = 0.62;
const MINT = { x: 0.6, z: 1.55, y: 0.95 };

const SET = 0.55;
const FLY = 1.35;
const DROP = 0.4;
const BOXED = 0.75;
const SHRINK = 1.0;
const PLACE = 0.7;
const REST = 1.5;
const T1 = SET;
const T2 = T1 + FLY;
const T3 = T2 + DROP;
const T4 = T3 + BOXED;
const T5 = T4 + SHRINK;
const T6 = T5 + PLACE;
const PERIOD = T6 + REST;

let plays = 0;
const mint = () => PLAYS[plays++ % PLAYS.length];
const held = [mint(), mint()];
let play = mint();
let since = 4.4;
const P = [0, 0, 0];

const LOOK = (m, fresh) => (m.rare ? { top: 'deep', left: 'tint2', right: 'tint2', stroke: 'deep', w: 1 } : { top: fresh ? 'tint2' : 'paper', left: 'paper', right: 'tint', w: 1 });

function wire(g, cx, cz, len, wid, turn, y0, y1, c, dash) {
  const ex = (Math.cos(turn) * len) / 2;
  const ez = (Math.sin(turn) * len) / 2;
  const nx = (-Math.sin(turn) * wid) / 2;
  const nz = (Math.cos(turn) * wid) / 2;
  const at = [
    [cx - ex - nx, cz - ez - nz],
    [cx + ex - nx, cz + ez - nz],
    [cx + ex + nx, cz + ez + nz],
    [cx - ex + nx, cz - ez + nz],
  ];
  g.begin();
  for (const y of [y0, y1]) {
    at.forEach(([x, z], i) => (i ? g.l(x, y, z) : g.m(x, y, z)));
    g.z();
  }
  for (const [x, z] of at) g.m(x, y0, z).l(x, y1, z);
  g.stroke(c, 1, dash);
}

const LOGO = {"letters":[[1.212,0.193,1.021,0.193,0.771,1.0,0.561,1.0,0.807,0.193,0.609,0.193,0.666,0.003,1.271,0.003],[1.358,0.003,1.971,0.003,1.646,1.0,1.044,1.0],[1.314,0.811,1.498,0.811,1.697,0.192,1.511,0.192],[1.947,1.0,1.738,1.0,2.019,0.144,2.219,0.003,2.654,0.003,2.402,0.747,2.031,0.747],[2.256,0.556,2.378,0.193,2.215,0.193,2.094,0.556],[3.078,1.0,2.53,1.0,2.636,0.69,2.846,0.69,2.804,0.811,2.934,0.811,2.99,0.652,2.742,0.402,2.879,0.003,3.424,0.003,3.319,0.299,3.127,0.299,3.164,0.193,3.026,0.193,2.981,0.323,3.229,0.573],[3.588,0.412,3.769,0.412,3.918,0.003,4.131,0.003,3.765,1.0,3.556,1.0,3.701,0.601,3.52,0.601,3.377,1.0,3.168,1.0,3.522,0.003,3.735,0.003],[4.221,0.003,4.835,0.003,4.456,1.0,3.854,1.0],[4.134,0.811,4.319,0.811,4.551,0.192,4.365,0.192],[5.459,0.193,5.268,0.193,4.953,1.0,4.743,1.0,5.054,0.193,4.856,0.193,4.928,0.003,5.533,0.003]],"badge":[[0.337,0.0,0.103,0.0,0.087,0.001,0.071,0.005,0.056,0.011,0.043,0.02,0.03,0.03,0.02,0.043,0.011,0.056,0.005,0.071,0.001,0.087,0.0,0.103,0.0,0.896,0.001,0.912,0.005,0.928,0.011,0.943,0.02,0.956,0.03,0.969,0.043,0.979,0.056,0.988,0.071,0.994,0.087,0.998,0.103,0.999,0.337,0.999,0.353,0.998,0.369,0.994,0.384,0.988,0.398,0.979,0.41,0.969,0.421,0.957,0.43,0.943,0.436,0.928,0.44,0.912,0.441,0.896,0.441,0.103,0.44,0.087,0.436,0.071,0.43,0.056,0.421,0.043,0.411,0.03,0.398,0.02,0.384,0.011,0.369,0.005,0.354,0.001,0.337,0.0]],"figure":[[0.279,0.183,0.289,0.192,0.298,0.199,0.312,0.21,0.326,0.229,0.335,0.259,0.337,0.305,0.341,0.32,0.344,0.337,0.347,0.352,0.35,0.363,0.357,0.377,0.362,0.389,0.366,0.401,0.369,0.414,0.371,0.429,0.373,0.44,0.386,0.448,0.396,0.457,0.405,0.463,0.409,0.472,0.415,0.482,0.416,0.103,0.415,0.091,0.412,0.079,0.408,0.068,0.401,0.057,0.393,0.048,0.384,0.04,0.373,0.033,0.362,0.028,0.35,0.025,0.337,0.024,0.262,0.024,0.276,0.032,0.285,0.042,0.297,0.058,0.297,0.075,0.288,0.097,0.291,0.107,0.284,0.119,0.275,0.127,0.27,0.138,0.264,0.147,0.254,0.157,0.253,0.168,0.268,0.175,0.279,0.183],[0.416,0.538,0.401,0.562,0.377,0.578,0.348,0.582,0.32,0.576,0.298,0.558,0.284,0.533,0.281,0.505,0.289,0.477,0.308,0.456,0.334,0.443,0.327,0.426,0.318,0.408,0.309,0.391,0.304,0.379,0.299,0.362,0.293,0.335,0.288,0.307,0.285,0.288,0.269,0.296,0.259,0.303,0.25,0.316,0.242,0.336,0.235,0.355,0.231,0.365,0.236,0.377,0.247,0.393,0.253,0.414,0.261,0.441,0.267,0.465,0.27,0.476,0.277,0.529,0.282,0.564,0.285,0.59,0.29,0.609,0.298,0.626,0.304,0.637,0.309,0.647,0.316,0.661,0.322,0.684,0.328,0.715,0.333,0.744,0.336,0.758,0.344,0.769,0.349,0.778,0.354,0.794,0.35,0.816,0.347,0.83,0.348,0.843,0.351,0.861,0.355,0.875,0.357,0.885,0.363,0.91,0.368,0.933,0.366,0.955,0.349,0.974,0.361,0.971,0.371,0.967,0.381,0.962,0.39,0.955,0.398,0.947,0.404,0.938,0.41,0.928,0.413,0.918,0.416,0.907,0.416,0.896],[0.327,0.881,0.32,0.868,0.314,0.836,0.303,0.818,0.297,0.803,0.301,0.793,0.294,0.776,0.26,0.747,0.234,0.725,0.215,0.707,0.205,0.697,0.192,0.685,0.183,0.674,0.168,0.657,0.147,0.626,0.125,0.593,0.11,0.566,0.089,0.563,0.079,0.536,0.066,0.509,0.054,0.483,0.048,0.455,0.049,0.442,0.052,0.426,0.055,0.412,0.061,0.398,0.07,0.389,0.072,0.377,0.048,0.377,0.038,0.374,0.032,0.356,0.03,0.343,0.033,0.333,0.039,0.313,0.049,0.291,0.059,0.27,0.067,0.253,0.073,0.235,0.078,0.224,0.1,0.185,0.118,0.166,0.138,0.159,0.163,0.157,0.187,0.152,0.197,0.146,0.201,0.134,0.204,0.111,0.197,0.101,0.196,0.087,0.207,0.081,0.208,0.059,0.213,0.043,0.222,0.032,0.237,0.024,0.103,0.024,0.091,0.025,0.079,0.028,0.068,0.033,0.057,0.039,0.048,0.048,0.039,0.057,0.033,0.068,0.028,0.079,0.025,0.091,0.024,0.103,0.024,0.896,0.025,0.908,0.028,0.92,0.033,0.932,0.039,0.942,0.048,0.952,0.057,0.96,0.068,0.966,0.079,0.971,0.091,0.974,0.103,0.975,0.337,0.975,0.324,0.961,0.322,0.942,0.325,0.915,0.327,0.881]]};
const MARK = { x: 1.62, z: SHELF + 0.24, tall: 0.47 };
function mark(g) {
  const trace = (shapes) => {
    g.begin();
    for (const pts of shapes) {
      for (let i = 0; i < pts.length; i += 2) {
        const x = MARK.x + pts[i] * MARK.tall;
        const z = MARK.z - (1 - pts[i + 1]) * MARK.tall;
        if (i) g.l(x, 0.006, z);
        else g.m(x, 0.006, z);
      }
      g.z();
    }
  };
  trace(LOGO.badge);
  g.fill('paper').stroke('line', 1);
  trace(LOGO.figure);
  g.fill('line');
  trace(LOGO.letters);
  g.fill('line');
}

// NBA Top Shot: a three-pointer goes in, the play is boxed into a cube and shelved as a Moment.
export default {
  update(now) {
    if (now - since >= PERIOD) {
      since += PERIOD;
      held.push(play);
      if (held.length > SLOTS) held.shift();
      play = mint();
    }
  },

  draw(g, now) {
    const t = now - since;
    const s = play.spot;
    const fly = clamp01((t - T1) / FLY);
    const boxed = clamp01((t - T3) / BOXED);
    const shrink = smooth((t - T4) / SHRINK);
    const place = clamp01((t - T5) / PLACE);

    g.line(-4.6, 0.006, BASE, 4.6, 0.006, BASE, 'soft', 1);
    g.quad(-KEY.half, BASE, KEY.half, KEY.to, 0.006, 'tint', 'soft', 1);
    g.ring(0, KEY.to, KEY.half, 0.006, null, 'soft', 1, undefined, 0, Math.PI);
    g.ring(HOOP.x, HOOP.z, ARC, 0.006, null, 'line', 1, undefined, -0.215, Math.PI + 0.215);

    g.line(0, 0, BOARD - 0.45, 0, 2.3, BOARD - 0.45, 'line', 1.25);
    g.line(0, 2.3, BOARD - 0.45, 0, 2.3, BOARD, 'line', 1.25);
    g.wall('x', BOARD, -0.8, 0.8, 1.82, 2.92, 'paper', 'line', 1.25);
    g.wall('x', BOARD + 0.002, -0.27, 0.27, 2.0, 2.42, null, 'soft', 1);
    const made = t >= T2 && t < T3 + 0.25;
    g.ring(HOOP.x, HOOP.z, HOOP.r, HOOP.y, null, made ? 'deep' : 'line', made ? 1.75 : 1.25);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + 0.3;
      g.line(HOOP.x + Math.cos(a) * HOOP.r, HOOP.y, HOOP.z + Math.sin(a) * HOOP.r, HOOP.x + Math.cos(a) * HOOP.r * 0.6, HOOP.y - 0.42, HOOP.z + Math.sin(a) * HOOP.r * 0.6, 'soft', 1);
    }

    g.quad(SLOT(0) - 0.62, SHELF - 0.58, SLOT(SLOTS - 1) + 0.62, SHELF + 0.58, 0.006, null, 'soft', 1);
    mark(g);
    const full = held.length === SLOTS;
    const room = full ? smooth((t - T4) / 0.6) : 0;
    const dest = full ? SLOTS - 1 : held.length;
    held.forEach((m, i) => {
      g.A = clamp01(1 + (i - room) * 2.2);
      if (g.A > 0) g.box(SLOT(i - room), SHELF, CUBE, CUBE, CUBE, 0.01, LOOK(m));
    });
    g.A = 1;

    const quiet = 1 - smooth((t - T4) / 0.3);
    if (quiet > 0) {
      g.A = quiet * clamp01(t / 0.3);
      g.ring(s.x, s.z, 0.17 + 0.1 * (1 - smooth((t - T1) / 0.4)) * clamp01(t / SET), 0.01, 'tint2', 'line', 1);
      if (fly > 0) g.arc(s.x, HAND, s.z, HOOP.x, HOOP.y, HOOP.z, play.lift, 0, fly, 'deep', 1.6);
      if (t < T3) {
        if (fly < 1) g.hop(s.x, HAND, s.z, HOOP.x, HOOP.y, HOOP.z, play.lift, fly, P);
        else {
          P[0] = HOOP.x;
          P[1] = HOOP.y - 1.9 * smooth((t - T2) / DROP) * ((t - T2) / DROP);
          P[2] = HOOP.z;
        }
        if (t > T1 - 0.3) {
          g.line(P[0], 0.006, P[2], P[0], P[1], P[2], 'soft', 0.75, [1, 3]);
          g.dot(P[0], P[1], P[2], 3.6, 'paper', 'deep', 1.5);
        }
      }
      g.A = 1;
    }

    if (t >= T3) {
      const far = Math.hypot(HOOP.x - s.x, HOOP.z - s.z);
      const turn0 = Math.atan2(HOOP.z - s.z, HOOP.x - s.x);
      const turn1 = Math.round(turn0 / (Math.PI / 2)) * (Math.PI / 2);
      const tall = (HAND + HOOP.y) / 2 + play.lift + 0.22;
      let cx = MINT.x;
      let cy = MINT.y;
      let cz = MINT.z;
      if (place > 0) {
        g.hop(MINT.x, MINT.y, MINT.z, SLOT(dest), 0.01, SHELF, 0.5, smooth(place), P);
        cx = P[0];
        cy = P[1];
        cz = P[2];
      }
      const k = shrink;
      const sq = smooth(k / 0.7);
      const mx = (s.x + HOOP.x) / 2 + (cx - (s.x + HOOP.x) / 2) * k;
      const mz = (s.z + HOOP.z) / 2 + (cz - (s.z + HOOP.z) / 2) * k;
      const len = far + 0.8 + (CUBE - far - 0.8) * sq;
      const wid = 0.84 + (CUBE - 0.84) * sq;
      const turn = turn0 + (turn1 - turn0) * smooth(k / 0.5);
      const y0 = cy * k;
      const y1 = y0 + tall + (CUBE - tall) * sq;
      if (k > 0.6) {
        g.A = smooth((k - 0.6) / 0.25);
        const pop = place >= 1 ? 1 + 0.12 * (1 - outBack((t - T6) / 0.3)) : 1;
        g.box(mx, mz, len * pop, len * pop, y1 - y0, y0, LOOK(play, true));
        g.A = 1;
      }
      if (k < 1) {
        g.A = (1 - smooth((k - 0.7) / 0.25)) * smooth(boxed / 0.5);
        wire(g, mx, mz, len, wid, turn, y0, y1, 'line', boxed < 1 ? [3, 3] : undefined);
        const reach = ((far / 2) * len) / (far + 0.8);
        const up = (y1 - y0) / tall;
        g.arc(mx - Math.cos(turn) * reach, y0 + HAND * up, mz - Math.sin(turn) * reach, mx + Math.cos(turn) * reach, y0 + HOOP.y * up, mz + Math.sin(turn) * reach, play.lift * up, 0, 1, 'deep', 1.6);
        g.A = 1;
      }
    }
  },
};
