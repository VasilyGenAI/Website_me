# Kontinentalist

Online-Brettspiel nach den klassischen Siedler-Regeln, mit eigenem Namen und eigenen Grafiken.
Ziel: im Browser auf Laptop und Handy spielbar, später auch als Telegram Mini App.

## Aufbau

| Paket | Inhalt |
|---|---|
| `packages/engine` | Regeln, Kartengenerator, Kartenprüfung, Bots, Spielersicht (verdeckte Infos), Protokoll-Typen |
| `packages/server` | Node-Server: Räume, WebSockets, Bots mit Verzögerung, liefert die Web-App aus |
| `packages/web` | React-Oberfläche: Startseite, Warteraum, Spiel, Karten-Editor (SVG-Brett, handytauglich) |

## Was schon geht

- Grundspiel für 2–4 Spieler mit allen Regeln (Aufbau, Würfeln, 7/Räuber, Bauen, Entwicklungskarten, Handel mit Bank, Häfen und Spielern, längste Straße, größte Rittermacht)
- Gegen 1–3 Bots spielen oder einen Raum für Freunde öffnen (Einladungslink)
- **Eigene Spielbretter (Pro):** Felder frei malen, Wasser und Seen, Inseln, Zahlen, Häfen an jeder Küste,
  **Nebelfelder** mit eigenem Nebel-Vorrat (wird beim Straßenbau aufgedeckt, Entdecker bekommt 1 Rohstoff)
- Vorlage „Nebelwald“: Waldring um einen See mit Holzhäfen, Wüsteninsel in der Mitte, Nebelring außen ohne Holz
- Rollen: Basic spielt, Pro baut eigene Karten, Admin erzeugt unter `/#/admin` Pro-Codes (einmal einlösbar, optional befristet)

## Umgebungsvariablen (Server)

| Variable | Zweck |
|---|---|
| `SECRET` | Signiert Pro-Codes und Freischaltungen. Muss fest bleiben. |
| `ADMIN_KEY` | Passwort für den Admin-Bereich `/#/admin` |
| `DEFAULT_ROLE` | Rolle ohne Freischaltung, Standard `basic` (lokal zum Ausprobieren `pro`) |
| `DATA_DIR` | Ordner für die Liste eingelöster Codes |
| `PORT` | Standard 8787 |

Online stellen: siehe [DEPLOY.md](DEPLOY.md).

## Befehle

```bash
npm install
npm run build          # Web-App bauen
npm start              # Server auf http://localhost:8787 (liefert die gebaute App aus)
npm run dev            # Entwicklung: Server + Vite mit Hot Reload auf http://localhost:5173
npm test               # Regel-, Karten- und Server-Tests inkl. kompletter Bot-Partien
npm run typecheck
npm run simulate -- 300 4   # 300 Bot-Partien mit 4 Spielern
```

## Grafiken austauschen

Alle Farben und Symbole stehen in `packages/web/src/theme.ts`. Für echte Grafiken je Feldtyp `image: '/art/terrain/forest.svg'`
eintragen und die Datei unter `packages/web/public/art/` ablegen.

## Nächste Schritte

1. Zug-Timer, Auto-Ablehnen von Handelsangeboten, Bot übernimmt bei Verbindungsabbruch
2. Datenbank für Accounts, Codes und Karten; Bezahlung für Pro
3. Grafiken (KI/Vektor), Telegram Mini App, Deployment
