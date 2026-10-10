
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const COLORS = {
  wild: '#2f9e44',
  common: '#e8a33d',
  cultivated: '#3b82c4',
  rare: '#c2418a',
};

export const abundanceColor = (a) => COLORS[a] || '#2f9e44';

export default function MapView({
  regions = [],
  height = 420,
  onRegionClick,
  fit = true,
  center = [21, 80],
  zoom = 4,
}) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const m = L.map(el.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      worldCopyJump: true,
    }).setView(center, zoom);

    map.current = m;

    if (mapboxToken) {
      L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`,
        {
          attribution:
            '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          tileSize: 512,
          zoomOffset: -1,
          maxZoom: 18,
        }
      ).addTo(m);
    } else {
      console.error(
        'Mapbox token missing. Check client/.env for VITE_MAPBOX_TOKEN.'
      );

      // Fallback map if the Mapbox token is unavailable
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 18,
        }
      ).addTo(m);
    }

    layer.current = L.layerGroup().addTo(m);

    const enable = () => m.scrollWheelZoom.enable();
    const disable = () => m.scrollWheelZoom.disable();

    m.on('focus', enable);
    m.on('blur', disable);

    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    const group = layer.current;

    if (!m || !group) return;

    group.clearLayers();

    const bounds = [];

    regions.forEach((r) => {
      if (
        typeof r.lat !== 'number' ||
        typeof r.lng !== 'number' ||
        !Number.isFinite(r.lat) ||
        !Number.isFinite(r.lng)
      ) {
        return;
      }

      const col = r.color || abundanceColor(r.abundance);

      const circle = L.circle([r.lat, r.lng], {
        radius: (r.radius_km || 150) * 1000,
        color: col,
        weight: 2,
        fillColor: col,
        fillOpacity: r.opacity ?? 0.22,
      }).addTo(group);

      const pin = L.circleMarker([r.lat, r.lng], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: col,
        fillOpacity: 1,
      }).addTo(group);

      const html =
        r.popup ||
        `<b>${r.name || 'Plant region'}</b><br/>${
          [r.state, r.country].filter(Boolean).join(', ')
        }${r.abundance ? `<br/><i>${r.abundance}</i>` : ''}${
          r.note ? `<br/>${r.note}` : ''
        }`;

      circle.bindPopup(html);
      pin.bindPopup(html);

      if (onRegionClick) {
        circle.on('click', () => onRegionClick(r));
        pin.on('click', () => onRegionClick(r));
      }

      bounds.push([r.lat, r.lng]);
    });

    if (fit && bounds.length) {
      try {
        m.fitBounds(L.latLngBounds(bounds).pad(0.4), {
          maxZoom: 6,
        });
      } catch {
        // Ignore invalid bounds
      }
    }

    const resizeId = setTimeout(() => {
      m.invalidateSize();
    }, 150);

    return () => clearTimeout(resizeId);
  }, [regions, fit, onRegionClick]);

  return <div ref={el} className="map" style={{ height }} />;
}
