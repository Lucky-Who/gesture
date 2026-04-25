export const D = Math.PI / 180;

export function d(deg) {
  return deg * D;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function eio(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
