# TV-Monitoring / Lebenszeichen (kostenlos)

## Ehrliche Grenze

Eine **statische GitHub-Pages-Seite** kann **kein echtes TV-Lebenszeichen** senden:
der Player im Lokal-WLAN hat keinen Schreib-Endpunkt und keine Secrets im Frontend.
Wir wissen damit **nicht**, ob der 65"-Fernseher noch läuft – nur, ob die **veröffentlichte Website** und der **Bestands-Feed** erreichbar/frisch sind.

## Was gebaut ist (a)

1. `scripts/tv-check.sh` – prüft Live-Seite, `version.json`, `auswahl.json`, Frische von `inventory.json`.
2. `.github/workflows/tv-alarm.yml` – Cron ~alle 15 Min + manuell; bei Fehler Job rot + Issue **„TV-Alarm“** (Label `tv-alarm`).
3. Nur **`GITHUB_TOKEN`** (Issues schreiben). **Kein** Extra-Secret, **kein** SMTP.
4. `status/tv-check.json` – entsteht beim lokalen Trockenlauf; live erst nach Push des Workflows und optionalem Commit-Schritt (hier bewusst nicht alle 15 Min committen).

**Mail an `automat.dippacher@mail.grokbot.com`:** aus der Action ohne SMTP-Secret nicht möglich.  
**Vorschlag:** Bot-Routine beobachtet das Repo (Issue `tv-alarm` / fehlgeschlagene Action) und mailt/weiterleitet an Martin.

## Echtes TV-Lebenszeichen (b) – offene Optionen

| Option | Kosten | Aufwand |
|--------|--------|---------|
| **Fully Kiosk Browser** (Android) Remote Admin / Webhook bei Offline | App kostenpflichtig | TV-Gerät sendet Heartbeat |
| Kostenloser Ping-Dienst (UptimeRobot, Better Stack free, Healthchecks.io) | Free-Tier, **Konto** nötig | Überwacht nur die URL, nicht den TV-Prozess |
| Kleiner VPS/Cloudflare Worker Empfangs-URL + Player-`fetch` alle N Min | oft gratis-Tier, Konto | Braucht HTTPS-Endpunkt; CORS/Auth planen |
| Router/Smart-Plug „Gerät online?“ | Hardware | Kein Seiteninhalt |

Empfehlung für 1 Restaurant-TV: zuerst **URL-Monitoring + Issue/Bot-Mail**; echtes Geräte-Lebenszeichen erst wenn Fully Kiosk o. Ä. ohnehin für Kiosk genutzt wird.

## Lokal testen

```bash
# gegen Live-Pages:
bash scripts/tv-check.sh

# gegen lokalen Server (version.json muss existieren; inventory weiter remote):
TV_BASE_URL=http://127.0.0.1:8770 bash scripts/tv-check.sh
```

`act` kann den Workflow simulieren, braucht aber Docker + GH-Token für den Issue-Schritt; der Shell-Trockenlauf deckt die Checks ab.
