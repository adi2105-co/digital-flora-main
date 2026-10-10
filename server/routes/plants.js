const router = require('express').Router();
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { listPlants, getPlant, upsertPlant, slugify } = require('../lib/plantStore');
const { suggest, expandTerms } = require('../lib/suggest');

let cache = { at: 0, rows: null };
const invalidate = () => { cache = { at: 0, rows: null }; };
async function all() {
  if (cache.rows && Date.now() - cache.at < 20000) return cache.rows;
  cache = { at: Date.now(), rows: await listPlants() };
  return cache.rows;
}

router.get('/regions', async (_req, res, next) => {
  try { res.json((await query('SELECT * FROM regions ORDER BY name')).rows); } catch (e) { next(e); }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const plants = await all();
    const regionCount = (await query('SELECT count(*)::int AS n FROM regions')).rows[0].n;
    const ail = new Set(plants.flatMap((p) => p.ailments));
    res.json({ plants: plants.length, regions: regionCount, ailments: ail.size, advisors: (await query("SELECT count(*)::int AS n FROM users WHERE role='advisor'")).rows[0].n });
  } catch (e) { next(e); }
});

router.get('/suggest', async (req, res, next) => {
  try {
    const plants = await all();
    const results = suggest(plants, req.query.q || '', req.query.dosha);
    res.json({ query: req.query.q || '', terms: expandTerms(req.query.q || ''), results });
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    let rows = await all();
    const { q, system, type, region, ailment, dosha } = req.query;
    if (q) {
      const s = String(q).toLowerCase();
      rows = rows.filter((p) => [p.common_name, p.botanical_name, p.sanskrit_name, p.hindi_name, p.marathi_name, p.family, ...(p.other_names || []), ...(p.ailments || [])].join(' ').toLowerCase().includes(s));
    }
    if (system) rows = rows.filter((p) => p.ayush_systems.includes(system));
    if (type) rows = rows.filter((p) => p.plant_type === type);
    if (region) rows = rows.filter((p) => p.regions.some((r) => r.name === region));
    if (ailment) rows = rows.filter((p) => p.ailments.includes(String(ailment).toLowerCase()));
    if (dosha) rows = rows.filter((p) => p.ayurveda?.doshas?.[dosha] === 'decreases');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const p = await getPlant(req.params.slug);
    if (!p) return res.status(404).json({ error: 'Plant not found' });
    res.json(p);
  } catch (e) { next(e); }
});

function validate(b) {
  if (!b || !b.common_name?.trim() || !b.botanical_name?.trim()) return 'Common name and botanical name are required';
  if (!Array.isArray(b.ailments) || !b.ailments.length) return 'Add at least one ailment / use tag so the plant can be suggested';
  return null;
}

router.post('/', auth(), requireRole('advisor'), async (req, res, next) => {
  try {
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });
    const slug = slugify(req.body.slug || req.body.common_name);
    if (!slug) return res.status(400).json({ error: 'Invalid name' });
    const exists = await query('SELECT 1 FROM plants WHERE slug=$1', [slug]);
    if (exists.rowCount) return res.status(409).json({ error: 'A plant with this name already exists - edit it instead' });
    const saved = await upsertPlant({ ...req.body, slug }, req.user.id);
    invalidate();
    res.status(201).json(await getPlant(saved.slug));
  } catch (e) { next(e); }
});

router.put('/:slug', auth(), requireRole('advisor'), async (req, res, next) => {
  try {
    const cur = await getPlant(req.params.slug);
    if (!cur) return res.status(404).json({ error: 'Plant not found' });
    const err = validate({ ...cur, ...req.body });
    if (err) return res.status(400).json({ error: err });
    const merged = { ...cur, ...req.body, slug: cur.slug, regions: req.body.regions ?? cur.regions };
    await upsertPlant(merged, cur.created_by);
    invalidate();
    res.json(await getPlant(cur.slug));
  } catch (e) { next(e); }
});

router.delete('/:slug', auth(), requireRole('advisor'), async (req, res, next) => {
  try {
    const cur = await getPlant(req.params.slug);
    if (!cur) return res.status(404).json({ error: 'Plant not found' });
    if (cur.created_by !== req.user.id) return res.status(403).json({ error: 'You can only delete plants you added' });
    await query('DELETE FROM plants WHERE id=$1', [cur.id]);
    invalidate();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
module.exports.all = all;
