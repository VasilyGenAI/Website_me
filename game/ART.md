# Grafiken für Kontinentalist

Die Feldbilder werden im Spiel automatisch sechseckig zugeschnitten. Gebraucht werden daher nur
**quadratische Bilder von oben**, in denen die Landschaft das ganze Bild füllt.

## Erste Runde (je 1 Bild)

| Datei | Inhalt (für [INHALT] im Prompt) |
|---|---|
| wald | dense pine forest |
| huegel | red clay quarry with a small wooden mine entrance |
| weide | green pasture with white sheep and a wooden fence |
| acker | golden wheat field with a small windmill |
| gebirge | grey rocky mountain with a snowy peak |
| wueste | sandy desert with dunes and a few cacti |
| nebel | thick white clouds seen from above |
| meer | calm blue sea water surface, seamless texture |

Format: quadratisch, mindestens 1024 × 1024 Pixel, PNG oder WebP. Transparenter Hintergrund ist nicht nötig.

## Prompt (für alle gleich, damit der Stil einheitlich bleibt)

> top-down view straight from above of [INHALT], stylized 3D diorama, miniature tilt-shift look,
> warm sunlight from the top left, soft shadows, vibrant saturated colors, the scene fills the whole
> square image, no text, no border, no frame

Tipp: alle Bilder in einer Sitzung im selben Tool erzeugen.

## Später

- 2–3 Varianten pro Feldtyp
- Rohstoffsymbole für die Karten: Holzstamm, Ziegel, Wollknäuel, Weizenähre, Erzbrocken

## Einbau

Bilder unter `packages/web/public/art/` ablegen und in `packages/web/src/theme.ts` beim Feldtyp
`image: '/art/terrain/wald.webp'` eintragen. Für die Offline-Testseite werden sie in die HTML-Datei eingebettet.
