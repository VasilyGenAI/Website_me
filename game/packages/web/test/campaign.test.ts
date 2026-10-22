import { describe, expect, it } from 'vitest';
import { PRESET_MAPS } from '@kontinentalist/engine';
import { EUROPE_COUNTRIES, EUROPE_ROWS } from '../src/campaign/europeData';
import { countryOf, isConquered, recordWin } from '../src/campaign/progress';

describe('campaign', () => {
  it('every playable European country has a big and a small board and cells on the map', () => {
    const playable = EUROPE_COUNTRIES.filter((c) => c.playable);
    expect(playable).toHaveLength(19);
    for (const c of playable) {
      expect(PRESET_MAPS[c.id as keyof typeof PRESET_MAPS], c.id).toBeDefined();
      expect(PRESET_MAPS[`${c.id}-klein` as keyof typeof PRESET_MAPS], c.id).toBeDefined();
      expect(EUROPE_ROWS.some((r) => r.includes(c.code)), c.name).toBe(true);
    }
    expect(new Set(EUROPE_COUNTRIES.map((c) => c.code)).size).toBe(EUROPE_COUNTRIES.length);
  });

  it('a won country board conquers its country, in either size', () => {
    const big = PRESET_MAPS.deutschland();
    const small = PRESET_MAPS['deutschland-klein']();
    expect(countryOf(big.name, big.tiles.length)).toEqual({ id: 'deutschland', size: 'big' });
    expect(countryOf(small.name, small.tiles.length)).toEqual({ id: 'deutschland', size: 'small' });
    expect(countryOf('Klassisch', 19)).toBeNull();
    expect(recordWin('schweiz', 'small')).toBe(true);
    expect(recordWin('schweiz', 'big')).toBe(false);
  });

  it('isConquered looks at either size', () => {
    expect(isConquered({ won: { polen: { small: 1 } } }, 'polen')).toBe(true);
    expect(isConquered({ won: {} }, 'polen')).toBe(false);
  });
});
