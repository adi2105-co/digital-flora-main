import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

export function DataProvider({ children }) {
  const [plants, setPlants] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [p, r] = await Promise.all([api.plants(), api.regions()]); setPlants(p); setRegions(r); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const bySlug = useMemo(() => Object.fromEntries(plants.map((p) => [p.slug, p])), [plants]);
  const meta = useMemo(() => {
    const uniq = (a) => [...new Set(a)].sort();
    return {
      systems: uniq(plants.flatMap((p) => p.ayush_systems)),
      types: uniq(plants.map((p) => p.plant_type)),
      ailments: uniq(plants.flatMap((p) => p.ailments)),
    };
  }, [plants]);
  return <Ctx.Provider value={{ plants, regions, bySlug, meta, loading, error, reload: load }}>{children}</Ctx.Provider>;
}
