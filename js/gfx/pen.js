const TAU = Math.PI * 2;
const NONE = [];
const Q = [0, 0];
const ELEVATION = 0.6;

const STROKE_W = { line: 1, ink: 1, deep: 1, soft: 0.5, fault: 1, ink2: 0.8, ink3: 0.55, ink4: 0.3 };
const FILL_W = { paper: 0, tint: 0.16, tint2: 0.34, soft: 0.5, line: 0.8, deep: 1, ink: 1, fault: 0.85, faultTint: 0.22, shadow: -1 };

export const ISO = {
  ax: Math.SQRT1_2,
  by: Math.SQRT1_2 * Math.sin(ELEVATION),
  cy: Math.cos(ELEVATION),
};

// Draws in plate coordinates (x, height, z) onto a 2D canvas using an isometric projection.
export class Pen {
  constructor(theme) {
    this.th = theme;
    this.A = 1;
  }

  // Points the pen at a canvas; mask mode draws ink weights in the red channel for the binary version.
  to(ctx, unit, ox, oy, res = 1, o = NONE) {
    this.ctx = ctx;
    this.res = res;
    this.ox = ox;
    this.oy = oy;
    this.ax = ISO.ax * unit;
    this.by = ISO.by * unit;
    this.cy = ISO.cy * unit;
    this.k = o.k ?? 1;
    this.hair = o.hair || 0;
    this.mask = !!o.mask;
    this.lwm = o.lw ?? 10;
    this.lod = !!o.lod || this.mask;
    this.A = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    return this;
  }

  pt(x, y, z, out = Q) {
    out[0] = this.ox + (x - z) * this.ax;
    out[1] = this.oy + (x + z) * this.by - y * this.cy;
    return out;
  }

  begin() {
    this.ctx.beginPath();
    return this;
  }
  m(x, y, z) {
    this.ctx.moveTo(this.ox + (x - z) * this.ax, this.oy + (x + z) * this.by - y * this.cy);
    return this;
  }
  l(x, y, z) {
    this.ctx.lineTo(this.ox + (x - z) * this.ax, this.oy + (x + z) * this.by - y * this.cy);
    return this;
  }
  z() {
    this.ctx.closePath();
    return this;
  }

  stroke(c = 'line', w = 1.25, dash) {
    const ctx = this.ctx;
    if (this.mask) {
      const v = Math.round(255 * (STROKE_W[c] ?? 1) * this.A * (dash ? 0.6 : 1));
      if (v < 10) return this;
      ctx.globalCompositeOperation = 'lighten';
      ctx.strokeStyle = `rgb(${v},0,0)`;
      ctx.lineWidth = this.lwm;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      return this;
    }
    ctx.globalAlpha = this.A;
    ctx.strokeStyle = this.th[c] || c;
    let lw = w * this.k;
    if (this.hair && w <= 1.3 && lw > this.hair) lw = this.hair;
    ctx.lineWidth = lw;
    if (dash) {
      ctx.setLineDash(this.k === 1 ? dash : dash.map((d) => d * this.k));
      ctx.stroke();
      ctx.setLineDash(NONE);
    } else ctx.stroke();
    return this;
  }

  fill(c = 'paper') {
    const ctx = this.ctx;
    if (this.mask) {
      const w = FILL_W[c] ?? 0.5;
      if (w < 0) return this;
      ctx.fillStyle = `rgb(${Math.round(255 * w * this.A)},0,0)`;
      ctx.fill();
      return this;
    }
    ctx.globalAlpha = this.A;
    ctx.fillStyle = this.th[c] || c;
    ctx.fill();
    return this;
  }

  line(x1, y1, z1, x2, y2, z2, c, w, dash) {
    return this.begin().m(x1, y1, z1).l(x2, y2, z2).stroke(c, w, dash);
  }

