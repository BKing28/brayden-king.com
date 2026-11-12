import { clamp01, smooth } from './util.js';

const DAY = 12;
const NIGHT = 7.5;
const PANELS = [-2.75, -1.05, 0.65];
const PW = 1.45;
const ZB = -0.55;
const ZT = -1.75;
const YB = 0.22;
const YT = 1.02;
const BAT = { x: 3.05, z: 0.95, w: 1.0, d: 0.9, h: 1.3 };
const LAMP = { x: -3.2, z: 2.55, h: 1.7 };
const FEED = -0.25;
const SKY = -3.45;
const P = [0, 0, 0];
let level = 0.34;

function charge(k, out) {
  const a = PANELS[0] - PW / 2;
  const run = BAT.x - a;
  const drop = BAT.z - BAT.d / 2 - FEED;
  const d = k * (run + drop);
  out[0] = d < run ? a + d : BAT.x;
  out[1] = d < run ? FEED : FEED + (d - run);
  return out;
}
function supply(k, out) {
  const z1 = LAMP.z;
  const down = z1 - (BAT.z + BAT.d / 2);
  const run = BAT.x - LAMP.x;
  const d = k * (down + run);
  out[0] = d < down ? BAT.x : BAT.x - (d - down);
  out[1] = d < down ? BAT.z + BAT.d / 2 + d : z1;
  return out;
}

// Solar panels charge a battery by day and the battery carries the load at night.
export default {
  update(t, dt) {
    const ph = t % (DAY + NIGHT);
    const sun = ph < DAY ? Math.sin((Math.PI * ph) / DAY) : 0;
    level = Math.min(0.96, Math.max(0.1, level + dt * (ph < DAY ? 0.086 * sun : -0.088)));
  },

  draw(g, t) {
    const ph = t % (DAY + NIGHT);
    const day = ph < DAY;
    const d = ph / DAY;
    const sun = day ? Math.sin(Math.PI * d) : 0;
    const night = ph - DAY;
    const lit = day ? 0 : smooth(night / 0.7) * (1 - smooth((night - NIGHT + 0.8) / 0.8));

    g.arc(-4.25, 0, SKY, 3.95, 0, SKY, 3.0, 0, 1, 'soft', 1, [1, 5]);
    if (day) {
      g.hop(-4.25, 0, SKY, 3.95, 0, SKY, 3.0, d, P);
      g.A = clamp01(d * 12) * clamp01((1 - d) * 12);
      g.dot(P[0], P[1], P[2], 9.5, null, 'soft', 1);
      g.dot(P[0], P[1], P[2], 5, 'paper', 'deep', 1.5);
      g.A = 1;
    }

    for (const x of PANELS) {
      const x0 = x - PW / 2;
      const x1 = x + PW / 2;
      for (const px of [x0 + 0.16, x1 - 0.16]) g.line(px, 0, ZT, px, YT, ZT, 'line', 1);
      g.poly([x0, YB, ZB, x1, YB, ZB, x1, YT, ZT, x0, YT, ZT], 'tint', 'line', 1.25);
      if (sun > 0.2) {
        g.A = clamp01(sun * 1.25 - 0.25);
        g.poly([x0, YB, ZB, x1, YB, ZB, x1, YT, ZT, x0, YT, ZT], 'tint2', 'line', 1.25);
        g.A = 1;
      }
      const ym = (YB + YT) / 2;
      const zm = (ZB + ZT) / 2;
      g.line(x0, ym, zm, x1, ym, zm, 'soft', 0.75);
      for (const k of [1 / 3, 2 / 3]) g.line(x0 + PW * k, YB, ZB, x0 + PW * k, YT, ZT, 'soft', 0.75);
      for (const px of [x0 + 0.16, x1 - 0.16]) g.line(px, 0, ZB, px, YB, ZB, 'line', 1);
    }

    g.begin();
    g.m(PANELS[0] - PW / 2, 0.006, FEED).l(BAT.x, 0.006, FEED).l(BAT.x, 0.006, BAT.z - BAT.d / 2);
    g.m(BAT.x, 0.006, BAT.z + BAT.d / 2).l(BAT.x, 0.006, LAMP.z).l(LAMP.x, 0.006, LAMP.z);
    g.stroke('soft', 1);
    for (const x of PANELS) g.line(x, 0.006, ZB, x, 0.006, FEED, 'soft', 1);

    if (lit > 0) {
      g.A = lit;
      g.ring(LAMP.x + 0.45, LAMP.z, 0.95, 0.004, 'tint');
      g.A = 1;
    }
    g.line(LAMP.x, 0, LAMP.z, LAMP.x, LAMP.h, LAMP.z, 'line', 1.25);
    g.line(LAMP.x, LAMP.h, LAMP.z, LAMP.x + 0.45, LAMP.h, LAMP.z, 'line', 1.25);
    g.dot(LAMP.x + 0.45, LAMP.h - 0.06, LAMP.z, 3.6, lit > 0.5 ? 'deep' : 'paper', lit > 0.5 ? 'deep' : 'line', 1.25);

    g.box(BAT.x, BAT.z, BAT.w, BAT.d, BAT.h * level, 0, { top: 'line', left: 'tint2', right: 'tint2', stroke: 'line', w: 1 });
    g.box(BAT.x, BAT.z, BAT.w, BAT.d, BAT.h, 0, { top: null, left: null, right: null });
    g.text(`${Math.round(level * 100)}%`, BAT.x + BAT.w / 2, BAT.h * 0.55, BAT.z, { s: 10, c: 'deep', al: 'left', dx: 30, dy: 10 });

    if (day) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.16 + i / 3) % 1;
        charge(k, P);
        g.A = clamp01(sun * 1.6 - 0.2) * clamp01(k * 9) * clamp01((1 - k) * 9);
        g.chip(P[0], 0.03, P[1], 2.5, 'deep');
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.13 + i / 2) % 1;
        supply(k, P);
        g.A = lit * clamp01(k * 9) * clamp01((1 - k) * 9);
        g.chip(P[0], 0.03, P[1], 2.5, 'deep');
      }
    }
    g.A = 1;
  },
};
