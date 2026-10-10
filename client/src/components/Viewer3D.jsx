import React, { useEffect, useRef, useState } from 'react';
import { createViewer } from '../three/viewer.js';

/** React wrapper around the Three.js orbit viewer. */
export default function Viewer3D({ spec, slug, view = 'whole', className = '' }) {
  const host = useRef(null);
  const viewer = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try { viewer.current = createViewer(host.current); } catch (e) { console.warn('WebGL unavailable', e); setFailed(true); return undefined; }
    return () => { viewer.current?.dispose(); viewer.current = null; };
  }, []);

  useEffect(() => {
    if (!viewer.current || !spec) return undefined;
    const id = setTimeout(() => viewer.current && viewer.current.show(spec, slug, view).catch(() => {}), 120);
    return () => clearTimeout(id);
  }, [spec, slug, view]);

  if (failed) return <div className={`viewer viewer-fail ${className}`}>Your browser could not start 3D graphics (WebGL). Try Chrome or Edge.</div>;
  return <div ref={host} className={`viewer ${className}`} />;
}
