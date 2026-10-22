import { AXIAL_NEIGHBORS, tileId } from './geometry';
import { randInt, shuffle } from './rng';
import type { MapTile, Terrain } from './types';

/*
 * Making boards fair. Patterns taken from well-balanced boards (the base game, "Lakes"):
 * - the strong numbers 6 and 8 never touch, and neither do 2 and 12 or two equal numbers;
 * - every resource gets about the same share of good numbers, so none is starved;
 * - no resource sits in a block of more than three tiles in a row;
 * - big boards use whole doubled sets of numbers; a part set keeps the likely numbers first.
 */

/** One full set of number tokens, as in the base game. */
const FULL_SET = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
/** Order in which a part set is filled: likely numbers first, 2 and 12 last. */
const PART_SET = [6, 8, 5, 9, 4, 10, 3, 11, 6, 8, 5, 9, 4, 10, 3, 11, 2, 12];

export const hasNumber = (t: Terrain) => t !== 'desert' && t !== 'fog';

/** Number tokens for `count` tiles: whole sets, then the most likely numbers of one more set. */
export function numberPool(count: number): number[] {
  const out: number[] = [];
  while (out.length + FULL_SET.length <= count) out.push(...FULL_SET);
  out.push(...PART_SET.slice(0, count - out.length));
  return out;
}

const pips = (n: number | null) => (n === null ? 0 : 6 - Math.abs(7 - n));

/** Two numbers that should not sit side by side. */
export function numbersClash(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  if (a === b) return true;
  const red = (n: number) => n === 6 || n === 8;
  if (red(a) && red(b)) return true;
  return (a === 2 && b === 12) || (a === 12 && b === 2);
}

function neighbours(tiles: MapTile[]): MapTile[][] {
  const byId = new Map(tiles.map((t) => [tileId(t.q, t.r), t]));
  return tiles.map((t) => AXIAL_NEIGHBORS.map(([dq, dr]) => byId.get(tileId(t.q + dq, t.r + dr))).filter((x): x is MapTile => !!x));
}

/** Tiles whose number clashes with a neighbour's. */
export function numberClashes(tiles: MapTile[]): MapTile[] {
  const nb = neighbours(tiles);
  return tiles.filter((t, i) => nb[i].some((n) => numbersClash(t.number, n.number)));
}

/**
 * Deals fresh numbers onto every tile that takes one: shuffled, then repaired so nothing clashes,
 * then nudged by swaps until every resource has about the same average of pips.
 */
