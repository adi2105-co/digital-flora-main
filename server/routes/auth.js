const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { sign, auth } = require('../middleware/auth');

const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, specialty: u.specialty });
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'user', advisorCode, specialty } = req.body || {};
    if (!name?.trim() || !emailOk(email || '') || (password || '').length < 6)
      return res.status(400).json({ error: 'Enter your name, a valid email and a password of 6+ characters' });
    if (!['user', 'advisor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (role === 'advisor' && advisorCode !== (process.env.ADVISOR_CODE || 'AYUSH2026'))
      return res.status(403).json({ error: 'Wrong advisor access code' });
    const exists = await query('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rowCount) return res.status(409).json({ error: 'This email is already registered' });
    const { rows } = await query(
      'INSERT INTO users (name,email,password_hash,role,specialty) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name.trim(), email.toLowerCase(), bcrypt.hashSync(password, 10), role, specialty || null]
    );
    res.status(201).json({ token: sign(rows[0]), user: pub(rows[0]) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    const { rows } = await query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()]);
    const u = rows[0];
    if (!u || !bcrypt.compareSync(password || '', u.password_hash)) return res.status(401).json({ error: 'Wrong email or password' });
    if (role && role !== u.role) return res.status(403).json({ error: `This account is a${u.role === 'advisor' ? 'n advisor' : ' user'} account. Use the ${u.role} tab to log in.` });
    res.json({ token: sign(u), user: pub(u) });
  } catch (e) { next(e); }
});

router.get('/me', auth(), async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Account not found' });
    res.json({ user: pub(rows[0]) });
  } catch (e) { next(e); }
});

module.exports = router;
