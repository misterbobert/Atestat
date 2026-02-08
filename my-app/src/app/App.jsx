import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from 'react';
import Navbar from "../components/Navbar";

import LabPage from "../pages/LabPage";
import Theory from "../pages/Theory";
import HowItWorks from "../pages/HowItWorks";
import Examples from "../pages/Examples";
import About from "../pages/About";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LabPage />} />
        <Route path="/theory" element={<Theory />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/examples" element={<Examples />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}