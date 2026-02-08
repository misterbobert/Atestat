import { useMemo, useState } from "react";
import React from 'react';

const EXAMPLES = [
  {
    id: "ex1",
    title: "1) Circuit simplu: baterie + rezistor",
    goal: "Observi curentul într-un circuit DC simplu.",
    steps: [
      "Adaugă o baterie (ex: 9V).",
      "Adaugă un rezistor (ex: 100Ω).",
      "Conectează pinul bateriei (a) la rezistor (a).",
      "Conectează rezistor (b) la baterie (b).",
      "Pornește calculul (sau verifică afișajele instrumentelor).",
    ],
    expected: "Curentul ar trebui să fie ~ 0.09 A (I ≈ 9V / 100Ω).",
  },
  {
    id: "ex2",
    title: "2) Serie: doi rezistori",
    goal: "În serie, rezistențele se adună.",
    steps: [
      "Baterie 9V + rezistor R1=100Ω + rezistor R2=220Ω.",
      "Le legi în lanț: baterie → R1 → R2 → baterie.",
      "Pune un ampermetru pe serie (opțional).",
    ],
    expected: "Rtotal = 320Ω, curentul I ≈ 9/320 ≈ 0.028 A.",
  },
  {
    id: "ex3",
    title: "3) Paralel: doi rezistori",
    goal: "În paralel, curentul se împarte, tensiunea rămâne aceeași pe ramuri.",
    steps: [
      "Baterie 9V + două rezistoare (100Ω și 220Ω).",
      "Fă două ramuri care pleacă din același nod și se reunesc la același nod.",
      "Pune un voltmetru pe fiecare rezistor (opțional).",
    ],
    expected:
      "Tensiunea pe fiecare ramură ≈ 9V. Curentul total este mai mare decât în serie.",
  },
  {
    id: "ex4",
    title: "4) Bec + întrerupător",
    goal: "Întrerupătorul controlează circuitul: open = nu curge curent, closed = curge curent.",
    steps: [
      "Baterie + bec + întrerupător, toate în serie.",
      "Închide întrerupătorul și observă „brightness”.",
      "Deschide întrerupătorul și verifică că becul se stinge.",
    ],
    expected: "Closed → brightness crește. Open → brightness ~ 0.",
  },
];

export default function Examples() {
  const [active, setActive] = useState(EXAMPLES[0].id);

  const cur = useMemo(() => EXAMPLES.find((e) => e.id === active), [active]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0b0f17] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Examples</h1>
        <p className="mt-3 text-white/70 leading-relaxed">
          Alege un exemplu și urmează pașii. Pagină bună pentru demonstrații + validare rapidă a solverului.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60 mb-2">Circuite</div>
            <div className="space-y-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActive(e.id)}
                  className={[
                    "w-full text-left rounded-xl px-3 py-2 border transition",
                    e.id === active
                      ? "bg-cyan-500 text-black border-transparent"
                      : "bg-black/20 border-white/10 text-white/80 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-xs opacity-80 mt-1">{e.goal}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">{cur?.title}</h2>
            <p className="mt-2 text-white/70">{cur?.goal}</p>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white/80">Pași</h3>
              <ol className="mt-3 space-y-2 list-decimal pl-5 text-white/70">
                {cur?.steps?.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-sm font-semibold text-white/80">Ce ar trebui să observi</div>
              <p className="mt-2 text-white/70 leading-relaxed">{cur?.expected}</p>
            </div>

            <div className="mt-6 text-xs text-white/50">
              Tip: dacă ai instrumente în librărie, pune voltmetru „în paralel” și ampermetru „în serie”.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}