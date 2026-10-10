import * as THREE from 'three';
import { glowTexture, mossTexture } from './textures.js';

export function skyDome(top = '#0b3b3a', mid = '#2f7d6a', bottom = '#f6e3a1') {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { t: { value: new THREE.Color(top) }, m: { value: new THREE.Color(mid) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 t; uniform vec3 m; uniform vec3 b; void main(){ float h = clamp(vP.y*1.6+0.12,0.0,1.0); vec3 c = mix(b, m, smoothstep(0.0,0.35,h)); c = mix(c, t, smoothstep(0.3,1.0,h)); gl_FragColor = vec4(c,1.0); }',
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), m); s.renderOrder = -10; return s;
}

export function fireflies(count, box, color = '#ffe9a0', size = 0.16) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([(Math.random() - 0.5) * box.x, Math.random() * box.y + 0.2, (Math.random() - 0.5) * box.z + (box.cz || 0)], i * 3); seed[i] = Math.random() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTexture(), size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  p.userData.update = (t) => { const a = g.attributes.position; for (let i = 0; i < count; i++) { a.setX(i, a.getX(i) + Math.sin(t * 0.5 + seed[i]) * 0.006); a.setY(i, a.getY(i) + Math.cos(t * 0.7 + seed[i] * 1.7) * 0.004); a.setZ(i, a.getZ(i) + Math.cos(t * 0.4 + seed[i]) * 0.006); } a.needsUpdate = true; p.material.opacity = 0.65 + Math.sin(t * 2) * 0.25; };
  return p;
}

export function ground(size = 160, segs = 80, hill = 0.5) {
  const g = new THREE.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hill * (Math.sin(x * 0.17) * Math.cos(z * 0.13) + 0.5 * Math.sin(x * 0.41 + z * 0.3))); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: mossTexture(), color: '#8fcf8f', roughness: 1 })); m.receiveShadow = true; return m;
}

export function butterfly(color) {
  const g = new THREE.Group();
  const wing = (s) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, s * 0.16, 0.1, -0.05, s * 0.2, -0.02, 0.07, s * 0.12, -0.1, 0.06, 0, 0, 0, s * 0.2, -0.02, 0.07], 3)); geo.setIndex([0, 1, 2, 3, 4, 5].slice(0, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); return m; };
  const l = wing(-1), r = wing(1); g.add(l, r); g.userData.l = l; g.userData.r = r; g.scale.setScalar(0.75); return g;
}
