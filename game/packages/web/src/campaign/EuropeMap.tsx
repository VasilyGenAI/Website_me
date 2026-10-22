import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { PRESET_MAPS } from '@kontinentalist/engine';
import type { PresetId, Terrain } from '@kontinentalist/engine';
import { TERRAIN_STYLE } from '../theme';
import { EUROPE_COUNTRIES, EUROPE_ROWS } from './europeData';
import type { EuropeCountry } from './europeData';
import { isConquered } from './progress';
import type { Progress } from './progress';

/*
 * Europe as one hex grid. Countries not yet won glow light grey, conquered ones show their
 * resources (a small copy of the country's board), and countries without a board yet are dark.
 */

const W = 10; // hex width in SVG units
const S = W / Math.sqrt(3);
const CORNERS: [number, number][] = [
  [0, -S],
  [W / 2, -S / 2],
  [W / 2, S / 2],
  [0, S],
  [-W / 2, S / 2],
  [-W / 2, -S / 2],
];
// Neighbour of each side (0 NE … 5 NW) in odd-r offset rows.
const STEP_ODD: [number, number][] = [[-1, 1], [0, 1], [1, 1], [1, 0], [0, -1], [-1, 0]];
const STEP_EVEN: [number, number][] = [[-1, 0], [0, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

interface Cell {
  r: number;
  c: number;
  x: number;
  y: number;
  code: string;
}

const at = (r: number, c: number) => EUROPE_ROWS[r]?.[c] ?? '.';
const hexPath = (x: number, y: number) => `M${CORNERS.map(([dx, dy]) => `${(x + dx).toFixed(2)},${(y + dy).toFixed(2)}`).join('L')}Z`;

/** Everything about the grid that never changes, worked out once. */
const GRID = (() => {
  const cells: Cell[] = [];
  EUROPE_ROWS.forEach((row, r) =>
    [...row].forEach((code, c) => {
      if (code !== '.') cells.push({ r, c, x: W * (c + 0.5 * (r & 1)), y: 1.5 * S * r, code });
    }),
  );
  const byCountry = new Map<string, Cell[]>();
  for (const cell of cells) byCountry.set(cell.code, [...(byCountry.get(cell.code) ?? []), cell]);
  // Border and coast lines: every cell side whose neighbour is a different country or the sea.
  let borders = '';
  let coast = '';
  for (const cell of cells) {
    if (cell.code === '~') continue;
    const steps = cell.r & 1 ? STEP_ODD : STEP_EVEN;
    steps.forEach(([dr, dc], side) => {
      const other = at(cell.r + dr, cell.c + dc);
      if (other === cell.code) return;
      const [ax, ay] = CORNERS[side];
      const [bx, by] = CORNERS[(side + 1) % 6];
      const seg = `M${(cell.x + ax).toFixed(2)},${(cell.y + ay).toFixed(2)}L${(cell.x + bx).toFixed(2)},${(cell.y + by).toFixed(2)}`;
      if (other === '.' || other === '~') coast += seg;
      // Each inner border is shared by two cells; draw it once.
      else if (cell.code < other) borders += seg;
    });
  }
  const width = Math.max(...EUROPE_ROWS.map((r) => r.length)) * W + W;
  const height = EUROPE_ROWS.length * 1.5 * S + S;
  return { cells, byCountry, borders, coast, width, height };
})();

/** Terrain for each cell of a conquered country, copied from its small board by relative position. */
function terrainCells(country: EuropeCountry, cells: Cell[]): Map<Cell, Terrain> {
  const make = PRESET_MAPS[`${country.id}-klein` as Exclude<PresetId, 'standard'>];
  const out = new Map<Cell, Terrain>();
  if (!make) return out;
  const tiles = make().tiles.map((t) => ({ x: Math.sqrt(3) * (t.q + t.r / 2), y: 1.5 * t.r, terrain: t.terrain }));
  const box = (ps: { x: number; y: number }[]) => {
    const xs = ps.map((p) => p.x);
    const ys = ps.map((p) => p.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x0, y0, w: Math.max(...xs) - x0 || 1, h: Math.max(...ys) - y0 || 1 };
  };
  const tb = box(tiles);
  const cb = box(cells);
  for (const cell of cells) {
    const u = (cell.x - cb.x0) / cb.w;
    const v = (cell.y - cb.y0) / cb.h;
    let best = tiles[0];
    let bestD = Infinity;
    for (const t of tiles) {
      const d = ((t.x - tb.x0) / tb.w - u) ** 2 + ((t.y - tb.y0) / tb.h - v) ** 2;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    out.set(cell, best.terrain);
  }
  return out;
}

export function EuropeMap({ progress, selected, onSelect }: { progress: Progress; selected: string | null; onSelect: (c: EuropeCountry) => void }) {
  // Pan and zoom: a view box over the grid, dragged with a finger or the mouse.
  const full = { x: 0, y: 0, w: GRID.width, h: GRID.height };
  const start = { x: GRID.width * 0.08, y: GRID.height * 0.22, w: GRID.width * 0.58, h: GRID.height * 0.72 };
  const [view, setView] = useState(start);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const zoom = (f: number) =>
    setView((v) => {
      const w = Math.min(full.w, Math.max(GRID.width * 0.12, v.w * f));
      const h = (w / v.w) * v.h;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  const down = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    const box = svg.current?.getBoundingClientRect();
    if (!d || !box) return;
    const k = view.w / box.width;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    setView((v) => ({ ...v, x: d.vx - (e.clientX - d.x) * k, y: d.vy - (e.clientY - d.y) * k }));
  };

  const layers = useMemo(() => {
    return EUROPE_COUNTRIES.map((country) => {
      const cells = GRID.byCountry.get(country.code) ?? [];
      const won = country.playable && isConquered(progress, country.id);
      const fills: { fill: string; d: string }[] = [];
      if (won) {
        const terrain = terrainCells(country, cells);
        const groups = new Map<string, string>();
        for (const cell of cells) {
          const fill = TERRAIN_STYLE[terrain.get(cell) ?? 'desert'].fill;
          groups.set(fill, (groups.get(fill) ?? '') + hexPath(cell.x, cell.y));
        }
        for (const [fill, d] of groups) fills.push({ fill, d });
      } else {
        fills.push({ fill: '', d: cells.map((c) => hexPath(c.x, c.y)).join('') });
      }
      const cx = cells.reduce((s, c) => s + c.x, 0) / Math.max(1, cells.length);
      const cy = cells.reduce((s, c) => s + c.y, 0) / Math.max(1, cells.length);
      return { country, cells, won, fills, cx, cy };
    });
  }, [progress]);
  const other = useMemo(() => (GRID.byCountry.get('~') ?? []).map((c) => hexPath(c.x, c.y)).join(''), []);

  return (
    <div className="europe">
      <svg
        ref={svg}
        className="europe-map"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15)}
      >
        <defs>
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={-GRID.width} y={-GRID.height} width={GRID.width * 3} height={GRID.height * 3} className="europe-sea" />
        <path d={other} className="europe-other" />
        {layers.map(({ country, fills, won }) => (
          <g
            key={country.code}
            className={`eu-country ${won ? 'won' : country.playable ? 'open' : 'locked'}${selected === country.id ? ' selected' : ''}`}
            onClick={() => !drag.current?.moved && onSelect(country)}
          >
            {fills.map((f, i) => (
              <path key={i} d={f.d} style={f.fill ? { fill: f.fill } : undefined} />
            ))}
          </g>
        ))}
        <path d={GRID.coast} className="europe-coast" />
        <path d={GRID.borders} className="europe-borders" />
        {layers
          .filter((l) => l.cells.length > 0 && (l.country.playable || l.cells.length > 18))
          .map(({ country, cells, won, cx, cy }) => {
            const size = Math.max(4.2, Math.min(13, Math.sqrt(cells.length) * 1.5));
            return (
              <text
                key={`n${country.code}`}
                x={cx}
                y={cy}
                className={`eu-name${country.playable ? '' : ' faint'}`}
                fontSize={size}
                textAnchor="middle"
                onClick={() => !drag.current?.moved && onSelect(country)}
              >
                {won ? '🏆 ' : ''}
                {country.name}
              </text>
            );
          })}
      </svg>
      <div className="europe-zoom">
        <button onClick={() => zoom(1 / 1.3)} aria-label="Hineinzoomen">＋</button>
        <button onClick={() => zoom(1.3)} aria-label="Herauszoomen">－</button>
        <button onClick={() => setView(start)} aria-label="Ansicht zurücksetzen">⟲</button>
      </div>
    </div>
  );
}
