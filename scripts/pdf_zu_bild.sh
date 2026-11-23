#!/usr/bin/env bash
# Plakat (PDF oder Bild) -> PNG für die Plakat-Folie (typ "plakat").
# Der TV rendert keine PDFs und keine AVIF; er zeigt nur das fertige PNG.
#
# Aufruf (im Repo-Wurzelordner):
#   scripts/pdf_zu_bild.sh assets/vereine/original/plakat.pdf [weitere.pdf|.png|.jpg|.avif ...]
# Ergebnis: assets/vereine/<name>.png oder .jpg – erste Seite bzw. das Bild, 1600 px hoch,
#           Seitenverhältnis bleibt (nie verzerrt), weißer statt transparenter Hintergrund.
#           Format automatisch: Foto-Plakat (viele Farben) -> JPG Qualität 85, Grafik/Text -> PNG.
# Optional: FORMAT=png|jpg HOEHE=1800 ZIEL=assets/vereine scripts/pdf_zu_bild.sh ...
set -euo pipefail
HOEHE="${HOEHE:-1600}"
ZIEL="${ZIEL:-assets/vereine}"
FORMAT="${FORMAT:-auto}"
[ $# -ge 1 ] || { sed -n '2,10p' "$0"; exit 1; }
mkdir -p "$ZIEL"
for quelle in "$@"; do
  [ -f "$quelle" ] || { echo "Nicht gefunden: $quelle"; exit 1; }
  name="$(basename "${quelle%.*}")"
  tmp="$(mktemp -d)"
  case "${quelle,,}" in
    *.pdf)
      command -v pdftoppm >/dev/null || { echo "pdftoppm fehlt (Paket poppler-utils)"; exit 1; }
      pdftoppm -png -f 1 -l 1 -singlefile -scale-to-x -1 -scale-to-y "$HOEHE" "$quelle" "$tmp/seite"
      eingabe="$tmp/seite.png" ;;
    *.png|*.jpg|*.jpeg|*.webp|*.avif|*.heic) eingabe="$quelle" ;;
    *) echo "Unbekanntes Format: $quelle (erlaubt: pdf, png, jpg, webp, avif)"; exit 1 ;;
  esac
  aus=$(python3 - "$eingabe" "$ZIEL/$name" "$HOEHE" "$FORMAT" <<'PY'
import sys, os
from PIL import Image, ImageOps
q, basis, h, fmt = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
im = ImageOps.exif_transpose(Image.open(q))
if im.mode in ('RGBA', 'LA', 'P'):
    im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[-1]); im = bg
else:
    im = im.convert('RGB')
if im.height != h:   # auf Zielhöhe skalieren, Breite proportional
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
if fmt == 'auto':
    # Foto erkennen: viele verschiedene Farben in einer verkleinerten Kopie
    farben = im.resize((300, round(300 * im.height / im.width))).getcolors(1 << 24) or []
    fmt = 'jpg' if len(farben) > 12000 else 'png'
for alt in ('.png', '.jpg'):   # altes Ergebnis im anderen Format entfernen
    if os.path.exists(basis + alt) and alt[1:] != fmt: os.remove(basis + alt)
if fmt == 'jpg':
    im.save(basis + '.jpg', quality=85, optimize=True, progressive=True, subsampling='4:2:0')
else:
    im.save(basis + '.png', optimize=True)
print(basis + '.' + fmt)
PY
)
  rm -rf "$tmp"
  case "$aus" in *.png) command -v optipng >/dev/null && { optipng -quiet -o2 "$aus" || true; } ;; esac
  groesse=$(python3 -c "from PIL import Image;import sys;i=Image.open(sys.argv[1]);print('%dx%d'%i.size)" "$aus")
  echo "OK  $quelle  ->  $aus  ($groesse, $(du -k "$aus" | cut -f1) KB)"
done
echo "Jetzt in folien/<id>.json bei \"bilder\" eintragen, z. B. [\"$aus\"]"
