# Erzeugt die zwei BEISPIEL-Plakate (keine echten Veranstaltungen) für die Plakat-Folie.
# Aufruf im Repo-Wurzelordner: python3 scripts/beispiel_plakate.py && scripts/pdf_zu_bild.sh assets/vereine/original/beispiel-*.pdf
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
D="/usr/share/fonts/truetype/sand-box/custom/Source Sans Pro/"
pdfmetrics.registerFont(TTFont('SB',D+'SourceSansPro-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SR',D+'SourceSansPro-Regular.ttf'))
W,H=A4
def plakat(fn, farbe, akzent, verein, titel1, titel2, zeilen):
    c=canvas.Canvas(fn,pagesize=A4); c.setTitle('BEISPIEL – '+verein)
    c.setFillColorRGB(*farbe); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColorRGB(*akzent); c.circle(W*0.85,H*0.9,170,fill=1,stroke=0); c.circle(W*0.1,H*0.12,120,fill=1,stroke=0)
    # BEISPIEL-Banner
    c.saveState(); c.translate(W/2,H*0.80); c.rotate(-8)
    c.setFillColorRGB(0.85,0.1,0.1); c.rect(-W*0.55,-28,W*1.1,56,fill=1,stroke=0)
    c.setFillColorRGB(1,1,1); c.setFont('SB',38); c.drawCentredString(0,-13,'BEISPIEL – NUR MUSTER')
    c.restoreState()
    c.setFillColorRGB(1,1,1)
    c.setFont('SR',24); c.drawCentredString(W/2,H*0.66,verein)
    c.setFont('SB',58); c.drawCentredString(W/2,H*0.57,titel1); c.drawCentredString(W/2,H*0.50,titel2)
    c.setFont('SR',22); y=H*0.40
    for z in zeilen: c.drawCentredString(W/2,y,z); y-=34
    c.setFont('SB',30); c.drawCentredString(W/2,H*0.08,'BEISPIEL')
    c.setFont('SR',12); c.drawCentredString(W/2,H*0.05,'Musterplakat zum Testen der Plakat-Folie – alle Angaben erfunden')
    c.showPage(); c.save()
plakat('assets/vereine/original/beispiel-verein-muster.pdf',(0.12,0.30,0.45),(0.18,0.40,0.58),'Beispiel-Verein e. V.','Muster-','Veranstaltung',['Datum: TT.MM.JJJJ','Beginn: hh:mm Uhr','Ort: Musterort, Beispielhalle','Eintritt: Beispielpreis'])
plakat('assets/vereine/original/beispiel-verein-muster-2.pdf',(0.45,0.20,0.12),(0.58,0.30,0.18),'Muster-Sportverein (Beispiel)','Beispiel-','Turnier',['Datum: TT.MM.JJJJ','Beginn: hh:mm Uhr','Ort: Beispielplatz','Für alle Altersgruppen (Muster)'])
