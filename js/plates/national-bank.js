const N = 12;
const R = 3.45;

function height(u, v, t) {
  const m = u - 0.3;
  const smile = (2.9 * m * m + 0.25 * Math.max(0, m)) * (1.5 - 1.0 * v);
  return 0.45 + 1.15 * smile + 0.42 * Math.sqrt(v) + 0.05 * Math.sin(t * 0.5 + u * 5 + v * 3) + 0.03 * Math.sin(t * 0.8 - u * 7 + v);
}

const hs = new Float32Array((N + 1) * (N + 1));
const SHADES = ['paper', 'tint', 'tint2'];

// An implied-volatility surface over strike and expiry, with a point sliding across it.
export default {
  draw(g, t) {
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs[j * (N + 1) + i] = height(i / N, j / N, t);
    const X = (i) => -R + (2 * R * i) / N;

    g.quad(-R, -R, R, R, 0.008, null, 'soft', 1, [2, 4]);
    g.line(-R, 0, -R, -R, hs[0], -R, 'soft', 1);

    const cell = (i, j) => {
      g.m(X(i), hs[j * (N + 1) + i], X(j));
      g.l(X(i + 1), hs[j * (N + 1) + i + 1], X(j));
      g.l(X(i + 1), hs[(j + 1) * (N + 1) + i + 1], X(j + 1));
      g.l(X(i), hs[(j + 1) * (N + 1) + i], X(j + 1));
      g.z();
    };
    const shade = (i, j) => {
      const avg = (hs[j * (N + 1) + i] + hs[j * (N + 1) + i + 1] + hs[(j + 1) * (N + 1) + i + 1] + hs[(j + 1) * (N + 1) + i]) / 4;
      return avg > 1.9 ? 2 : avg > 1.2 ? 1 : 0;
    };
    for (let s = 0; s <= 2 * N - 2; s++) {
      const from = Math.max(0, s - N + 1);
      const to = Math.min(N - 1, s);
      for (let k = 0; k < 3; k++) {
        let any = false;
        for (let i = from; i <= to; i++) {
          if (shade(i, s - i) !== k) continue;
          if (!any) g.begin();
          any = true;
          cell(i, s - i);
        }
        if (any) g.fill(SHADES[k]);
      }
      g.begin();
      for (let i = from; i <= to; i++) cell(i, s - i);
      g.stroke('line', 1);
    }
    for (let i = 0; i < N; i++) {
      g.line(X(i), 0, R, X(i), hs[N * (N + 1) + i], R, 'soft', 0.75);
      g.line(R, 0, X(i), R, hs[i * (N + 1) + N], X(i), 'soft', 0.75);
    }
    g.line(R, 0, R, R, hs[N * (N + 1) + N], R, 'line', 1);
    g.line(-R, 0, R, -R, hs[N * (N + 1)], R, 'line', 1);
    g.line(R, 0, -R, R, hs[N], -R, 'line', 1);

    const u = 0.5 + 0.34 * Math.sin(t * 0.2);
    const v = 0.52 + 0.36 * Math.sin(t * 0.15 + 1.1);
    const x = -R + 2 * R * u;
    const z = -R + 2 * R * v;
    const h = height(u, v, t);
    g.line(x, 0.01, z, x, 0.01, R, 'soft', 1, [2, 3]);
    g.line(x, 0.01, z, R, 0.01, z, 'soft', 1, [2, 3]);
    g.line(x, h, z, x, h + 1.15, z, 'deep', 1);
    g.dot(x, h, z, 3, 'deep');
    g.text(`σ ${(11.5 + h * 6.2).toFixed(1)}%`, x, h + 1.15, z, { s: 10, c: 'deep', dy: -8, halo: true });

    g.flat('strike', -0.55, R + 0.5, { s: 0.26, c: 'ink3' });
    g.flat('expiry', R + 0.5, 0.6, { along: 'z', s: 0.26, c: 'ink3' });
  },
};
