import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { COSTS, RESOURCES, TERRAIN_RESOURCE, hasResources, tileId, topology, totalCards } from '@kontinentalist/engine';
import type { Action, DevCardType, GameView, Resource, ResourceCounts, RoomView } from '@kontinentalist/engine';
import { Board } from '../components/Board';
import { Dice } from '../components/Dice';
import { DevCardBack, DevCardButton, DevCardFace } from '../components/DevCards';
import { FLIGHT_MS, FlyingCards } from '../components/Flights';
import type { Flight } from '../components/Flights';
import { TradeComposer, emptyCounts } from '../components/TradeComposer';
import { TradePanel } from '../components/TradePanel';
import { Log } from '../components/Log';
import { DEV_HELP, DEV_NAME, RES_NAME } from '../i18n';
import { RESOURCE_STYLE } from '../theme';
import type { Connection } from '../net';

type BuildMode = 'road' | 'settlement' | 'city' | null;
type Dialog = 'dev' | null;

const empty = (): ResourceCounts => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });

interface Gain {
  /** Shown as "+n" for 5 s; gains in quick succession add up. */
  n: number;
  key: number;
  /** ms until the cards land (after a roll they fly in first) */
  delay: number;
  /** Cards still in the air, not yet counted on the card. */
  pending: number;
}

function ResourceCard({ r, n, onClick, dim, gain }: { r: Resource; n: number; onClick?: () => void; dim?: boolean; gain?: Gain }) {
  return (
    <button className={`rcard${dim ? ' dim' : ''}`} style={{ background: RESOURCE_STYLE[r].fill }} onClick={onClick} disabled={!onClick} title={RES_NAME[r]} data-res={r}>
      <span className="ricon">{RESOURCE_STYLE[r].icon}</span>
      <span className="rcount">{n}</span>
      {gain && gain.n > 0 && (
        <span key={gain.key} className="gain" style={{ animationDelay: `${gain.delay}ms` }}>
          +{gain.n}
        </span>
      )}
    </button>
  );
}

/** Pick a multiset of resources, e.g. for discarding or a trade side. */
function Picker({ value, onChange, max }: { value: ResourceCounts; onChange: (v: ResourceCounts) => void; max?: ResourceCounts }) {
  return (
    <div className="picker">
      {RESOURCES.map((r) => (
        <div key={r} className="picker-col">
          <ResourceCard r={r} n={value[r]} onClick={() => (!max || value[r] < max[r] ? onChange({ ...value, [r]: value[r] + 1 }) : undefined)} />
          <button className="mini" disabled={value[r] === 0} onClick={() => onChange({ ...value, [r]: value[r] - 1 })}>
            −
          </button>
        </div>
      ))}
    </div>
  );
}

