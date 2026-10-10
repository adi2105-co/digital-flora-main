import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const COLORS = { wild: '#2f9e44', common: '#e8a33d', cultivated: '#3b82c4', rare: '#c2418a' };
export const abundanceColor = (a) => COLORS[a] || '#2f9e44';

/**
 * regions: [{name,lat,lng,radius_km,abundance?,count?,label?,popup?}]
 * Draws a translucent circle per region (its real approximate extent) + a pin.
 */
export default function MapView({ regions = [], height = 420, onRegionClick, fit = true, center = [21, 80], zoom = 4 }) {
  const el = useRef(null); const map = useRef(null); const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false, zoomControl: true, worldCopyJump: true }).setView(center, zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 18,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const enable = () => map.current.scrollWheelZoom.enable(); const disable = () => map.current.scrollWheelZoom.disable();
    map.current.on('focus', enable); map.current.on('blur', disable);
    return () => { map.current.remove(); map.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    const m = map.current; if (!m) return;
    layer.current.clearLayers();
    const bounds = [];
    regions.forEach((r) => {
      const col = r.color || abundanceColor(r.abundance);
      const c = L.circle([r.lat, r.lng], { radius: (r.radius_km || 150) * 1000, color: col, weight: 2, fillColor: col, fillOpacity: r.opacity ?? 0.22 }).addTo(layer.current);
      const pin = L.circleMarker([r.lat, r.lng], { radius: 6, color: '#fff', weight: 2, fillColor: col, fillOpacity: 1 }).addTo(layer.current);
      const html = r.popup || `<b>${r.name}</b><br/>${[r.state, r.country].filter(Boolean).join(', ')}${r.abundance ? `<br/><i>${r.abundance}</i>` : ''}${r.note ? `<br/>${r.note}` : ''}`;
      pin.bindPopup(html); c.bindPopup(html);
      if (onRegionClick) { pin.on('click', () => onRegionClick(r)); c.on('click', () => onRegionClick(r)); }
      bounds.push([r.lat, r.lng]);
    });
    if (fit && bounds.length) { try { m.fitBounds(L.latLngBounds(bounds).pad(0.4), { maxZoom: 6 }); } catch { /* ignore */ } }
    setTimeout(() => m.invalidateSize(), 150);
  }, [regions, fit]); // eslint-disable-line

  return <div ref={el} className="map" style={{ height }} />;
}
