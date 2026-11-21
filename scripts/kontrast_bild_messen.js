// Hilfsskript (nur lokal, nicht vom TV genutzt): siehe scripts/kontrast_bild.py
// node measure.js <baseurl> <prefix> idx:name ...
const {chromium}=require('playwright-core');
const fs=require('fs');
(async()=>{
  const [base,prefix,...slides]=process.argv.slice(2);
  const b=await chromium.launch({args:['--no-sandbox']});
  const out={};
  for(const s of slides){
    const [i,name]=s.split(':');
    const p=await b.newPage({viewport:{width:1920,height:1080}});
    await p.goto(base+'?folie='+i); await p.waitForTimeout(2500);
    await p.evaluate(()=>document.fonts.ready);
    await p.screenshot({path:prefix+name+'.png'});
    // Zeilenboxen sammeln
    const lines=await p.evaluate(()=>{
      const slide=document.querySelector('.f.on'); const res=[];
      const w=document.createTreeWalker(slide,NodeFilter.SHOW_TEXT);
      let n; while(n=w.nextNode()){
        if(!n.textContent.trim()) continue;
        const el=n.parentElement; if(el.closest('.qr,.glogo')) continue; // Karten haben eigenen Grund
        const cs=getComputedStyle(el); const r=document.createRange(); r.selectNodeContents(n);
        for(const b of r.getClientRects()){ if(b.width<2) continue;
          res.push({tag:el.tagName,text:n.textContent.trim().slice(0,40),color:cs.color,x:b.left,y:b.top,w:b.width,h:b.height}); }
      }
      return res;
    });
    // Text unsichtbar machen und Hintergrund fotografieren
    await p.addStyleTag({content:'.f.on *{color:transparent!important;text-shadow:none!important} .f.on .badge{color:transparent!important}'});
    await p.waitForTimeout(300);
    await p.screenshot({path:'/tmp/bgonly_'+name+'.png'});
    out[name]=lines;
    await p.close();
  }
  fs.writeFileSync('/tmp/lines.json',JSON.stringify(out));
  await b.close();
})();
