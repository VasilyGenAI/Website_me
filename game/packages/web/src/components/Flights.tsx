import { useEffect, useRef } from 'react';
import type { Resource, TileId } from '@kontinentalist/engine';
import { RESOURCE_STYLE } from '../theme';

/** One card flying from a tile on the board to a hand card (yours) or a player's panel (others). */
export interface Flight {
  from: TileId;
  /** CSS selector of where it lands. */
  to: string;
  resource: Resource;
  /** ms after the batch starts */
  delay: number;
}

export const FLIGHT_MS = 650;

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
      const b = centerOf(document.querySelector(f.to));
      if (!a || !b) continue; // e.g. the side panel is hidden on a small phone
      const el = document.createElement('div');
      el.className = 'flying-card';
      el.style.background = RESOURCE_STYLE[f.resource].fill;
      el.textContent = RESOURCE_STYLE[f.resource].icon;
      root.appendChild(el);
      made.push(el);
      // Up out of the tile first, then a quick arc to the target.
      const lift = { x: a.x, y: a.y - 34 };
      const mid = { x: (lift.x + b.x) / 2, y: Math.min(lift.y, b.y) - 50 };
      const at = (p: { x: number; y: number }, scale: number) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scale})`;
      const anim = el.animate(
        [
          { transform: at(a, 0.4), opacity: 0 },
          { transform: at(lift, 1.15), opacity: 1, offset: 0.22 },
          { transform: at(mid, 1), opacity: 1, offset: 0.6 },
          { transform: at(b, 0.6), opacity: 0.9 },
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
