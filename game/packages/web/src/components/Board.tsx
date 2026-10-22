import { useMemo } from 'react';
import { hexCorners, pips, tileId, topology, vertexPoint } from '@kontinentalist/engine';
import type { Building, EdgeId, FogTile, MapDef, PortType, TileId, VertexId } from '@kontinentalist/engine';
import { FOREIGN_IMAGE, RESOURCE_STYLE, SEA_IMAGE, SHORE, TERRAIN_STYLE, portLabel, portStyle } from '../theme';

const S = 50; // hex size in SVG units
const SEA_TILE = 260; // size of one repeat of the water texture
// Tiles are drawn smaller than their hex so sandy paths run between them, where roads go.
const TILE = 0.9;
const INNER = 0.85;

const pt = (v: VertexId) => {
  const p = vertexPoint(v);
  return { x: p.x * S, y: p.y * S };
};
const center = (q: number, r: number) => ({ x: S * Math.sqrt(3) * (q + r / 2), y: S * 1.5 * r });
const polygon = (q: number, r: number, scale = 1) => {
  const c = center(q, r);
  return hexCorners(q, r)
    .map((v) => {
      const p = pt(v);
      return `${c.x + (p.x - c.x) * scale},${c.y + (p.y - c.y) * scale}`;
    })
    .join(' ');
};

/** The hex cell (axial) containing the SVG point (x, y). */
function cellAt(x: number, y: number): { q: number; r: number } {
  const fq = ((Math.sqrt(3) / 3) * x - y / 3) / S;
  const fr = ((2 / 3) * y) / S;
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  if (dq > dr && dq > Math.abs(s - fs)) q = -r - s;
  else if (dr > Math.abs(s - fs)) r = -q - s;
  return { q, r };
}

/**
 * Whether a cell off the board is foreign land (true) or water (false). Listed cells say so
 * themselves; any other takes the kind of the nearest listed cell, so the sea and the
 * neighbouring countries carry on past the edge of the drawing.
 */
function foreignLand(map: MapDef): (q: number, r: number) => boolean {
  const s = map.surroundings;
  if (!s || s.land.length === 0) return () => false;
  const listed = [...s.sea.map((id) => [id, false] as const), ...s.land.map((id) => [id, true] as const)].map(([id, land]) => {
    const [q, r] = id.split(',').map(Number);
    return { q, r, land };
  });
  const known = new Map(listed.map((c) => [tileId(c.q, c.r), c.land]));
  return (q, r) => {
    const id = tileId(q, r);
    let hit = known.get(id);
    if (hit === undefined) {
      let best = Infinity;
      for (const c of listed) {
        const d = Math.abs(c.q - q) + Math.abs(c.r - r) + Math.abs(c.q + c.r - q - r);
        if (d < best) {
          best = d;
          hit = c.land;
        }
      }
      known.set(id, hit!);
    }
    return hit!;
  };
}

/** Is (x, y) inside the pointy-top hexagon around (cx, cy) with corner radius `radius`? */
function inHex(x: number, y: number, cx: number, cy: number, radius: number) {
  const ax = Math.abs(x - cx);
  const ay = Math.abs(y - cy);
  return ax <= (radius * Math.sqrt(3)) / 2 && ay <= radius - ax / Math.sqrt(3);
}

const distToSegment = (x: number, y: number, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(x - a.x - vx * t, y - a.y - vy * t);
};

interface HarborSpot {
  type: PortType;
  q: number;
  r: number;
  side: number;
  ends: { x: number; y: number }[];
  bank: { x: number; y: number };
  boat: { x: number; y: number };
}

/**
 * Where every harbour's bank and boat go. The bank stands out at sea in front of its coast; the
 * boat takes the first spot nearby that is open water: clear of the surf and sand around every
 * tile, of all banks and of all walkways, so it never sits on the beach or hides behind anything.
 */
