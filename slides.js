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
  // Ohne "dauer": Bestand 25 s, sonst nach Textmenge: 8 s + 0,6 s je Wort, begrenzt auf 15–30 s.
  const DAUER_MIN=15, DAUER_MAX=30, DAUER_BESTAND=25;
  function plain(s){return String(s==null?'':s).replace(/<br\s*\/?>/gi,' ').replace(/&nbsp;/g,' ').replace(/<[^>]*>/g,'')}
  function woerter(f){
    let t=[f.titel,f.unter,f.text,f.badge].map(plain).join(' ');
    if(Array.isArray(f.liste)) t+=' '+f.liste.map(r=>Array.isArray(r)?r.map(plain).join(' '):plain(r)).join(' ');
    return t.split(/\s+/).filter(Boolean).length;
  }
  function auto(f){
    if((f.typ||'html')==='bestand') return DAUER_BESTAND;
    return Math.max(DAUER_MIN, Math.min(DAUER_MAX, Math.round(8+woerter(f)*0.6)));
  }
  function sekunden(f){ return f.dauer ? Number(f.dauer) : ((f.typ==='video') ? null : auto(f)); }
  global.TVDauer={auto, sekunden, woerter};
})(window);
