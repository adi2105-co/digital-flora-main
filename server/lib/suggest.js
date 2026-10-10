// Symptom -> plant ranking. Pure functions (no DB) so they are easy to test.
const SYNONYMS = {
  cold: ['cold', 'cough', 'congestion', 'runny nose', 'sneezing', 'sore throat'],
  flu: ['fever', 'cold', 'cough', 'body ache'],
  'stomach ache': ['indigestion', 'gas', 'flatulence', 'colic', 'nausea'],
  stomach: ['indigestion', 'gas', 'nausea', 'acidity', 'constipation'],
  gas: ['gas', 'flatulence', 'indigestion', 'bloating'],
  acidity: ['acidity', 'heartburn', 'indigestion', 'ulcer'],
  pimples: ['acne', 'skin infection', 'skin'], pimple: ['acne', 'skin infection'],
  rash: ['skin', 'itching', 'eczema', 'skin infection'], itching: ['itching', 'skin', 'eczema'],
  'hair loss': ['hair fall', 'hair', 'dandruff'], hairfall: ['hair fall'], 'hair fall': ['hair fall', 'hair'],
  sugar: ['diabetes', 'blood sugar'], diabetes: ['diabetes', 'blood sugar'],
  bp: ['blood pressure', 'hypertension'], 'high bp': ['blood pressure', 'hypertension'],
  heart: ['heart', 'cholesterol', 'blood pressure'],
  sleep: ['insomnia', 'sleeplessness', 'stress', 'anxiety'], 'cant sleep': ['insomnia', 'stress'],
  stress: ['stress', 'anxiety', 'insomnia', 'memory'], tension: ['stress', 'anxiety'],
  memory: ['memory', 'stress', 'focus'], focus: ['memory', 'focus', 'stress'],
  tired: ['fatigue', 'weakness', 'immunity', 'stress'], weakness: ['weakness', 'fatigue', 'immunity'],
  'joint pain': ['joint pain', 'arthritis', 'inflammation'], arthritis: ['arthritis', 'joint pain', 'inflammation'],
  pain: ['pain', 'headache', 'joint pain', 'inflammation'], 'body pain': ['pain', 'joint pain'],
  headache: ['headache', 'migraine', 'stress'], migraine: ['headache', 'migraine'],
  wound: ['wounds', 'wound', 'cuts', 'burns', 'skin'], cut: ['wounds', 'cuts'], burn: ['burns', 'skin', 'wounds'],
  period: ['menstrual', 'menstrual disorders', 'womens health'], women: ['womens health', 'menstrual', 'lactation'],
  immunity: ['immunity', 'fever', 'cold'], diarrhoea: ['diarrhea', 'dysentery', 'indigestion'],
  diarrhea: ['diarrhea', 'dysentery'], constipation: ['constipation', 'indigestion'],
  eye: ['eye', 'eyes', 'vision'], eyes: ['eye', 'eyes', 'vision'],
  mouth: ['mouth ulcers', 'gum', 'dental', 'toothache'], tooth: ['toothache', 'dental', 'gum'],
  weight: ['obesity', 'weight loss', 'cholesterol'], obesity: ['obesity', 'weight loss'],
  breath: ['asthma', 'bronchitis', 'cough'], asthma: ['asthma', 'bronchitis', 'cough'],
  liver: ['liver', 'jaundice', 'hepatitis'], kidney: ['kidney', 'urinary', 'kidney stones'],
};
const STOP = new Set(['i', 'have', 'has', 'a', 'an', 'the', 'my', 'and', 'or', 'with', 'for', 'of', 'in', 'on', 'is', 'am', 'feel', 'feeling', 'since', 'from', 'to', 'very', 'bad', 'some', 'got', 'getting', 'suffering']);

function expandTerms(text) {
  const clean = String(text || '').toLowerCase().replace(/[^a-z0-9 ,;/&-]/g, ' ');
  const phrases = clean.split(/[,;/&]| and /).map((s) => s.trim()).filter(Boolean);
  const tokens = clean.split(/[\s,;/&]+/).filter((t) => t && !STOP.has(t));
  const direct = new Set(); const expanded = new Set();
  for (const ph of [...phrases, ...tokens]) {
    const p = ph.replace(/\s+/g, ' ');
    direct.add(p);
    for (const s of SYNONYMS[p] || []) expanded.add(s);
  }
  return { direct: [...direct], expanded: [...expanded].filter((e) => !direct.has(e)) };
}

/** Ranks plants for free-text symptoms (+ optional dosha to balance). */
function suggest(plants, text, dosha) {
  const { direct, expanded } = expandTerms(text);
  if (!direct.length && !dosha) return [];
  const out = [];
  for (const p of plants) {
    let score = 0; const reasons = new Set();
    const tags = (p.ailments || []).map((a) => a.toLowerCase());
    const hay = (p.uses || []).map((u) => `${u.title} ${u.detail}`).join(' ').toLowerCase();
    const names = [p.common_name, p.botanical_name, p.sanskrit_name, ...(p.other_names || [])].join(' ').toLowerCase();
    const hit = (term, w, label) => {
      const tagHit = tags.find((t) => t === term || t.includes(term) || (term.length > 3 && term.includes(t)));
      if (tagHit) { score += w * 3; reasons.add(tagHit); }
      else if (term.length > 2 && hay.includes(term)) { score += w; reasons.add(term); }
      if (term.length > 3 && names.includes(term)) { score += w * 2; reasons.add(`name matches "${term}"`); }
    };
    direct.forEach((t) => hit(t, 1));
    expanded.forEach((t) => hit(t, 0.5));
    if (dosha && ['vata', 'pitta', 'kapha'].includes(dosha)) {
      const eff = p.ayurveda?.doshas?.[dosha];
      if (eff === 'decreases') { score += score > 0 ? 1.5 : 1; reasons.add(`balances ${dosha}`); }
      else if (eff === 'increases' && score > 0) score -= 1;
    }
    if (score > 0) out.push({ id: p.id, slug: p.slug, score: +score.toFixed(2), reasons: [...reasons].slice(0, 5) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 12);
}

module.exports = { suggest, expandTerms };
