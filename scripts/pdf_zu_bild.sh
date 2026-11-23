#!/usr/bin/env bash
# Plakat (PDF oder Bild) -> PNG für die Plakat-Folie (typ "plakat").
# Der TV rendert keine PDFs und keine AVIF; er zeigt nur das fertige PNG.
#
# Aufruf (im Repo-Wurzelordner):
#   scripts/pdf_zu_bild.sh assets/vereine/original/plakat.pdf [weitere.pdf|.png|.jpg|.avif ...]
# Ergebnis: assets/vereine/<name>.png – erste Seite bzw. das Bild, 1600 px hoch,
#           Seitenverhältnis bleibt (nie verzerrt), weißer statt transparenter Hintergrund.
# Optional: HOEHE=1800 ZIEL=assets/vereine scripts/pdf_zu_bild.sh ...
set -euo pipefail
HOEHE="${HOEHE:-1600}"
ZIEL="${ZIEL:-assets/vereine}"
[ $# -ge 1 ] || { sed -n '2,9p' "$0"; exit 1; }
mkdir -p "$ZIEL"
for quelle in "$@"; do
  [ -f "$quelle" ] || { echo "Nicht gefunden: $quelle"; exit 1; }
  name="$(basename "${quelle%.*}")"
  aus="$ZIEL/$name.png"
  case "${quelle,,}" in
    *.pdf)
      command -v pdftoppm >/dev/null || { echo "pdftoppm fehlt (Paket poppler-utils)"; exit 1; }
      pdftoppm -png -f 1 -l 1 -singlefile -scale-to-x -1 -scale-to-y "$HOEHE" "$quelle" "$ZIEL/$name" ;;
    *.png|*.jpg|*.jpeg|*.webp|*.avif|*.heic)
      python3 - "$quelle" "$aus" "$HOEHE" <<'PY'
import sys
from PIL import Image, ImageOps
q, z, h = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = ImageOps.exif_transpose(Image.open(q))
if im.mode in ('RGBA', 'LA', 'P'):
    im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[-1]); im = bg
else:
    im = im.convert('RGB')
if im.height != h:   # auf Zielhöhe skalieren, Breite proportional
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
im.save(z, optimize=True)
PY
      ;;
    *) echo "Unbekanntes Format: $quelle (erlaubt: pdf, png, jpg, webp, avif)"; exit 1 ;;
  esac
  if command -v optipng >/dev/null; then optipng -quiet -o2 "$aus" || true; fi
  groesse=$(python3 -c "from PIL import Image;import sys;i=Image.open(sys.argv[1]);print('%dx%d'%i.size)" "$aus")
  echo "OK  $quelle  ->  $aus  ($groesse, $(du -k "$aus" | cut -f1) KB)"
done
echo "Jetzt in folien/<id>.json bei \"bilder\" eintragen, z. B. [\"$aus\"]"
