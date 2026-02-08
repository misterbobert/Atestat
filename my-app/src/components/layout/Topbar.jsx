import React from "react";
import Toolbar from "../lab/Toolbar";
import StatusPill from "./StatusPill";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";

export default function Topbar() {
  const { state } = useVoltLab();

  return (
    <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0b0f17]/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 shadow">
            <span className="text-xl">⚡</span>
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">VoltLab</div>
            <div className="text-xs text-white/60">Circuit Sandbox</div>
          </div>
        </div>

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