CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','advisor')),
  specialty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  state TEXT,
  country TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 200,
  biome TEXT
);

CREATE TABLE IF NOT EXISTS plants (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  common_name TEXT NOT NULL,
  botanical_name TEXT NOT NULL,
  family TEXT,
  plant_type TEXT NOT NULL DEFAULT 'herb',
  sanskrit_name TEXT,
  hindi_name TEXT,
  marathi_name TEXT,
  other_names TEXT[] NOT NULL DEFAULT '{}',
  ayush_systems TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  cultural_significance TEXT,
  habitat TEXT,
  parts_used TEXT[] NOT NULL DEFAULT '{}',
  ailments TEXT[] NOT NULL DEFAULT '{}',
  uses JSONB NOT NULL DEFAULT '[]',
  ayurveda JSONB NOT NULL DEFAULT '{}',
  preparations JSONB NOT NULL DEFAULT '[]',
  chemistry TEXT[] NOT NULL DEFAULT '{}',
  precautions TEXT,
  cultivation JSONB NOT NULL DEFAULT '{}',
  conservation_status TEXT,
  fun_fact TEXT,
  model_spec JSONB NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plants_ailments_gin ON plants USING GIN (ailments);

CREATE TABLE IF NOT EXISTS plant_regions (
  plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  abundance TEXT NOT NULL DEFAULT 'common',
  note TEXT,
  PRIMARY KEY (plant_id, region_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plant_id)
);

CREATE TABLE IF NOT EXISTS notes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plant_id)
);

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_replies (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  advisor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  suggested_plant_ids INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