export function Game({ room, conn }: { room: RoomView; conn: Connection }) {
  const g = room.game as GameView;
  const me = g.me;
  const myTurn = me !== null && g.currentPlayer === me;
  const [mode, setMode] = useState<BuildMode>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [panel, setPanel] = useState<'log' | 'chat'>('log');
  const [showResult, setShowResult] = useState(true);
  const act = (action: Action) => {
    conn.send({ t: 'action', action });
    setMode(null);
  };
  const colors = g.players.map((p) => p.color);
  const phase = g.phase;
  const hand = g.hand ?? empty();

  // Trade bar: tapping a card in your hand opens it with that card on the "give" side.
  const [trading, setTrading] = useState(false);
  const [give, setGive] = useState(emptyCounts);
  const [want, setWant] = useState(emptyCounts);
  const canTrade = myTurn && phase.type === 'main' && !g.tradeOffer;
  const openTrade = (r?: Resource) => {
    const base = trading ? give : emptyCounts();
    if (!trading) setWant(emptyCounts());
    setGive(r ? { ...base, [r]: Math.min(hand[r], base[r] + 1) } : base);
    setTrading(true);
    setMode(null);
  };
  const closeTrade = () => setTrading(false);

  // Leave build mode and the trade bar whenever the turn or phase changes underneath them.
  useEffect(() => {
    setMode(null);
    setTrading(false);
  }, [g.turn, phase.type]);

  const can = (cost: Partial<ResourceCounts>) => myTurn && phase.type === 'main' && hasResources(hand, cost);
  let hintVertices: string[] = [];
  let hintEdges: string[] = [];
  let hintTiles: string[] = [];
  if (myTurn) {
    if (phase.type === 'setup') {
      hintVertices = g.hints.settlements;
      hintEdges = g.hints.roads;
    } else if (phase.type === 'roadBuilding') {
      hintEdges = g.hints.roads;
    } else if (phase.type === 'robber') {
      hintTiles = g.hints.robberTiles;
    } else if (phase.type === 'main') {
      if (mode === 'road') hintEdges = g.hints.roads;
      if (mode === 'settlement') hintVertices = g.hints.settlements;
      if (mode === 'city') hintVertices = g.hints.cities;
    }
  }

  const onVertex = (v: string) => {
    if (phase.type === 'setup' || mode === 'settlement') act({ type: 'placeSettlement', vertex: v });
    else if (mode === 'city') act({ type: 'placeCity', vertex: v });
  };

  const current = g.players[g.currentPlayer];
  let status: string;
  switch (phase.type) {
    case 'setup':
      status = myTurn ? (phase.step === 'settlement' ? 'Setze deine Siedlung' : 'Setze eine Straße an die Siedlung') : `${current.name} baut auf…`;
      break;
    case 'roll':
      status = myTurn ? 'Würfeln oder Ritter spielen' : `${current.name} würfelt…`;
      break;
    case 'discard':
      status = me !== null && phase.pending[me] !== undefined ? `Wirf ${phase.pending[me]} Karten ab` : 'Warten auf Abwurf…';
      break;
    case 'robber':
      status = myTurn ? 'Versetze den Räuber' : `${current.name} versetzt den Räuber…`;
      break;
    case 'steal':
      status = myTurn ? 'Wähle, von wem du stiehlst' : `${current.name} stiehlt…`;
      break;
    case 'roadBuilding':
      status = myTurn ? `Baue noch ${phase.remaining} Straße(n)` : `${current.name} baut Straßen…`;
      break;
    case 'main':
      status = myTurn ? (mode ? 'Wähle einen Bauplatz' : 'Bauen, handeln oder Zug beenden') : `${current.name} ist am Zug`;
      break;
    case 'ended':
      status = `${g.players[phase.winner].name} hat gewonnen!`;
      break;
  }

  // After a roll, the tiles with that number blink: in your colour where you earn, white elsewhere.
  const topo = useMemo(() => topology(g.map), [g.map]);
  const glow = useMemo(() => {
    const roll = g.lastRoll;
    if (!roll) return undefined;
    const sum = roll.dice[0] + roll.dice[1];
    const tiles = g.map.tiles
      .map((t) => ({ id: tileId(t.q, t.r), number: g.revealed[tileId(t.q, t.r)]?.number ?? t.number }))
      .filter((t) => t.number === sum && t.id !== g.robber)
      .map((t) => {
        const mine = me !== null && topo.tileVertices[t.id].some((v) => g.buildings[v]?.owner === me);
        return { id: t.id, mine, color: mine ? colors[me!] : '#ffffff' };
      });
    return { key: roll.count, tiles };
    // Only a new roll should restart the blink, not every update in between.
  }, [g.lastRoll?.count, topo]);

  // A road that clears the fog pays one card of what it found; float it up from the tile.
  const found = [...g.log.slice(-6)].reverse().find((e) => e.type === 'fogRevealed' && e.reward);
  const flash = found?.type === 'fogRevealed' && found.reward ? { tile: found.tile, text: `+1 ${RESOURCE_STYLE[found.reward].icon}`, color: colors[found.player] } : undefined;
  // Cards fly from the producing tiles to whoever gets them: your hand cards, or the others' panels.
  // Nothing flies for what had already happened when the page opened.
  const firstRoll = useRef(g.lastRoll?.count ?? 0);
  const firstFog = useRef(flash?.tile);
  const flights = useMemo(() => {
    const out: Flight[] = [];
    const target = (p: number, r: Resource) => (p === me ? `[data-res="${r}"]` : `[data-player="${p}"]`);
    const roll = g.lastRoll;
    if (roll && roll.count !== firstRoll.current) {
      let i = g.log.length - 1;
      while (i >= 0 && g.log[i].type !== 'diceRolled') i--;
      const produced = g.log.slice(i + 1).find((e) => e.type === 'produced');
      if (produced?.type === 'produced') {
        const sum = roll.dice[0] + roll.dice[1];
        for (const t of g.map.tiles) {
          const id = tileId(t.q, t.r);
          const shown = g.revealed[id] ?? t;
          const r = TERRAIN_RESOURCE[shown.terrain];
          if (!r || shown.number !== sum || id === g.robber) continue;
          for (const v of topo.tileVertices[id]) {
            const b = g.buildings[v];
            if (!b || !produced.gains[b.owner]?.[r]) continue;
            for (let k = 0; k < (b.type === 'city' ? 2 : 1); k++) out.push({ from: id, to: target(b.owner, r), resource: r, delay: 1000 + out.length * 210 });
          }
        }
      }
    }
    if (found?.type === 'fogRevealed' && found.reward && found.tile !== firstFog.current) {
      out.push({ from: found.tile, to: target(found.player, found.reward), resource: found.reward, delay: 300 });
    }
    return out;
  }, [g.lastRoll?.count, found?.type === 'fogRevealed' ? found.tile : null]);
  const flightBatch = `${g.lastRoll?.count ?? 0}/${flash?.tile ?? ''}`;

  // "+n" on a hand card for 5 s whenever cards arrive. Cards that fly in are counted when they land.
  const handKey = RESOURCES.map((r) => hand[r]).join(',');
  const prevHand = useRef<ResourceCounts | null>(null);
  const [gains, setGains] = useState<Partial<Record<Resource, Gain>>>({});
  useEffect(() => {
    const prev = prevHand.current;
    prevHand.current = { ...hand };
    if (!prev) return;
    const key = Date.now();
    for (const r of RESOURCES) {
      const up = hand[r] - prev[r];
      if (up <= 0) continue;
      const mine = flights.filter((f) => f.to === `[data-res="${r}"]`);
      const delay = mine.length ? Math.max(...mine.map((f) => f.delay)) + FLIGHT_MS : 0;
      setGains((old) => ({ ...old, [r]: { n: (old[r]?.n ?? 0) + up, key, delay, pending: delay ? up : 0 } }));
      const forThis = (fn: (g: Gain) => Gain | null) =>
        setGains((old) => {
          const cur = old[r];
          if (cur?.key !== key) return old;
          const next = { ...old };
          const v = fn(cur);
          if (v) next[r] = v;
          else delete next[r];
          return next;
        });
      if (delay) setTimeout(() => forThis((g) => ({ ...g, pending: 0 })), delay);
      setTimeout(() => forThis(() => null), delay + 5000);
    }
  }, [handKey]);

  // The end-turn button nudges again 5 s after anything happens; the key restarts its animation.
  const lastEvent = JSON.stringify(g.log[g.log.length - 1] ?? null);

  const playableDev = (type: DevCardType) =>
    type !== 'victoryPoint' &&
    myTurn &&
    !g.devPlayedThisTurn &&
    (phase.type === 'main' || phase.type === 'roll') &&
    g.devCards.some((c) => c.type === type && c.boughtOnTurn < g.turn);
  // Your development cards, one card per kind with a count, in the order of the rules.
  const DEV_ORDER: DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];
  const devTypes = DEV_ORDER.map((t) => [t, g.devCards.filter((c) => c.type === t).length] as const).filter(([, n]) => n > 0);

  return (
    <div className="game">
      <header className="topbar">
        <span className="brand">Kontinentalist</span>
        <span className={`status${myTurn ? ' mine' : ''}`}>{status}</span>
        <TurnClock room={room} />
        <button className="ghost-btn" onClick={() => conn.send({ t: 'leave' })}>Verlassen</button>
      </header>

      <main className="board-wrap">
        <Board
          map={g.map}
          revealed={g.revealed}
          buildings={g.buildings}
          roads={g.roads}
          colors={colors}
          robber={g.robber}
          hintVertices={hintVertices}
          hintEdges={hintEdges}
          hintTiles={hintTiles}
          onVertex={onVertex}
          onEdge={(e) => act({ type: 'placeRoad', edge: e })}
          onTile={(t) => phase.type === 'robber' && myTurn && act({ type: 'moveRobber', tile: t })}
          flash={flash}
          glow={glow}
        />
        {g.lastRoll && <Dice key={g.lastRoll.count} dice={g.lastRoll.dice} roll={g.lastRoll.count} />}
        <FlyingCards batch={flightBatch} flights={flights} />
      </main>

      <aside className="side">
        <div className="tabs">
          <button className={panel === 'log' ? 'on' : ''} onClick={() => setPanel('log')}>Protokoll</button>
          <button className={panel === 'chat' ? 'on' : ''} onClick={() => setPanel('chat')}>Chat {room.chat.length > 0 && `(${room.chat.length})`}</button>
        </div>
        {panel === 'log' ? <Log events={g.log} players={g.players} /> : <Chat room={room} conn={conn} />}
        <div className="bank">
          <span title="Bank">🏦</span>
          {RESOURCES.map((r) => (
            <span key={r} className="bank-card" style={{ background: RESOURCE_STYLE[r].fill }} title={RES_NAME[r]}>
              {RESOURCE_STYLE[r].icon}
              <small>{g.bank[r]}</small>
            </span>
          ))}
          <span className="bank-card dev" title="Entwicklungskarten"><DevCardBack /><small>{g.devDeckSize}</small></span>
          {g.fogPoolSize > 0 && <span className="bank-card fog" title="Nebelfelder">☁️<small>{g.fogPoolSize}</small></span>}
        </div>
        <div className="players">
          {g.players.map((p, i) => (
            <div key={p.id} className={`player${i === g.currentPlayer ? ' active' : ''}`} style={{ borderColor: p.color }}>
              <span className="avatar" style={{ background: p.color }} data-player={i}>{p.isBot ? '🤖' : '🙂'}</span>
              <span className="pn">{p.name}{i === me && ' (du)'}</span>
              {i === me && phase.type !== 'ended' && (p.victoryCards ?? 0) > 0 ? (
                // Colonist style "10 (11)": what the others see, then the real total with your hidden cards.
                <span className="stat" title={`Siegpunkte: ${p.points} sichtbar, ${g.myPoints} mit deinen Siegpunktkarten (nur du siehst das)`}>
                  🏆 {p.points} <b className="secret-vp">({g.myPoints})</b>
                </span>
              ) : (
                <span className="stat" title="Siegpunkte">🏆 {p.points}</span>
              )}
              <span className="stat" title="Rohstoffkarten">🂠 {p.resourceCount}</span>
              <span className="stat" title="Entwicklungskarten"><DevCardBack /> {p.devCardCount}</span>
              <span className={`stat${g.largestArmy === i ? ' bonus' : ''}`} title="Gespielte Ritter">⚔️ {p.knightsPlayed}</span>
              <span className={`stat${g.longestRoad === i ? ' bonus' : ''}`} title="Längste Straße">🛣️ {p.roadLength}</span>
            </div>
          ))}
        </div>
      </aside>

      <footer className="bottombar">
        <div className="hand">
          {RESOURCES.map((r) => (
            <ResourceCard
              key={r}
              r={r}
              n={hand[r] - (gains[r]?.pending ?? 0)}
              dim={hand[r] === 0}
              onClick={canTrade && hand[r] > 0 ? () => openTrade(r) : undefined}
              gain={gains[r]}
            />
          ))}
          {devTypes.length > 0 && <span className="hand-gap" />}
          {devTypes.map(([type, n]) => (
            <DevCardButton key={type} type={type} count={n} playable={playableDev(type)} onClick={() => setDialog('dev')} />
          ))}
        </div>
        <div className="actions">
          {myTurn && phase.type === 'roll' && (
            <button className="primary nudge-soon" onClick={() => act({ type: 'rollDice' })}>🎲 Würfeln</button>
          )}
          <button className={trading ? 'on' : ''} disabled={!canTrade} onClick={() => (trading ? closeTrade() : openTrade())} title="Handeln">🔄</button>
          <button className={mode === 'road' ? 'on' : ''} disabled={!can(COSTS.road) || g.hints.roads.length === 0} onClick={() => setMode(mode === 'road' ? null : 'road')} title="Straße (Holz + Lehm)">
            ▬<small>{me !== null ? g.players[me].roadsLeft : ''}</small>
          </button>
          <button className={mode === 'settlement' ? 'on' : ''} disabled={!can(COSTS.settlement) || g.hints.settlements.length === 0} onClick={() => setMode(mode === 'settlement' ? null : 'settlement')} title="Siedlung (Holz, Lehm, Wolle, Getreide)">
            🏠<small>{me !== null ? g.players[me].settlementsLeft : ''}</small>
          </button>
          <button className={mode === 'city' ? 'on' : ''} disabled={!can(COSTS.city) || g.hints.cities.length === 0} onClick={() => setMode(mode === 'city' ? null : 'city')} title="Stadt (2 Getreide, 3 Erz)">
            🏰<small>{me !== null ? g.players[me].citiesLeft : ''}</small>
          </button>
          <button disabled={!can(COSTS.devCard) || g.devDeckSize === 0} onClick={() => act({ type: 'buyDevCard' })} title="Entwicklungskarte kaufen (Wolle, Getreide, Erz)">
            🃏
          </button>
          <button
            key={lastEvent}
            className={`primary${myTurn && phase.type === 'main' && !mode && !trading && !g.tradeOffer ? ' nudge' : ''}`}
            disabled={!myTurn || phase.type !== 'main'}
            onClick={() => act({ type: 'endTurn' })}
            title="Zug beenden"
          >
            ⏭
          </button>
        </div>
      </footer>

      {me !== null && phase.type === 'discard' && phase.pending[me] !== undefined && (
        <DiscardDialog need={phase.pending[me]} hand={hand} onDone={(r) => act({ type: 'discard', resources: r })} />
      )}
      {myTurn && phase.type === 'steal' && (
        <Modal title="Von wem stehlen?">
          <div className="choices">
            {phase.candidates.map((p) => (
              <button key={p} style={{ borderColor: g.players[p].color }} onClick={() => act({ type: 'steal', victim: p })}>
                {g.players[p].name} ({g.players[p].resourceCount} Karten)
              </button>
            ))}
          </div>
        </Modal>
      )}
      {trading && canTrade && <TradeComposer g={g} give={give} setGive={setGive} want={want} setWant={setWant} act={act} close={closeTrade} />}
      {dialog === 'dev' && <DevDialog g={g} playable={playableDev} act={(a) => { act(a); setDialog(null); }} close={() => setDialog(null)} />}
      <TradePanel g={g} act={act} />
      {phase.type === 'ended' &&
        (showResult ? (
          <ResultDialog g={g} winner={phase.winner} onBoard={() => setShowResult(false)} onHome={() => conn.send({ t: 'leave' })} />
        ) : (
          <button className="primary result-btn" onClick={() => setShowResult(true)}>🏆 Ergebnis</button>
        ))}
    </div>
  );
}