  poly(pts, fill, stroke, w, dash) {
    this.begin();
    for (let i = 0; i < pts.length; i += 3) {
      if (i) this.l(pts[i], pts[i + 1], pts[i + 2]);
      else this.m(pts[i], pts[i + 1], pts[i + 2]);
    }
    this.z();
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w, dash);
    return this;
  }

  quad(x0, z0, x1, z1, y, fill, stroke, w, dash) {
    this.begin().m(x0, y, z0).l(x1, y, z0).l(x1, y, z1).l(x0, y, z1).z();
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w, dash);
    return this;
  }

  wall(axis, at, a0, a1, y0, y1, fill, stroke, w, dash) {
    this.begin();
    if (axis === 'x') this.m(a0, y0, at).l(a1, y0, at).l(a1, y1, at).l(a0, y1, at);
    else this.m(at, y0, a0).l(at, y0, a1).l(at, y1, a1).l(at, y1, a0);
    this.z();
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w, dash);
    return this;
  }

  // A box drawn as its three visible faces.
  box(cx, cz, w, d, h, y0 = 0, s = NONE) {
    const top = s.top === undefined ? 'paper' : s.top;
    const left = s.left === undefined ? 'paper' : s.left;
    const right = s.right === undefined ? 'tint' : s.right;
    const st = s.stroke === undefined ? 'line' : s.stroke;
    const lw = s.w ?? 1.25;
    const dash = s.dash;
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const y1 = y0 + h;
    if (h > 0.004 && top === left && top === right && top && st && !dash) {
      this.begin().m(x0, y1, z0).l(x1, y1, z0).l(x1, y0, z0).l(x1, y0, z1).l(x0, y0, z1).l(x0, y1, z1).z();
      this.fill(top);
      this.m(x1, y1, z0).l(x1, y1, z1).l(x0, y1, z1).m(x1, y1, z1).l(x1, y0, z1);
      return this.stroke(st, lw);
    }
    if (h > 0.004) {
      this.begin().m(x0, y0, z1).l(x1, y0, z1).l(x1, y1, z1).l(x0, y1, z1).z();
      if (left) this.fill(left);
      if (st) this.stroke(st, lw, dash);
      this.begin().m(x1, y0, z1).l(x1, y0, z0).l(x1, y1, z0).l(x1, y1, z1).z();
      if (right) this.fill(right);
      if (st) this.stroke(st, lw, dash);
    }
    this.begin().m(x0, y1, z0).l(x1, y1, z0).l(x1, y1, z1).l(x0, y1, z1).z();
    if (top) this.fill(top);
    if (st) this.stroke(st, lw, dash);
    return this;
  }

  ring(cx, cz, r, y, fill, stroke, w, dash, a0 = 0, a1 = TAU) {
    const full = a1 - a0 >= TAU - 1e-6;
    const n = Math.max(10, Math.min(72, Math.round(((a1 - a0) / TAU) * (14 + r * 12))));
    this.begin();
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const x = cx + Math.cos(a) * r;
      const zz = cz + Math.sin(a) * r;
      if (i) this.l(x, y, zz);
      else this.m(x, y, zz);
    }
    if (full) this.z();
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w, dash);
    return this;
  }

  dot(x, y, z, r, fill, stroke, w) {
    const q = this.pt(x, y, z);
    this.ctx.beginPath();
    this.ctx.arc(q[0], q[1], this.mask ? Math.max(r, this.lwm * 0.55) : r * this.k, 0, TAU);
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w);
    return this;
  }

  chip(x, y, z, r, fill, stroke, w, diamond) {
    const q = this.pt(x, y, z);
    const ctx = this.ctx;
    const k = this.mask ? Math.max(r, this.lwm * 0.55) : r * this.k;
    ctx.beginPath();
    if (diamond) {
      ctx.moveTo(q[0], q[1] - k * 1.25);
      ctx.lineTo(q[0] + k * 1.25, q[1]);
      ctx.lineTo(q[0], q[1] + k * 1.25);
      ctx.lineTo(q[0] - k * 1.25, q[1]);
      ctx.closePath();
    } else ctx.rect(q[0] - k, q[1] - k, k * 2, k * 2);
    if (fill) this.fill(fill);
    if (stroke) this.stroke(stroke, w);
    return this;
  }

  // The point a fraction t along a parabolic hop from a to b that peaks h above the straight line.
  hop(ax, ay, az, bx, by, bz, h, t, out) {
    out[0] = ax + (bx - ax) * t;
    out[1] = ay + (by - ay) * t + 4 * h * t * (1 - t);
    out[2] = az + (bz - az) * t;
    return out;
  }

  arc(ax, ay, az, bx, by, bz, h, t0, t1, c, w, dash) {
    const n = Math.max(2, Math.ceil((t1 - t0) * 22));
    this.begin();
    for (let i = 0; i <= n; i++) {
      const t = t0 + ((t1 - t0) * i) / n;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t + 4 * h * t * (1 - t);
      const zz = az + (bz - az) * t;
      if (i) this.l(x, y, zz);
      else this.m(x, y, zz);
    }
    return this.stroke(c, w, dash);
  }

  text(str, x, y, z, o = NONE) {
    if (this.lod) return this;
    const q = this.pt(x, y, z);
    const ctx = this.ctx;
    this.setFont(`${o.wt || 500} ${o.s || 10}px ${o.sans ? this.th.sans : this.th.mono}`);
    ctx.globalAlpha = this.A * (o.a ?? 1);
    ctx.textAlign = o.al || 'center';
    ctx.textBaseline = o.bl || 'middle';
    if (o.halo) {
      ctx.strokeStyle = this.th.paper;
      ctx.lineWidth = 3.5;
      ctx.strokeText(str, q[0] + (o.dx || 0), q[1] + (o.dy || 0));
    }
    ctx.fillStyle = this.th[o.c || 'ink3'] || o.c;
    ctx.fillText(str, q[0] + (o.dx || 0), q[1] + (o.dy || 0));
    return this;
  }

  // Text lying flat on the plate.
  flat(str, x, z, o = NONE) {
    if (this.lod) return this;
    const q = this.pt(x, o.y ?? 0.004, z);
    const F = 24;
    const k = (o.s ?? 0.3) / F;
    const ctx = this.ctx;
    const r = this.res;
    const a = this.ax * k * r;
    const b = this.by * k * r;
    if (o.along === 'z') ctx.setTransform(a, -b, a, b, q[0] * r, q[1] * r);
    else ctx.setTransform(a, b, -a, b, q[0] * r, q[1] * r);
    ctx.globalAlpha = this.A * (o.a ?? 1);
    ctx.fillStyle = this.th[o.c || 'ink3'] || o.c;
    this.setFont(`${o.wt || 500} ${F}px ${o.sans ? this.th.sans : this.th.mono}`);
    ctx.textAlign = o.al || 'left';
    ctx.textBaseline = o.bl || 'alphabetic';
    ctx.fillText(str, 0, 0);
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return this;
  }

  setFont(font) {
    const ctx = this.ctx;
    if (ctx.fontSet !== font) {
      ctx.font = font;
      ctx.fontSet = font;
    }
  }
}
