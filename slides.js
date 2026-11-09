// ===== FOLIEN-LOADER =====
// Inhalt je Folie: folien/<id>.json
// Reihenfolge/Overrides: auswahl.json
// Nach dem Laden: window.FOLIEN = [...] und Event "folien-ready"
(function(global){
  async function loadFolien(){
    const auswahl=await fetch('auswahl.json',{cache:'no-store'}).then(r=>{
      if(!r.ok) throw new Error('auswahl.json '+r.status); return r.json();
    });
    const ids=auswahl.reihenfolge||[];
    const overrides=auswahl.overrides||{};
    const list=[];
    for(const id of ids){
      const f=await fetch('folien/'+encodeURIComponent(id)+'.json',{cache:'no-store'}).then(r=>{
        if(!r.ok) throw new Error('folie '+id+' '+r.status); return r.json();
      });
      const merged=Object.assign({}, f, overrides[id]||{}, {id:f.id||id});
      list.push(merged);
    }
    global.FOLIEN=list;
    global.AUSWAHL=auswahl;
    global.dispatchEvent(new Event('folien-ready'));
    return list;
  }
  global.loadFolien=loadFolien;
})(window);