/** End of the game: every player's points by source, hidden victory point cards now revealed. */
function ResultDialog({ g, winner, onBoard, onHome }: { g: GameView; winner: number; onBoard: () => void; onHome: () => void }) {
  const rows = g.players
    .map((p, i) => ({
      p,
      i,
      settlements: 5 - p.settlementsLeft - (4 - p.citiesLeft),
      cities: 4 - p.citiesLeft,
      cards: p.victoryCards ?? 0,
      army: g.largestArmy === i ? 2 : 0,
      road: g.longestRoad === i ? 2 : 0,
    }))
    .sort((a, b) => b.p.points - a.p.points || (a.i === winner ? -1 : 1));
  const cell = (n: number, title: string) => <td className={n > 0 ? 'got' : ''} title={title}>{n}</td>;
  return (
    <Modal title="Spiel vorbei">
      <p className="winner">🏆 {g.players[winner].name} gewinnt!</p>
      <p className="muted">{g.turn} Züge · Ziel: {g.victoryPoints} Punkte</p>
      <table className="result">
        <thead>
          <tr>
            <th />
            <th title="Siegpunkte">🏆</th>
            <th title="Siedlungen (je 1 Punkt)">🏠</th>
            <th title="Städte (je 2 Punkte)">🏰</th>
            <th title="Siegpunktkarten">⭐</th>
            <th title="Größte Rittermacht (2 Punkte)">⚔️</th>
            <th title="Längste Straße (2 Punkte)">🛣️</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.i} className={r.i === winner ? 'won' : ''}>
              <td className="who">
                <span className="avatar" style={{ background: r.p.color }}>{r.p.isBot ? '🤖' : '🙂'}</span>
                {r.p.name}
                {r.i === g.me && ' (du)'}
              </td>
              <td className="total">{r.p.points}</td>
              {cell(r.settlements, `${r.settlements} Siedlung(en)`)}
              {cell(r.cities * 2, `${r.cities} Stadt/Städte`)}
              {cell(r.cards, `${r.cards} Siegpunktkarte(n)`)}
              {cell(r.army, 'Größte Rittermacht')}
              {cell(r.road, 'Längste Straße')}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row-btns">
        <button onClick={onBoard}>🗺️ Brett ansehen</button>
        <button className="primary" onClick={onHome}>Zur Startseite</button>
      </div>
    </Modal>
  );
}

