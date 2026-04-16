# Schob Digital Landing Page

Statische Website mit drei Seiten:

- `index.html` fur die Startseite
- `impressum.html` fur das Impressum
- `datenschutz.html` fur die Datenschutzerklarung

## Lokal ansehen

Zum schnellen Testen reicht ein einfacher lokaler Server, zum Beispiel:

```bash
python3 -m http.server 4173
```

Danach ist die Website unter `http://localhost:4173` erreichbar.

## GitHub Pages

Die Website ist fur GitHub Pages vorbereitet, weil sie komplett statisch ist und direkt aus dem Repository-Root ausgeliefert werden kann.

Typischer Ablauf:

1. Repository auf GitHub anlegen oder verbinden.
2. Dateien in den Default-Branch pushen.
3. In GitHub unter `Settings -> Pages` als Quelle `Deploy from a branch` wahlen.
4. Branch `main` und Ordner `/ (root)` auswahlen.

Danach werden `index.html`, `impressum.html` und `datenschutz.html` direkt veroffentlicht.
