import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/Data.jsx';

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const nm = (p) => p.common_name.split('(')[0].trim();
const firstSans = (p) => (p.sanskrit_name || '').split(',')[0].trim();

function build(plants) {
  const qs = [];
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  for (const p of pick(plants.filter((x) => firstSans(x)), 4)) qs.push({ q: `Which plant is known in Sanskrit as "${firstSans(p)}"?`, a: nm(p), opts: shuffle([nm(p), ...pick(plants.filter((x) => x !== p), 3).map(nm)]), why: `${nm(p)} (${p.botanical_name.replace(/\s*\(.*\)/, '')}) - Sanskrit: ${p.sanskrit_name}.`, slug: p.slug });
  for (const p of pick(plants, 4)) { const a = pick(p.ailments, 1)[0]; const wrong = plants.filter((x) => !x.ailments.includes(a)); if (wrong.length < 3) continue; qs.push({ q: `Which plant is traditionally used for "${a}"?`, a: nm(p), opts: shuffle([nm(p), ...pick(wrong, 3).map(nm)]), why: `${nm(p)} is traditionally used for ${a}.`, slug: p.slug }); }
  for (const p of pick(plants.filter((x) => x.family), 3)) { const fams = [...new Set(plants.map((x) => x.family).filter((f) => f && f !== p.family))]; if (fams.length < 3) continue; qs.push({ q: `${nm(p)} belongs to which botanical family?`, a: p.family, opts: shuffle([p.family, ...pick(fams, 3)]), why: `${nm(p)} - family ${p.family}.`, slug: p.slug }); }
  for (const p of pick(plants.filter((x) => x.model_spec?.key_part), 2)) { const parts = ['leaf', 'flower', 'fruit', 'root', 'bark', 'seed']; qs.push({ q: `Which part of ${nm(p)} is its key medicinal part?`, a: p.model_spec.key_part, opts: shuffle([p.model_spec.key_part, ...pick(parts.filter((x) => x !== p.model_spec.key_part), 3)]), why: `The key part of ${nm(p)} is the ${p.model_spec.key_part}.`, slug: p.slug }); }
  return shuffle(qs).slice(0, 10);
}

export default function Quiz() {
  const { plants, loading } = useData();
  const [round, setRound] = useState(0);
  const qs = useMemo(() => (plants.length > 6 ? build(plants) : []), [plants, round]); // eslint-disable-line
  const [i, setI] = useState(0); const [score, setScore] = useState(0); const [chosen, setChosen] = useState(null);
  const best = (() => { try { return Number(localStorage.getItem('df_best') || 0); } catch { return 0; } })();
  if (loading) return <div className="page narrow center"><p>Loading…</p></div>;
  if (!qs.length) return <div className="page narrow center"><p>Not enough plants for a quiz yet.</p></div>;
  const done = i >= qs.length; const q = qs[i];
  if (done) { try { if (score > best) localStorage.setItem('df_best', String(score)); } catch { /* ignore */ } }
  const restart = () => { setRound((r) => r + 1); setI(0); setScore(0); setChosen(null); };
  return (
    <div className="page narrow">
      <header className="page-head center"><p className="eyebrow">🎓 Learn</p><h1>Herbal knowledge quiz</h1><p className="lead">Questions are generated from the live plant database.</p></header>
      {!done ? (
        <section className="glass-lite pad quiz">
          <div className="progress"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div>
          <p className="muted small">Question {i + 1} of {qs.length} · Score {score}</p>
          <h2>{q.q}</h2>
          {q.opts.map((o) => <button key={o} disabled={chosen !== null} className={`opt ${chosen !== null ? (o === q.a ? 'right' : o === chosen ? 'wrong' : '') : ''}`} onClick={() => { setChosen(o); if (o === q.a) setScore((s) => s + 1); }}>{o}</button>)}
          {chosen !== null && <div className="why"><p>{chosen === q.a ? '✅ Correct! ' : '❌ Not quite. '}{q.why} <Link to={`/plants/${q.slug}`}>Learn more →</Link></p><button className="btn" onClick={() => { setI(i + 1); setChosen(null); }}>{i + 1 === qs.length ? 'See result' : 'Next →'}</button></div>}
        </section>
      ) : (
        <section className="glass-lite pad center"><h2>You scored {score} / {qs.length}</h2><p>{score >= 8 ? '🌟 Master herbalist!' : score >= 5 ? '🌿 Growing nicely!' : '🌱 Keep exploring the garden.'}</p><p className="muted">Best: {Math.max(best, score)}</p><button className="btn" onClick={restart}>Play again</button></section>
      )}
    </div>
  );
}
