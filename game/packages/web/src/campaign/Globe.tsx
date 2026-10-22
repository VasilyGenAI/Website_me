import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/*
 * A turning globe with rough continent outlines (lon, lat). Open continents are green and can
 * be clicked; locked ones stay grey until the one before is fully conquered.
 */

export type ContinentId = 'europa' | 'asien' | 'afrika' | 'nordamerika' | 'suedamerika' | 'ozeanien';

export const CONTINENTS: { id: ContinentId; name: string; at: [number, number] }[] = [
  { id: 'europa', name: 'Europa', at: [15, 50] },
  { id: 'asien', name: 'Asien', at: [95, 45] },
  { id: 'afrika', name: 'Afrika', at: [20, 5] },
  { id: 'nordamerika', name: 'Nordamerika', at: [-100, 45] },
  { id: 'suedamerika', name: 'Südamerika', at: [-60, -15] },
  { id: 'ozeanien', name: 'Ozeanien', at: [135, -25] },
];

type Ring = [number, number][];
const SHAPES: Record<ContinentId, Ring[]> = {
  europa: [
    [[-10, 36], [-9, 43], [-2, 43.5], [-4.5, 48.5], [2, 51], [5, 53.5], [8.5, 57], [5, 58], [5, 62], [14, 68], [25, 71], [40, 68], [55, 68], [57, 60], [55, 52], [48, 47], [48, 42], [41.5, 41.5], [29, 41.2], [26, 40], [23, 36.5], [21, 38], [19.5, 40], [18.5, 40], [15.5, 38], [16, 41.5], [12.5, 44], [12.5, 41.5], [8.5, 44.2], [3, 43.3], [3.2, 42], [0, 39], [-2, 36.7], [-5.5, 36]],
    [[-5.7, 50], [1.5, 51], [1.7, 52.6], [-0.2, 54], [-2, 55.8], [-1.8, 57.5], [-3, 58.6], [-5, 58.6], [-6, 56.5], [-5, 54.7], [-3.2, 54], [-4.7, 52.8], [-5.2, 51.7]],
    [[-10, 51.5], [-6, 52], [-6, 54], [-7.5, 55.3], [-10, 54]],
    [[-24, 65.5], [-15, 66.5], [-13.6, 65.3], [-18, 63.4], [-22.7, 64]],
  ],
  afrika: [
    [[-17, 21], [-17, 14.7], [-12, 7.5], [-7.5, 4.4], [5, 4.3], [9.5, 3.5], [9, -1], [12, -6], [13.5, -11.5], [12, -17], [15, -27], [18.5, -34.3], [20, -34.8], [26, -33.8], [32.5, -28.5], [35.5, -24], [35, -17], [40.5, -11], [39.5, -4.5], [43, 0], [51, 11.5], [43.5, 12], [39, 17], [35, 23], [32.5, 31], [25, 31.7], [20, 31], [15, 32.3], [11, 37], [3, 36.8], [-5.9, 35.8], [-9.8, 30], [-13, 27.5], [-16, 24]],
    [[44, -25], [47, -25], [50.5, -15.5], [49, -12], [44, -17]],
  ],
  asien: [
    [[26, 40], [36, 36], [35, 31], [34.5, 28], [43, 12.5], [52, 16.5], [59.5, 22.5], [56.5, 26.5], [51, 24.5], [48, 30], [57, 25.5], [66.5, 25.4], [73, 20], [77.5, 8], [80.3, 13], [87, 21.5], [92, 22], [94.5, 16], [98, 8], [100.5, 13.5], [104.5, 10.5], [109, 12], [108, 21.5], [117, 23], [122, 30], [119.5, 35], [122, 40.5], [127, 37], [129.5, 35], [129.5, 42.5], [141, 46], [142, 53], [135.5, 54.5], [141, 59], [155, 59], [163, 61], [170, 60], [180, 65], [180, 70], [160, 70], [140, 72.5], [115, 73.5], [105, 77.5], [90, 75.5], [70, 73], [60, 69], [55, 68], [57, 60], [55, 52], [48, 47], [48, 42], [41.5, 41.5], [29, 41.2]],
    [[130, 31], [132, 34], [135, 34], [140, 36], [141.5, 41.5], [140, 40], [137, 37], [131, 34.5]],
    [[95, 5.5], [106, -6], [102, -4], [98, 2]],
    [[109, 1.5], [117, 7], [119, 1], [116, -4], [110, -3]],
  ],
  nordamerika: [
    [[-168, 65.5], [-162, 60], [-158, 57], [-152, 58], [-140, 60], [-135, 57.5], [-130, 54.5], [-124.5, 48.5], [-124, 42], [-120.5, 34.5], [-117, 32.5], [-110, 23], [-105, 20], [-96, 16], [-92, 14.5], [-87.5, 13], [-83.5, 9], [-79, 9], [-77.5, 8], [-81.5, 7.5], [-83, 10], [-83.5, 15], [-88, 16], [-87.5, 21.5], [-90.5, 21], [-97.5, 22], [-97, 27.5], [-94, 29.7], [-89, 30], [-84, 30], [-82.5, 27], [-80.5, 25], [-80, 27], [-81, 31.5], [-75.5, 35.5], [-76, 38], [-74, 40.5], [-70, 41.5], [-70, 43.5], [-66, 44.5], [-61, 45.5], [-64.5, 49], [-60, 50], [-56, 52], [-61, 56], [-64.5, 60.5], [-70, 59], [-78, 62.5], [-79, 57], [-82, 52.5], [-92.5, 57], [-94, 61], [-87, 66], [-95, 69], [-110, 68.5], [-125, 70], [-141, 69.5], [-156, 71.3], [-166, 68.8]],
    [[-45, 60], [-42, 62], [-40, 65], [-22, 70], [-20, 76], [-20, 82], [-40, 83.5], [-60, 82], [-70, 77], [-58, 75.5], [-55, 70], [-52, 66], [-50, 62]],
  ],
  suedamerika: [
    [[-77.5, 8], [-72, 11.8], [-63, 10.8], [-60, 8.5], [-52, 5], [-50, 0], [-44, -2.5], [-35, -5.5], [-35, -9], [-39, -13.5], [-41, -22], [-48, -26], [-53, -34], [-58, -38.5], [-62, -39], [-65, -42], [-66, -48], [-69, -51], [-68.5, -55], [-74, -52], [-75.5, -46], [-73.5, -37], [-71.5, -30], [-70.5, -18], [-76, -14], [-81, -6], [-80, -2], [-78.5, 1.5], [-77.5, 3.5]],
  ],
  ozeanien: [
    [[113.5, -22], [114, -26], [115, -34], [118, -35], [123.5, -34], [129, -31.5], [135, -34.5], [138, -35.5], [140, -38], [146, -39], [150, -37.5], [153.5, -28], [153, -25], [146, -19], [142.5, -10.7], [141, -17], [136, -12], [130, -11.5], [129, -15], [122, -17.5]],
    [[172.5, -34.5], [178.5, -37.5], [176, -41.5], [174.5, -41.3], [171, -44], [166.5, -46], [169, -46.6], [173, -43], [174, -39]],
  ],
};

