const CPU = { willReadFrequently: true };
const INKS = ['soft', 'line', 'deep'];
const CUTS = [30, 74, 140];

const channels = (hex) => {
  const n = parseInt(hex.trim().slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Renders a plate as a field of 0s and 1s: samples its ink per character cell, then stamps digits.
export class Bits {
  constructor(theme) {
    this.th = theme;
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d', CPU);
    this.cw = 0;
    this.ch = 0;
    this.glyphs = [];
    this.img = null;
    this.px = null;
  }

  // Rasterises the two digits once per cell size, in each of the three ink colours.
  cell(cw, ch, force) {
    if (cw === this.cw && ch === this.ch && !force) return;
    this.cw = cw;
    this.ch = ch;
    const c = document.createElement('canvas');
    c.width = cw * 2;
    c.height = ch;
    const ctx = c.getContext('2d', CPU);
    ctx.font = `500 ${(cw * 1.22).toFixed(1)}px ${this.th.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('0', cw * 0.5, ch * 0.54);
    ctx.fillText('1', cw * 1.5, ch * 0.54);
    const a = ctx.getImageData(0, 0, cw * 2, ch).data;
    this.glyphs = INKS.map((name) => {
      const [r, g, b] = channels(this.th[name]);
      const rgb = (b << 16) | (g << 8) | r;
      return [0, 1].map((digit) => {
        const out = new Uint32Array(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) out[y * cw + x] = ((a[(y * cw * 2 + digit * cw + x) * 4 + 3] << 24) | rgb) >>> 0;
        return out;
      });
    });
  }

  sample(cols, rows, sx, sy, draw) {
    const m = this.mask;
    if (m.width !== cols || m.height !== rows) {
      m.width = cols;
      m.height = rows;
    }
    const ctx = this.mctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cols, rows);
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    draw(ctx);
    const d = ctx.getImageData(0, 0, cols, rows).data;
    const out = new Uint8Array(cols * rows);
    for (let i = 0; i < out.length; i++) {
      const v = d[i * 4];
      out[i] = v > CUTS[2] ? 3 : v > CUTS[1] ? 2 : v > CUTS[0] ? 1 : 0;
    }
    return out;
  }

  // Writes a pseudo-random 0 or 1 into every inked cell.
  stamp(ctx, cells, cols, rows, seed) {
    const { cw, ch, glyphs } = this;
    const W = cols * cw;
    const H = rows * ch;
    if (!this.img || this.img.width !== W || this.img.height !== H) {
      this.img = new ImageData(W, H);
      this.px = new Uint32Array(this.img.data.buffer);
    } else this.px.fill(0);
    const px = this.px;
    const salt = Math.imul(seed + 1, 0x9e3779b1);
    for (let r = 0, i = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        const ink = cells[i];
        if (!ink) continue;
        let h = Math.imul(i ^ salt, 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        const g = glyphs[ink - 1][(h >>> 16) & 1];
        for (let y = 0, j = 0; y < ch; y++) {
          let o = (r * ch + y) * W + c * cw;
          for (let x = 0; x < cw; x++) px[o++] = g[j++];
        }
      }
    }
    ctx.putImageData(this.img, 0, 0);
  }
}
