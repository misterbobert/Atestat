import { useRef } from "react";

export function useHistoryCore({ getSnapshot, restoreSnapshot }) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  function push(label) {
    const snap = getSnapshot();
    pastRef.current.push({ label, snap });
    futureRef.current = [];
  }

  function undo() {
    const past = pastRef.current;
    if (!past.length) return;
    const current = getSnapshot();
    const last = past.pop();
    futureRef.current.push({ label: "redo", snap: current });
    restoreSnapshot(last.snap);
  }

  function redo() {
    const future = futureRef.current;
    if (!future.length) return;
    const current = getSnapshot();
    const next = future.pop();
    pastRef.current.push({ label: "undo", snap: current });
    restoreSnapshot(next.snap);
  }

  // optional helper (used in provider placeholder)
  function getLatestItems() {
    const last = pastRef.current.at(-1)?.snap;
    return last?.items ?? null;
  }

  return { push, undo, redo, getLatestItems };
}