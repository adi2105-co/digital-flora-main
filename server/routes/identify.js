const router = require('express').Router();
const multer = require('multer');
const { query } = require('../db');
const { auth } = require('../middleware/auth');
const { identify } = require('../lib/identify');
const { all } = require('./plants');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

router.post('/', auth(false), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please attach an image' });
    if (!/^image\/(jpeg|png|webp)$/.test(req.file.mimetype)) return res.status(400).json({ error: 'Use a JPG, PNG or WEBP image' });
    let features = null;
    try { features = JSON.parse(req.body.features || 'null'); } catch { /* ignore */ }
    const plants = await all();
    const r = await identify(plants, { file: req.file, features, hint: req.body.hint, organ: req.body.organ });
    const top = r.matches[0];
    if (top) query('INSERT INTO identifications (user_id,plant_id,method,confidence) VALUES ($1,$2,$3,$4)', [req.user?.id || null, top.plant.id, r.method, top.confidence]).catch(() => {});
    res.json({
      method: r.method, label: r.label, note: r.note, errors: r.errors,
      matches: r.matches.map((m) => ({ slug: m.plant.slug, common_name: m.plant.common_name, botanical_name: m.plant.botanical_name, confidence: m.confidence })),
      external: r.external,
    });
  } catch (e) { next(e); }
});

router.get('/history', auth(), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.id,i.method,i.confidence,i.created_at,p.slug,p.common_name FROM identifications i
       LEFT JOIN plants p ON p.id=i.plant_id WHERE i.user_id=$1 ORDER BY i.created_at DESC LIMIT 20`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