function placeHarbors(map: MapDef, foreign: (q: number, r: number) => boolean): HarborSpot[] {
  const spots = map.ports.map((p) => {
    const cs = hexCorners(p.q, p.r);
    const a = pt(cs[p.side]);
    const b = pt(cs[(p.side + 1) % 6]);
    const c = center(p.q, p.r);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(mx - c.x, my - c.y);
    const dx = (mx - c.x) / len;
    const dy = (my - c.y) / len;
    return { ...p, ends: [a, b], mx, my, dx, dy, bank: { x: mx + dx * S * 0.86, y: my + dy * S * 0.86 } };
  });
  const centers = map.tiles.map((t) => center(t.q, t.r));
  const onLand = (x: number, y: number) => {
    const cell = cellAt(x, y);
    return centers.some((c) => inHex(x, y, c.x, c.y, S * 1.24)) || foreign(cell.q, cell.r);
  };
  const walkways = spots.flatMap((h) => h.ends.map((e) => [e, { x: h.bank.x, y: h.bank.y + 4 }] as const));
  const boats: { x: number; y: number }[] = [];
  const free = (x: number, y: number) =>
    // the boat's outline: hull ±12 wide, sails up to 16 above
    [[-12, 6], [12, 6], [-12, -4], [12, -4], [0, -16]].every(([ox, oy]) => !onLand(x + ox, y + oy)) &&
    spots.every((h) => x < h.bank.x - 32 || x > h.bank.x + 32 || y < h.bank.y - 46 || y > h.bank.y + 32) &&
    walkways.every(([a, b]) => distToSegment(x, y - 4, a, b) > 15) &&
    boats.every((o) => Math.hypot(o.x - x, o.y - y) > 30);
  return spots.map((h) => {
    const px = -h.dy;
    const py = h.dx;
    const right = px >= 0 ? 1 : -1; // prefer the side that faces right, so boats read the same everywhere
    let boat = { x: h.mx + h.dx * S * 0.5 + px * right * S * 0.6, y: h.my + h.dy * S * 0.5 + py * right * S * 0.6 };
    search: for (const along of [0.6, 0.8, 1.0, 0.4, 1.2, 1.4]) {
      for (const across of [0.75, 0.95, 1.15, 1.35]) {
        for (const side of [right, -right]) {
          const x = h.mx + h.dx * S * along + px * side * S * across;
          const y = h.my + h.dy * S * along + py * side * S * across;
          if (free(x, y)) {
            boat = { x, y };
            break search;
          }
        }
      }
    }
    boats.push(boat);
    return { type: h.type, q: h.q, r: h.r, side: h.side, ends: h.ends, bank: h.bank, boat };
  });
}

export interface BoardProps {
  map: MapDef;
  revealed?: Record<TileId, FogTile>;
  buildings?: Record<VertexId, Building>;
  roads?: Record<EdgeId, number>;
  colors?: string[];
  robber?: TileId | null;
  hintVertices?: VertexId[];
  hintEdges?: EdgeId[];
  hintTiles?: TileId[];
  onVertex?: (v: VertexId) => void;
  onEdge?: (e: EdgeId) => void;
  onTile?: (t: TileId) => void;
  /** Editor: show what lies under fog (with a veil) instead of plain clouds. */
  revealHidden?: boolean;
  /** Editor: tiles to outline in red, e.g. missing a number. */
  warnTiles?: TileId[];
  /** Editor: empty water cells that can be painted. */
  ghostCells?: { q: number; r: number }[];
  onCell?: (q: number, r: number) => void;
  /** Editor: coastal edges that can hold a port. */
  onCoast?: (q: number, r: number, side: number) => void;
  /** Short text floating up from a tile, e.g. the card found under the fog. */
  flash?: { tile: TileId; text: string; color?: string };
  /** Tiles whose edges blink after a roll; `key` restarts the blink for every new roll. */
  glow?: { key: number; tiles: { id: TileId; color: string; mine: boolean }[] };
}