/** Seconds left for whoever the game is waiting on; red in the last ten. */
function TurnClock({ room }: { room: RoomView }) {
  const clock = room.clock;
  // `left` is measured when the server sent the view, so count down from when it arrived.
  const deadline = useMemo(() => (clock ? Date.now() + clock.left : null), [clock]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!clock || deadline === null) return null;
  const secs = Math.max(0, Math.ceil((deadline - now) / 1000));
  const total = room.settings.turnTimer;
  const mine = room.you !== null && clock.waiting.includes(room.you);
  const who = mine ? 'Du' : clock.waiting.map((p) => room.seats[p]?.name).join(', ');
  return (
    <span className={`turn-clock${secs <= 10 ? ' urgent' : ''}${mine ? ' mine' : ''}`} title={`Zeit für ${who}`}>
      <span className="turn-clock-bar" style={{ width: `${Math.min(100, (secs / total) * 100)}%` }} />
      <span className="turn-clock-text">⏱ {secs}s</span>
    </span>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}{onClose && <button className="close" onClick={onClose}>✕</button>}</h3>
        {children}
      </div>
    </div>
  );
}

function DiscardDialog({ need, hand, onDone }: { need: number; hand: ResourceCounts; onDone: (r: ResourceCounts) => void }) {
  const [pick, setPick] = useState(empty());
  const n = totalCards(pick);
  return (
    <Modal title={`Wirf ${need} Karten ab`}>
      <p className="muted">Deine Hand: {RESOURCES.map((r) => `${RESOURCE_STYLE[r].icon}${hand[r]}`).join('  ')}</p>
      <Picker value={pick} onChange={setPick} max={hand} />
      <button className="primary" disabled={n !== need} onClick={() => onDone(pick)}>Abwerfen ({n}/{need})</button>
    </Modal>
  );
}

