import React, { useMemo, useState } from 'react';
import { useData } from '../context/Data.jsx';
import { useLang } from '../context/Lang.jsx';
import PlantCard from '../components/PlantCard.jsx';

export default function Plants() {
  const { plants, regions, meta, loading } = useData();
  const { t } = useLang();
  const [q, setQ] = useState(''); const [system, setSystem] = useState(''); const [type, setType] = useState(''); const [region, setRegion] = useState(''); const [dosha, setDosha] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return plants.filter((p) =>
      (!s || [p.common_name, p.botanical_name, p.sanskrit_name, p.hindi_name, p.marathi_name, p.family, ...p.other_names, ...p.ailments].join(' ').toLowerCase().includes(s)) &&
      (!system || p.ayush_systems.includes(system)) && (!type || p.plant_type === type) &&
      (!region || p.regions.some((r) => r.name === region)) && (!dosha || p.ayurveda?.doshas?.[dosha] === 'decreases'));
  }, [plants, q, system, type, region, dosha]);
  return (
    <div className="page">
      <header className="page-head"><p className="eyebrow">Library</p><h1>Medicinal plant library</h1><p className="lead">Every plant has its own 3D model - tap one to meet it.</p></header>
      <div className="filters glass-lite">
        <input className="input grow" placeholder={t('searchPlants')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={system} onChange={(e) => setSystem(e.target.value)}><option value="">{t('allSystems')}</option>{meta.systems.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="">{t('allTypes')}</option>{meta.types.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input" value={dosha} onChange={(e) => setDosha(e.target.value)}><option value="">{t('anyDosha')}</option>{['vata', 'pitta', 'kapha'].map((d) => <option key={d} value={d}>balances {d}</option>)}</select>
        <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}><option value="">{t('allRegions')}</option>{regions.map((r) => <option key={r.id}>{r.name}</option>)}</select>
      </div>
      <p className="count">{loading ? 'Loading…' : `${list.length} ${t('results')}`}</p>
      <div className="grid">{list.map((p) => <PlantCard key={p.slug} plant={p} />)}</div>
      {!loading && !list.length && <p className="empty">No plants match. Try clearing a filter.</p>}
    </div>
  );
}
