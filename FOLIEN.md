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

`titel`, `unter`, `text`, `bild`, `qr`/`logo`, `link`, `liste`, `badge`, `klasse`, `dauer` (Sekunden), `typ:"bestand"` + `dataUrl`.

## Übersicht

`uebersicht.html` zeigt Status-Klartext (z. B. `Mo–Fr 10:00–14:30 · jetzt nicht`, `bis 23.12.2026`, `abgelaufen`, `aus`). **Nur lesen** – Schalter für den TV setzt der Bot in den Dateien.
