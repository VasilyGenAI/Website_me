import { useCallback, useEffect, useMemo, useState } from 'react';
import { STANDARD_NUMBERS, hexagonCoords, tileId, validateMap } from '@kontinentalist/engine';
import type { FogTile, MapDef, MapTile, PortType, Terrain } from '@kontinentalist/engine';
import { Board } from '../components/Board';
import { navigate } from '../nav';
import { TERRAIN_NAME, translateMapError } from '../i18n';
import { PRESET_CHOICES } from '../boards';
import { STAGE_LABEL, getMap, mapHash, saveMap, stage, startingGameWith, useLibrary } from '../library';
import { TERRAIN_STYLE, portLabel } from '../theme';
import type { Connection } from '../net';

const GRID_RADIUS = 6;
const TERRAINS: Terrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert'];
const FOG_TERRAINS: FogTile['terrain'][] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert'];
const PORT_CYCLE: (PortType | null)[] = [null, 'any', 'lumber', 'brick', 'wool', 'grain', 'ore'];
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const HISTORY_LIMIT = 100;
const hasNumber = (t: Terrain) => t !== 'desert' && t !== 'fog';

type Tool = { kind: 'terrain'; terrain: Terrain } | { kind: 'number'; n: number } | { kind: 'fog' } | { kind: 'water' } | { kind: 'port' };

const HELP: Record<Tool['kind'], string> = {
  terrain: 'Klicke auf Felder oder leere Wasserflächen zum Malen.',
  number: 'Klicke auf ein Feld, um die Zahl zu setzen.',
  fog: 'Klicke auf ein Feld, um Nebel darüberzulegen oder wieder wegzunehmen. Spieler sehen nur Wolken, bis jemand eine Straße daneben baut. Dann erscheint genau dieses Feld.',
  water: 'Klicke auf ein Feld, um es zu Wasser zu machen.',
  port: `Klicke auf eine Küstenkante: ${PORT_CYCLE.map((p) => (p ? portLabel(p) : 'kein')).join(' → ')}`,
};

function copyOf(map: MapDef, name: string): MapDef {
  return { ...structuredClone(map), name };
}

const emptyMap = (name: string): MapDef => ({ name, tiles: [], ports: [] });

