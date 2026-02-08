import Toolbar from "../lab/Toolbar";
import StatusPill from "./StatusPill";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import React from "react"

export default function Topbar() {
  const { state } = useVoltLab();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f17]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3" />
        <Toolbar />

        <div className="flex items-center gap-2">
          <StatusPill
            tone={state.running ? "ok" : "idle"}
            text={state.statusText || (state.running ? "Running" : "Ready")}
          />
        </div>
      </div>
    </header>
  );
}