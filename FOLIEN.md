# Folien pflegen (Dippacher TV)

## Struktur

| Datei | Zweck |
|-------|--------|
| `folien/<id>.json` | Inhalt **einer** Folie (Titel, Text, Bild, QR, Zeiten …) |
| `auswahl.json` | **Reihenfolge** der `id`s + optionale Overrides (`aktiv:false` …) |
| `schedule.js` | Zeitlogik (gemeinsam für TV + Übersicht) |
| `slides.js` | Lädt Auswahl + Folien-Dateien → `window.FOLIEN` |
| `index.html` | TV-Player |
| `uebersicht.html` | Nur lesende Übersicht mit Miniaturen |
| `version.json` | Versionsstempel – Player lädt nur bei Änderung neu |
| `einblendung.json` | Sofort-Einblendung / Takeover mit Ablauf |
| `termine.json` | Anstehende Termine für die Dashboard-Kachel |
| `dashboard.js` / `dashboard.css` | Dashboard-Folie (Infotafel, `typ: "dashboard"`) |

Live-TV und Übersicht lesen dieselben Dateien. **Keine Tokens** im Frontend. Änderungen: lokal bzw. über den Bot, dann Commit/Push nach Freigabe.

## Folie tauschen / ersetzen

1. Neue Datei anlegen, z. B. `folien/aktion-maerz.json` (Felder siehe unten).
2. In `auswahl.json` die alte `id` in `reihenfolge` durch die neue ersetzen **oder** an gewünschter Stelle einfügen.
3. Lokal prüfen: `python3 -m http.server` → `/?folie=N&alle` und `/uebersicht.html`.
4. Alte JSON-Datei kann gelöscht oder archiviert werden.

Zum kurz Abschalten ohne Löschen:

```json
"overrides": { "mittagstisch": { "aktiv": false } }
```

## Zeitsteuerung (Felder)

Alle optional, kombinierbar. Gerätelokalzeit (Europe/Berlin am Player).

| Feld | Beispiel | Bedeutung |
|------|----------|-----------|
| `aktiv` | `false` | dauerhaft aus |
| `zeit` | `{"von":"10:00","bis":"14:30"}` | Uhrzeitfenster |
| `tage` | `[1,2,3,4,5]` | Wochentage Mo=1 … So=7 (wöchentlich) |
| `datum` | `"2026-12-24"` | nur an diesem Kalendertag |
| `ab` | `"2026-12-01"` | ab diesem Tag (inkl.) |
| `bisDatum` | `"2026-12-23"` | bis zu diesem Tag (inkl.), Alias: `bisTag`, `ablauf` |
| `bisZeit` | `"22:00"` | nur zusammen mit `bisDatum`: am letzten Tag nur bis zu dieser Uhrzeit (z. B. Ende einer Veranstaltung) |
| `pausen` | `[{"von":"2026-12-21","bis":"2027-01-06","grund":"Betriebsurlaub"}]` | Pause(n), jeweils inkl. von/bis; davor und danach läuft die Folie normal |

Abwärtskompatibel: bisherige Felder `zeit`, `tage`, `datum`, `aktiv` gelten weiter.

**Pausen** eignen sich für wiederkehrende Folien, die nur zeitweise nicht passen. Beispiel: Die Food-Box-Folien
(`foodbox`, `bestand`, `kloesse`) pausieren im Betriebsurlaub 21.12.2026–06.01.2027, weil der Automat dann nicht befüllt wird.
Die Übersicht zeigt „Pause …“. Auch Laufband-Texte können so pausieren: statt eines Strings `{"text":"…","pausen":[…]}`.

### Beispiele

Nur mittags Mo–Fr:

```json
"tage": [1,2,3,4,5],
"zeit": { "von": "10:00", "bis": "14:30" }
```

Kampagne mit Ablauf:

```json
"ab": "2026-12-01",
"bisDatum": "2026-12-23"
```

Einzeltermin:

```json
"datum": "2026-11-06"
```

## Inhaltliche Felder (Kurz)

`titel`, `unter`, `text`, `bild`, `qr`/`logo`, `link`, `qrPos`, `liste`, `badge`, `klasse`, `dauer` (Sekunden), `typ` (`html`/`bestand`/`bild`/`video`/`dashboard`), `wiederholeNach` (Hauptfolie, siehe unten), bei Bild/Video `datei` + optional `fit`.

