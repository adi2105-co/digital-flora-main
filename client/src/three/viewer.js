import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildWhole, buildLeaf, buildPart, fit, wind } from './plants.js';
import { glowTexture } from './textures.js';

/** Orbit viewer used on the plant detail page. view: 'whole' | 'leaf' | 'part' */
export function createViewer(el, { dark = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(dark ? '#0d2b22' : '#dff0e2', 0.06);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100); cam.position.set(0, 1.6, 4.2);
  const controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.1;
  controls.minDistance = 1.4; controls.maxDistance = 9; controls.maxPolarAngle = Math.PI * 0.52; controls.target.set(0, 0.95, 0);

  scene.add(new THREE.HemisphereLight('#e2ffe0', '#3a4a2c', 1.6));
  const sun = new THREE.DirectionalLight('#fff1c9', 2.6); sun.position.set(3, 6, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 }); sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#8fd8ff', 0.9); rim.position.set(-4, 3, -3); scene.add(rim);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshStandardMaterial({ color: dark ? '#1d4a33' : '#79a678', roughness: 1 }));
  disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; scene.add(disc);
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.86, 2.0, 64), new THREE.MeshBasicMaterial({ color: '#f2d98a', transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.01; scene.add(halo);

  // drifting pollen
  const N = 140, pp = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { pp.set([(Math.random() - 0.5) * 6, Math.random() * 3.2, (Math.random() - 0.5) * 6], i * 3); seeds.push(Math.random() * 10); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pollen = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTexture(), size: 0.09, color: '#fff3b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  scene.add(pollen);

  let current = null, grow = 1, running = true, raf = 0, loader = null;
  const t0 = performance.now(); let last = t0;

  function setSize() {
    const w = el.clientWidth || 600, h = el.clientHeight || 420;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(setSize); ro.observe(el); setSize();

  function swap(obj) {
    if (current) { scene.remove(current); current.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    current = obj; scene.add(obj); grow = 0;
  }

  async function show(spec, slug, view = 'whole') {
    let obj;
    if (view === 'whole') {
      // optional real model dropped into /models/<slug>.glb
      try {
        if (!loader) loader = new GLTFLoader();
        const head = await fetch(`/models/${slug}.glb`, { method: 'HEAD' });
        if (head.ok && (head.headers.get('content-type') || '').includes('model')) {
          const gltf = await loader.loadAsync(`/models/${slug}.glb`); obj = fit(gltf.scene, 2.4);
          obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
        }
      } catch { /* fall back to procedural */ }
      if (!obj) obj = fit(buildWhole(spec, slug), 2.4);
      controls.target.set(0, 1.05, 0); cam.position.set(0, 1.55, 3.7);
    } else if (view === 'leaf') {
      obj = fit(buildLeaf(spec, slug), 2.0); obj.position.y = 0.15;
      controls.target.set(0, 1.0, 0); cam.position.set(0, 1.3, 3.2);
    } else {
      obj = fit(buildPart(spec, slug).group, 1.8); obj.position.y = 0.2;
      controls.target.set(0, 0.9, 0); cam.position.set(0, 1.3, 3.2);
    }
    obj.userData.k = obj.scale.x;
    swap(obj);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const now = performance.now(), t = (now - t0) / 1000; last = now;
    wind.value = t;
    if (current && grow < 1) { grow = Math.min(1, grow + 0.025); const e = 1 - Math.pow(1 - grow, 3); const k = current.userData.k || 1; current.scale.set(k * (0.6 + 0.4 * e), k * e, k * (0.6 + 0.4 * e)); }
    const arr = pg.attributes.position;
    for (let i = 0; i < N; i++) { arr.setY(i, (arr.getY(i) + 0.003 + Math.sin(t + seeds[i]) * 0.0015) % 3.4); arr.setX(i, arr.getX(i) + Math.sin(t * 0.6 + seeds[i]) * 0.0012); }
    arr.needsUpdate = true;
    controls.update(); renderer.render(scene, cam);
  }
  frame();

  return {
    show, scene, camera: cam, renderer, controls,
    setAutoRotate: (v) => { controls.autoRotate = v; },
    pause: (v) => { running = !v; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
