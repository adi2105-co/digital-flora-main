require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/digital_flora';
const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 3 : 10,
});
pool.on('error', (e) => console.error('PG pool error:', e.message));

module.exports = { pool, query: (t, p) => pool.query(t, p) };