**QR-Position (`qrPos`):** Standard ist rechts neben dem Text. Mit `"qrPos": "text"` sitzt die QR-Karte (Code 15vw mit heller Ruhezone, Link daneben) in der Textspalte unter dem Fließtext, damit das Foto rechts frei bleibt. Gilt nur, wenn die Folie `qr` und kein `logo` hat. Beispiel: `folien/gutschein.json`.

**Text-Format:** Alle Texte werden escaped. Erlaubt sind nur `<br>` (Zeilenumbruch) und `&nbsp;` (geschütztes Leerzeichen). Anderes HTML erscheint als Text.

## Anzeigedauer

- `dauer` in der Folie (Sekunden) hat immer Vorrang.
- Ohne `dauer`: Dashboard 50 s; Bestand 25 s; Plakat 22 s (`mitText`: Wortregel, mind. 22 s); sonst nach Textmenge: 8 s + 0,6 s je Wort (Titel, Untertitel, Liste, Text), mindestens 15 s, höchstens 30 s. Video: Länge der Datei.
- Die Übersicht zeigt je Folie „… s fest“ oder „… s auto“.

## Robustheit

- Fehlt eine `folien/<id>.json` oder ist sie kaputt, wird nur diese Folie übersprungen (Übersicht: Hinweis „Übersprungen“). Nur ein Fehler in `auswahl.json` stoppt den Bildschirm.
- Bild-/Videofolie mit fehlender Datei wird übersprungen. Fehlt bei einer HTML-Folie das Hintergrundbild, der QR-Code oder das Logo, erscheint die Folie ohne dieses Element.
- Zu langer Titel oder zu viel Text: Schrift wird automatisch etwas verkleinert (Titel bis 3,6vw, Folie bis 80 %). Bestand wechselt bei vielen Artikeln von einer auf zwei Spalten.
- Einbrennschutz: Logoleiste mit Uhr und Rahmen verschieben sich alle 4 Minuten um wenige Pixel.

## Übersicht

`uebersicht.html` zeigt Status-Klartext (z. B. `Mo–Fr 10:00–14:30 · jetzt nicht`, `bis 23.12.2026`, `abgelaufen`, `aus`). **Nur lesen** – Schalter für den TV setzt der Bot in den Dateien.

## Bild- und Video-Folien

Ohne HTML-Inhalt – nur Mediendatei Vollbild.

### Bild (`typ: "bild"`)

```json
{
  "id": "aktion-foto",
  "typ": "bild",
  "titel": "Optionaler Titel",
  "unter": "Optional",
  "datei": "assets/mein-bild.jpg",
  "fit": "cover",
  "dauer": 12,
  "aktiv": true
}
```

- `fit`: `cover` (füllt den Screen, Default) oder `contain` (ganzes Bild sichtbar)
- Datei unter `assets/` ablegen

### Video (`typ: "video"`)

```json
{
  "id": "promo-clip",
  "typ": "video",
  "titel": "Optional",
  "datei": "assets/promo.mp4",
  "fit": "contain",
  "dauer": 30
}
```

- Ohne `dauer`: Länge aus der Videodatei (Ende → nächste Folie)
- Mit `dauer`: feste Sekunden (Video startet bei jedem Durchlauf neu)
- Immer `muted` + `autoplay` (Browser-Policy)

Beispiele im Repo: `folien/beispiel-bild.json`, `folien/beispiel-video.json` (beide `aktiv:false`).

## Vereinsplakate (`typ: "plakat"`)

Plakate von Vereinen (PDF **oder** Bild: PNG, JPG, WEBP, AVIF). Der TV rendert selbst **keine PDFs/AVIF** –
beim Einchecken wird daraus ein PNG oder JPG gemacht, die Folie zeigt nur dieses Bild (robust auf Fully Kiosk / Google TV, offline gecacht).

**Plakat hinzufügen (3 Schritte):**

1. Original nach `assets/vereine/original/` legen, sprechender Name ohne Leerzeichen, z. B. `sommerfest-2027.pdf`.
2. Umwandeln (im Repo-Wurzelordner):
   `scripts/pdf_zu_bild.sh assets/vereine/original/sommerfest-2027.pdf`
   → `assets/vereine/sommerfest-2027.png` oder `.jpg` (erste Seite, 1600 px hoch, Seitenverhältnis bleibt). Das Skript wählt das Format selbst:
   Foto-Plakate (viele Farben) als JPG Qualität 85 (klein, z. B. 0,3 statt 1,7 MB), Grafik-/Textplakate als PNG (scharfe Schrift). Erzwingen: `FORMAT=png` oder `FORMAT=jpg`.
   Den ausgegebenen Pfad genau so in `bilder` eintragen. Mehrere Dateien auf einmal gehen auch.