export function dealNumbers(tiles: MapTile[], rng: { rng: number }): MapTile[] {
  const out = tiles.map((t) => ({ ...t, number: null as number | null }));
  const numbered = out.filter((t) => hasNumber(t.terrain));
  const nb = neighbours(out);
  const index = new Map(out.map((t, i) => [t, i]));
  const okAt = (t: MapTile, n: number | null, except?: MapTile) => nb[index.get(t)!].every((x) => x === except || !numbersClash(n, x.number));
  const clashing = () => numbered.filter((t) => !okAt(t, t.number)).length;

  // Shuffle, then repair: move each clashing number to a tile where it fits, taking that tile's
  // number back. A repair can get stuck in a corner, so start over with a fresh shuffle if needed.
  let best: (number | null)[] = [];
  let bestClashes = Infinity;
  for (let attempt = 0; attempt < 60 && bestClashes > 0; attempt++) {
    const pool = shuffle(rng, numberPool(numbered.length));
    numbered.forEach((t, i) => (t.number = pool[i]));
    for (let guard = 0; guard < numbered.length * 20; guard++) {
      const bad = numbered.filter((t) => !okAt(t, t.number));
      if (bad.length === 0) break;
      const from = bad[randInt(rng, bad.length)];
      const spots = numbered.filter((t) => t !== from && t.number !== from.number && okAt(t, from.number, from) && okAt(from, t.number, t));
      const pick = spots.length ? spots[randInt(rng, spots.length)] : numbered[randInt(rng, numbered.length)];
      [from.number, pick.number] = [pick.number, from.number];
    }
    const n = clashing();
    if (n < bestClashes) {
      bestClashes = n;
      best = numbered.map((t) => t.number);
    }
  }
  numbered.forEach((t, i) => (t.number = best[i]));

  // Balance: swaps that keep everything clash-free and bring each resource's average pips closer.
  const kinds = [...new Set(numbered.map((t) => t.terrain))];
  const mean = numbered.reduce((s, t) => s + pips(t.number), 0) / Math.max(1, numbered.length);
  const spread = () =>
    kinds.reduce((s, k) => {
      const ts = numbered.filter((t) => t.terrain === k);
      const avg = ts.reduce((a, t) => a + pips(t.number), 0) / ts.length;
      return s + ts.length * (avg - mean) ** 2;
    }, 0);
  let score = spread();
  for (let i = 0; i < numbered.length * 40 && score > 0.01; i++) {
    const a = numbered[randInt(rng, numbered.length)];
    const b = numbered[randInt(rng, numbered.length)];
    if (a === b || a.terrain === b.terrain || a.number === b.number) continue;
    if (!okAt(a, b.number, b) || !okAt(b, a.number, a)) continue;
    [a.number, b.number] = [b.number, a.number];
    const next = spread();
    if (next <= score) score = next;
    else [a.number, b.number] = [b.number, a.number];
  }
  return out;
}

const clustered = (t: Terrain) => t !== 'desert' && t !== 'fog';

/** Size of the block of equal terrain each tile belongs to. */
export function clusterSizes(tiles: MapTile[]): number[] {
  const nb = neighbours(tiles);
  const index = new Map(tiles.map((t, i) => [t, i]));
  const size = Array<number>(tiles.length).fill(0);
  const seen = new Set<number>();
  tiles.forEach((t, i) => {
    if (seen.has(i) || !clustered(t.terrain)) return;
    const group: number[] = [];
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      if (seen.has(j)) continue;
      seen.add(j);
      group.push(j);
      for (const n of nb[j]) if (n.terrain === t.terrain) stack.push(index.get(n)!);
    }
    for (const j of group) size[j] = group.length;
  });
  return size;
}

/**
 * Breaks up blocks of more than `max` equal tiles by swapping a tile of the block with the
 * nearest tile of another terrain, as long as neither block grows past `max`. Terrain counts
 * stay the same; tiles in `keep` (e.g. the desert) never move.
 */
export function breakClusters(tiles: MapTile[], max = 3, keep: (t: MapTile) => boolean = () => false): MapTile[] {
  const out = tiles.map((t) => ({ ...t }));
  const dist = (a: MapTile, b: MapTile) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  for (let guard = 0; guard < 500; guard++) {
    const size = clusterSizes(out);
    const worst = out.map((t, i) => ({ t, s: size[i] })).filter((x) => x.s > max && !keep(x.t));
    if (worst.length === 0) break;
    // Take the tile of the block with the most equal neighbours: moving it splits the block best.
    const sameAround = (t: MapTile) => out.filter((o) => o.terrain === t.terrain && dist(o, t) === 1).length;
    const from = worst.map((x) => x.t).sort((a, b) => sameAround(b) - sameAround(a))[0];
    const candidates = out
      .filter((o) => o.terrain !== from.terrain && clustered(o.terrain) && !keep(o))
      .sort((a, b) => dist(a, from) - dist(b, from));
    let done = false;
    for (const to of candidates) {
      [from.terrain, to.terrain] = [to.terrain, from.terrain];
      const after = clusterSizes(out);
      const bigger = out.some((t, i) => (t === from || t === to) && after[i] > max);
      if (!bigger) {
        done = true;
        break;
      }
      [from.terrain, to.terrain] = [to.terrain, from.terrain];
    }
    if (!done) break;
  }
  return out;
}
