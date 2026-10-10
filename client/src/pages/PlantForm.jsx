import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useData } from '../context/Data.jsx';
import Viewer3D from '../components/Viewer3D.jsx';

const SYSTEMS = ['Ayurveda', 'Unani', 'Siddha', 'Homeopathy', 'Yoga & Naturopathy', 'Traditional Chinese Medicine'];
const RASAS = ['Madhura (sweet)', 'Amla (sour)', 'Lavana (salty)', 'Katu (pungent)', 'Tikta (bitter)', 'Kashaya (astringent)'];
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function fromPlant(p) {
  const m = p?.model_spec || {};
  return {
    common_name: p?.common_name || '', botanical_name: p?.botanical_name || '', family: p?.family || '', plant_type: p?.plant_type || 'herb',
    sanskrit_name: p?.sanskrit_name || '', hindi_name: p?.hindi_name || '', marathi_name: p?.marathi_name || '',
    ayush_systems: p?.ayush_systems || ['Ayurveda'], description: p?.description || '', cultural_significance: p?.cultural_significance || '', habitat: p?.habitat || '',
    parts_used: (p?.parts_used || []).join(', '), ailments: (p?.ailments || []).join(', '), chemistry: (p?.chemistry || []).join(', '), precautions: p?.precautions || '', fun_fact: p?.fun_fact || '',
    uses: p?.uses?.length ? p.uses : [{ title: '', detail: '', system: 'Ayurveda' }],
    preparations: p?.preparations?.length ? p.preparations : [{ name: '', method: '', note: '' }],
    rasa: p?.ayurveda?.rasa || [], virya: p?.ayurveda?.virya || 'Ushna (hot)', vipaka: p?.ayurveda?.vipaka || 'Katu', doshas: p?.ayurveda?.doshas || { vata: 'neutral', pitta: 'neutral', kapha: 'neutral' },
    classical: (p?.ayurveda?.classical_refs || []).join('; '), vedic_note: p?.ayurveda?.vedic_note || '',
    regions: (p?.regions || []).map((r) => ({ name: r.name, abundance: r.abundance, note: r.note || '' })),
    archetype: m.archetype || 'herb', leafShape: m.leaf?.shape || 'ovate', leafColor: m.leaf?.color || '#4f8f3a', stem: m.stem || '#6b4f3a', height: m.height || 1,
    hasFlower: !!m.flower, flowerColor: m.flower?.color || '#e9a7b8', petals: m.flower?.petals || 5, cluster: m.flower?.cluster || 'single',
    hasFruit: !!m.fruit, fruitColor: m.fruit?.color || '#c0392b', fruitShape: m.fruit?.shape || 'round',
    hasRoot: !!m.root, rootColor: m.root?.color || '#c8862a', rootKind: m.root?.kind || 'rhizome', key_part: m.key_part || 'leaf',
    cultivation: p?.cultivation || {},
  };
}

const specOf = (f) => ({
  archetype: f.archetype, leaf: { shape: f.leafShape, color: f.leafColor, size: 1 }, stem: f.stem, height: Number(f.height),
  flower: f.hasFlower ? { color: f.flowerColor, petals: Number(f.petals), size: 0.6, cluster: f.cluster } : null,
  fruit: f.hasFruit ? { color: f.fruitColor, shape: f.fruitShape } : null,
  root: f.hasRoot ? { color: f.rootColor, kind: f.rootKind } : null, key_part: f.key_part,
});

