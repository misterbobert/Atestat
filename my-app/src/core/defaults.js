// src/core/defaults.js
import { uid } from "./utils";
import { resistorSVG, meterSVG, switchSVG, bulbSVG, batterySVG } from "./renderersSvg";

function rotatePoint(x, y, deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
}

export function defaultPropsForType(type) {
  if (type === "battery") return { V: 9, Rint: 0.2, sizePct: 100, rot: 0 };
  if (type === "resistor") return { R: 100, sizePct: 100, rot: 0 };
  if (type === "switch") return { closed: true, sizePct: 100, rot: 0 };
  if (type === "bulb") return { R: 30, sizePct: 100, rot: 0, brightness: 0 };
  if (type === "voltmeter") return { display: "—", sizePct: 100, rot: 0 };
  if (type === "ammeter") return { display: "—", sizePct: 100, rot: 0 };
  if (type === "ohmmeter") return { display: "—", sizePct: 100, rot: 0 };
  return { sizePct: 100, rot: 0 };
}

// Recalculează world coords pentru nodurile unui item (din lx/ly locale)
export function recalcItemNodes(item, nodes) {
  const size = (item.sizePct ?? 100) / 100;
  const rot = item.rot ?? 0;

  return nodes.map((n) => {
    if (n.itemId !== item.id) return n;

    const p = rotatePoint((n.lx ?? 0) * size, (n.ly ?? 0) * size, rot);
    return { ...n, x: item.x + p.x, y: item.y + p.y };
  });
}

export function recalcAllNodes(items, nodes) {
  const map = new Map(items.map((it) => [it.id, it]));
  return nodes.map((n) => {
    const it = map.get(n.itemId);
    if (!it) return n;
    if (n.lx == null || n.ly == null) return n; // nod vechi / alt tip, nu-l atingem

    const size = (it.sizePct ?? 100) / 100;
    const rot = it.rot ?? 0;

    const r = (rot * Math.PI) / 180;
    const c = Math.cos(r), s = Math.sin(r);

    const rx = (n.lx * size) * c - (n.ly * size) * s;
    const ry = (n.lx * size) * s + (n.ly * size) * c;

    return { ...n, x: it.x + rx, y: it.y + ry };
  });
}

// Creează item + 2 noduri “legate” (lx/ly) de item
export function makeItemWithNodes(type, x, y, props = {}) {
  const id = uid(type);
  const item = { id, type, x, y, ...props };

  const dx = 80;

  let nodes = [
    { id: uid("n"), itemId: id, name: "a", lx: -dx, ly: 0, x, y },
    { id: uid("n"), itemId: id, name: "b", lx: +dx, ly: 0, x, y },
  ];

  nodes = recalcItemNodes(item, nodes);
  return { item, nodes };
}

// !!! Exportul lipsă care îți rupe Overlay.jsx
export function renderItemSVG(it) {
  if (it.type === "battery") return batterySVG(it.V ?? 9, it.Rint ?? 0.2);
  if (it.type === "resistor") return resistorSVG(it.R ?? 100);
  if (it.type === "voltmeter") return meterSVG("voltmeter", it.display || "—");
  if (it.type === "ammeter") return meterSVG("ammeter", it.display || "—");
  if (it.type === "ohmmeter") return meterSVG("ohmmeter", it.display || "—");
  if (it.type === "switch") return switchSVG(!!it.closed);
  if (it.type === "bulb") return bulbSVG(it.brightness || 0);

  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20"
      fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)"/>
  </svg>`;
}