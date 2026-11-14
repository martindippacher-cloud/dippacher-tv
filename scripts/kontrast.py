#!/usr/bin/env python3
"""WCAG-2.x-Kontrast fuer das helle Farbschema berechnen (python3 scripts/kontrast.py)."""
def lum(h):
    h=h.lstrip('#'); r,g,b=(int(h[i:i+2],16)/255 for i in (0,2,4))
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    la,lb=sorted((lum(a),lum(b)),reverse=True); return (la+0.05)/(lb+0.05)
CREME='#F5EDDF'      # Grund (Mitte des Verlaufs)
CREME2='#EADDC6'     # Grund am Rand / Logoleiste
KARTE='#FFFCF5'      # QR-/Logo-Karte
# Bildunterschrift: 94 % Creme ueber dem Foto; schlechtester Fall = schwarzes Foto darunter
CAP='#'+''.join('%02X'%round(int(CREME[i:i+2],16)*0.94) for i in (1,3,5))
LAUF='#E3D3B6'       # Laufband
PAARE=[
 ('Titel h1',                    '#2A1810',CREME),
 ('Titel h1 (Rand/Verlauf)',     '#2A1810',CREME2),
 ('Fliesstext p, Listen',        '#3A2519',CREME),
 ('Fliesstext (Rand/Verlauf)',   '#3A2519',CREME2),
 ('Untertitel h2 (Rot, Text)',   '#7A1F23',CREME),
 ('Untertitel h2 (Rand/Verlauf)','#7A1F23',CREME2),
 ('Preise, Gold als Text',       '#5A3F0B',CREME),
 ('Preise (Rand/Verlauf)',       '#5A3F0B',CREME2),
 ('Nebeninfo (Stand, Kopfzeile)','#4F3A2C',CREME),
 ('Uhr in Logoleiste',           '#3A2519',CREME2),
 ('Bestand: genug (gruen)',      '#174A25',CREME),
 ('Bestand: wenig (gold)',       '#5A3F0B',CREME),
 ('Bestand: ausverkauft (rot)',  '#7A1F23',CREME),
 ('Bildunterschrift Titel (worst case)','#2A1810',CAP),
 ('Bildunterschrift Rot (worst case)','#7A1F23',CAP),
 ('Badge (Text auf Rot)',        '#FFF8EC','#8E2A2E'),
 ('QR-Linktext auf Karte',       '#5A1D16',KARTE),
 ('Laufband-Text',               '#2A1810',LAUF),
 ('Logo-Rot (nur Logo/Flaeche)', '#A53134',CREME),
 ('Gold (nur Linien/Rahmen)',    '#C9A04A',CREME),
]
if __name__=='__main__':
    print('| Element | Vordergrund | Hintergrund | Kontrast |')
    print('|---|---|---|---|')
    for n,fg,bg in PAARE: print(f'| {n} | {fg} | {bg} | {ratio(fg,bg):.2f}:1 |')
    print('Relative Leuchtdichte Grund:', round(lum(CREME),3), '(reines Weiss = 1.0)')
