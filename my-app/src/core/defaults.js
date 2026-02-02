import { uid } from "./utils";
import { resistorSVG, meterSVG, switchSVG, bulbSVG, batterySVG } from "./renderersSvg";

export function defaultPropsForType(type) {
  if (type === "battery") return { V: 9, Rint: 0.2, sizePct: 100, rot: 0 };
  if (type === "resistor") return { R: 100, sizePct: 100, rot: 0 };
  if (type === "switch") return { closed: true, sizePct: 100, rot: 0 };
  if (type === "bulb") return { sizePct: 100, rot: 0, brightness: 0 };
  if (type === "voltmeter") return { display: "—", sizePct: 100, rot: 0 };
  if (type === "ammeter") return { display: "—", sizePct: 100, rot: 0 };
  if (type === "ohmmeter") return { display: "—", sizePct: 100, rot: 0 };
  return { sizePct: 100, rot: 0 };
}

// For simplicity: 2 nodes per component, placed left/right
export function makeItemWithNodes(type, x, y, props = {}) {
  const id = uid(type);
  const item = { id, type, x, y, ...props };

  const dx = 80;
  const nodes = [
    { id: uid("n"), itemId: id, name: "a", x: x - dx, y },
    { id: uid("n"), itemId: id, name: "b", x: x + dx, y },
  ];

  return { item, nodes };
}

export function renderItemSVG(it) {
  if (it.type === "battery") return batterySVG(it.V ?? 9, it.Rint ?? 0.2);
  if (it.type === "resistor") return resistorSVG(it.R ?? 100);
  if (it.type === "voltmeter") return meterSVG("voltmeter", it.display || "—");
  if (it.type === "ammeter") return meterSVG("ammeter", it.display || "—");
  if (it.type === "ohmmeter") return meterSVG("ohmmeter", it.display || "—");
  if (it.type === "switch") return switchSVG(!!it.closed);
  if (it.type === "bulb") return bulbSVG(it.brightness || 0);

  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)"/>
  </svg>`;
}