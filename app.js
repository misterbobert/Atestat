(() => {
  /** ===========================
   *  LIBRARY
   *  =========================== */
  const LIBRARY = [
    {
      id: "sources",
      name: "Sources",
      items: [{ type: "battery", label: "Battery DC", icon: "🔋", meta: "V + Rint", sprite: "assets/sprites/battery.png" }],
    },
    {
      id: "passive",
      name: "Passive",
      items: [
        { type: "resistor", label: "Resistor", icon: "R", meta: "Ω bands", sprite: null },
        { type: "bulb", label: "Bulb", icon: "💡", meta: "brightness", sprite: null },
        { type: "switch", label: "Switch", icon: "S", meta: "open/close", sprite: null },
      ],
    },
    {
      id: "instruments",
      name: "Instruments",
      items: [
        { type: "voltmeter", label: "Voltmeter", icon: "V", meta: "ΔV", sprite: null },
        { type: "ammeter", label: "Ammeter", icon: "A", meta: "I", sprite: null },
        { type: "ohmmeter", label: "Ohmmeter", icon: "Ω", meta: "Req", sprite: null },
      ],
    },
  ];

  /** ===========================
   *  DOM
   *  =========================== */
  const workspace = document.getElementById("workspace");
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");

  const libraryRoot = document.getElementById("library");
  const searchInput = document.getElementById("search");

  const inspectorBody = document.getElementById("inspectorBody");
  const inspectorSub = document.getElementById("inspectorSub");
  const deleteSelectedBtn = document.getElementById("deleteSelected");
  const duplicateSelectedBtn = document.getElementById("duplicateSelected");

  const statusPill = document.getElementById("statusPill");
  const hintMode = document.getElementById("hintMode");

  const btnSelect = document.getElementById("btnSelect");
  const btnWire = document.getElementById("btnWire");
  const btnClearWires = document.getElementById("btnClearWires");

  const btnPlay = document.getElementById("btnPlay");
  const btnStop = document.getElementById("btnStop");

  /** ===========================
   *  STATE + HISTORY (Undo/Redo)
   *  =========================== */
  const state = {
    mode: "select",
    running: false,
    rafId: null,

    items: [],
    nodes: [],
    wires: [],

    selectedId: null,

    cam: { x: 0, y: 0, z: 1 },
    pan: null,
    drag: null,

    wireStartNodeId: null,

    mouseScreen: { x: 0, y: 0 },

    // last solution cached
    sol: null,

    // history
    history: {
      past: [],
      future: [],
      max: 80,
      muted: false,
    },
  };

  /** ===========================
   *  Utils
   *  =========================== */
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function status(text) {
    statusPill.textContent = text;
    clearTimeout(status._t);
    status._t = setTimeout(() => (statusPill.textContent = "Ready"), 1200);
  }

  /** ===========================
   *  History
   *  =========================== */
  function snapshotState() {
    return JSON.parse(
      JSON.stringify({
        items: state.items,
        nodes: state.nodes,
        wires: state.wires,
        selectedId: state.selectedId,
        cam: state.cam,
        mode: state.mode,
      })
    );
  }

  function restoreSnapshot(snap) {
    state.history.muted = true;
    stopSimulation(true);

    state.items = snap.items || [];
    state.nodes = snap.nodes || [];
    state.wires = snap.wires || [];
    state.selectedId = snap.selectedId ?? null;
    state.cam = snap.cam || { x: 0, y: 0, z: 1 };
    state.mode = snap.mode || "select";
    state.wireStartNodeId = null;
    state.sol = null;

    overlay.innerHTML = "";
    for (const it of state.items) mountItemDOM(it);

    setMode(state.mode, true);
    renderInspector();
    renderAllOnce();

    state.history.muted = false;
  }

  function pushHistory(reason = "") {
    if (state.history.muted) return;
    state.history.past.push(snapshotState());
    if (state.history.past.length > state.history.max) state.history.past.shift();
    state.history.future = [];
    // console.log("history push:", reason);
  }

  function undo() {
    if (!state.history.past.length) return;
    const current = snapshotState();
    const prev = state.history.past.pop();
    state.history.future.push(current);
    restoreSnapshot(prev);
    status("Undo");
  }

  function redo() {
    if (!state.history.future.length) return;
    const current = snapshotState();
    const next = state.history.future.pop();
    state.history.past.push(current);
    restoreSnapshot(next);
    status("Redo");
  }

  /** ===========================
   *  Coordinates
   *  =========================== */
  function screenToWorld(px, py) {
    const r = workspace.getBoundingClientRect();
    const sx = px - r.left;
    const sy = py - r.top;
    const cx = r.width / 2;
    const cy = r.height / 2;
    return {
      x: state.cam.x + (sx - cx) / state.cam.z,
      y: state.cam.y + (sy - cy) / state.cam.z,
    };
  }

  function worldToScreen(wx, wy) {
    const r = workspace.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    return {
      x: cx + (wx - state.cam.x) * state.cam.z,
      y: cy + (wy - state.cam.y) * state.cam.z,
    };
  }

  function getItem(id) {
    return state.items.find((i) => i.id === id) || null;
  }
  function getNode(id) {
    return state.nodes.find((n) => n.id === id) || null;
  }

  /** ===========================
   *  Canvas base
   *  =========================== */
  function resizeCanvas() {
    const rect = workspace.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderAllOnce();
  }

  function drawInfiniteGrid() {
    const rect = workspace.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const zoom = state.cam.z;
    const stepWorld = 50;
    const smallAlpha = clamp(0.05 * zoom, 0.02, 0.08);
    const bigAlpha = clamp(0.10 * zoom, 0.04, 0.12);

    const topLeft = screenToWorld(rect.left, rect.top);
    const bottomRight = screenToWorld(rect.left + w, rect.top + h);

    const startX = Math.floor(topLeft.x / stepWorld) * stepWorld;
    const endX = Math.ceil(bottomRight.x / stepWorld) * stepWorld;
    const startY = Math.floor(topLeft.y / stepWorld) * stepWorld;
    const endY = Math.ceil(bottomRight.y / stepWorld) * stepWorld;

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,255,255,${smallAlpha})`;
    for (let x = startX; x <= endX; x += stepWorld) {
      const p = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x + 0.5, 0);
      ctx.lineTo(p.x + 0.5, h);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += stepWorld) {
      const p = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, p.y + 0.5);
      ctx.lineTo(w, p.y + 0.5);
      ctx.stroke();
    }

    const bigStep = stepWorld * 5;
    const startXB = Math.floor(topLeft.x / bigStep) * bigStep;
    const endXB = Math.ceil(bottomRight.x / bigStep) * bigStep;
    const startYB = Math.floor(topLeft.y / bigStep) * bigStep;
    const endYB = Math.ceil(bottomRight.y / bigStep) * bigStep;

    ctx.strokeStyle = `rgba(255,255,255,${bigAlpha})`;
    for (let x = startXB; x <= endXB; x += bigStep) {
      const p = worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(p.x + 0.5, 0);
      ctx.lineTo(p.x + 0.5, h);
      ctx.stroke();
    }
    for (let y = startYB; y <= endYB; y += bigStep) {
      const p = worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, p.y + 0.5);
      ctx.lineTo(w, p.y + 0.5);
      ctx.stroke();
    }
  }

  function nodePosWorld(node) {
    if (!node) return null;

    if (node.kind === "free") return { x: node.x, y: node.y };

    if (node.kind === "comp") {
      const el = overlay.querySelector(`.comp[data-id="${node.itemId}"]`);
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      const ax = node.side === "L" ? r.left : r.right;
      const ay = r.top + r.height / 2;
      return screenToWorld(ax, ay);
    }
    return null;
  }

  function drawWires() {
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "rgba(120, 200, 255, 0.92)";
    ctx.fillStyle = "rgba(120, 200, 255, 0.95)";

    for (const w of state.wires) {
      const na = getNode(w.a);
      const nb = getNode(w.b);
      if (!na || !nb) continue;

      const A = nodePosWorld(na);
      const B = nodePosWorld(nb);
      if (!A || !B) continue;

      const a = worldToScreen(A.x, A.y);
      const b = worldToScreen(B.x, B.y);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // preview
    if (state.mode === "wire" && state.wireStartNodeId) {
      const n0 = getNode(state.wireStartNodeId);
      if (n0) {
        const A = nodePosWorld(n0);
        const a = worldToScreen(A.x, A.y);

        const rect = workspace.getBoundingClientRect();
        const mw = screenToWorld(rect.left + state.mouseScreen.x, rect.top + state.mouseScreen.y);
        const snap = findSnap(mw);
        const endW = snap ? snap.pos : mw;
        const b = worldToScreen(endW.x, endW.y);

        ctx.strokeStyle = "rgba(255, 214, 10, 0.95)";
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,214,10,0.95)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderOverlay() {
    const rect = workspace.getBoundingClientRect();

    for (const it of state.items) {
      const el = overlay.querySelector(`.comp[data-id="${it.id}"]`);
      if (!el) continue;

      const s = worldToScreen(it.x, it.y);
      const pct = clamp(Number(it.sizePct ?? 0.14), 0.06, 0.40);
      const baseW = rect.width * pct;
      const wPx = clamp(baseW * state.cam.z, 46, rect.width * 0.9);

      el.style.width = `${wPx}px`;
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${it.rot || 0}deg)`;
      el.classList.toggle("selected", it.id === state.selectedId);
    }
  }

  function renderAllOnce() {
    drawInfiniteGrid();
    drawWires();
    renderOverlay();
  }

  /** ===========================
   *  Library UI
   *  =========================== */
  function renderLibrary(filter = "") {
    libraryRoot.innerHTML = "";
    const f = filter.trim().toLowerCase();

    for (const cat of LIBRARY) {
      const catEl = document.createElement("section");
      catEl.className = "category";

      const head = document.createElement("div");
      head.className = "cat-head";
      head.innerHTML = `<div class="cat-name">${cat.name}</div><div class="cat-count">${cat.items.length}</div>`;
      head.addEventListener("click", () => catEl.classList.toggle("collapsed"));

      const items = document.createElement("div");
      items.className = "cat-items";

      const visible = cat.items.filter((it) => !f || (it.label + " " + it.type).toLowerCase().includes(f));
      for (const it of visible) {
        const itemEl = document.createElement("div");
        itemEl.className = "item";
        itemEl.draggable = true;

        itemEl.innerHTML = `
          <div class="i-top">
            <div class="icon">${it.icon}</div>
            <div class="label">${it.label}</div>
          </div>
          <div class="hint2">${it.meta ?? ""}</div>
        `;

        itemEl.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({ type: it.type }));
          e.dataTransfer.effectAllowed = "copy";
        });

        items.appendChild(itemEl);
      }

      catEl.appendChild(head);
      catEl.appendChild(items);
      libraryRoot.appendChild(catEl);
    }
  }

  searchInput.addEventListener("input", () => renderLibrary(searchInput.value));

  /** ===========================
   *  Components
   *  =========================== */
  function defaultPropsForType(type) {
    switch (type) {
      case "battery":
        return { V: 9, Rint: 0.6, rot: 0, sizePct: 0.14 };
      case "resistor":
        return { R: 1000, rot: 0, sizePct: 0.16, tol: "brown" };
      case "switch":
        return { closed: false, rot: 0, sizePct: 0.14 };
      case "bulb":
        return { R: 30, rot: 0, sizePct: 0.16, brightness: 0 };
      case "voltmeter":
        return { rot: 0, sizePct: 0.16, display: "—" };
      case "ammeter":
        return { rot: 0, sizePct: 0.16, display: "—" };
      case "ohmmeter":
        return { rot: 0, sizePct: 0.16, display: "—" };
      default:
        return { rot: 0, sizePct: 0.14 };
    }
  }

  function createItem(type, x, y) {
    return { id: uid(), type, x, y, ...defaultPropsForType(type) };
  }

  function mountItemDOM(item) {
    const el = document.createElement("div");
    el.className = "comp";
    el.dataset.id = item.id;
    el.innerHTML = renderItemSVGorIMG(item);

    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);

      if (state.mode === "wire") {
        const wp = screenToWorld(e.clientX, e.clientY);
        const snap = findSnap(wp);
        if (snap) wireClickSnap(snap);
        else wireClickWorld(wp);
        return;
      }

      selectItem(item.id);

      const wp = screenToWorld(e.clientX, e.clientY);
      state.drag = { id: item.id, offX: item.x - wp.x, offY: item.y - wp.y };
      pushHistory("move-start");
    });

    el.addEventListener("pointermove", (e) => {
      if (!state.drag || state.drag.id !== item.id) return;
      if (state.mode !== "select") return;

      const wp = screenToWorld(e.clientX, e.clientY);
      const it = getItem(item.id);
      if (!it) return;

      it.x = wp.x + state.drag.offX;
      it.y = wp.y + state.drag.offY;
      renderAllOnce();
    });

    el.addEventListener("pointerup", () => {
      state.drag = null;
    });

    overlay.appendChild(el);
  }

  function mountItem(item) {
    pushHistory("add-item");
    state.items.push(item);
    mountItemDOM(item);
    renderAllOnce();
  }

  function updateItem(id, patch, reason = "update-item") {
    pushHistory(reason);
    const it = getItem(id);
    if (!it) return;
    Object.assign(it, patch);

    safeRerenderById(id);
    if (state.selectedId === id) renderInspector();
    renderAllOnce();
  }

  function deleteItem(id) {
    pushHistory("delete-item");
    const attachedNodeIds = state.nodes.filter((n) => n.kind === "comp" && n.itemId === id).map((n) => n.id);
    state.wires = state.wires.filter((w) => !attachedNodeIds.includes(w.a) && !attachedNodeIds.includes(w.b));
    state.nodes = state.nodes.filter((n) => !attachedNodeIds.includes(n.id));

    state.items = state.items.filter((i) => i.id !== id);
    overlay.querySelector(`.comp[data-id="${id}"]`)?.remove();

    if (state.selectedId === id) state.selectedId = null;
    renderInspector();
    renderAllOnce();
  }

  function duplicateItem(id) {
    const it = getItem(id);
    if (!it) return;
    pushHistory("duplicate-item");
    const copy = { ...it, id: uid(), x: it.x + 60, y: it.y + 60 };
    state.items.push(copy);
    mountItemDOM(copy);
    selectItem(copy.id);
    renderAllOnce();
  }

  /** ===========================
   *  Drag & drop place
   *  =========================== */
  workspace.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  workspace.addEventListener("drop", (e) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain");
    if (!payload) return;
    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return;
    }

    const wp = screenToWorld(e.clientX, e.clientY);
    const item = createItem(data.type, wp.x, wp.y);
    mountItem(item);
    selectItem(item.id);
    status("Placed: " + item.type);
  });

  /** ===========================
   *  Wire tool
   *  =========================== */
  const SNAP_PX = 16;

  function ensureNodeForComp(itemId, side) {
    let n = state.nodes.find((n) => n.kind === "comp" && n.itemId === itemId && n.side === side);
    if (n) return n.id;
    const id = uid();
    state.nodes.push({ id, kind: "comp", itemId, side });
    return id;
  }

  function createFreeNodeAt(wp) {
    const id = uid();
    state.nodes.push({ id, kind: "free", x: wp.x, y: wp.y });
    return id;
  }

  function addWire(a, b) {
    if (a === b) return;
    const exists = state.wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
    if (exists) return;
    pushHistory("add-wire");
    state.wires.push({ id: uid(), a, b });
  }

  function findSnap(wp) {
    const snapWorld = SNAP_PX / state.cam.z;
    let best = null;
    let bestD2 = snapWorld * snapWorld;

    for (const n of state.nodes) {
      const p = nodePosWorld(n);
      const dx = p.x - wp.x;
      const dy = p.y - wp.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { kind: "node", nodeId: n.id, pos: p };
      }
    }

    for (const it of state.items) {
      const el = overlay.querySelector(`.comp[data-id="${it.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();

      const L = screenToWorld(r.left, r.top + r.height / 2);
      const R = screenToWorld(r.right, r.top + r.height / 2);

      for (const side of ["L", "R"]) {
        const p = side === "L" ? L : R;
        const dx = p.x - wp.x;
        const dy = p.y - wp.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = { kind: "comp", itemId: it.id, side, pos: p };
        }
      }
    }
    return best;
  }

  function wireClickNode(nodeId) {
    if (!state.wireStartNodeId) {
      state.wireStartNodeId = nodeId;
      status("Wire: pick endpoint (ESC/dblclick to finish)");
      renderAllOnce();
      return;
    }
    addWire(state.wireStartNodeId, nodeId);
    state.wireStartNodeId = nodeId;
    status("Wire created (chaining)");
    renderAllOnce();
  }

  function wireClickSnap(snap) {
    if (snap.kind === "node") return wireClickNode(snap.nodeId);
    if (snap.kind === "comp") {
      const nid = ensureNodeForComp(snap.itemId, snap.side);
      return wireClickNode(nid);
    }
  }

  function wireClickWorld(wp) {
    const snap = findSnap(wp);
    if (snap) return wireClickSnap(snap);
    const nid = createFreeNodeAt(wp);
    wireClickNode(nid);
  }

  function finishWireMode() {
    state.wireStartNodeId = null;
    status("Wire finished");
    renderAllOnce();
  }

  function clearWires() {
    pushHistory("clear-wires");
    state.wires = [];
    state.nodes = state.nodes.filter((n) => n.kind === "comp");
    state.wireStartNodeId = null;
    renderAllOnce();
  }

  /** ===========================
   *  Workspace interactions
   *  =========================== */
  workspace.addEventListener("pointerdown", (e) => {
    const isOnComp = e.target.closest?.(".comp");
    const isSidebar = e.target.closest?.(".sidebar");
    if (isSidebar) return;

    if (!isOnComp) {
      if (state.mode === "wire") {
        const wp = screenToWorld(e.clientX, e.clientY);
        wireClickWorld(wp);
        return;
      }
      state.pan = { sx: e.clientX, sy: e.clientY, cx: state.cam.x, cy: state.cam.y };
      state.selectedId = null;
      renderInspector();
      renderAllOnce();
    }
  });

  workspace.addEventListener("pointermove", (e) => {
    const rect = workspace.getBoundingClientRect();
    state.mouseScreen.x = e.clientX - rect.left;
    state.mouseScreen.y = e.clientY - rect.top;

    if (state.pan) {
      const dx = e.clientX - state.pan.sx;
      const dy = e.clientY - state.pan.sy;
      state.cam.x = state.pan.cx - dx / state.cam.z;
      state.cam.y = state.pan.cy - dy / state.cam.z;
      renderAllOnce();
    } else if (state.mode === "wire" && state.wireStartNodeId) {
      renderAllOnce();
    }
  });

  workspace.addEventListener("pointerup", () => {
    state.pan = null;
  });

  workspace.addEventListener("dblclick", (e) => {
    const isSidebar = e.target.closest?.(".sidebar");
    const isOnComp = e.target.closest?.(".comp");
    if (isSidebar || isOnComp) return;
    if (state.mode === "wire" && state.wireStartNodeId) finishWireMode();
  });

  workspace.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const oldZ = state.cam.z;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZ = clamp(oldZ * factor, 0.2, 3.5);

      const before = screenToWorld(e.clientX, e.clientY);
      state.cam.z = newZ;
      const after = screenToWorld(e.clientX, e.clientY);

      state.cam.x += before.x - after.x;
      state.cam.y += before.y - after.y;

      renderAllOnce();
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if (e.key === "Escape") {
      if (state.mode === "wire" && state.wireStartNodeId) finishWireMode();
      return;
    }

    if (e.key.toLowerCase() === "r") {
      if (state.selectedId) {
        const it = getItem(state.selectedId);
        if (it) updateItem(it.id, { rot: ((it.rot || 0) + 90) % 360 }, "rotate");
      }
      return;
    }

    if (e.key === "Delete") {
      if (state.selectedId) deleteItem(state.selectedId);
    }
  });

  /** ===========================
   *  Mode buttons
   *  =========================== */
  function setMode(mode, silent = false) {
    state.mode = mode;
    btnSelect.classList.toggle("active", mode === "select");
    btnWire.classList.toggle("active", mode === "wire");
    hintMode.textContent = mode === "wire" ? "Wire" : "Select";
    if (mode !== "wire") state.wireStartNodeId = null;
    if (!silent) renderAllOnce();
  }

  btnSelect.addEventListener("click", () => setMode("select"));
  btnWire.addEventListener("click", () => setMode("wire"));
  btnClearWires.addEventListener("click", clearWires);

  /** ===========================
   *  Inspector
   *  =========================== */
  function selectItem(id) {
    state.selectedId = id;
    renderInspector();
    renderAllOnce();
  }

  function renderInspector() {
    inspectorBody.innerHTML = "";
    const has = Boolean(state.selectedId);
    deleteSelectedBtn.disabled = !has;
    duplicateSelectedBtn.disabled = !has;

    if (!has) {
      inspectorSub.textContent = "Selectează un obiect";
      inspectorBody.innerHTML = `
        <div class="pill">🖱️ Pan: drag pe fundal • Zoom: scroll</div>
        <div class="pill">🔌 Wire: click start → click end (chain) • ESC/dblclick = finish</div>
        <div class="pill">▶️ Play rulează solver DC în buclă • Stop oprește</div>
        <div class="pill">↩️ Ctrl+Z Undo • Ctrl+Shift+Z Redo</div>
      `;
      return;
    }

    const it = getItem(state.selectedId);
    if (!it) return;
    inspectorSub.textContent = it.type;

    const sizePercent = Math.round(clamp(Number(it.sizePct ?? 0.14), 0.06, 0.40) * 100);

    const fields = [];

    fields.push(`
      <div class="field">
        <label>Mărime (Size % din viewport)</label>
        <div class="row">
          <input id="propSizeRange" type="range" min="6" max="40" value="${sizePercent}" />
          <input id="propSizeNum" type="number" min="6" max="40" value="${sizePercent}" />
        </div>
      </div>
    `);

    fields.push(`
      <div class="row">
        <div class="field">
          <label>Rotation (deg)</label>
          <input id="propRot" type="number" step="1" value="${Number(it.rot || 0)}" />
        </div>
        <div class="field">
          <label>Tip</label>
          <input value="${escapeHtml(it.type)}" disabled />
        </div>
      </div>
    `);

    if (it.type === "battery") {
      fields.push(`
        <div class="row">
          <div class="field">
            <label>Tensiune (V)</label>
            <input id="propV" type="number" step="0.1" value="${Number(it.V ?? 9)}" />
          </div>
          <div class="field">
            <label>Rezistență internă (Ω)</label>
            <input id="propRint" type="number" min="0" step="0.1" value="${Number(it.Rint ?? 0.6)}" />
          </div>
        </div>
      `);
    }

    if (it.type === "resistor" || it.type === "bulb") {
      fields.push(`
        <div class="field">
          <label>Rezistență (Ω)</label>
          <input id="propR" type="number" min="0" step="1" value="${Number(it.R ?? 1000)}" />
        </div>
      `);
    }

    if (it.type === "switch") {
      fields.push(`
        <div class="field">
          <label>State</label>
          <select id="propClosed">
            <option value="false" ${!it.closed ? "selected" : ""}>Open</option>
            <option value="true" ${it.closed ? "selected" : ""}>Closed</option>
          </select>
        </div>
      `);
    }

    if (["voltmeter", "ammeter", "ohmmeter"].includes(it.type)) {
      fields.push(`<div class="pill">Conectează wire-uri la bornele L/R, apoi Play.</div>`);
    }

    inspectorBody.innerHTML = fields.join("");

    const sizeRange = document.getElementById("propSizeRange");
    const sizeNum = document.getElementById("propSizeNum");
    const rot = document.getElementById("propRot");

    const v = document.getElementById("propV");
    const rint = document.getElementById("propRint");
    const r = document.getElementById("propR");
    const closed = document.getElementById("propClosed");

    function setSizePercent(p) {
      const pct = clamp(Number(p) / 100, 0.06, 0.40);
      updateItem(it.id, { sizePct: pct }, "size");
    }

    sizeRange?.addEventListener("input", () => {
      sizeNum.value = sizeRange.value;
      setSizePercent(sizeRange.value);
    });

    sizeNum?.addEventListener("change", () => {
      const val = clamp(Number(sizeNum.value), 6, 40);
      sizeRange.value = String(val);
      sizeNum.value = String(val);
      setSizePercent(val);
    });

    rot?.addEventListener("change", () => {
      const nr = Number(rot.value);
      updateItem(it.id, { rot: Number.isFinite(nr) ? nr : 0 }, "rotate");
    });

    v?.addEventListener("change", () => {
      const nv = Number(v.value);
      updateItem(it.id, { V: Number.isFinite(nv) ? nv : 0 }, "battery-V");
    });

    rint?.addEventListener("change", () => {
      const nv = Number(rint.value);
      updateItem(it.id, { Rint: Number.isFinite(nv) ? Math.max(0, nv) : 0 }, "battery-Rint");
    });

    r?.addEventListener("change", () => {
      const nr = Number(r.value);
      updateItem(it.id, { R: Number.isFinite(nr) ? Math.max(0, Math.round(nr)) : 0 }, "resistance");
    });

    closed?.addEventListener("change", () => {
      updateItem(it.id, { closed: closed.value === "true" }, "switch");
    });
  }

  deleteSelectedBtn.addEventListener("click", () => state.selectedId && deleteItem(state.selectedId));
  duplicateSelectedBtn.addEventListener("click", () => state.selectedId && duplicateItem(state.selectedId));

  /** ===========================
   *  Play/Stop (FIXED + AIRBAG)
   *  =========================== */
  function startSimulation() {
    // Always reset stale RAF
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;

    state.running = true;
    btnPlay.disabled = true;
    btnStop.disabled = false;
    status("Running");

    const tick = () => {
      if (!state.running) return;

      try {
        solveAndUpdateUI();
        renderAllOnce();
      } catch (err) {
        console.error("Simulation crash:", err);
        status("Eroare în simulare (Console). Stop automat.");
        stopSimulation(false);
        return;
      }

      state.rafId = requestAnimationFrame(tick);
    };

    state.rafId = requestAnimationFrame(tick);
  }

  function stopSimulation(silent = false) {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    state.sol = null;

    btnPlay.disabled = false;
    btnStop.disabled = true;

    // reset displays
    for (const it of state.items) {
      if (["voltmeter", "ammeter", "ohmmeter"].includes(it.type)) it.display = "—";
      if (it.type === "bulb") it.brightness = 0;
      safeRerenderById(it.id);
    }

    if (!silent) status("Stopped");
    renderAllOnce();
  }

  btnPlay.addEventListener("click", startSimulation);
  btnStop.addEventListener("click", () => stopSimulation(false));
  btnStop.disabled = true;

  /** ===========================
   *  SAFE RERENDER (fix for "wire kills play")
   *  =========================== */
  function safeRerenderById(id) {
    const it = getItem(id);
    if (!it) return;
    const el = overlay.querySelector(`.comp[data-id="${id}"]`);
    if (!el) return;
    el.innerHTML = renderItemSVGorIMG(it);
  }

  function safeRerender(it) {
    const el = overlay.querySelector(`.comp[data-id="${it.id}"]`);
    if (!el) return;
    el.innerHTML = renderItemSVGorIMG(it);
  }

  /** ===========================
   *  Nets
   *  =========================== */
  function buildAdj() {
    const adj = new Map();
    const add = (u, v) => {
      if (!adj.has(u)) adj.set(u, new Set());
      adj.get(u).add(v);
    };
    for (const w of state.wires) {
      add(w.a, w.b);
      add(w.b, w.a);
    }
    return adj;
  }

  function computeNets() {
    const adj = buildAdj();
    const visited = new Set();
    const netOfNode = new Map();
    let netId = 0;

    for (const n of state.nodes) {
      if (visited.has(n.id)) continue;
      netId++;
      const stack = [n.id];
      visited.add(n.id);
      netOfNode.set(n.id, netId);

      while (stack.length) {
        const u = stack.pop();
        const neigh = adj.get(u);
        if (!neigh) continue;
        for (const v of neigh) {
          if (!visited.has(v)) {
            visited.add(v);
            netOfNode.set(v, netId);
            stack.push(v);
          }
        }
      }
    }
    return { netOfNode, netCount: netId };
  }

  function getNetForCompTerminal(netOfNode, itemId, side) {
    const node = state.nodes.find((n) => n.kind === "comp" && n.itemId === itemId && n.side === side);
    if (!node) return null;
    return netOfNode.get(node.id) ?? null;
  }

  function chooseGround(netOfNode) {
    const bat = state.items.find((i) => i.type === "battery");
    if (bat) {
      const g = getNetForCompTerminal(netOfNode, bat.id, "L");
      if (g) return g;
    }
    return 1;
  }

  /** ===========================
   *  MNA Solver
   *  =========================== */
  function solveLinear(A, b) {
    const N = A.length;
    if (N === 0) return [];
    const M = A.map((row, i) => row.slice().concat([b[i]]));

    for (let col = 0; col < N; col++) {
      let pivot = col;
      for (let r = col + 1; r < N; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      if (Math.abs(M[pivot][col]) < 1e-12) return null;
      if (pivot !== col) [M[pivot], M[col]] = [M[col], M[pivot]];

      const div = M[col][col];
      for (let c = col; c <= N; c++) M[col][c] /= div;

      for (let r = 0; r < N; r++) {
        if (r === col) continue;
        const f = M[r][col];
        if (Math.abs(f) < 1e-12) continue;
        for (let c = col; c <= N; c++) M[r][c] -= f * M[col][c];
      }
    }
    return M.map((row) => row[N]);
  }

  function solveMNA({ resistors, vsources, groundNet, netCount }) {
    const nets = [];
    for (let k = 1; k <= netCount; k++) if (k !== groundNet) nets.push(k);
    const n = nets.length;
    const m = vsources.length;
    const dim = n + m;

    const netIndex = new Map();
    nets.forEach((id, idx) => netIndex.set(id, idx));

    const A = Array.from({ length: dim }, () => Array(dim).fill(0));
    const z = Array(dim).fill(0);

    function idxOf(netId) {
      if (netId === groundNet) return -1;
      return netIndex.get(netId);
    }

    function stampG(aNet, bNet, g) {
      const ia = idxOf(aNet);
      const ib = idxOf(bNet);
      if (ia !== -1) A[ia][ia] += g;
      if (ib !== -1) A[ib][ib] += g;
      if (ia !== -1 && ib !== -1) {
        A[ia][ib] -= g;
        A[ib][ia] -= g;
      }
    }

    for (const r of resistors) {
      const R = Math.max(1e-12, Number(r.R));
      stampG(r.a, r.b, 1 / R);
    }

    vsources.forEach((s, k) => {
      const row = n + k;
      const ia = idxOf(s.a);
      const ib = idxOf(s.b);

      if (ia !== -1) {
        A[ia][row] += 1;
        A[row][ia] += 1;
      }
      if (ib !== -1) {
        A[ib][row] -= 1;
        A[row][ib] -= 1;
      }

      z[row] = Number(s.V) || 0;
    });

    const x = solveLinear(A, z);
    if (!x) return null;

    const Vnet = new Map();
    Vnet.set(groundNet, 0);
    for (let i = 0; i < n; i++) Vnet.set(nets[i], x[i]);

    const Ivs = new Map();
    for (let k = 0; k < m; k++) Ivs.set(vsources[k].id, x[n + k]);

    return { Vnet, Ivs };
  }

  /** ===========================
   *  Build circuit (battery internal resistance)
   *  Battery model:
   *   L = (-) net = nL
   *   R = (+) net = nR
   *   internal node nInt
   *   Vsource: V(nInt) - V(nL) = V
   *   Rint: between nInt and nR
   *  =========================== */
  function buildCircuit({ disableVoltageSources }) {
    const { netOfNode, netCount: baseNetCount } = computeNets();
    if (baseNetCount === 0) return null;

    let netCount = baseNetCount;
    const groundNet = chooseGround(netOfNode);

    const resistors = [];
    const vsources = [];

    const R_OPEN = 1e12;
    const R_SHORT = 1e-6;

    function allocVirtualNet() {
      netCount += 1;
      return netCount;
    }

    for (const it of state.items) {
      const nL = getNetForCompTerminal(netOfNode, it.id, "L");
      const nR = getNetForCompTerminal(netOfNode, it.id, "R");
      if (!nL || !nR) continue;

      if (it.type === "resistor") resistors.push({ id: it.id, a: nL, b: nR, R: Math.max(1e-9, Number(it.R || 1)) });
      if (it.type === "bulb") resistors.push({ id: it.id, a: nL, b: nR, R: Math.max(1e-9, Number(it.R || 30)) });
      if (it.type === "switch") resistors.push({ id: it.id, a: nL, b: nR, R: it.closed ? R_SHORT : R_OPEN });
      if (it.type === "ammeter") resistors.push({ id: it.id, a: nL, b: nR, R: R_SHORT });

      if (it.type === "battery") {
        const V = Number(it.V || 0);
        const Rint = Math.max(0, Number(it.Rint ?? 0));

        if (disableVoltageSources) {
          // turn off source => ideal V becomes short, keep Rint between terminals
          resistors.push({ id: it.id, a: nL, b: nR, R: Rint > 0 ? Rint : R_SHORT });
        } else {
          if (Rint <= 0) {
            // ideal source directly between terminals
            vsources.push({ id: it.id, a: nR, b: nL, V });
          } else {
            // internal node + series resistor
            const nInt = allocVirtualNet();
            vsources.push({ id: it.id, a: nInt, b: nL, V }); // V(nInt)-V(nL)=V
            resistors.push({ id: it.id + "_rint", a: nInt, b: nR, R: Rint });
          }
        }
      }
    }

    return { netOfNode, netCount, groundNet, resistors, vsources };
  }

  function solveNormalDC() {
    const c = buildCircuit({ disableVoltageSources: false });
    if (!c) return null;
    if (c.vsources.length === 0) return null;

    const solved = solveMNA({
      resistors: c.resistors,
      vsources: c.vsources,
      groundNet: c.groundNet,
      netCount: c.netCount,
    });
    if (!solved) return null;

    return { ...c, ...solved };
  }

  function voltageAcross(sol, itemId) {
    const nL = getNetForCompTerminal(sol.netOfNode, itemId, "L");
    const nR = getNetForCompTerminal(sol.netOfNode, itemId, "R");
    if (!nL || !nR) return null;
    const vL = sol.Vnet.get(nL) ?? 0;
    const vR = sol.Vnet.get(nR) ?? 0;
    return vR - vL;
  }

  function currentThroughAsResistor(sol, itemId, R) {
    const dv = voltageAcross(sol, itemId);
    if (dv == null) return null;
    return dv / Math.max(1e-12, R);
  }

  function equivalentResistanceForOhmmeter(ohmId) {
    const base = buildCircuit({ disableVoltageSources: true });
    if (!base) return null;

    const nL = getNetForCompTerminal(base.netOfNode, ohmId, "L");
    const nR = getNetForCompTerminal(base.netOfNode, ohmId, "R");
    if (!nL || !nR) return null;
    if (nL === nR) return 0;

    const testId = "__test__";
    const vsources = [{ id: testId, a: nR, b: nL, V: 1 }];

    const solved = solveMNA({
      resistors: base.resistors,
      vsources,
      groundNet: base.groundNet,
      netCount: base.netCount,
    });
    if (!solved) return null;

    const Itest = solved.Ivs.get(testId);
    if (!Number.isFinite(Itest) || Math.abs(Itest) < 1e-15) return null;

    return Math.abs(1 / Itest);
  }

  /** ===========================
   *  Formatting
   *  =========================== */
  function formatSI(val, unit) {
    if (!Number.isFinite(val)) return "—";
    const abs = Math.abs(val);

    const scales = [
      { f: 1e9, s: "G" },
      { f: 1e6, s: "M" },
      { f: 1e3, s: "k" },
      { f: 1, s: "" },
      { f: 1e-3, s: "m" },
      { f: 1e-6, s: "µ" },
      { f: 1e-9, s: "n" },
    ];

    let chosen = scales.find((sc) => abs >= sc.f) || scales[scales.length - 1];
    if (abs === 0) chosen = scales[3];

    const num = val / chosen.f;
    const rounded = Math.abs(num) >= 100 ? num.toFixed(0) : Math.abs(num) >= 10 ? num.toFixed(1) : num.toFixed(2);
    return `${rounded} ${chosen.s}${unit}`;
  }

  /** ===========================
   *  Live solver -> UI (SAFE)
   *  =========================== */
  function solveAndUpdateUI() {
    const sol = solveNormalDC();
    state.sol = sol;

    for (const it of state.items) {
      if (it.type === "voltmeter") {
        let disp = "—";
        if (sol) {
          const dv = voltageAcross(sol, it.id);
          if (dv != null) disp = formatSI(dv, "V");
        }
        if (disp !== it.display) {
          it.display = disp;
          safeRerender(it);
        }
      }

      if (it.type === "ammeter") {
        let disp = "—";
        if (sol) {
          const I = currentThroughAsResistor(sol, it.id, 1e-6);
          if (I != null) disp = formatSI(I, "A");
        }
        if (disp !== it.display) {
          it.display = disp;
          safeRerender(it);
        }
      }

      if (it.type === "ohmmeter") {
        const Req = equivalentResistanceForOhmmeter(it.id);
        const disp = Req == null ? "—" : formatSI(Req, "Ω");
        if (disp !== it.display) {
          it.display = disp;
          safeRerender(it);
        }
      }

      if (it.type === "bulb") {
        let br = 0;
        if (sol) {
          const dv = voltageAcross(sol, it.id);
          const R = Math.max(1e-9, Number(it.R || 30));
          if (dv != null) {
            const P = (dv * dv) / R;
            const Pref = 1.5;
            br = clamp(P / Pref, 0, 1);
          }
        }
        if (Math.abs(br - (it.brightness || 0)) > 0.02) {
          it.brightness = br;
          safeRerender(it);
        }
      }
    }
  }

  /** ===========================
   *  SVGs
   *  =========================== */
  const DIGIT_COLOR = {
    0: "#111111",
    1: "#6b3f1d",
    2: "#c1121f",
    3: "#f77f00",
    4: "#fcbf49",
    5: "#2a9d3a",
    6: "#1d4ed8",
    7: "#7c3aed",
    8: "#6b7280",
    9: "#f3f4f6",
  };
  const MULT_COLOR = {
    "-2": "#bfbfbf",
    "-1": "#d4af37",
    "0": DIGIT_COLOR[0],
    "1": DIGIT_COLOR[1],
    "2": DIGIT_COLOR[2],
    "3": DIGIT_COLOR[3],
    "4": DIGIT_COLOR[4],
    "5": DIGIT_COLOR[5],
    "6": DIGIT_COLOR[6],
    "7": DIGIT_COLOR[7],
    "8": DIGIT_COLOR[8],
    "9": DIGIT_COLOR[9],
  };
  const TOL_COLOR = { brown: "#6b3f1d", red: "#c1121f", gold: "#d4af37", silver: "#bfbfbf" };

  function resistorBands5(Rohm) {
    let R = Number(Rohm);
    if (!Number.isFinite(R) || R <= 0) R = 1;

    let exp = Math.floor(Math.log10(R)) - 2;
    let sig = R / Math.pow(10, exp);
    let sigInt = Math.round(sig);

    if (sigInt >= 1000) {
      sigInt = 100;
      exp += 1;
    }

    const d1 = Math.floor(sigInt / 100) % 10;
    const d2 = Math.floor(sigInt / 10) % 10;
    const d3 = sigInt % 10;
    exp = clamp(exp, -2, 9);

    return { digits: [d1, d2, d3], multExp: exp };
  }

  function resistorSVG(Rohm, tolName = "brown") {
    const { digits, multExp } = resistorBands5(Rohm);
    const b1 = DIGIT_COLOR[digits[0]];
    const b2 = DIGIT_COLOR[digits[1]];
    const b3 = DIGIT_COLOR[digits[2]];
    const bm = MULT_COLOR[String(multExp)] ?? "#111";
    const bt = TOL_COLOR[tolName] ?? TOL_COLOR.brown;

    return `
<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="60" x2="70" y2="60" stroke="rgba(220,220,220,0.9)" stroke-width="10" stroke-linecap="round"/>
  <line x1="250" y1="60" x2="320" y2="60" stroke="rgba(220,220,220,0.9)" stroke-width="10" stroke-linecap="round"/>
  <rect x="70" y="22" rx="28" ry="28" width="180" height="76" fill="rgba(0,0,0,0.25)"/>
  <rect x="70" y="18" rx="28" ry="28" width="180" height="76" fill="#d8b27c" stroke="rgba(0,0,0,0.25)" stroke-width="3"/>
  <path d="M88 28 C 130 18, 190 18, 232 28" stroke="rgba(255,255,255,0.25)" stroke-width="6" fill="none" stroke-linecap="round"/>
  <rect x="105" y="18" width="16" height="76" fill="${b1}"/>
  <rect x="130" y="18" width="16" height="76" fill="${b2}"/>
  <rect x="155" y="18" width="16" height="76" fill="${b3}"/>
  <rect x="185" y="18" width="18" height="76" fill="${bm}"/>
  <rect x="225" y="18" width="12" height="76" fill="${bt}" opacity="0.95"/>
</svg>`.trim();
  }

  function meterSVG(type, valueText) {
    const title = type === "voltmeter" ? "V" : type === "ammeter" ? "A" : "Ω";
    const label = type === "voltmeter" ? "VOLTMETER" : type === "ammeter" ? "AMMETER" : "OHMMETER";
    return `
<svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.03)"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="240" height="140" rx="28" fill="url(#g)" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
  <text x="30" y="48" fill="rgba(255,255,255,0.75)" font-size="16" font-family="ui-sans-serif,system-ui" font-weight="700">${label}</text>
  <rect x="30" y="62" width="200" height="56" rx="14" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.10)"/>
  <text x="130" y="99" text-anchor="middle" fill="rgba(120,220,160,0.95)" font-size="22" font-family="ui-monospace, Menlo, monospace" font-weight="800">${escapeHtml(
    valueText
  )}</text>
  <circle cx="214" cy="44" r="18" fill="rgba(255,214,10,0.10)" stroke="rgba(255,214,10,0.25)"/>
  <text x="214" y="50" text-anchor="middle" fill="rgba(255,214,10,0.95)" font-size="18" font-family="ui-sans-serif,system-ui" font-weight="900">${title}</text>
  <circle cx="18" cy="80" r="6" fill="rgba(120,200,255,0.85)"/>
  <circle cx="242" cy="80" r="6" fill="rgba(120,200,255,0.85)"/>
</svg>`.trim();
  }

  function switchSVG(closed) {
    const lever = closed
      ? `<line x1="90" y1="80" x2="170" y2="80" stroke="rgba(255,214,10,0.95)" stroke-width="10" stroke-linecap="round"/>`
      : `<line x1="90" y1="80" x2="160" y2="55" stroke="rgba(255,214,10,0.95)" stroke-width="10" stroke-linecap="round"/>`;
    return `
<svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="240" height="140" rx="28" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
  <text x="30" y="48" fill="rgba(255,255,255,0.75)" font-size="16" font-family="ui-sans-serif,system-ui" font-weight="700">SWITCH</text>
  <line x1="18" y1="80" x2="80" y2="80" stroke="rgba(220,220,220,0.9)" stroke-width="8" stroke-linecap="round"/>
  <line x1="180" y1="80" x2="242" y2="80" stroke="rgba(220,220,220,0.9)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="90" cy="80" r="10" fill="rgba(120,200,255,0.85)"/>
  <circle cx="170" cy="80" r="10" fill="rgba(120,200,255,0.85)"/>
  ${lever}
  <text x="130" y="130" text-anchor="middle" fill="rgba(255,255,255,0.65)" font-size="14" font-family="ui-sans-serif,system-ui" font-weight="800">
    ${closed ? "CLOSED" : "OPEN"}
  </text>
</svg>`.trim();
  }

  function bulbSVG(brightness) {
    const b = clamp(Number(brightness) || 0, 0, 1);
    const glow = 0.12 + b * 0.55;
    const fill = 0.25 + b * 0.65;
    return `
<svg viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="240" height="160" rx="28" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
  <text x="30" y="48" fill="rgba(255,255,255,0.75)" font-size="16" font-family="ui-sans-serif,system-ui" font-weight="700">BULB</text>
  <circle cx="18" cy="90" r="6" fill="rgba(120,200,255,0.85)"/>
  <circle cx="242" cy="90" r="6" fill="rgba(120,200,255,0.85)"/>
  <line x1="18" y1="90" x2="70" y2="90" stroke="rgba(220,220,220,0.9)" stroke-width="8" stroke-linecap="round"/>
  <line x1="190" y1="90" x2="242" y2="90" stroke="rgba(220,220,220,0.9)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="130" cy="92" r="48" fill="rgba(255,214,10,${glow})"/>
  <path d="M130 55 C110 55, 95 72, 95 92 C95 118, 112 135, 130 135 C148 135, 165 118, 165 92 C165 72, 150 55, 130 55 Z"
        fill="rgba(255,214,10,${fill})" stroke="rgba(255,214,10,0.55)" stroke-width="3"/>
  <path d="M112 98 C 122 86, 138 86, 148 98" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="4" stroke-linecap="round"/>
  <rect x="112" y="135" width="36" height="18" rx="6" fill="rgba(220,220,220,0.55)" stroke="rgba(255,255,255,0.15)"/>
  <text x="130" y="165" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-size="12" font-family="ui-sans-serif,system-ui" font-weight="800">
    ${Math.round(b * 100)}%
  </text>
</svg>`.trim();
  }

  function renderItemSVGorIMG(it) {
    if (it.type === "battery") {
      const spr = LIBRARY.flatMap((c) => c.items).find((x) => x.type === "battery")?.sprite;
      return `<img src="${spr}" alt="battery" draggable="false" />`;
    }
    if (it.type === "resistor") return resistorSVG(it.R, it.tol || "brown");
    if (it.type === "voltmeter") return meterSVG("voltmeter", it.display || "—");
    if (it.type === "ammeter") return meterSVG("ammeter", it.display || "—");
    if (it.type === "ohmmeter") return meterSVG("ohmmeter", it.display || "—");
    if (it.type === "switch") return switchSVG(!!it.closed);
    if (it.type === "bulb") return bulbSVG(it.brightness || 0);
    return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)"/></svg>`;
  }

  /** ===========================
   *  Init
   *  =========================== */
  window.addEventListener("resize", resizeCanvas);
  renderLibrary("");
  renderInspector();
  resizeCanvas();
  setMode("select", true);
  renderAllOnce();
  status("Ready");
})();
