import { formatSI } from "./formatting";

export function resistorSVG(R) {
  const txt = formatSI(R, "Ω");
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
    <path d="M30 60 H60 L70 40 L90 80 L110 40 L130 80 L140 60 H170"
      fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="100" y="100" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.75)" font-family="ui-sans-serif,system-ui">${txt}</text>
  </svg>`;
}

export function meterSVG(kind, display) {
  const label = kind === "voltmeter" ? "V" : kind === "ammeter" ? "A" : "Ω";
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
    <circle cx="70" cy="60" r="26" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.20)"/>
    <text x="70" y="66" text-anchor="middle" font-size="18" fill="rgba(255,255,255,0.85)" font-family="ui-sans-serif,system-ui">${label}</text>
    <text x="128" y="66" text-anchor="middle" font-size="18" fill="rgba(255,255,255,0.90)" font-family="ui-sans-serif,system-ui">${display}</text>
  </svg>`;
}

export function switchSVG(closed) {
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
    <path d="M35 60 H80" stroke="rgba(255,255,255,0.88)" stroke-width="6" stroke-linecap="round"/>
    <path d="M120 60 H165" stroke="rgba(255,255,255,0.88)" stroke-width="6" stroke-linecap="round"/>
    ${
      closed
        ? `<path d="M80 60 H120" stroke="rgba(120,255,180,0.95)" stroke-width="6" stroke-linecap="round"/>`
        : `<path d="M80 60 L120 40" stroke="rgba(255,255,255,0.88)" stroke-width="6" stroke-linecap="round"/>`
    }
    <text x="100" y="102" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.65)" font-family="ui-sans-serif,system-ui">${closed ? "closed" : "open"}</text>
  </svg>`;
}

export function bulbSVG(brightness01) {
  const b = Math.max(0, Math.min(1, brightness01 || 0));
  const glow = 0.15 + b * 0.65;
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
    <circle cx="100" cy="55" r="26" fill="rgba(255,220,120,${glow})" stroke="rgba(255,255,255,0.22)"/>
    <path d="M88 82 H112" stroke="rgba(255,255,255,0.75)" stroke-width="6" stroke-linecap="round"/>
    <text x="100" y="102" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.65)" font-family="ui-sans-serif,system-ui">${Math.round(b * 100)}%</text>
  </svg>`;
}

export function batterySVG(V, Rint) {
  const a = formatSI(V, "V");
  const b = formatSI(Rint, "Ω");
  return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="100" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)"/>
    <rect x="55" y="40" width="90" height="40" rx="10" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.18)"/>
    <rect x="145" y="52" width="10" height="16" rx="3" fill="rgba(255,255,255,0.30)"/>
    <text x="100" y="66" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.85)" font-family="ui-sans-serif,system-ui">${a}</text>
    <text x="100" y="98" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.65)" font-family="ui-sans-serif,system-ui">Rint ${b}</text>
  </svg>`;
}