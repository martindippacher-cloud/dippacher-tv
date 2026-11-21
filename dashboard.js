/* ===== DASHBOARD-FOLIE (typ "dashboard") =====
   Infotafel mit Kopfzeile (Logo, Datum, Uhr) und Kacheln in zwei Spalten. Die Food-Box kommt hier bewusst nicht vor.
   Konfiguration: folien/dashboard.json -> "kacheln" (Reihenfolge, aktiv, bereich, klein).
   Grundsatz: fällt eine Datenquelle aus, verschwindet nur diese Kachel; die Folie bricht nie.
   Externe Daten: Open-Meteo (Wetter, alle 30 min), termine.json (alle 10 min).
   Letzter guter Wetterstand liegt im localStorage (max. 12 h, danach Kachel ausgeblendet). */
(function(global){
  const WETTER_MS=30*60*1000, TERMINE_MS=10*60*1000, RENDER_MS=60*1000, WETTER_MAX_ALT=12*60*60*1000;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rich=s=>esc(s).replace(/&lt;br\s*\/?&gt;/gi,' ').replace(/&amp;nbsp;/g,'&nbsp;');
  const WT=['So','Mo','Di','Mi','Do','Fr','Sa'];
  const hhmm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  function jetzt(){return new Date()}
  function iso(d){return TVSchedule.iso(d)}
  function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

  /* ---------- Wetter-Symbole (inline SVG, keine Emoji-Schrift nötig) ---------- */
  const SONNE='<circle cx="24" cy="24" r="9" fill="#E0A526" stroke="#8A5A0B" stroke-width="1.6"/>'+
    [0,45,90,135,180,225,270,315].map(a=>'<line x1="24" y1="7" x2="24" y2="2.5" stroke="#B9801A" stroke-width="3" stroke-linecap="round" transform="rotate('+a+' 24 24)"/>').join('');
  const MOND='<path d="M30 8a15 15 0 1 0 10 24A12 12 0 0 1 30 8z" fill="#E9D9A6" stroke="#6B5A2B" stroke-width="1.6"/>';
  const WOLKE=(x,y,s,f)=>'<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M12 34h24a9 9 0 0 0 0-18 12 12 0 0 0-23-2A10 10 0 0 0 12 34z" fill="'+(f||'#D9D2C8')+'" stroke="#5E5248" stroke-width="1.8" stroke-linejoin="round"/></g>';
  const TROPFEN='<g stroke="#2F5D8A" stroke-width="2.6" stroke-linecap="round"><line x1="17" y1="38" x2="15" y2="44"/><line x1="25" y1="38" x2="23" y2="44"/><line x1="33" y1="38" x2="31" y2="44"/></g>';
  const FLOCKEN='<g fill="#2F5D8A"><circle cx="16" cy="41" r="2.2"/><circle cx="24" cy="44" r="2.2"/><circle cx="32" cy="41" r="2.2"/></g>';
  const BLITZ='<path d="M25 33l-5 8h5l-3 7 9-10h-5l3-5z" fill="#E0A526" stroke="#8A5A0B" stroke-width="1.2"/>';
  const NEBEL='<g stroke="#6E655C" stroke-width="3" stroke-linecap="round"><line x1="8" y1="38" x2="40" y2="38"/><line x1="12" y1="44" x2="36" y2="44"/></g>';
  function wmo(code){
    code=Number(code);
    if(code===0) return {k:'klar',t:'Sonnig'};
    if(code===1) return {k:'heiter',t:'Heiter'};
    if(code===2) return {k:'wolkig',t:'Teils bewölkt'};
    if(code===3) return {k:'bedeckt',t:'Bedeckt'};
    if(code===45||code===48) return {k:'nebel',t:'Nebel'};
    if(code>=51&&code<=57) return {k:'regen',t:'Nieselregen'};
    if((code>=61&&code<=67)||(code>=80&&code<=82)) return {k:'regen',t:code>=80?'Regenschauer':'Regen'};
    if((code>=71&&code<=77)||code===85||code===86) return {k:'schnee',t:'Schnee'};
    if(code>=95) return {k:'gewitter',t:'Gewitter'};
    return {k:'wolkig',t:''};
  }
  function icon(code,tag){
    const k=wmo(code).k, nacht=tag===0;
    let g;
    if(k==='klar') g=nacht?MOND:SONNE;
    else if(k==='heiter'||k==='wolkig') g='<g transform="translate(-6 -6)">'+(nacht?MOND:SONNE)+'</g>'+WOLKE(4,6,.95);
    else if(k==='bedeckt') g=WOLKE(-2,-2,1.08);
    else if(k==='nebel') g=WOLKE(0,-8,1)+NEBEL;
    else if(k==='regen') g=WOLKE(0,-6,1)+TROPFEN;
    else if(k==='schnee') g=WOLKE(0,-6,1)+FLOCKEN;
    else g=WOLKE(0,-8,1,'#BFB6AA')+BLITZ;
    return '<svg class="wi" viewBox="0 0 48 48" aria-hidden="true">'+g+'</svg>';
  }
  const grad=v=>Math.round(Number(v)).toString().replace('-','−')+'°';

  /* ---------- Datenquellen ---------- */
  async function json(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  function wetterUrl(k){
    const lat=Number(k.lat)||49.694, lon=Number(k.lon)||10.965;
    return 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+
      '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,precipitation'+
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'+
      '&timezone=Europe%2FBerlin&forecast_days=5';
  }
  async function ladeWetter(st,k){
    const url=wetterUrl(k), key='wetter-cache:'+url;
    try{
      const d=await json(url);
      if(!d||!d.current||!d.daily) throw new Error('unvollständig');
      lsSet(key,{at:Date.now(),data:d});
      st.wetter={data:d,at:Date.now(),alt:false};
    }catch(e){
      const c=lsGet(key);
      st.wetter=(c&&c.data&&Date.now()-c.at<WETTER_MAX_ALT)?{data:c.data,at:c.at,alt:true}:null;
      console.warn('Wetter nicht erreichbar',e);
    }
  }
  async function ladeTermine(st,url){
    try{ const d=await json(url); st.termine=Array.isArray(d.termine)?d.termine:(Array.isArray(d)?d:[]); }
    catch(e){ if(!st.termine) st.termine=null; }
  }
  /* Andere Folie nachschlagen: zuerst die bereits geladene (mit Overrides aus auswahl.json), sonst Datei */
  async function folie(st,id){
    if(!id) return null;
    if(st.folien[id]!==undefined) return st.folien[id];
    let f=(global.FOLIEN||[]).find(x=>x.id===id)||null;
    if(!f){ try{ f=await json('folien/'+encodeURIComponent(id)+'.json'); }catch(e){ f=null; } }
    if(f && f.csvUrl && typeof global.applyMittagstischCSV==='function'){
      try{ f=Object.assign({},f); await global.applyMittagstischCSV([f]); }catch(e){}
    }
    st.folien[id]=f;
    return f;
  }
  const gilt=f=>!!f && TVSchedule.aktiv(f, jetzt(), false);

  /* ---------- Kacheln ---------- */
  function kopf(){
    return '<div class="d-kopf"><img class="d-logo" src="assets/logo.png" alt="Dippacher">'+
      '<div class="d-kopf-r"><div class="d-zeit"><div class="d-datum"></div><div class="d-uhr"></div></div></div></div>';
  }
  /* Große Wetterkachel: jetzt (Symbol, Temperatur, Beschreibung, gefühlt, Wind/Niederschlag) + nächste 3 Tage */
  function wetter(st,k){
    const W=st.wetter; if(!W) return '';
    const d=W.data, c=d.current||{}, dl=d.daily||{}, heute=iso(jetzt());
    const t=Array.isArray(dl.time)?dl.time:[];
    const i=t.indexOf(heute);
    const aktuellOk=c.temperature_2m!=null && (!W.alt || (Date.now()-W.at<3*60*60*1000));
    let jetztTeil='';
    if(aktuellOk){
      const extra=[];
      if(c.apparent_temperature!=null) extra.push('gefühlt '+grad(c.apparent_temperature));
      if(Number(c.precipitation)>0) extra.push('Niederschlag '+String(Math.round(c.precipitation*10)/10).replace('.',',')+' mm');
      else if(c.wind_speed_10m!=null) extra.push('Wind '+Math.round(c.wind_speed_10m)+' km/h');
      const heuteMM=i>=0?'<div class="w-heute">Heute '+grad(dl.temperature_2m_max[i])+' / '+grad(dl.temperature_2m_min[i])+'</div>':'';
      jetztTeil='<div class="w-jetzt">'+icon(c.weather_code,c.is_day)+'<div class="w-temp">'+grad(c.temperature_2m)+'</div>'+
        '<div class="w-info"><div class="w-txt">'+esc(wmo(c.weather_code).t)+'</div>'+(extra.length?'<div class="w-extra">'+esc(extra.join(' · '))+'</div>':'')+heuteMM+'</div></div>';
    }
    let tage='';
    if(i>=0){
      const tg=[];
      for(let j=i+1;j<=i+3 && j<t.length;j++){
        const dt=new Date(t[j]+'T12:00:00');
        const lbl=j===i+1?'Morgen':WT[dt.getDay()]+' '+dt.getDate()+'.'+(dt.getMonth()+1)+'.';
        const pp=Array.isArray(dl.precipitation_probability_max)?dl.precipitation_probability_max[j]:null;
        tg.push('<div class="w-tag"><div class="w-lbl">'+esc(lbl)+'</div>'+icon(dl.weather_code[j],1)+
          '<div class="w-mm"><b>'+grad(dl.temperature_2m_max[j])+'</b> / '+grad(dl.temperature_2m_min[j])+'</div>'+
          (pp!=null?'<div class="w-pp">Regen '+Math.round(pp)+' %</div>':'')+'</div>');
      }
      if(tg.length) tage='<div class="w-tage">'+tg.join('')+'</div>';
    }
    if(!jetztTeil && !tage) return '';
    const stand=W.alt?' <span class="w-stand">Stand '+hhmm(new Date(W.at))+' Uhr</span>':'';
    return '<div class="k wetter"><h3>'+esc(k.titel||('Wetter in '+(k.ort||'Poppendorf')))+stand+'</h3>'+jetztTeil+tage+'</div>';
  }
  async function teaser(st,k){
    let f=null;
    for(const id of (k.folien||[k.folie])){ const x=await folie(st,id); if(gilt(x)&&x.bild){f=x;break} }
    if(!f) return '';
    return '<div class="k teaser" data-bild="'+esc(f.bild)+'" style="background-image:url(&quot;'+esc(encodeURI(f.bild))+'&quot;)">'+
      '<div class="t-ov">'+(f.badge?'<div class="t-badge">'+rich(f.badge)+'</div>':'')+'<h1>'+rich(f.titel)+'</h1>'+(f.unter?'<h2>'+rich(f.unter)+'</h2>':'')+(f.text?'<p>'+rich(f.text)+'</p>':'')+'</div></div>';
  }
  async function infos(st,k){
    const rows=[];
    for(const id of (k.folien||[])){
      if(rows.length>=(Number(k.max)||2)) break;
      const f=await folie(st,id); if(!gilt(f)) continue;
      const bild=f.bild||f.qr; if(!bild) continue;
      rows.push('<div class="row i-row"><img class="i-bild'+(f.bild?'':' qr')+'" src="'+esc(bild)+'" alt=""><div class="i-txt"><div class="i-t">'+rich(f.titel)+'</div>'+(f.unter?'<div class="i-u">'+rich(f.unter)+'</div>':'')+'</div></div>');
    }
    if(!rows.length) return '';
    return '<div class="k infos"><h3>'+esc(k.titel||'Weitere Infos')+'</h3><div class="rows">'+rows.join('')+'</div></div>';
  }
  /* Mittagstisch nur, wenn die Mittagstisch-Folie gerade gilt (Zeitsteuerung). Sonst keine Kachel. */
  async function mittagstisch(st,k){
    const m=await folie(st,k.folie||'mittagstisch');
    if(!(gilt(m) && Array.isArray(m.liste) && m.liste.length)) return '';
    const rows=m.liste.map(r=>{r=Array.isArray(r)?r:[r,''];return '<div class="row p-row"><span class="n">'+rich(r[0])+'</span><span class="p">'+rich(r[1])+'</span></div>'}).join('');
    return '<div class="k mittag"><h3>'+esc(k.titel||'Heute bei uns · Mittagstisch')+(m.badge?' <span class="k-badge">'+rich(m.badge)+'</span>':'')+'</h3><div class="rows">'+rows+'</div>'+(m.zeit?'<div class="k-fuss">Mittagstisch '+esc(m.zeit.von)+'–'+esc(m.zeit.bis)+' Uhr</div>':'')+'</div>';
  }
  function datumLabel(t,heute,morgen){
    const d=new Date(t.datum+'T12:00:00'), bis=t.bisDatum&&t.bisDatum!==t.datum?new Date(t.bisDatum+'T12:00:00'):null;
    const kurz=x=>x.getDate()+'.'+(x.getMonth()+1)+'.';
    if(bis && t.datum<=heute) return 'bis '+WT[bis.getDay()]+' '+kurz(bis);
    if(bis) return (d.getMonth()===bis.getMonth()?d.getDate()+'.':kurz(d))+'–'+kurz(bis);
    if(t.datum===heute) return 'Heute';
    if(t.datum===morgen) return 'Morgen';
    return WT[d.getDay()]+' '+kurz(d);
  }
  function termine(st,k){
    if(!Array.isArray(st.termine)) return '';
    const n=jetzt(), heute=iso(n), mo=new Date(n); mo.setDate(mo.getDate()+1); const morgen=iso(mo);
    const liste=st.termine.map((t,i)=>Object.assign({_i:i},t))
      .filter(t=>t && /^\d{4}-\d{2}-\d{2}$/.test(t.datum||'') && t.titel && (t.bisDatum||t.datum)>=heute)
      .sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:a._i-b._i)
      .slice(0, Number(k.max)||4);
    if(!liste.length) return '';
    const rows=liste.map(t=>'<div class="row t-row"><span class="d">'+esc(datumLabel(t,heute,morgen))+'</span><span class="n">'+esc(t.titel)+(t.zeit?' <span class="z">· '+esc(t.zeit)+'</span>':'')+'</span></div>').join('');
    return '<div class="k termine"><h3>'+esc(k.titel||'Termine')+'</h3><div class="rows">'+rows+'</div></div>';
  }
  async function qr(st,k){
    const f=await folie(st,k.folie||'reservieren');
    if(!f||!f.qr) return '';
    return '<div class="k klein qr-k"><img src="'+esc(f.qr)+'" alt=""><div><div class="q-t">'+rich(f.titel)+'</div>'+(f.link?'<div class="q-l">'+esc(f.link)+'</div>':'')+'</div></div>';
  }
  const RENDER={wetter, teaser, infos, mittagstisch, termine, qr};

  /* ---------- Aufbau, Anpassen, Takt ---------- */
  async function render(st){
    const spalten={links:[],rechts:[]};
    const reihen=st.kacheln.filter(k=>k.aktiv!==false && RENDER[k.typ] && (k.bereich==='links'||k.bereich==='rechts'||!k.bereich));
    const html=new Map();
    for(const k of reihen){
      try{ html.set(k, await RENDER[k.typ](st,k) || ''); }catch(e){ console.warn('Kachel übersprungen:',k.typ,e); html.set(k,''); }
    }
    /* "ersetzt": eine sichtbare Kachel (z. B. Mittagstisch) nimmt den Platz einer anderen (z. B. Weitere Infos) ein */
    for(const k of reihen){
      if(!k.ersetzt || !html.get(k)) continue;
      const weg=reihen.find(x=>x!==k && x.typ===k.ersetzt);
      if(weg){ reihen.splice(reihen.indexOf(k),1); reihen[reihen.indexOf(weg)]=k; }
    }
    for(const k of reihen){
      const h=html.get(k); if(!h) continue;
      spalten[k.bereich==='links'?'links':'rechts'].push({klein:!!k.klein,h});
    }
    const spalte=(name,arr)=>{
      if(!arr.length) return '';
      let out='', kl=[];
      const flush=()=>{ if(kl.length){ out+='<div class="k-reihe">'+kl.join('')+'</div>'; kl=[]; } };
      for(const x of arr){ if(x.klein) kl.push(x.h); else { flush(); out+=x.h; } }
      flush();
      return '<div class="d-col '+name+'">'+out+'</div>';
    };
    const kopfHtml=kopf();
    const neu=kopfHtml+'<div class="d-body">'+spalte('links',spalten.links)+spalte('rechts',spalten.rechts)+'</div>';
    if(neu!==st.letztes){
      st.letztes=neu;
      st.el.innerHTML='<div class="d-wrap">'+neu+'</div>';
      st.el.querySelectorAll('img').forEach(im=>{im.onerror=function(){const k=im.closest('.row,.k.klein'); if(k) k.remove(); else im.remove(); passen(st);}});
      const t=st.el.querySelector('.k.teaser');
      if(t){const pre=new Image(); pre.onerror=function(){t.remove(); passen(st)}; pre.src=t.dataset.bild;}
      uhr(st);
      passen(st);
      /* Vor dem Laden der Schriften wird falsch gemessen: danach einmal komplett neu aufbauen */
      if(document.fonts && document.fonts.status!=='loaded') document.fonts.ready.then(()=>{st.letztes=''; render(st).catch(()=>{});});
    }
  }
  /* Passt eine Spalte nicht, werden Zeilen weggelassen (nie Schrift unter Mindestgröße, nie abgeschnitten):
     erst lange Listen auf 3 Zeilen kürzen, dann kleine Kacheln weglassen, dann bis auf 1 Zeile, zuletzt ganze Kacheln. */
  function passen(st){
    const el=st.el;
    const t=el.querySelector('.k.teaser');
    /* Wird das Foto zu klein (z. B. langer Mittagstisch darunter), Teaser ganz weglassen */
    if(t && t.clientHeight<window.innerHeight*0.24){ t.remove(); }
    else if(t){ for(const sel of ['.t-ov p','.t-ov h2']){ const ov=t.querySelector('.t-ov'); if(ov && ov.scrollHeight>t.clientHeight+2){ const x=t.querySelector(sel); if(x) x.remove(); } } }
    el.querySelectorAll('.d-col').forEach(col=>{
      const voll=()=>col.scrollHeight>col.clientHeight+2;
      for(let n=0;n<80 && voll();n++){ 
        const kach=[...col.querySelectorAll('.k')];
        const mitRows=min=>kach.map(k=>({k,r:k.querySelectorAll('.rows > .row')})).filter(x=>x.r.length>min).sort((a,b)=>b.r.length-a.r.length)[0];
        let x=mitRows(3);
        if(x){ x.r[x.r.length-1].remove(); continue; }
        const reihe=col.querySelector('.k-reihe');
        if(reihe){ reihe.remove(); continue; }
        x=mitRows(1);
        if(x){ x.r[x.r.length-1].remove(); continue; }
        const letzte=kach.filter(k=>!k.classList.contains('teaser')).pop();
        if(letzte) letzte.remove(); else break;
      }
      if(!col.querySelector('.k')) col.remove();
    });
  }
  function uhr(st){
    const n=jetzt();
    const d=st.el.querySelector('.d-datum'), u=st.el.querySelector('.d-uhr');
    if(d) d.textContent=n.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    if(u) u.textContent=hhmm(n);
  }
  function build(f,el){
    const kacheln=Array.isArray(f.kacheln)?f.kacheln:[];
    const st={f,el,kacheln,folien:{},wetter:null,termine:null,letztes:''};
    el.innerHTML='<div class="d-wrap"></div>';
    const r=()=>render(st).catch(e=>console.warn('Dashboard',e));
    const wk=kacheln.find(k=>k.typ==='wetter'&&k.aktiv!==false);
    const tk=kacheln.find(k=>k.typ==='termine'&&k.aktiv!==false);
    Promise.all([
      wk?ladeWetter(st,wk):null,
      tk?ladeTermine(st,tk.quelle||'termine.json'):null
    ].map(p=>Promise.resolve(p).catch(()=>{}))).then(r);
    r();
    if(wk) setInterval(()=>ladeWetter(st,wk).then(r),WETTER_MS);
    if(tk) setInterval(()=>ladeTermine(st,tk.quelle||'termine.json').then(r),TERMINE_MS);
    setInterval(r,RENDER_MS);
    setInterval(()=>uhr(st),10000);
    global.addEventListener('resize',()=>{st.letztes='';r();});
  }
  global.TVDashboard={build, wmo, icon};
})(window);
