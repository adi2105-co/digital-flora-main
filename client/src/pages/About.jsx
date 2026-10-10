import React from 'react';
import Reveal from '../components/Reveal.jsx';
import { TEAM } from '../config.js';

const OBJ = [
  ['Easier', 'Let anyone explore medicinal herbs comfortably from their own device - a virtual garden instead of a physical visit.'],
  ['Safer', 'Provide reliable, structured information on uses, preparations, precautions and interactions to reduce misuse.'],
  ['More accessible', 'Make traditional AYUSH knowledge reachable for anyone, anywhere, in English, Hindi and Marathi.'],
  ['Plant recognition', 'Identify herbs from user photos with AI so that plants are not confused with look-alikes.'],
  ['Educational', 'Teach plant morphology, phytochemistry and Ayurvedic principles through interactive 3D models, maps and quizzes.'],
  ['Conservation', 'Promote sustainable use by showing native range and conservation status.'],
];
const LIT = [
  ['Virtual herbal garden (Hayushasutra)', 'Allam et al., 2026', 'VR garden for Ayurveda students', 'Only 5 species; no olfactory features'],
  ['Documentation of medicinal plant use in Karaj, Iran', 'Jalali et al., 2026', 'Documented 186 species with ethnobotanical indices', 'Urban region only; uses not clinically validated'],
  ['Flora Folium: leaf identification using CNN', 'Suliva & Bustillo, 2026', 'Inception V3 on 45,000 images, ~99% accuracy', 'Depends on image quality; security'],
  ['AYUSH Virtual Herbal Garden (A-Frame / Android)', 'Suhas et al., 2025', 'Portable awareness platform with chatbot', 'Limited by infrastructure; no real-time AI'],
  ['AYUSH Virtual Herbal Garden (Unity 3D)', 'Kalavant et al., 2025', 'User-friendly 3D app with realtime database', 'No AR; no wearable integration'],
];

export default function About() {
  return (
    <div className="page">
      <header className="page-head"><p className="eyebrow">About the project</p><h1>Digital Flora - Virtual Herbal Garden</h1><p className="lead">A web platform that digitally recreates the experience of exploring a herbal garden, so the medicinal, cultural and ecological value of herbs is easy to discover, safe to use and open to all.</p></header>

      <Reveal className="glass-lite pad"><h2>Problem statement</h2><p>There is growing interest in herbal medicine, but limited access to accurate information and experiential learning. Traditional knowledge is dispersed and hard to find. Physical gardens have limited reach, misidentification and misuse create safety risks, and engaging ways to learn - and to conserve - are missing.</p></Reveal>

      <h2 className="sec">Objectives</h2>
      <div className="goal-grid light">{OBJ.map(([h, p], i) => <Reveal key={h} delay={i * 60} className="goal"><b className="num">{i + 1}</b><h4>{h}</h4><p>{p}</p></Reveal>)}</div>

      <h2 className="sec">How it works</h2>
      <Reveal className="arch glass-lite pad">
        <div className="arch-row">
          <div className="node n1"><b>Browser</b><small>React · Three.js (WebGL) · Leaflet maps</small></div><span className="arrow">⇄</span>
          <div className="node n2"><b>REST API</b><small>Node.js · Express · JWT auth</small></div><span className="arrow">⇄</span>
          <div className="node n3"><b>PostgreSQL</b><small>plants · regions · users · notes · consultations</small></div>
        </div>
        <div className="arch-row sub"><div className="node n4"><b>Plant identification</b><small>Pl@ntNet AI → Claude vision → built-in matcher</small></div><div className="node n5"><b>Health advisor</b><small>symptom synonyms + dosha-aware ranking</small></div><div className="node n6"><b>Roles</b><small>User · Advisor (adds plants, answers questions)</small></div></div>
      </Reveal>

      <h2 className="sec">Literature survey & research gap</h2>
      <Reveal className="glass-lite pad tablewrap"><table><thead><tr><th>Work</th><th>Authors</th><th>Outcome</th><th>Gap we address</th></tr></thead><tbody>{LIT.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>
        <p className="muted small">Digital Flora combines 3D models, symptom-based advice, AI photo identification, maps, multilingual UI and an advisor workflow in one platform.</p></Reveal>

      <h2 className="sec">Future scope</h2>
      <div className="goal-grid light"><Reveal className="goal"><h4>Voice assistant</h4><p>Voice symptom search is included in the advisor; full conversational AI is the next step.</p></Reveal><Reveal className="goal" delay={60}><h4>AR exploration</h4><p>View each 3D plant in your room using WebXR / AR on mobile.</p></Reveal><Reveal className="goal" delay={120}><h4>Own trained model</h4><p>Train a dedicated CNN on an Indian medicinal-plant dataset for offline identification.</p></Reveal></div>
      {TEAM.length > 0 && <><h2 className="sec">Team</h2><div className="chips">{TEAM.map((m) => <span className="chip" key={m}>{m}</span>)}</div></>}
    </div>
  );
}
