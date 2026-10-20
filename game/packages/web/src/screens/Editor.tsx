import { useMemo, useState } from 'react';
import { STANDARD_NUMBERS, hexagonCoords, tileId, validateMap } from '@kontinentalist/engine';
import type { FogTile, MapDef, MapTile, PortType, Terrain } from '@kontinentalist/engine';
import { Board } from '../components/Board';
import { navigate } from '../nav';
import { TERRAIN_NAME } from '../i18n';
import { PRESET_CHOICES } from '../boards';
import { STAGE_LABEL, getMap, mapHash, saveMap, stage, startingGameWith, useLibrary } from '../library';
import { TERRAIN_STYLE, portLabel } from '../theme';
import type { Connection } from '../net';

const GRID_RADIUS = 6;
const TERRAINS: Terrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'fog'];
const FOG_TERRAINS: FogTile['terrain'][] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert'];
const PORT_CYCLE: (PortType | null)[] = [null, 'any', 'lumber', 'brick', 'wool', 'grain', 'ore'];
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const hasNumber = (t: Terrain) => t !== 'desert' && t !== 'fog';

type Tool = { kind: 'terrain'; terrain: Terrain } | { kind: 'number'; n: number } | { kind: 'water' } | { kind: 'port' };

function copyOf(map: MapDef, name: string): MapDef {
  return { ...structuredClone(map), name };
}

