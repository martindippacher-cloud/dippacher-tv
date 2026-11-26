// ===== FOLIEN-LOADER =====
// Inhalt je Folie: folien/<id>.json
// Reihenfolge/Overrides: auswahl.json
// Nach dem Laden: window.FOLIEN = [...] und Event "folien-ready"
// Fehlende oder kaputte Folien-JSON werden übersprungen (window.FOLIEN_FEHLER),
// die übrigen Folien laufen weiter. Nur ein Fehler in auswahl.json ist fatal.
(function(global){
  async function ladeFolie(id){
    const r=await fetch('folien/'+encodeURIComponent(id)+'.json',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const f=await r.json();
    if(!f || typeof f!=='object' || Array.isArray(f)) throw new Error('kein Folien-Objekt');
    return f;
  }
  async function loadFolien(){
    const auswahl=await fetch('auswahl.json',{cache:'no-store'}).then(r=>{
      if(!r.ok) throw new Error('auswahl.json '+r.status); return r.json();
    });
    const ids=Array.isArray(auswahl.reihenfolge)?auswahl.reihenfolge:[];
    const overrides=auswahl.overrides||{};
    const ergebnisse=await Promise.all(ids.map(id=>ladeFolie(id).then(f=>({id,f}),err=>({id,err}))));
    const list=[], fehler=[];
    for(const e of ergebnisse){
      if(e.err){ fehler.push({id:e.id, fehler:String(e.err.message||e.err)}); console.warn('Folie übersprungen:', e.id, e.err); continue; }
      list.push(Object.assign({}, e.f, overrides[e.id]||{}, {id:e.f.id||e.id}));
    }
    global.FOLIEN=list;
    global.FOLIEN_FEHLER=fehler;
    global.AUSWAHL=auswahl;
    global.dispatchEvent(new Event('folien-ready'));
    return list;
  }
  global.loadFolien=loadFolien;

  // ===== ANZEIGEDAUER =====
  // Explizites "dauer" (Sekunden) in der Folie hat immer Vorrang (index.html).
  // Ohne "dauer": Bestand 25 s, Plakat 22 s (mitText: Wortregel, mind. 22 s), sonst nach Textmenge: 8 s + 0,6 s je Wort, begrenzt auf 15–30 s.
  const DAUER_MIN=15, DAUER_MAX=30, DAUER_BESTAND=25, DAUER_DASHBOARD=50, DAUER_PLAKAT=22, DAUER_PLAKAT_TEXT_MIN=22;
  function plain(s){return String(s==null?'':s).replace(/<br\s*\/?>/gi,' ').replace(/&nbsp;/g,' ').replace(/<[^>]*>/g,'')}
  function woerter(f){
    let t=[f.titel,f.unter,f.text,f.badge].map(plain).join(' ');
    if(f.typ==='plakat' && f.kernpunkte){ const k=f.kernpunkte; t+=' '+[k.titel,k.verein,k.datum,k.uhrzeit,k.ort,k.schluss].map(plain).join(' ')+' '+(Array.isArray(k.punkte)?k.punkte.map(p=>plain(p&&typeof p==='object'?p.text:p)).join(' '):''); }
    if(Array.isArray(f.liste)) t+=' '+f.liste.map(r=>Array.isArray(r)?r.map(plain).join(' '):plain(r)).join(' ');
    return t.split(/\s+/).filter(Boolean).length;
  }
  function auto(f){
    if((f.typ||'html')==='bestand') return DAUER_BESTAND;
    if(f.typ==='dashboard') return DAUER_DASHBOARD;
    // Plakat: Bild braucht Zeit zum Anschauen; mit Kernpunkten nach Wortregel, aber mind. 22 s
    if(f.typ==='plakat') return (f.layout==='mitText' && f.kernpunkte) ? Math.max(DAUER_PLAKAT_TEXT_MIN, Math.min(DAUER_MAX, Math.round(8+woerter(f)*0.6))) : DAUER_PLAKAT;
    return Math.max(DAUER_MIN, Math.min(DAUER_MAX, Math.round(8+woerter(f)*0.6)));
  }
  function sekunden(f){ return f.dauer ? Number(f.dauer) : ((f.typ==='video') ? null : auto(f)); }
  global.TVDauer={auto, sekunden, woerter};

  // ===== ROTATION =====
  // Folien laufen in der Reihenfolge von auswahl.json.
  // Eine Folie mit "wiederholeNach": N wiederholt sich nach je N normalen Folien
  // (normal = aktiv und ohne wiederholeNach). Mehrere solche Folien sind erlaubt,
  // jede mit eigenem N und eigenem Zähler. Sind mehrere gleichzeitig fällig, gilt
  // die Reihenfolge in auswahl.json. Dieselbe Folie kommt nicht direkt hintereinander,
  // solange es eine andere aktive Folie gibt. Ohne "wiederholeNach" einmal pro Durchlauf.
  const istHaupt=f=>Number(f&&f.wiederholeNach)>0;
  function neu(){ return {pos:-1, cur:-1, seit:{}}; }
  function naechste(F, aktivFn, st){
    const idx=F.map((f,k)=>k).filter(k=>aktivFn(k));
    if(!idx.length){ st.cur=-1; return -1; }
    const haupt=idx.filter(k=>istHaupt(F[k])), normal=idx.filter(k=>!istHaupt(F[k]));
    const faellig=h=>{const n=Number(F[h].wiederholeNach), s=st.seit[h]; return s===undefined||s>=n};
    let kandidaten=haupt.filter(h=>faellig(h)&&h!==st.cur);
    if(!kandidaten.length && !normal.length){
      kandidaten=haupt.filter(h=>faellig(h));
      if(!kandidaten.length) kandidaten=haupt.slice();
    }
    let k;
    if(kandidaten.length){
      k=kandidaten[0];
      st.seit[k]=0;
    } else if(normal.length){
      k=normal.find(x=>x>st.pos); if(k===undefined) k=normal[0];
      st.pos=k;
      for(const h of haupt){ if(st.seit[h]!==undefined) st.seit[h]++; }
    } else { st.cur=-1; return -1; }
    st.cur=k; return k;
  }
  // Ein kompletter Durchlauf (jede normale Folie einmal) zum Anzeigen in der Übersicht
  function ablauf(F, aktivFn){
    const st=neu(), seq=[], gesehen=new Set();
    for(let g=0; g<500; g++){
      const k=naechste(F, aktivFn, st); if(k<0) break;
      if(!istHaupt(F[k])){ if(gesehen.has(k)) break; gesehen.add(k); }
      else if(seq.length && gesehen.size===F.filter((f,j)=>aktivFn(j)&&!istHaupt(f)).length) break;
      seq.push(k);
    }
    return seq;
  }
  global.TVRotation={neu, naechste, ablauf, istHaupt};
})(window);
