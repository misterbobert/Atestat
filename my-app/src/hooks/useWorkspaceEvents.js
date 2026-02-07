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

    function onMouseDown(e) {
      console.log("mousedown", tool);
      // click on background
      if (e.target !== el && e.target !== overlayRef.current && !el.contains(e.target)) return;

      if (state.mode === "select") {
        dispatch({ type: "SET_SELECTED", id: null });
      }

      // pan start (right click or middle)
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        dispatch({
          type: "SET_CAM",
          cam: { ...state.cam, __pan: { sx: e.clientX, sy: e.clientY, x: state.cam.x, y: state.cam.y } },
        });
      }
    }

    function onMouseMove(e) {
      // pan
      const pan = state.cam.__pan;
      if (pan) {
        const dx = e.clientX - pan.sx;
        const dy = e.clientY - pan.sy;
        actions.setCam({ x: pan.x + dx, y: pan.y + dy });
      }

      // drag
      const drag = state.cam.__drag;
      if (drag) {
        const r = el.getBoundingClientRect();
        const sx = e.clientX - r.left;
        const sy = e.clientY - r.top;
        const w = screenToWorld(sx, sy, state.cam);

        // 1) item nou (mutat)
        const movedItem = state.items.find((it) => it.id === drag.id);
        if (!movedItem) return;

        const nextItem = { ...movedItem, x: w.x - drag.dx, y: w.y - drag.dy };

        // 2) items actualizate
        const items = state.items.map((it) => (it.id === drag.id ? nextItem : it));

        // 3) nodes recalculate doar pentru itemul mutat
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
      if (state.cam.__pan) {
        dispatch({ type: "SET_CAM", cam: { ...state.cam, __pan: null } });
      }
      if (state.cam.__drag) {
        dispatch({ type: "SET_CAM", cam: { ...state.cam, __drag: null } });
      }
    }

    function onWheel(e) {
      e.preventDefault();
      const delta = -e.deltaY;
      const z = clamp(state.cam.z * (delta > 0 ? 1.08 : 0.92), 0.25, 3.0);
      actions.setCam({ z });
    }

    function onContextMenu(e) {
      e.preventDefault();
    }

    // wire click selecting nodes
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
      if (!hit) return;

      if (!state.wire.startNodeId) {
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: hit.id } });
      } else {
        actions.addWire(state.wire.startNodeId, hit.id);
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null } });
      }
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
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