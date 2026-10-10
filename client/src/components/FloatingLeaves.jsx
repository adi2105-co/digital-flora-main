import React from 'react';

const SPEC = Array.from({ length: 14 }, (_, i) => ({ left: (i * 73) % 100, size: 18 + ((i * 29) % 34), dur: 16 + ((i * 7) % 14), delay: -((i * 5) % 20), hue: i % 3 }));
/** Soft drifting leaves behind inner pages. */
export default function FloatingLeaves() {
  return (
    <div className="leaves" aria-hidden="true">
      {SPEC.map((s, i) => (
        <svg key={i} className={`leaf-f h${s.hue}`} style={{ left: `${s.left}%`, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} viewBox="0 0 40 40">
          <path d="M20 38C20 38 4 28 6 12C16 10 24 16 20 38Z" /><path d="M20 38C20 38 36 26 34 8C26 8 18 16 20 38Z" opacity=".6" />
        </svg>
      ))}
    </div>
  );
}
