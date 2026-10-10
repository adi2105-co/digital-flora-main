import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createJungle } from '../three/jungle.js';
import { useData } from '../context/Data.jsx';
import { useLang } from '../context/Lang.jsx';
import { api } from '../api.js';
import Reveal from '../components/Reveal.jsx';

const SHOWCASE = ['tulsi', 'neem', 'lotus', 'turmeric', 'aloe-vera', 'giloy', 'amla', 'hibiscus', 'lemongrass', 'ashwagandha'];

function Counter({ to, label }) {
  const [n, setN] = useState(0); const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || !to) return undefined;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 1400); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <div ref={ref} className="counter"><b>{n}</b><span>{label}</span></div>;
}

export default function Home() {
  const { plants, bySlug } = useData();
  const { t } = useLang();
  const nav = useNavigate();
  const host = useRef(null); const jungle = useRef(null);
  const [tip, setTip] = useState(null); const [stats, setStats] = useState(null); const [noGL, setNoGL] = useState(false);

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  useEffect(() => {
    if (!plants.length || !host.current) return undefined;
    const showcase = SHOWCASE.map((s) => bySlug[s]).filter(Boolean).map((p) => ({ slug: p.slug, name: p.common_name.split('(')[0].trim(), latin: p.botanical_name.replace(/\s*\(.*\)/, ''), spec: p.model_spec }));
    const fillers = plants.filter((p) => p.model_spec?.archetype === 'tree').map((p) => p.model_spec);
    try {
      jungle.current = createJungle(host.current, { showcase: showcase.length ? showcase : plants.slice(0, 6).map((p) => ({ slug: p.slug, name: p.common_name, spec: p.model_spec })), fillers, onHover: setTip, onPick: (slug) => nav(`/plants/${slug}`) });
    } catch (e) { console.warn(e); setNoGL(true); }
    const onScroll = () => { const max = document.documentElement.scrollHeight - innerHeight; jungle.current?.setProgress(max > 0 ? scrollY / max : 0); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => { removeEventListener('scroll', onScroll); jungle.current?.dispose(); jungle.current = null; };
  }, [plants, bySlug, nav]);

  const goals = [
    ['🌱', 'Easier', 'Explore hundreds of years of herbal knowledge comfortably from any device - no garden visit needed.'],
    ['🛡️', 'Safer', 'Reliable, structured information on uses, preparations, precautions and drug interactions.'],
    ['🌍', 'More accessible', 'Available in English, Hindi and Marathi, free of cost, from anywhere in the world.'],
    ['📷', 'Plant recognition', 'Upload a photo and AI matches it to the plant in our database to reduce mis-identification.'],
    ['🎓', 'Educational', 'Learn through 3D models, maps, quizzes and the classical Ayurvedic framework of rasa, guna and dosha.'],
    ['♻️', 'Conservation', 'Highlights native range and conservation status to promote sustainable use of medicinal plants.'],
  ];
  const feats = [
    ['/garden', '🌳', '3D Virtual Garden', 'Walk a circular herbal garden. Click any plant to fly to it.'],
    ['/advisor', '🩺', 'Health Advisor', 'Type or speak a symptom and get ranked herbal suggestions. Take the Prakriti (dosha) quiz.'],
    ['/identify', '🔍', 'Identify by Photo', 'Snap a leaf or flower. We match it to the database.'],
    ['/map', '🗺️', 'Where it Grows', 'Interactive maps showing the regions where each plant is found.'],
    ['/plants', '📚', 'Ayurveda Library', 'Rasa, guna, virya, vipaka, doshas, classical references and Vedic notes.'],
    ['/login', '🧑‍⚕️', 'Advisor Portal', 'Advisors add new plants, answer questions and suggest remedies.'],
  ];

  return (
    <div className="home">
      <div className="jungle-bg" ref={host} />
      {noGL && <div className="jungle-fallback" />}
      <div className="jungle-vignette" />
      {tip && <div className="jungle-tip">🌿 {tip.name}<small>Click to open</small></div>}

      <section className="hero">
        <div className="hero-in">
          <p className="eyebrow">Digital Flora · Virtual Herbal Garden</p>
          <h1>{t('heroTitle1')}<br /><span className="grad">{t('heroTitle2')}</span></h1>
          <p className="lead">{t('heroSub')}</p>
          <div className="hero-cta">
            <Link to="/garden" className="btn btn-lg">{t('enterGarden')}</Link>
            <Link to="/identify" className="btn btn-lg btn-ghost">{t('identifyPlant')}</Link>
          </div>
          <p className="hint">👆 Hover the plants in the jungle · {t('scrollHint')} ↓</p>
        </div>
      </section>

      <section className="panel-wrap left">
        <Reveal className="glass">
          <p className="eyebrow">{t('objective')}</p>
          <h2>Making the knowledge of herbs easier, safer and open to everyone</h2>
          <p>Traditional herbal wisdom - Ayurveda, Siddha, Unani - is scattered across texts and hard to understand. Physical herb gardens reach only a few people, and mistaking one plant for another can be dangerous. Digital Flora brings the garden to your screen.</p>
          <div className="goal-grid">
            {goals.map(([i, h, p], k) => <Reveal key={h} delay={k * 70} className="goal"><span>{i}</span><h4>{h}</h4><p>{p}</p></Reveal>)}
          </div>
        </Reveal>
      </section>

      <section className="panel-wrap right">
        <Reveal className="glass">
          <h2>The garden in numbers</h2>
          <div className="counters">
            <Counter to={stats?.plants || plants.length} label="medicinal plants" />
            <Counter to={stats?.regions || 0} label="regions mapped" />
            <Counter to={stats?.ailments || 0} label="ailments covered" />
            <Counter to={stats?.advisors || 0} label="advisors" />
          </div>
        </Reveal>
      </section>

      <section className="panel-wrap left">
        <Reveal className="glass wide">
          <h2>Everything you need, in one living ecosystem</h2>
          <div className="feat-grid">
            {feats.map(([to, i, h, p], k) => <Reveal key={to} delay={k * 60}><Link to={to} className="feat"><span>{i}</span><h4>{h}</h4><p>{p}</p></Link></Reveal>)}
          </div>
        </Reveal>
      </section>

      <section className="panel-wrap right">
        <Reveal className="glass quote">
          <p className="eyebrow">From the Vedas</p>
          <blockquote>The Rigveda contains a whole hymn in praise of herbs - the <em>Aushadhi Sukta</em> (RV 10.97) - describing plants as healers older than the gods. Digital Flora keeps this lineage alive: every plant profile links its Sanskrit names, classical texts and, where honestly known, its Vedic mentions.</blockquote>
          <Link to="/plants" className="btn">Browse the library</Link>
        </Reveal>
      </section>

      <section className="panel-wrap center-wrap">
        <Reveal className="glass center">
          <h2>Join the garden</h2>
          <p>Create a free account to save plants, keep notes and ask a qualified advisor. Advisors can grow the garden by adding new plants.</p>
          <div className="hero-cta"><Link to="/register" className="btn btn-lg">Create account</Link><Link to="/login" className="btn btn-lg btn-ghost">Login</Link></div>
        </Reveal>
      </section>
      <div className="home-spacer" />
    </div>
  );
}
