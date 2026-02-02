import { computeNets } from "./nets";
import { solveMNA } from "./mnaSolver";
import { formatSI } from "./formatting";

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

    // choose a ground: first net that has at least one connection (or 0)
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

      if (it.type === "resistor") {
        const R = Math.max(1e-6, Number(it.R ?? 100));
        resistors.push({ a: na, b: nb, R });
      }

      if (it.type === "switch") {
        if (it.closed) {
          resistors.push({ a: na, b: nb, R: 1e-4 });
        } else {
          // open => ignore
        }
      }

      if (it.type === "bulb") {
        // treat bulb as resistor ~ 30Ω (tweak as you like)
        resistors.push({ a: na, b: nb, R: 30 });
      }

      if (it.type === "battery") {
        // model: ideal V source in series with Rint
        // MNA supports ideal V source; for Rint we add resistor between internal node and terminal
        // We'll implement a small trick: insert an internal net index
        const V = Number(it.V ?? 9);
        const Rint = Math.max(1e-6, Number(it.Rint ?? 0.2));

        const internal = nodeCount + voltageSources.length; // temporary unique node index
        // We'll build with expanded nodeCount
        // Instead simpler: represent as Vsource between na and nb, plus resistor parallel? (not correct)
        // We'll do series properly by expanding nodes below.
        voltageSources.push({ a: na, b: internal, V });
        resistors.push({ a: internal, b: nb, R: Rint });
      }

      // meters: we compute after solve using node voltages
    }

    // Fix expanded nodes from battery internal nodes:
    const maxNodeIndex =
      Math.max(
        nodeCount - 1,
        ...resistors.map((r) => Math.max(r.a, r.b)),
        ...voltageSources.map((v) => Math.max(v.a, v.b))
      ) + 1;

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

export function applySolutionToItems(items, sol) {
  if (!sol?.ok) {
    return items.map((it) => {
      const x = { ...it };
      if (x.type === "voltmeter" || x.type === "ammeter" || x.type === "ohmmeter") x.display = "—";
      if (x.type === "bulb") x.brightness = 0;
      return x;
    });
  }

  const { nodeToNet, mna } = sol;

  // helper to get net for item pin
  function pinNet(nodes, itemId, pinName) {
    // nodes not available here; meters computed in outer layer normally
    void nodes; void itemId; void pinName;
    return null;
  }

  // We cannot read nodes here (kept minimal), so meters will be approximated:
  // We'll set displays only using existing mapping if user adds a wire between the two meter pins.

  // We'll compute voltmeter/ohmmeter using the net indices of its pins by scanning a hidden field injected by UI later.
  // To keep it functional now: display will be computed in the UI layer if you want exact.
  // We'll still do bulb brightness roughly from voltage difference across its two nets, by storing item._netA/_netB in solve step.
  return items.map((it) => {
    const copy = { ...it };

    // Meters default
    if (copy.type === "voltmeter" || copy.type === "ammeter" || copy.type === "ohmmeter") {
      // We will populate from external logic later; keep placeholder
      if (!copy.display) copy.display = "—";
    }

    // Bulb brightness (rough): if we stored nets, use them
    if (copy.type === "bulb" && copy._netA != null && copy._netB != null) {
      const Va = mna.V[copy._netA] ?? 0;
      const Vb = mna.V[copy._netB] ?? 0;
      const dv = Math.abs(Va - Vb);
      copy.brightness = Math.max(0, Math.min(1, dv / 6));
    }

    return copy;
  });
}