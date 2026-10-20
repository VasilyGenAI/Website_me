import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { RESOURCES } from '@hexlands/engine';
import type { GameEvent, PublicPlayer, ResourceCounts } from '@hexlands/engine';
import { DEV_NAME, RES_NAME, TERRAIN_NAME } from '../i18n';
import { RESOURCE_STYLE } from '../theme';

function Cards({ r }: { r: Partial<ResourceCounts> }) {
  return (
    <span className="log-cards">
      {RESOURCES.flatMap((k) => Array.from({ length: r[k] ?? 0 }, (_, i) => <span key={`${k}${i}`} title={RES_NAME[k]}>{RESOURCE_STYLE[k].icon}</span>))}
    </span>
  );
}

function line(ev: GameEvent, P: (i: number | null) => ReactNode) {
  switch (ev.type) {
    case 'settlementPlaced':
      return <>{P(ev.player)} baut eine Siedlung</>;
    case 'roadPlaced':
      return <>{P(ev.player)} baut eine Straße</>;
    case 'cityPlaced':
      return <>{P(ev.player)} baut eine Stadt</>;
    case 'startingResources':
      return <>{P(ev.player)} erhält Startrohstoffe <Cards r={ev.resources} /></>;
    case 'diceRolled':
      return <>{P(ev.player)} würfelt <b>{ev.dice[0] + ev.dice[1]}</b> ({ev.dice[0]}+{ev.dice[1]})</>;
    case 'produced':
      return (
        <>
          {Object.entries(ev.gains).map(([p, g]) => (
            <span key={p} className="log-gain">{P(Number(p))} <Cards r={g} /></span>
          ))}
        </>
      );
    case 'productionBlocked':
      return <>Die Bank hat nicht genug {RES_NAME[ev.resource]}: niemand bekommt welches</>;
    case 'discarded':
      return <>{P(ev.player)} wirft ab <Cards r={ev.resources} /></>;
    case 'robberMoved':
      return <>{P(ev.player)} versetzt den Räuber</>;
    case 'stolen':
      return (
        <>
          {P(ev.thief)} stiehlt von {P(ev.victim)} {(ev.resource as string) === 'hidden' ? '🂠' : RESOURCE_STYLE[ev.resource].icon}
        </>
      );
    case 'fogRevealed':
      return (
        <>
          {P(ev.player)} lichtet den Nebel: {TERRAIN_NAME[ev.revealed.terrain]}
          {ev.revealed.number ? ` (${ev.revealed.number})` : ''}
          {ev.reward && <> und erhält {RESOURCE_STYLE[ev.reward].icon}</>}
        </>
      );
    case 'devCardBought':
      return <>{P(ev.player)} kauft eine Entwicklungskarte</>;
    case 'devCardPlayed':
      return <>{P(ev.player)} spielt {DEV_NAME[ev.card]}</>;
    case 'yearOfPlenty':
      return <>{P(ev.player)} nimmt <Cards r={{ [ev.resources[0]]: ev.resources[0] === ev.resources[1] ? 2 : 1, ...(ev.resources[0] === ev.resources[1] ? {} : { [ev.resources[1]]: 1 }) }} /></>;
    case 'monopoly':
      return <>{P(ev.player)} bekommt {ev.total}× {RES_NAME[ev.resource]} durch Monopol</>;
    case 'bankTrade':
      return <>{P(ev.player)} tauscht {ev.giveCount}× {RESOURCE_STYLE[ev.give].icon} gegen {RESOURCE_STYLE[ev.get].icon} mit der Bank</>;
    case 'tradeOffered':
      return <>{P(ev.offer.from)} bietet <Cards r={ev.offer.give} /> für <Cards r={ev.offer.want} /></>;
    case 'tradeCompleted':
      return <>{P(ev.from)} tauscht mit {P(ev.to)}: <Cards r={ev.give} /> ⇄ <Cards r={ev.want} /></>;
    case 'tradeCancelled':
      return <>{P(ev.from)} zieht das Angebot zurück</>;
    case 'longestRoad':
      return ev.player === null ? <>Niemand hat mehr die längste Handelsstraße</> : <>{P(ev.player)} hat die längste Handelsstraße 🛣️</>;
    case 'largestArmy':
      return <>{P(ev.player)} hat die größte Rittermacht ⚔️</>;
    case 'turnEnded':
      return null;
    case 'gameWon':
      return <>🏆 {P(ev.player)} gewinnt mit {ev.points} Punkten!</>;
  }
}

export function Log({ events, players }: { events: GameEvent[]; players: PublicPlayer[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [events.length]);
  const P = (i: number | null) =>
    i === null ? <b>?</b> : (
      <b className="pname" style={{ color: players[i].color === '#e8e8e8' ? '#777' : players[i].color }}>
        {players[i].name}
      </b>
    );
  return (
    <div className="log">
      {events.map((ev, i) => {
        const content = line(ev, P);
        return content ? <div key={i} className="log-line">{content}</div> : <hr key={i} />;
      })}
      <div ref={end} />
    </div>
  );
}
