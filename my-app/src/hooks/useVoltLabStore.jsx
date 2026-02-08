import React, { createContext, useContext, useMemo, useReducer, useRef } from "react";
import { defaultPropsForType, makeItemWithNodes, recalcAllNodes } from "../core/defaults";
import { clamp } from "../core/utils";
import { screenToWorld } from "../core/coords";
import { solveNormalDC, applySolutionToItems } from "../core/circuitBuilder";
import { useHistoryCore } from "./useHistory";

const Ctx = createContext(null);

const initialState = {
  mode: "select",
  running: false,
  isRunning: false, // ✅ compat
  statusText: "Ready",

  items: [],
  nodes: [],
  wires: [],

  selectedId: null,

  cam: { x: 0, y: 0, z: 1 },

  wire: {
    startNodeId: null,
    previewWorld: null,
  },

  sol: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_MODE":
      return {
        ...state,
        mode: action.mode,
        wire: action.mode === "wire" ? state.wire : { startNodeId: null, previewWorld: null },
      };

    case "SET_STATUS":
      return { ...state, statusText: action.text };

    case "SET_CAM":
      return { ...state, cam: action.cam };

    case "SET_SELECTED":
      return { ...state, selectedId: action.id };

    case "SET_ITEMS_NODES_WIRES": {
      const nodes = recalcAllNodes(action.items, action.nodes);
      return { ...state, items: action.items, nodes, wires: action.wires };
    }

    case "SET_WIRE_STATE":
      return { ...state, wire: { ...state.wire, ...action.wire } };

    case "SET_RUNNING":
      return { ...state, running: action.running, isRunning: action.running };

    case "SET_SOLUTION":
      return { ...state, sol: action.sol };

    default:
      return state;
  }
}

