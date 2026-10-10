const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });

function auth(required = true) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: 'Please log in' }) : next();
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { return required ? res.status(401).json({ error: 'Session expired, please log in again' }) : next(); }
  };
}
const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : res.status(403).json({ error: `Only ${role}s can do this` });

module.exports = { sign, auth, requireRole };
