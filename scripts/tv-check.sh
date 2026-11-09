#!/usr/bin/env bash
# TV-Alarm Checks – lokal (Trockenlauf) oder in GitHub Actions
set -uo pipefail
BASE="${TV_BASE_URL:-https://martindippacher-cloud.github.io/dippacher-tv}"
INV_URL="${TV_INVENTORY_URL:-https://martindippacher-cloud.github.io/automat-bestand/inventory.json}"
MAX_INV_AGE_HOURS="${TV_INV_MAX_AGE_H:-36}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
NOTES_FILE=$(mktemp)

note() { echo "• $*"; echo "$*" >> "$NOTES_FILE"; }
bad()  { note "FAIL: $*"; FAIL=1; }

note "Base: $BASE"

CODE=$(curl -sS -o /tmp/tv-index.html -w '%{http_code}' --max-time 25 "$BASE/" || echo 000)
[[ "$CODE" == "200" ]] && note "Live-Seite HTTP 200" || bad "Live-Seite HTTP $CODE"
grep -qE 'Dippacher|schedule\.js|loadFolien' /tmp/tv-index.html 2>/dev/null || bad "Live-Seite Inhalt unerwartet"

CODE=$(curl -sS -o /tmp/tv-version.json -w '%{http_code}' --max-time 20 "$BASE/version.json" || echo 000)
if [[ "$CODE" == "200" ]]; then
  VER=$(python3 -c 'import json;print(json.load(open("/tmp/tv-version.json")).get("version","?"))')
  note "version.json OK ($VER)"
else
  bad "version.json HTTP $CODE"
fi

CODE=$(curl -sS -o /tmp/tv-auswahl.json -w '%{http_code}' --max-time 20 "$BASE/auswahl.json" || echo 000)
[[ "$CODE" == "200" ]] && note "auswahl.json OK" || bad "auswahl.json HTTP $CODE"

CODE=$(curl -sS -o /tmp/tv-inv.json -w '%{http_code}' --max-time 25 "$INV_URL" || echo 000)
if [[ "$CODE" != "200" ]]; then
  bad "inventory.json HTTP $CODE"
else
  if MAX_H="$MAX_INV_AGE_HOURS" python3 - <<'PY2'
import json, os, sys
from datetime import datetime, timezone
max_h = float(os.environ["MAX_H"])
d = json.load(open("/tmp/tv-inv.json"))
stamp = d.get("checkedAt") or d.get("updatedAt") or d.get("timestamp")
if not stamp:
    print("FAIL: inventory ohne Zeitstempel"); sys.exit(1)
dt = datetime.fromisoformat(str(stamp).replace("Z","+00:00"))
if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
age_h = (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds()/3600
print(f"inventory Alter: {age_h:.1f} h (Limit {max_h} h), Stand {stamp}")
sys.exit(1 if age_h > max_h else 0)
PY2
  then
    note "inventory.json frisch genug"
  else
    bad "inventory.json Frische-Check fehlgeschlagen (siehe Ausgabe oben)"
  fi
fi

mkdir -p status
NOTES_FILE="$NOTES_FILE" FAIL="$FAIL" BASE="$BASE" python3 - <<'PY3'
import json, os
from datetime import datetime, timezone, timedelta
from pathlib import Path
notes = Path(os.environ["NOTES_FILE"]).read_text().splitlines()
ok = os.environ.get("FAIL", "1") == "0"
now = datetime.now(timezone(timedelta(hours=1))).strftime("%Y-%m-%dT%H:%M:%S+01:00")
data = {"ok": ok, "checkedAt": now, "base": os.environ["BASE"], "notes": notes}
Path("status/tv-check.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print(Path("status/tv-check.json").read_text())
PY3
rm -f "$NOTES_FILE"

if [[ "$FAIL" -ne 0 ]]; then
  echo "TV-CHECK FAILED"
  exit 1
fi
echo "TV-CHECK OK"
