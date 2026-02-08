import React, { useRef } from "react";
import CanvasStage from "./CanvasStage";
import Overlay from "./Overlay";
import HintBar from "./HintBar";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import { useWorkspaceEvents } from "../../hooks/useWorkspaceEvents";

export default function Workspace() {
  const workspaceRef = useRef(null);
  const overlayRef = useRef(null);

  const { actions } = useVoltLab();
  useWorkspaceEvents(workspaceRef, overlayRef);

  return (
    <div
      ref={workspaceRef}
      className="absolute inset-0 z-0 overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => actions.handleDrop(e, workspaceRef)}
    >
      <CanvasStage />
      <Overlay overlayRef={overlayRef} />
      <HintBar />
    </div>
  );
}