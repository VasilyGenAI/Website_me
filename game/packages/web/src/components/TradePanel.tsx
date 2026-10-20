import { RESOURCES, hasResources } from '@kontinentalist/engine';
import type { Action, GameView, PublicPlayer, ResourceCounts } from '@kontinentalist/engine';
import { RES_NAME } from '../i18n';
import { RESOURCE_STYLE } from '../theme';

export function Avatar({ p, size = 34 }: { p: PublicPlayer; size?: number }) {
  return (
    <span className="tp-avatar" style={{ background: p.color, width: size, height: size, fontSize: size * 0.5 }} title={p.name}>
      {p.isBot ? '🤖' : '🙂'}
    </span>
  );
}

/** Resource cards in a row, one card per resource type with its count, like a hand of cards. */
function Cards({ r }: { r: Partial<ResourceCounts> }) {
  return (
    <span className="tp-cards">
      {RESOURCES.filter((k) => (r[k] ?? 0) > 0).map((k) => (
        <span key={k} className="tcard" style={{ background: RESOURCE_STYLE[k].fill }} title={`${r[k]}× ${RES_NAME[k]}`}>
          <span className="tcard-icon">{RESOURCE_STYLE[k].icon}</span>
          <span className="tcard-n">{r[k]}</span>
        </span>
      ))}
    </span>
  );
}

function Row({ who, dir, label, cards }: { who: PublicPlayer; dir: 'in' | 'out'; label: string; cards: Partial<ResourceCounts> }) {
  return (
    <div className="tp-row">
      <Avatar p={who} />
      <span className={`tp-arrow ${dir}`} aria-hidden="true">{dir === 'in' ? '▼' : '▲'}</span>
      <span className="tp-label">{label}</span>
      <Cards r={cards} />
    </div>
  );
}

function missing(hand: ResourceCounts, need: Partial<ResourceCounts>): string {
  return RESOURCES.filter((k) => (need[k] ?? 0) > hand[k])
    .map((k) => `${(need[k] ?? 0) - hand[k]}× ${RES_NAME[k]}`)
    .join(', ');
}

/** Open trade offer: who offers what to whom, with clear accept / decline. */
export function TradePanel({ g, act }: { g: GameView; act: (a: Action) => void }) {
  const o = g.tradeOffer;
  if (!o || g.me === null) return null;
  const me = g.players[g.me];
  const from = g.players[o.from];

  if (o.from === g.me) {
    const responses = Object.entries(o.responses).map(([p, r]) => ({ p: Number(p), r }));
    return (
      <div className="trade-panel" role="dialog" aria-label="Dein Tauschangebot">
        <div className="tp-head">Dein Angebot</div>
        <Row who={me} dir="out" label="Du gibst" cards={o.give} />
        <Row who={me} dir="in" label="Du bekommst" cards={o.want} />
        <div className="tp-answers">
          {responses.map(({ p, r }) => (
            <div key={p} className={`tp-answer ${r}`}>
              <Avatar p={g.players[p]} size={26} />
              <span className="tp-name">{g.players[p].name}</span>
              {r === 'pending' && <span className="tp-chip wait">überlegt…</span>}
              {r === 'declined' && <span className="tp-chip no">✕ lehnt ab</span>}
              {r === 'accepted' && (
                <button className="tp-btn yes small" onClick={() => act({ type: 'confirmTrade', with: p })}>✓ Mit {g.players[p].name} tauschen</button>
              )}
            </div>
          ))}
        </div>
        <div className="tp-actions">
          <button className="tp-btn no" onClick={() => act({ type: 'cancelTrade' })}>Angebot zurückziehen</button>
        </div>
      </div>
    );
  }

  if (o.responses[g.me] !== 'pending') return null;
  const hand = g.hand!;
  const canPay = hasResources(hand, o.want);
  return (
    <div className="trade-panel" role="dialog" aria-label={`Tauschangebot von ${from.name}`}>
      <div className="tp-head">
        <Avatar p={from} size={28} /> <b style={{ color: from.color === '#e8e8e8' ? '#555' : from.color }}>{from.name}</b> möchte mit dir tauschen
      </div>
      <Row who={from} dir="in" label="Du bekommst" cards={o.give} />
      <Row who={me} dir="out" label="Du gibst" cards={o.want} />
      {!canPay && <p className="tp-missing">Dir fehlt: {missing(hand, o.want)}</p>}
      <div className="tp-actions">
        <button className="tp-btn no" onClick={() => act({ type: 'respondTrade', accept: false })}>✕ Ablehnen</button>
        <button className="tp-btn yes" disabled={!canPay} onClick={() => act({ type: 'respondTrade', accept: true })}>✓ Annehmen</button>
      </div>
    </div>
  );
}