export function Board(props: BoardProps) {
  const { map, revealed = {}, buildings = {}, roads = {}, colors = [], robber = null } = props;
  const topo = useMemo(() => topology(map), [map]);
  const foreign = useMemo(() => foreignLand(map), [map]);
  const harbors = useMemo(() => placeHarbors(map, foreign), [map, foreign]);

  const viewBox = useMemo(() => {
    const cells = [...map.tiles, ...(props.ghostCells ?? [])];
    if (cells.length === 0) return '-200 -200 400 400';
    const xs: number[] = [];
    const ys: number[] = [];
    for (const c of cells) {
      for (const v of hexCorners(c.q, c.r)) {
        const p = pt(v);
        xs.push(p.x);
        ys.push(p.y);
      }
    }
    const pad = S * 1.1;
    xs.push(Math.min(...xs) - pad, Math.max(...xs) + pad);
    ys.push(Math.min(...ys) - pad, Math.max(...ys) + pad);
    // Harbour banks stand far out in the water; keep their roof signs and ratio plates in view.
    for (const h of harbors) {
      xs.push(h.bank.x - 24, h.bank.x + 24, h.boat.x - 16, h.boat.x + 16);
      ys.push(h.bank.y - 44, h.bank.y + 28, h.boat.y - 20, h.boat.y + 10);
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return `${minX} ${minY} ${Math.max(...xs) - minX} ${Math.max(...ys) - minY}`;
  }, [map, harbors, props.ghostCells]);

  const vb = viewBox.split(' ').map(Number);

  // Neighbouring countries: runs of foreign land cells per hex row, out past every screen edge.
  const abroad = useMemo(() => {
    if (!map.surroundings?.land.length) return [];
    const onBoard = new Set(map.tiles.map((t) => tileId(t.q, t.r)));
    const [x0, y0, w, h] = viewBox.split(' ').map(Number);
    const rowH = S * 1.5;
    const colW = S * Math.sqrt(3);
    const runs: string[] = [];
    for (let r = Math.floor((y0 - h * 1.5) / rowH); r <= Math.ceil((y0 + h * 2.5) / rowH); r++) {
      const qFrom = Math.floor((x0 - w * 1.5) / colW - r / 2);
      const qTo = Math.ceil((x0 + w * 2.5) / colW - r / 2);
      let start: number | null = null;
      for (let q = qFrom; q <= qTo + 1; q++) {
        const land = q <= qTo && !onBoard.has(tileId(q, r)) && foreign(q, r);
        if (land && start === null) start = q;
        if (!land && start !== null) {
          const end = q - 1;
          const c = (qq: number, i: number) => {
            const p = pt(hexCorners(qq, r)[i]);
            return `${p.x},${p.y}`;
          };
          const pts = [c(start, 5)];
          for (let k = start; k <= end; k++) pts.push(c(k, 0), c(k, 1));
          pts.push(c(end, 2));
          for (let k = end; k >= start; k--) pts.push(c(k, 3), c(k, 4));
          runs.push(pts.join(' '));
          start = null;
        }
      }
    }
    return runs;
  }, [map, viewBox, foreign]);
  const hintV = new Set(props.hintVertices ?? []);
  const hintE = new Set(props.hintEdges ?? []);
  const hintT = new Set(props.hintTiles ?? []);

  return (
    <svg className="board" viewBox={viewBox} role="img" aria-label="Spielbrett">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.45" />
        </filter>
        {/* Wooden number discs */}
        <radialGradient id="wood" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff7df" />
          <stop offset=".6" stopColor="#f0d7a2" />
          <stop offset="1" stopColor="#cfa465" />
        </radialGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7e4ad" />
          <stop offset="1" stopColor="#dcbc76" />
        </linearGradient>
        {/* Sunlight from the top left over every tile */}
        <radialGradient id="tileLight" cx="28%" cy="22%" r="90%">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
        {/* Roads are often perfectly vertical; a filter sized to their (zero-width) box would
            hide them, so this one covers the whole board instead. */}
        <filter id="roadShadow" filterUnits="userSpaceOnUse" x={vb[0] - S} y={vb[1] - S} width={vb[2] + 2 * S} height={vb[3] + 2 * S}>
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.45" />
        </filter>
        <linearGradient id="cloak" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a58" />
          <stop offset="1" stopColor="#15151b" />
        </linearGradient>
        <pattern id="seaTex" width={SEA_TILE} height={SEA_TILE} patternUnits="userSpaceOnUse">
          <image href={SEA_IMAGE} width={SEA_TILE} height={SEA_TILE} />
        </pattern>
        <pattern id="landTex" width={SEA_TILE * 1.4} height={SEA_TILE * 1.4} patternUnits="userSpaceOnUse">
          <image href={FOREIGN_IMAGE} width={SEA_TILE * 1.4} height={SEA_TILE * 1.4} />
        </pattern>
        {map.tiles.map((t) => (
          <clipPath key={`k${t.q},${t.r}`} id={`hex${t.q}_${t.r}`}>
            <polygon points={polygon(t.q, t.r, INNER)} />
          </clipPath>
        ))}
      </defs>

      {/* Waves reach far past the board so no edge shows on wide or tall screens. */}
      {/* Water texture at half strength over a light blue, so the sea stays calm behind the island. */}
      <rect className="sea sea-texture" x={vb[0] - vb[2] * 2} y={vb[1] - vb[3] * 2} width={vb[2] * 5} height={vb[3] * 5} fill="url(#seaTex)" />

      {props.ghostCells?.map((c) => (
        <polygon
          key={`g${c.q},${c.r}`}
          className="ghost"
          points={polygon(c.q, c.r, 0.96)}
          onClick={() => props.onCell?.(c.q, c.r)}
        />
      ))}

      {/* Surf, then a sandy shore under the land, so the coastline reads at a glance. */}
      {map.tiles.map((t) => (
        <polygon key={`f${t.q},${t.r}`} points={polygon(t.q, t.r, 1.2)} className="surf" />
      ))}
      {/* Foreign land over the surf, so foam only shows where the board meets the sea. */}
      {abroad.map((pts, i) => (
        <g key={`a${i}`} className="abroad">
          <polygon className="abroad-land" points={pts} fill="url(#landTex)" stroke="url(#landTex)" strokeWidth={2} />
          <polygon points={pts} className="abroad-tint" />
        </g>
      ))}
      {map.tiles.map((t) => (
        <polygon key={`s${t.q},${t.r}`} points={polygon(t.q, t.r, 1.12)} fill="url(#sand)" stroke={SHORE} strokeWidth={1} />
      ))}

      {harbors.map((h, i) => (
        <g key={`p${i}`} className="port" onClick={() => props.onCoast?.(h.q, h.r, h.side)}>
          <Harbor h={h} />
        </g>
      ))}

      {map.tiles.map((t) => {
        const id = tileId(t.q, t.r);
        // Fog hides the tile unless it was revealed in play, or this is the map maker's view.
        const covered = t.hidden && !revealed[id];
        const shown = revealed[id] ?? (covered && !props.revealHidden ? { terrain: 'fog' as const, number: null } : t);
        const style = TERRAIN_STYLE[shown.terrain];
        const c = center(t.q, t.r);
        const red = shown.number === 6 || shown.number === 8;
        return (
          <g key={id} className="tile" onClick={() => (props.onCell ? props.onCell(t.q, t.r) : props.onTile?.(id))}>
            {/* Raised tile: a darker rim around the picture, then a light bevel on the inner edge. */}
            <polygon className="tile-base" points={polygon(t.q, t.r, TILE)} fill={style.fill} data-tile={id} />
            <polygon className="tile-rim" points={polygon(t.q, t.r, TILE)} />
            <polygon points={polygon(t.q, t.r, INNER)} fill={style.fill} />
            {style.images?.length ? (
              // Square artwork, cropped to the hexagon; the variant is fixed per tile position.
              <image
                href={style.images[(((t.q * 7 + t.r * 13) % style.images.length) + style.images.length) % style.images.length]}
                x={c.x - S * (style.focus?.zoom ?? 1)}
                y={c.y + S * ((style.focus?.dy ?? 0) - (style.focus?.zoom ?? 1))}
                width={S * 2 * (style.focus?.zoom ?? 1)}
                height={S * 2 * (style.focus?.zoom ?? 1)}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#hex${t.q}_${t.r})`}
              />
            ) : (
              <text x={c.x} y={c.y - S * 0.38} textAnchor="middle" fontSize={S * 0.42}>
                {style.icon}
              </text>
            )}
            <polygon className="tile-light" points={polygon(t.q, t.r, INNER)} />
            <polygon className="tile-bevel" points={polygon(t.q, t.r, INNER)} />
            {shown.number !== null && (
              <g filter="url(#shadow)">
                <circle cx={c.x} cy={c.y + S * 0.12} r={S * 0.34} fill="url(#wood)" stroke="#9c7a45" strokeWidth={1.5} />
                <circle cx={c.x} cy={c.y + S * 0.12} r={S * 0.29} fill="none" stroke="#000" strokeOpacity=".07" strokeWidth={1} />
                <text x={c.x} y={c.y + S * 0.2} textAnchor="middle" className={red ? 'num red' : 'num'} fontSize={S * 0.36}>
                  {shown.number}
                </text>
                <text x={c.x} y={c.y + S * 0.36} textAnchor="middle" className={red ? 'pips red' : 'pips'} fontSize={S * 0.2}>
                  {'•'.repeat(pips(shown.number))}
                </text>
              </g>
            )}
            {covered && props.revealHidden && (
              <g className="fog-veil">
                <polygon points={polygon(t.q, t.r, INNER)} />
                <text x={c.x + S * 0.42} y={c.y - S * 0.4} textAnchor="middle" fontSize={S * 0.38}>☁️</text>
              </g>
            )}
            {props.warnTiles?.includes(id) && <polygon className="warn-tile" points={polygon(t.q, t.r, 0.86)} />}
            {t.label && !(covered && !props.revealHidden) && (
              <text x={c.x} y={c.y + S * 0.66} textAnchor="middle" className="tile-label" fontSize={S * 0.19}>
                {t.label}
              </text>
            )}
            {robber === id && (
              <g className="robber" filter="url(#shadow)" transform={`translate(${c.x + S * 0.5} ${c.y + S * 0.12})`}>
                <Robber />
              </g>
            )}
            {hintT.has(id) && <polygon className="hint-tile" points={polygon(t.q, t.r, 0.9)} />}
          </g>
        );
      })}

      {/* Bridges across the water, e.g. to an island: a wide wooden walkway, built on like any edge. */}
      {map.bridges?.map(([a, b]) => {
        const p = pt(a);
        const q = pt(b);
        return (
          <g key={`br${a}-${b}`} className="bridge">
            <line className="bridge-edge" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
            <line className="bridge-wood" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
            <line className="bridge-planks" x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
            {[p, q].map((e, k) => (
              <circle key={k} className="walkway-post" cx={e.x} cy={e.y} r={4.5} />
            ))}
          </g>
        );
      })}

      {/* Boats last among the water things, so no tile, sand or bank ever covers them. */}
      {harbors.map((h, i) => (
        <g key={`boat${i}`} transform={`translate(${h.boat.x} ${h.boat.y})`} className="boat">
          <path className="hull" d="M-11,0 h22 l-4,6 h-14 z" />
          <line x1={-1} y1={0} x2={-1} y2={-15} />
          <path className="sail" d="M0,-14 L9,-2 L0,-2 Z" />
          <path className="sail" d="M-2,-12 L-8,-2 L-2,-2 Z" />
        </g>
      ))}

      {props.glow?.tiles.map((t) => {
        const [q, r] = t.id.split(',').map(Number);
        return (
          <polygon
            key={`glow${props.glow!.key}-${t.id}`}
            className={`roll-glow${t.mine ? ' mine' : ''}`}
            points={polygon(q, r, TILE)}
            stroke={t.color}
            style={{ filter: `drop-shadow(0 0 5px ${t.color}) drop-shadow(0 0 9px ${t.color})` }}
          />
        );
      })}

      {props.onCoast &&
        topo.coastalEdges.map((c) => {
          const [a, b] = topo.edgeVertices[c.edge].map(pt);
          return (
            <line
              key={`c${c.edge}`}
              className="coast-target"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              onClick={() => props.onCoast!(c.q, c.r, c.side)}
            />
          );
        })}

      {Object.entries(roads).map(([e, owner]) => {
        const [a, b] = topo.edgeVertices[e].map(pt);
        return (
          <g key={`r${e}`} filter="url(#roadShadow)">
            <RoadPiece x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={colors[owner]} />
          </g>
        );
      })}

      {[...hintE].map((e) => {
        const [a, b] = topo.edgeVertices[e].map(pt);
        // The dot in the middle is the touch target; a bare line is too thin to hit on a phone.
        return (
          <g key={`he${e}`} className="hint-edge" onClick={() => props.onEdge?.(e)}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={10} />
          </g>
        );
      })}

      {Object.entries(buildings).map(([v, b]) => {
        const p = pt(v);
        const isHint = hintV.has(v);
        return (
          <g
            key={`b${v}`}
            transform={`translate(${p.x} ${p.y})`}
            filter="url(#shadow)"
            className={isHint ? 'hint-building piece' : 'piece'}
            onClick={isHint ? () => props.onVertex?.(v) : undefined}
          >
            {/* Settlements drawn half again as large, cities a fifth larger, so both read at a glance. */}
            {b.type === 'settlement' ? (
              <g transform="scale(1.5)">
                <House color={colors[b.owner]} />
              </g>
            ) : (
              <g transform="scale(1.2)">
                <City color={colors[b.owner]} />
              </g>
            )}
          </g>
        );
      })}

      {props.flash &&
        (() => {
          const [q, r] = props.flash.tile.split(',').map(Number);
          const c = center(q, r);
          return (
            <g key={`flash${props.flash.tile}`} className="flash" pointerEvents="none">
              <text x={c.x} y={c.y - S * 0.42} textAnchor="middle" fill={props.flash.color ?? '#1d1d1d'}>
                {props.flash.text}
              </text>
            </g>
          );
        })()}

      {[...hintV]
        .filter((v) => !buildings[v])
        .map((v) => {
          const p = pt(v);
          return <circle key={`hv${v}`} className="hint-vertex" cx={p.x} cy={p.y} r={9} onClick={() => props.onVertex?.(v)} />;
        })}
    </svg>
  );
}

/**
 * A road as a medieval stone bridge: a cobbled deck between two low parapet walls in the owner's
 * colour, with a dark outline. Also used on the road building card.
 */
export function RoadPiece({ x1, y1, x2, y2, color, scale = 1 }: { x1: number; y1: number; x2: number; y2: number; color: string; scale?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1) / scale;
  const h = len / 2;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const joints: number[] = [];
  for (let x = -h + 3.5; x < h - 2; x += 3.6) joints.push(x);
  const merlons: number[] = [];
  for (let x = -h + 3; x < h - 4; x += 6.5) merlons.push(x);
  return (
    <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${angle}) scale(${scale})`} className="road">
      <rect x={-h - 1} y={-7.6} width={len + 2} height={15.2} rx={3} fill="#1d1d1d" />
      {/* parapet walls in the owner's colour, built from blocks */}
      <rect x={-h + 0.3} y={-6.4} width={len - 0.6} height={12.8} rx={2.2} fill={color} />
      {merlons.map((x) => (
        <g key={x} className="merlon">
          <rect x={x} y={-6.4} width={4} height={4} rx={0.6} />
          <rect x={x} y={2.4} width={4} height={4} rx={0.6} />
        </g>
      ))}
      {/* cobbled deck, laid like bricks */}
      <rect x={-h + 0.3} y={-2.4} width={len - 0.6} height={4.8} fill="#cbc1ae" stroke="#1d1d1d" strokeWidth={0.7} />
      <line x1={-h + 0.3} y1={0} x2={h - 0.3} y2={0} className="cobble" />
      {joints.map((x, i) => (
        <line key={x} x1={x} y1={i % 2 ? -2.4 : 0} x2={x} y2={i % 2 ? 0 : 2.4} className="cobble" />
      ))}
    </g>
  );
}

/** Settlement: walls in the player's colour, a darker roof and a door. */
function House({ color }: { color: string }) {
  return (
    <>
      <path d="M-8,-1 h16 v10 h-16 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-10.5,0 L0,-10 L10.5,0 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-10.5,0 L0,-10 L10.5,0 z" fill="#000" fillOpacity=".28" />
      <path d="M-2,9 v-5 h4 v5" fill="#1d1d1d" fillOpacity=".6" />
    </>
  );
}

/** City: a hall and a tower, both in the player's colour with darker roofs. */
function City({ color }: { color: string }) {
  return (
    <>
      <path d="M-15,0 h13 v10 h-13 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-16.5,1 L-8.5,-7 L-0.5,1 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-16.5,1 L-8.5,-7 L-0.5,1 z" fill="#000" fillOpacity=".28" />
      <path d="M-2,-9 h12 v19 h-12 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-3.5,-8 L4,-17 L11.5,-8 z" fill={color} stroke="#1d1d1d" strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M-3.5,-8 L4,-17 L11.5,-8 z" fill="#000" fillOpacity=".28" />
      <path d="M2,-3 h4 v4 h-4 z M-10.5,10 v-5 h4 v5" fill="#1d1d1d" fillOpacity=".6" />
    </>
  );
}

/** The robber: a masked bandit in a dark cloak and wide hat, with a sack of loot. */
function Robber() {
  const ink = '#0d0d0d';
  return (
    <>
      <ellipse cx={0} cy={12} rx={11} ry={3.5} fill="#000" fillOpacity=".45" />
      {/* loot sack behind him */}
      <path d="M6,11.5 C2.5,11.5 3,3.5 7,1.5 L8.5,-0.5 L11.5,-0.5 L13,1.5 C17,3.5 17.5,11.5 14,11.5 Z" fill="#c9a26b" stroke="#5c3b1a" strokeWidth={1} strokeLinejoin="round" />
      <path d="M8,1 L12,1" stroke="#5c3b1a" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={10} cy={6.5} r={2} fill="#f2c230" stroke="#8a6a10" strokeWidth={0.7} />
      {/* cloak */}
      <path d="M-9.5,12 C-9.5,1 -7,-5.5 -5,-8 L5,-8 C7,-5.5 9.5,1 9.5,12 Z" fill="url(#cloak)" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M0,-7 L0,12" stroke="#000" strokeOpacity=".35" strokeWidth={1} />
      <rect x={-8.6} y={2} width={17.2} height={2.3} fill="#6b4420" stroke={ink} strokeWidth={0.6} />
      <rect x={-1.6} y={1.7} width={3.2} height={2.9} rx={0.5} fill="#e0b84a" stroke={ink} strokeWidth={0.5} />
      {/* cowboy revolver in its holster on the belt */}
      <path d="M-8.4,3.6 L-4.6,3.6 L-5,10 L-7.6,10.6 Z" fill="#7a4a22" stroke={ink} strokeWidth={0.7} strokeLinejoin="round" />
      <path d="M-6.4,4.2 L-4.8,10" stroke="#5c3b1a" strokeWidth={0.5} />
      <path d="M-7.9,3.8 L-8.9,-0.4 Q-9.3,-1.6 -8,-1.6 L-6.6,-1.6 L-5.6,1.4 L-4.4,1.6 L-4.6,3.6 Z" fill="#3a3a40" stroke={ink} strokeWidth={0.7} strokeLinejoin="round" />
      <circle cx={-5.4} cy={2.5} r={0.7} fill="none" stroke="#9aa4ad" strokeWidth={0.5} />
      {/* red scarf */}
      <path d="M-6.5,-8.5 h13 l-1.2,3.2 h-10.6 z" fill="#b8322a" stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M3.5,-5.5 l2.5,5 l-3,-0.5 z" fill="#b8322a" stroke={ink} strokeWidth={0.6} strokeLinejoin="round" />
      {/* head with the bandit mask */}
      <circle cx={0} cy={-13} r={6} fill="#e6b98e" stroke="#3d2610" strokeWidth={0.8} />
      <rect x={-6.6} y={-15.6} width={13.2} height={4} rx={1.6} fill="#111" />
      <circle cx={-2.6} cy={-13.6} r={1.2} fill="#fff" />
      <circle cx={2.6} cy={-13.6} r={1.2} fill="#fff" />
      <circle cx={-2.3} cy={-13.5} r={0.55} fill="#111" />
      <circle cx={2.9} cy={-13.5} r={0.55} fill="#111" />
      <path d="M-2,-9.6 q2,1 4,0" stroke="#3d2610" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      {/* wide-brimmed hat */}
      <ellipse cx={0} cy={-18.2} rx={10} ry={2.6} fill="#1a1a1a" stroke={ink} strokeWidth={0.8} />
      <path d="M-5.6,-18.4 L-4.6,-25.5 Q0,-27.6 4.6,-25.5 L5.6,-18.4 Z" fill="#26262c" stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
      <rect x={-5.3} y={-20.6} width={10.6} height={1.8} fill="#b8322a" />
    </>
  );
}

/**
 * Harbour: two wooden walkways from the coast out into the water and a little bank with columns
 * whose roof is in the colour of the traded resource and carries its symbol large, plus a ratio
 * sign. Its boat is drawn separately, above everything else on the water.
 */
function Harbor({ h }: { h: HarborSpot }) {
  const { type, ends } = h;
  const style = portStyle(type);
  const { x: bx, y: by } = h.bank;
  return (
    <>
      <title>{portLabel(type)}</title>
      {/* Exactly two wooden walkways, one from each corner that may use this harbour. The two
          corners are neighbours, so only one settlement (one player) can ever stand there. */}
      {ends.map((e, k) => (
        <g key={k} className="walkway">
          <line className="walkway-edge" x1={e.x} y1={e.y} x2={bx} y2={by + 4} />
          <line className="walkway-wood" x1={e.x} y1={e.y} x2={bx} y2={by + 4} />
          <line className="walkway-planks" x1={e.x} y1={e.y} x2={bx} y2={by + 4} />
          <circle className="walkway-post" cx={e.x} cy={e.y} r={3.6} />
        </g>
      ))}
      <g transform={`translate(${bx} ${by})`} filter="url(#shadow)" className="bank">
        {/* steps */}
        <rect className="stone" x={-15} y={8} width={30} height={3.5} />
        <rect className="stone" x={-13} y={4.8} width={26} height={3.4} />
        {/* columns and the beam on top */}
        {[-10.5, -4.8, 1.2, 6.9].map((cx) => (
          <rect key={cx} className="column" x={cx} y={-3} width={3.6} height={7.8} />
        ))}
        <rect className="column" x={-14} y={-6.2} width={28} height={3.4} />
        {/* pediment roof in the resource colour */}
        <path d="M-17.5,-6 L0,-18.5 L17.5,-6 Z" fill={style.fill} stroke="#1d1d1d" strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M-12,-8.2 L0,-16.3 L12,-8.2 Z" fill="#000" fillOpacity=".14" />
        {/* the traded resource, large on top of the roof */}
        <circle cx={0} cy={-28.5} r={11.2} fill="none" stroke="#1d1d1d" strokeWidth={1.2} />
        <circle cx={0} cy={-28.5} r={9.8} fill="#fff8e6" stroke={style.fill} strokeWidth={2.8} />
        <text x={0} y={-24.2} textAnchor="middle" fontSize={12.5}>{type === 'any' ? '❓' : RESOURCE_STYLE[type].icon}</text>
        <rect x={-11} y={13} width={22} height={10} rx={3} fill="#fff8e6" stroke="#6b4420" strokeWidth={1.2} />
        <text x={0} y={21} textAnchor="middle" className="port-sign">{style.ratio}</text>
      </g>
    </>
  );
}
