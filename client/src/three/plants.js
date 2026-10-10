// Procedural 3D plant generator. Every plant in the database carries a `model_spec`
// (archetype, leaf shape/colour, flower, fruit, root...) and this file turns it into a
// swaying, textured 3D model. Drop a real .glb in client/public/models/<slug>.glb to override.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { leafTexture, barkTexture, ringsTexture, soilTexture } from './textures.js';

export const wind = { value: 0 }; // shared time uniform; scenes update it every frame

/* ------------------------------------------------------------------ helpers */
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rngFrom(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const UP = new THREE.Vector3(0, 1, 0);
function xf(pos, dir, roll = 0, scale = 1) {
  const d = dir.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  if (roll) q.premultiply(new THREE.Quaternion().setFromAxisAngle(d, roll));
  return new THREE.Matrix4().compose(pos, q, new THREE.Vector3(scale, scale, scale));
}
const dirAt = (theta, elev) => new THREE.Vector3(Math.cos(theta) * Math.cos(elev), Math.sin(elev), Math.sin(theta) * Math.cos(elev));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;

function swayMaterial(m, sway = 1) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind; sh.uniforms.uSway = { value: sway };
    sh.vertexShader = 'uniform float uTime;\nuniform float uSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = uSway * (0.35 + max(position.y, 0.0) * 1.2);
      transformed.x += sin(uTime * 1.4 + position.y * 3.0 + position.z * 2.0) * 0.012 * sw;
      transformed.z += cos(uTime * 1.1 + position.y * 2.4 + position.x * 2.0) * 0.012 * sw;`);
  };
  m.customProgramCacheKey = () => 'sway';
  return m;
}

let MATS = null;
export function materials() {
  if (MATS) return MATS;
  MATS = {
    leaf: swayMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, map: leafTexture(), side: THREE.DoubleSide, roughness: 0.55, metalness: 0 }), 1),
    petal: swayMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.45, metalness: 0, emissive: '#ffe9e0', emissiveIntensity: 0.16 }), 0.6),
    wood: swayMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, map: barkTexture(), roughness: 0.9, side: THREE.DoubleSide }), 0.25),
    fruit: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.02 }),
    soil: new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#2d8a8f', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82, clearcoat: 1 }),
  };
  return MATS;
}

/** Collects many small geometries into ONE mesh (fast to render). */
class Batch {
  constructor() { this.g = []; }
  add(geo, matrix, color, { jitter = 0.1, rng = Math.random, grad = 0.18, light = 0 } = {}) {
    const g = geo.clone(); if (matrix) g.applyMatrix4(matrix);
    const n = g.attributes.position.count, uv = g.attributes.uv, col = new Float32Array(n * 3);
    const base = new THREE.Color(color), hsl = {}; base.getHSL(hsl);
    base.setHSL(hsl.h + (rng() - 0.5) * jitter * 0.12, hsl.s, THREE.MathUtils.clamp(hsl.l + (rng() - 0.5) * jitter, 0, 1));
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const v = uv ? uv.getY(i) : 0.5;
      c.copy(base).multiplyScalar(1 - grad + grad * 2 * v);
      if (light) c.lerp(new THREE.Color('#ffffff'), (1 - v) * light);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.g.push(g);
  }
  mesh(material) {
    if (!this.g.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.g, false), material);
    m.castShadow = true; m.receiveShadow = true; return m;
  }
}

/* ------------------------------------------------------------------ leaf geometry */
const PROFILE = {
  ovate: (v) => Math.pow(Math.sin(Math.PI * Math.pow(v, 0.7)), 0.85),
  lanceolate: (v) => 0.7 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.62)), 0.9),
  round: (v) => Math.sqrt(Math.max(0, 1 - Math.pow(2 * v - 1, 2))),
  heart: (v) => Math.pow(Math.sin(Math.PI * Math.pow(v, 0.5)), 0.8),
  blade: (v) => 0.4 * Math.min(1, (1 - v) * 3.5) * (0.55 + 0.45 * Math.min(1, v * 8)),
  needle: (v) => 0.15 * Math.min(1, (1 - v) * 4) * (0.5 + 0.5 * Math.min(1, v * 10)),
  spike: (v) => Math.pow(1 - v, 0.7) * Math.min(1, 0.45 + v * 6),
};
const DIMS = { ovate: [0.3, 0.2], lanceolate: [0.34, 0.2], round: [0.26, 0.26], heart: [0.28, 0.27], blade: [0.9, 0.16], needle: [0.2, 0.1], spike: [0.62, 0.17] };
const gcache = new Map();
export function leafGeo(shape, o = {}) {
  const [len, wid] = DIMS[shape] || DIMS.ovate;
  const key = `${shape}|${o.hi ? 1 : 0}|${o.bend ?? ''}`;
  if (gcache.has(key)) return gcache.get(key);
  const segW = o.hi ? 10 : 4, segL = o.hi ? 28 : (['blade', 'spike'].includes(shape) ? 12 : 8);
  const bend = o.bend ?? (shape === 'blade' ? 0.5 : shape === 'spike' ? 0.35 : 0.22);
  const fold = shape === 'spike' ? 0.5 : shape === 'blade' ? 0.25 : 0.3;
  const prof = PROFILE[shape] || PROFILE.ovate, pos = [], uv = [], idx = [];
  for (let j = 0; j <= segL; j++) {
    const v = j / segL, w = prof(v);
    for (let i = 0; i <= segW; i++) {
      const u = (i / segW) * 2 - 1;
      pos.push(u * w * wid * 0.5, v * len, bend * len * v * v + fold * wid * u * u * w * 0.5 + Math.sin(v * 9 + u * 3) * 0.004 * (o.hi ? 1 : 0));
      uv.push(i / segW, v);
    }
  }
  for (let j = 0; j < segL; j++) for (let i = 0; i < segW; i++) { const a = j * (segW + 1) + i, b = a + segW + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  gcache.set(key, g); return g;
}

/** Tapered tube along a curve (stems, branches, stalks). */
export function taperedTube(curve, r0, r1, tubular = 14, radial = 6) {
  const pos = [], uv = [], idx = [], frames = curve.computeFrenetFrames(tubular, false);
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, p = curve.getPointAt(t), r = lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, n = frames.normals[i], b = frames.binormals[i];
      pos.push(p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r, p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r, p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const curveOf = (pts) => new THREE.CatmullRomCurve3(pts);

/* ------------------------------------------------------------------ parts */
class Kit {
  constructor(spec, slug) {
    this.spec = spec; this.rng = rngFrom(hashStr(slug || 'x'));
    this.leaf = new Batch(); this.petal = new Batch(); this.wood = new Batch(); this.fruit = new Batch();
    this.shape = spec.leaf?.shape || 'ovate'; this.leafColor = spec.leaf?.color || '#4f8f3a';
    this.size = spec.leaf?.size || 1; this.stemColor = spec.stem || '#6b4f3a';
  }
  r() { return this.rng(); }
  stem(curve, r0, r1, color, tub = 14, rad = 6) { this.wood.add(taperedTube(curve, r0, r1, tub, rad), null, color || this.stemColor, { rng: this.rng, jitter: 0.05, grad: 0.08 }); }
  // one leaf (or compound leaf) at pos pointing along dir
  addLeaf(pos, dir, roll, s = 1, shapeOverride) {
    const shape = shapeOverride || this.shape, S = s * this.size, col = this.leafColor, o = { rng: this.rng };
    if (shape === 'pinnate' || shape === 'trifoliate') {
      const n = shape === 'pinnate' ? 4 : 1, L = (shape === 'pinnate' ? 0.5 : 0.1) * S, d = dir.clone().normalize();
      const side = new THREE.Vector3().crossVectors(d, UP); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
      const rach = curveOf([pos.clone(), pos.clone().addScaledVector(d, L * 0.5).add(V(0, 0.02 * S, 0)), pos.clone().addScaledVector(d, L).add(V(0, -0.03 * S, 0))]);
      this.leaf.add(taperedTube(rach, 0.004 * S, 0.002 * S, 6, 3), null, '#4a6f3a', { rng: this.rng, grad: 0 });
      const ls = shape === 'pinnate' ? 0.5 * S : 0.85 * S;
      for (let k = 0; k <= n; k++) {
        const t = shape === 'pinnate' ? (k + 1) / (n + 1) : 1, p = pos.clone().addScaledVector(d, L * t);
        const sz = ls * (1 - 0.3 * t) * (shape === 'pinnate' ? 1 : 1);
        const shp = shape === 'pinnate' ? 'lanceolate' : 'ovate';
        for (const sgn of shape === 'pinnate' ? [-1, 1] : [-1, 1]) {
          const ld = d.clone().multiplyScalar(0.55).addScaledVector(side, sgn * 0.85).add(V(0, 0.2, 0)).normalize();
          this.leaf.add(leafGeo(shp), xf(p, ld, this.r() * 6, sz), col, o);
        }
      }
      this.leaf.add(leafGeo(shape === 'pinnate' ? 'lanceolate' : 'ovate'), xf(pos.clone().addScaledVector(d, L), d, this.r() * 6, ls * 0.9), col, o);
      return;
    }
    this.leaf.add(leafGeo(shape), xf(pos, dir, roll, S), col, o);
  }
  flowerAt(pos, dir, size = 1, fs = this.spec.flower) {
    if (!fs) return;
    const n = Math.max(3, Math.min(12, fs.petals || 5)), rings = n >= 7 ? 2 : 1, S = (fs.size || 0.5) * size, d = dir.clone().normalize();
    const base = new THREE.Vector3(1, 0, 0); if (Math.abs(d.x) > 0.9) base.set(0, 0, 1);
    const side = new THREE.Vector3().crossVectors(d, base).normalize(), side2 = new THREE.Vector3().crossVectors(d, side);
    for (let ring = 0; ring < rings; ring++) for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * (Math.PI / n);
      const out = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(side2, Math.sin(a));
      const el = ring === 0 ? 1.0 : 1.35; // more upright for inner ring
      const pd = out.clone().multiplyScalar(el).addScaledVector(d, ring === 0 ? 0.55 : 1.0).normalize();
      this.petal.add(leafGeo('ovate'), xf(pos, pd, a, 0.32 * S * (ring ? 0.8 : 1)), fs.color, { rng: this.rng, jitter: 0.08, grad: 0.1, light: 0.25 });
    }
    this.petal.add(new THREE.SphereGeometry(0.012 * S * 2.4, 8, 6), new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(new THREE.Matrix4().makeTranslation(d.x * 0.01, d.y * 0.01, d.z * 0.01)), '#f2c230', { rng: this.rng, grad: 0 });
  }
  fruitAt(pos, size = 1) {
    const f = this.spec.fruit; if (!f) return;
    if (f.shape === 'pod') {
      const c = curveOf([pos.clone(), pos.clone().add(V(0.02, -0.12, 0.02).multiplyScalar(size)), pos.clone().add(V(0.05, -0.28, 0.0).multiplyScalar(size))]);
      this.fruit.add(taperedTube(c, 0.012 * size, 0.004 * size, 8, 5), null, f.color, { rng: this.rng });
    } else if (f.shape === 'berry') {
      for (let i = 0; i < 4; i++) this.fruit.add(new THREE.SphereGeometry(0.016 * size, 8, 6), new THREE.Matrix4().makeTranslation(pos.x + (this.r() - 0.5) * 0.04, pos.y - this.r() * 0.05, pos.z + (this.r() - 0.5) * 0.04), f.color, { rng: this.rng, grad: 0.05 });
    } else {
      this.fruit.add(new THREE.SphereGeometry(0.04 * size, 12, 9), new THREE.Matrix4().makeTranslation(pos.x, pos.y - 0.04, pos.z), f.color, { rng: this.rng, grad: 0.15 });
      this.wood.add(taperedTube(curveOf([pos.clone(), pos.clone().add(V(0, -0.02, 0))]), 0.003, 0.003, 2, 3), null, '#5a7a3a', { rng: this.rng });
    }
  }
  /** flower cluster at the top of a stem */
  cluster(top, size = 1) {
    const f = this.spec.flower; if (!f) return;
    const k = f.cluster || 'single';
    if (k === 'single') this.flowerAt(top, V(0.1, 1, 0.05), size * 1.6);
    else if (k === 'spike') {
      const len = 0.3 * size, n = 9;
      this.stem(curveOf([top.clone(), top.clone().add(V(0, len, 0))]), 0.007, 0.004, '#6b8f4a', 4, 4);
      for (let i = 0; i < n; i++) { const t = i / (n - 1), a = i * 2.4; this.flowerAt(top.clone().add(V(Math.cos(a) * 0.025, t * len, Math.sin(a) * 0.025)), dirAt(a, 0.5), size * lerp(0.9, 0.5, t)); }
    } else if (k === 'umbel') {
      for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = i === 0 ? 0 : 0.06 * Math.sqrt(i); const p = top.clone().add(V(Math.cos(a) * rr, 0.07 - rr * 0.5, Math.sin(a) * rr)); this.stem(curveOf([top.clone(), p]), 0.003, 0.002, '#6b8f4a', 2, 3); this.flowerAt(p, V(0, 1, 0), size * 0.7); }
    } else { for (let i = 0; i < 4; i++) { const a = i * 1.7; this.flowerAt(top.clone().add(V(Math.cos(a) * 0.08, -0.03 * i, Math.sin(a) * 0.08)), dirAt(a, 1.0), size * 0.9); } }
  }
  build() {
    const M = materials(), g = new THREE.Group();
    for (const [b, m] of [[this.wood, M.wood], [this.leaf, M.leaf], [this.petal, M.petal], [this.fruit, M.fruit]]) { const x = b.mesh(m); if (x) g.add(x); }
    return g;
  }
}

/* ------------------------------------------------------------------ archetypes */
function herb(k, lf = 1, branches = 3) {
  const s = k.spec, H = 0.9 * (s.height || 1), r = k.rng;
  const pts = [V(0, 0, 0), V((r() - 0.5) * 0.08, H * 0.35, (r() - 0.5) * 0.08), V((r() - 0.5) * 0.1, H * 0.7, (r() - 0.5) * 0.1), V((r() - 0.5) * 0.06, H, (r() - 0.5) * 0.06)];
  const c = curveOf(pts); k.stem(c, 0.02, 0.008);
  const leafy = (curve, scale, n, th0) => {
    for (let i = 0; i < n; i++) {
      const t = 0.15 + (i / n) * 0.8, p = curve.getPointAt(t), th = th0 + i * 2.4, el = lerp(0.2, 0.8, t);
      const sz = scale * (1 - 0.5 * t);
      k.addLeaf(p, dirAt(th, el), r() * 6, sz); k.addLeaf(p, dirAt(th + Math.PI, el), r() * 6, sz);
    }
  };
  leafy(c, lf, 8, r() * 6);
  for (let b = 0; b < branches; b++) {
    const t0 = 0.28 + b * 0.16, p0 = c.getPointAt(t0), th = b * 2.1 + r(), L = 0.28 * (s.height || 1) + 0.1;
    const bc = curveOf([p0, p0.clone().add(V(Math.cos(th) * L * 0.5, L * 0.35, Math.sin(th) * L * 0.5)), p0.clone().add(V(Math.cos(th) * L, L * 0.75, Math.sin(th) * L))]);
    k.stem(bc, 0.01, 0.005, null, 8, 5); leafy(bc, lf * 0.75, 4, th);
    if (s.flower && ['scatter', 'spike'].includes(s.flower.cluster)) k.cluster(bc.getPointAt(1), 0.7);
    if (s.fruit) k.fruitAt(bc.getPointAt(0.8), 1);
  }
  k.cluster(c.getPointAt(1), 1);
  if (s.fruit) { k.fruitAt(c.getPointAt(0.6), 1); k.fruitAt(c.getPointAt(0.8), 1); }
}

function shrub(k) {
  const s = k.spec, r = k.rng, H = 0.9 * (s.height || 1.4), n = 6;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2 + r() * 0.5, spread = 0.2 + r() * 0.25;
    const c = curveOf([V(0, 0, 0), V(Math.cos(th) * spread * 0.4, H * 0.4, Math.sin(th) * spread * 0.4), V(Math.cos(th) * spread, H * (0.75 + r() * 0.25), Math.sin(th) * spread)]);
    k.stem(c, 0.024, 0.008, null, 12, 6);
    for (let j = 0; j < 12; j++) {
      const t = 0.25 + (j / 12) * 0.75, p = c.getPointAt(t), a = j * 2.4 + i;
      k.addLeaf(p, dirAt(a, lerp(0.1, 0.9, t)), r() * 6, 0.8 * (1.1 - 0.4 * t));
      if (j % 2) k.addLeaf(p, dirAt(a + 3.1, lerp(0.1, 0.9, t)), r() * 6, 0.7 * (1.1 - 0.4 * t));
    }
    if (s.flower) { const top = c.getPointAt(1); if (s.flower.cluster === 'single') k.flowerAt(top.clone().add(V(0, 0.02, 0)), dirAt(th, 0.9), 1.5); else k.cluster(top, 0.7); }
    if (s.fruit) { k.fruitAt(c.getPointAt(0.85), 1); k.fruitAt(c.getPointAt(0.6), 0.9); }
  }
}

function tree(k) {
  const s = k.spec, r = k.rng, TH = 1.1 * Math.min(1.4, (s.height || 2.4) / 2.2), pinnate = ['pinnate'].includes(k.shape);
  const trunk = curveOf([V(0, 0, 0), V(0.03, TH * 0.35, 0.02), V(-0.02, TH * 0.7, 0.03), V(0.02, TH, 0)]);
  k.stem(trunk, 0.1, 0.04, null, 18, 8);
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + r(); k.stem(curveOf([V(Math.cos(a) * 0.17, 0.02, Math.sin(a) * 0.17), V(Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08), V(0, 0.28, 0)]), 0.025, 0.045, null, 6, 5); }
  const nb = 7, lf = pinnate ? 0.75 : 0.95;
  for (let i = 0; i < nb; i++) {
    const t = 0.55 + (i / nb) * 0.45, p0 = trunk.getPointAt(Math.min(t, 1)), th = i * 2.4 + r(), el = lerp(0.9, 0.45, i / nb), L = (0.85 - i * 0.04) * (0.8 + r() * 0.3) * (TH / 1.1);
    const e = p0.clone().add(dirAt(th, el).multiplyScalar(L));
    const bc = curveOf([p0, p0.clone().lerp(e, 0.5).add(V(0, 0.1, 0)), e]); k.stem(bc, 0.032, 0.01, null, 10, 6);
    for (let q = 0; q < 2; q++) { // sub branches with leaf clusters
      const sp = bc.getPointAt(0.55 + q * 0.4), sth = th + (q ? 0.9 : -0.9), se = sp.clone().add(dirAt(sth, 0.5).multiplyScalar(0.28));
      k.stem(curveOf([sp, se]), 0.012, 0.006, null, 4, 4);
      const nl = pinnate ? 5 : 9;
      for (let l = 0; l < nl; l++) { const a = l * 2.4 + r(); k.addLeaf(se, dirAt(a, lerp(-0.2, 1.0, l / nl)), r() * 6, lf); }
      if (s.flower && r() > 0.45) k.flowerAt(se.clone().add(V(0, 0.04, 0)), V(0, 1, 0), 0.8);
      if (s.fruit && r() > 0.4) k.fruitAt(se.clone().add(V(0, -0.02, 0)), 1.1);
    }
    for (let l = 0; l < (pinnate ? 5 : 8); l++) k.addLeaf(e, dirAt(l * 2.4 + r(), lerp(-0.1, 1.1, l / 8)), r() * 6, lf);
  }
}

function rosette(k) {
  const s = k.spec, r = k.rng, n = 14;
  for (let i = 0; i < n; i++) {
    const ring = i < 5 ? 0 : i < 10 ? 1 : 2, el = [1.15, 0.85, 0.55][ring], th = i * 2.4 + r() * 0.2;
    k.leaf.add(leafGeo(k.shape === 'spike' || k.shape === 'blade' ? k.shape : 'spike', { bend: 0.4 }), xf(V(0, 0.02 + ring * 0.01, 0), dirAt(th, el), r() * 0.3, (1.15 - ring * 0.18) * k.size * (s.height || 1) ** 0.4), k.leafColor, { rng: r, jitter: 0.12 });
  }
  if (s.flower) {
    const H = 0.9 * (s.height || 1), c = curveOf([V(0, 0.05, 0), V(0.03, H * 0.5, 0.02), V(0.06, H, 0)]); k.stem(c, 0.012, 0.006, '#7a9a4a', 8, 5);
    for (let i = 0; i < 9; i++) { const t = 0.55 + i * 0.05, p = c.getPointAt(Math.min(t, 1)), a = i * 2.4; k.flowerAt(p.clone().add(V(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03)), dirAt(a, -0.6), 0.9); }
  }
}

function grass(k) {
  const s = k.spec, r = k.rng, n = 46, sc = (s.height || 1) * 1.1;
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, rad = r() * 0.07, th = r() * 6.28, el = lerp(0.9, 1.5, r());
    k.leaf.add(leafGeo(k.shape === 'needle' ? 'needle' : 'blade', { bend: 0.5 }), xf(V(Math.cos(a) * rad, 0, Math.sin(a) * rad), dirAt(th, el), r() * 6, sc * (0.55 + r() * 0.6) * k.size * 1.1), k.leafColor, { rng: r, jitter: 0.16, grad: 0.22 });
  }
  if (s.flower) for (let i = 0; i < 3; i++) { const th = i * 2.1, c = curveOf([V(0, 0, 0), V(Math.cos(th) * 0.06, 0.45 * sc, Math.sin(th) * 0.06), V(Math.cos(th) * 0.1, 0.85 * sc, Math.sin(th) * 0.1)]); k.stem(c, 0.006, 0.003, '#8a9a4a', 8, 4); k.flowerAt(c.getPointAt(1), V(0, 1, 0), 0.5); }
}

function vine(k) {
  const s = k.spec, r = k.rng, H = 1.25 * Math.max(0.8, (s.height || 1.5) / 1.5);
  k.wood.add(new THREE.CylinderGeometry(0.014, 0.018, H * 1.12, 6).translate(0, H * 0.56, 0), null, '#8a6a45', { rng: r, grad: 0.05 });
  const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2 * 3.6; pts.push(V(Math.cos(a) * 0.05, t * H, Math.sin(a) * 0.05)); }
  const c = curveOf(pts); k.stem(c, 0.013, 0.007, null, 90, 5);
  const nodes = 15;
  for (let i = 1; i <= nodes; i++) {
    const t = i / (nodes + 1), p = c.getPointAt(t), a = t * Math.PI * 2 * 3.6 + (i % 2 ? 0 : Math.PI);
    const pd = dirAt(a, 0.15), pp = p.clone().addScaledVector(pd, 0.08);
    k.stem(curveOf([p, p.clone().addScaledVector(pd, 0.04).add(V(0, 0.02, 0)), pp]), 0.004, 0.003, null, 4, 3);
    k.addLeaf(pp, dirAt(a, -0.1 + 0.5 * (1 - t)), r() * 6, 0.95 * (1.05 - 0.3 * t));
    if (s.fruit && i % 3 === 0) k.fruitAt(p.clone().addScaledVector(pd, 0.03), 1.2);
  }
  if (s.flower) k.flowerAt(c.getPointAt(0.97), V(0, 1, 0), 0.9);
  k.addLeaf(c.getPointAt(1), V(0, 1, 0.3), 0, 0.8);
}

function rootMesh(k, spec, y = 0.03, scale = 1) {
  const rt = spec.root || { color: '#c8862a', kind: 'rhizome' }, r = k.rng;
  if (rt.kind === 'bulb') {
    const b = k.fruit;
    b.add(new THREE.SphereGeometry(0.1 * scale, 14, 10).scale(1, 0.85, 1).translate(0, y + 0.07 * scale, 0), null, rt.color, { rng: r, grad: 0.1 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; b.add(new THREE.SphereGeometry(0.052 * scale, 8, 6).scale(0.8, 1.15, 0.8).translate(Math.cos(a) * 0.085 * scale, y + 0.07 * scale, Math.sin(a) * 0.085 * scale), null, rt.color, { rng: r, jitter: 0.08, grad: 0.1 }); }
    b.add(new THREE.ConeGeometry(0.03 * scale, 0.08 * scale, 8).translate(0, y + 0.18 * scale, 0), null, rt.color, { rng: r });
    for (let i = 0; i < 14; i++) { const a = r() * 6.28; k.wood.add(taperedTube(curveOf([V(Math.cos(a) * 0.03, y, Math.sin(a) * 0.03), V(Math.cos(a) * 0.09, y - 0.03, Math.sin(a) * 0.09)]), 0.003, 0.001, 2, 3), null, '#d8c8a0', { rng: r }); }
  } else if (rt.kind === 'taproot') {
    k.fruit.add(new THREE.ConeGeometry(0.06 * scale, 0.4 * scale, 10).rotateX(Math.PI).translate(0, y - 0.1 * scale, 0), null, rt.color, { rng: r, grad: 0.1 });
  } else { // rhizome / tuber: knobbly fingers
    const nf = 7;
    for (let i = 0; i < nf; i++) {
      const th = (i / nf) * 6.28 + r() * 0.4, L = (0.18 + r() * 0.14) * scale, c = curveOf([V(0, y, 0), V(Math.cos(th) * L * 0.5, y + 0.015 + r() * 0.03, Math.sin(th) * L * 0.5), V(Math.cos(th) * L, y + 0.01, Math.sin(th) * L)]);
      k.fruit.add(taperedTube(c, 0.032 * scale, 0.02 * scale, 8, 7), null, rt.color, { rng: r, jitter: 0.08, grad: 0.12 });
      for (let q = 0; q < 3; q++) { const p = c.getPointAt(0.3 + q * 0.3); k.fruit.add(new THREE.SphereGeometry(0.03 * scale, 8, 6).translate(p.x, p.y, p.z), null, rt.color, { rng: r, jitter: 0.1, grad: 0.1 }); }
    }
    k.fruit.add(new THREE.SphereGeometry(0.06 * scale, 10, 8).translate(0, y + 0.01, 0), null, rt.color, { rng: r });
  }
}

function rhizome(k) {
  const s = k.spec, r = k.rng, nL = 8, H = 0.85 * (s.height || 1);
  const bulb = s.root?.kind === 'bulb';
  for (let i = 0; i < nL; i++) {
    const th = (i / nL) * 6.28 + r() * 0.4, el = bulb ? lerp(1.0, 1.35, r()) : lerp(1.15, 1.4, r());
    k.leaf.add(leafGeo(bulb ? 'blade' : (k.shape === 'blade' ? 'blade' : 'lanceolate'), { bend: 0.35 }), xf(V(Math.cos(th) * 0.02, bulb ? 0.14 : 0.12, Math.sin(th) * 0.02), dirAt(th, el), r() * 0.4, H * (bulb ? 0.95 : 1.55) * k.size * (0.8 + r() * 0.3)), k.leafColor, { rng: r, jitter: 0.12 });
    if (!bulb) k.stem(curveOf([V(Math.cos(th) * 0.03, 0, Math.sin(th) * 0.03), V(Math.cos(th) * 0.03, 0.12, Math.sin(th) * 0.03)]), 0.012, 0.008, '#9ab85a', 4, 5);
  }
  if (s.flower) {
    if (bulb) { const c = curveOf([V(0.02, 0.1, 0), V(0.04, H * 0.5, 0.02), V(0.03, H * 0.85, 0)]); k.stem(c, 0.01, 0.005, '#8aa05a', 8, 5); for (let i = 0; i < 12; i++) { const a = i * 2.4; k.flowerAt(c.getPointAt(1).add(V(Math.cos(a) * 0.05, (i % 3) * 0.015, Math.sin(a) * 0.05)), dirAt(a, 0.7), 0.7); } }
    else { // cone-like spike of overlapping bracts
      const c = curveOf([V(0, 0.1, 0), V(0, H * 0.35, 0), V(0, H * 0.55, 0)]); k.stem(c, 0.012, 0.01, '#8fb05a', 6, 5);
      const top = c.getPointAt(1);
      for (let i = 0; i < 26; i++) { const t = i / 26, a = i * 2.4, rr = 0.06 * Math.sin(Math.PI * (0.15 + 0.8 * t)) + 0.01; k.petal.add(leafGeo('ovate'), xf(top.clone().add(V(Math.cos(a) * rr * 0.5, t * 0.22, Math.sin(a) * rr * 0.5)), dirAt(a, 0.9 - t * 0.5), a, 0.28), i % 4 === 3 ? s.flower.color : (t > 0.55 ? s.flower.color : '#b6d77a'), { rng: r, light: 0.15 }); }
    }
  }
  rootMesh(k, s, 0.025, bulb ? 1.1 : 1);
}

function aquatic(k) {
  const s = k.spec, r = k.rng;
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.9, 0.05, 40), materials().water); pond.position.y = -0.01; pond.receiveShadow = true; k.extra = [pond];
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.045, 8, 48), new THREE.MeshStandardMaterial({ color: '#6b6a5a', roughness: 1 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; k.extra.push(ring);
  const pad = (x, z, rad, h) => {
    const bowl = new THREE.CircleGeometry(rad, 20, 0, Math.PI * 2); const p = bowl.attributes.position, uv = bowl.attributes.uv;
    for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getY(i)) / rad; p.setZ(i, d * d * rad * 0.18); uv.setY(i, d); }
    bowl.rotateX(-Math.PI / 2); bowl.computeVertexNormals();
    k.leaf.add(bowl, new THREE.Matrix4().makeTranslation(x, h, z), k.leafColor, { rng: r, jitter: 0.1, grad: 0.1 });
  };
  for (const [x, z, rad] of [[0.45, 0.2, 0.26], [-0.4, 0.35, 0.22], [0.2, -0.5, 0.24], [-0.35, -0.3, 0.2], [0.62, -0.25, 0.16]]) pad(x, z, rad, 0.03);
  for (const [x, z, h] of [[-0.12, 0.12, 0.55], [0.15, -0.08, 0.72], [-0.2, -0.15, 0.42]]) {
    k.stem(curveOf([V(x, 0, z), V(x + 0.03, h * 0.5, z - 0.02), V(x, h, z)]), 0.012, 0.01, '#6d8f4a', 8, 5); pad(x, z, 0.3, h);
  }
  if (s.flower) for (const [x, z, h] of [[0.05, 0.02, 0.85], [-0.28, 0.2, 0.55]]) {
    k.stem(curveOf([V(x, 0, z), V(x - 0.03, h * 0.55, z + 0.02), V(x, h, z)]), 0.014, 0.011, '#6d8f4a', 8, 5);
    k.flowerAt(V(x, h, z), V(0, 1, 0), 2.2); k.fruit.add(new THREE.ConeGeometry(0.035, 0.05, 10).rotateX(Math.PI).translate(x, h + 0.035, z), null, '#d9c84a', { rng: r });
  }
}

const ARCH = { herb, shrub, tree, rosette, grass, vine, rhizome, aquatic };

/* ------------------------------------------------------------------ public API */
/** Normalise group: scale so its largest dimension == target, centre on origin, sit on y = 0 */
export function fit(group, target = 2) {
  const b = new THREE.Box3().setFromObject(group), sz = b.getSize(new THREE.Vector3()), ctr = b.getCenter(new THREE.Vector3());
  const k = target / Math.max(sz.y, Math.max(sz.x, sz.z) * 0.85, 0.01);
  group.children.forEach((c) => { c.position.sub(new THREE.Vector3(ctr.x, b.min.y, ctr.z)); });
  const wrap = new THREE.Group(); wrap.add(group); wrap.scale.setScalar(k);
  return wrap;
}

export function buildWhole(spec, slug) {
  const k = new Kit(spec, slug); (ARCH[spec.archetype] || herb)(k);
  const g = k.build(); (k.extra || []).forEach((e) => g.add(e)); return g;
}

export function buildLeaf(spec, slug) {
  const k = new Kit(spec, slug), g = new THREE.Group(), shape = k.shape;
  k.stem(curveOf([V(0, -0.3, 0), V(0.01, -0.1, 0.01), V(0, 0, 0)]), 0.014, 0.01, k.stemColor, 6, 6);
  if (shape === 'pinnate' || shape === 'trifoliate') k.addLeaf(V(0, 0, 0), V(0, 1, 0.15), 0, 2.2);
  else k.leaf.add(leafGeo(shape, { hi: true, bend: shape === 'blade' ? 0.35 : 0.3 }), xf(V(0, 0, 0), V(0, 1, 0.05), 0, 2.4 * k.size), k.leafColor, { rng: k.rng, jitter: 0.02, grad: 0.15 });
  const M = materials(); const lm = M.leaf.clone(); lm.map = leafTexture(512); lm.onBeforeCompile = M.leaf.onBeforeCompile; lm.customProgramCacheKey = () => 'sway';
  for (const [b, m] of [[k.wood, M.wood], [k.leaf, lm]]) { const x = b.mesh(m); if (x) g.add(x); }
  return g;
}

/** The 3rd view: the plant's key medicinal part (flower / fruit / root / bark / seed) */
export function buildPart(spec, slug) {
  const k = new Kit(spec, slug), M = materials(), r = k.rng;
  let part = spec.key_part, label;
  if (part === 'flower' && !spec.flower) part = spec.fruit ? 'fruit' : spec.root ? 'root' : 'leaf';
  if (part === 'fruit' && !spec.fruit) part = spec.flower ? 'flower' : 'leaf';
  if (part === 'root' && !spec.root) part = 'leaf';
  if (part === 'seed' && !spec.fruit) part = spec.flower ? 'flower' : 'leaf';
  const g = new THREE.Group();
  if (part === 'flower') {
    label = 'Flower';
    const f = spec.flower, kind = f.cluster || 'single';
    if (kind === 'single' || kind === 'scatter') { k.flowerAt(V(0, 0.4, 0), V(0.2, 1, 0.1), 5.5); k.stem(curveOf([V(0, -0.4, 0), V(0, 0, 0), V(0, 0.38, 0)]), 0.02, 0.014, '#6b8f4a'); k.addLeaf(V(0, -0.15, 0), dirAt(1, 0.5), 0, 1.6); }
    else { k.stem(curveOf([V(0, -0.5, 0), V(0, 0, 0)]), 0.02, 0.014, '#6b8f4a'); k.cluster(V(0, 0, 0), 2.6); }
  } else if (part === 'fruit' || part === 'seed') {
    label = part === 'seed' ? 'Seed pod' : 'Fruit';
    k.stem(curveOf([V(-0.6, 0.5, 0), V(-0.2, 0.7, 0), V(0.3, 0.55, 0.05), V(0.65, 0.3, 0)]), 0.02, 0.012, null, 12, 6);
    for (let i = 0; i < 4; i++) k.fruitAt(V(-0.4 + i * 0.28, 0.62 - i * 0.07, (i % 2) * 0.05), 4.2);
    k.addLeaf(V(-0.2, 0.7, 0), dirAt(1.3, 0.5), 0, 1.8); k.addLeaf(V(0.3, 0.55, 0.05), dirAt(4.4, 0.5), 0, 1.8);
  } else if (part === 'root') {
    label = spec.root.kind === 'bulb' ? 'Bulb' : spec.root.kind === 'taproot' ? 'Root' : 'Rhizome';
    rootMesh(k, spec, 0.08, 3.4);
  } else if (part === 'bark') {
    label = 'Bark';
    const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 28, 1, true), new THREE.MeshStandardMaterial({ color: spec.stem || '#6b4a32', map: barkTexture(), roughness: 1, side: THREE.DoubleSide }));
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28), new THREE.MeshStandardMaterial({ map: ringsTexture(), roughness: 0.9 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.45;
    bark.position.y = 0.45; bark.castShadow = true; g.add(bark, top); bark.rotation.z = 0.1; top.rotation.z = 0.1; top.position.x = -0.045;
  } else { label = 'Leaf'; return { group: buildLeaf(spec, slug), label }; }
  for (const [b, m] of [[k.wood, M.wood], [k.leaf, M.leaf], [k.petal, M.petal], [k.fruit, M.fruit]]) { const x = b.mesh(m); if (x) g.add(x); }
  return { group: g, label };
}

/** Which part buttons a plant should offer */
export function partLabel(spec) { return buildPartLabel(spec); }
function buildPartLabel(spec) {
  let p = spec.key_part;
  if (p === 'flower' && !spec.flower) p = spec.fruit ? 'fruit' : spec.root ? 'root' : 'leaf';
  if (p === 'fruit' && !spec.fruit) p = spec.flower ? 'flower' : 'leaf';
  if (p === 'root' && !spec.root) p = 'leaf';
  if (p === 'seed' && !spec.fruit) p = spec.flower ? 'flower' : 'leaf';
  return { flower: 'Flower', fruit: 'Fruit', seed: 'Seed pod', root: spec.root?.kind === 'bulb' ? 'Bulb' : spec.root?.kind === 'taproot' ? 'Root' : 'Rhizome', bark: 'Bark', leaf: 'Leaf' }[p] || 'Leaf';
}
