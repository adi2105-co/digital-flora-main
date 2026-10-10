# 🌿 Digital Flora - 3D Virtual Herbal Garden

React + Three.js (3D) · Node/Express · **PostgreSQL** · deployable on **Vercel**

**Objective:** make the knowledge of medicinal herbs *easier* (explore from any device), *safer* (structured uses, preparations, precautions), *more accessible* (free, English/Hindi/Marathi) and *recognisable* (identify a plant from a photo) - an interactive 3D garden that teaches Ayurveda (AYUSH) plants, where they grow, and how they are used.

## Features
| Area | What it does |
|---|---|
| 3D Jungle home | Scroll-driven walk through an animated jungle (swaying plants, light shafts, fireflies, butterflies, river). Hover/click plants. |
| 3D Virtual Garden | All plants standing in a circular garden, click to fly to a plant, guided tour. |
| 3D model for every plant | Whole plant · Leaf · Key part (flower/fruit/root/bark) - procedurally generated from each plant's data; drop a real `.glb` into `client/public/models/<slug>.glb` to override. |
| 36 plants | Sanskrit/Hindi/Marathi names, uses, Ayurveda (rasa, guna, virya, vipaka, doshas, karma), classical references, Vedic notes (only where well established), preparations, chemistry, precautions, cultivation, regions. |
| Health Advisor | Symptom (typed or spoken) → ranked herbs with reasons; Prakriti (dosha) quiz re-ranks results. |
| Identify by photo | Upload/camera → match to a plant in the database. |
| Maps | Leaflet maps: where each plant grows, or all plants by region. |
| Roles | **User**: save plants, notes, ask advisors. **Advisor**: add/edit plants (with live 3D designer), answer questions and suggest plants. |
| Learn | Quiz generated from the database. Multilingual UI (EN / हिन्दी / मराठी). |

## Run it in VS Code (Windows / Mac / Linux)

**You need:** Node.js 20+ (https://nodejs.org), PostgreSQL 14+ (https://www.postgresql.org/download/ - remember the `postgres` password you set), VS Code.

1. Unzip `digital-flora.zip`, open the folder in VS Code (`File → Open Folder`). Open a terminal: ``Ctrl + ` ``.
2. Create the database (pick one):
   - **pgAdmin**: right-click *Databases → Create → Database* → name `digital_flora`
   - or terminal: `psql -U postgres -c "CREATE DATABASE digital_flora;"`
3. Make your settings file:
   - Windows: `copy .env.example .env`   ·   Mac/Linux: `cp .env.example .env`
   - Open `.env` and set the password in `DATABASE_URL`, e.g. `postgresql://postgres:YOURPASSWORD@localhost:5432/digital_flora`
4. Install, create tables + load all plants, start:
   ```bash
   npm install
   npm run db:setup     # creates tables, loads 36 plants, 47 regions, demo accounts
   npm run dev          # starts API (port 5000) + website (port 5173)
   ```
5. Open **http://localhost:5173**

**Demo logins** - User: `user@flora.com` / `user123` · Advisor: `advisor@flora.com` / `advisor123`
New advisors register with the code in `.env` (`ADVISOR_CODE`, default `AYUSH2026`).

### Better plant identification (recommended before the demo)
Without a key the identifier uses a simple built-in **colour matcher** (clearly labelled "demo" in the UI - it is *not* real AI). For real recognition add ONE key to `.env` and restart:
- `PLANTNET_API_KEY` - free at https://my.plantnet.org (best for botanical accuracy), or
- `ANTHROPIC_API_KEY` - Claude vision picks the best match from the database.
Plants returned by Pl@ntNet that are not in the database are shown as "identified, not yet in our garden" so an advisor can add them.

## Deploy on Vercel
1. Create a free Postgres database at https://neon.tech (or Vercel → Storage → Neon). Copy the connection string (ends with `?sslmode=require`).
2. Load the data into it **once, from your computer**: put that string in `.env` as `DATABASE_URL`, run `npm run db:setup`.
3. Push the project to your GitHub (`git init && git add . && git commit -m "Digital Flora" && git push`).
4. https://vercel.com → *Add New → Project* → import the repo. Framework: *Other* (settings come from `vercel.json`).
5. *Environment Variables*: `DATABASE_URL`, `JWT_SECRET` (any long random text), `ADVISOR_CODE`, optionally `PLANTNET_API_KEY`. Deploy.
6. Open the Vercel URL. (`/api/health` should return `{"ok":true}`.)

## Project structure
```
client/src/three/   plants.js (3D plant generator) · jungle.js · garden.js · viewer.js · thumbs.js
client/src/pages/   Home, Garden, Plants, PlantDetail, HealthAdvisor, Identify, MapPage, Quiz, About, Dashboard, PlantForm
server/             app.js · routes/ · lib/suggest.js · lib/identify.js · schema.sql · seed.js · data/plants/*.json
api/index.js        Vercel entry (wraps the Express app)
```
Add a plant by hand: copy any `server/data/plants/*.json`, edit, run `npm run db:setup`. Check data with `node server/data/validate-plants.js`.

## Presenting it (talking points)
- **Problem:** herbal knowledge is scattered, physical gardens have limited reach, misidentification is unsafe.
- **Objective:** easier · safer · more accessible · plant recognition (+ education & conservation).
- **Architecture:** React/Three.js ⇄ Express REST (JWT, roles) ⇄ PostgreSQL; identification: Pl@ntNet → Claude → built-in matcher.
- **Beyond the earlier mini-project:** Postgres, auth + advisor workflow, photo ID, maps, dosha quiz, multilingual, 3D for every plant.

## Troubleshooting
- *"Database not reachable"* → check `DATABASE_URL` password, that PostgreSQL is running, and that you ran `npm run db:setup`.
- *Blank 3D / "WebGL"* → use latest Chrome/Edge; enable hardware acceleration.
- *Port in use* → change `PORT` in `.env` and the proxy port in `vite.config.js`.
- Maps need internet (map tiles + Google Fonts load from the web).

## Honest notes
- Medicinal text is educational and was written from general Ayurvedic sources - have your guide/advisor review it, and verify classical references before citing them in a report. Disclaimers are shown in the UI.
- Plant models are procedural (generated), not scanned - they are stylised, species-specific looks.
