export function screenToWorld(sx, sy, cam) {
  return {
    x: (sx - cam.x) / cam.z,
    y: (sy - cam.y) / cam.z,
  };
}

export function worldToScreen(x, y, cam) {
  return {
    x: x * cam.z + cam.x,
    y: y * cam.z + cam.y,
  };
}

export function drawInfiniteGrid(ctx, w, h, cam) {
  const grid = 40 * cam.z;
  ctx.save();

  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";

  const ox = cam.x % grid;
  const oy = cam.y % grid;

  for (let x = ox; x < w; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (let y = oy; y < h; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawWires(ctx, nodes, wires, cam, wireState) {
  ctx.save();

  // wires
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(120,200,255,0.85)";

  function nodePos(id) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return null;
    return worldToScreen(n.x, n.y, cam);
  }

  for (const w of wires) {
    const a = nodePos(w.aNodeId);
    const b = nodePos(w.bNodeId);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // nodes
  for (const n of nodes) {
    const p = worldToScreen(n.x, n.y, cam);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // preview wire
  if (wireState?.startNodeId && wireState?.previewWorld) {
    const a = nodePos(wireState.startNodeId);
    const b = worldToScreen(wireState.previewWorld.x, wireState.previewWorld.y, cam);
    if (a && b) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}