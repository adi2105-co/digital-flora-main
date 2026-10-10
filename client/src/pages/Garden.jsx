import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createGarden } from '../three/garden.js';
import { useData } from '../context/Data.jsx';
import { useLang } from '../context/Lang.jsx';

export default function Garden() {
  const { plants, bySlug, loading } = useData();
  const { pname } = useLang();
  const host = useRef(null); const garden = useRef(null);
  const [sel, setSel] = useState(null); const [hover, setHover] = useState(null); const [tour, setTour] = useState(false); const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!plants.length || !host.current) return undefined;
    try { garden.current = createGarden(host.current, { plants, onPick: (slug) => { setSel(slug); garden.current?.focus(slug); }, onHover: setHover }); }
    catch (e) { console.warn(e); setFailed(true); }
    return () => { garden.current?.dispose(); garden.current = null; };
  }, [plants]);

  useEffect(() => {
    if (!tour || !plants.length) return undefined;
    let i = 0; const go = () => { const p = plants[i % plants.length]; setSel(p.slug); garden.current?.focus(p.slug); i += 1; };
    go(); const id = setInterval(go, 5500); return () => clearInterval(id);
  }, [tour, plants]);

  const p = sel ? bySlug[sel] : null;
  return (
    <div className="garden">
      <div className="garden-canvas" ref={host} />
      {loading && <div className="garden-msg">Growing the garden…</div>}
      {failed && <div className="garden-msg">3D graphics are not available in this browser.</div>}
      <div className="garden-hud">
        <h2>The Virtual Herbal Garden</h2>
        <p>Drag to look around · scroll to zoom · click a plant to visit it</p>
        <div className="row">
          <button className={`btn btn-sm ${tour ? '' : 'btn-ghost'}`} onClick={() => { setTour((x) => !x); garden.current?.setAutoRotate(tour); }}>{tour ? '⏸ Stop tour' : '▶ Start guided tour'}</button>
        </div>
      </div>
      {hover && <div className="jungle-tip" style={{ top: 'auto', bottom: 24 }}>🌿 {hover.name}</div>}
      {p && (
        <aside className="garden-card glass">
          <button className="x" onClick={() => { setSel(null); setTour(false); }} aria-label="Close">×</button>
          <p className="eyebrow">{p.plant_type} · {p.family}</p>
          <h3>{pname(p)}</h3>
          <p className="latin">{p.botanical_name}</p>
          {p.sanskrit_name && <p className="sans">संस्कृत: {p.sanskrit_name}</p>}
          <p>{p.description}</p>
          <div className="chips">{p.ailments.slice(0, 6).map((a) => <span key={a} className="chip">{a}</span>)}</div>
          <Link className="btn" to={`/plants/${p.slug}`}>Open full profile →</Link>
        </aside>
      )}
    </div>
  );
}
