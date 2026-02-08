import React from 'react';

export default function Theory() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0b0f17] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Theory</h1>
        <p className="mt-3 text-white/70 leading-relaxed">
          Această pagină rezumă conceptele esențiale folosite în VoltLab: mărimi electrice, legi de bază
          și ideea de analiză a circuitelor.
        </p>

        <div className="mt-8 grid gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">1) Mărimi electrice</h2>
            <ul className="mt-3 text-white/70 list-disc pl-5 space-y-2">
              <li>
                <span className="text-white/90 font-medium">Tensiunea (V)</span> – diferența de potențial
                dintre două puncte. Practic, „cât împinge” sursa sarcinile.
              </li>
              <li>
                <span className="text-white/90 font-medium">Curentul (A)</span> – fluxul de sarcină prin
                conductor. „Cât curge” prin circuit.
              </li>
              <li>
                <span className="text-white/90 font-medium">Rezistența (Ω)</span> – opoziția la curent.
                Rezistorul limitează curentul.
              </li>
              <li>
                <span className="text-white/90 font-medium">Puterea (W)</span> – energia consumată pe unitatea
                de timp. Pentru rezistori: P = U · I.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">2) Legea lui Ohm</h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              Pentru un rezistor ideal, tensiunea și curentul sunt proporționale:
            </p>
            <div className="mt-3 rounded-xl bg-black/30 border border-white/10 p-4 font-mono text-white/90">
              U = R · I
            </div>
            <p className="mt-3 text-white/70">
              Asta înseamnă: dacă crește rezistența, curentul scade (la aceeași tensiune).
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">3) Noduri și conexiuni</h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              Un <span className="text-white/90 font-medium">nod</span> este un punct unde se întâlnesc
              conductoare sau pini de componente. Toate punctele legate direct prin fire (fără rezistență)
              sunt considerate același nod electric.
            </p>
            <ul className="mt-3 text-white/70 list-disc pl-5 space-y-2">
              <li>
                În VoltLab, nodurile se „grupează” automat în rețele conectate (nets) pe baza firelor.
              </li>
              <li>
                Alegem un nod ca <span className="text-white/90 font-medium">masă (GND)</span>, adică referință 0V.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">4) Legile lui Kirchhoff</h2>

            <h3 className="mt-4 text-lg font-semibold">KCL (Legea curenților)</h3>
            <p className="mt-2 text-white/70">
              Suma curenților care intră într-un nod este egală cu suma curenților care ies.
            </p>

            <h3 className="mt-4 text-lg font-semibold">KVL (Legea tensiunilor)</h3>
            <p className="mt-2 text-white/70">
              În orice buclă închisă, suma variațiilor de tensiune este 0. Practic, tensiunile „se compensează”.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">5) De ce MNA (Modified Nodal Analysis)?</h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              Pentru circuite cu rezistențe și surse de tensiune, o metodă stabilă este MNA:
              necunoscutele sunt tensiunile în noduri (față de masă) și, la nevoie, curenții prin sursele de tensiune.
            </p>
            <ul className="mt-3 text-white/70 list-disc pl-5 space-y-2">
              <li>se construiește o matrice pe baza componentelor (rezistori, surse)</li>
              <li>se rezolvă sistemul liniar</li>
              <li>se obțin tensiunile nodurilor și curenții prin surse</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}