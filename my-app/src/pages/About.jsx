import React from 'react';

export default function About() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0b0f17] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">About VoltLab</h1>
        <p className="mt-3 text-white/70 leading-relaxed">
          VoltLab este o aplicație educațională pentru construirea și analizarea circuitelor electrice
          de curent continuu. Poți plasa componente pe canvas, le poți conecta prin fire și apoi
          aplicația calculează automat valori precum tensiuni și curenți.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Scop</h2>
            <p className="mt-2 text-white/70">
              Să ofere o modalitate rapidă de a testa circuite, de a înțelege legile de bază (Ohm,
              Kirchhoff) și de a vizualiza efectele modificării componentelor.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Pentru cine?</h2>
            <ul className="mt-2 text-white/70 list-disc pl-5 space-y-1">
              <li>elevi (electronică / fizică)</li>
              <li>profesori (demonstrații la clasă)</li>
              <li>pasionați care vor un sandbox rapid</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Tehnologii</h2>
            <ul className="mt-2 text-white/70 list-disc pl-5 space-y-1">
              <li>React + React Router</li>
              <li>TailwindCSS</li>
              <li>Canvas 2D (grid, componente, fire)</li>
              <li>Algoritmi de analiză (nets + MNA)</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Ce urmează (idei)</h2>
            <ul className="mt-2 text-white/70 list-disc pl-5 space-y-1">
              <li>export / import proiecte (JSON)</li>
              <li>AC basic (sine source) + reactanțe</li>
              <li>grafice pentru tensiuni/curenți</li>
              <li>preset-uri și tutorial interactiv</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Notă</h2>
          <p className="mt-2 text-white/70">
            Aplicația este gândită ca un instrument educațional. Pentru circuite complexe, rezultatele
            depind de modelarea corectă a componentelor și de conectarea nodurilor.
          </p>
        </div>
      </div>
    </div>
  );
}