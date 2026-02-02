export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}