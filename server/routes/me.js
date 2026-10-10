const router = require('express').Router();
const { query } = require('../db');
const { auth } = require('../middleware/auth');
router.use(auth());

router.get('/bookmarks', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id,p.slug,p.common_name,p.botanical_name,p.plant_type FROM bookmarks b JOIN plants p ON p.id=b.plant_id
       WHERE b.user_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});
router.put('/bookmarks/:plantId', async (req, res, next) => {
  try {
    await query('INSERT INTO bookmarks (user_id,plant_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.plantId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.delete('/bookmarks/:plantId', async (req, res, next) => {
  try { await query('DELETE FROM bookmarks WHERE user_id=$1 AND plant_id=$2', [req.user.id, req.params.plantId]); res.json({ ok: true }); }
  catch (e) { next(e); }
});

router.get('/notes', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT n.plant_id,n.body,n.updated_at,p.slug,p.common_name FROM notes n JOIN plants p ON p.id=n.plant_id
       WHERE n.user_id=$1 ORDER BY n.updated_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (e) { next(e); }
});
router.put('/notes/:plantId', async (req, res, next) => {
  try {
    const body = String(req.body?.body || '').slice(0, 4000);
    if (!body.trim()) { await query('DELETE FROM notes WHERE user_id=$1 AND plant_id=$2', [req.user.id, req.params.plantId]); return res.json({ ok: true }); }
    await query(
      `INSERT INTO notes (user_id,plant_id,body) VALUES ($1,$2,$3)
       ON CONFLICT (user_id,plant_id) DO UPDATE SET body=$3, updated_at=now()`, [req.user.id, req.params.plantId, body]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
