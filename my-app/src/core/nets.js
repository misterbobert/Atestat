// Build adjacency from wires between node IDs
export function buildAdj(nodes, wires) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const w of wires) {
    if (!adj.has(w.aNodeId) || !adj.has(w.bNodeId)) continue;
    adj.get(w.aNodeId).push(w.bNodeId);
    adj.get(w.bNodeId).push(w.aNodeId);
  }
  return adj;
}

// Find connected components ("nets") of node graph
export function computeNets(nodes, wires) {
  const adj = buildAdj(nodes, wires);
  const seen = new Set();
  const nets = [];

  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n.id];
    const comp = [];
    seen.add(n.id);

    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const nx of adj.get(cur) || []) {
        if (!seen.has(nx)) {
          seen.add(nx);
          stack.push(nx);
        }
      }
    }
    nets.push(comp);
  }

  return nets;
}