3. `folien/sommerfest-2027.json` anlegen und die id in `auswahl.json` → `reihenfolge` eintragen.

```json
{
  "id": "sommerfest-2027",
  "typ": "plakat",
  "layout": "mitText",
  "titel": "Sommerfest Musterverein",
  "bilder": ["assets/vereine/sommerfest-2027.png"],
  "kernpunkte": {
    "verein": "Musterverein",
    "titel": "Sommerfest",
    "datum": "Samstag, 12.06.2027",
    "uhrzeit": "Beginn 14 Uhr",
    "ort": "Gaststätte Dippacher",
    "punkte": ["Stichpunkt 1", "Stichpunkt 2"]
  },
  "qr": "assets/vereine/qr_musterverein.png",
  "link": "www.beispiel.de",
  "bisDatum": "2027-06-12",
  "bisZeit": "22:00"
}
```

| Feld | Bedeutung |
|------|-----------|
| `layout` | `"zwei"` = zwei Plakate nebeneinander · `"mittig"` = ein Plakat in der Mitte · `"mitText"` = Plakat links, Kernaussagen rechts |
| `bilder` | Bildpfade (PNG/JPG aus dem Skript) (bei `zwei` genau zwei, sonst eins). Fehlt bei `zwei` ein Bild, steht das andere mittig; fehlen alle, wird die Folie übersprungen |
| `kernpunkte` | nur bei `mitText`: `verein`, `titel`, `datum`, `uhrzeit`, `ort` (alles Text, wie auf dem Plakat) und `punkte` (2–4 Stichpunkte). Ohne `kernpunkte` wird `mitText` wie `mittig` gezeigt |
| `badge` | optionales Schild über dem Text, z. B. `"BEISPIEL"` |
| `qr`, `link` | optional bei `mitText`: kleiner QR mit Link unten rechts in der Textspalte |
| `bisDatum` + `bisZeit` | **damit das Plakat nach der Veranstaltung von selbst verschwindet** (z. B. Veranstaltungstag, 22:00). `ab` für einen späteren Start |

Hinweise:
- Angaben in `kernpunkte` **nur vom Plakat** übernehmen, nichts ergänzen. Im Feld `_quelle` notieren, woher sie stammen.
- `kernpunkte.datum` ist reiner Anzeigetext; die Zeitsteuerung läuft über `bisDatum`/`bisZeit` (nicht `datum`, das hieße „nur an diesem Tag“).
- QR für einen Link: `python3 -c "import segno; segno.make('https://…', error='m').save('assets/vereine/qr_name.png', scale=12, border=2, dark='#2A1810', light='#FFFCF5')"`, vorher prüfen, ob der Link erreichbar ist.
- Plakate werden nie verzerrt (`object-fit: contain`), sie stehen mit hellem Rahmen und leichtem Schatten auf Creme.
- Dauer automatisch: `zwei`/`mittig` 22 s, `mitText` nach Wortregel, mind. 22 s, max. 30 s. Ein festes `dauer` geht immer vor.
- Termin fürs Dashboard zusätzlich in `termine.json` eintragen.
- Der Service Worker cached die Bilder aller Folien aus `auswahl.json` (`bilder`, `bild`, `qr`, `logo`) beim Installieren mit.
- Beispiele (immer `aktiv:false`, Muster-Plakate mit „BEISPIEL“): `beispiel-plakat-zwei`, `beispiel-plakat-mittig`, `beispiel-plakat-text`.
  Neu erzeugen: `python3 scripts/beispiel_plakate.py && scripts/pdf_zu_bild.sh assets/vereine/original/beispiel-*.pdf`.

## Version / Neu laden

`version.json`:

```json
{ "version": "2026-11-09T20:19:12+01:00", "notiz": "kurz warum" }
```

Der Player prüft **jede Minute**. Nur wenn `version` sich ändert, wird neu geladen. Zusätzlich Fallback: spätestens nach **24 Stunden** einmal neu.  
Nach Inhaltsänderung lokal/per Bot **`version` hochsetzen** (Zeitstempel reicht).

## Sofort-Einblendung (Takeover)

`einblendung.json`:

