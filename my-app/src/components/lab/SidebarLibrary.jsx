import { useMemo, useState } from "react";
import { LIBRARY } from "../../core/library";
import React from "react"

function ItemCard({ it }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: it.type }));
      }}
      className="cursor-grab rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 active:cursor-grabbing"
      title={it.meta || ""}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{it.label}</div>
        <div className="text-lg">{it.icon}</div>
      </div>
      {it.meta ? <div className="mt-1 text-xs text-white/60">{it.meta}</div> : null}
    </div>
  );
}

export default function SidebarLibrary() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return LIBRARY;
    return LIBRARY.map((c) => ({
      ...c,
      items: c.items.filter(
        (x) =>
          x.label.toLowerCase().includes(qq) ||
          x.type.toLowerCase().includes(qq) ||
          (x.meta || "").toLowerCase().includes(qq)
      ),
    })).filter((c) => c.items.length);
  }, [q]);

  return (
    <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search components..."
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
        />
      </div>

      <div className="space-y-4">
        {filtered.map((cat) => (
          <div key={cat.id}>
            <div className="mb-2 text-xs font-semibold tracking-wide text-white/60">
              {cat.name}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {cat.items.map((it) => (
                <ItemCard key={it.type} it={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}