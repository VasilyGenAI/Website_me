import { actingPlayers, applyAction, botAction, createGame } from '../packages/engine/src/index';
import type { GameState } from '../packages/engine/src/index';

/** Plays bot-vs-bot games and reports how they ended. Usage: npm run simulate -- [games] [players] */
export function playBotGame(seed: number, players = 4, maxActions = 20000): { state: GameState; actions: number } {
  let state = createGame({
    seed,
    players: Array.from({ length: players }, (_, i) => ({ id: `bot${i}`, name: `Bot ${i + 1}`, color: ['red', 'blue', 'white', 'orange'][i], isBot: true })),
  });
  let actions = 0;
  while (state.phase.type !== 'ended' && actions < maxActions) {
    let moved = false;
    for (const p of actingPlayers(state)) {
      const action = botAction(state, p);
      if (!action) continue;
      const res = applyAction(state, p, action);
      if (!res.ok) throw new Error(`seed ${seed}: bot ${p} tried ${JSON.stringify(action)} in ${state.phase.type}: ${res.error}`);
      state = res.state;
      actions++;
      moved = true;
      break;
    }
    if (!moved) throw new Error(`seed ${seed}: nobody can act in phase ${state.phase.type}`);
  }
  return { state, actions };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const games = Number(process.argv[2] ?? 200);
  const players = Number(process.argv[3] ?? 4);
  const wins = Array(players).fill(0);
  let turns = 0;
  let unfinished = 0;
  const t0 = Date.now();
  for (let seed = 1; seed <= games; seed++) {
    const { state } = playBotGame(seed, players);
    if (state.phase.type === 'ended') {
      wins[state.phase.winner]++;
      turns += state.turn;
    } else unfinished++;
  }
  const done = games - unfinished;
  console.log(`${games} games, ${players} players, ${((Date.now() - t0) / games).toFixed(1)} ms/game`);
  console.log(`finished ${done}, unfinished ${unfinished}, avg turns ${(turns / Math.max(done, 1)).toFixed(1)}`);
  console.log(`wins by seat: ${wins.join(' / ')}`);
}