export function Editor({ conn, mapId }: { conn: Connection; mapId?: string }) {
  useLibrary(); // re-render when the saved copy changes (e.g. after testing)
  const [id, setId] = useState<string | undefined>(() => (mapId && getMap(mapId) ? mapId : undefined));
  // Every change to the board goes through this history so it can be undone step by step.
  // The name is not part of it: undo never brings back an old name.
  const [hist, setHist] = useState<{ past: MapDef[]; present: MapDef; future: MapDef[] }>(() => {
    const existing = mapId ? getMap(mapId) : undefined;
    return { past: [], present: existing ? structuredClone(existing.map) : emptyMap('Meine Karte'), future: [] };
  });
  const map = hist.present;
  const { past, future } = hist;
  const change = (next: MapDef) =>
    setHist((h) => ({ past: [...h.past.slice(-(HISTORY_LIMIT - 1)), h.present], present: { ...next, name: h.present.name }, future: [] }));
  const rename = (name: string) => setHist((h) => ({ ...h, present: { ...h.present, name } }));
  const undo = useCallback(
    () =>
      setHist((h) =>
        h.past.length
          ? { past: h.past.slice(0, -1), present: { ...h.past[h.past.length - 1], name: h.present.name }, future: [h.present, ...h.future] }
          : h,
      ),
    [],
  );
  const redo = useCallback(
    () =>
      setHist((h) =>
        h.future.length ? { past: [...h.past, h.present], present: { ...h.future[0], name: h.present.name }, future: h.future.slice(1) } : h,
      ),
    [],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) undo();
      else if (k === 'y' || (k === 'z' && e.shiftKey)) redo();
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const [tool, setTool] = useState<Tool>({ kind: 'terrain', terrain: 'forest' });
  const errors = useMemo(() => (map.tiles.length ? validateMap(map) : []), [map]);
  const saved = id ? getMap(id) : undefined;
  const dirty = !saved || saved.map.name !== map.name || mapHash(saved.map) !== mapHash(map);
  const empty = map.tiles.length === 0;

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

  // Tiles that still need a number get a red outline on the board.
  const missingNumber = useMemo(
    () => map.tiles.filter((t) => hasNumber(t.terrain) && t.number === null).map((t) => tileId(t.q, t.r)),
    [map.tiles],
  );

  const paint = (q: number, r: number) => {
    const id = tileId(q, r);
    const existing = map.tiles.find((t) => tileId(t.q, t.r) === id);
    const others = map.tiles.filter((t) => tileId(t.q, t.r) !== id);
    let next: MapTile | null;
    let ports = map.ports;
    if (tool.kind === 'terrain') {
      next = {
        ...(existing ?? {}),
        q,
        r,
        terrain: tool.terrain,
        number: hasNumber(tool.terrain) ? (existing?.number ?? null) : null,
      };
    } else if (tool.kind === 'number') {
      if (!existing || !hasNumber(existing.terrain) || existing.number === tool.n) return;
      next = { ...existing, number: tool.n };
    } else if (tool.kind === 'fog') {
      if (!existing || existing.terrain === 'fog') return;
      const { hidden, ...rest } = existing;
      next = hidden ? rest : { ...rest, hidden: true };
    } else if (tool.kind === 'water') {
      if (!existing) return;
      next = null;
      ports = ports.filter((p) => tileId(p.q, p.r) !== id);
    } else {
      return;
    }
    change({ ...map, tiles: next ? [...others, next] : others, ports });
  };

  const cyclePort = (q: number, r: number, side: number) => {
    const at = map.ports.findIndex((p) => p.q === q && p.r === r && p.side === side);
    const current = at >= 0 ? map.ports[at].type : null;
    const next = PORT_CYCLE[(PORT_CYCLE.indexOf(current) + 1) % PORT_CYCLE.length];
    const ports = map.ports.filter((_, i) => i !== at);
    if (next) ports.push({ q, r, side, type: next });
    change({ ...map, ports });
  };

  const randomNumbers = () => {
    const numbered = map.tiles.filter((t) => hasNumber(t.terrain));
    const pool = numbered.map((_, i) => STANDARD_NUMBERS[i % STANDARD_NUMBERS.length]).sort(() => Math.random() - 0.5);
    let i = 0;
    change({ ...map, tiles: map.tiles.map((t) => (hasNumber(t.terrain) ? { ...t, number: pool[i++] } : t)) });
  };

  const hiddenCount = map.tiles.filter((t) => t.hidden).length;
  // Boards from before fog became a layer still have 'fog' tiles with a random pool.
  const legacyFog = map.tiles.filter((t) => t.terrain === 'fog').length;
  const pool = map.fogPool ?? [];
  const setPool = (fogPool: FogTile[]) => change({ ...map, fogPool });

  const counts = TERRAINS.map((t) => [t, map.tiles.filter((x) => x.terrain === t).length] as const);

  return (
    <div className="editor">
      <header className="topbar">
        <button className="brand ghost-btn" onClick={() => navigate('#/maps')}>⬅ Meine Karten</button>
        <input className="map-name" value={map.name} maxLength={40} onChange={(e) => rename(e.target.value)} aria-label="Name der Karte" />
        <div className="history-btns">
          <button className="ghost-btn" disabled={!past.length} onClick={undo} title="Rückgängig (Strg+Z)" aria-label="Rückgängig">↶</button>
          <button className="ghost-btn" disabled={!future.length} onClick={redo} title="Wiederholen (Strg+Y)" aria-label="Wiederholen">↷</button>
        </div>
        <span className={errors.length ? 'status bad' : 'status mine'}>
          {empty
            ? 'Leere Karte'
            : errors.length
              ? `${errors.length} Problem(e)`
              : dirty
                ? 'Gültig · nicht gespeichert'
                : `Gespeichert · ${STAGE_LABEL[stage(saved!)]}`}
        </span>
      </header>

      <main className="board-wrap">
        <Board
          map={map}
          revealHidden
          warnTiles={missingNumber}
          ghostCells={ghosts}
          onCell={tool.kind === 'port' ? undefined : paint}
          onCoast={tool.kind === 'port' ? cyclePort : undefined}
        />
        {empty && <div className="editor-empty">Wähle rechts eine Vorlage oder male Felder auf das Wasser.</div>}
      </main>

      <aside className="side editor-side">
        <h4>Vorlage laden</h4>
        <div className="row-btns">
          {PRESET_CHOICES.map((c) => (
            <button key={c.key} onClick={() => change(copyOf(c.map, map.name))}>{c.title}</button>
          ))}
          <button onClick={() => change(emptyMap(map.name))} disabled={empty}>Leeren</button>
        </div>

        <h4>Werkzeug</h4>
        <div className="tools">
          {TERRAINS.map((t) => (
            <button key={t} className={tool.kind === 'terrain' && tool.terrain === t ? 'on' : ''} style={{ background: TERRAIN_STYLE[t].fill }} onClick={() => setTool({ kind: 'terrain', terrain: t })} title={TERRAIN_NAME[t]}>
              {TERRAIN_STYLE[t].icon}
            </button>
          ))}
          <button className={tool.kind === 'fog' ? 'on' : ''} style={{ background: TERRAIN_STYLE.fog.fill }} onClick={() => setTool({ kind: 'fog' })} title="Nebel darüberlegen">
            ☁️
          </button>
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
        <p className="muted">{HELP[tool.kind]}</p>
        <button onClick={randomNumbers} disabled={empty}>🎲 Zahlen zufällig verteilen</button>

        <h4>Nebel ({hiddenCount} Feld{hiddenCount === 1 ? '' : 'er'} verdeckt)</h4>
        <p className="muted">Im Editor siehst du, was unter dem Nebel liegt. Im Spiel sehen alle nur Wolken.</p>
        <label className="check">
          <input type="checkbox" checked={map.fogReward !== false} onChange={(e) => change({ ...map, fogReward: e.target.checked })} />
          Wer Nebel aufdeckt, bekommt 1 Rohstoff davon
        </label>
        {legacyFog > 0 && (
          <>
            <p className="muted">Diese Karte hat noch {legacyFog} alte Nebelfelder mit Zufallsvorrat:</p>
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
            <button onClick={() => setPool([...pool, { terrain: 'hills', number: 5 }])}>+ Eintrag</button>
          </>
        )}

        <h4>Übersicht</h4>
        <p className="muted">
          {empty ? 'Noch keine Felder.' : `${counts.filter(([, n]) => n).map(([t, n]) => `${TERRAIN_STYLE[t].icon} ${n}`).join('  ')} · ☁️ ${hiddenCount} · ⚓ ${map.ports.length}`}
        </p>
        {errors.length > 0 && (
          <ul className="errors">
            {errors.slice(0, 8).map((e) => <li key={e}>{translateMapError(e)}</li>)}
          </ul>
        )}

        <div className="row-btns">
          <button disabled={empty || errors.length > 0 || !map.name.trim() || !dirty} onClick={save}>💾 Speichern</button>
          <button className="primary" disabled={empty || errors.length > 0 || !map.name.trim()} onClick={test}>
            ▶ Speichern und gegen Bots testen
          </button>
        </div>
        <p className="muted small">Nach einer zu Ende gespielten Bot-Partie gilt die Karte als getestet und kann veröffentlicht werden. Jede Änderung am Brett setzt das zurück.</p>
      </aside>
    </div>
  );
}
