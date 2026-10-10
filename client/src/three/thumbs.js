import * as THREE from 'three';
import { buildWhole, fit } from './plants.js';

// Renders each plant once to a PNG data-URL (used on cards). One shared offscreen renderer.
let R = null, scene = null, cam = null;
const cache = new Map(); let chain = Promise.resolve();

function init() {
  const c = document.createElement('canvas'); c.width = c.height = 320;
  R = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setSize(320, 320, false); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.35; R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#f0ffe8', '#4a5a38', 1.7));
  const d = new THREE.DirectionalLight('#fff2cc', 2.4); d.position.set(3, 5, 4); scene.add(d);
  cam = new THREE.PerspectiveCamera(34, 1, 0.1, 50); cam.position.set(0, 1.25, 4.2); cam.lookAt(0, 1.0, 0);
}

export function thumbnail(spec, slug) {
  if (cache.has(slug)) return cache.get(slug);
  const p = (chain = chain.then(() => new Promise((res) => {
    requestAnimationFrame(() => {
      try {
        if (!R) init();
        const g = fit(buildWhole(spec, slug), 2.3); g.rotation.y = 0.5; scene.add(g);
        R.setClearColor(0x000000, 0); R.render(scene, cam);
        const url = R.domElement.toDataURL('image/png'); scene.remove(g);
        g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); res(url);
      } catch { res(null); }
    });
  })));
  cache.set(slug, p); return p;
}
