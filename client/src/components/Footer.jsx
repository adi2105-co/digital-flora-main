import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';
export default function Footer() {
  return (
    <footer className="footer">
      <div><Logo /><p>A 3D virtual herbal garden for AYUSH medicinal plants.<br />Built with React, Three.js, Express and PostgreSQL.</p></div>
      <div><h4>Explore</h4><Link to="/garden">3D Garden</Link><Link to="/plants">Plant library</Link><Link to="/map">Distribution map</Link><Link to="/quiz">Herbal quiz</Link></div>
      <div><h4>Health</h4><Link to="/advisor">Health advisor</Link><Link to="/identify">Identify a plant</Link><Link to="/about">Objectives</Link></div>
      <p className="footer-note">Educational use only - not medical advice. © {new Date().getFullYear()} Digital Flora</p>
    </footer>
  );
}
