import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { CAN_CREATE_MAPS, fogForestMap } from '@kontinentalist/engine';
import type { ClientMessage, MapDef, Role, RoomView, ServerMessage } from '@kontinentalist/engine';
import { Auth, AuthError } from './auth';
import { Room, RoomError, RoomRegistry } from './rooms';
import type { Listener } from './rooms';

const PORT = Number(process.env.PORT ?? 8787);
const WEB_DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../web/dist');
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

/** Role for players without a token. DEFAULT_ROLE=pro is handy locally to try the editor. */
const DEFAULT_ROLE: Role = (['admin', 'pro', 'basic'] as const).find((r) => r === process.env.DEFAULT_ROLE) ?? 'basic';

if (!process.env.SECRET) console.warn('SECRET is not set: Pro codes and logins only last until the server restarts.');
if (!process.env.ADMIN_KEY) console.warn('ADMIN_KEY is not set: the admin page is disabled.');
const auth = new Auth(
  process.env.SECRET ?? randomBytes(32).toString('hex'),
  process.env.ADMIN_KEY ?? null,
  join(process.env.DATA_DIR ?? resolve(fileURLToPath(new URL('.', import.meta.url)), '../data'), 'used-codes.json'),
);

const registry = new RoomRegistry();
setInterval(() => registry.sweep(60 * 60 * 1000), 5 * 60 * 1000).unref();

// Serves the built web client; unknown paths fall back to index.html for client-side routing.
const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/health') {
    res.end('ok');
    return;
  }
  let file = normalize(join(WEB_DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(WEB_DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(WEB_DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('Web client not built. Run: npm run build -w @kontinentalist/web');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 256 * 1024 });

wss.on('connection', (ws: WebSocket) => {
  let userId: string | null = null;
  let name = 'Gast';
  let role: Role = DEFAULT_ROLE;
  let room: Room | null = null;
  const send = (msg: ServerMessage) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
  const listener: Listener = { userId: '', send: (view: RoomView) => send({ t: 'room', room: view }) };

  const enter = (r: Room) => {
    room?.listeners.delete(listener);
    room = r;
    listener.userId = userId!;
    r.listeners.add(listener);
    r.touch();
  };

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return send({ t: 'error', message: 'Bad message' });
    }
    try {
      if (msg.t === 'hello') {
        userId = String(msg.userId).slice(0, 64);
        name = String(msg.name).trim().slice(0, 24) || 'Gast';
        role = auth.roleFromToken(userId, msg.token) ?? DEFAULT_ROLE;
        return send({ t: 'welcome', userId, role });
      }
      if (!userId) return send({ t: 'error', message: 'Say hello first' });

      switch (msg.t) {
        case 'redeemCode':
        case 'adminLogin': {
          const granted = msg.t === 'redeemCode' ? auth.redeem(String(msg.code), userId) : auth.adminLogin(String(msg.key), userId);
          // Never downgrade an admin who redeems a code.
          if (role !== 'admin') role = granted.role;
          return send({ t: 'token', token: granted.token, role: granted.role });
        }
        case 'adminCreateCodes':
        case 'adminStats':
          if (role !== 'admin') throw new AuthError('Admins only');
          if (msg.t === 'adminStats') return send({ t: 'stats', ...registry.stats(), connections: wss.clients.size });
          return send({ t: 'codes', codes: auth.createCodes(Number(msg.count), Number(msg.days)), days: Math.max(0, Math.floor(Number(msg.days))) });
      }

      switch (msg.t) {
        case 'createRoom': {
          let map: MapDef | null = null;
          if (msg.map) {
            if (!CAN_CREATE_MAPS[role]) throw new RoomError('Custom boards need a Pro account');
            map = msg.map;
          } else if (msg.preset === 'nebelwald') {
            map = fogForestMap();
          }
          const r = registry.create(userId, map);
          r.addHuman(userId, name);
          for (let i = 0; i < Math.min(msg.bots ?? 0, 3); i++) r.addBot(userId);
          if (msg.start) r.start(userId);
          return enter(r);
        }
        case 'joinRoom': {
          const r = registry.get(msg.roomId);
          if (!r) throw new RoomError('Room not found');
          if (r.status === 'lobby') r.addHuman(userId, name);
          return enter(r);
        }
        case 'leave':
          room?.listeners.delete(listener);
          room?.touch();
          room = null;
          return send({ t: 'left' });
      }

      if (!room) throw new RoomError('Join a room first');
      switch (msg.t) {
        case 'addBot':
          room.addBot(userId);
          break;
        case 'removeSeat':
          room.removeSeat(userId, msg.seat);
          break;
        case 'start':
          room.start(userId);
          break;
        case 'action':
          room.act(userId, msg.action);
          return;
        case 'chat':
          room.say(userId, String(msg.text));
          return;
      }
      room.touch();
    } catch (e) {
      if (e instanceof RoomError || e instanceof AuthError) return send({ t: 'error', message: e.message });
      console.error(e);
      send({ t: 'error', message: 'Server error' });
    }
  });

  ws.on('close', () => {
    room?.listeners.delete(listener);
    room?.touch();
  });
});

http.listen(PORT, () => console.log(`Kontinentalist server on http://localhost:${PORT}`));
