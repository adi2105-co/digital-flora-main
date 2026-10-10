// Offline checks (no database needed): plant data validity + suggestion + identify logic.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { suggest } = require('../lib/suggest');
const { viaProfile, matchByBotanical } = require('../lib/identify');
const dir = path.join(__dirname, '../data/plants');
const plants = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f, i) => ({ id: i + 1, ...JSON.parse(fs.readFileSync(path.join(dir, f))) }));
assert(plants.length >= 30, 'expected 30+ plants');
const r = suggest(plants, 'I have a cough and cold');
assert(r.length > 0 && r[0].score > 0, 'cough should return suggestions'); console.log('cough ->', r.slice(0, 4).map((x) => x.slug).join(', '));
const h = suggest(plants, 'hair fall'); assert(h.length > 0); console.log('hair fall ->', h.slice(0, 3).map((x) => x.slug).join(', '));
const d = suggest(plants, 'acidity', 'pitta'); assert(d.length > 0); console.log('acidity+pitta ->', d.slice(0, 3).map((x) => x.slug).join(', '));
assert(matchByBotanical(plants, 'Ocimum tenuiflorum')?.slug === 'tulsi', 'botanical match');
const id = viaProfile(plants, { hue: [0, 0, 0, 0.1, 0.8, 0.1, 0, 0, 0, 0, 0, 0], flowerFrac: 0, brownFrac: 0, edge: 0.2 }, 'neem'); assert(id.matches[0].plant.slug === 'neem', 'name hint should win');
console.log('✔ all offline checks passed');
