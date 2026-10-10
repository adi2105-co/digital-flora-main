import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/Data.jsx';
import { useAuth } from '../context/Auth.jsx';
import { useLang } from '../context/Lang.jsx';
import { api } from '../api.js';
import Viewer3D from '../components/Viewer3D.jsx';
import MapView from '../components/MapView.jsx';
import PlantCard from '../components/PlantCard.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import { partLabel } from '../three/plants.js';

const DOSHA_ICON = { decreases: ['↓', 'Pacifies', 'good'], increases: ['↑', 'Aggravates', 'warn'], neutral: ['•', 'Neutral', 'mid'] };

function Notes({ plant }) {
  const { user } = useAuth();
  const [body, setBody] = useState(''); const [state, setState] = useState('');
  useEffect(() => { if (user) api.notes().then((ns) => setBody(ns.find((n) => n.plant_id === plant.id)?.body || '')).catch(() => {}); }, [user, plant.id]);
  if (!user) return <p className="empty">Log in to keep private study notes on this plant. <Link to="/login">Login</Link></p>;
  return (
    <div>
      <textarea className="input" rows={6} placeholder="Your study notes..." value={body} onChange={(e) => { setBody(e.target.value); setState(''); }} />
      <div className="row"><button className="btn" onClick={async () => { try { await api.saveNote(plant.id, body); setState('Saved ✓'); } catch (e) { setState(e.message); } }}>Save note</button><span className="muted">{state}</span></div>
    </div>
  );
}

