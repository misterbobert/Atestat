import { computeNets } from "./nets";
import { solveMNA } from "./mnaSolver";
import { formatSI } from "./formatting";

// Parse values that may come as numbers OR formatted SI strings (e.g. "1.00MΩ", "200mΩ", "9V")
function parseSIValue(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;

  const s = String(v).trim();

  // remove spaces + common units
  const clean = s.replace(/\s+/g, "").replace(/[ΩVA]/gi, "");

  // number + optional SI prefix
  const m = clean.match(/^(-?\d+(?:\.\d+)?)([pnumkMGTµu])?$/);
  if (!m) {
    const n = Number(clean);
    return Number.isFinite(n) ? n : NaN;
  }

  const num = Number(m[1]);
  const p = m[2] || "";

  const mult =
    p === "p" ? 1e-12 :
    p === "n" ? 1e-9 :
    p === "u" || p === "µ" ? 1e-6 :
    p === "m" ? 1e-3 :
    p === "k" ? 1e3 :
    p === "M" ? 1e6 :
    p === "G" ? 1e9 :
    p === "T" ? 1e12 : 1;

  return num * mult;
}

// Build a net index for each node by connectivity (wires)
function buildNodeToNet(nodes, wires) {
  const nets = computeNets(nodes, wires);
  const map = new Map();
  nets.forEach((arr, idx) => {
    for (const nodeId of arr) map.set(nodeId, idx);
  });
  return { nets, nodeToNet: map };
}

// For each item, we assume 2 pins: node name a / b
function itemPins(nodes, itemId) {
  const pins = nodes.filter((n) => n.itemId === itemId);
  const a = pins.find((p) => p.name === "a") || pins[0];
  const b = pins.find((p) => p.name === "b") || pins[1];
  return { a, b };
}

export function solveNormalDC(items, nodes, wires) {
  try {
    const { nodeToNet, nets } = buildNodeToNet(nodes, wires);
    const nodeCount = nets.length;

    // Choose a ground. With GMIN below, it's safe even for multiple disconnected circuits.
    const ground = 0;

    const resistors = [];
    const currentSources = [];
    const voltageSources = [];

    // stamps by components
    for (const it of items) {
      const { a, b } = itemPins(nodes, it.id);
      if (!a || !b) continue;

      const na = nodeToNet.get(a.id);
      const nb = nodeToNet.get(b.id);

      if (na == null || nb == null) continue;

      if (it.type === "resistor") {
        const Rraw = parseSIValue(it.R ?? 100);
        const R = Math.max(1e-6, Number.isFinite(Rraw) ? Rraw : 100);
        resistors.push({ a: na, b: nb, R });
      }

      if (it.type === "switch") {
        if (it.closed) resistors.push({ a: na, b: nb, R: 1e-4 });
      }

      if (it.type === "bulb") {
        // optional: allow bulb.R, else default 30Ω
        const Rbraw = parseSIValue(it.R ?? 30);
        const Rb = Math.max(1e-6, Number.isFinite(Rbraw) ? Rbraw : 30);
        resistors.push({ a: na, b: nb, R: Rb });
      }

      if (it.type === "battery") {
        // model: ideal V source in series with Rint
        const Vraw = parseSIValue(it.V ?? 9);
        const Rintraw = parseSIValue(it.Rint ?? 0.2);

        const V = Number.isFinite(Vraw) ? Vraw : 9;
        const Rint = Math.max(1e-6, Number.isFinite(Rintraw) ? Rintraw : 0.2);

        const internal = nodeCount + voltageSources.length; // unique internal node index
        voltageSources.push({ a: na, b: internal, V });
        resistors.push({ a: internal, b: nb, R: Rint });
      }

      if (it.type === "ammeter") {
        // ammeter = nearly short circuit
        resistors.push({ a: na, b: nb, R: 1e-4 });
      }

      // voltmeter/ohmmeter don't affect circuit (open) - computed after solve
    }

    // expanded nodeCount because of internal battery nodes
    const maxNodeIndex =
      Math.max(
        nodeCount - 1,
        ...resistors.map((r) => Math.max(r.a, r.b)),
        ...voltageSources.map((v) => Math.max(v.a, v.b))
      ) + 1;

    // ✅ GMIN: tie all nodes weakly to ground to avoid singular matrices (disconnected circuits)
    const GMIN_R = 1e12;
    for (let i = 0; i < maxNodeIndex; i++) {
      if (i === ground) continue;
      resistors.push({ a: i, b: ground, R: GMIN_R });
    }

    const mna = solveMNA({
      nodeCount: maxNodeIndex,
      ground,
      resistors,
      currentSources,
      voltageSources,
    });

    if (!mna) return { ok: false, reason: "singular" };

    return { ok: true, nodeToNet, nets, ground, mna, voltageSources, resistors };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export function applySolutionToItems(items, nodes, sol) {
  if (!sol?.ok) {
    return items.map((it) => {
      const x = { ...it };
      if (x.type === "voltmeter" || x.type === "ammeter" || x.type === "ohmmeter") x.display = "—";
      if (x.type === "bulb") x.brightness = 0;
      return x;
    });
  }

  const { nodeToNet, mna } = sol;

  function V(net) {
    return mna?.V?.[net] ?? 0;
  }

  return items.map((it) => {
    const copy = { ...it };
    const { a, b } = itemPins(nodes, it.id);
    if (!a || !b) return copy;

    const na = nodeToNet.get(a.id);
    const nb = nodeToNet.get(b.id);
    if (na == null || nb == null) return copy;

    const Va = V(na);
    const Vb = V(nb);
    const dV = Va - Vb;

if (copy.type === "bulb") {
  const Rb = Math.max(1e-6, Number(copy.R ?? 30)); // rezistența becului
  const V = Math.abs(dV);

  const P = (V * V) / Rb;   // puterea disipată
  const Pnom = 0.5;         // 0.5W = 100% (tweak după gust)

  copy.brightness = Math.max(0, Math.min(1, P / Pnom));
}

    if (copy.type === "voltmeter") {
      copy.display = `${Math.abs(dV).toFixed(2)} V`;
    }

    if (copy.type === "ammeter") {
      const Rsh = 1e-4;
      copy.display = `${(dV / Rsh).toFixed(3)} A`;
    }

    if (copy.type === "ohmmeter") {
      copy.display = "—";
    }

    return copy;
  });
}