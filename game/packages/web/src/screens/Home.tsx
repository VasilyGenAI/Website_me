import { useState } from 'react';
import { CAN_CREATE_MAPS } from '@hexlands/engine';
import type { MapDef, PresetId } from '@hexlands/engine';
import { loadMaps } from '../maps';
import { saveName, userId } from '../net';
import type { Connection } from '../net';

const ROLE_LABEL = { admin: 'Admin', pro: 'Pro', basic: 'Basic' } as const;

export function Home({ conn, name, setName }: { conn: Connection; name: string; setName: (n: string) => void }) {
  const [board, setBoard] = useState<string>('preset:standard');
  const [bots, setBots] = useState(3);
  const [code, setCode] = useState('');
  const myMaps = loadMaps();
  const canMaps = conn.role !== null && CAN_CREATE_MAPS[conn.role];

  const boardChoice = (): { preset?: PresetId; map?: MapDef } => {
    if (board.startsWith('preset:')) return { preset: board.slice(7) as PresetId };
    return { map: myMaps.find((m) => `map:${m.name}` === board) };
  };

  return (
    <div className="home">
      <div className="hero">
        <h1>⬢ Hexlands</h1>
        <p>Siedeln, handeln, bauen. Im Browser, auf Laptop und Handy.</p>
      </div>
      <div className="card">
        <label>
          Dein Name
          <input
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              saveName(name);
              conn.send({ t: 'hello', userId, name });
            }}
          />
        </label>
        {conn.role && <span className={`role role-${conn.role}`}>{ROLE_LABEL[conn.role]}</span>}
      </div>

      <div className="card">
        <h2>Spielen</h2>
        <label>
          Spielbrett
          <select value={board} onChange={(e) => setBoard(e.target.value)}>
            <option value="preset:standard">Standard (zufällig)</option>
            <option value="preset:nebelwald">Nebelwald</option>
            {canMaps && myMaps.map((m) => <option key={m.name} value={`map:${m.name}`}>Eigene: {m.name}</option>)}
          </select>
        </label>
        <label>
          Bots
          <select value={bots} onChange={(e) => setBots(Number(e.target.value))}>
            <option value={1}>1 Bot</option>
            <option value={2}>2 Bots</option>
            <option value={3}>3 Bots</option>
          </select>
        </label>
        <div className="row-btns">
          <button className="primary big" disabled={!conn.connected} onClick={() => conn.send({ t: 'createRoom', ...boardChoice(), bots, start: true })}>
            Gegen Bots spielen
          </button>
          <button className="big" disabled={!conn.connected} onClick={() => conn.send({ t: 'createRoom', ...boardChoice() })}>
            Raum für Freunde
          </button>
        </div>
        <form
          className="join"
          onSubmit={(e) => {
            e.preventDefault();
            conn.send({ t: 'joinRoom', roomId: code.trim().toLowerCase() });
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Raum-Code" maxLength={12} />
          <button disabled={!code.trim()}>Beitreten</button>
        </form>
      </div>

      <div className="card">
        <h2>Karten-Editor</h2>
        {canMaps ? (
          <a className="button big" href="#/editor">Eigenes Spielbrett bauen</a>
        ) : (
          <p className="muted">🔒 Eigene Spielbretter sind ein Pro-Feature.</p>
        )}
      </div>
      {!conn.connected && <p className="muted">Verbinde mit dem Server…</p>}
    </div>
  );
}