export default function PlantDetail() {
  const { slug } = useParams();
  const { bySlug, plants, loading } = useData();
  const { user, isBookmarked, toggleBookmark } = useAuth();
  const { t, pname } = useLang();
  const nav = useNavigate();
  const [view, setView] = useState('whole'); const [tab, setTab] = useState('overview');
  const p = bySlug[slug];
  useEffect(() => { setView('whole'); setTab('overview'); }, [slug]);

  const related = useMemo(() => {
    if (!p) return [];
    return plants.filter((x) => x.slug !== p.slug).map((x) => ({ x, n: x.ailments.filter((a) => p.ailments.includes(a)).length })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
  }, [p, plants]);

  if (loading) return <div className="page narrow center"><p>Loading…</p></div>;
  if (!p) return <div className="page narrow center"><h1>Plant not found</h1><Link to="/plants" className="btn">Back to library</Link></div>;
  const part = partLabel(p.model_spec || {});
  const a = p.ayurveda || {};
  const tabs = [['overview', t('overview')], ['uses', t('uses')], ['ayurveda', t('ayurveda')], ['prep', t('prep')], ['safety', t('safety')], ['cultivation', t('cultivation')], ['where', t('where')], ['notes', t('notes')]];

  return (
    <div className="page">
      <button className="back" onClick={() => nav(-1)}>← Back</button>
      <section className="detail-hero">
        <div className="viewer-col">
          <Viewer3D spec={p.model_spec} slug={p.slug} view={view} className="viewer-lg" />
          <div className="viewtabs">
            <button className={view === 'whole' ? 'on' : ''} onClick={() => setView('whole')}>🌳 {t('whole')}</button>
            <button className={view === 'leaf' ? 'on' : ''} onClick={() => setView('leaf')}>🍃 {t('leaf')}</button>
            {part !== 'Leaf' && <button className={view === 'part' ? 'on' : ''} onClick={() => setView('part')}>{part === 'Flower' ? '🌸' : part === 'Fruit' ? '🍎' : part === 'Bark' ? '🪵' : '🌿'} {part}</button>}
          </div>
          <p className="muted small">Drag to rotate · scroll to zoom · 3 interactive 3D views of this plant</p>
        </div>
        <div className="info-col">
          <p className="eyebrow">{p.plant_type} · {p.family}</p>
          <h1>{pname(p)}</h1>
          <p className="latin big">{p.botanical_name}</p>
          <div className="names">
            {p.sanskrit_name && <span><b>संस्कृत</b> {p.sanskrit_name}</span>}
            {p.hindi_name && <span><b>हिन्दी</b> {p.hindi_name}</span>}
            {p.marathi_name && <span><b>मराठी</b> {p.marathi_name}</span>}
          </div>
          <div className="chips">{p.ayush_systems.map((s) => <span className="chip" key={s}>{s}</span>)}{p.parts_used.map((s) => <span className="chip chip-soft" key={s}>🌿 {s}</span>)}</div>
          <p className="lead2">{p.description}</p>
          <div className="row">
            {user?.role === 'user' ? <button className={`btn ${isBookmarked(p.id) ? 'btn-ghost' : ''}`} onClick={() => toggleBookmark(p.id)}>{isBookmarked(p.id) ? `★ ${t('bookmarked')}` : `☆ ${t('bookmark')}`}</button> : !user && <Link className="btn btn-ghost" to="/login">☆ {t('bookmark')}</Link>}
            <Link className="btn btn-ghost" to={`/dashboard?ask=${p.slug}`}>💬 {t('askAdvisor')}</Link>
          </div>
          {p.fun_fact && <p className="fact">✨ {p.fun_fact}</p>}
        </div>
      </section>

      <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <section className="tab-body glass-lite">
        {tab === 'overview' && (
          <div className="two">
            <div><h3>About</h3><p>{p.description}</p><h3>Cultural significance</h3><p>{p.cultural_significance}</p></div>
            <div><h3>Habitat</h3><p>{p.habitat}</p><h3>Conservation</h3><p>{p.conservation_status || 'Not assessed'}</p><h3>Other names</h3><div className="chips">{p.other_names.map((n) => <span key={n} className="chip chip-soft">{n}</span>)}</div></div>
          </div>
        )}
        {tab === 'uses' && (
          <div>
            <h3>Traditionally used for</h3><div className="chips">{p.ailments.map((x) => <Link key={x} to={`/advisor?q=${encodeURIComponent(x)}`} className="chip">{x}</Link>)}</div>
            <div className="uses">{p.uses.map((u, i) => <div className="use" key={i}><span className="badge">{u.system}</span><h4>{u.title}</h4><p>{u.detail}</p></div>)}</div>
          </div>
        )}
        {tab === 'ayurveda' && (
          <div>
            <div className="ayu-grid">
              <div className="ayu"><h5>Rasa (taste)</h5><p>{(a.rasa || []).join(', ') || '-'}</p></div>
              <div className="ayu"><h5>Guna (quality)</h5><p>{(a.guna || []).join(', ') || '-'}</p></div>
              <div className="ayu"><h5>Virya (potency)</h5><p>{a.virya || '-'}</p></div>
              <div className="ayu"><h5>Vipaka (post-digestive)</h5><p>{a.vipaka || '-'}</p></div>
            </div>
            <h3>Effect on the three doshas</h3>
            <div className="doshas">{['vata', 'pitta', 'kapha'].map((d) => { const [ic, lb, cl] = DOSHA_ICON[a.doshas?.[d]] || DOSHA_ICON.neutral; return <div key={d} className={`dosha ${cl}`}><span className="ic">{ic}</span><b>{d[0].toUpperCase() + d.slice(1)}</b><small>{lb}</small></div>; })}</div>
            {a.karma?.length > 0 && <><h3>Karma (actions)</h3><div className="chips">{a.karma.map((k) => <span className="chip" key={k}>{k}</span>)}</div></>}
            <h3>Classical references</h3>
            <ul className="refs">{(a.classical_refs || []).map((r) => <li key={r}>📜 {r}</li>)}{!(a.classical_refs || []).length && <li>-</li>}</ul>
            {a.vedic_note && <div className="vedic"><b>🕉 Vedic note</b><p>{a.vedic_note}</p></div>}
            <p className="muted small">Ayurvedic properties differ slightly between texts and authors; this is a general summary for study.</p>
          </div>
        )}
        {tab === 'prep' && (
          <div className="uses">{p.preparations.map((x, i) => <div className="use" key={i}><h4>{x.name}</h4><p>{x.method}</p>{x.note && <p className="muted">{x.note}</p>}</div>)}</div>
        )}
        {tab === 'safety' && (
          <div className="two">
            <div><h3>Key constituents</h3><div className="chips">{p.chemistry.map((c) => <span className="chip" key={c}>🧪 {c}</span>)}</div></div>
            <div><h3>Precautions</h3><p className="warnbox">{p.precautions}</p></div>
          </div>
        )}
        {tab === 'cultivation' && (
          <div className="ayu-grid">{Object.entries(p.cultivation || {}).map(([k, v]) => <div className="ayu" key={k}><h5>{k}</h5><p>{v}</p></div>)}</div>
        )}
        {tab === 'where' && (
          <div>
            <MapView height={420} regions={p.regions} />
            <div className="legend"><span><i style={{ background: '#2f9e44' }} />wild</span><span><i style={{ background: '#e8a33d' }} />common</span><span><i style={{ background: '#3b82c4' }} />cultivated</span><span><i style={{ background: '#c2418a' }} />rare</span></div>
            <ul className="refs">{p.regions.map((r) => <li key={r.name}>📍 <b>{r.name}</b> {r.state && `(${r.state})`} - {r.abundance}{r.note ? `. ${r.note}` : ''}</li>)}</ul>
          </div>
        )}
        {tab === 'notes' && <Notes plant={p} />}
      </section>
      <Disclaimer />
      {related.length > 0 && <><h2 className="sec">Plants used for similar needs</h2><div className="grid">{related.map(({ x, n }) => <PlantCard key={x.slug} plant={x} note={`${n} shared use${n > 1 ? 's' : ''}`} />)}</div></>}
    </div>
  );
}
