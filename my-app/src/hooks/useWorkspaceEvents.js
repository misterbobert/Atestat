import { useEffect } from "react";
import { useVoltLab } from "./useVoltLabStore.jsx";
import { screenToWorld } from "../core/coords";
import { clamp } from "../core/utils";
import { recalcItemNodes } from "../core/defaults";

export function useWorkspaceEvents(workspaceRef, overlayRef) {
  const { state, actions, dispatch } = useVoltLab();

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    function getLocal(e) {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function isBackgroundTarget(target) {
      // background = workspace root sau overlay root (nu panouri/UI)
      return target === el || target === overlayRef.current;
    }

    function onMouseDown(e) {
      // acceptăm doar click pe fundal (workspace/overlay), nu pe UI/panouri
      if (!isBackgroundTarget(e.target)) return;

      // deselect doar în select mode
      if (state.mode === "select") {
        dispatch({ type: "SET_SELECTED", id: null });
      }

      // ✅ PAN cu left-drag DOAR în select mode (ca să nu strice wire)
      if (e.button === 0 && state.mode === "select") {
        dispatch({
          type: "SET_CAM",
          cam: {
            ...state.cam,
            __panCandidate: {
              sx: e.clientX,
              sy: e.clientY,
              x: state.cam.x,
              y: state.cam.y,
              started: false,
            },
          },
        });
        return;
      }

      // pan start (right click or middle) – permis în orice mode
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        dispatch({
          type: "SET_CAM",
          cam: {
            ...state.cam,
            __pan: { sx: e.clientX, sy: e.clientY, x: state.cam.x, y: state.cam.y },
          },
        });
      }
    }

    function onMouseMove(e) {
      // ✅ left-pan candidate (select mode only)
      const cand = state.cam.__panCandidate;
      if (cand) {
        const dx = e.clientX - cand.sx;
        const dy = e.clientY - cand.sy;

        if (!cand.started) {
          // threshold mic ca să nu pornească pan la click simplu
          if (Math.abs(dx) + Math.abs(dy) > 3) {
            dispatch({
              type: "SET_CAM",
              cam: { ...state.cam, __panCandidate: { ...cand, started: true } },
            });
          }
        }

        if (cand.started) {
          actions.setCam({ x: cand.x + dx, y: cand.y + dy });
        }
      }

      // pan (middle/right)
      const pan = state.cam.__pan;
      if (pan) {
        const dx = e.clientX - pan.sx;
        const dy = e.clientY - pan.sy;
        actions.setCam({ x: pan.x + dx, y: pan.y + dy });
      }

      // drag item
      const drag = state.cam.__drag;
      if (drag) {
        const r = el.getBoundingClientRect();
        const sx = e.clientX - r.left;
        const sy = e.clientY - r.top;
        const w = screenToWorld(sx, sy, state.cam);

        const movedItem = state.items.find((it) => it.id === drag.id);
        if (!movedItem) return;

        const nextItem = { ...movedItem, x: w.x - drag.dx, y: w.y - drag.dy };
        const items = state.items.map((it) => (it.id === drag.id ? nextItem : it));
        const nodes = recalcItemNodes(nextItem, state.nodes);

        dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes, wires: state.wires });
      }

      // wire preview
      if (state.mode === "wire") {
        const loc = getLocal(e);
        const w = screenToWorld(loc.x, loc.y, state.cam);
        dispatch({ type: "SET_WIRE_STATE", wire: { previewWorld: w } });
      }
    }

    function onMouseUp() {
      // dacă am avut doar click (fără drag) în select mode, păstrăm comportamentul de deselect (deja făcut la mousedown)
      if (state.cam.__panCandidate) {
        dispatch({ type: "SET_CAM", cam: { ...state.cam, __panCandidate: null } });
      }
      if (state.cam.__pan) {
        dispatch({ type: "SET_CAM", cam: { ...state.cam, __pan: null } });
      }
      if (state.cam.__drag) {
        dispatch({ type: "SET_CAM", cam: { ...state.cam, __drag: null } });
      }
    }

    // ✅ ZOOM pe cursor
    function onWheel(e) {
      e.preventDefault();

      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;

      // world coord sub cursor înainte de zoom
      const w = screenToWorld(sx, sy, state.cam);

      const delta = -e.deltaY;
      const newZ = clamp(state.cam.z * (delta > 0 ? 1.08 : 0.92), 0.25, 3.0);

      // păstrăm w sub cursor după zoom
      const newX = sx - w.x * newZ;
      const newY = sy - w.y * newZ;

      actions.setCam({ x: newX, y: newY, z: newZ });
    }

    function onContextMenu(e) {
      e.preventDefault();
    }

    function onClick(e) {
      if (state.mode !== "wire") return;

      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const w = screenToWorld(sx, sy, state.cam);

      // pick nearest node within radius
      let best = null;
      let bestD = 999999;

      for (const n of state.nodes) {
        const dx = n.x - w.x;
        const dy = n.y - w.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }

      const hit = best && bestD < 26 * 26 ? best : null;

      // 1) start fir
      if (!state.wire.startNodeId) {
        if (!hit) return;
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: hit.id, points: [], previewWorld: w } });
        return;
      }

      // 2) finalizează pe nod
      if (hit) {
        actions.addWire(state.wire.startNodeId, hit.id, state.wire.points || []);
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, points: [], previewWorld: null } });
        return;
      }

      // 3) adaugă colț pe background
      const pts = state.wire.points || [];
      dispatch({ type: "SET_WIRE_STATE", wire: { points: [...pts, w], previewWorld: w } });
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, points: [], previewWorld: null } });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
        return;
      }

      if (e.key === "Delete" ) {
        if (state.selectedId) actions.deleteItem(state.selectedId);
      }

      if (e.key.toLowerCase() === "w") actions.setMode("wire");
      if (e.key.toLowerCase() === "s") actions.setMode("select");
    }

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", onClick);
    el.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", onClick);
      el.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [workspaceRef, overlayRef, state, actions, dispatch]);
}