function DevDialog({ g, playable, act, close }: { g: GameView; playable: (t: DevCardType) => boolean; act: (a: Action) => void; close: () => void }) {
  const [yop, setYop] = useState<Resource[]>([]);
  const [choosing, setChoosing] = useState<'yearOfPlenty' | 'monopoly' | null>(null);
  const counts = new Map<DevCardType, number>();
  for (const c of g.devCards) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  return (
    <Modal title="Entwicklungskarten" onClose={close}>
      {g.devCards.length === 0 && <p className="muted">Du hast keine Entwicklungskarten.</p>}
      {[...counts].map(([type, n]) => (
        <div key={type} className="dev-row">
          <div className="dev-big">
            <DevCardFace type={type} />
          </div>
          <div className="dev-info">
            <b>{DEV_NAME[type]} ×{n}</b>
            <div className="muted">{DEV_HELP[type]}</div>
            {type !== 'victoryPoint' && (
              <button
                disabled={!playable(type)}
                onClick={() => {
                  if (type === 'knight') act({ type: 'playKnight' });
                  else if (type === 'roadBuilding') act({ type: 'playRoadBuilding' });
                  else {
                    setYop([]);
                    setChoosing(type);
                  }
                }}
              >
                Spielen
              </button>
            )}
            {type === 'yearOfPlenty' && choosing === 'yearOfPlenty' && (
              <div className="choices row">
                {RESOURCES.map((r) => (
                  <button
                    key={r}
                    disabled={g.bank[r] === 0}
                    onClick={() => {
                      const next = [...yop, r];
                      if (next.length === 2) act({ type: 'playYearOfPlenty', resources: [next[0], next[1]] });
                      else setYop(next);
                    }}
                  >
                    {RESOURCE_STYLE[r].icon}
                  </button>
                ))}
                <span className="muted">{yop.length}/2 gewählt</span>
              </div>
            )}
            {type === 'monopoly' && choosing === 'monopoly' && (
              <div className="choices row">
                {RESOURCES.map((r) => (
                  <button key={r} onClick={() => act({ type: 'playMonopoly', resource: r })}>{RESOURCE_STYLE[r].icon}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <p className="muted">Pro Zug eine Karte, nicht im Zug des Kaufs.</p>
    </Modal>
  );
}

function Chat({ room, conn }: { room: RoomView; conn: Connection }) {
  const [text, setText] = useState('');
  return (
    <div className="chat">
      <div className="chat-lines">
        {room.chat.map((m, i) => (
          <div key={i}><b>{m.from}:</b> {m.text}</div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          conn.send({ t: 'chat', text });
          setText('');
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht…" maxLength={300} />
      </form>
    </div>
  );
}
