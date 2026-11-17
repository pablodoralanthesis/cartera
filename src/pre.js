/* ===== Panel: estado y vistas nuevas (usa los datos y cálculos originales definidos más abajo) ===== */
let lastProj=null,appT=null,dailyTab='standout',curView='dashboard',curAsset=null,newsItems=[],newsState='idle',remoteQ=null,remoteRes=[],remoteState='idle',remoteT=null,pendingAdd=null;
const USER_NAME='Pablo',CAPTURE_EUR=STATEMENT.equityEur,INVESTED_EUR=STATEMENT.realizedEur,fxExtra={},LS_CUSTOM='carteraCustom';
const TREND={up:['ALCISTA','↗','g'],down:['BAJISTA','↘','r'],neutral:['NEUTRAL','→','']};
const NEWS_BASE=[
 {t:'TSM',q:'TSM',re:/TSMC|Taiwan Semi|\bTSM\b/i},
 {t:'SAP.DE',q:'SAP SE',re:/\bSAP\b/},
 {t:'MC.PA',q:'LVMH',re:/LVMH|Louis Vuitton|Arnault/i},
 {t:'CNDX.L',q:'QQQ',re:/Nasdaq|\bQQQ\b/i},
 {t:'CSPX.L',q:'SPY',re:/S&P|Wall Street|Stock Market Today|US Equities/i},
 {t:'IUSQ.DE',q:'ACWI',re:/ACWI|global (stocks|shares|equit)|International ETFs/i},
 {t:'PPFB.DE',q:'GLD',re:/\bgold\b(?!\.com)/i},
 {t:'WSLV.L',q:'SLV',re:/\bsilver\b|\bSLV\b/i},
 {t:'MEUS.L',q:'STOXX',re:/STOXX|Europe/i},
 {t:'IJPA.L',q:'EWJ',re:/Japan|Nikkei|\bEWJ\b/i},
 {t:'ICGA.DE',q:'FXI',re:/China|Chinese|Beijing|Hang Seng/i}
];
function newsQueries(){
 const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),generic=/^(ishares|invesco|vanguard|spdr|direxion|amundi|wisdomtree|xtrackers|lyxor|the|global|first)$/i;
 const base=NEWS_BASE.filter(b=>D.assets.some(a=>a.t===b.t));
 const cust=D.assets.filter(a=>a.custom).map(a=>{const sym=a.t.split(/[.\-=]/)[0].replace(/\^/g,'')||a.t,w=a.n.split(' ')[0]||'',useW=w.length>=4&&!generic.test(w);return {t:a.t,q:sym,re:new RegExp('\\b'+reEsc(sym)+'\\b'+(useW?'|'+reEsc(w):''),'i')}});
 return [...base,...cust];
}
const svgIco=p=>'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
const ICO={
 search:svgIco('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
 dash:svgIco('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
 brief:svgIco('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 20V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v15"/>'),
 news:svgIco('<path d="M6 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 1-4 0v-8h4"/><path d="M10 8h6M10 12h6M10 16h4"/>'),
 trend:svgIco('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
 file:svgIco('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
 refresh:svgIco('<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>'),
 plus:svgIco('<path d="M12 5v14M5 12h14"/>'),
 sun:svgIco('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
 list:svgIco('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
 trash:svgIco('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')
};
/* --- Activos añadidos por el usuario (se guardan en este navegador) --- */
function cleanSym(s){s=String(s||'').trim().toUpperCase();return /^[A-Z0-9.\-=^]{1,20}$/.test(s)?s:''}
function cleanName(s){return String(s||'').replace(/[<>&"'`\\]/g,'').replace(/\s+/g,' ').trim().slice(0,80)}
function makeCustom(o){const t=cleanSym(o.t);if(!t)return null;return {t,n:cleanName(o.n)||t,u:Math.max(0,Number(o.u)||0),costEur:Math.max(0,Number(o.costEur)||0),custom:true,cc:'EUR',quote:t,get cost(){return this.costEur*fxRate()}}}
function loadCustom(){try{const L=JSON.parse(localStorage.getItem(LS_CUSTOM)||'[]');if(Array.isArray(L))L.forEach(o=>{const a=makeCustom(o||{});if(a&&!D.assets.some(x=>x.t===a.t))D.assets.push(a)})}catch(e){}}
function saveCustom(){try{localStorage.setItem(LS_CUSTOM,JSON.stringify(D.assets.filter(a=>a.custom).map(a=>({t:a.t,n:a.n,u:a.u,costEur:a.costEur}))))}catch(e){}}
function customCost(){return D.assets.reduce((s,a)=>s+(a.custom?a.costEur:0),0)}
function syncInvested(){const el=document.getElementById('investedStart');if(el&&!el.dataset.touched)el.value=(INVESTED_EUR+customCost()+dcaTotal()).toFixed(2);simulate()}
async function toEURExtra(price,currency){const c=String(currency||'').toUpperCase();if(!/^[A-Z]{3}$/.test(c))return null;try{const m=await yahooChart(c+'EUR=X'),r=Number(m.regularMarketPrice);if(r>0){fxExtra[c]=r;return price*r}}catch(e){}return null}
function afterAssetsChange(){syncInvested();renderPriceSummary();newsState='idle';loadNews()}
function confirmAdd(){
 const r=pendingAdd;if(!r)return;
 const a=makeCustom({t:r.t,n:r.n,u:document.getElementById('addU').value,costEur:document.getElementById('addC').value});
 if(!a||D.assets.some(x=>x.t===a.t)){closeSearch();closeAdd();return}
 D.assets.push(a);saveCustom();afterAssetsChange();closeSearch();closeAdd();location.hash='#/t/'+encodeURIComponent(a.t);
 const b=document.getElementById('refreshPrices');if(b&&!b.disabled)refreshPrices(true);
}
function removeAsset(t){
 const i=D.assets.findIndex(a=>a.t===t&&a.custom);if(i<0)return;
 if(!confirm('¿Quitar '+t+' de la cartera?'))return;
 D.assets.splice(i,1);delete priceCache[t];saveCustom();afterAssetsChange();
 if(curView==='asset'&&curAsset===t)location.hash='#/portfolio';
}
function scheduleApp(){clearTimeout(appT);appT=setTimeout(renderApp,30)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sgn(n){return n>=0?'+':''}
function dayPctOf(meta,price){const r=Number(meta.regularMarketChangePercent);if(Number.isFinite(r))return r;const p=Number(meta.chartPreviousClose||meta.previousClose);return p>0?(price/p-1)*100:null}
function assetStats(a){
 const q=priceCache[a.t]||previewCache[a.t]||{},v=q.eurValue>0?q.eurValue:null,cost=usdToEur(a.cost),cl=Array.isArray(q.closes)?q.closes.filter(x=>x>0):[];
 const chg=n=>cl.length>n?(cl[cl.length-1]/cl[cl.length-1-n]-1)*100:null;
 const month=Number.isFinite(q.monthPct)?q.monthPct:q.monthBaseEur>0?q.monthChangeEur/q.monthBaseEur*100:null,hasCost=v!=null&&cost>0;
 return {a,q,v,cost,cl,pl:hasCost?v-cost:null,plPct:hasCost?(v-cost)/cost*100:null,day:Number.isFinite(q.dayPct)?q.dayPct:chg(1),week:chg(5),month,trend:month==null?'neutral':month>2?'up':month<-2?'down':'neutral',w:0};
}
function allStats(){
 const L=D.assets.map(assetStats),total=L.reduce((s,x)=>s+(x.v||0),0),cash=STATEMENT.cashEur,dca=dcaTotal(),est=total+cash+dcaCash(),inv=INVESTED_EUR+customCost()+dca,pl=est-inv;
 L.forEach(x=>{x.w=x.v&&total?x.v/total*100:0});
 return {L,total,cash,est,pl,plPct:pl/inv*100};
}
function spark(cl,w,h,color){
 if(cl.length<2)return '<div class="spark"></div>';
 const mn=Math.min(...cl),mx=Math.max(...cl),r=mx-mn||1,pts=cl.map((c,i)=>[(i/(cl.length-1)*(w-6)+3).toFixed(1),(h-4-(c-mn)/r*(h-8)).toFixed(1)]),last=pts[pts.length-1];
 return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p=>p.join(',')).join(' ')}"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${color}"/></svg>`;
}
function tileHTML(a){
 const s=assetStats(a),t=TREND[s.trend];
 const val=a.u>0?(s.v==null?'—':eur(s.v))+(s.plPct==null?'':' · '+sgn(s.plPct)+pct(s.plPct)):(s.q.price>0?fmt(s.q.price,2)+' '+esc(s.q.currency||'')+' · ':'')+'seguimiento';
 const del=a.custom?`<button type="button" class="tdel" data-act="del" data-t="${esc(a.t)}" title="Quitar de la cartera" aria-label="Quitar ${esc(a.t)} de la cartera">${ICO.trash}</button>`:'';
 return `<a class="tile ${s.trend}" href="#/t/${encodeURIComponent(a.t)}">${del}<span class="tag">${t[1]} ${t[0]}</span><div class="tk">${esc(a.t)}</div><div class="nm">${esc(a.n)}</div>${spark(s.cl,150,36,'#fff')}<div class="tv">${val}</div><div class="foot">${s.week==null?'SIN HISTÓRICO':'5 SESIONES '+sgn(s.week)+pct(s.week)}</div></a>`;
}
function addTileHTML(){return `<button type="button" class="tile add" data-act="add"><span class="plus">+</span><span>Añadir activo</span><small>Busca por nombre o ticker</small></button>`}
function ago(ts){if(!ts)return '';const d=Math.floor((Date.now()/1000-ts)/86400);return d<=0?'hoy':'hace '+d+' d'}
function newsHTML(items,max){return items.slice(0,max).map(n=>`<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer"><div class="meta"><span>${esc(n.pub)}${n.ts?' · '+ago(n.ts):''}</span><span>${esc(n.t)}</span></div><div class="ti">${esc(n.title)}</div></a>`).join('')}
function newsFallback(list){return list.map(a=>`<a href="https://finance.yahoo.com/quote/${encodeURIComponent(a.t)}/news" target="_blank" rel="noopener noreferrer"><div class="meta"><span>Yahoo Finance</span><span>${esc(a.t)}</span></div><div class="ti">Ver noticias de ${esc(a.n)}</div></a>`).join('')}
async function loadNews(){
 if(newsState!=='idle')return;newsState='loading';
 const Q=newsQueries(),sig=Q.map(x=>x.t).join(',');
 try{const c=JSON.parse(sessionStorage.getItem('carteraNews3')||'null');if(c&&c.sig===sig&&Array.isArray(c.items)&&c.items.length&&Date.now()-c.ts<18e5){newsItems=c.items;newsState='ok';scheduleApp();return}}catch(e){}
 const res=await Promise.allSettled(Q.map(async x=>{
  const url='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(x.q)+'&newsCount=12&quotesCount=0';
  const r=await fetch(YF_PROXY+url,{credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json();
  // Solo se aceptan titulares que nombran el activo: la relación por tickers de la fuente resultó demasiado laxa.
  return (j&&Array.isArray(j.news)?j.news:[]).filter(n=>{const title=String(n.title||'');return x.re.test(title)&&!/^BC-/.test(title)}).slice(0,6).map(n=>({t:x.t,title:String(n.title||''),link:String(n.link||''),pub:String(n.publisher||''),ts:Number(n.providerPublishTime)||0}));
 }));
 if(sig!==newsQueries().map(x=>x.t).join(',')){newsState='idle';loadNews();return}
 const lists=res.map(r=>r.status==='fulfilled'?r.value:[]),mixed=[];
 for(let i=0;i<6;i++)lists.forEach(l=>{if(l[i])mixed.push(l[i])});
 const seen=new Set(),items=mixed.filter(n=>n.title&&/^https:\/\//.test(n.link)&&!seen.has(n.link)&&!seen.has(n.title)&&seen.add(n.link)&&seen.add(n.title)).slice(0,80);
 newsItems=items;newsState=items.length?'ok':'fail';
 try{if(items.length)sessionStorage.setItem('carteraNews3',JSON.stringify({ts:Date.now(),sig,items}))}catch(e){}
 scheduleApp();
}
/* Columnas por fecha: las últimas 7 sesiones (unión de fechas de todos los activos) con su día de la semana */
const moodDk=ts=>{const d=new Date(ts*1000);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const WD=['L','M','X','J','V','S','D'];
function moodCols(){const now=new Date(),mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const d=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i);return {k:moodDk(d.getTime()/1000),d,wd:WD[i],off:i>=5||d>now}})}
function moodHead(){return `<div class="moodrow moodhead" aria-hidden="true"><span></span><span class="sq">${moodCols().map(c=>`<b class="wd${c.off?' off':''}" title="${c.d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}">${c.wd}</b>`).join('')}</span><span></span></div>`}
function renderDash(S){
 const n=S.L.length,h=new Date().getHours(),el=id=>document.getElementById(id);
 el('greet').textContent=(h<6?'Buenas noches':h<13?'Buenos días':h<21?'Buenas tardes':'Buenas noches')+(USER_NAME?', '+USER_NAME:'');
 const today=new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
 document.querySelectorAll('.js-today').forEach(e=>{e.textContent=today.charAt(0).toUpperCase()+today.slice(1)});
 const fresh=S.L.filter(x=>x.q.fresh).length,hist=S.L.filter(x=>x.cl.length>1).length;
 const steps=[['Precios '+fresh+'/'+n,fresh===n,'refresh'],['Cambio EUR/USD',statementFxRate!==1.1195],['Histórico '+hist+'/'+n,hist===n],['Proyección',!!lastProj]],done=steps.filter(s=>s[1]).length,left=steps.length-done;
 el('status').innerHTML=`<div class="lbl">Estado de los datos <span style="letter-spacing:0;text-transform:none;font-family:Inter,sans-serif;font-size:14.5px">· ${left?left+' pendiente'+(left>1?'s':''):'todo al día'}</span></div><div class="pbar"><i style="width:${done/steps.length*100}%"></i></div><div class="steps">${steps.map(s=>`<span class="${s[1]?'done':'todo'}"><i class="dot">${s[1]?'✓':''}</i>${s[0]}${!s[1]&&s[2]?` <button class="chip" data-act="${s[2]}" type="button">Actualizar</button>`:''}</span>`).join('')}</div>`;
 const mb=S.L.reduce((s,x)=>s+(x.q.monthBaseEur>0?x.q.monthBaseEur:0),0),mc=S.L.reduce((s,x)=>s+(x.q.monthBaseEur>0?x.q.monthChangeEur:0),0);
 let b=`Tu cartera vale ${eur(S.est)}: ${S.pl>=0?'ganas':'pierdes'} <span class="${S.pl>=0?'g':'r'}">${eur(Math.abs(S.pl))} (${sgn(S.plPct)}${pct(S.plPct)})</span> sobre lo invertido.`;
 if(mb>0)b+=` En el último mes tus posiciones han ${mc>=0?'subido':'bajado'} <span class="${mc>=0?'g':'r'}">${eur(Math.abs(mc))} (${sgn(mc)}${pct(mc/mb*100)})</span>.`;
 el('brief').innerHTML=b;
 const per=(k,l)=>{const B=S.L.reduce((s,x)=>s+(x.q[k+'BaseEur']>0?x.q[k+'BaseEur']:0),0),C=S.L.reduce((s,x)=>s+(x.q[k+'BaseEur']>0?x.q[k+'ChangeEur']:0),0);return B>0?`<span><small>${l}</small><b class="${C>=0?'g':'r'}">${sgn(C)}${eur(C)} (${sgn(C)}${pct(C/B*100)})</b></span>`:`<span><small>${l}</small><b class="muted">—</b></span>`};
 el('briefRow').innerHTML=per('month','1 mes')+per('m3','3 meses')+per('m6','6 meses')+per('y1','1 año');
 const withDay=S.L.filter(x=>x.day!=null),best=withDay.slice().sort((x,y)=>y.day-x.day)[0];
 el('standMini').innerHTML=`<div class="bign"><b>${n}</b>activos en cartera</div><div class="muted" style="font-size:15px;margin-top:12px">${best?`${esc(best.a.t)} destaca <span class="${best.day>=0?'g':'r'}">${sgn(best.day)}${pct(best.day)}</span> en la última sesión`:'Sin variación diaria todavía'}</div>`;
 const up=withDay.filter(x=>x.day>.2).length,dn=withDay.filter(x=>x.day<-.2).length,fl=withDay.length-up-dn,tot=Math.max(1,withDay.length);
 el('mood').innerHTML=`<div class="moodbar"><i style="width:${up/tot*100}%;background:var(--up)"></i><i style="width:${fl/tot*100}%;background:#69728a"></i><i style="width:${dn/tot*100}%;background:var(--dn)"></i></div><div class="moodleg"><span style="--c:var(--up)">${up} suben</span><span style="--c:#69728a">${fl} planos</span><span style="--c:var(--dn)">${dn} bajan</span></div>`+moodHead()+S.L.map(x=>{
  const sq=[],tm=Array.isArray(x.q.times)&&x.q.times.length===x.cl.length?x.q.times.map(moodDk):[];
  moodCols().forEach(c=>{const k=tm.indexOf(c.k);if(k<1){sq.push(c.off?'x off':'x');return}const dv=(x.cl[k]/x.cl[k-1]-1)*100;sq.push(dv>.2?'g':dv<-.2?'r':'')});
  return `<a class="moodrow" href="#/t/${encodeURIComponent(x.a.t)}" title="Semana actual, de lunes a domingo"><span>${esc(x.a.t)}</span><span class="sq">${sq.map(s=>`<i class="${s}"></i>`).join('')}</span><span class="${x.week==null?'':x.week>=0?'g':'r'}">${x.week==null?'—':sgn(x.week)+fmt(x.week,1)+'%'}</span></a>`}).join('');
 el('moodMore').textContent='Los '+n+' activos →';
 const held=S.L.filter(x=>x.pl!=null),pos=held.filter(x=>x.pl>=0).length;
 el('portCard').innerHTML=`<div class="bign"><b>${pos}</b>de ${held.length} posiciones en positivo</div><div class="pbar ac" style="margin:16px 0 12px"><i style="width:${held.length?pos/held.length*100:0}%"></i></div>
 <a class="prow" href="#/portfolio">${ICO.brief}<span><b>Abrir cartera</b><small>Cada activo con su tendencia</small></span><span>→</span></a>
 <button class="prow" type="button" data-act="add">${ICO.plus}<span><b>Añadir activo</b><small>Busca por nombre o ticker</small></span><span>→</span></button>
 <a class="prow" href="#/proyeccion">${ICO.trend}<span><b>Proyección</b><small>${lastProj?eur(lastProj.end.nom)+' en '+lastProj.finalYear:'Hasta 2062'}</small></span><span>→</span></a>
 <button class="prow" type="button" data-act="refresh">${ICO.refresh}<span><b>Actualizar precios</b><small>Yahoo Finance · automático cada 10 min</small></span><span>→</span></button>`;
 el('newsList').innerHTML=newsState==='ok'?newsHTML(newsItems,40):newsState==='fail'?newsFallback(D.assets):'<p class="muted">Cargando noticias…</p>';
}
function sortRows(L,def){
 const s=mvSort||{k:def,d:-1},val=x=>s.k==='name'?x.a.t:x[s.k];
 return L.slice().sort((x,y)=>{const a=val(x),b=val(y);if(a==null&&b==null)return 0;if(a==null)return 1;if(b==null)return -1;return (typeof a==='string'?a.localeCompare(b):a-b)*s.d});
}
function moveTable(L,def){
 const cur=mvSort||{k:def,d:-1},c=v=>v==null?'<td>—</td>':`<td class="${v>=0?'g':'r'}">${sgn(v)}${pct(v)}</td>`;
 const head=[['name','Activo'],['day','Última sesión'],['week','5 sesiones'],['month','1 mes'],['v','Valor'],['plPct','Resultado']].map(([k,l])=>`<th aria-sort="${cur.k===k?(cur.d>0?'ascending':'descending'):'none'}"><button type="button" class="thb" data-act="sort" data-k="${k}" data-def="${def}" title="Ordenar por ${l}">${l}<span aria-hidden="true">${cur.k===k?(cur.d>0?'▲':'▼'):'↕'}</span></button></th>`).join('');
 return `<div class="card"><div class="sc"><table><tr>${head}</tr>${sortRows(L,def).map(x=>`<tr data-go="#/t/${encodeURIComponent(x.a.t)}" style="cursor:pointer"><td><b>${esc(x.a.t)}</b><br><span class="muted">${esc(x.a.n)}</span></td>${c(x.day)}${c(x.week)}${c(x.month)}<td>${x.v==null?'—':eur(x.v)}</td>${c(x.plPct)}</tr>`).join('')}</table></div></div>`;
}
function renderDaily(S){
 const n=S.L.length,withDay=S.L.filter(x=>x.day!=null),byDay=withDay.slice().sort((x,y)=>y.day-x.day),byM=S.L.filter(x=>x.month!=null).sort((x,y)=>y.month-x.month);
 const tabs=[['standout','Destacado del día',''],['movers','Mayores movimientos',byDay.length],['month','Tendencia del mes',byM.length]];
 document.getElementById('dailyTabs').innerHTML=tabs.map(t=>`<button type="button" data-act="tab" data-tab="${t[0]}" class="${dailyTab===t[0]?'on':''}">${t[1]}${t[2]!==''?`<small>${t[2]}</small>`:''}</button>`).join('');
 const body=document.getElementById('dailyBody');
 if(dailyTab==='movers'){body.innerHTML=byDay.length?moveTable(byDay,'day'):'<p class="muted">Todavía no hay variación diaria. Actualiza los precios.</p>';return}
 if(dailyTab==='month'){body.innerHTML=byM.length?moveTable(byM,'month'):'<p class="muted">Todavía no hay histórico mensual. Actualiza los precios.</p>';return}
 const x=byDay[0];
 if(!x){body.innerHTML='<div class="card"><p class="muted">Todavía no hay variación diaria. Actualiza los precios para ver el destacado.</p></div>';return}
 const up=withDay.filter(y=>y.day>.2).length,dn=withDay.filter(y=>y.day<-.2).length,t=esc(x.a.t);
 let why=`${t} es la posición de tu cartera con mejor comportamiento en la última sesión (${sgn(x.day)}${pct(x.day)}).`;
 if(x.week!=null)why+=` En las últimas 5 sesiones acumula ${sgn(x.week)}${pct(x.week)}`+(x.month!=null?` y en el último mes ${sgn(x.month)}${pct(x.month)}.`:'.');
 if(x.v!=null)why+=` Tienes ${fmt(x.a.u,4)} unidades valoradas en ${eur(x.v)}, el ${pct(x.w)} de tus posiciones`+(x.pl!=null?`, con un resultado de ${sgn(x.pl)}${eur(x.pl)} (${sgn(x.plPct)}${pct(x.plPct)}) sobre el coste de apertura.`:'.');
 const others=byDay.slice(1,4);
 body.innerHTML=`<div class="card stand"><div><div class="lbl gold" style="letter-spacing:0;text-transform:none;font-family:Inter,sans-serif;font-size:15px;margin-bottom:18px">Destacado del día</div><div class="tkx">${t}</div><div class="pcx ${x.day>=0?'g':'r'}">${sgn(x.day)}${pct(x.day)}</div><p class="muted" style="font-size:16px;margin:12px 0 6px">última sesión${x.q.price>0?' · '+fmt(x.q.price,2)+' '+esc(x.q.currency||''):''}</p><p class="muted" style="font-size:15px;margin:0">${esc(x.a.n)}</p><a class="btn-w" href="#/t/${encodeURIComponent(x.a.t)}">Ver ${t} →</a></div>
 <div><div class="lbl">Por qué destaca</div><p class="why">${why}</p><div class="facts"><b>${n}</b> activos de tu cartera revisados<br><b>${up}</b> suben y <b>${dn}</b> bajan en la última sesión<br><b>${t}</b> destaca<br><span style="font-size:13px">Texto calculado con tus datos y las cotizaciones; no es un análisis ni una recomendación.</span></div></div></div>`
 +(others.length?`<div class="lbl sec-lbl">También destacan</div><div class="hold-grid" style="display:grid">${others.map(o=>tileHTML(o.a)).join('')}</div>`:'');
}
function bigChart(cl){
 if(cl.length<2)return '<p class="muted">Sin histórico todavía; actualiza los precios.</p>';
 const W=700,H=200,p=10,mn=Math.min(...cl),mx=Math.max(...cl),r=mx-mn||1,X=i=>p+i/(cl.length-1)*(W-2*p),Y=c=>H-p-(c-mn)/r*(H-2*p),up=cl[cl.length-1]>=cl[0],col=up?'var(--up)':'var(--dn)',line=cl.map((c,i)=>X(i).toFixed(1)+','+Y(c).toFixed(1)).join(' ');
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cierres del último mes" style="margin:12px 0 4px"><polygon points="${p},${H-p} ${line} ${W-p},${H-p}" fill="${col}" opacity=".12"/><polyline points="${line}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/><text x="${p}" y="14" fill="var(--mu)" font-size="11">máx. ${fmt(mx,2)}</text><text x="${p}" y="${H-1}" fill="var(--mu)" font-size="11">mín. ${fmt(mn,2)}</text></svg>`;
}
function renderApp(){
 const S=allStats();renderDash(S);renderDca();renderDaily(S);
 const c=document.getElementById('assetCount');if(c)c.textContent=S.L.length+' activos · etiqueta según la variación del último mes (±2 %)';
 if(curView==='asset')renderAsset(S);
}
function route(){
 const h=location.hash.replace(/^#\/?/,'')||'dashboard',parts=h.split('/');let v=parts[0];
 if(v==='t'){v='asset';try{curAsset=decodeURIComponent(parts[1]||'')}catch(e){curAsset=''}}
 if(!document.getElementById('v-'+v))v='dashboard';
 curView=v;
 document.querySelectorAll('.view').forEach(s=>{s.hidden=s.id!=='v-'+v});
 document.querySelectorAll('.rail [data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===(v==='asset'?'portfolio':v)));
 closeSearch();renderApp();window.scrollTo(0,0);
}
/* --- Paleta de búsqueda: páginas, acciones, tus activos y mercado --- */
let palItems=[],palSel=0,palMode='all',mvSort=null;
function toggleTheme(){const r=document.documentElement,light=r.dataset.theme==='light';if(light)delete r.dataset.theme;else r.dataset.theme='light';try{localStorage.setItem('carteraTheme',light?'dark':'light')}catch(e){}}
function setPalMode(mode){palMode=mode==='add'?'add':'all';palSel=0;const i=document.getElementById('searchInput');i.value='';i.placeholder=palMode==='add'?'Busca un activo para añadir…':'Buscar páginas, acciones y activos…';fillSearch('');i.focus()}
function buildPal(q){
 const m=s=>!q||s.toLowerCase().includes(q),out=[];
 if(palMode==='all'){
  [['#/dashboard','Panel','dash'],['#/portfolio','Cartera','brief'],['#/daily','Edición diaria','news'],['#/proyeccion','Proyección','trend'],['#/extracto','Extracto eToro','file']].forEach(p=>{if(m(p[1]))out.push({sec:'',ico:ICO[p[2]],label:p[1],go:p[0]})});
  [['add','Añadir activo','plus'],['theme','Cambiar tema','sun'],['view',holdView==='grid'?'Mostrar cartera como lista':'Mostrar cartera como tarjetas','list'],['refresh','Actualizar precios','refresh']].forEach(a=>{if(m(a[1]))out.push({sec:'Acciones',ico:ICO[a[2]],label:a[1],act:a[0]})});
  D.assets.forEach(a=>{if(m(a.t+' '+a.n))out.push({sec:'Tus activos',tk:a.t,label:a.n,right:a.u>0?'En cartera':'Seguimiento',go:'#/t/'+encodeURIComponent(a.t)})});
 }
 if(q.length>=2&&remoteQ===q&&remoteState==='ok')remoteRes.forEach(r=>{
  const own=D.assets.some(a=>a.t===r.t);
  if(!own)out.push({sec:'Mercado · solo ver',tk:r.t,label:r.n,right:r.ex+(r.ty?' · '+r.ty:''),pick:r});
  else if(palMode==='add')out.push({sec:'Mercado · solo ver',tk:r.t,label:r.n,right:'Ya en cartera',go:'#/t/'+encodeURIComponent(r.t)});
 });
 return out;
}
function fillSearch(q){
 q=q.trim().toLowerCase();palItems=buildPal(q);palSel=Math.max(0,Math.min(palSel,palItems.length-1));
 let html='',sec=null,note='';
 palItems.forEach((it,i)=>{
  if(it.sec!==sec){sec=it.sec;if(sec)html+=`<div class="lbl psec">${sec}</div>`}
  html+=`<button type="button" class="pitem${i===palSel?' sel':''}" data-act="pal" data-i="${i}">${it.tk?`<span class="ptk">${esc(it.tk)}</span>`:it.ico}<span class="plab">${esc(it.label)}</span>${it.right?`<small>${esc(it.right)}</small>`:''}<span class="pent" aria-hidden="true">↵</span></button>`;
 });
 if(q.length<2){if(palMode==='add')note='Escribe un nombre o ticker (por ejemplo «Apple» o «VWCE») para buscar activos nuevos.'}
 else if(remoteQ!==q||remoteState==='loading')note='Buscando en el mercado…';
 else if(remoteState==='fail')note='No se pudo consultar el buscador del mercado. Inténtalo de nuevo.';
 else if(!remoteRes.length)note='Sin resultados en el mercado.';
 if(!palItems.length&&!note)note='Sin resultados.';
 if(note)html+=`<div class="muted" style="padding:10px 14px">${note}</div>`;
 const el=document.getElementById('searchRes');el.innerHTML=html;
 const s=el.querySelector('.sel');if(s)s.scrollIntoView({block:'nearest'});
}
function runPal(i){
 const it=palItems[i];if(!it)return;
 if(it.pick){previewNames[it.pick.t]=it.pick.n;closeSearch();location.hash='#/t/'+encodeURIComponent(it.pick.t);return}
 if(it.go){closeSearch();location.hash=it.go;return}
 if(it.act==='add'){closeSearch();openAdd();return}
 closeSearch();
 if(it.act==='theme')toggleTheme();
 else if(it.act==='view'){holdView=holdView==='grid'?'list':'grid';try{localStorage.setItem('carteraView',holdView)}catch(e){}renderHoldings();location.hash='#/portfolio'}
 else if(it.act==='refresh'){const r=document.getElementById('refreshPrices');if(r&&!r.disabled)r.click()}
}
async function searchRemote(q){
 const key=q.trim().toLowerCase();remoteQ=key;remoteState='loading';remoteRes=[];
 try{
  const url='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q.trim())+'&quotesCount=8&newsCount=0';
  const r=await fetch(YF_PROXY+url,{credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json(),res=(j&&Array.isArray(j.quotes)?j.quotes:[]).filter(x=>['EQUITY','ETF','MUTUALFUND','INDEX','CRYPTOCURRENCY'].includes(String(x.quoteType||'').toUpperCase())).map(x=>({t:cleanSym(x.symbol),n:cleanName(x.shortname||x.longname||x.symbol),ex:cleanName(x.exchDisp||x.exchange||''),ty:cleanName(x.typeDisp||x.quoteType||'')})).filter(x=>x.t);
  if(remoteQ!==key)return;remoteRes=res;remoteState='ok';
 }catch(e){if(remoteQ!==key)return;remoteState='fail'}
 if(!document.getElementById('searchOverlay').hidden&&!pendingAdd)fillSearch(document.getElementById('searchInput').value);
}
function showAddForm(r){
 if(!r)return;pendingAdd=r;
 document.getElementById('palHead').hidden=true;document.getElementById('searchRes').hidden=true;
 const f=document.getElementById('addForm');f.hidden=false;
 f.innerHTML=`<div class="addf"><div class="lbl">Añadir activo</div><div><div style="font-size:26px;font-weight:650;letter-spacing:-.02em">${esc(r.t)}</div><div class="muted">${esc(r.n)}${r.ex?' · '+esc(r.ex):''}</div></div>
 <label>Unidades (opcional)<input id="addU" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
 <label>Coste total en € (opcional)<input id="addC" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
 <div class="muted" style="font-size:12.5px">Sin unidades se añade solo en seguimiento. Si indicas unidades, indica también lo que te costaron para que la ganancia sea correcta. Se guarda en este navegador.</div>
 <div class="row"><button type="button" class="ghost" data-act="addCancel">Atrás</button><button type="button" data-act="addOk">Añadir a la cartera</button></div></div>`;
 document.getElementById('addU').focus();
}
function hideAddForm(){pendingAdd=null;const f=document.getElementById('addForm');f.hidden=true;f.innerHTML='';document.getElementById('palHead').hidden=false;document.getElementById('searchRes').hidden=false}
function openSearch(mode){hideAddForm();document.getElementById('searchOverlay').hidden=false;setPalMode(mode)}
function closeSearch(){hideAddForm();document.getElementById('searchOverlay').hidden=true}
