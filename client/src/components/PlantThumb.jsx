import React, { useEffect, useRef, useState } from 'react';
import { thumbnail } from '../three/thumbs.js';

/** Card image: the plant's own 3D model rendered once to an image (lazy, when scrolled into view). */
export default function PlantThumb({ plant }) {
  const ref = useRef(null);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    let dead = false;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { io.disconnect(); thumbnail(plant.model_spec, plant.slug).then((u) => { if (!dead) setSrc(u); }); }
    }, { rootMargin: '150px' });
    io.observe(el);
    return () => { dead = true; io.disconnect(); };
  }, [plant.slug, plant.model_spec]);
  return <div ref={ref} className="thumb">{src ? <img src={src} alt={plant.common_name} /> : <span className="thumb-ph">🌿</span>}</div>;
}
