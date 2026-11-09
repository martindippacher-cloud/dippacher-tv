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

Abwärtskompatibel: bisherige Felder `zeit`, `tage`, `datum`, `aktiv` gelten weiter.

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

`titel`, `unter`, `text`, `bild`, `qr`/`logo`, `link`, `liste`, `badge`, `klasse`, `dauer` (Sekunden), `typ` (`html`/`bestand`/`bild`/`video`), bei Bild/Video `datei` + optional `fit`.

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

