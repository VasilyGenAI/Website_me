# Hexlands (Arbeitstitel)

Online-Brettspiel nach den klassischen Siedler-Regeln, mit eigenem Namen und eigenen Grafiken.
Ziel: im Browser auf Laptop und Handy spielbar, später auch als Telegram Mini App.

## Stand

- `packages/engine`: Regel-Engine in TypeScript, ohne Abhängigkeiten.
  - Zufälliges Standardbrett (19 Felder, 9 Häfen, 6 und 8 nie nebeneinander), Prüfung eigener Karten (`validateMap`)
  - Alle Grundregeln: Aufbau in Schlangenreihenfolge, Würfeln und Ertrag (inkl. Bank-Engpass), 7 mit Abwerfen, Räuber und Stehlen,
    Bauen, Entwicklungskarten (Ritter, Straßenbau, Erfindung, Monopol, Siegpunkt), Bank- und Hafenhandel, Handel zwischen Spielern,
    längste Handelsstraße (inkl. Unterbrechung), größte Rittermacht, Sieg bei 10 Punkten im eigenen Zug
  - Deterministisch: dieselbe Seed ergibt dasselbe Spiel (Replays, Fehlersuche)
  - Heuristischer Bot (`botAction`)

## Befehle

```bash
npm install
npm test               # Regel-Tests + 30 komplette Bot-Partien mit Konsistenzprüfungen
npm run typecheck
npm run simulate -- 300 4   # 300 Bot-Partien mit 4 Spielern
```

## Nächste Schritte

1. Spielserver (WebSockets, Räume, verdeckte Karten nur für den Besitzer sichtbar)
2. Web-Oberfläche (SVG-Brett, mobil-tauglich)
3. Accounts und Rollen (Admin, Pro, Basic), Karten-Editor für Pro
4. Grafiken, Telegram Mini App, Deployment
