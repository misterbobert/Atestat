import { NavLink } from "react-router-dom";
import React from 'react';

const linkClass = ({ isActive }) =>
  [
    "px-4 py-2 rounded-xl text-sm font-medium transition",
    isActive
      ? "bg-cyan-500 text-black"
      : "text-white/70 hover:text-white hover:bg-white/10",
  ].join(" ");

export default function Navbar() {
  return (
    <nav className="w-full border-b border-white/10 bg-[#0b0f17]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-2">
        <div className="mr-6 font-bold text-white tracking-wide">
          ⚡ VoltLab
        </div>

        <NavLink to="/" className={linkClass}>
          Acasă
        </NavLink>

        <NavLink to="/theory" className={linkClass}>
          Teorie
        </NavLink>

        <NavLink to="/how-it-works" className={linkClass}>
          Cum funcționează?
        </NavLink>

        <NavLink to="/examples" className={linkClass}>
          Exemple
        </NavLink>

        <NavLink to="/about" className={linkClass}>
          Despre
        </NavLink>
      </div>
    </nav>
  );
}