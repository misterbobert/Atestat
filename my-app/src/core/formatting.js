export function formatSI(value, unit = "") {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  const table = [
    { k: 1e9, s: "G" },
    { k: 1e6, s: "M" },
    { k: 1e3, s: "k" },
    { k: 1, s: "" },
    { k: 1e-3, s: "m" },
    { k: 1e-6, s: "µ" },
    { k: 1e-9, s: "n" },
  ];

  let best = table[3];
  for (const t of table) {
    if (abs >= t.k) {
      best = t;
      break;
    }
  }
  const n = value / best.k;
  const txt = Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
  return `${txt}${best.s}${unit}`;
}