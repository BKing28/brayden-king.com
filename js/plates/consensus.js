import { clamp01, smooth, BEAT, FLIGHT } from './util.js';

const R = 2.75;
const SIZE = 0.95;
const TALL = 0.5;
const WIRE = 0.28;
const NODE = [];
for (let i = 0; i < 5; i++) {
  const a = -0.75 * Math.PI + (i * 2 * Math.PI) / 5;
  NODE.push([Math.cos(a) * R, Math.sin(a) * R]);
}
const Q = [0, 0];

const FALLS = 4;
const STANDS = 6;
const WINS = 7;
const RETURNS = 10;
const SPLITS = 12;
const AGAIN = 14;
const TAKES = 15;
const HEALS = 18;
const ROUND = 21;
const CUT = 4.3;
const OUT = FLIGHT / BEAT;

function crown(g, x, y) {
  const c = g.ctx;
  c.beginPath();
  c.moveTo(x - 6.2, y);
  c.lineTo(x - 7.8, y - 7.8);
  c.lineTo(x - 3.5, y - 4.1);
  c.lineTo(x, y - 10.3);
  c.lineTo(x + 3.5, y - 4.1);
  c.lineTo(x + 7.8, y - 7.8);
  c.lineTo(x + 6.2, y);
  c.closePath();
  g.fill('deep');
}

// Five nodes and a leader: heartbeats, a leader failure and election, then a network partition and heal.
export default {
  draw(g, t) {
    const beats = Math.max(0, t - 6) / BEAT;
    const round = Math.floor(beats / ROUND);
    const beat = Math.floor(beats) % ROUND;
    const ph = beats % 1;
    const a = (round * 4) % 5;
    const b = (a + 2) % 5;
    const c = (b + 2) % 5;
    const split = beat >= SPLITS && beat < HEALS;
    const small = (i) => split && (i === b || i === (b + 1) % 5);
    const alive = (i) => !(i === a && beat >= FALLS && beat < RETURNS);
    const hears = (i, j) => alive(i) && alive(j) && small(i) === small(j);
    const leads = (i) => (i === a && beat < FALLS) || (i === b && beat >= WINS && beat < HEALS) || (i === c && beat >= TAKES);
    const stands = (i) => (i === b && beat === STANDS) || (i === c && beat === AGAIN);

    for (let i = 0; i < 5; i++)
      for (let j = i + 1; j < 5; j++) {
        if (hears(i, j)) g.line(NODE[i][0], WIRE, NODE[i][1], NODE[j][0], WIRE, NODE[j][1], 'soft', 0.75);
      }

    const cut = beat === SPLITS ? smooth(ph / 0.45) : beat === HEALS ? 1 - smooth(ph / 0.45) : split ? 1 : 0;
    if (cut > 0) {
      const at = (i) => -0.75 * Math.PI + (i * 2 * Math.PI) / 5;
      const a0 = at(b - 0.5);
      const a1 = at(b + 1.5);
      const mx = ((Math.cos(a0) + Math.cos(a1)) * CUT) / 2;
      const mz = ((Math.sin(a0) + Math.sin(a1)) * CUT) / 2;
      g.line(mx + (Math.cos(a0) * CUT - mx) * cut, 0.006, mz + (Math.sin(a0) * CUT - mz) * cut, mx + (Math.cos(a1) * CUT - mx) * cut, 0.006, mz + (Math.sin(a1) * CUT - mz) * cut, 'fault', 1.5, [5, 4]);
    }

    if (ph < 2 * OUT) {
      const back = ph >= OUT;
      const k = clamp01(back ? 2 - ph / OUT : ph / OUT);
      for (let from = 0; from < 5; from++) {
        const vote = stands(from);
        if (!vote && !leads(from)) continue;
        for (let i = 0; i < 5; i++) {
          if (i === from || !hears(from, i)) continue;
          const x = NODE[from][0] + (NODE[i][0] - NODE[from][0]) * k;
          const z = NODE[from][1] + (NODE[i][1] - NODE[from][1]) * k;
          if (vote) g.chip(x, WIRE, z, 2.6, 'deep', null, 1, true);
          else if (back) g.dot(x, WIRE, z, 1.9, 'paper', 'line', 1);
          else g.dot(x, WIRE, z, beat % 2 ? 3 : 2.2, beat % 2 ? 'deep' : 'line');
        }
      }
    }

    for (let i = 0; i < 5; i++) {
      const [x, z] = NODE[i];
      if (!alive(i)) {
        g.quad(x - SIZE / 2, z - SIZE / 2, x + SIZE / 2, z + SIZE / 2, 0.01, 'faultTint', 'fault', 1, [3, 3]);
        continue;
      }
      g.box(x, z, SIZE, SIZE, TALL, 0, leads(i) ? { top: 'deep', left: 'tint2', right: 'tint2', stroke: 'deep' } : stands(i) ? { top: 'tint2', left: 'paper', right: 'tint' } : undefined);
      if (leads(i)) {
        const q = g.pt(x - SIZE / 2, TALL, z - SIZE / 2, Q);
        crown(g, q[0], q[1] - 6);
      }
    }
  },
};
