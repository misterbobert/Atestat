export const LIBRARY = [
  {
    id: "sources",
    name: "Sources",
    items: [{ type: "battery", label: "Baterie", icon: "🔋", meta: "V + Rezistență internă", sprite: "assets/sprites/battery.png" }],
  },
  {
    id: "passive",
    name: "Passive",
    items: [
      { type: "resistor", label: "Rezistor", icon: "R", meta: "Ω", sprite: null },
      { type: "bulb", label: "Bec", icon: "💡", meta: "luminos", sprite: null },
      { type: "switch", label: "Întrerupător", icon: "S", meta: "deschis/închis", sprite: null },
    ],
  },
  {
    id: "instruments",
    name: "Instruments",
    items: [
      { type: "voltmeter", label: "Voltmetru", icon: "V", meta: "ΔV", sprite: null },
      { type: "ammeter", label: "Ampermetru", icon: "A", meta: "I", sprite: null },
      { type: "ohmmeter", label: "Ohmmetru", icon: "Ω", meta: "Req", sprite: null },
    ],
  },
];