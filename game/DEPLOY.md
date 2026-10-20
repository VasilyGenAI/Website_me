# Kontinentalist kostenlos online stellen (Render, Free-Plan)

Der Server läuft unverändert auf Render. Der Free-Plan reicht für eine Testphase mit einigen gleichzeitigen Spielen.

## Einmalig einrichten (ca. 10 Minuten)

1. Auf https://render.com mit dem GitHub-Account anmelden (kostenlos, keine Kreditkarte nötig).
2. **New → Blueprint** wählen und das Repository `Website_me` verbinden.
3. Branch auswählen, auf dem das Spiel liegt. Render liest `render.yaml` im Repo-Root.
4. Render fragt nach **ADMIN_KEY**: ein langes, geheimes Passwort ausdenken und eintragen.
   Damit meldest du dich unter `https://<deine-adresse>.onrender.com/#/admin` als Admin an und erzeugst Pro-Codes.
5. **Apply** klicken. Nach dem ersten Build (2–4 Minuten) ist das Spiel unter `https://kontinentalist.onrender.com`
   (oder ähnlich) erreichbar, auf Laptop und Handy.

`SECRET` erzeugt Render automatisch. Nicht ändern, sonst werden alle Pro-Freischaltungen ungültig.

## Was man beim Free-Plan wissen muss

- **Einschlafen:** Nach 15 Minuten ohne Verbindung schläft der Server. Der nächste Besucher wartet bis zu einer Minute.
  Während gespielt wird, bleibt er wach.
- **Kein dauerhafter Speicher:** Laufende Räume gehen bei Neustart oder neuem Deployment verloren. Die Liste eingelöster
  Codes ebenfalls, d. h. ein Code könnte nach einem Neustart ein zweites Mal eingelöst werden. Pro-Freischaltungen selbst
  bleiben gültig (sie liegen signiert im Browser des Spielers). Eine Datenbank behebt das später.
- **Eigene Karten** speichert der Editor vorerst im Browser des Spielers.

## Später

- Datenbank (z. B. Supabase oder Neon, beide mit Free-Plan) für Accounts, Codes und Karten
- Für Dauerbetrieb ohne Einschlafen: kleiner Server ab ca. 4–7 €/Monat (z. B. Hetzner) oder Render Starter
