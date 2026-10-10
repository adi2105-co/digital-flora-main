import * as THREE from 'three';
import { buildWhole, fit, wind, rngFrom, hashStr } from './plants.js';
import { skyDome, fireflies, ground, butterfly } from './common.js';
import { labelSprite } from './textures.js';

function rippleTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1d6f78'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(200,255,245,${0.05 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + 20, y + 6, x + 40 + Math.random() * 30, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 18); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Immersive jungle. `showcase` = [{slug, name, spec}] plants placed beside the path (hoverable/clickable).
 * `fillers` = specs used for the background trees/shrubs.
 */
export function createJungle(el, { showcase = [], fillers = [], onHover = () => {}, onPick = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#16543f', 0.024);
  const cam = new THREE.PerspectiveCamera(58, 1, 0.1, 260);
  scene.add(skyDome());
  scene.add(new THREE.HemisphereLight('#dffbe0', '#2b4a2a', 1.5));
  const sun = new THREE.DirectionalLight('#ffe7a8', 2.4); sun.position.set(-12, 22, 8); scene.add(sun);
  const gr = ground(); scene.add(gr);

  const Z0 = 16, Z1 = -64, rng = rngFrom(7);
  const interactive = []; const labels = [];

  // background trees
  const treeSpecs = fillers.length ? fillers : showcase.map((s) => s.spec);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, sp = treeSpecs[i % treeSpecs.length], slug = 'bg' + i;
    const spec = { ...sp, archetype: i % 5 === 4 ? 'shrub' : 'tree', height: 2.6, flower: sp.flower };
    const t = fit(buildWhole(spec, slug), 7 + rng() * 5);
    t.position.set(side * (7 + rng() * 14), 0, Z0 - (i / 26) * (Z0 - Z1) + rng() * 4 - 2); t.rotation.y = rng() * 6.28; scene.add(t);
    t.position.y = -0.1;
  }
  // hanging mist planes for depth
  // showcase plants close to the path
  showcase.forEach((s, i) => {
    const side = i % 2 ? 1 : -1, z = 8 - i * (64 / Math.max(showcase.length, 1)) * 1.0;
    const grp = fit(buildWhole(s.spec, s.slug), 2.6 + (s.spec.archetype === 'tree' ? 1.6 : 0));
    grp.position.set(side * (2.6 + rng() * 1.6), 0, z); grp.rotation.y = rng() * 6.28; grp.userData = { slug: s.slug, name: s.name, base: grp.scale.x };
    scene.add(grp); interactive.push(grp);
    const lab = labelSprite(s.name, s.latin || ''); lab.position.set(grp.position.x, 4.1 + (s.spec.archetype === 'tree' ? 1.4 : 0), z); lab.scale.set(2.2, 0.55, 1); scene.add(lab); labels.push(lab);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 40), new THREE.MeshBasicMaterial({ color: '#f2d98a', transparent: true, opacity: 0.0, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(grp.position.x, 0.06, z); scene.add(ring); grp.userData.ring = ring;
  });
  // understory: grass + ferns clones
  const tuftSpec = { archetype: 'grass', leaf: { shape: 'blade', color: '#5fae4a', size: 1 }, stem: '#6b8f4a', height: 0.6, key_part: 'leaf' };
  const fernSpec = { archetype: 'rosette', leaf: { shape: 'blade', color: '#3f9a4a', size: 1.2 }, stem: '#6b8f4a', height: 0.9, key_part: 'leaf' };
  const tufts = [fit(buildWhole(tuftSpec, 'tuft'), 0.9), fit(buildWhole({ ...tuftSpec, leaf: { shape: 'blade', color: '#7cc24f', size: 1.2 } }, 'tuft2'), 1.1), fit(buildWhole(fernSpec, 'fern'), 1.4), fit(buildWhole({ ...fernSpec, leaf: { shape: 'blade', color: '#2f8545', size: 1.3 } }, 'fern2'), 1.7)];
  for (let i = 0; i < 260; i++) {
    const m = tufts[i % tufts.length].clone(); const x = (rng() - 0.5) * 46; if (Math.abs(x) < 0.9) continue;
    m.position.set(x, -0.05, Z0 - rng() * (Z0 - Z1)); m.rotation.y = rng() * 6.28; m.scale.multiplyScalar(0.7 + rng() * 0.9); scene.add(m);
  }
  // river
  const rtex = rippleTexture();
  const rg = new THREE.PlaneGeometry(4.2, 100, 8, 70); rg.rotateX(-Math.PI / 2);
  const rp = rg.attributes.position; for (let i = 0; i < rp.count; i++) { rp.setX(i, rp.getX(i) + Math.sin(rp.getZ(i) * 0.09) * 6); }
  const river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rtex, color: '#8fe8e0', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.88, emissive: '#0c4a52', emissiveIntensity: 0.6 })); river.position.set(-9, 0.03, -20); scene.add(river);
  // light shafts
  const shafts = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.6 + rng() * 2, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    c.position.set((rng() - 0.5) * 22, 13, Z0 - rng() * (Z0 - Z1)); c.rotation.z = 0.28; c.rotation.x = 0.1; scene.add(c); shafts.push(c);
  }
  const ff = fireflies(420, { x: 30, y: 6, z: 80, cz: -24 }); scene.add(ff);
  const pollen = fireflies(200, { x: 20, y: 5, z: 70, cz: -20 }, '#ffffff', 0.07); scene.add(pollen);
  const bf = [];
  ['#ffb347', '#7ad7ff', '#ff8fb3', '#f4f08a', '#c79bff', '#ffd1a1'].forEach((c, i) => { const b = butterfly(c); b.userData.o = { cx: (i % 2 ? 1 : -1) * (3.2 + rng() * 2.5), cz: 6 - i * 11, r: 0.8 + rng() * 1.2, s: 0.5 + rng() * 0.5, ph: rng() * 6 }; scene.add(b); bf.push(b); });

  let target = 0, prog = 0, mx = 0, my = 0, running = true, raf = 0, hovered = null; const t0 = performance.now();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let ptrIn = false;
  const setSize = () => { const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(setSize); ro.observe(el); setSize();
  const onMove = (e) => { const r = renderer.domElement.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width) * 2 - 1; my = ((e.clientY - r.top) / r.height) * 2 - 1; ptr.set(mx, -my); ptrIn = true; };
  const onClick = () => { if (hovered) onPick(hovered.userData.slug); };
  window.addEventListener('pointermove', onMove); renderer.domElement.addEventListener('click', onClick);

  const path = (p) => ({ x: Math.sin(p * 6.5) * 1.0, y: 1.9 + Math.sin(p * 4.2) * 0.25, z: Z0 - p * (Z0 - Z1) });
  function frame() {
    raf = requestAnimationFrame(frame); if (!running) return;
    const t = (performance.now() - t0) / 1000; wind.value = t;
    prog += (target - prog) * 0.045; const p = THREE.MathUtils.clamp(prog, 0, 1), c = path(p), a = path(Math.min(1, p + 0.04));
    cam.position.set(c.x + mx * 0.6, c.y - my * 0.25, c.z); cam.lookAt(a.x * 0.6 + mx * 3.2, 1.9 - my * 1.1, a.z - 6);
    rtex.offset.y = -t * 0.04; shafts.forEach((s, i) => { s.material.opacity = 0.045 + Math.sin(t * 0.6 + i) * 0.025; });
    ff.userData.update(t); pollen.userData.update(t * 0.5);
    bf.forEach((b) => { const o = b.userData.o, k = t * o.s + o.ph; b.position.set(o.cx + Math.cos(k) * o.r, 1.4 + Math.sin(k * 1.7) * 0.5, o.cz + Math.sin(k) * o.r * 1.4); b.rotation.y = -k + Math.PI; const f = Math.sin(t * 14 + o.ph) * 0.9; b.userData.l.rotation.z = f; b.userData.r.rotation.z = -f; });
    // hover
    let hit = null;
    if (ptrIn && interactive.length) { ray.setFromCamera(ptr, cam); const hits = ray.intersectObjects(interactive, true); if (hits.length) { let o = hits[0].object; while (o && !o.userData.slug) o = o.parent; hit = o; } }
    if (hit !== hovered) { hovered = hit; renderer.domElement.style.cursor = hit ? 'pointer' : 'default'; onHover(hit ? { slug: hit.userData.slug, name: hit.userData.name } : null); }
    interactive.forEach((g) => { const on = g === hovered; g.userData.ring.material.opacity += ((on ? 0.8 : 0) - g.userData.ring.material.opacity) * 0.15; const k = g.userData.base * (on ? 1.06 : 1); g.scale.x += (k - g.scale.x) * 0.1; g.scale.y += (k - g.scale.y) * 0.1; g.scale.z += (k - g.scale.z) * 0.1; });
    labels.forEach((l) => { l.material.opacity = 0.95; });
    renderer.render(scene, cam);
  }
  frame();
  return {
    setProgress: (v) => { target = v; },
    pause: (v) => { running = !v; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove); renderer.domElement.removeEventListener('click', onClick); renderer.dispose(); renderer.domElement.remove(); },
  };
}
