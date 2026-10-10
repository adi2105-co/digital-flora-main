import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../context/Data.jsx';
import { useLang } from '../context/Lang.jsx';
import PlantCard from '../components/PlantCard.jsx';
import Disclaimer from '../components/Disclaimer.jsx';

const CHIPS = ['cough', 'cold', 'fever', 'acidity', 'indigestion', 'hair fall', 'acne', 'stress', 'insomnia', 'joint pain', 'diabetes', 'headache', 'wounds', 'immunity'];
const QUIZ = [
  ['Body frame', ['Thin, light, hard to gain weight', 'Medium, muscular, well proportioned', 'Broad, sturdy, gains weight easily']],
  ['Skin', ['Dry, rough or cool', 'Warm, sensitive, prone to redness or acne', 'Smooth, oily, soft and cool']],
  ['Appetite & digestion', ['Irregular; gas or bloating', 'Strong; gets irritable or acidic if a meal is missed', 'Slow but steady; feels heavy after meals']],
  ['Sleep', ['Light and interrupted', 'Moderate; wakes refreshed', 'Deep and long; hard to wake']],
  ['Under stress I become', ['Anxious or worried', 'Irritable or angry', 'Withdrawn or lethargic']],
  ['Weather I dislike most', ['Cold and windy', 'Hot and humid', 'Cold and damp']],
  ['Energy through the day', ['Comes in bursts, then tires', 'Intense and focused', 'Steady, good stamina']],
  ['Mind & speech', ['Quick, creative, talkative', 'Sharp, precise, determined', 'Calm, slow to anger, thoughtful']],
];

function Prakriti({ onDone, onClose }) {
  const [ans, setAns] = useState([]); const i = ans.length;
  const finish = (all) => { const c = [0, 0, 0]; all.forEach((a) => { c[a] += 1; }); const names = ['vata', 'pitta', 'kapha']; const top = c.indexOf(Math.max(...c)); onDone({ dosha: names[top], counts: c }); };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">Prakriti quiz · {Math.min(i + 1, QUIZ.length)} / {QUIZ.length}</p>
        <div className="progress"><i style={{ width: `${(i / QUIZ.length) * 100}%` }} /></div>
        {i < QUIZ.length && (<>
          <h3>{QUIZ[i][0]}</h3>
          {QUIZ[i][1].map((o, k) => <button key={k} className="opt" onClick={() => { const next = [...ans, k]; setAns(next); if (next.length === QUIZ.length) finish(next); }}>{o}</button>)}
        </>)}
        <p className="muted small">An indicative guide to your dominant dosha, not a diagnosis.</p>
      </div>
    </div>
  );
}

export default function HealthAdvisor() {
  const [params] = useSearchParams();
  const { bySlug } = useData();
  const { t } = useLang();
  const [q, setQ] = useState(params.get('q') || ''); const [dosha, setDosha] = useState(''); const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [quiz, setQuiz] = useState(false); const [quizRes, setQuizRes] = useState(null); const [listening, setListening] = useState(false);
  const rec = useRef(null);

  const run = async (text = q, d = dosha) => {
    if (!text.trim() && !d) return;
    setBusy(true); setErr('');
    try { setRes(await api.suggest(text, d)); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { if (params.get('q')) run(params.get('q')); /* eslint-disable-next-line */ }, []);

  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const mic = () => {
    if (!SR) return;
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false; rec.current = r;
    r.onresult = (e) => { const txt = e.results[0][0].transcript; setQ(txt); run(txt); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    setListening(true); r.start();
  };

  return (
    <div className="page">
      <header className="page-head center"><p className="eyebrow">🩺 Health advisor</p><h1>Discover the right herbs for your wellness</h1><p className="lead">{t('symptomPrompt')} - type or speak it, and we rank herbs from the Ayurvedic library.</p></header>
      <form className="searchbar glass-lite" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('symptomHint')} aria-label="Symptoms" />
        {SR && <button type="button" className={`btn btn-ghost ${listening ? 'pulse' : ''}`} onClick={mic} title="Speak">{listening ? t('listening') : '🎤'}</button>}
        <select className="input" value={dosha} onChange={(e) => setDosha(e.target.value)} aria-label="Dosha"><option value="">My dosha: not set</option><option value="vata">Vata</option><option value="pitta">Pitta</option><option value="kapha">Kapha</option></select>
        <button className="btn" disabled={busy}>{busy ? '…' : t('suggest')}</button>
      </form>
      <div className="chips center-chips">{CHIPS.map((c) => <button key={c} className="chip chip-btn" onClick={() => { setQ(c); run(c); }}>{c}</button>)}</div>
      <p className="center"><button className="link" onClick={() => setQuiz(true)}>Not sure of your dosha? Take the 8-question Prakriti quiz →</button></p>
      {quizRes && <div className="quizres glass-lite"><b>Your dominant dosha looks like {quizRes.dosha[0].toUpperCase() + quizRes.dosha.slice(1)}</b> (Vata {quizRes.counts[0]} · Pitta {quizRes.counts[1]} · Kapha {quizRes.counts[2]}). We now favour herbs that balance it.</div>}
      {err && <p className="error">{err}</p>}
      {res && (
        <section>
          {res.terms?.expanded?.length > 0 && <p className="muted center">Also considering: {res.terms.expanded.slice(0, 8).join(', ')}</p>}
          <h2 className="sec">{res.results.length ? `${res.results.length} suggestions` : 'No match yet'}</h2>
          {!res.results.length && <p className="empty">Try simpler words (cough, fever, acidity…) or ask a human advisor from your dashboard.</p>}
          <div className="grid">{res.results.map((r) => bySlug[r.slug] && <PlantCard key={r.slug} plant={bySlug[r.slug]} note={`Why: ${r.reasons.join(' · ')}`} />)}</div>
          <p className="center"><Link to="/dashboard?ask=1" className="btn btn-ghost">💬 Still unsure? Ask an advisor</Link></p>
        </section>
      )}
      <Disclaimer />
      {quiz && <Prakriti onClose={() => setQuiz(false)} onDone={(r) => { setQuiz(false); setQuizRes(r); setDosha(r.dosha); if (q.trim()) run(q, r.dosha); }} />}
    </div>
  );
}