```json
{
  "aktiv": true,
  "titel": "Heute ausgebucht",
  "text": "Bitte reservieren Sie telefonisch.",
  "bild": null,
  "bis": "2026-11-09T20:30:00+01:00",
  "wiederholung": null
}
```

- Overlay über der Rotation, bis `bis` (ISO-8601) erreicht ist oder `aktiv:false`
- `titel`/`text` nur Klartext (HTML wird escapet; Zeilenumbrüche `\n` → sichtbarer Umbruch)
- Optional `wiederholung: { "zeit": {...}, "tage": [...] }` wie bei Folien
- Übersicht zeigt den Status der Einblendung

## Offline-Betrieb

- Schriften liegen unter `assets/fonts/` (OFL, siehe dortige Lizenzdateien) – kein Google-CDN.
- `sw.js` cached Shell, Folien-JSON und Assets. Bei fehlendem Netz läuft die letzte Version weiter.
- Bestand-Folie: letzter erfolgreicher Abruf im `localStorage`; offline erscheint **„Stand von HH:MM“** statt Fehler.
- Nach Inhaltsänderung: `version.json` hochsetzen; Service-Worker-Cache-Name bei Breaking Changes erhöhen (`dippacher-tv-vN`).

## Monitoring
Siehe `MONITORING.md` und `.github/workflows/tv-alarm.yml`.


## Mittagstisch-Tabelle
Siehe `MITTAGSTISCH.md` und `beispiele/mittagstisch-beispiel.csv`.


## Laufband (Fußzeile)

`laufband.json` – standardmäßig **`aktiv: false`**.

```json
{
  "aktiv": true,
  "geschwindigkeit": 60,
  "texte": ["Text eins", "Text zwei"]
}
```

- Läuft über der Logo-Leiste; Folienfläche wird etwas verkürzt (`body.lb-on`), Inhalte werden nicht überdeckt.
- `geschwindigkeit`: Sekunden für einen Durchlauf (größer = langsamer). Schrift ~2,4vw für 65 Zoll.


## Dashboard (Hauptfolie, `folien/dashboard.json`)

Infotafel mit Kopfzeile (Logo, Datum, Uhr) und Kacheln in zwei Spalten. Die untere Logoleiste wird auf dieser Folie
ausgeblendet, weil Logo und Uhr schon in der Kopfzeile stehen. Die Food-Box kommt im Dashboard bewusst nicht vor
(die Food-Box-Folien laufen weiter in der normalen Rotation).

```json
{
  "id": "dashboard", "typ": "dashboard", "dauer": 50, "wiederholeNach": 3,
  "kacheln": [
    { "typ": "teaser",       "bereich": "links",  "folien": ["welcome-stadtwerke", "welcome"] },
    { "typ": "infos",        "bereich": "links",  "max": 2, "folien": ["weihnachten-vorbestellung", "gutschein", "reservieren"] },
    { "typ": "mittagstisch", "bereich": "links",  "folie": "mittagstisch", "ersetzt": "infos" },
    { "typ": "wetter",       "bereich": "rechts", "ort": "Poppendorf", "lat": 49.694, "lon": 10.965 },
    { "typ": "termine",      "bereich": "rechts", "quelle": "termine.json", "max": 4 },
    { "typ": "qr",           "bereich": "rechts", "klein": true, "folie": "reservieren" }
  ]
}
```

Aufteilung: links oben Foto-Teaser, links unten „Weitere Infos“ (mittags stattdessen der Mittagstisch),
rechts oben das Wetter, rechts darunter die Termine. Die QR-Kachel erscheint nur, wenn rechts noch Platz ist.

- **Reihenfolge** der Kacheln = Reihenfolge in der Liste (je Bereich). **Ausschalten:** `"aktiv": false` an der Kachel.
- `"klein": true` = kleine Kachel; mehrere kleine stehen nebeneinander am Ende der Spalte.
- `"ersetzt": "<typ>"`: Ist diese Kachel sichtbar, nimmt sie den Platz der genannten Kachel ein (Mittagstisch statt Weitere Infos).
- Die Kacheln holen ihre Inhalte aus den **vorhandenen Folien** (Titel, Unterzeile, Bild, QR). Wer eine Folie ändert, ändert damit auch die Kachel.
  - `teaser`: erste Folie aus `folien`, die heute laut Zeitsteuerung gilt und ein `bild` hat.
  - `infos`: bis zu `max` Folien, die heute gelten; Vorschaubild = `bild`, sonst der QR-Code der Folie.
  - `mittagstisch`: Liste aus `folien/mittagstisch.json` (auch `csvUrl`), nur solange die Mittagstisch-Folie laut Zeitsteuerung gilt. Sonst keine Kachel.
  - `wetter`: Open-Meteo (kostenlos, ohne Schlüssel), alle 30 min. Jetzt: Symbol, Temperatur, Beschreibung, gefühlte Temperatur,
    Wind (bei Niederschlag stattdessen die Menge), Höchst-/Tiefstwert heute. Dazu die nächsten 3 Tage mit Symbol, Max/Min und
    Regenwahrscheinlichkeit. Koordinaten = Gaststätte (Dorfstraße 23, Poppendorf).
