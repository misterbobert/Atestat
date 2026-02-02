import { useEffect } from "react";
import { useVoltLab } from "./useVoltLabStore.jsx";
import { drawInfiniteGrid, drawWires } from "../core/coords";

export function useCanvasRenderer(canvasRef) {
  const { state } = useVoltLab();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // clear
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // grid
    drawInfiniteGrid(ctx, canvas.clientWidth, canvas.clientHeight, state.cam);

    // wires
    drawWires(ctx, state.nodes, state.wires, state.cam, state.wire);

  }, [canvasRef, state.cam, state.nodes, state.wires, state.wire]);
}