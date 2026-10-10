import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import FloatingLeaves from './components/FloatingLeaves.jsx';
import Home from './pages/Home.jsx';
import Garden from './pages/Garden.jsx';
import Plants from './pages/Plants.jsx';
import PlantDetail from './pages/PlantDetail.jsx';
import HealthAdvisor from './pages/HealthAdvisor.jsx';
import Identify from './pages/Identify.jsx';
import MapPage from './pages/MapPage.jsx';
import Quiz from './pages/Quiz.jsx';
import { Login, Register } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { useData } from './context/Data.jsx';

function NotFound() { return <div className="page narrow center"><h1>Lost in the jungle 🌿</h1><p>That page does not exist.</p></div>; }

export default function App() {
  const { pathname } = useLocation();
  const { error, reload } = useData();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const immersive = pathname === '/';
  const full = pathname === '/garden';
  return (
    <>
      <Navbar transparent={immersive || full} />
      {error && <div className="banner-error">⚠ {error} <button className="btn btn-sm" onClick={reload}>Retry</button></div>}
      {!immersive && !full && <FloatingLeaves />}
      <main className={immersive ? 'main-home' : full ? 'main-full' : 'main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/:slug" element={<PlantDetail />} />
          <Route path="/advisor" element={<HealthAdvisor />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!full && <Footer />}
    </>
  );
}
