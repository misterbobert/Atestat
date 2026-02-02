import Topbar from "../layout/Topbar";
import Workspace from "./Workspace";
import Inspector from "./Inspector";
import { VoltLabProvider } from "../../hooks/useVoltLabStore.jsx";
import React from "react"

export default function LabShell() {
  return (
    <VoltLabProvider>
      <div className="min-h-screen">
        <Topbar />
        <main className="mx-auto max-w-[1400px] p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <Workspace />
            <Inspector />
          </div>
        </main>
      </div>
    </VoltLabProvider>
  );
}