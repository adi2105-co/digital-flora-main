import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildWhole, fit, wind } from './plants.js';
import { skyDome, fireflies, ground } from './common.js';
import { labelSprite } from './textures.js';

/** The "Virtual Herbal Garden": every plant in the database standing in a circular garden. */
export function createGarden(el, { plants = [], onPick = () => {}, onHover = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#2a6a50', 0.014);
  const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 400); cam.position.set(0, 9, 22);
  scene.add(skyDome('#1a6a6a', '#58b59a', '#fbe9ad'));
  scene.add(new THREE.HemisphereLight('#e8ffe0', '#3b5a30', 1.5));
  const sun = new THREE.DirectionalLight('#fff0c0', 2.6); sun.position.set(-18, 30, 14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 5, far: 90 }); sun.shadow.bias = -0.0006; scene.add(sun);
  const gr = ground(240, 60, 0.15); scene.add(gr);
  // stone paths: concentric rings + spokes
  const stone = new THREE.MeshStandardMaterial({ color: '#d8caa5', roughness: 1 });
  [8, 17].forEach((r) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.5, r + 0.5, 72), stone); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.receiveShadow = true; scene.add(m); });
  const centre = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), stone); centre.rotation.x = -Math.PI / 2; centre.position.y = 0.045; scene.add(centre);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 32), new THREE.MeshStandardMaterial({ color: '#9fb0a6', roughness: 0.8 })); fountain.position.y = 0.25; fountain.castShadow = true; scene.add(fountain);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.05, 32), new THREE.MeshPhysicalMaterial({ color: '#3fb8c0', roughness: 0.05, transparent: true, opacity: 0.9 })); pool.position.y = 0.5; scene.add(pool);

  const items = [], N = plants.length;
  // two rings of beds (inner 12, outer rest)
  plants.forEach((p, i) => {
    const inner = i < 12, k = inner ? i : i - 12, count = inner ? 12 : Math.max(N - 12, 1), R = inner ? 12.5 : 22.5;
    const a = (k / count) * Math.PI * 2 + (inner ? 0 : 0.13);
    const sp = p.model_spec || {}, big = ['tree'].includes(sp.archetype);
    const grp = fit(buildWhole(sp, p.slug), big ? 6.5 : sp.archetype === 'vine' ? 3.4 : 2.6);
    const base = grp.scale.x; grp.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); grp.rotation.y = a * 3;
    grp.userData = { slug: p.slug, name: p.common_name.split('(')[0].trim(), base };
    scene.add(grp);
    const bed = new THREE.Mesh(new THREE.CircleGeometry(big ? 2.6 : 1.8, 28), new THREE.MeshStandardMaterial({ color: '#5a3d2a', roughness: 1 })); bed.rotation.x = -Math.PI / 2; bed.position.set(grp.position.x, 0.03, grp.position.z); bed.receiveShadow = true; scene.add(bed);
    const lab = labelSprite(grp.userData.name, ''); lab.scale.set(2.4, 0.6, 1); lab.position.set(grp.position.x, (big ? 7.4 : 3.6), grp.position.z); lab.material.depthTest = true; scene.add(lab);
    const ring = new THREE.Mesh(new THREE.RingGeometry(big ? 2.4 : 1.6, big ? 2.7 : 1.9, 40), new THREE.MeshBasicMaterial({ color: '#f2d98a', transparent: true, opacity: 0, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(grp.position.x, 0.06, grp.position.z); scene.add(ring);
    grp.userData.ring = ring; grp.userData.lab = lab; items.push(grp);
  });
  const ff = fireflies(300, { x: 60, y: 7, z: 60, cz: 0 }); scene.add(ff);

  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 4; controls.maxDistance = 48; controls.target.set(0, 1.5, 0);
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
  let focusTo = null, running = true, raf = 0, hovered = null, downAt = null; const t0 = performance.now();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let inside = false;
  const setSize = () => { const w = el.clientWidth || 800, h = el.clientHeight || 500; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(setSize); ro.observe(el); setSize();
  const dom = renderer.domElement;
  const move = (e) => { const r = dom.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); inside = true; };
  const down = (e) => { downAt = [e.clientX, e.clientY]; controls.autoRotate = false; };
  const up = (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5 && hovered) onPick(hovered.userData.slug); downAt = null; };
  dom.addEventListener('pointermove', move); dom.addEventListener('pointerdown', down); dom.addEventListener('pointerup', up); dom.addEventListener('pointerleave', () => { inside = false; });

  function focus(slug) {
    const g = items.find((i) => i.userData.slug === slug); if (!g) return;
    const dir = new THREE.Vector3(g.position.x, 0, g.position.z).normalize();
    focusTo = { target: new THREE.Vector3(g.position.x, 1.6, g.position.z), pos: new THREE.Vector3(g.position.x + dir.x * 6.5, 3.4, g.position.z + dir.z * 6.5), t: 0 };
    controls.autoRotate = false;
  }
  function frame() {
    raf = requestAnimationFrame(frame); if (!running) return;
    const t = (performance.now() - t0) / 1000; wind.value = t; ff.userData.update(t);
    if (focusTo) { focusTo.t += 0.03; cam.position.lerp(focusTo.pos, 0.07); controls.target.lerp(focusTo.target, 0.09); if (focusTo.t > 1.6) focusTo = null; }
    let hit = null;
    if (inside) { ray.setFromCamera(ptr, cam); const hs = ray.intersectObjects(items, true); if (hs.length) { let o = hs[0].object; while (o && !o.userData.slug) o = o.parent; hit = o; } }
    if (hit !== hovered) { hovered = hit; dom.style.cursor = hit ? 'pointer' : 'grab'; onHover(hit ? { slug: hit.userData.slug, name: hit.userData.name } : null); }
    items.forEach((g) => { const on = g === hovered; g.userData.ring.material.opacity += ((on ? 0.9 : 0) - g.userData.ring.material.opacity) * 0.15; const k = g.userData.base * (on ? 1.05 : 1); g.scale.setScalar(g.scale.x + (k - g.scale.x) * 0.12); });
    controls.update(); renderer.render(scene, cam);
  }
  frame();
  return {
    focus, setAutoRotate: (v) => { controls.autoRotate = v; }, pause: (v) => { running = !v; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); dom.remove(); },
  };
}
