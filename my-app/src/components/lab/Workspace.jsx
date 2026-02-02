import React from "react"
import { useRef } from "react";
import CanvasStage from "./CanvasStage";
import Overlay from "./Overlay";
import SidebarLibrary from "./SidebarLibrary";
import HintBar from "./HintBar";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";

export default function Workspace() {
  const workspaceRef = useRef(null);
  const overlayRef = useRef(null);

  const { actions } = useVoltLab();
  useWorkspaceEvents(workspaceRef, overlayRef);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div
          ref={workspaceRef}
          className="relative min-h-[520px] overflow-hidden rounded-[22px] lg:rounded-r-none"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => actions.handleDrop(e, workspaceRef)}
        >
          <CanvasStage />
          <Overlay overlayRef={overlayRef} />
          <HintBar />
        </div>

        <SidebarLibrary />
      </div>
    </section>
  );
}