import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { COSTS, RESOURCES, hasResources, totalCards } from '@kontinentalist/engine';
import type { Action, DevCardType, GameView, Resource, ResourceCounts, RoomView } from '@kontinentalist/engine';
import { Board } from '../components/Board';
import { Dice } from '../components/Dice';
import { TradeComposer, emptyCounts } from '../components/TradeComposer';
import { TradePanel } from '../components/TradePanel';
import { Log } from '../components/Log';
import { DEV_HELP, DEV_NAME, RES_NAME } from '../i18n';
import { RESOURCE_STYLE } from '../theme';
import type { Connection } from '../net';

type BuildMode = 'road' | 'settlement' | 'city' | null;
type Dialog = 'dev' | null;

const empty = (): ResourceCounts => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });

function ResourceCard({ r, n, onClick, dim }: { r: Resource; n: number; onClick?: () => void; dim?: boolean }) {
  return (
    <button className={`rcard${dim ? ' dim' : ''}`} style={{ background: RESOURCE_STYLE[r].fill }} onClick={onClick} disabled={!onClick} title={RES_NAME[r]}>
      <span className="ricon">{RESOURCE_STYLE[r].icon}</span>
      <span className="rcount">{n}</span>
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

  // Leave build mode whenever the situation changes underneath it.


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

  const playableDev = (type: DevCardType) =>
    myTurn && !g.devPlayedThisTurn && (phase.type === 'main' || phase.type === 'roll') && g.devCards.some((c) => c.type === type && c.boughtOnTurn < g.turn);

  return (
    <div className="game">
      <header className="topbar">
        <span className="brand">Kontinentalist</span>
        <span className={`status${myTurn ? ' mine' : ''}`}>{status}</span>
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
        />
        {g.lastRoll && <Dice key={g.lastRoll.count} dice={g.lastRoll.dice} roll={g.lastRoll.count} />}
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
          <span className="bank-card dev" title="Entwicklungskarten">🃏<small>{g.devDeckSize}</small></span>
          {g.fogPoolSize > 0 && <span className="bank-card fog" title="Nebelfelder">☁️<small>{g.fogPoolSize}</small></span>}
        </div>
        <div className="players">
          {g.players.map((p, i) => (
            <div key={p.id} className={`player${i === g.currentPlayer ? ' active' : ''}`} style={{ borderColor: p.color }}>
              <span className="avatar" style={{ background: p.color }}>{p.isBot ? '🤖' : '🙂'}</span>
              <span className="pn">{p.name}{i === me && ' (du)'}</span>
              <span className="stat" title="Siegpunkte">🏆 {i === me ? g.myPoints : p.points}</span>
              <span className="stat" title="Rohstoffkarten">🂠 {p.resourceCount}</span>
              <span className="stat" title="Entwicklungskarten">🃏 {p.devCardCount}</span>
              <span className={`stat${g.largestArmy === i ? ' bonus' : ''}`} title="Gespielte Ritter">⚔️ {p.knightsPlayed}</span>
              <span className={`stat${g.longestRoad === i ? ' bonus' : ''}`} title="Längste Straße">🛣️ {p.roadLength}</span>
            </div>
          ))}
        </div>
      </aside>

      <footer className="bottombar">
        <div className="hand">
          {RESOURCES.map((r) => (
            <ResourceCard key={r} r={r} n={hand[r]} dim={hand[r] === 0} onClick={canTrade && hand[r] > 0 ? () => openTrade(r) : undefined} />
          ))}
        </div>
        <div className="actions">
          {myTurn && phase.type === 'roll' && (
            <button className="primary" onClick={() => act({ type: 'rollDice' })}>🎲 Würfeln</button>
          )}
          <button className={trading ? 'on' : ''} disabled={!canTrade} onClick={() => (trading ? closeTrade() : openTrade())} title="Handeln">🔄</button>
          <button disabled={me === null} onClick={() => setDialog('dev')} title="Entwicklungskarten">
            🃏<small>{g.devCards.length}</small>
          </button>
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
            🛒
          </button>
          <button className="primary" disabled={!myTurn || phase.type !== 'main'} onClick={() => act({ type: 'endTurn' })} title="Zug beenden">
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
      {phase.type === 'ended' && (
        <Modal title="Spiel vorbei">
          <p className="winner">🏆 {g.players[phase.winner].name} gewinnt!</p>
          <ol className="scores">
            {g.players
              .map((p, i) => ({ p, i }))
              .sort((a, b) => b.p.points - a.p.points)
              .map(({ p, i }) => <li key={i}>{p.name}: {p.points} Punkte</li>)}
          </ol>
          <button className="primary" onClick={() => conn.send({ t: 'leave' })}>Zur Startseite</button>
        </Modal>
      )}
    </div>
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
          <div>
            <b>{DEV_NAME[type]}</b> ×{n}
            <div className="muted">{DEV_HELP[type]}</div>
          </div>
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
