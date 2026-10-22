import { useState } from 'react';
import { PRESET_MAPS } from '@kontinentalist/engine';
import type { PresetId } from '@kontinentalist/engine';
import { Board } from '../components/Board';
import { MiniFlag } from '../components/MapCard';
import { useSavedSettings } from '../components/Settings';
import { CONTINENTS, Globe } from '../campaign/Globe';
import type { ContinentId } from '../campaign/Globe';
import { EuropeMap } from '../campaign/EuropeMap';
import { EUROPE_COUNTRIES } from '../campaign/europeData';
import type { EuropeCountry } from '../campaign/europeData';
import { isConquered, useProgress } from '../campaign/progress';
import type { Progress } from '../campaign/progress';
import { startingGameWith } from '../library';
import { navigate, useRoute } from '../nav';
import type { Connection } from '../net';

/*
 * The campaign: a globe to pick a continent, then the continent's map to pick a country.
 * Every country of a continent must be won before the next continent opens.
 */

const PLAYABLE = EUROPE_COUNTRIES.filter((c) => c.playable);
const ORDER: ContinentId[] = ['europa', 'asien', 'afrika', 'nordamerika', 'suedamerika', 'ozeanien'];

function europeDone(p: Progress) {
  return PLAYABLE.filter((c) => isConquered(p, c.id)).length;
}

/** A continent opens once every continent before it has been conquered. Only Europe has boards yet. */
function isOpen(id: ContinentId, p: Progress) {
  if (id === 'europa') return true;
  return ORDER.indexOf(id) === 1 && europeDone(p) === PLAYABLE.length;
}

export function World({ conn }: { conn: Connection }) {
  const route = useRoute();
  const progress = useProgress();
  if (route.startsWith('#/welt/europa')) return <Europe conn={conn} progress={progress} />;

  const done = europeDone(progress);
  return (
    <div className="page world">
      <h2 className="page-title">🌍 Welt</h2>
      <p className="note">Erobere jedes Land eines Kontinents, um den nächsten freizuschalten. Tippe auf Europa, um zu beginnen.</p>
      <div className="world-layout">
        <Globe open={(id) => isOpen(id, progress)} onPick={(id) => isOpen(id, progress) && id === 'europa' && navigate('#/welt/europa')} />
        <div className="continents">
          {CONTINENTS.map((c) => {
            const open = isOpen(c.id, progress);
            const europe = c.id === 'europa';
            return (
              <button key={c.id} className={`continent${open ? ' open' : ' locked'}`} disabled={!europe} onClick={() => europe && navigate('#/welt/europa')}>
                <b>{open ? '' : '🔒 '}{c.name}</b>
                {europe ? (
                  <>
                    <span className="muted">{done} von {PLAYABLE.length} Ländern erobert</span>
                    <span className="bar"><span style={{ width: `${(done / PLAYABLE.length) * 100}%` }} /></span>
                  </>
                ) : (
                  <span className="muted">{open ? 'Länder folgen bald' : 'Erst Europa erobern'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Europe({ conn, progress }: { conn: Connection; progress: Progress }) {
  const [selected, setSelected] = useState<EuropeCountry | null>(null);
  const [settings] = useSavedSettings();
  const done = europeDone(progress);

  const play = (preset: PresetId) => {
    startingGameWith(undefined);
    conn.send({ t: 'createRoom', preset, bots: 3, start: true, settings });
  };

  return (
    <div className="page world">
      <div className="world-head">
        <button className="ghost-btn" onClick={() => navigate('#/welt')}>← Globus</button>
        <h2 className="page-title">Europa</h2>
        <span className="world-progress">
          🏆 {done} / {PLAYABLE.length}
          <span className="bar"><span style={{ width: `${(done / PLAYABLE.length) * 100}%` }} /></span>
        </span>
      </div>
      {done === PLAYABLE.length && <p className="note good">Europa ist erobert! Der nächste Kontinent ist frei.</p>}
      <div className="europe-layout">
        <EuropeMap progress={progress} selected={selected?.id ?? null} onSelect={setSelected} />
        {selected ? (
          <CountryPanel country={selected} progress={progress} onPlay={play} onClose={() => setSelected(null)} />
        ) : (
          <div className="country-panel hint">
            <b>Wähle ein Land</b>
            <span className="muted">Hellgrau: noch zu erobern. Bunt: schon gewonnen. Dunkel: kommt bald.</span>
            <span className="muted">Ziehen zum Verschieben, Mausrad oder ＋/－ zum Zoomen.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryPanel({ country, progress, onPlay, onClose }: { country: EuropeCountry; progress: Progress; onPlay: (p: PresetId) => void; onClose: () => void }) {
  if (!country.playable) {
    return (
      <div className="country-panel">
        <button className="close" onClick={onClose}>✕</button>
        <b className="country-name">{country.name}</b>
        <span className="muted">Dieses Land kommt bald.</span>
      </div>
    );
  }
  const big = PRESET_MAPS[country.id as keyof typeof PRESET_MAPS]();
  const small = PRESET_MAPS[`${country.id}-klein` as keyof typeof PRESET_MAPS]();
  const won = progress.won[country.id];
  return (
    <div className="country-panel">
      <button className="close" onClick={onClose}>✕</button>
      <b className="country-name">
        {country.name}
        {big.flag && <MiniFlag flag={big.flag} />}
      </b>
      <span className={won ? 'status-won' : 'muted'}>
        {won ? `🏆 Erobert${won.big ? ' (groß)' : ''}${won.small ? ' (klein)' : ''}` : 'Noch nicht erobert'}
      </span>
      <div className="mapthumb">
        <Board map={big} />
      </div>
      <div className="row-btns">
        <button className="primary" onClick={() => onPlay(country.id as PresetId)}>
          Groß spielen <small>{big.tiles.length} Felder</small>
        </button>
        <button onClick={() => onPlay(`${country.id}-klein` as PresetId)}>
          Klein spielen <small>{small.tiles.length} Felder</small>
        </button>
      </div>
      <span className="muted">Gegen 3 Bots. Wer gewinnt, erobert das Land.</span>
    </div>
  );
}
