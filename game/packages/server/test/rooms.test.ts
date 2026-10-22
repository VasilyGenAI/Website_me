import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomError, RoomRegistry, botAction, cleanSettings, fogForestMap } from '@kontinentalist/engine';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('rooms', () => {
  it('lets the host fill seats with bots and start', () => {
    const reg = new RoomRegistry();
    const room = reg.create('host', null);
    room.addHuman('host', 'Vasia');
    room.addBot('host');
    expect(() => room.addBot('guest')).toThrow(RoomError);
    room.start('host', 42);
    expect(room.status).toBe('playing');
    expect(() => room.addHuman('late', 'Late')).toThrow(/already started/);
  });

  it('only shows a player their own cards and never the RNG or fog pool', () => {
    const reg = new RoomRegistry();
    const room = reg.create('a', fogForestMap());
    room.addHuman('a', 'A');
    room.addHuman('b', 'B');
    room.start('a', 7);
    const view = room.view('b');
    expect(view.you).toBe(1);
    expect(view.game!.hand).not.toBeNull();
    const json = JSON.stringify(view);
    expect(json).not.toContain('"rng"');
    expect(json).not.toContain('"fogPool"');
    expect(json).not.toContain('"devDeck"');
    expect(json).not.toContain('"hidden"'); // fogged tiles go out as plain fog
    expect(view.game!.fogPoolSize).toBe(24);
    const spectator = room.view('stranger');
    expect(spectator.you).toBeNull();
    expect(spectator.game!.hand).toBeNull();
  });

  it('plays a whole game with one human (driven by the bot logic) and three server bots', async () => {
    const reg = new RoomRegistry();
    const room = reg.create('me', null);
    room.speed = 1000;
    room.addHuman('me', 'Me');
    for (let i = 0; i < 3; i++) room.addBot('me');
    room.start('me', 5);
    for (let i = 0; i < 20000 && room.status === 'playing'; i++) {
      const action = botAction(room.state!, 0);
      if (action) room.act('me', action);
      else await wait(1);
    }
    expect(room.status).toBe('ended');
    room.dispose();
  }, 60000);

  it('rejects invalid custom maps', () => {
    const reg = new RoomRegistry();
    expect(() => reg.create('x', { name: 'bad', tiles: [], ports: [] })).toThrow(/Invalid map/);
  });

  describe('turn clock', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('plays for a human whose time runs out: rolls, then ends the turn', () => {
      vi.useFakeTimers();
      const reg = new RoomRegistry();
      const room = reg.create('me', null, { turnTimer: 30, victoryPoints: 5 });
      room.speed = 1000;
      room.addHuman('me', 'Me');
      room.addBot('me');
      room.start('me', 11);
      expect(room.state!.victoryPoints).toBe(5);
      expect(room.view('me').clock).toEqual({ left: 30000, waiting: [0] });
      vi.advanceTimersByTime(29000);
      expect(Object.keys(room.state!.buildings)).toHaveLength(0);
      vi.advanceTimersByTime(2000);
      expect(Object.values(room.state!.buildings).filter((b) => b.owner === 0)).toHaveLength(1);
      for (let i = 0; i < 20000 && room.status === 'playing'; i++) vi.advanceTimersByTime(1000);
      expect(room.status).toBe('ended');
      const log = room.state!.log;
      expect(log.some((e) => e.type === 'diceRolled' && e.player === 0)).toBe(true);
      // After the clock ran out the human never got to build: only the two setup roads exist.
      expect(log.filter((e) => e.type === 'roadPlaced' && e.player === 0)).toHaveLength(2);
      room.dispose();
    });

    it('stays off when the timer is off', () => {
      vi.useFakeTimers();
      const reg = new RoomRegistry();
      const room = reg.create('me', null, { turnTimer: 0 });
      room.addHuman('me', 'Me');
      room.addBot('me');
      room.start('me', 3);
      vi.advanceTimersByTime(600000);
      expect(room.view('me').clock).toBeNull();
      expect(Object.keys(room.state!.buildings)).toHaveLength(0);
      room.dispose();
    });

    it('cleans settings sent by a client', () => {
      expect(cleanSettings({ turnTimer: 7, victoryPoints: 99, discardLimit: 1 })).toEqual({ turnTimer: 60, victoryPoints: 20, discardLimit: 5 });
    });
  });
});
