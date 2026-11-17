/* ===== Aportación periódica (DCA) automática: el día DCA_DAY de cada mes posterior al extracto se añaden
   las unidades del plan a cada activo, al precio de ese día. Se guarda en este navegador. ===== */
const DCA_DAY=2,LS_DCA='carteraDCA2';
let dcaStore=(()=>{try{const o=JSON.parse(localStorage.getItem(LS_DCA)||'{}');return {list:Array.isArray(o.list)?o.list:[],skip:Array.isArray(o.skip)?o.skip:[]}}catch(e){return {list:[],skip:[]}}})();
// Los meses que ya cubre el extracto se descartan: el extracto manda.
dcaStore.list=dcaStore.list.filter(x=>x&&typeof x.ym==='string'&&x.ym>STATEMENT.ym&&Number(x.eur)>0);dcaStore.skip=dcaStore.skip.filter(ym=>typeof ym==='string'&&ym>STATEMENT.ym);
function saveDca(){try{localStorage.setItem(LS_DCA,JSON.stringify(dcaStore))}catch(e){}}
const dcaApplied=x=>Array.isArray(x.legs)&&x.legs.length>0;
function dcaTotal(){return dcaStore.list.reduce((s,x)=>s+x.eur,0)}
function dcaCash(){return dcaStore.list.filter(x=>!dcaApplied(x)).reduce((s,x)=>s+x.eur,0)}
const ym2=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthName=ym=>{const [y,m]=ym.split('-');return new Date(+y,+m-1,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'})};
const dayStr=d=>d.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
const dayKeyOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function planLegs(){return (typeof PLAN!=='undefined'?PLAN:[]).map(p=>({t:p[0].split(' ')[0],usd:Number(p[1])||0})).filter(l=>l.usd>0&&D.assets.some(a=>a.t===l.t&&!a.custom))}
function planUsd(){return planLegs().reduce((s,l)=>s+l.usd,0)}
// Precio de cierre del primer día de mercado a partir de la fecha (histórico diario de un año); si la fecha es hoy y no hay cierre, el precio actual.
function priceOn(t,dayKey){
 const q=priceCache[t]||{};
 if(Array.isArray(q.closesY)&&Array.isArray(q.timesY)&&q.timesY.length===q.closesY.length){for(let i=0;i<q.timesY.length;i++)if(moodDk(q.timesY[i])>=dayKey)return {price:q.closesY[i],when:moodDk(q.timesY[i])}}
 if(q.mtime&&q.price>0&&moodDk(q.mtime)>=dayKey)return {price:q.price,when:moodDk(q.mtime)};
 return null;
}
// Cambio EUR/USD del día de la aportación (histórico diario de un año), como hace eToro al convertir.
let fxHist=null,fxHistState='idle';
function ensureFxHist(){if(fxHistState!=='idle')return;fxHistState='loading';yahooRange('EURUSD=X','1y').then(h=>{fxHist=h;fxHistState='ok';scheduleApp()}).catch(()=>{fxHistState='fail';scheduleApp()})}
function fxOn(dayKey){if(!fxHist)return null;for(let i=0;i<fxHist.times.length;i++)if(moodDk(fxHist.times[i])>=dayKey)return fxHist.closes[i];return null}
// Unidades por activo para una aportación en una fecha: importe USD / precio en USD de ese día.
function buildLegs(dayKey){
 let fx=fxOn(dayKey);if(!(fx>0)){if(fxHistState==='fail')fx=fxRate();else{ensureFxHist();return null}}
 const legs=[];
 for(const l of planLegs()){const q=priceCache[l.t];if(!q||!(q.unitEur>0)||!(q.price>0))return null;const p=priceOn(l.t,dayKey);if(!p)return null;
  const c=String(q.currency||'').toUpperCase(),priceUsd=c==='USD'?p.price:c==='EUR'?p.price*fx:p.price*(q.unitEur/q.price)*fx;legs.push({t:l.t,usd:l.usd,price:+p.price.toFixed(4),cur:q.currency||'',when:p.when,units:+(l.usd/priceUsd).toFixed(6)})}
 return legs.length?{legs,fx:+fx.toFixed(4)}:null;
}
function applyLegs(e,sign){e.legs.forEach(l=>{const a=D.assets.find(x=>x.t===l.t);if(!a||a.custom)return;a.u=+(a.u+sign*l.units).toFixed(6);a.cost=+(a.cost+sign*l.usd).toFixed(2);const q=priceCache[l.t];if(q&&q.unitEur>0)q.eurValue=q.unitEur*a.u})}
function dcaAutoRun(now){
 now=now||new Date();let changed=false;
 const [sy,sm]=STATEMENT.ym.split('-').map(Number);let y=sy,m=sm+1;if(m>12){m=1;y++}
 while(y<now.getFullYear()||(y===now.getFullYear()&&m<=now.getMonth()+1)){
  const ym=y+'-'+String(m).padStart(2,'0'),due=new Date(y,m-1,DCA_DAY);
  if(due<=now&&!dcaStore.skip.includes(ym)){
   let e=dcaStore.list.find(x=>x.ym===ym);
   if(!e){const usd=planUsd();if(usd>0){e={ym,day:dayKeyOf(due),usd,fx:+fxRate().toFixed(4),eur:+(usd/fxRate()).toFixed(2),legs:[]};dcaStore.list.push(e);changed=true}}
   if(e&&!dcaApplied(e)){const b=buildLegs(e.day);if(b){e.legs=b.legs;e.usd=+b.legs.reduce((s,l)=>s+l.usd,0).toFixed(2);e.fx=b.fx;e.eur=+(e.usd/b.fx).toFixed(2);e.applied=dayKeyOf(new Date());applyLegs(e,1);changed=true}}
  }
  m++;if(m>12){m=1;y++}
 }
 if(changed)saveDca();
 return changed;
}
function dcaInit(){dcaStore.list.forEach(e=>{if(dcaApplied(e))applyLegs(e,1)});dcaAutoRun();if(dcaTotal()>0)syncInvested()}
function dcaUndo(ym){const e=dcaStore.list.find(x=>x.ym===ym);if(!e)return;if(dcaApplied(e))applyLegs(e,-1);dcaStore.list=dcaStore.list.filter(x=>x.ym!==ym);if(!dcaStore.skip.includes(ym))dcaStore.skip.push(ym);saveDca();afterDcaChange()}
function dcaRedo(ym){dcaStore.skip=dcaStore.skip.filter(x=>x!==ym);saveDca();dcaAutoRun();afterDcaChange()}
function afterDcaChange(){syncInvested();renderPriceSummary();scheduleApp()}
function dcaLast(){
 const st=D.monthlyFlows.slice().reverse().find(r=>Number(r[1])>0),applied=dcaStore.list.filter(dcaApplied).sort((a,b)=>a.ym<b.ym?1:-1)[0];
 if(applied)return {ym:applied.ym,eur:applied.eur,src:'añadida automáticamente el '+applied.day.split('-').reverse().join('/')};
 return st?{ym:st[0],eur:usdToEur(st[1]),src:'extracto eToro'}:null;
}
function dcaLatestApplied(){return dcaStore.list.filter(dcaApplied).sort((a,b)=>a.ym<b.ym?1:-1)[0]||null}
function renderDca(){
 const el=document.getElementById('dcaCard');if(!el)return;
 if(dcaAutoRun()){setTimeout(afterDcaChange,0)}
 const now=new Date(),thisYm=ym2(now),due=new Date(now.getFullYear(),now.getMonth(),DCA_DAY),plan=planUsd()/fxRate(),last=dcaLast(),base=INVESTED_EUR+customCost();
 const e=dcaStore.list.find(x=>x.ym===thisYm),skipped=dcaStore.skip.includes(thisYm),inStatement=thisYm<=STATEMENT.ym;
 let next=due;if(now>=due&&(inStatement||e||skipped))next=new Date(now.getFullYear(),now.getMonth()+1,DCA_DAY);
 const legsHtml=x=>`<details class="dlegs"><summary>${x.legs.length} activos · ${x.usd} $ al cambio ${x.fx}</summary><div class="dleg-grid">${x.legs.map(l=>`<span><b>${esc(l.t)}</b> ${fmt(l.units,6)} u · ${fmt(l.price,2)} ${esc(l.cur)}${l.when!==x.day?' <small>('+l.when.slice(5).split('-').reverse().join('/')+')</small>':''} · ${l.usd} $</span>`).join('')}</div></details>`;
 const invRow=x=>`<span>Capital invertido: ${eur(base+dcaTotal()-x.eur)} → <b>${eur(base+dcaTotal())}</b></span>`;
 let status;
 if(inStatement){const st=D.monthlyFlows.find(r=>r[0]===thisYm);status=`<div class="dcaok"><b>✓ ${monthName(thisYm)}: incluida en el extracto eToro del ${STATEMENT.dateEs}</b>${st&&st[1]>0?`<span>${eur(usdToEur(st[1]))} depositados (${fmt(st[1],2)} $)</span>`:''}</div>`}
 else if(skipped)status=`<div class="dcapend"><b>${monthName(thisYm)}: marcada como no realizada</b><button type="button" class="chip" data-act="dcaRedo" data-ym="${thisYm}">Volver a añadir</button></div>`;
 else if(e&&dcaApplied(e))status=`<div class="dcaok"><b>✓ Aportación de ${monthName(thisYm)} añadida automáticamente</b><span>${eur(e.eur)} el ${e.day.split('-').reverse().join('/')}</span>${invRow(e)}${legsHtml(e)}<button type="button" class="chip" data-act="dcaUndo" data-ym="${thisYm}">Deshacer</button></div>`;
 else if(e)status=`<div class="dcapend"><b>Aportación de ${monthName(thisYm)}: ${eur(e.eur)} sumados como efectivo</b><span class="muted">Las unidades se asignarán en cuanto haya precios del día ${DCA_DAY}.</span><button type="button" class="chip" data-act="dcaUndo" data-ym="${thisYm}">Deshacer</button></div>`;
 else status=`<div class="dcapend"><b>Próxima aportación: ${dayStr(due)}</b><span class="muted">Se añadirá automáticamente ese día, repartida según el plan.</span></div>`;
 const prev=dcaStore.list.filter(x=>x.ym!==thisYm).sort((a,b)=>a.ym<b.ym?1:-1);
 const hist=prev.length?`<div class="dcahist"><span class="lbl" style="display:block;margin:14px 0 6px">Aportaciones automáticas anteriores</span>${prev.map(x=>`<div class="dcarow"><span>${monthName(x.ym)}</span><span>${eur(x.eur)}</span><span class="muted">${dcaApplied(x)?x.legs.length+' activos':'efectivo'}</span><button type="button" class="chip" data-act="dcaUndo" data-ym="${x.ym}">Deshacer</button></div>`).join('')}</div>`:'';
 el.innerHTML=`<span class="lbl">Aportación periódica (DCA)</span><div class="dcagrid"><div class="metric"><span class="muted">Plan mensual</span><b>${eur(plan)}</b><small class="muted">${planUsd()} $ el día ${DCA_DAY} de cada mes · ${planLegs().length} activos</small></div><div class="metric"><span class="muted">Última aportación</span><b>${last?eur(last.eur):'—'}</b><small class="muted">${last?monthName(last.ym)+' · '+last.src:'sin registro'}</small></div><div class="metric"><span class="muted">Siguiente</span><b>${dayStr(next)}</b><small class="muted">automática</small></div></div>${status}${hist}<p class="muted" style="font-size:12px;margin:10px 0 0">Cada día ${DCA_DAY} se añaden las unidades del plan (${planLegs().map(l=>l.t+' '+l.usd+' $').join(' · ')}) al precio de cierre de ese día, y el importe se suma al capital invertido. Cuando cargues un extracto nuevo, el extracto sustituye a estas aportaciones. Se guardan en este navegador.</p>`;
 const an=document.getElementById('allocNote');if(an){const la=dcaLatestApplied();an.textContent='Posiciones según el extracto eToro del '+STATEMENT.dateEs+(la?' · actualizado el '+la.day.split('-').reverse().join('/')+' con '+eur(la.eur)+' (aportación automática)':'')+'.'}
}
