// Zeitsteuerung für Dippacher TV (Europe/Berlin-Gerätelokalzeit)
// Felder (alle optional, abwärtskompatibel):
//   aktiv:false
//   zeit:{von:"HH:MM", bis:"HH:MM"}
//   tage:[1..7]  Mo=1 … So=7  (wöchentlich)
//   datum:"YYYY-MM-DD"        Einzeldatum
//   ab:"YYYY-MM-DD"           Startdatum inklusive
//   bisDatum:"YYYY-MM-DD"     Ablaufdatum inklusive  (nicht "bis" – das wäre Uhrzeit-Konflikt)
// Alias: bisTag / ablauf akzeptiert als bisDatum
(function(global){
  const TAG=[,'Mo','Di','Mi','Do','Fr','Sa','So'];
  const min=t=>{const[a,b]=String(t).split(':');return(+a)*60+(+b)};
  function iso(d){
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function bisFeld(f){return f.bisDatum||f.bisTag||f.ablauf||null}
  function aktiv(f, d, forceAlle){
    if(f.aktiv===false) return false;
    if(forceAlle) return true;
    d=d||new Date();
    const m=d.getHours()*60+d.getMinutes(), wt=d.getDay()||7, heute=iso(d);
    if(f.datum && f.datum!==heute) return false;
    const ab=f.ab||null, bis=bisFeld(f);
    if(ab && heute<ab) return false;
    if(bis && heute>bis) return false;
    if(f.tage && !f.tage.includes(wt)) return false;
    if(f.zeit && (m<min(f.zeit.von)||m>min(f.zeit.bis))) return false;
    return true;
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
  function statusInfo(f, d){
    d=d||new Date();
    const heute=iso(d), m=d.getHours()*60+d.getMinutes(), wt=d.getDay()||7;
    const bis=bisFeld(f);
    if(f.aktiv===false) return {cls:'aus', label:'aus', live:false};
    if(f.datum && f.datum!==heute){
      if(f.datum<heute) return {cls:'abgelaufen', label:'abgelaufen (Datum '+fmtDe(f.datum)+')', live:false};
      return {cls:'geplant', label:'Einzeldatum '+fmtDe(f.datum), live:false};
    }
    if(f.ab && heute<f.ab) return {cls:'geplant', label:'ab '+fmtDe(f.ab), live:false};
    if(bis && heute>bis) return {cls:'abgelaufen', label:'abgelaufen (bis '+fmtDe(bis)+')', live:false};
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
    if(bis) parts.push('bis '+fmtDe(bis));
    if(!parts.length) return {cls:'live', label:'läuft jetzt', live:true};
    return {cls:'live', label:parts.join(' · ')+' · läuft jetzt', live:true};
  }
  global.TVSchedule={aktiv, statusInfo, tageLabel, iso, bisFeld};
})(window);
