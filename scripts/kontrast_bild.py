# Kontrast im schlechtesten Fall je Textzeile auf dem echten Pixelhintergrund.
# Ablauf: node scripts/kontrast_bild_messen.js http://localhost:8000/ /tmp/m_ 1:welcome 3:gutschein ...
#        (braucht playwright-core; schreibt /tmp/lines.json und /tmp/bgonly_<name>.png = Folie ohne Text)
#        python3 scripts/kontrast_bild.py
import json,sys,re
from PIL import Image
def lin(c):
    c/=255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(rgb): r,g,b=rgb[:3]; return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def ratio(a,b): a,b=sorted((a,b),reverse=True); return (a+0.05)/(b+0.05)
data=json.load(open('/tmp/lines.json'))
summary={}
for name,lines in data.items():
    im=Image.open(f'/tmp/bgonly_{name}.png').convert('RGB'); px=im.load()
    worst=None
    for ln in lines:
        m=re.findall(r'[\d.]+',ln['color']); fg=tuple(int(float(v)) for v in m[:3]); Lf=L(fg)
        x0,y0=max(0,int(ln['x'])),max(0,int(ln['y'])); x1,y1=min(1919,int(ln['x']+ln['w'])),min(1079,int(ln['y']+ln['h']))
        lums=[L(px[x,y]) for y in range(y0,y1+1,2) for x in range(x0,x1+1,2)]
        if not lums: continue
        # schlechtester Pixel = geringster Kontrast
        r=min(ratio(Lf,l) for l in (min(lums),max(lums)))
        ln['worst']=round(r,2)
        print(f"{name:12s} {ln['tag']:3s} {r:6.2f}:1  x {x0}-{x1}  '{ln['text']}'")
        if worst is None or r<worst[0]: worst=(r,ln['tag'],ln['text'])
    summary[name]=worst
print('---')
for k,v in summary.items(): print(f'{k:12s} schlechtester Fall {v[0]:.2f}:1 ({v[1]} "{v[2]}")')
