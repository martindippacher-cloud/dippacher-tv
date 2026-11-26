// Zeitsteuerung für Dippacher TV (Europe/Berlin-Gerätelokalzeit)
// Felder (alle optional, abwärtskompatibel):
//   aktiv:false            dauerhaft aus (auch Dashboard-Kacheln, die diese Folie nutzen)
//   inRotation:false       nur nicht in der TV-Rotation; Dashboard darf die Folie weiter zeigen
//   zeit:{von:"HH:MM", bis:"HH:MM"}
//   tage:[1..7]  Mo=1 … So=7  (wöchentlich)
//   datum:"YYYY-MM-DD"        Einzeldatum
//   ab:"YYYY-MM-DD"           Startdatum inklusive
//   bisDatum:"YYYY-MM-DD"     Ablaufdatum inklusive  (nicht "bis" – das wäre Uhrzeit-Konflikt)
// Alias: bisTag / ablauf akzeptiert als bisDatum
//   bisZeit:"HH:MM"            mit bisDatum: am letzten Tag nur bis zu dieser Uhrzeit (z. B. Veranstaltungsende)
//   pausen:[{von:"YYYY-MM-DD", bis:"YYYY-MM-DD"}]  Pausen inklusive (z. B. Betriebsurlaub); davor und danach normal
//   exklusiv:{von:"HH:MM", bis:"HH:MM", datum?:"YYYY-MM-DD"}
//     In diesem Fenster läuft nur diese Folie (keine anderen, auch nicht das Dashboard).
//     von einschließlich, bis ausschließlich: bei bis "18:30" beginnt um 18:30 wieder der normale Zyklus.
//     Ohne datum gilt das Folien-datum, sonst jeder Tag, an dem die Folie sonst aktiv wäre.
(function(global){
  const TAG=[,'Mo','Di','Mi','Do','Fr','Sa','So'];
  const min=t=>{const[a,b]=String(t).split(':');return(+a)*60+(+b)};
  function iso(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function bisFeld(f){return f.bisDatum||f.bisTag||f.ablauf||null}
  function pause(f, heute){
    if(!Array.isArray(f.pausen)) return null;
    return f.pausen.find(p=>p && p.von && p.bis && heute>=p.von && heute<=p.bis) || null;
  }
  function aktiv(f, d, forceAlle){
    if(f.aktiv===false) return false;
    if(forceAlle) return true;
    d=d||new Date();
    const m=d.getHours()*60+d.getMinutes(), wt=d.getDay()||7, heute=iso(d);
    if(f.datum && f.datum!==heute) return false;
    const ab=f.ab||null, bis=bisFeld(f);
    if(ab && heute<ab) return false;
    if(bis && heute>bis) return false;
    if(bis && f.bisZeit && heute===bis && m>=min(f.bisZeit)) return false;
    if(pause(f, heute)) return false;
    if(f.tage && !f.tage.includes(wt)) return false;
    if(f.zeit && (m<min(f.zeit.von)||m>min(f.zeit.bis))) return false;
    return true;
  }
  /* TV-Rotation: aktiv plus nicht ausdrücklich aus der Rotation genommen.
     Dashboard nutzt weiter nur aktiv() – so bleiben Teaser/Infos sichtbar. */
  function inRotation(f, d, forceAlle){
    if(f.inRotation===false) return false;
    return aktiv(f, d, forceAlle);
  }
  /* Exklusiv-Fenster: von einschließlich, bis ausschließlich (Minute von bis gehört schon wieder zum normalen Zyklus). */
  function exklusivFenster(f){
    const ex=f&&f.exklusiv;
    if(!ex||!ex.von||!ex.bis) return null;
    return ex;
  }
  function exklusivAktiv(f, d){
    const ex=exklusivFenster(f);
    if(!ex) return false;
    d=d||new Date();
    const heute=iso(d), tag=ex.datum||f.datum||heute;
    if(tag!==heute) return false;
    const m=d.getHours()*60+d.getMinutes();
    return m>=min(ex.von) && m<min(ex.bis);
  }
  function exklusivFolie(F, d){
    if(!Array.isArray(F)) return null;
    d=d||new Date();
    for(const f of F){
      if(f && inRotation(f, d) && exklusivAktiv(f, d)) return f;
    }
    return null;
  }
  /* Wie inRotation, berücksichtigt aber eine gerade aktive Exklusivfolie (dann nur diese). */
  function sichtbar(f, F, d, forceAlle){
    if(!inRotation(f, d, forceAlle)) return false;
    if(forceAlle) return true;
    const ex=exklusivFolie(F, d);
    return !ex || ex===f || ex.id===f.id;
  }
  function um(isoTag, hm){
    const[y,mo,da]=String(isoTag).split('-').map(Number);
    const[h,mi]=String(hm).split(':').map(Number);
    return new Date(y, mo-1, da, h, mi||0, 0, 0).getTime();
  }
  /* Millisekunden bis zum nächsten Beginn oder Ende eines Exklusivfensters, sonst Infinity. */
  function msBisExklusivWechsel(F, d){
    d=d||new Date();
    const now=d.getTime(), heute=iso(d);
    let best=Infinity;
    if(!Array.isArray(F)) return best;
    for(const f of F){
      const ex=exklusivFenster(f);
      if(!ex) continue;
      const tag=ex.datum||f.datum||heute;
      if(tag<heute) continue;
      const start=um(tag, ex.von), ende=um(tag, ex.bis);
      if(start>now) best=Math.min(best, start-now);
      if(ende>now) best=Math.min(best, ende-now);
    }
    return best;
  }
  function tageLabel(tage){
    if(!tage||!tage.length) return '';
    const s=[...tage].sort((a,b)=>a-b);
    // compact Mo–Fr
    if(s.length>=2){
      let contiguous=true;
      for(let i=1;i<s.length;i++) if(s[i]!==s[i-1]+1) contiguous=false;
      if(contiguous) return TAG[s[0]]+'–'+TAG[s[s.length-1]];
    }
    return s.map(n=>TAG[n]).join(', ');
  }
  function fmtDe(isoStr){
    if(!isoStr) return '';
    const[y,m,d]=isoStr.split('-');
    return d+'.'+m+'.'+y;
  }
  function statusInfo(f, d, F){
    d=d||new Date();
    const heute=iso(d), m=d.getHours()*60+d.getMinutes(), wt=d.getDay()||7;
    const bis=bisFeld(f);
    if(f.aktiv===false) return {cls:'aus', label:'aus', live:false};
    if(f.inRotation===false) return {cls:'aus', label:'nicht in der Rotation', live:false};
    if(f.datum && f.datum!==heute){
      if(f.datum<heute) return {cls:'abgelaufen', label:'abgelaufen (Datum '+fmtDe(f.datum)+')', live:false};
      return {cls:'geplant', label:'Einzeldatum '+fmtDe(f.datum), live:false};
    }
    if(f.ab && heute<f.ab) return {cls:'geplant', label:'ab '+fmtDe(f.ab), live:false};
    if(bis && heute>bis) return {cls:'abgelaufen', label:'abgelaufen (bis '+fmtDe(bis)+')', live:false};
    if(bis && f.bisZeit && heute===bis && m>=min(f.bisZeit)) return {cls:'abgelaufen', label:'abgelaufen (bis '+fmtDe(bis)+' '+f.bisZeit+' Uhr)', live:false};
    const pz=pause(f, heute);
    if(pz) return {cls:'geplant', label:'Pause '+fmtDe(pz.von)+'–'+fmtDe(pz.bis)+(pz.grund?' ('+pz.grund+')':''), live:false};
    if(f.tage && !f.tage.includes(wt)){
      const tl=tageLabel(f.tage);
      const z=f.zeit?(' '+f.zeit.von+'–'+f.zeit.bis):'';
      return {cls:'zeit', label:tl+z+' · heute nicht', live:false};
    }
    if(f.zeit && (m<min(f.zeit.von)||m>min(f.zeit.bis))){
      const tl=tageLabel(f.tage);
      return {cls:'zeit', label:(tl?tl+' ':'')+f.zeit.von+'–'+f.zeit.bis+' · jetzt nicht', live:false};
    }
    // live – Klartext der Steuerung
    const parts=[];
    if(f.datum) parts.push('nur '+fmtDe(f.datum));
    if(f.tage) parts.push(tageLabel(f.tage));
    if(f.zeit) parts.push(f.zeit.von+'–'+f.zeit.bis);
    if(f.ab) parts.push('ab '+fmtDe(f.ab));
    if(bis) parts.push('bis '+fmtDe(bis)+(f.bisZeit?' '+f.bisZeit+' Uhr':''));
    const ex=exklusivFenster(f);
    if(ex){
      const tag=ex.datum||f.datum;
      parts.push('exklusiv '+(tag?fmtDe(tag)+' ':'')+ex.von+'–'+ex.bis);
    }
    if(F){
      const exo=exklusivFolie(F, d);
      if(exo && exo.id===f.id){
        return {cls:'live', label:(parts.length?parts.join(' · ')+' · ':'')+'läuft jetzt allein (exklusiv)', live:true};
      }
      if(exo && exo.id!==f.id){
        return {cls:'zeit', label:'während Exklusivfolie ausgeblendet', live:false};
      }
    }
    if(!parts.length) return {cls:'live', label:'läuft jetzt', live:true};
    return {cls:'live', label:parts.join(' · ')+' · läuft jetzt', live:true};
  }
  global.TVSchedule={aktiv, inRotation, sichtbar, exklusivAktiv, exklusivFolie, msBisExklusivWechsel, statusInfo, tageLabel, iso, bisFeld, pause};
})(window);
