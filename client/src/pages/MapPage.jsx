import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/Data.jsx';
import MapView from '../components/MapView.jsx';

export default function MapPage() {
  const { plants, regions } = useData();
  const [mode, setMode] = useState('all'); const [slug, setSlug] = useState(''); const [region, setRegion] = useState('');

  const data = useMemo(() => {
    if (mode === 'plant' && slug) { const p = plants.find((x) => x.slug === slug); return p ? p.regions : []; }
    const counts = {}; plants.forEach((p) => p.regions.forEach((r) => { (counts[r.name] ||= []).push(p); }));
    const max = Math.max(1, ...Object.values(counts).map((a) => a.length));
    return regions.filter((r) => counts[r.name]).map((r) => {
      const ps = counts[r.name];
      return { ...r, color: '#1f9d63', opacity: 0.12 + 0.4 * (ps.length / max), popup: `<b>${r.name}</b><br/>${ps.length} plants<br/>${ps.slice(0, 12).map((p) => p.common_name.split('(')[0].trim()).join(', ')}${ps.length > 12 ? '…' : ''}`, count: ps.length };
    });
  }, [mode, slug, plants, regions]);

  const inRegion = region ? plants.filter((p) => p.regions.some((r) => r.name === region)) : [];
  return (
    <div className="page">
      <header className="page-head"><p className="eyebrow">🗺️ Distribution</p><h1>Where do these plants grow?</h1><p className="lead">Each circle is the approximate extent of a growing region. Pick a plant to see its range, or explore the whole garden at once.</p></header>
      <div className="filters glass-lite">
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="all">All plants - region density</option><option value="plant">One plant</option></select>
        {mode === 'plant' && <select className="input grow" value={slug} onChange={(e) => setSlug(e.target.value)}><option value="">Choose a plant…</option>{plants.map((p) => <option key={p.slug} value={p.slug}>{p.common_name}</option>)}</select>}
        {mode === 'all' && <select className="input grow" value={region} onChange={(e) => setRegion(e.target.value)}><option value="">List plants of a region…</option>{regions.map((r) => <option key={r.id}>{r.name}</option>)}</select>}
      </div>
      <MapView regions={data} height={520} fit={mode === 'plant' || false} onRegionClick={(r) => { if (mode === 'all') setRegion(r.name); }} />
      {mode === 'plant' && <div className="legend"><span><i style={{ background: '#2f9e44' }} />wild</span><span><i style={{ background: '#e8a33d' }} />common</span><span><i style={{ background: '#3b82c4' }} />cultivated</span><span><i style={{ background: '#c2418a' }} />rare</span></div>}
      {region && mode === 'all' && (
        <section className="glass-lite pad"><h3>Plants found in {region}</h3><div className="chips">{inRegion.map((p) => <Link key={p.slug} className="chip" to={`/plants/${p.slug}`}>🌿 {p.common_name.split('(')[0].trim()}</Link>)}</div></section>
      )}
    </div>
  );
}
