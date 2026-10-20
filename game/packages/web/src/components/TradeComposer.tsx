import { RESOURCES, totalCards } from '@kontinentalist/engine';
import type { Action, GameView, Resource, ResourceCounts } from '@kontinentalist/engine';
import { RES_NAME } from '../i18n';
import { RESOURCE_STYLE } from '../theme';
import { Avatar } from './TradePanel';

export const emptyCounts = (): ResourceCounts => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 });

function Card({ r, n, sub, onClick, disabled, title }: { r: Resource; n?: number; sub?: string; onClick?: () => void; disabled?: boolean; title: string }) {
  return (
    <button className="ccard" style={{ background: RESOURCE_STYLE[r].fill }} onClick={onClick} disabled={disabled} title={title}>
      <span className="ccard-icon">{RESOURCE_STYLE[r].icon}</span>
      {n !== undefined && <span className="ccard-n">{n}</span>}
      {sub && <span className="ccard-sub">{sub}</span>}
    </button>
  );
}

/**
 * What the bank would do with this offer, or why it would not. Each resource given must come in
 * whole multiples of its ratio (4:1, 3:1 at a 3:1 harbour, 2:1 at a matching harbour), and every
 * full set buys exactly one wanted card.
 */
export function bankPlan(give: ResourceCounts, want: ResourceCounts, ratios: Record<Resource, number>, bank: ResourceCounts):
  | { ok: true; steps: { give: Resource; get: Resource }[] }
  | { ok: false; reason: string } {
  const gives = RESOURCES.filter((r) => give[r] > 0);
  const wants = RESOURCES.filter((r) => want[r] > 0);
  if (gives.length === 0 || wants.length === 0) return { ok: false, reason: 'Wähle, was du gibst und was du bekommst.' };
  const both = RESOURCES.find((r) => give[r] && want[r]);
  if (both) return { ok: false, reason: `${RES_NAME[both]} kann nicht auf beiden Seiten stehen.` };
  const odd = gives.find((r) => give[r] % ratios[r] !== 0);
  if (odd) return { ok: false, reason: `Bank: ${RES_NAME[odd]} nur im Verhältnis ${ratios[odd]}:1 (${ratios[odd]}, ${ratios[odd] * 2}, …).` };
  const units = gives.flatMap((r) => Array<Resource>(give[r] / ratios[r]).fill(r));
  const gets = wants.flatMap((r) => Array<Resource>(want[r]).fill(r));
  if (units.length !== gets.length) {
    return { ok: false, reason: `Bank: Für deine Karten gibt es ${units.length} Rohstoff(e), du willst ${gets.length}.` };
  }
  const short = wants.find((r) => bank[r] < want[r]);
  if (short) return { ok: false, reason: `Die Bank hat nicht genug ${RES_NAME[short]}.` };
  return { ok: true, steps: units.map((g, i) => ({ give: g, get: gets[i] })) };
}

/** Trade bar: tap your cards to give, pick what you want, then trade with the bank or offer it to everyone. */
export function TradeComposer({ g, give, setGive, want, setWant, act, close }: {
  g: GameView;
  give: ResourceCounts;
  setGive: (v: ResourceCounts) => void;
  want: ResourceCounts;
  setWant: (v: ResourceCounts) => void;
  act: (a: Action) => void;
  close: () => void;
}) {
  const hand = g.hand!;
  const ratios = g.tradeRatios!;
  const me = g.players[g.me!];
  const plan = bankPlan(give, want, ratios, g.bank);
  const both = RESOURCES.some((r) => give[r] && want[r]);
  const peopleOk = totalCards(give) > 0 && totalCards(want) > 0 && !both && !g.tradeOffer;

  const add = (side: 'give' | 'want', r: Resource, d: number) => {
    if (side === 'give') setGive({ ...give, [r]: Math.max(0, Math.min(hand[r], give[r] + d)) });
    else setWant({ ...want, [r]: Math.max(0, want[r] + d) });
  };

  return (
    <div className="composer" role="dialog" aria-label="Handeln">
      <div className="cmp-main">
        <div className="cmp-row cmp-pick">
          {RESOURCES.map((r) => (
            <Card key={r} r={r} onClick={() => add('want', r, 1)} title={`${RES_NAME[r]} wünschen`} />
          ))}
          <span className="cmp-hint">Was möchtest du?</span>
        </div>
        <div className="cmp-row cmp-sides">
          <div className="cmp-side">
            <span className="cmp-who" title="Mitspieler oder Bank">👥</span>
            <span className="tp-arrow in" aria-hidden="true">▼</span>
            <span className="cmp-label">Du bekommst</span>
            {RESOURCES.filter((r) => want[r] > 0).map((r) => (
              <Card key={r} r={r} n={want[r]} onClick={() => add('want', r, -1)} title={`${RES_NAME[r]} entfernen`} />
            ))}
          </div>
          <div className="cmp-side">
            <Avatar p={me} size={34} />
            <span className="tp-arrow out" aria-hidden="true">▲</span>
            <span className="cmp-label">Du gibst</span>
            {RESOURCES.filter((r) => give[r] > 0).map((r) => (
              <Card key={r} r={r} n={give[r]} onClick={() => add('give', r, -1)} title={`${RES_NAME[r]} zurücknehmen`} />
            ))}
          </div>
        </div>
        <div className="cmp-row cmp-hand">
          {RESOURCES.map((r) => (
            <Card
              key={r}
              r={r}
              n={hand[r] - give[r]}
              sub={`${ratios[r]}:1`}
              disabled={hand[r] - give[r] <= 0}
              onClick={() => add('give', r, 1)}
              title={`${RES_NAME[r]} geben (Bank ${ratios[r]}:1)`}
            />
          ))}
          <span className="cmp-hint">Deine Karten · Bank-Verhältnis</span>
        </div>
        <p className={plan.ok ? 'cmp-status ok' : 'cmp-status'}>
          {plan.ok
            ? `Bank: ${plan.steps.length} Tausch(e) möglich.`
            : plan.reason}
        </p>
      </div>
      <div className="cmp-actions">
        <button
          className="cmp-btn"
          disabled={!plan.ok}
          title="Mit der Bank tauschen"
          onClick={() => {
            if (!plan.ok) return;
            for (const s of plan.steps) act({ type: 'bankTrade', give: s.give, get: s.get });
            close();
          }}
        >
          🏦<small>Bank</small>
        </button>
        <button
          className="cmp-btn"
          disabled={!peopleOk}
          title="Allen Mitspielern anbieten"
          onClick={() => {
            act({ type: 'offerTrade', give, want });
            close();
          }}
        >
          👥<small>Spieler</small>
        </button>
        <button className="cmp-btn close" title="Schließen" onClick={close}>
          ✕
        </button>
      </div>
    </div>
  );
}