export default function PlantForm({ plant, onSaved, onCancel }) {
  const { regions, reload } = useData();
  const [f, setF] = useState(() => fromPlant(plant));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [addRegion, setAddRegion] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const spec = useMemo(() => specOf(f), [f.archetype, f.leafShape, f.leafColor, f.stem, f.height, f.hasFlower, f.flowerColor, f.petals, f.cluster, f.hasFruit, f.fruitColor, f.fruitShape, f.hasRoot, f.rootColor, f.rootKind, f.key_part]); // eslint-disable-line
  const toggle = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const row = (k, i, key, val) => setF((s) => ({ ...s, [k]: s[k].map((r, j) => (j === i ? { ...r, [key]: val } : r)) }));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const payload = {
      common_name: f.common_name, botanical_name: f.botanical_name, family: f.family, plant_type: f.plant_type, sanskrit_name: f.sanskrit_name, hindi_name: f.hindi_name, marathi_name: f.marathi_name,
      ayush_systems: f.ayush_systems, description: f.description, cultural_significance: f.cultural_significance, habitat: f.habitat, parts_used: csv(f.parts_used), ailments: csv(f.ailments), chemistry: csv(f.chemistry),
      precautions: f.precautions, fun_fact: f.fun_fact, uses: f.uses.filter((u) => u.title.trim()), preparations: f.preparations.filter((u) => u.name.trim()),
      ayurveda: { ...(plant?.ayurveda || {}), rasa: f.rasa, virya: f.virya, vipaka: f.vipaka, doshas: f.doshas, classical_refs: f.classical.split(';').map((x) => x.trim()).filter(Boolean), vedic_note: f.vedic_note },
      regions: f.regions, model_spec: spec, cultivation: f.cultivation,
    };
    try { const saved = plant ? await api.updatePlant(plant.slug, payload) : await api.createPlant(payload); await reload(); onSaved(saved); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <form className="pform" onSubmit={submit}>
      <div className="pform-grid">
        <div className="pform-main">
          <h3>Basics</h3>
          <div className="fgrid">
            <label>Common name *<input className="input" required value={f.common_name} onChange={set('common_name')} /></label>
            <label>Botanical name *<input className="input" required value={f.botanical_name} onChange={set('botanical_name')} /></label>
            <label>Family<input className="input" value={f.family} onChange={set('family')} /></label>
            <label>Type<select className="input" value={f.plant_type} onChange={set('plant_type')}>{['herb', 'shrub', 'tree', 'climber', 'grass', 'succulent', 'aquatic', 'rhizome', 'bulb'].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Sanskrit name<input className="input" value={f.sanskrit_name} onChange={set('sanskrit_name')} /></label>
            <label>हिन्दी नाम<input className="input" value={f.hindi_name} onChange={set('hindi_name')} /></label>
            <label>मराठी नाव<input className="input" value={f.marathi_name} onChange={set('marathi_name')} /></label>
            <label>Parts used (comma separated)<input className="input" value={f.parts_used} onChange={set('parts_used')} placeholder="Leaf, Root, Seed" /></label>
          </div>
          <label>Systems of medicine<div className="chips">{SYSTEMS.map((s) => <button type="button" key={s} className={`chip chip-btn ${f.ayush_systems.includes(s) ? 'on' : ''}`} onClick={() => toggle('ayush_systems', s)}>{s}</button>)}</div></label>
          <label>Description<textarea className="input" rows={3} value={f.description} onChange={set('description')} /></label>
          <label>Cultural significance<textarea className="input" rows={2} value={f.cultural_significance} onChange={set('cultural_significance')} /></label>
          <label>Habitat<input className="input" value={f.habitat} onChange={set('habitat')} /></label>
          <label>Fun fact<input className="input" value={f.fun_fact} onChange={set('fun_fact')} /></label>

          <h3>Uses &amp; suggestions</h3>
          <label>Ailment tags * <small>(comma separated - these power the symptom suggestions)</small><input className="input" required value={f.ailments} onChange={set('ailments')} placeholder="cough, cold, fever, acidity" /></label>
          {f.uses.map((u, i) => <div className="rowbox" key={i}><input className="input" placeholder="Use / condition" value={u.title} onChange={(e) => row('uses', i, 'title', e.target.value)} /><textarea className="input" rows={2} placeholder="How it is traditionally used" value={u.detail} onChange={(e) => row('uses', i, 'detail', e.target.value)} /><select className="input" value={u.system} onChange={(e) => row('uses', i, 'system', e.target.value)}>{[...SYSTEMS, 'Modern research'].map((s) => <option key={s}>{s}</option>)}</select></div>)}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setF((s) => ({ ...s, uses: [...s.uses, { title: '', detail: '', system: 'Ayurveda' }] }))}>+ Add use</button>
          {f.preparations.map((u, i) => <div className="rowbox" key={i}><input className="input" placeholder="Preparation name" value={u.name} onChange={(e) => row('preparations', i, 'name', e.target.value)} /><textarea className="input" rows={2} placeholder="Method" value={u.method} onChange={(e) => row('preparations', i, 'method', e.target.value)} /><input className="input" placeholder="Note" value={u.note} onChange={(e) => row('preparations', i, 'note', e.target.value)} /></div>)}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setF((s) => ({ ...s, preparations: [...s.preparations, { name: '', method: '', note: '' }] }))}>+ Add preparation</button>
          <label>Chemical constituents (comma separated)<input className="input" value={f.chemistry} onChange={set('chemistry')} /></label>
          <label>Precautions<textarea className="input" rows={3} value={f.precautions} onChange={set('precautions')} placeholder="Pregnancy, drug interactions, allergies, toxic parts..." /></label>

          <h3>Ayurveda</h3>
          <label>Rasa<div className="chips">{RASAS.map((s) => <button type="button" key={s} className={`chip chip-btn ${f.rasa.includes(s) ? 'on' : ''}`} onClick={() => toggle('rasa', s)}>{s}</button>)}</div></label>
          <div className="fgrid">
            <label>Virya<select className="input" value={f.virya} onChange={set('virya')}><option>Ushna (hot)</option><option>Sheeta (cold)</option></select></label>
            <label>Vipaka<select className="input" value={f.vipaka} onChange={set('vipaka')}><option>Madhura</option><option>Amla</option><option>Katu</option></select></label>
            {['vata', 'pitta', 'kapha'].map((d) => <label key={d}>{d[0].toUpperCase() + d.slice(1)}<select className="input" value={f.doshas[d]} onChange={(e) => setF((s) => ({ ...s, doshas: { ...s.doshas, [d]: e.target.value } }))}><option value="decreases">decreases</option><option value="neutral">neutral</option><option value="increases">increases</option></select></label>)}
          </div>
          <label>Classical references <small>(separate with ;)</small><input className="input" value={f.classical} onChange={set('classical')} /></label>
          <label>Vedic note <small>(only if you are sure of the source)</small><textarea className="input" rows={2} value={f.vedic_note} onChange={set('vedic_note')} /></label>

          <h3>Where it grows</h3>
          <div className="row"><select className="input grow" value={addRegion} onChange={(e) => setAddRegion(e.target.value)}><option value="">Add a region…</option>{regions.filter((r) => !f.regions.some((x) => x.name === r.name)).map((r) => <option key={r.id}>{r.name}</option>)}</select><button type="button" className="btn btn-sm" disabled={!addRegion} onClick={() => { setF((s) => ({ ...s, regions: [...s.regions, { name: addRegion, abundance: 'common', note: '' }] })); setAddRegion(''); }}>Add</button></div>
          {f.regions.map((r, i) => <div className="rowbox inline" key={r.name}><b>{r.name}</b><select className="input" value={r.abundance} onChange={(e) => row('regions', i, 'abundance', e.target.value)}>{['wild', 'common', 'cultivated', 'rare'].map((a) => <option key={a}>{a}</option>)}</select><button type="button" className="btn btn-sm btn-ghost" onClick={() => setF((s) => ({ ...s, regions: s.regions.filter((_, j) => j !== i) }))}>Remove</button></div>)}
        </div>

        <aside className="pform-side">
          <div className="sticky">
            <h3>3D model designer</h3>
            <Viewer3D spec={spec} slug={f.common_name || 'preview'} view="whole" className="viewer-md" />
            <p className="muted small">Live preview - your plant gets its own 3D model from these settings.</p>
            <div className="fgrid two">
              <label>Growth form<select className="input" value={f.archetype} onChange={set('archetype')}>{['herb', 'shrub', 'tree', 'rosette', 'grass', 'vine', 'rhizome', 'aquatic'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Leaf shape<select className="input" value={f.leafShape} onChange={set('leafShape')}>{['ovate', 'lanceolate', 'round', 'heart', 'pinnate', 'trifoliate', 'needle', 'blade', 'spike'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Leaf colour<input type="color" className="color" value={f.leafColor} onChange={set('leafColor')} /></label>
              <label>Stem colour<input type="color" className="color" value={f.stem} onChange={set('stem')} /></label>
              <label>Height ({f.height})<input type="range" min="0.5" max="3" step="0.1" value={f.height} onChange={set('height')} /></label>
              <label>Key medicinal part<select className="input" value={f.key_part} onChange={set('key_part')}>{['leaf', 'flower', 'fruit', 'root', 'bark', 'seed'].map((x) => <option key={x}>{x}</option>)}</select></label>
            </div>
            <label className="check"><input type="checkbox" checked={f.hasFlower} onChange={set('hasFlower')} /> Has flowers</label>
            {f.hasFlower && <div className="fgrid two"><label>Colour<input type="color" className="color" value={f.flowerColor} onChange={set('flowerColor')} /></label><label>Petals<input className="input" type="number" min="3" max="12" value={f.petals} onChange={set('petals')} /></label><label>Cluster<select className="input" value={f.cluster} onChange={set('cluster')}>{['single', 'spike', 'umbel', 'scatter'].map((x) => <option key={x}>{x}</option>)}</select></label></div>}
            <label className="check"><input type="checkbox" checked={f.hasFruit} onChange={set('hasFruit')} /> Has fruit</label>
            {f.hasFruit && <div className="fgrid two"><label>Colour<input type="color" className="color" value={f.fruitColor} onChange={set('fruitColor')} /></label><label>Shape<select className="input" value={f.fruitShape} onChange={set('fruitShape')}>{['round', 'berry', 'pod'].map((x) => <option key={x}>{x}</option>)}</select></label></div>}
            <label className="check"><input type="checkbox" checked={f.hasRoot} onChange={set('hasRoot')} /> Medicinal root / rhizome / bulb</label>
            {f.hasRoot && <div className="fgrid two"><label>Colour<input type="color" className="color" value={f.rootColor} onChange={set('rootColor')} /></label><label>Kind<select className="input" value={f.rootKind} onChange={set('rootKind')}>{['rhizome', 'tuber', 'bulb', 'taproot'].map((x) => <option key={x}>{x}</option>)}</select></label></div>}
          </div>
        </aside>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="row sticky-actions"><button className="btn btn-lg" disabled={busy}>{busy ? 'Saving…' : plant ? 'Save changes' : 'Add plant to the garden'}</button><button type="button" className="btn btn-lg btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
