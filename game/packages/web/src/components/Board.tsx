import { useMemo } from 'react';
import { hexCorners, pips, tileId, topology, vertexPoint } from '@kontinentalist/engine';
import type { Building, EdgeId, FogTile, MapDef, PortType, TileId, VertexId } from '@kontinentalist/engine';
import { RESOURCE_STYLE, SEA_IMAGE, SHORE, TERRAIN_STYLE, portLabel, portStyle } from '../theme';

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
}

export function Board(props: BoardProps) {
  const { map, revealed = {}, buildings = {}, roads = {}, colors = [], robber = null } = props;
  const topo = useMemo(() => topology(map), [map]);

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
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return `${minX} ${minY} ${Math.max(...xs) + pad - minX} ${Math.max(...ys) + pad - minY}`;
  }, [map, props.ghostCells]);

  const vb = viewBox.split(' ').map(Number);
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
        <radialGradient id="pawn" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#7a7a7a" />
          <stop offset="1" stopColor="#1c1c1c" />
        </radialGradient>
        <pattern id="seaTex" width={SEA_TILE} height={SEA_TILE} patternUnits="userSpaceOnUse">
          <image href={SEA_IMAGE} width={SEA_TILE} height={SEA_TILE} />
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
      {map.tiles.map((t) => (
        <polygon key={`s${t.q},${t.r}`} points={polygon(t.q, t.r, 1.12)} fill="url(#sand)" stroke={SHORE} strokeWidth={1} />
      ))}

      {map.ports.map((p, i) => {
        const cs = hexCorners(p.q, p.r);
        const a = pt(cs[p.side]);
        const b = pt(cs[(p.side + 1) % 6]);
        const c = center(p.q, p.r);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const len = Math.hypot(mx - c.x, my - c.y);
        return (
          <g key={`p${i}`} className="port" onClick={() => props.onCoast?.(p.q, p.r, p.side)}>
            <Harbor x={mx} y={my} dx={(mx - c.x) / len} dy={(my - c.y) / len} type={p.type} ends={[a, b]} />
          </g>
        );
      })}

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
            <polygon className="tile-base" points={polygon(t.q, t.r, TILE)} fill={style.fill} />
            <polygon className="tile-rim" points={polygon(t.q, t.r, TILE)} />
            <polygon points={polygon(t.q, t.r, INNER)} fill={style.fill} />
            {style.images?.length ? (
              // Square artwork, cropped to the hexagon; the variant is fixed per tile position.
              <image
                href={style.images[(((t.q * 7 + t.r * 13) % style.images.length) + style.images.length) % style.images.length]}
                x={c.x - (S * Math.sqrt(3)) / 2}
                y={c.y - S}
                width={S * Math.sqrt(3)}
                height={S * 2}
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
              <g className="robber" filter="url(#shadow)" transform={`translate(${c.x + S * 0.44} ${c.y + S * 0.08})`}>
                <ellipse cx={0} cy={S * 0.24} rx={S * 0.17} ry={S * 0.07} fill="#151515" />
                <path d={`M${-S * 0.13},${S * 0.24} C${-S * 0.13},${S * 0.02} ${-S * 0.06},${-S * 0.06} ${-S * 0.05},${-S * 0.12} L${S * 0.05},${-S * 0.12} C${S * 0.06},${-S * 0.06} ${S * 0.13},${S * 0.02} ${S * 0.13},${S * 0.24} Z`} fill="url(#pawn)" />
                <circle cx={0} cy={-S * 0.2} r={S * 0.12} fill="url(#pawn)" />
                <circle cx={-S * 0.04} cy={-S * 0.24} r={S * 0.035} fill="#fff" fillOpacity=".35" />
              </g>
            )}
            {hintT.has(id) && <polygon className="hint-tile" points={polygon(t.q, t.r, 0.9)} />}
          </g>
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
          <g key={`r${e}`} filter="url(#shadow)">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1d1d1d" strokeWidth={11} strokeLinecap="round" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors[owner]} strokeWidth={7.5} strokeLinecap="round" />
            <line x1={a.x} y1={a.y - 1.5} x2={b.x} y2={b.y - 1.5} stroke="#fff" strokeOpacity=".35" strokeWidth={2} strokeLinecap="round" />
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
            {b.type === 'settlement' ? <House color={colors[b.owner]} /> : <City color={colors[b.owner]} />}
          </g>
        );
      })}

      {[...hintV]
        .filter((v) => !buildings[v])
        .map((v) => {
          const p = pt(v);
          return <circle key={`hv${v}`} className="hint-vertex" cx={p.x} cy={p.y} r={9} onClick={() => props.onVertex?.(v)} />;
        })}
    </svg>
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

