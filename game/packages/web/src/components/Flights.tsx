import { useEffect, useRef } from 'react';
import type { Resource, TileId } from '@kontinentalist/engine';
import { RESOURCE_STYLE } from '../theme';

/**
 * One card flying out of a tile. Your cards land on your hand card (`to`); an opponent's card
 * instead drifts up and away (`away`, an angle pointing upwards) and fades, so nothing that is not
 * yours ever heads down towards your hand.
 */
export interface Flight {
  from: TileId;
  /** CSS selector of where it lands. */
  to?: string;
  /** Screen angle in degrees for a card leaving towards an opponent (-90 is straight up). */
  away?: number;
  /** Border colour: the receiving player's. */
  color: string;
  resource: Resource;
  /** ms after the batch starts */
  delay: number;
}

export const FLIGHT_MS = 1950;

const centerOf = (el: Element | null) => {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
};

/**
 * Plays a batch of flights whenever `batch` changes: small resource cards rise from their tile
 * and arc over to whoever receives them. Elements are created directly, since they only live
 * for the length of the animation.
 */
export function FlyingCards({ batch, flights }: { batch: string; flights: Flight[] }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = layer.current;
    if (!root || flights.length === 0) return;
    const made: HTMLElement[] = [];
    for (const f of flights) {
      const a = centerOf(document.querySelector(`[data-tile="${f.from}"]`));
      if (!a) continue;
      const rad = ((f.away ?? -90) * Math.PI) / 180;
      const b = f.to ? centerOf(document.querySelector(f.to)) : { x: a.x + Math.cos(rad) * 150, y: a.y + Math.sin(rad) * 150 };
      if (!b) continue;
      const el = document.createElement('div');
      el.className = 'flying-card';
      el.style.background = RESOURCE_STYLE[f.resource].fill;
      el.style.borderColor = f.color;
      el.textContent = RESOURCE_STYLE[f.resource].icon;
      root.appendChild(el);
      made.push(el);
      // Up out of the tile first, then an arc to the target (or straight on out, for opponents).
      const lift = { x: a.x, y: a.y - 34 };
      const mid = f.to ? { x: (lift.x + b.x) / 2, y: Math.min(lift.y, b.y) - 50 } : { x: (lift.x + b.x) / 2, y: (lift.y + b.y) / 2 };
      const at = (p: { x: number; y: number }, scale: number) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scale})`;
      const anim = el.animate(
        [
          { transform: at(a, 0.4), opacity: 0 },
          { transform: at(lift, 1.15), opacity: 1, offset: 0.22 },
          { transform: at(mid, 1), opacity: 1, offset: 0.6 },
          { transform: at(b, 0.6), opacity: f.to ? 0.9 : 0 },
        ],
        { duration: FLIGHT_MS, delay: f.delay, easing: 'ease-in-out', fill: 'both' },
      );
      anim.onfinish = () => el.remove();
    }
    return () => made.forEach((el) => el.remove());
    // A batch only plays once; `flights` is new on every render.
  }, [batch]);
  return <div ref={layer} className="flight-layer" aria-hidden="true" />;
}
