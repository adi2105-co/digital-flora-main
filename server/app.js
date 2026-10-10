require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Digital Flora API' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/plants', require('./routes/plants'));
app.use('/api/identify', require('./routes/identify'));
app.use('/api/me', require('./routes/me'));
app.use('/api/consultations', require('./routes/consult'));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 4 MB)'
    : /ECONNREFUSED|password authentication|does not exist/.test(err.message || '') ? 'Database not reachable - check DATABASE_URL and run "npm run db:setup"'
    : 'Something went wrong on the server';
  res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: msg });
});

module.exports = app;
