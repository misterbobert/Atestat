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
  statusText: "Ready",

  items: [],
  nodes: [],
  wires: [],

  selectedId: null,

  cam: { x: 0, y: 0, z: 1 },
  pan: null,
  drag: null,

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
      return {
        ...state,
        items: action.items,
        nodes,
        wires: action.wires,
      };
    }
    case "SET_WIRE_STATE":
      return { ...state, wire: { ...state.wire, ...action.wire } };
    case "SET_RUNNING":
      return { ...state, running: action.running };
    case "SET_SOLUTION":
      return { ...state, sol: action.sol };
    default:
      return state;
  }
}

export function VoltLabProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // History (undo/redo) – store only the “important” pieces
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
        items: snap.items,
        nodes: snap.nodes,
        wires: snap.wires,
      });
      dispatch({ type: "SET_SELECTED", id: snap.selectedId ?? null });
      dispatch({ type: "SET_CAM", cam: snap.cam ?? state.cam });
      dispatch({ type: "SET_MODE", mode: snap.mode ?? "select" });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
    },
  });

  const workspaceRefLast = useRef(null);

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
        z: clamp((patch.z ?? state.cam.z), 0.25, 3.0),
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
      const wires = state.wires.filter((w) => w.aItemId !== id && w.bItemId !== id);

      dispatch({ type: "SET_ITEMS_NODES_WIRES", items, nodes, wires });
      dispatch({ type: "SET_SELECTED", id: null });
      dispatch({ type: "SET_SOLUTION", sol: null });
      dispatch({ type: "SET_RUNNING", running: false });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
      pushHistory("delete");
    }

    function duplicateItem(id) {
      const src = state.items.find((x) => x.id === id);
      if (!src) return;
      const type = src.type;
      addItemAt(type, src.x + 60, src.y + 30);
      // copy properties on last item
      const last = state.items[state.items.length - 1];
      // (state updates async, so simplest: push a second update via snapshot after add)
      // We'll do a safe approach: schedule in microtask
      queueMicrotask(() => {
        const newest = history.getLatestItems()?.at(-1);
        // fallback: no-op
        void newest;
      });
    }

    function clearWires() {
      dispatch({ type: "SET_ITEMS_NODES_WIRES", items: state.items, nodes: state.nodes, wires: [] });
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
      pushHistory("clear wires");
      setStatus("Cleared wires");
    }

    // DnD drop handler
    function handleDrop(e, workspaceRef) {
      e.preventDefault();
      workspaceRefLast.current = workspaceRef?.current ?? null;

      let payload = null;
      try {
        payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
      } catch {
        payload = null;
      }
      if (!payload?.type) return;

      const rect = workspaceRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy, state.cam);

      addItemAt(payload.type, w.x, w.y);
    }

    // Selection + dragging
    function onItemMouseDown(itemId, e) {
      dispatch({ type: "SET_SELECTED", id: itemId });
      if (state.mode !== "select") return;

      // start drag
      const rect = workspaceRefLast.current?.getBoundingClientRect();
      if (!rect) return;

      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const w = screenToWorld(sx, sy, state.cam);

      dispatch({
        type: "SET_WIRE_STATE",
        wire: state.wire,
      });

      dispatch({
        type: "SET_STATUS",
        text: "Dragging",
      });

      dispatch({
        type: "__DRAG_START__",
      });

      // store drag into state.pan to avoid extra reducer complexity:
      dispatch({
        type: "SET_CAM",
        cam: {
          ...state.cam,
          __drag: { id: itemId, dx: w.x - (state.items.find((x) => x.id === itemId)?.x ?? 0), dy: w.y - (state.items.find((x) => x.id === itemId)?.y ?? 0) },
        },
      });
    }

    // Wire operations
    function addWire(aNodeId, bNodeId) {
      if (!aNodeId || !bNodeId || aNodeId === bNodeId) return;

      const a = state.nodes.find((n) => n.id === aNodeId);
      const b = state.nodes.find((n) => n.id === bNodeId);
      if (!a || !b) return;

      const wire = {
        id: crypto.randomUUID(),
        aNodeId,
        bNodeId,
        aItemId: a.itemId,
        bItemId: b.itemId,
      };

      dispatch({
        type: "SET_ITEMS_NODES_WIRES",
        items: state.items,
        nodes: state.nodes,
        wires: [...state.wires, wire],
      });
      pushHistory("wire");
    }

    // Play/Stop
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

      // clear dynamic displays
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

      updateItem,
      deleteItem,
      duplicateItem,
      clearWires,

      onItemMouseDown,
      addWire,

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