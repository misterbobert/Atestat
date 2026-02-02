import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import { worldToScreen } from "../../core/coords";
import { renderItemSVG } from "../../core/defaults";
import React from "react"

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
      dangerouslySetInnerHTML={{ __html: renderItemSVG(item) }}
    />
  );
}

export default function Overlay({ overlayRef }) {
  const { state, actions } = useVoltLab();
  const cam = state.cam;

  return (
    <div ref={overlayRef} className="absolute inset-0">
      {state.items.map((it) => (
        <Comp
          key={it.id}
          item={it}
          cam={cam}
          selected={state.selectedId === it.id}
          onSelect={actions.onItemMouseDown}
        />
      ))}
    </div>
  );
}