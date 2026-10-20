import { describe, expect, it } from 'vitest';
import { botAction, fogForestMap } from '@hexlands/engine';
import { RoomError, RoomRegistry } from '../src/rooms';

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
    expect(view.game!.fogPoolSize).toBe(18);
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
});
