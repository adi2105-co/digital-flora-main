import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/Auth.jsx';
import { useData } from '../context/Data.jsx';
import PlantCard from '../components/PlantCard.jsx';
import PlantForm from './PlantForm.jsx';

const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function Thread({ c, advisor, onReplied }) {
  const { plants } = useData();
  const [body, setBody] = useState(''); const [ids, setIds] = useState([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const send = async () => { setBusy(true); setErr(''); try { await api.reply(c.id, { body, suggested_plant_ids: ids }); setBody(''); setIds([]); onReplied(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <div className={`thread glass-lite ${c.status}`}>
      <div className="thread-h"><span className={`badge ${c.status}`}>{c.status}</span><b>{advisor ? c.user_name : 'You'}</b><small>{fmt(c.created_at)}</small>{c.plant_name && <Link to={`/plants/${c.plant_slug}`} className="chip chip-soft">🌿 {c.plant_name}</Link>}</div>
      <p className="q">{c.question}</p>
      {c.replies.map((r) => <div className="reply" key={r.id}><b>🧑‍⚕️ {r.advisor}</b> <small>{fmt(r.created_at)}</small><p>{r.body}</p>{r.suggested?.length > 0 && <div className="chips">{r.suggested.map((s) => <Link className="chip" key={s.slug} to={`/plants/${s.slug}`}>🌿 {s.common_name.split('(')[0].trim()}</Link>)}</div>}</div>)}
      {advisor && (
        <div className="replybox">
          <textarea className="input" rows={3} placeholder="Write your advice…" value={body} onChange={(e) => setBody(e.target.value)} />
          <select className="input" multiple size={4} value={ids.map(String)} onChange={(e) => setIds([...e.target.selectedOptions].map((o) => Number(o.value)))} aria-label="Suggest plants">{plants.map((p) => <option key={p.id} value={p.id}>{p.common_name}</option>)}</select>
          <small className="muted">Hold Ctrl/Cmd to suggest several plants from the garden.</small>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-sm" disabled={busy || body.trim().length < 5} onClick={send}>{busy ? '…' : 'Send advice'}</button>
        </div>
      )}
    </div>
  );
}

function UserView() {
  const { bookmarks } = useAuth(); const { bySlug, plants } = useData();
  const [params] = useSearchParams();
  const [list, setList] = useState([]); const [notes, setNotes] = useState([]); const [hist, setHist] = useState([]);
  const askParam = params.get('ask');
  const [q, setQ] = useState(''); const [plantId, setPlantId] = useState(askParam && bySlug[askParam] ? bySlug[askParam].id : ''); const [msg, setMsg] = useState(''); const [tab, setTab] = useState(askParam ? 'ask' : 'saved');
  const load = useCallback(() => { api.consultations().then(setList).catch(() => {}); api.notes().then(setNotes).catch(() => {}); api.history().then(setHist).catch(() => {}); }, []);
  useEffect(load, [load]);
  const ask = async (e) => { e.preventDefault(); setMsg(''); try { await api.ask({ question: q, plant_id: plantId || null }); setQ(''); setMsg('Sent! An advisor will reply here soon.'); load(); setTab('ask'); } catch (x) { setMsg(x.message); } };
  return (
    <>
      <div className="tabs">{[['saved', `Saved plants (${bookmarks.length})`], ['notes', `Notes (${notes.length})`], ['ask', `Ask an advisor (${list.length})`], ['hist', 'Photo history']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'saved' && (bookmarks.length ? <div className="grid">{bookmarks.map((b) => bySlug[b.slug] && <PlantCard key={b.id} plant={bySlug[b.slug]} />)}</div> : <p className="empty">No saved plants yet. Open any plant and tap ☆ Save plant.</p>)}
      {tab === 'notes' && (notes.length ? notes.map((n) => <div className="glass-lite pad note" key={n.plant_id}><Link to={`/plants/${n.slug}`}><b>{n.common_name}</b></Link><small className="muted"> · {fmt(n.updated_at)}</small><p>{n.body}</p></div>) : <p className="empty">Notes you write on plant pages show up here.</p>)}
      {tab === 'ask' && (
        <>
          <form className="glass-lite pad" onSubmit={ask}>
            <h3>Ask an advisor</h3>
            <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)}><option value="">About a specific plant? (optional)</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.common_name}</option>)}</select>
            <textarea className="input" rows={4} required placeholder="Describe your question - e.g. Can I take tulsi tea with my diabetes medicine?" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn">Send question</button> <span className="muted">{msg}</span>
          </form>
          {list.map((c) => <Thread key={c.id} c={c} onReplied={load} />)}
        </>
      )}
      {tab === 'hist' && (hist.length ? <ul className="refs">{hist.map((h) => <li key={h.id}>{fmt(h.created_at)} - {h.slug ? <Link to={`/plants/${h.slug}`}>{h.common_name}</Link> : 'no match'} <span className="muted">({h.method}, {Math.round((h.confidence || 0) * 100)}%)</span></li>)}</ul> : <p className="empty">Identify a plant to build your history.</p>)}
    </>
  );
}

function AdvisorView() {
  const { plants, loading } = useData(); const nav = useNavigate();
  const [tab, setTab] = useState('inbox'); const [list, setList] = useState([]); const [editing, setEditing] = useState(null); const [adding, setAdding] = useState(false); const [flash, setFlash] = useState('');
  const load = useCallback(() => api.consultations().then(setList).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const open = list.filter((c) => c.status === 'open');
  if (adding || editing) return (
    <div><h2>{editing ? `Edit ${editing.common_name}` : 'Add a new plant to the garden'}</h2>
      <PlantForm plant={editing} onCancel={() => { setAdding(false); setEditing(null); }} onSaved={(p) => { setAdding(false); setEditing(null); setFlash(`✓ "${p.common_name}" saved. It now appears in suggestions, the library, the garden and the map.`); setTab('plants'); }} /></div>
  );
  return (
    <>
      {flash && <p className="flash">{flash}</p>}
      <div className="tabs">{[['inbox', `Questions (${open.length} open)`], ['plants', `Plant library (${plants.length})`]].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}<button className="btn btn-sm add-btn" onClick={() => { setFlash(''); setAdding(true); }}>＋ Add new plant</button></div>
      {tab === 'inbox' && (list.length ? list.map((c) => <Thread key={c.id} c={c} advisor onReplied={load} />) : <p className="empty">No questions yet. Users can ask from their dashboard.</p>)}
      {tab === 'plants' && (loading ? <p>Loading…</p> : <div className="table-list">{plants.map((p) => <div className="tl-row glass-lite" key={p.slug}><div><b>{p.common_name}</b><small className="muted"> · {p.botanical_name.replace(/\s*\(.*\)/, '')}</small></div><div className="row"><button className="btn btn-sm btn-ghost" onClick={() => nav(`/plants/${p.slug}`)}>View</button><button className="btn btn-sm" onClick={() => { setFlash(''); setEditing(p); }}>Edit</button></div></div>)}</div>)}
    </>
  );
}

export default function Dashboard() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="page narrow center"><p>Loading…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="page">
      <header className="page-head"><p className="eyebrow">{user.role === 'advisor' ? '🧑‍⚕️ Advisor portal' : '🙂 My garden'}</p><h1>Hello, {user.name.split(' ')[0]}</h1>
        <p className="lead">{user.role === 'advisor' ? 'Add new plants, edit the library and answer questions from users.' : 'Your saved plants, notes and conversations with advisors.'}</p></header>
      {user.role === 'advisor' ? <AdvisorView /> : <UserView />}
    </div>
  );
}
