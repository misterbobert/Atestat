import { useRef } from "react";
import React from "react"
import { useCanvasRenderer } from "../../hooks/useCanvasRenderer";

export default function CanvasStage() {
  const canvasRef = useRef(null);
  useCanvasRenderer(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}