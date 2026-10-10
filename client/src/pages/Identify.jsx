import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../context/Data.jsx';
import { useLang } from '../context/Lang.jsx';
import PlantThumb from '../components/PlantThumb.jsx';
import Disclaimer from '../components/Disclaimer.jsx';

/** Downscale the photo (also keeps us under Vercel's 4.5 MB body limit) and compute simple colour features. */
async function prepare(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  // features from a 96px sample
  const f = document.createElement('canvas'); const fs = 96 / Math.max(c.width, c.height); f.width = Math.max(8, Math.round(c.width * fs)); f.height = Math.max(8, Math.round(c.height * fs));
  const g = f.getContext('2d', { willReadFrequently: true }); g.drawImage(c, 0, 0, f.width, f.height);
  const d = g.getImageData(0, 0, f.width, f.height).data; const hue = new Array(12).fill(0);
  let n = 0, green = 0, flower = 0, brown = 0, edge = 0; const lum = [];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), dl = mx - mn;
    lum.push(0.3 * r + 0.59 * gg + 0.11 * b); n += 1;
    if (mx < 0.15 || dl / (mx || 1) < 0.18) continue;
    let h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h = (h * 60 + 360) % 360;
    const sat = dl / mx; hue[Math.min(11, Math.floor(h / 30))] += sat * mx;
    if (h > 70 && h < 170 && sat > 0.2) green += 1; else if (sat > 0.35 && mx > 0.35 && !(h >= 15 && h <= 45 && mx < 0.65)) flower += 1;
    if (h >= 15 && h <= 45 && sat > 0.25 && mx < 0.65) brown += 1;
  }
  for (let y = 1; y < f.height - 1; y++) for (let x = 1; x < f.width - 1; x++) { const i = y * f.width + x; edge += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + f.width] - lum[i - f.width]); }
  return { blob, preview: c.toDataURL('image/jpeg', 0.7), features: { hue, greenFrac: green / n, flowerFrac: flower / n, brownFrac: brown / n, edge: Math.min(1, edge / n / 0.25) } };
}

export default function Identify() {
  const { bySlug } = useData();
  const { t } = useLang();
  const input = useRef(null); const cam = useRef(null);
  const [img, setImg] = useState(null); const [hint, setHint] = useState(''); const [organ, setOrgan] = useState('auto'); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [drag, setDrag] = useState(false);

  const pick = async (file) => {
    if (!file) return; setErr(''); setRes(null);
    if (!/^image\//.test(file.type)) { setErr('Please choose an image file (JPG, PNG or WEBP).'); return; }
    try { setImg(await prepare(file)); } catch { setErr('Could not read that image. Try a JPG or PNG.'); }
  };
  const run = async () => {
    if (!img) return; setBusy(true); setErr('');
    try {
      const fd = new FormData(); fd.append('image', img.blob, 'plant.jpg'); fd.append('features', JSON.stringify(img.features)); fd.append('hint', hint); fd.append('organ', organ);
      setRes(await api.identify(fd));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const top = res?.matches?.[0]; const topPlant = top && bySlug[top.slug];

  return (
    <div className="page narrow">
      <header className="page-head center"><p className="eyebrow">📷 Plant identifier</p><h1>Identify a plant from a photo</h1><p className="lead">We compare your photo with the plants in our database and open the matching profile - 3D model, uses and precautions.</p></header>
      <div className={`drop ${drag ? 'drag' : ''}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
        {img ? <img src={img.preview} alt="Your plant" /> : <><span className="drop-ic">📷</span><p>{t('uploadHint')}</p><small>JPG, PNG or WEBP</small></>}
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files[0])} />
      </div>
      <div className="row wrap">
        <button className="btn btn-ghost" onClick={() => cam.current?.click()}>📱 Use camera</button>
        <select className="input" value={organ} onChange={(e) => setOrgan(e.target.value)} aria-label="Plant part"><option value="auto">Part: auto</option><option value="leaf">Leaf</option><option value="flower">Flower</option><option value="fruit">Fruit</option><option value="bark">Bark</option></select>
        <input className="input grow" placeholder="Know a name? Type it to refine (optional)" value={hint} onChange={(e) => setHint(e.target.value)} />
      </div>
      <div className="row"><button className="btn btn-lg" disabled={!img || busy} onClick={run}>{busy ? 'Analysing…' : `🔍 ${t('identifyBtn')}`}</button>{img && <button className="btn btn-ghost" onClick={() => { setImg(null); setRes(null); }}>{t('clear')}</button>}</div>
      {err && <p className="error">{err}</p>}
      {res && (
        <section className="result glass-lite">
          <p className="muted small">Matched with: <b>{res.label}</b></p>
          {res.note && <p className="warnbox small">{res.note}</p>}
          {topPlant ? (
            <div className="top-match">
              <PlantThumb plant={topPlant} />
              <div>
                <p className="eyebrow">Best match</p>
                <h2>{topPlant.common_name}</h2><p className="latin">{topPlant.botanical_name}</p>
                <div className="conf"><i style={{ width: `${Math.round(top.confidence * 100)}%` }} /></div>
                <p className="small">{t('confidence')}: <b>{Math.round(top.confidence * 100)}%</b></p>
                <Link className="btn" to={`/plants/${topPlant.slug}`}>Open profile & 3D model →</Link>
              </div>
            </div>
          ) : <p className="empty">No plant in our database matched this photo.</p>}
          {res.matches.length > 1 && <><h4>Other possibilities</h4><ul className="refs">{res.matches.slice(1).map((m) => <li key={m.slug}><Link to={`/plants/${m.slug}`}>{m.common_name}</Link> <span className="muted">({Math.round(m.confidence * 100)}%)</span></li>)}</ul></>}
          {res.external?.length > 0 && <><h4>Identified, but not yet in our garden</h4><ul className="refs">{res.external.map((m, i) => <li key={i}><i>{m.scientific_name}</i> {m.common_names?.length ? `(${m.common_names.join(', ')})` : ''} - ask an advisor to add it!</li>)}</ul></>}
        </section>
      )}
      <Disclaimer />
    </div>
  );
}
