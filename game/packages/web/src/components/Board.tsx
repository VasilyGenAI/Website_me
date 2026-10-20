import { useMemo } from 'react';
import { hexCorners, pips, tileId, topology, vertexPoint } from '@kontinentalist/engine';
import type { Building, EdgeId, FogTile, MapDef, TileId, VertexId } from '@kontinentalist/engine';
import { SHORE, TERRAIN_STYLE, portLabel } from '../theme';

const S = 50; // hex size in SVG units

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

  const hintV = new Set(props.hintVertices ?? []);
  const hintE = new Set(props.hintEdges ?? []);
  const hintT = new Set(props.hintTiles ?? []);

  return (
    <svg className="board" viewBox={viewBox} role="img" aria-label="Spielbrett">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.45" />
        </filter>
      </defs>

      {props.ghostCells?.map((c) => (
        <polygon
          key={`g${c.q},${c.r}`}
          className="ghost"
          points={polygon(c.q, c.r, 0.96)}
          onClick={() => props.onCell?.(c.q, c.r)}
        />
      ))}

      {/* Sandy shore under the land so the coastline reads at a glance. */}
      {map.tiles.map((t) => (
        <polygon key={`s${t.q},${t.r}`} points={polygon(t.q, t.r, 1.12)} fill={SHORE} />
      ))}

      {map.ports.map((p, i) => {
        const cs = hexCorners(p.q, p.r);
        const a = pt(cs[p.side]);
        const b = pt(cs[(p.side + 1) % 6]);
        const c = center(p.q, p.r);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const len = Math.hypot(mx - c.x, my - c.y);
        const px = mx + ((mx - c.x) / len) * S * 0.62;
        const py = my + ((my - c.y) / len) * S * 0.62;
        return (
          <g key={`p${i}`} className="port" onClick={() => props.onCoast?.(p.q, p.r, p.side)}>
            <line x1={a.x} y1={a.y} x2={px} y2={py} />
            <line x1={b.x} y1={b.y} x2={px} y2={py} />
            <circle cx={px} cy={py} r={16} />
            <text x={px} y={py + 4} textAnchor="middle">
              {portLabel(p.type)}
            </text>
          </g>
        );
      })}

      {map.tiles.map((t) => {
        const id = tileId(t.q, t.r);
        const shown = revealed[id] ?? t;
        const style = TERRAIN_STYLE[shown.terrain];
        const c = center(t.q, t.r);
        const red = shown.number === 6 || shown.number === 8;
        return (
          <g key={id} className="tile" onClick={() => (props.onCell ? props.onCell(t.q, t.r) : props.onTile?.(id))}>
            <polygon points={polygon(t.q, t.r, 0.97)} fill={style.fill} stroke="rgba(0,0,0,.25)" strokeWidth={1.5} />
            {style.image ? (
              <image href={style.image} x={c.x - S * 0.8} y={c.y - S * 0.8} width={S * 1.6} height={S * 1.6} />
            ) : (
              <text x={c.x} y={c.y - S * 0.38} textAnchor="middle" fontSize={S * 0.42}>
                {style.icon}
              </text>
            )}
            {shown.number !== null && (
              <g filter="url(#shadow)">
                <circle cx={c.x} cy={c.y + S * 0.12} r={S * 0.34} fill="#fbf6e6" />
                <text x={c.x} y={c.y + S * 0.2} textAnchor="middle" className={red ? 'num red' : 'num'} fontSize={S * 0.36}>
                  {shown.number}
                </text>
                <text x={c.x} y={c.y + S * 0.36} textAnchor="middle" className={red ? 'pips red' : 'pips'} fontSize={S * 0.2}>
                  {'•'.repeat(pips(shown.number))}
                </text>
              </g>
            )}
            {robber === id && (
              <g className="robber" filter="url(#shadow)">
                <ellipse cx={c.x + S * 0.42} cy={c.y + S * 0.3} rx={S * 0.15} ry={S * 0.07} fill="#222" />
                <rect x={c.x + S * 0.31} y={c.y - S * 0.12} width={S * 0.22} height={S * 0.42} rx={S * 0.1} fill="#3a3a3a" />
                <circle cx={c.x + S * 0.42} cy={c.y - S * 0.16} r={S * 0.12} fill="#3a3a3a" />
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
          <g key={`r${e}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#222" strokeWidth={10} strokeLinecap="round" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors[owner]} strokeWidth={7} strokeLinecap="round" />
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
        const d =
          b.type === 'settlement'
            ? `M${p.x - 9},${p.y + 8} v-10 l9,-8 l9,8 v10 z`
            : `M${p.x - 13},${p.y + 9} v-11 l7,-6 l7,6 v-1 h6 v12 z`;
        return (
          <path
            key={`b${v}`}
            d={d}
            fill={colors[b.owner]}
            stroke="#222"
            strokeWidth={2}
            filter="url(#shadow)"
            className={isHint ? 'hint-building' : undefined}
            onClick={isHint ? () => props.onVertex?.(v) : undefined}
          />
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

