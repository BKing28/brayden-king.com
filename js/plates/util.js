export const BEAT = 0.93;
export const FLIGHT = 0.35;

export const TAU = Math.PI * 2;
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
export const outCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const outBack = (t) => {
  t = clamp01(t);
  return 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
};
export const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
