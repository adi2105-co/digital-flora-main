import * as THREE from 'three';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, repeat) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

/** Greyscale leaf with midrib + side veins; real colour comes from vertex colours. */
export function leafTexture(size = 256) {
  return once('leaf' + size, () => {
    const w = size, h = size * 2, c = mk(w, h), g = c.getContext('2d');
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, '#d9d9d9'); grd.addColorStop(1, '#ffffff');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { // fine mottling
      g.fillStyle = `rgba(${i % 2 ? '255,255,255' : '120,120,120'},${Math.random() * 0.05})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6);
    }
    g.strokeStyle = 'rgba(70,70,70,0.55)'; g.lineWidth = size / 40; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, h * 0.04); g.stroke();
    g.lineWidth = size / 110; g.strokeStyle = 'rgba(70,70,70,0.32)';
    for (let i = 1; i < 14; i++) {
      const y = h - (i / 14) * h * 0.94;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(w / 2, y);
        g.quadraticCurveTo(w / 2 + s * w * 0.22, y - h * 0.02, w / 2 + s * w * (0.46 - i * 0.012), y - h * 0.075);
        g.stroke();
      }
    }
    return tex(c);
  });
}

export function barkTexture() {
  return once('bark', () => {
    const c = mk(256, 256), g = c.getContext('2d');
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * 256, w = 1 + Math.random() * 4;
      g.fillStyle = `rgba(40,30,20,${0.1 + Math.random() * 0.25})`;
      g.fillRect(x, Math.random() * 256, w, 30 + Math.random() * 120);
    }
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    return tex(c, [2, 3]);
  });
}

export function ringsTexture() {
  return once('rings', () => {
    const c = mk(256, 256), g = c.getContext('2d');
    g.fillStyle = '#d9b98a'; g.fillRect(0, 0, 256, 256);
    for (let r = 4; r < 128; r += 5 + Math.random() * 3) {
      g.strokeStyle = `rgba(110,70,30,${0.2 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 1.5;
      g.beginPath(); g.ellipse(128, 128, r, r * (0.95 + Math.random() * 0.05), 0, 0, Math.PI * 2); g.stroke();
    }
    return tex(c);
  });
}

export function soilTexture() {
  return once('soil', () => {
    const c = mk(256, 256), g = c.getContext('2d');
    g.fillStyle = '#6b4a35'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const l = 25 + Math.random() * 30;
      g.fillStyle = `hsla(${20 + Math.random() * 10},${30 + Math.random() * 20}%,${l}%,${0.35 + Math.random() * 0.4})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    return tex(c, [4, 4]);
  });
}

export function mossTexture() {
  return once('moss', () => {
    const c = mk(512, 512), g = c.getContext('2d');
    g.fillStyle = '#2f5d3a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsla(${95 + Math.random() * 40},${35 + Math.random() * 30}%,${18 + Math.random() * 25}%,${0.25 + Math.random() * 0.4})`;
      const s = 1 + Math.random() * 2.5; g.fillRect(Math.random() * 512, Math.random() * 512, s, s * (1 + Math.random() * 2));
    }
    return tex(c, [38, 38]);
  });
}

export function glowTexture() {
  return once('glow', () => {
    const c = mk(64, 64), g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  });
}

export function labelSprite(text, sub = '') {
  const c = mk(512, 128), g = c.getContext('2d');
  g.font = '600 46px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center';
  g.shadowColor = 'rgba(0,30,15,0.85)'; g.shadowBlur = 10;
  g.fillStyle = '#fff8e1'; g.fillText(text, 256, 58);
  if (sub) { g.font = 'italic 28px Georgia, serif'; g.fillStyle = '#cfe9d3'; g.fillText(sub, 256, 100); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(2.6, 0.65, 1); s.renderOrder = 10;
  return s;
}
