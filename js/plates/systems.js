import { clamp01, smooth, BEAT } from './util.js';

const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const PACE = BEAT * 1.1;
const STEP = 1.7;
const X = STAGES.map((_, i) => (i - 2) * STEP);
const PAD = { half: 0.6, deep: 0.78 };
const SIDE = 0.62;
const TALL = 0.46;
const HOP = 0.55;
const MOVE = 0.5;

const LOOP = [
  { op: 'lw' },
  { op: 'add', waits: true },
  { op: 'addi' },
  { op: 'lw' },
  { op: 'nand' },
  { op: 'sw' },
  { op: 'jalr' },
  { op: 'addi' },
  { op: 'beq', taken: true },
  { op: 'add' },
  { op: 'sw' },
];

const slots = [null, null, null, null, null];
let leaving = null;
let pc = 0;
let since = 0;
let turned = false;

const fetch = () => {
  const inst = { ...LOOP[pc], from: -1 };
  pc = (pc + 1) % LOOP.length;
  return inst;
};
const bubble = (from, was) => ({ bubble: true, from, was });
const on = (s, from) => s && (s.bubble ? bubble(from) : { ...s, from });

function tick() {
  const [f, d, x, m] = slots;
  leaving = slots[4];
  slots[4] = on(m, 3);
  slots[3] = on(x, 2);
  turned = !!(x && x.taken);
  if (turned) {
    slots[2] = bubble(1, true);
    slots[1] = bubble(0, true);
    pc = 0;
    slots[0] = fetch();
  } else if (d && d.waits) {
    slots[2] = bubble(2);
    slots[1] = { ...d, waits: false, from: 1 };
    slots[0] = on(f, 0);
  } else {
    slots[2] = on(d, 1);
    slots[1] = on(f, 0);
    slots[0] = fetch();
  }
}
for (let i = 0; i < 6; i++) tick();

const PLAIN = { top: 'paper', left: 'paper', right: 'tint', w: 1 };
const WORKING = { top: 'deep', left: 'paper', right: 'tint2', stroke: 'deep', w: 1 };
const GONE = { top: 'faultTint', left: 'faultTint', right: 'faultTint', stroke: 'fault', w: 1 };
const EMPTY = { top: null, left: null, right: null, stroke: 'soft', w: 1, dash: [2, 3] };

// A five-stage pipeline running a loop, with a load-use stall and a taken branch that flushes two instructions.
export default {
  update(_t, dt) {
    since += dt;
    while (since >= PACE) {
      since -= PACE;
      tick();
    }
  },

  draw(g) {
    const ph = since / PACE;
    const k = smooth(ph / MOVE);
    const doomed = slots[2] && slots[2].taken ? smooth((ph - 0.62) / 0.2) : 0;

    g.line(X[0] - STEP * 0.8, 0.004, 0, X[4] + STEP * 0.8, 0.004, 0, 'soft', 1, [2, 4]);
    STAGES.forEach((name, i) => {
      g.quad(X[i] - PAD.half, -PAD.deep, X[i] + PAD.half, PAD.deep, 0.006, 'paper', 'line', 1.25);
      g.flat(name, X[i] - PAD.half + 0.04, PAD.deep + 0.36, { s: 0.27, c: 'ink3' });
    });

    for (let i = 0; i < 5; i++) {
      const s = slots[i];
      if (!s) continue;
      const still = s.from === i;
      const x0 = s.from < 0 ? X[0] - STEP * 0.75 : X[s.from];
      const x = x0 + (X[i] - x0) * k;
      const y = 0.01 + (still ? 0 : HOP * 4 * k * (1 - k));
      if (s.bubble) {
        if (s.was) {
          g.A = 1 - k;
          g.box(x, 0, SIDE, SIDE, TALL, y, GONE);
        }
        g.A = s.was || !still ? 1 : k;
        g.box(x, 0, SIDE, SIDE, TALL, y, EMPTY);
        g.A = 1;
        continue;
      }
      const working = i === 2 && k > 0.5;
      g.A = s.from < 0 ? clamp01(k * 1.6) : 1;
      g.box(x, 0, SIDE, SIDE, TALL, y, working ? WORKING : PLAIN);
      if (doomed && i < 2) {
        g.A = doomed;
        g.box(x, 0, SIDE, SIDE, TALL, y, GONE);
      }
      if (working) {
        g.A = smooth((k - 0.5) / 0.4);
        g.text(s.op, x, y + TALL + 0.75, 0, { s: 10, c: 'deep' });
      }
      g.A = 1;
    }
    if (leaving && !leaving.bubble && k < 1) {
      g.A = 1 - k;
      g.box(X[4] + STEP * 0.7 * k, 0, SIDE, SIDE, TALL, 0.01 + HOP * 2 * k * (1 - k), PLAIN);
      g.A = 1;
    }
    if (turned) {
      g.A = 1 - smooth((ph - 0.72) / 0.25);
      g.arc(X[2], TALL, 0, X[0], TALL + 0.1, 0, 1.5, 0, smooth(ph / 0.45), 'deep', 1.5);
      g.A = 1;
    }
  },
};
