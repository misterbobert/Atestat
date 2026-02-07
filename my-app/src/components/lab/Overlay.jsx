import React from "react";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import { worldToScreen } from "../../core/coords";
import { renderItemSVG } from "../../core/defaults";

function Comp({ item, selected, onSelect, cam }) {
  const p = worldToScreen(item.x, item.y, cam);
  const size = (item.sizePct ?? 100) / 100;
  const w = 200 * size * cam.z;
  const h = 120 * size * cam.z;

  return (
    <div
      className={[
        "absolute select-none",
        selected ? "ring-2 ring-cyan-300/70" : "ring-1 ring-white/10",
        "rounded-2xl bg-white/5 backdrop-blur",
        "z-20", // items sub noduri
      ].join(" ")}
      style={{
        left: p.x - w / 2,
        top: p.y - h / 2,
        width: w,
        height: h,
        transform: `rotate(${item.rot ?? 0}deg)`,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(item.id, e);
      }}
    >
      {/* IMPORTANT: SVG-ul nu trebuie să prindă click-uri */}
      <div
        className="w-full h-full pointer-events-none"
        dangerouslySetInnerHTML={{ __html: renderItemSVG(item) }}
      />
    </div>
  );
}

function NodePin({ node, cam, active, onMouseDown }) {
  const p = worldToScreen(node.x, node.y, cam);

  // mărime constantă pe ecran (ca să rămână ușor de prins la zoom)
  const r = 7;

  return (
    <div
      className={[
        "absolute rounded-full",
        active ? "bg-cyan-200 ring-2 ring-cyan-200/80" : "bg-cyan-300/90 ring-1 ring-black/40",
        "shadow",
        "pointer-events-auto",
      ].join(" ")}
      style={{
        left: p.x - r,
        top: p.y - r,
        width: r * 2,
        height: r * 2,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onMouseDown(node, e);
      }}
      title={`${node.itemId}:${node.name ?? ""}`}
    />
  );
}

export default function Overlay({ overlayRef }) {
  const { state, actions, dispatch } = useVoltLab();
  const cam = state.cam;

  function handleNodeDown(node) {
    // în select mode nu pornim drag de pe pin (doar prevenim să fie “în spate”)
    if (state.mode !== "wire") return;

    if (!state.wire.startNodeId) {
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: node.id } });
    } else {
      actions.addWire(state.wire.startNodeId, node.id);
      dispatch({ type: "SET_WIRE_STATE", wire: { startNodeId: null, previewWorld: null } });
    }
  }

  return (
    <div ref={overlayRef} className="absolute inset-0">
      {/* Items */}
      {state.items.map((it) => (
        <Comp
          key={it.id}
          item={it}
          cam={cam}
          selected={state.selectedId === it.id}
          onSelect={actions.onItemMouseDown}
        />
      ))}

      {/* Nodes layer ABOVE items */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {state.nodes.map((n) => (
          <NodePin
            key={n.id}
            node={n}
            cam={cam}
            active={state.wire.startNodeId === n.id}
            onMouseDown={handleNodeDown}
          />
        ))}
      </div>
    </div>
  );
}