/**
 * Harbour: a wooden pier from the coast into the water, a harbour house in the colour of the
 * traded resource with its symbol, a ratio sign, and a small boat moored alongside.
 */
function Harbor({ x, y, dx, dy, type, ends }: { x: number; y: number; dx: number; dy: number; type: PortType; ends: { x: number; y: number }[] }) {
  const style = portStyle(type);
  const px = -dy;
  const py = dx; // perpendicular to the pier
  const bx = x + dx * S * 0.86;
  const by = y + dy * S * 0.86;
  const pier = (along: number, side: number) => `${x + dx * along + px * side},${y + dy * along + py * side}`;
  // Boat moored beside the pier, on whichever side faces more to the right so it reads the same everywhere.
  const side = px >= 0 ? 1 : -1;
  const boatX = x + dx * S * 0.62 + px * side * S * 0.4;
  const boatY = y + dy * S * 0.62 + py * side * S * 0.4;
  const dockX = x + dx * S * 0.22;
  const dockY = y + dy * S * 0.22;
  return (
    <>
      <title>{portLabel(type)}</title>
      {/* Short gangways from both corners show which two building spots use this harbour. */}
      {ends.map((e, k) => (
        <line key={k} className="gangway" x1={e.x} y1={e.y} x2={dockX} y2={dockY} />
      ))}
      <polygon className="pier" points={[pier(-4, -5), pier(S * 0.8, -5), pier(S * 0.8, 5), pier(-4, 5)].join(' ')} />
      {[0.25, 0.45, 0.65].map((t) => (
        <line key={t} className="pier-plank" x1={x + dx * S * t + px * 5} y1={y + dy * S * t + py * 5} x2={x + dx * S * t - px * 5} y2={y + dy * S * t - py * 5} />
      ))}
      <g transform={`translate(${boatX} ${boatY})`} className="boat">
        <path className="hull" d="M-11,0 h22 l-4,6 h-14 z" />
        <line x1={-1} y1={0} x2={-1} y2={-15} />
        <path className="sail" d="M0,-14 L9,-2 L0,-2 Z" />
        <path className="sail" d="M-2,-12 L-8,-2 L-2,-2 Z" />
      </g>
      <g transform={`translate(${bx} ${by})`} filter="url(#shadow)">
        <path d="M-12,-2 h24 v12 h-24 z" fill={style.fill} stroke="#1d1d1d" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M-15,-1 L0,-13 L15,-1 z" fill={style.fill} stroke="#1d1d1d" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M-15,-1 L0,-13 L15,-1 z" fill="#000" fillOpacity=".3" />
        <circle cx={0} cy={4} r={6.5} fill="#fff8e6" stroke="#1d1d1d" strokeWidth={1.2} />
        <text x={0} y={7} textAnchor="middle" fontSize={8.5}>{type === 'any' ? '❓' : RESOURCE_STYLE[type].icon}</text>
        <rect x={-11} y={12} width={22} height={10} rx={3} fill="#fff8e6" stroke="#6b4420" strokeWidth={1.2} />
        <text x={0} y={20} textAnchor="middle" className="port-sign">{style.ratio}</text>
      </g>
    </>
  );
}
