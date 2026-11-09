# Mittagstisch aus Google-Tabelle

## Für Martin – Tabelle anlegen und veröffentlichen

1. In Google Drive: **Tabelle** neu → z. B. „Mittagstisch Dippacher“.
2. Zeile 1 (Kopf): `Datum` | `Gericht` | `Preis` | `Hinweis`
3. Datum als `YYYY-MM-DD` (z. B. `2026-11-10`) oder `TT.MM.JJJJ`.
4. Nur echte Gerichte/Preise eintragen (keine Platzhalter).
5. **Datei → Teilen → Im Web veröffentlichen**  
   - Link: gesamte Tabelle oder das Blatt  
   - Format: **CSV**  
   - „Veröffentlichen“ bestätigen  
6. Die CSV-URL kopieren (endet oft auf `output=csv`).
7. Dem Bot die URL geben **oder** in `folien/mittagstisch.json` setzen:

```json
"csvUrl": "https://docs.google.com/spreadsheets/d/e/…/pub?gid=0&single=true&output=csv"
```

8. `version.json` hochsetzen, nach Freigabe committen/pushen.

**Ohne `csvUrl`** (oder `null`) bleibt die bisherige Folie mit der festen `liste` unverändert.

## Technik

- Player lädt CSV, filtert Zeilen auf **heutiges Datum** (Europe/Berlin am Gerät).
- Spalten flexibel (Groß/Klein): Datum, Gericht, Preis, Hinweis.
- Bei Ladefehler: Fallback auf die feste `liste` in der Folien-JSON.
- Lokales Beispiel: `beispiele/mittagstisch-beispiel.csv` (nur Demo).
