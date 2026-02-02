import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import React from "react"

function Btn({ active, onClick, children, danger }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm transition",
        danger
          ? "border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/15"
          : active
          ? "border-white/20 bg-white/10"
          : "border-white/10 bg-white/5 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  const { state, actions } = useVoltLab();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Btn active={state.mode === "select"} onClick={() => actions.setMode("select")}>
        Select
      </Btn>
      <Btn active={state.mode === "wire"} onClick={() => actions.setMode("wire")}>
        Wire
      </Btn>

      <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />

      {!state.running ? (
        <Btn onClick={() => actions.play()} active={false}>
          ▶ Play
        </Btn>
      ) : (
        <Btn onClick={() => actions.stop()} active={false}>
          ⏹ Stop
        </Btn>
      )}

      <Btn danger onClick={() => actions.clearWires()}>
        Clear wires
      </Btn>

      <div className="mx-1 hidden h-6 w-px bg-white/10 md:block" />

      <Btn onClick={() => actions.undo()}>↶ Undo</Btn>
      <Btn onClick={() => actions.redo()}>↷ Redo</Btn>
    </div>
  );
}