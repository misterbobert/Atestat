import { useMemo } from "react";
import { useVoltLab } from "../../hooks/useVoltLabStore.jsx";
import React from "react"

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-white/60">{label}</div>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", step }) {
  return (
    <input
      value={value}
      type={type}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/20"
    />
  );
}

export default function Inspector() {
  const { state, actions } = useVoltLab();

  const selected = useMemo(
    () => state.items.find((x) => x.id === state.selectedId) || null,
    [state.items, state.selectedId]
  );

  return (
    <aside className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
      <div className="mb-3 text-sm font-semibold">Inspector</div>

      {!selected ? (
        <div className="space-y-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            Trage componente din bibliotecă.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            Folosește <b>Selectează</b> pentru a muta/selecta. Folosește <b>Cablu</b> pentru a conecta componente între ele.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            Apasă <b>Start</b> pentru a rula circuitul creat.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-white/60">Nume</div>
            <div className="text-sm font-semibold">
              {selected.type} <span className="text-white/40">#{selected.id.slice(-4)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mărime (%)">
              <Input
                type="number"
                step="1"
                value={selected.sizePct ?? 100}
                onChange={(v) => actions.updateItem(selected.id, { sizePct: Number(v) })}
              />
            </Field>
            <Field label="Rotație (grade)">
              <Input
                type="number"
                step="1"
                value={selected.rot ?? 0}
                onChange={(v) => actions.updateItem(selected.id, { rot: Number(v) })}
              />
            </Field>
          </div>

          {selected.type === "battery" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tensiune (V)">
                <Input
                  type="number"
                  step="0.1"
                  value={selected.V ?? 9}
                  onChange={(v) => actions.updateItem(selected.id, { V: Number(v) })}
                />
              </Field>
              <Field label="Rezistență internă (Ω)">
                <Input
                  type="number"
                  step="0.01"
                  value={selected.Rint ?? 0.2}
                  onChange={(v) => actions.updateItem(selected.id, { Rint: Number(v) })}
                />
              </Field>
            </div>
          )}

          {selected.type === "resistor" && (
            <Field label="Rezistență (Ω)">
              <Input
                type="number"
                step="1"
                value={selected.R ?? 100}
                onChange={(v) => actions.updateItem(selected.id, { R: Number(v) })}
              />
            </Field>
          )}

          {selected.type === "switch" && (
            <Field label="Stadiu">
              <button
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => actions.updateItem(selected.id, { closed: !selected.closed })}
              >
                {selected.closed ? "Închis" : "Deschis"}
              </button>
            </Field>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm hover:bg-rose-500/15"
              onClick={() => actions.deleteItem(selected.id)}
            >
              Șterge
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}