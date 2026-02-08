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

function drawBadge(ctx, x, y, text) {
  // badge mic cu fundal pentru vizibilitate
  ctx.save();
  ctx.font = "bold 13px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const padX = 7;
  const padY = 5;
  const w = Math.max(18, ctx.measureText(text).width + padX * 2);
  const h = 18;

  // shadow
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;

  // bg
  ctx.fillStyle = "rgba(10,14,22,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 9);
  ctx.fill();
  ctx.stroke();

  // text
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(text, x, y);

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
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
    const pts = [
      a,
      ...((w.points || []).map((p) => worldToScreen(p.x, p.y, cam))),
      b,
    ];

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  // nodes
  for (const n of nodes) {
    const p = worldToScreen(n.x, n.y, cam);

    // dot
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // label: a = −, b = +
    const sign = n.name === "a" ? "−" : n.name === "b" ? "+" : null;
    if (sign) {
      // plasăm badge-ul puțin deasupra nodului
      drawBadge(ctx, p.x, p.y - 14, sign);
    }
  }

  // preview wire
  if (wireState?.startNodeId && wireState?.previewWorld) {
    const a = nodePos(wireState.startNodeId);
    if (a) {
      const mids = (wireState.points || []).map((p) => worldToScreen(p.x, p.y, cam));
      const b = worldToScreen(wireState.previewWorld.x, wireState.previewWorld.y, cam);

      const pts = [a, ...mids, b];

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}