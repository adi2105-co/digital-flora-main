const router = require('express').Router();
const { query } = require('../db');
const { auth, requireRole } = require('../middleware/auth');
router.use(auth());

const BASE = `
SELECT c.id,c.question,c.status,c.created_at,c.plant_id,u.name AS user_name,p.common_name AS plant_name,p.slug AS plant_slug,
 COALESCE((SELECT json_agg(json_build_object('id',r.id,'body',r.body,'advisor',a.name,'created_at',r.created_at,
    'suggested',(SELECT COALESCE(json_agg(json_build_object('slug',sp.slug,'common_name',sp.common_name)),'[]')
                 FROM plants sp WHERE sp.id = ANY(r.suggested_plant_ids))) ORDER BY r.created_at)
   FROM consultation_replies r JOIN users a ON a.id=r.advisor_id WHERE r.consultation_id=c.id),'[]') AS replies
FROM consultations c JOIN users u ON u.id=c.user_id LEFT JOIN plants p ON p.id=c.plant_id`;

router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ error: 'Advisors answer questions; log in as a user to ask one' });
    const q = String(req.body?.question || '').trim();
    if (q.length < 8) return res.status(400).json({ error: 'Please describe your question in a little more detail' });
    const { rows } = await query('INSERT INTO consultations (user_id,plant_id,question) VALUES ($1,$2,$3) RETURNING id',
      [req.user.id, req.body.plant_id || null, q.slice(0, 2000)]);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const where = req.user.role === 'advisor' ? '' : 'WHERE c.user_id=$1';
    const { rows } = await query(`${BASE} ${where} ORDER BY (c.status='open') DESC, c.created_at DESC LIMIT 100`, req.user.role === 'advisor' ? [] : [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/:id/reply', requireRole('advisor'), async (req, res, next) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (body.length < 5) return res.status(400).json({ error: 'Write a reply first' });
    const ids = (Array.isArray(req.body.suggested_plant_ids) ? req.body.suggested_plant_ids : []).map(Number).filter(Boolean);
    const c = await query('SELECT id FROM consultations WHERE id=$1', [req.params.id]);
    if (!c.rowCount) return res.status(404).json({ error: 'Question not found' });
    await query('INSERT INTO consultation_replies (consultation_id,advisor_id,body,suggested_plant_ids) VALUES ($1,$2,$3,$4)', [req.params.id, req.user.id, body.slice(0, 4000), ids]);
    await query("UPDATE consultations SET status='answered' WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
