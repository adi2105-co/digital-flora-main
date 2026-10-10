// Creates tables and loads regions + plants + demo accounts. Safe to run many times.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { upsertPlant } = require('./lib/plantStore');

async function main() {
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log('✔ tables ready');

  const regions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/regions.json'), 'utf8'));
  for (const r of regions) {
    await pool.query(
      `INSERT INTO regions (name,state,country,lat,lng,radius_km,biome) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (name) DO UPDATE SET state=$2,country=$3,lat=$4,lng=$5,radius_km=$6,biome=$7`,
      [r.name, r.state, r.country, r.lat, r.lng, r.radius_km, r.biome]
    );
  }
  console.log(`✔ ${regions.length} regions`);

  const dir = path.join(__dirname, 'data/plants');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const f of files) await upsertPlant(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  console.log(`✔ ${files.length} plants`);

  const demo = [
    ['Demo Advisor', 'advisor@flora.com', 'advisor123', 'advisor', 'Ayurvedic herbal medicine'],
    ['Demo User', 'user@flora.com', 'user123', 'user', null],
  ];
  for (const [name, email, pw, role, spec] of demo) {
    await pool.query(
      `INSERT INTO users (name,email,password_hash,role,specialty) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO NOTHING`,
      [name, email, bcrypt.hashSync(pw, 10), role, spec]
    );
  }
  console.log('✔ demo accounts: advisor@flora.com / advisor123   user@flora.com / user123');
}

main().then(() => pool.end()).catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