export function Editor({ conn, mapId }: { conn: Connection; mapId?: string }) {
  useLibrary(); // re-render when the saved copy changes (e.g. after testing)
  const [id, setId] = useState<string | undefined>(() => (mapId && getMap(mapId) ? mapId : undefined));
  const [map, setMap] = useState<MapDef>(() => {
    const existing = mapId ? getMap(mapId) : undefined;
    return existing ? structuredClone(existing.map) : copyOf(PRESET_CHOICES[0].map, 'Meine Karte');
  });
  const [tool, setTool] = useState<Tool>({ kind: 'terrain', terrain: 'forest' });
  const errors = useMemo(() => validateMap(map), [map]);
  const saved = id ? getMap(id) : undefined;
  const dirty = !saved || saved.map.name !== map.name || mapHash(saved.map) !== mapHash(map);

  const save = () => setId(saveMap(map, id));
  const test = () => {
    save();
    startingGameWith(map);
    conn.send({ t: 'createRoom', map, bots: 3, start: true });
  };

  const ghosts = useMemo(() => {
    const land = new Set(map.tiles.map((t) => tileId(t.q, t.r)));
    return hexagonCoords(GRID_RADIUS).filter((c) => !land.has(tileId(c.q, c.r)));
  }, [map.tiles]);

  const paint = (q: number, r: number) => {
    const id = tileId(q, r);
    const existing = map.tiles.find((t) => tileId(t.q, t.r) === id);
    const tiles: MapTile[] = map.tiles.filter((t) => tileId(t.q, t.r) !== id);
    let ports = map.ports;
    if (tool.kind === 'terrain') {
      const keep = existing && hasNumber(tool.terrain) ? existing.number : null;
      tiles.push({ q, r, terrain: tool.terrain, number: hasNumber(tool.terrain) ? keep : null });
    } else if (tool.kind === 'number') {
      if (!existing) return;
      tiles.push(hasNumber(existing.terrain) ? { ...existing, number: tool.n } : existing);
    } else if (tool.kind === 'water') {
      ports = ports.filter((p) => tileId(p.q, p.r) !== id);
    } else {
      return;
    }
    setMap({ ...map, tiles, ports });
  };

  const cyclePort = (q: number, r: number, side: number) => {
    const at = map.ports.findIndex((p) => p.q === q && p.r === r && p.side === side);
    const current = at >= 0 ? map.ports[at].type : null;
    const next = PORT_CYCLE[(PORT_CYCLE.indexOf(current) + 1) % PORT_CYCLE.length];
    const ports = map.ports.filter((_, i) => i !== at);
    if (next) ports.push({ q, r, side, type: next });
    setMap({ ...map, ports });
  };

  const randomNumbers = () => {
    const numbered = map.tiles.filter((t) => hasNumber(t.terrain));
    const pool = numbered.map((_, i) => STANDARD_NUMBERS[i % STANDARD_NUMBERS.length]).sort(() => Math.random() - 0.5);
    let i = 0;
    setMap({ ...map, tiles: map.tiles.map((t) => (hasNumber(t.terrain) ? { ...t, number: pool[i++] } : t)) });
  };

  const fogCount = map.tiles.filter((t) => t.terrain === 'fog').length;
  const pool = map.fogPool ?? [];
  const setPool = (fogPool: FogTile[]) => setMap({ ...map, fogPool });
  const fillPool = () => {
    const kinds: FogTile['terrain'][] = ['hills', 'pasture', 'fields', 'mountains'];
    setPool(Array.from({ length: fogCount }, (_, i) => ({ terrain: kinds[i % kinds.length], number: NUMBERS[i % NUMBERS.length] })));
  };

  const counts = TERRAINS.map((t) => [t, map.tiles.filter((x) => x.terrain === t).length] as const);

  return (
    <div className="editor">
      <header className="topbar">
        <button className="brand ghost-btn" onClick={() => navigate('#/maps')}>⬅ Meine Karten</button>
        <input className="map-name" value={map.name} maxLength={40} onChange={(e) => setMap({ ...map, name: e.target.value })} aria-label="Name der Karte" />
        <span className={errors.length ? 'status bad' : 'status mine'}>
          {errors.length ? `${errors.length} Problem(e)` : dirty ? 'Gültig · nicht gespeichert' : `Gespeichert · ${STAGE_LABEL[stage(saved!)]}`}
        </span>
      </header>

      <main className="board-wrap">
        <Board
          map={map}
          ghostCells={ghosts}
          onCell={tool.kind === 'port' ? undefined : paint}
          onCoast={tool.kind === 'port' ? cyclePort : undefined}
        />
      </main>

      <aside className="side editor-side">
        <h4>Werkzeug</h4>
        <div className="tools">
          {TERRAINS.map((t) => (
            <button key={t} className={tool.kind === 'terrain' && tool.terrain === t ? 'on' : ''} style={{ background: TERRAIN_STYLE[t].fill }} onClick={() => setTool({ kind: 'terrain', terrain: t })} title={TERRAIN_NAME[t]}>
              {TERRAIN_STYLE[t].icon}
            </button>
          ))}
          <button className={tool.kind === 'water' ? 'on' : ''} style={{ background: '#1565c0' }} onClick={() => setTool({ kind: 'water' })} title="Wasser (Feld entfernen)">
            🌊
          </button>
          <button className={tool.kind === 'port' ? 'on' : ''} onClick={() => setTool({ kind: 'port' })} title="Häfen setzen">
            ⚓
          </button>
        </div>
        <div className="tools numbers">
          {NUMBERS.map((n) => (
            <button key={n} className={`${tool.kind === 'number' && tool.n === n ? 'on' : ''} ${n === 6 || n === 8 ? 'red' : ''}`} onClick={() => setTool({ kind: 'number', n })}>
              {n}
            </button>
          ))}
        </div>
        <p className="muted">
          {tool.kind === 'port'
            ? `Klicke auf eine Küstenkante: ${PORT_CYCLE.map((p) => (p ? portLabel(p) : 'kein')).join(' → ')}`
            : tool.kind === 'number'
              ? 'Klicke auf ein Feld, um die Zahl zu setzen.'
              : 'Klicke auf Felder oder leere Wasserflächen zum Malen.'}
        </p>
        <button onClick={randomNumbers}>🎲 Zahlen zufällig verteilen</button>

        <h4>Nebel-Vorrat ({pool.length} für {fogCount} Nebelfelder)</h4>
        <p className="muted">Wird eine Straße an ein Nebelfeld gebaut, deckt es ein zufälliges Feld aus diesem Vorrat auf.</p>
        <label className="check">
          <input type="checkbox" checked={map.fogReward !== false} onChange={(e) => setMap({ ...map, fogReward: e.target.checked })} />
          Entdecker bekommt 1 Rohstoff
        </label>
        <div className="pool">
          {pool.map((f, i) => (
            <div key={i} className="pool-row">
              <select
                value={f.terrain}
                onChange={(e) => {
                  const terrain = e.target.value as FogTile['terrain'];
                  setPool(pool.map((x, j) => (j === i ? { terrain, number: hasNumber(terrain) ? (x.number ?? 5) : null } : x)));
                }}
              >
                {FOG_TERRAINS.map((t) => <option key={t} value={t}>{TERRAIN_STYLE[t].icon} {TERRAIN_NAME[t]}</option>)}
              </select>
              {hasNumber(f.terrain) && (
                <select value={f.number ?? 5} onChange={(e) => setPool(pool.map((x, j) => (j === i ? { ...x, number: Number(e.target.value) } : x)))}>
                  {NUMBERS.map((n) => <option key={n}>{n}</option>)}
                </select>
              )}
              <button className="mini" onClick={() => setPool(pool.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <div className="row-btns">
          <button onClick={() => setPool([...pool, { terrain: 'hills', number: 5 }])}>+ Eintrag</button>
          <button onClick={fillPool} disabled={fogCount === 0}>Automatisch füllen</button>
        </div>

        <h4>Übersicht</h4>
        <p className="muted">{counts.filter(([, n]) => n).map(([t, n]) => `${TERRAIN_STYLE[t].icon} ${n}`).join('  ')} · ⚓ {map.ports.length}</p>
        {errors.length > 0 && (
          <ul className="errors">
            {errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="row-btns">
          <button disabled={errors.length > 0 || !map.name.trim() || !dirty} onClick={save}>💾 Speichern</button>
          <button className="primary" disabled={errors.length > 0 || !map.name.trim()} onClick={test}>
            ▶ Speichern und gegen Bots testen
          </button>
        </div>
        <p className="muted small">Nach einer zu Ende gespielten Bot-Partie gilt die Karte als getestet und kann veröffentlicht werden. Jede Änderung am Brett setzt das zurück.</p>

        <h4>Vorlage laden</h4>
        <div className="row-btns">
          {PRESET_CHOICES.map((c) => (
            <button key={c.key} onClick={() => setMap(copyOf(c.map, map.name))}>{c.title}</button>
          ))}
          <button onClick={() => setMap({ name: map.name, tiles: [], ports: [] })}>Leer</button>
        </div>
      </aside>
    </div>
  );
}
