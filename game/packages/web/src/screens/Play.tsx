import { useState } from 'react';
import { CAN_CREATE_MAPS } from '@kontinentalist/engine';
import { Tabs } from '../components/Shell';
import { MapCard } from '../components/MapCard';
import { SettingsPanel, useSavedSettings } from '../components/Settings';
import { PRESET_CHOICES, canPlayWithPeople, ownChoice } from '../boards';
import type { BoardChoice } from '../boards';
import { STAGE_LABEL, stage, startingGameWith, useLibrary } from '../library';
import { OFFLINE } from '../local';
import { navigate } from '../nav';
import type { Connection } from '../net';

export function Play({ conn }: { conn: Connection }) {
  const [tab, setTab] = useState<'bots' | 'people'>('bots');
  const [pick, setPick] = useState('p:standard');
  const [bots, setBots] = useState(3);
  const [code, setCode] = useState('');
  const [settings, setSettings] = useSavedSettings();
  const { maps } = useLibrary();
  const canMaps = conn.role !== null && CAN_CREATE_MAPS[conn.role];

  const shared = maps.filter((m) => stage(m) === 'shared').map(ownChoice);
  const own = canMaps ? maps.map((m) => ({ ...ownChoice(m), subtitle: STAGE_LABEL[stage(m)] })) : [];
  const ownForPeople = canMaps ? maps.filter(canPlayWithPeople).map(ownChoice) : [];
  const groups: { title: string; items: BoardChoice[] }[] =
    tab === 'bots'
      ? [
          { title: 'Vorgefertigt', items: PRESET_CHOICES },
          { title: 'Custom', items: shared },
          { title: 'Meine Karten', items: own },
        ]
      : [
          { title: 'Vorgefertigt', items: PRESET_CHOICES },
          { title: 'Custom', items: shared },
          { title: 'Meine veröffentlichten Karten', items: ownForPeople },
        ];
  const all = groups.flatMap((g) => g.items);
  const chosen = all.find((c) => c.key === pick) ?? PRESET_CHOICES[0];

  const start = () => {
    startingGameWith(chosen.custom);
    conn.send({ t: 'createRoom', preset: chosen.preset, map: chosen.custom, settings, ...(tab === 'bots' ? { bots, start: true } : {}) });
  };

  return (
    <div className="page">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'bots', label: '🤖 Gegen Bots' },
          { id: 'people', label: '👥 Mit Menschen' },
        ]}
      />
      {tab === 'people' && OFFLINE && (
        <p className="note">Mit Menschen spielen geht in der Online-Version. Hier siehst du schon, welche Karten dafür erlaubt sind.</p>
      )}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.title}>
              <h3 className="section-title">{g.title}</h3>
              <div className="mapgrid">
                {g.items.map((c) => (
                  <MapCard key={c.key} map={c.map} title={c.title} subtitle={c.subtitle} selected={chosen.key === c.key} onSelect={() => setPick(c.key)} />
                ))}
              </div>
            </section>
          ),
      )}
      {tab === 'bots' && canMaps && own.length === 0 && (
        <p className="note">
          Eigene Karten baust du unter <button className="link" onClick={() => navigate('#/maps')}>Karten</button>.
        </p>
      )}
      <section>
        <h3 className="section-title">Einstellungen</h3>
        <SettingsPanel value={settings} onChange={setSettings} />
      </section>
      <div className="startbar">
        {tab === 'bots' && (
          <label className="inline">
            Bots
            <select value={bots} onChange={(e) => setBots(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
        )}
        {tab === 'people' && !OFFLINE && (
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
        )}
        <button className="primary big" disabled={!conn.connected || (tab === 'people' && OFFLINE)} onClick={start}>
          {tab === 'bots' ? `Spiel starten: ${chosen.title}` : `Raum erstellen: ${chosen.title}`}
        </button>
      </div>
    </div>
  );
}
