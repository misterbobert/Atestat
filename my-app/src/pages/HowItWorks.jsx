import React from 'react';

export default function HowItWorks() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0b0f17] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">How it works</h1>
        <p className="mt-3 text-white/70 leading-relaxed">
          Aici este „filmul” aplicației: ce se întâmplă de la plasarea componentelor până la rezultate.
          E descris pe pași, ca să fie clar pentru atestat.
        </p>

        <div className="mt-8 grid gap-4">
          <Step
            n="1"
            title="Plasarea componentelor"
            text="Utilizatorul adaugă componente (baterie, rezistor, bec, întrerupător, instrumente) pe canvas. Fiecare componentă are doi pini (a și b)."
          />
          <Step
            n="2"
            title="Crearea firelor"
            text="În modul „wire”, utilizatorul apasă pe un pin (nod) și apoi pe alt pin. Aplicația adaugă o conexiune între cele două noduri."
          />
          <Step
            n="3"
            title="Gruparea nodurilor (nets)"
            text="Nodurile legate prin fire sunt considerate același nod electric. Aplicația face un graf al nodurilor și găsește componentele conexe (nets)."
          />
          <Step
            n="4"
            title="Construirea circuitului pentru solver"
            text="Fiecare componentă este transformată în „stamp”-uri: rezistor = conductanță, baterie = sursă de tensiune (+ rezistență internă), întrerupător închis = rezistor mic."
          />
          <Step
            n="5"
            title="Rezolvarea cu MNA"
            text="Se construiește un sistem liniar (matrice + vector) și se aplică eliminare Gaussiană. Rezultatul: tensiuni în noduri și curenți prin surse."
          />
          <Step
            n="6"
            title="Afișarea rezultatelor"
            text="Din tensiunile nodurilor se calculează ΔV pe instrumente. Pentru bec se poate estima „brightness” în funcție de tensiunea pe el."
          />
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Observații importante</h2>
          <ul className="mt-3 text-white/70 list-disc pl-5 space-y-2">
            <li>Un circuit neconectat complet poate duce la rezultate nedefinite (matrice singulară).</li>
            <li>De obicei, se folosește un nod ca masă (0V) pentru referință.</li>
            <li>Instrumentele ideale: voltmetrul e „open”, ampermetrul e „aproape scurt”.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-cyan-500 text-black font-bold grid place-items-center">
          {n}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-white/70 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}