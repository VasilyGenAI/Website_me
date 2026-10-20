import { describe, expect, it } from 'vitest';
import { PRESET_MAPS } from '@kontinentalist/engine';
import { getMap, recordGame, saveMap, setPublished, setShared, stage, startingGameWith } from '../src/library';

const game = { at: 1, map: 'x', won: true, points: 10, players: 4, bots: 3 };

describe('board stages', () => {
  it('goes draft -> tested -> published -> shared, and any edit resets it', () => {
    const map = PRESET_MAPS.deutschland();
    const id = saveMap(map);
    expect(stage(getMap(id)!)).toBe('draft');

    setPublished(id, true); // not allowed before testing
    expect(stage(getMap(id)!)).toBe('draft');

    startingGameWith(map);
    recordGame(game, true);
    expect(stage(getMap(id)!)).toBe('tested');

    setShared(id, true); // must be published first
    expect(stage(getMap(id)!)).toBe('tested');
    setPublished(id, true);
    setShared(id, true);
    expect(stage(getMap(id)!)).toBe('shared');

    saveMap({ ...map, name: 'Umbenannt' }, id); // renaming keeps the stage
    expect(stage(getMap(id)!)).toBe('shared');

    const edited = { ...map, tiles: map.tiles.map((t, i) => (i === 0 ? { ...t, number: t.number === 5 ? 9 : 5 } : t)) };
    saveMap(edited, id);
    const after = getMap(id)!;
    expect(stage(after)).toBe('draft');
    expect(after.published).toBe(false);
    expect(after.shared).toBe(false);
  });

  it('a game with people does not count as the bot test', () => {
    const map = PRESET_MAPS.ukraine();
    const id = saveMap(map);
    startingGameWith(map);
    recordGame({ ...game, bots: 1 }, false);
    expect(stage(getMap(id)!)).toBe('draft');
    expect(getMap(id)!.plays).toBe(1);
  });
});
