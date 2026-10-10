const { pool } = require('../db');

const slugify = (s) => String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SELECT = `
SELECT p.*, COALESCE((
  SELECT json_agg(json_build_object('name',r.name,'state',r.state,'country',r.country,'lat',r.lat,'lng',r.lng,
         'radius_km',r.radius_km,'biome',r.biome,'abundance',pr.abundance,'note',pr.note) ORDER BY r.name)
  FROM plant_regions pr JOIN regions r ON r.id = pr.region_id WHERE pr.plant_id = p.id), '[]') AS regions
FROM plants p`;

async function listPlants(db = pool) {
  const { rows } = await db.query(`${SELECT} ORDER BY p.common_name`);
  return rows;
}
async function getPlant(slugOrId, db = pool) {
  const isId = /^\d+$/.test(String(slugOrId));
  const { rows } = await db.query(`${SELECT} WHERE ${isId ? 'p.id' : 'p.slug'} = $1`, [slugOrId]);
  return rows[0];
}

const arr = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);
const json = (v, d) => JSON.stringify(v ?? d);

const DEFAULT_SPEC = {
  herb: { archetype: 'herb', leaf: { shape: 'ovate', color: '#4f8f3a', size: 1 }, stem: '#6b8f4a', flower: null, fruit: null, root: null, height: 1, key_part: 'leaf' },
  shrub: { archetype: 'shrub', leaf: { shape: 'ovate', color: '#3f7f35', size: 1 }, stem: '#6b4f3a', flower: null, fruit: null, root: null, height: 1.6, key_part: 'leaf' },
  tree: { archetype: 'tree', leaf: { shape: 'ovate', color: '#2f7a35', size: 1 }, stem: '#6b4a32', flower: null, fruit: null, root: null, height: 2.6, key_part: 'bark' },
};
function normalizeSpec(p) {
  const base = DEFAULT_SPEC[p.plant_type] || DEFAULT_SPEC[['tree'].includes(p.plant_type) ? 'tree' : 'herb'];
  return { ...base, ...(p.model_spec || {}) };
}

/** Insert or update a plant (+ its regions) from a plain object. */
async function upsertPlant(p, userId = null) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const slug = p.slug ? slugify(p.slug) : slugify(p.common_name);
    const { rows } = await c.query(
      `INSERT INTO plants (slug,common_name,botanical_name,family,plant_type,sanskrit_name,hindi_name,marathi_name,other_names,
         ayush_systems,description,cultural_significance,habitat,parts_used,ailments,uses,ayurveda,preparations,chemistry,
         precautions,cultivation,conservation_status,fun_fact,model_spec,image_url,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       ON CONFLICT (slug) DO UPDATE SET common_name=$2,botanical_name=$3,family=$4,plant_type=$5,sanskrit_name=$6,hindi_name=$7,
         marathi_name=$8,other_names=$9,ayush_systems=$10,description=$11,cultural_significance=$12,habitat=$13,parts_used=$14,
         ailments=$15,uses=$16,ayurveda=$17,preparations=$18,chemistry=$19,precautions=$20,cultivation=$21,
         conservation_status=$22,fun_fact=$23,model_spec=$24,image_url=$25,updated_at=now()
       RETURNING id, slug`,
      [slug, p.common_name, p.botanical_name, p.family || null, p.plant_type || 'herb', p.sanskrit_name || null,
       p.hindi_name || null, p.marathi_name || null, arr(p.other_names), arr(p.ayush_systems), p.description || null,
       p.cultural_significance || null, p.habitat || null, arr(p.parts_used), arr(p.ailments).map((s) => s.toLowerCase()),
       json(p.uses, []), json(p.ayurveda, {}), json(p.preparations, []), arr(p.chemistry), p.precautions || null,
       json(p.cultivation, {}), p.conservation_status || null, p.fun_fact || null, json(normalizeSpec(p), {}),
       p.image_url || null, userId]
    );
    const id = rows[0].id;
    if (Array.isArray(p.regions)) {
      await c.query('DELETE FROM plant_regions WHERE plant_id=$1', [id]);
      for (const r of p.regions) {
        const rr = await c.query('SELECT id FROM regions WHERE name=$1', [r.name]);
        if (!rr.rows[0]) continue;
        await c.query(
          `INSERT INTO plant_regions (plant_id,region_id,abundance,note) VALUES ($1,$2,$3,$4)
           ON CONFLICT (plant_id,region_id) DO UPDATE SET abundance=$3,note=$4`,
          [id, rr.rows[0].id, ['wild', 'common', 'cultivated', 'rare'].includes(r.abundance) ? r.abundance : 'common', r.note || null]
        );
      }
    }
    await c.query('COMMIT');
    return rows[0];
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { listPlants, getPlant, upsertPlant, slugify };