- **Robust:** Fällt eine Quelle aus, fehlt nur diese Kachel, die übrigen rücken nach. Passt etwas nicht, werden unten Zeilen
  weggelassen (nie kleinere Schrift, nie abgeschnitten). Wetter offline: letzter Stand bis 12 h mit „Stand HH:MM Uhr“ im Titel,
  danach wird die Kachel ausgeblendet (die aktuelle Temperatur nur bis 3 h alt).

## Hauptfolie: `wiederholeNach`

Eine Folie mit `"wiederholeNach": N` kommt **zuerst** und danach **immer wieder nach je N anderen** (gerade aktiven) Folien.
Die übrigen Folien laufen weiter in der Reihenfolge von `auswahl.json`. Beispiel mit `3`:

`dashboard → welcome → gutschein → vorbestellung → dashboard → foodbox → bestand → kloesse → dashboard → …`

- Häufiger: kleinere Zahl (`2`). Seltener: größere Zahl. Feld entfernen = normale Folie (einmal pro Durchlauf).
- Die Übersicht (`uebersicht.html`) zeigt den aktuellen Ablauf, die Dauer eines Durchlaufs und den Anteil der Hauptfolie.

## Termine pflegen (`termine.json`)

```json
{
  "termine": [
    { "datum": "2026-12-10", "bisDatum": "2026-12-13", "titel": "Familienfeier – geschlossen" },
    { "datum": "2026-12-17", "titel": "Bestellschluss Weihnachtsessen", "zeit": "20 Uhr" }
  ]
}
```

- `datum` (Pflicht, `JJJJ-MM-TT`), `titel` (Pflicht), `bisDatum` (optional, letzter Tag inklusive), `zeit` (optional, freier Text, z. B. `"15–18 Uhr"`).
- `quelle` ist nur eine Notiz für uns (woher der Termin stammt) und wird nicht angezeigt.
- Reihenfolge in der Datei ist egal: Der TV sortiert nach Datum und zeigt die nächsten `max` (Standard 4) Termine.
- **Vergangene Termine verschwinden automatisch** (nach `bisDatum` bzw. `datum`). Laufende mehrtägige Termine stehen als „bis Mi. 6.1.“.
- Heute/morgen erscheinen als „Heute“ bzw. „Morgen“. Nur echte, bestätigte Termine eintragen.

## Saisonfolien Winter 2026/27 (Ablauf ohne Überschneidung)

| Folie | sichtbar | Quelle |
|---|---|---|
| `weihnachten-vorbestellung` | bis 17.12.2026 (Bestellschluss) | dippacher.de/weihnachten.html |
| `gutschein` (Weihnachtsgeschenk) | bis 23.12.2026 (Gutscheinverkauf) | dippacher.de/aktuelles.html |
| `oeffnung-dezember` | bis 23.12.2026 (Abholung) | dippacher.de/oeffnungszeiten.html |
| `silvester` | 24.–31.12.2026 | Betriebsurlaub 21.12.2026–06.01.2027 (oeffnungszeiten.html, aktuelles.html) |
| `neujahr-urlaub` | 01.–06.01.2027 | wie oben, wieder da ab Do. 07.01.2027 |
| `neujahr-wieder-da` | 07.–17.01.2027 | reguläre Öffnungszeiten von dippacher.de/oeffnungszeiten.html |
| `foodbox`, `bestand`, `kloesse` | Pause 21.12.2026–06.01.2027 | Martin: Automat im Betriebsurlaub nicht befüllt |

Reservieren-QR (`assets/qr_reservierung_resmio.png`) zeigt direkt auf Resmio:
`https://app.resmio.com/gaststatte-dippacher/widget?fullscreen=true` (Link von dippacher.de/online-reservierung.html).