export function VoltLabProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ca să putem calcula coordonate la drag/drag-drop
  const workspaceElRef = useRef(null);

  const history = useHistoryCore({
    getSnapshot: () => ({
      items: state.items,
      nodes: state.nodes,
      wires: state.wires,
      selectedId: state.selectedId,
      cam: state.cam,
      mode: state.mode,
    }),
    restoreSnapshot: (snap) => {
      dispatch({ type: "SET_RUNNING", running: false });
      dispatch({ type: "SET_SOLUTION", sol: null });
      dispatch({
        type: "SET_ITEMS_NODES_WIRES",
        items: snap.items ?? state.items,
        nodes: snap.nodes ?? state.nodes,
        wires: snap.wires ?? state.wires,
      });
      dispatch({ type: "SET_SELECTED", id: snap.selectedId ?? null });
      dispatch({ type: "SET_CAM", cam: snap.cam ?? state.cam });
      dispatch({ type: "SET_MODE", mode: snap.mode ?? "select" });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
    },
  });

  const actions = useMemo(() => {
    function pushHistory(label) {
      history.push(label);
    }

    function setStatus(text) {
      dispatch({ type: "SET_STATUS", text });
    }

    function setMode(mode) {
      dispatch({ type: "SET_MODE", mode });
      setStatus(mode === "wire" ? "Wire mode" : "Select mode");
    }

    function setCam(patch) {
      const cam = {
        ...state.cam,
        ...patch,
        z: clamp(patch.z ?? state.cam.z, 0.25, 3.0),
      };
      dispatch({ type: "SET_CAM", cam });
    }

    function addItemAt(type, worldX, worldY) {
      const base = defaultPropsForType(type);
      const { item, nodes } = makeItemWithNodes(type, worldX, worldY, base);

      const items = [...state.items, item];
      const allNodes = [...state.nodes, ...nodes];

      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes: allNodes, wires: state.wires });
      dispatch({ type: "SET_SELECTED", id: item.id });
      pushHistory("add");
      setStatus(`Placed ${type}`);
    }

    function updateItem(id, patch) {
      const items = state.items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes: state.nodes, wires: state.wires });
      pushHistory("edit");
    }

    function deleteItem(id) {
      const item = state.items.find((x) => x.id === id);
      if (!item) return;

      const items = state.items.filter((x) => x.id !== id);
      const nodes = state.nodes.filter((n) => n.itemId !== id);

      // scoate firele care aveau noduri șterse
      const alive = new Set(nodes.map((n) => n.id));
      const wires = state.wires.filter((w) => alive.has(w.aNodeId) && alive.has(w.bNodeId));

      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes, wires });
      dispatch({ type: "SET_SELECTED", id: null });
      dispatch({ type: "SET_SOLUTION", sol: null });
      dispatch({ type: "SET_RUNNING", running: false });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
      pushHistory("delete");
    }

    function clearWires() {
      dispatch({ type: "SET_ITEMS_NODES_WIRES", items: state.items, nodes: state.nodes, wires: [] });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
      pushHistory("clear wires");
      setStatus("Cleared wires");
    }

    // ✅ IMPORTANT: handleDrop compat cu ambele stiluri
    // - vechi: handleDrop(e, workspaceRef)
    // - nou: handleDrop(type, clientX, clientY, workspaceEl)
    function handleDrop(...args) {
      // (e, workspaceRef)
      if (args[0] && typeof args[0] === "object" && "dataTransfer" in args[0]) {
        const e = args[0];
        const workspaceRef = args[1];

        e.preventDefault();

        const el = workspaceRef?.current ?? workspaceElRef.current;
        if (!el) return;

        workspaceElRef.current = el;

        let payload = null;
        try {
          payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
        } catch {
          payload = null;
        }
        if (!payload?.type) return;

        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const w = screenToWorld(sx, sy, state.cam);

        addItemAt(payload.type, w.x, w.y);
        return;
      }

      // (type, clientX, clientY, workspaceEl)
      const [type, clientX, clientY, workspaceEl] = args;
      if (!type || !workspaceEl) return;

      workspaceElRef.current = workspaceEl;

      const rect = workspaceEl.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const w = screenToWorld(sx, sy, state.cam);

      addItemAt(type, w.x, w.y);
    }

    function onItemMouseDown(itemId, e) {
      e.stopPropagation?.();
      dispatch({ type: "SET_SELECTED", id: itemId });
      if (state.mode !== "select") return;

      const el = workspaceElRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy, state.cam);

      const it = state.items.find((x) => x.id === itemId);
      if (!it) return;

      dispatch({
        type: "SET_CAM",
        cam: { ...state.cam, __drag: { id: itemId, dx: w.x - it.x, dy: w.y - it.y } },
      });
    }

    function addWire(aNodeId, bNodeId) {
      if (!aNodeId || !bNodeId || aNodeId === bNodeId) return;

      const exists = state.wires.some(
        (w) =>
          (w.aNodeId === aNodeId && w.bNodeId === bNodeId) ||
          (w.aNodeId === bNodeId && w.bNodeId === aNodeId)
      );
      if (exists) return;

      const wire = { aNodeId, bNodeId };

      dispatch({
        type: "SET_ITEMS_NODES_WIRES",
        items: state.items,
        nodes: state.nodes,
        wires: [...state.wires, wire],
      });
      pushHistory("wire");
    }

    // ▶ Play / Stop
    function play() {
      dispatch({ type: "SET_RUNNING", running: true });
      dispatch({ type: "SET_STATUS", text: "Solving..." });

      const sol = solveNormalDC(state.items, state.nodes, state.wires);
      dispatch({ type: "SET_SOLUTION", sol });

      const items = applySolutionToItems(state.items, state.nodes, sol);
      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes: state.nodes, wires: state.wires });

      dispatch({ type: "SET_STATUS", text: sol?.ok ? "Running" : "Solve failed" });
    }

    function stop() {
      dispatch({ type: "SET_RUNNING", running: false });
      dispatch({ type: "SET_SOLUTION", sol: null });

      const items = state.items.map((it) => {
        const copy = { ...it };
        if (copy.type === "voltmeter" || copy.type === "ammeter" || copy.type === "ohmmeter") copy.display = "—";
        if (copy.type === "bulb") copy.brightness = 0;
        return copy;
      });

      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes: state.nodes, wires: state.wires });
      dispatch({ type: "SET_STATUS", text: "Stopped" });
    }

    function undo() {
      history.undo();
    }
    function redo() {
      history.redo();
    }

    return {
      setMode,
      setStatus,
      setCam,

      handleDrop,
      onItemMouseDown,
      addWire,

      updateItem,
      deleteItem,
      clearWires,

      play,
      stop,

      undo,
      redo,
    };
  }, [state, history]);

  const value = useMemo(() => ({ state, dispatch, actions, history }), [state, actions, history]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoltLab() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVoltLab must be used inside VoltLabProvider");
  return v;
}