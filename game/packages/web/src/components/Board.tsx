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
  /** Short text floating up from a tile, e.g. the card found under the fog. */
  flash?: { tile: TileId; text: string; color?: string };
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
    xs.push(Math.min(...xs) - pad, Math.max(...xs) + pad);
    ys.push(Math.min(...ys) - pad, Math.max(...ys) + pad);
    // Harbour banks stand far out in the water; keep their roof signs and ratio plates in view.
    for (const p of map.ports) {
      const cs = hexCorners(p.q, p.r);
      const a = pt(cs[p.side]);
      const b = pt(cs[(p.side + 1) % 6]);
      const c = center(p.q, p.r);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const len = Math.hypot(mx - c.x, my - c.y);
      const bx = mx + ((mx - c.x) / len) * S * 0.86;
      const by = my + ((my - c.y) / len) * S * 0.86;
      xs.push(bx - 24, bx + 24);
      ys.push(by - 44, by + 28);
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return `${minX} ${minY} ${Math.max(...xs) - minX} ${Math.max(...ys) - minY}`;
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
 * Harbour: a wooden pier from the coast into the water, a little bank with columns whose roof is
 * in the colour of the traded resource and carries its symbol large, a ratio sign, and a small
 * boat moored alongside.
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
  const boatX = x + dx * S * 0.5 + px * side * S * 0.6;
  const boatY = y + dy * S * 0.5 + py * side * S * 0.6;
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
