import { clamp01, outBack } from './util.js';

const COLS = 73;
const ROWS = 56;
const PUZZLES = [
  {
    n: 1,
    who: 'McDAVID · 97',
    tries: 3,
    enc: '//1103/0z06/0y08/0y08/0y08/0y08/0y0e/0z0g/0z0k/0z0l/0y0n/0x0p/0w0q/0w0q/0v0q/0v0q/0v0p/0w0n/0w0m/0w0m/0w0m/0w0m/0w0n/0w0n/0w0n/0w0o/0w0o/0w0o/0w0o/0w05130h/0w05140g/0u06150e/0s04180b/0r03180c/0p03190b/0n041a0b/0m031b0b/0k041b0b/0i041c0b/0h041e0a/0f041h09/0e031h0a/02030c041i0a/02050a041j0a/030a1j0b/06051j0d/08021j0e/09011k051r07/1m031t06/1o011u05/1w03///',
  },
  {
    n: 28,
    who: 'MATTHEWS · 34',
    tries: 4,
    enc: '//1904/1807/1807/1708/180c/180d/190d/190e/180g/180h/170j/170k/170k/170l/170l/170m/170m/170m/170n/160o/16061e0g/15071f0f/13081f0e/12081e0e/12061d0e/11061d0d/10061c0e/0y071c0e/0x021b0g/0v021b0g/0t031a0a1l07/0r031a091m06/0p0319081n05/0o0219071o05/0m021a061o05/0k031a071p05/06020i031b071p06/06040g031b071p06/06060d041c061q05/07081c071t01/08061d06/1e05/1e06/1f05/1g05/1g06/1g07/1f08/1e08/1d08/1d06/1e03//',
  },
  {
    n: 33,
    who: 'MAKAR · 8',
    tries: 2,
    enc: '//0t04/0s07/0l0e/0j0h/0i0i/0h0j/0h0j/0h0i/0g0i/0g0h/0f0g/0f0h/0e0i/0d0j/0c0k/0b0l/0b0l/0a0m/090m/080n/080n/090m/0a0l/0a0m/0b0n/0b0o/0b0p/0b0q/0b0i0v07/0b0i0w05/0b0j0x05/0a080l081102/09080m071202/09070m071303/09060l071403/09060l061602/08060k071702/08050k061802/07060k061902/07080j061a02/07090j051b02/060a0i071c02/06080h091d02/0h091e02/0g091f03/0g031g03/1h03/1i03/1j03/1k0b/1l09/1m031r02//',
  },
];
for (const p of PUZZLES) {
  p.runs = [];
  p.enc.split('/').forEach((row, r) => {
    for (let i = 0; i < row.length; i += 4) p.runs.push([r, parseInt(row.slice(i, i + 2), 36), parseInt(row.slice(i + 2, i + 4), 36)]);
  });
}

const K = Math.SQRT1_2;
const CX = 1.2;
const CZ = 1.2;
const TALL = 0.825;
const CELL = 0.056;
const W = 4.6;
const FOOT = 0.06;
const BOXES = 5;
const BOX = 0.42;
const GAP = 0.15;
const ROW = FOOT + 0.2;
const PIC = ROW + BOX / TALL + 0.22;
const TOP = PIC + (ROWS * CELL) / TALL + 0.16;

const LEAD = 1.0;
const EACH = 1.45;
const HOLD = 2.0;
let round = 0;
let since = 5.0;

// The PuckShadow game: a player's silhouette, up to five guesses, then the answer.
export default {
  update(now) {
    if (now - since > LEAD + EACH * PUZZLES[round % PUZZLES.length].tries + HOLD) {
      round++;
      since = now;
    }
  },

  draw(g, now) {
    const t = now - since;
    const puzzle = PUZZLES[round % PUZZLES.length];
    const need = puzzle.tries;
    const used = Math.min(need, Math.max(0, Math.floor((t - LEAD) / EACH) + 1));
    const solved = used >= need;
    const at = (u, v) => g.m(CX + u * K, v, CZ - u * K);
    const to = (u, v) => g.l(CX + u * K, v, CZ - u * K);
    const rect = (u0, v0, u1, v1) => {
      at(u0, v0);
      to(u1, v0);
      to(u1, v1);
      to(u0, v1);
      g.z();
    };

    g.begin();
    g.m(CX - (W / 2) * K, 0.006, CZ + (W / 2) * K);
    g.l(CX + (W / 2) * K, 0.006, CZ - (W / 2) * K);
    g.l(CX + (W / 2) * K + 0.34, 0.006, CZ - (W / 2) * K + 0.34);
    g.l(CX - (W / 2) * K + 0.34, 0.006, CZ + (W / 2) * K + 0.34);
    g.z();
    g.fill('tint');

    g.begin();
    rect(-W / 2, FOOT, W / 2, TOP);
    g.fill('paper');
    g.stroke('line', 1.25);

    const x0 = (-COLS * CELL) / 2;
    const top = PIC + (ROWS * CELL) / TALL;
    g.begin();
    for (const [r, c, n] of puzzle.runs) {
      const v = top - (r * CELL) / TALL;
      rect(x0 + c * CELL, v - CELL / TALL, x0 + (c + n) * CELL, v);
    }
    g.fill('deep');

    const left = -(BOXES * BOX + (BOXES - 1) * GAP) / 2;
    for (let i = 0; i < BOXES; i++) {
      const u = left + i * (BOX + GAP);
      const tried = i < used;
      const right = tried && solved && i === need - 1;
      const pop = tried ? outBack(clamp01((t - LEAD - i * EACH) / 0.3)) : 1;
      const inset = (BOX * (1 - pop)) / 2;
      g.begin();
      rect(u + inset, ROW + inset / TALL, u + BOX - inset, ROW + (BOX - inset) / TALL);
      g.fill(right ? 'deep' : tried ? 'tint' : 'paper');
      g.stroke(right ? 'deep' : 'line', 1);
      if (tried && !right) {
        const m = BOX * 0.3;
        g.begin();
        at(u + m, ROW + m / TALL);
        to(u + BOX - m, ROW + (BOX - m) / TALL);
        at(u + m, ROW + (BOX - m) / TALL);
        to(u + BOX - m, ROW + m / TALL);
        g.stroke('ink2', 1);
      }
    }

    const shown = solved ? clamp01((t - LEAD - (need - 1) * EACH - 0.25) / 0.3) : 1;
    g.A = shown;
    g.text(solved ? puzzle.who : 'who?', CX, TOP + 0.34, CZ, { s: 10, c: solved ? 'deep' : 'ink3', wt: solved ? 500 : 400 });
    g.A = 1;
  },
};
