import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import React from "react"

export default function HintBar() {
  const { state } = useVoltLab();

  const text =
    state.mode === "wire"
      ? "Wire mode: click a node, then click another node to connect. ESC cancels."
      : "Select mode: drag items, click to select. DEL deletes. Ctrl+Z undo.";

  return (
    <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 backdrop-blur">
      {text}
    </div>
  );
}
