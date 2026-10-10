import React from 'react';
import { Link } from 'react-router-dom';
import PlantThumb from './PlantThumb.jsx';
import { useLang } from '../context/Lang.jsx';

export default function PlantCard({ plant, note }) {
  const { pname } = useLang();
  return (
    <Link to={`/plants/${plant.slug}`} className="card plant-card">
      <PlantThumb plant={plant} />
      <div className="pc-body">
        <h3>{pname(plant)}</h3>
        <p className="latin">{plant.botanical_name.replace(/\s*\(.*\)/, '')}</p>
        <div className="chips">{plant.ayush_systems.slice(0, 2).map((s) => <span key={s} className="chip">{s}</span>)}<span className="chip chip-soft">{plant.plant_type}</span></div>
        {note && <p className="pc-note">{note}</p>}
      </div>
    </Link>
  );
}