const RAD = Math.PI / 180;

/** Adds points along long edges so outlines bend with the sphere. */
function densify(ring: Ring, step = 3): Ring {
  const out: Ring = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
  return out;
}
const DENSE = Object.fromEntries(Object.entries(SHAPES).map(([id, rings]) => [id, rings.map((r) => densify(r))])) as Record<ContinentId, Ring[]>;

/** Orthographic projection onto a globe of radius R turned to (lon0, lat0); hidden points sit on the rim. */
function project(lon: number, lat: number, lon0: number, lat0: number, R: number): { x: number; y: number; front: boolean } {
  const l = (lon - lon0) * RAD;
  const p = lat * RAD;
  const p0 = lat0 * RAD;
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  if (z >= 0) return { x: R * x, y: -R * y, front: true };
  const k = 1 / Math.hypot(x, y);
  return { x: R * x * k, y: -R * y * k, front: false };
}

export function Globe({ open, onPick }: { open: (id: ContinentId) => boolean; onPick: (id: ContinentId) => void }) {
  const [rot, setRot] = useState<[number, number]>([15, 30]);
  const drag = useRef<{ x: number; y: number; r: [number, number]; moved: boolean } | null>(null);
  const idle = useRef(0);

  // Turn slowly by itself, except while (or shortly after) the player turns it.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!drag.current && now - idle.current > 2500) setRot(([lon, lat]) => [(lon + dt * 0.006) % 360, lat]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const R = 150;
  const [lon0, lat0] = rot;
  const down = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, r: rot, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    setRot([d.r[0] - (e.clientX - d.x) * 0.4, Math.max(-60, Math.min(70, d.r[1] + (e.clientY - d.y) * 0.4))]);
  };
  const up = () => {
    idle.current = performance.now();
    setTimeout(() => (drag.current = null));
  };

  const graticule: string[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = Array.from({ length: 73 }, (_, i) => project(-180 + i * 5, lat, lon0, lat0, R));
    graticule.push(pts.map((p, i) => `${i && pts[i - 1].front && p.front ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = Array.from({ length: 37 }, (_, i) => project(lon, -90 + i * 5, lon0, lat0, R));
    graticule.push(pts.map((p, i) => `${i && pts[i - 1].front && p.front ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(''));
  }

  return (
    <svg
      className="globe"
      viewBox={`${-R - 12} ${-R - 12} ${2 * R + 24} ${2 * R + 24}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label="Globus"
    >
      <defs>
        <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#5fb3f0" />
          <stop offset=".7" stopColor="#1f6fbf" />
          <stop offset="1" stopColor="#123f78" />
        </radialGradient>
        <radialGradient id="shine" cx="35%" cy="28%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={R + 8} className="globe-halo" />
      <circle r={R} fill="url(#ocean)" />
      <path d={graticule.join('')} className="globe-grid" />
      {CONTINENTS.map((c) => {
        const d = DENSE[c.id]
          .map((ring) => {
            const pts = ring.map(([lo, la]) => project(lo, la, lon0, lat0, R));
            if (!pts.some((p) => p.front)) return '';
            return `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}Z`;
          })
          .join('');
        return (
          <path
            key={c.id}
            d={d}
            className={`globe-land ${open(c.id) ? 'open' : 'locked'}`}
            onClick={() => !drag.current?.moved && onPick(c.id)}
          />
        );
      })}
      {CONTINENTS.map((c) => {
        const p = project(c.at[0], c.at[1], lon0, lat0, R);
        if (!p.front) return null;
        return (
          <text key={`t${c.id}`} x={p.x} y={p.y} className={`globe-label ${open(c.id) ? 'open' : 'locked'}`} textAnchor="middle" onClick={() => !drag.current?.moved && onPick(c.id)}>
            {open(c.id) ? '' : '🔒 '}
            {c.name}
          </text>
        );
      })}
      <circle r={R} fill="url(#shine)" pointerEvents="none" />
    </svg>
  );
}
