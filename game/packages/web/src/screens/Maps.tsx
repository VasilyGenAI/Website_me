import { useState } from 'react';
import { CAN_CREATE_MAPS } from '@kontinentalist/engine';
import { Tabs } from '../components/Shell';
import { MapCard } from '../components/MapCard';
import { STAGE_LABEL, deleteMap, setPublished, setShared, stage, startingGameWith, useLibrary } from '../library';
import type { MapStage, SavedMap } from '../library';
import { navigate } from '../nav';
import type { Connection } from '../net';

const STEPS: MapStage[] = ['draft', 'tested', 'published', 'shared'];

const NEXT_STEP: Record<MapStage, string> = {
  draft: 'Spiele eine Partie gegen Bots bis zum Ende, dann kannst du die Karte veröffentlichen.',
  tested: 'Getestet. Veröffentliche sie, um sie in Spielen mit Menschen zu nutzen (nur du kannst damit Räume erstellen).',
  published: 'Du kannst damit gegen Menschen spielen. Gib sie frei, damit alle sie unter „Custom“ sehen.',
  shared: 'Alle Spieler sehen diese Karte unter „Custom“.',
};

function Stepper({ current }: { current: MapStage }) {
  const at = STEPS.indexOf(current);
  return (
    <ol className="stepper" aria-label={`Status: ${STAGE_LABEL[current]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>
          {STAGE_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

function OwnMap({ m, conn }: { m: SavedMap; conn: Connection }) {
  const [confirm, setConfirm] = useState(false);
  const s = stage(m);
  const play = () => {
    startingGameWith(m.map);
    conn.send({ t: 'createRoom', map: m.map, bots: 3, start: true });
  };
  return (
    <MapCard map={m.map} title={m.map.name} subtitle={`${m.map.tiles.length} Felder · ${m.plays} Partie(n) gespielt`}>
      <Stepper current={s} />
      <p className="muted small">{NEXT_STEP[s]}</p>
      <div className="row-btns">
        <button onClick={() => navigate(`#/editor/${m.id}`)}>✏️ Bearbeiten</button>
        <button className={s === 'draft' ? 'primary' : ''} onClick={play}>🤖 {s === 'draft' ? 'Testen' : 'Gegen Bots'}</button>
        {s === 'tested' && <button className="primary" onClick={() => setPublished(m.id, true)}>Veröffentlichen</button>}
        {s === 'published' && <button className="primary" onClick={() => setShared(m.id, true)}>Für alle freigeben</button>}
        {s === 'shared' && <button onClick={() => setShared(m.id, false)}>Freigabe zurückziehen</button>}
        {confirm ? (
          <>
            <button className="danger" onClick={() => deleteMap(m.id)}>Wirklich löschen</button>
            <button onClick={() => setConfirm(false)}>Abbrechen</button>
          </>
        ) : (
          <button onClick={() => setConfirm(true)}>🗑️</button>
        )}
      </div>
    </MapCard>
  );
}

export function Maps({ conn }: { conn: Connection }) {
  const [tab, setTab] = useState<'mine' | 'custom'>('mine');
  const { maps } = useLibrary();
  const canMaps = conn.role !== null && CAN_CREATE_MAPS[conn.role];
  const shared = maps.filter((m) => stage(m) === 'shared');

  return (
    <div className="page">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'mine', label: 'Meine Karten' },
          { id: 'custom', label: 'Custom' },
        ]}
      />
      {tab === 'mine' &&
        (canMaps ? (
          <>
            <button className="primary big" onClick={() => navigate('#/editor')}>+ Neue Karte erstellen</button>
            {maps.length === 0 && <p className="note">Noch keine eigenen Karten. Starte mit einer leeren Karte oder einer Vorlage wie Deutschland.</p>}
            <div className="maplist">
              {maps.map((m) => <OwnMap key={m.id} m={m} conn={conn} />)}
            </div>
          </>
        ) : (
          <p className="note">🔒 Eigene Karten bauen ist ein Pro-Feature. Freigegebene Karten anderer Spieler findest du unter „Custom“.</p>
        ))}
      {tab === 'custom' && (
        <>
          <p className="note">Karten, die Spieler für alle freigegeben haben. In der Testversion siehst du hier nur deine eigenen freigegebenen Karten.</p>
          <div className="maplist">
            {shared.map((m) => (
              <MapCard key={m.id} map={m.map} title={m.map.name} subtitle={`${m.map.tiles.length} Felder · von dir`}>
                <div className="row-btns">
                  <button
                    onClick={() => {
                      startingGameWith(m.map);
                      conn.send({ t: 'createRoom', map: m.map, bots: 3, start: true });
                    }}
                  >
                    🤖 Gegen Bots spielen
                  </button>
                </div>
              </MapCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
