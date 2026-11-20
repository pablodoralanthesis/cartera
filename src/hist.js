/* ===== Historial de precios por rango (se consulta al pedirlo y se guarda en memoria) ===== */
const HRANGES=[['7d','7 días'],['1mo','1 mes'],['3mo','3 meses'],['6mo','6 meses'],['1y','1 año'],['2y','2 años'],['5y','5 años'],['10y','10 años'],['max','Máx.']];
const HINT={'7d':'1d','1mo':'1d','3mo':'1d','6mo':'1d','1y':'1d','2y':'1wk','5y':'1wk','10y':'1mo','max':'1mo'};
const histCache={},histState={};
let priceRange='1mo';
async function yahooRange(symbol,range){
 const yr=range==='7d'?'1mo':range,url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range='+yr+'&interval='+HINT[range];
 const r=await fetch(YF_PROXY+url,{credentials:'omit',cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
 const j=await r.json(),res=j&&j.chart&&j.chart.result&&j.chart.result[0],cl=res&&res.indicators&&res.indicators.quote&&res.indicators.quote[0]&&res.indicators.quote[0].close,ts=res&&res.timestamp;
 if(!cl||!ts)throw new Error('Sin histórico');
 let closes=[],times=[];cl.forEach((v,i)=>{if(Number(v)>0){closes.push(Number(v));times.push(Number(ts[i]))}});
 if(range==='7d'){const lim=Date.now()/1000-7*86400,k=times.findIndex(t=>t>=lim);if(k>0){closes=closes.slice(k-1);times=times.slice(k-1)}}
 if(closes.length<2)throw new Error('Histórico insuficiente');
 return {closes,times};
}
function histOf(t,range){
 const q=(priceCache[t]||previewCache[t]||{});
 if(range==='1mo'&&Array.isArray(q.closes)&&q.closes.length>1&&Array.isArray(q.times)&&q.times.length===q.closes.length&&!histCache[t]?.[range])return {closes:q.closes,times:q.times};
 return histCache[t]&&histCache[t][range]||null;
}
// Índices de referencia para alargar «Máx.» hasta 1996 cuando el ETF es más reciente.
const HPROXY={'CNDX.L':['^NDX','Nasdaq-100'],'CSPX.L':['^GSPC','S&P 500'],'IUSQ.DE':['^990100-USD-STRD','MSCI World'],'MEUS.L':['^GDAXI','DAX'],'IJPA.L':['^N225','Nikkei 225'],'ICGA.DE':['^HSI','Hang Seng'],'WSLV.L':['SI=F','plata'],'PPFB.DE':['GC=F','oro']};
const HSTART=Date.UTC(1996,0,1)/1000;
async function withProxy(t,h){
 const px=HPROXY[t];if(!px||h.times[0]<=HSTART+40*86400)return h;
 let g;try{g=await yahooRange(px[0],'max')}catch(e){return h}
 const t0=h.times[0];let j=-1;for(let i=0;i<g.times.length;i++){if(g.times[i]<=t0)j=i;else break}
 if(j<1)return h;const k=h.closes[0]/g.closes[j];
 const pt=[],pc=[];for(let i=0;i<j;i++)if(g.times[i]>=HSTART){pt.push(g.times[i]);pc.push(g.closes[i]*k)}
 if(!pc.length)return h;
 return {closes:pc.concat(h.closes),times:pt.concat(h.times),proxyN:pc.length,proxyName:px[1]};
}
async function loadHist(t,range){
 const k=t+'|'+range;if(histState[k]==='loading')return;histState[k]='loading';
 try{(histCache[t]||(histCache[t]={}))[range]=range==='max'?await withProxy(t,await yahooRange(t,range)):await yahooRange(t,range);histState[k]='ok'}catch(e){histState[k]='fail'}
 if(curView==='asset'&&curAsset===t)renderApp();
}
let histCur=null;
const HW=700,HH=220,HP={l:8,r:8,t:12,b:22};
function histChart(h,cur){
 const c=h.closes,ts=h.times,W=HW,H=HH,p=HP,mn=Math.min(...c),mx=Math.max(...c),r=mx-mn||1,X=i=>p.l+i/(c.length-1)*(W-p.l-p.r),Y=v=>p.t+(1-(v-mn)/r)*(H-p.t-p.b),up=c[c.length-1]>=c[0],col=up?'var(--up)':'var(--dn)',line=c.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' '),pn=h.proxyN||0,pline=pn?c.slice(0,pn+1).map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' '):'',rline=pn?c.slice(pn).map((v,i)=>X(i+pn).toFixed(1)+','+Y(v).toFixed(1)).join(' '):line;
 const fd=t=>new Date(t*1000).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'2-digit'}),n=Math.min(5,c.length),ticks=[];for(let i=0;i<n;i++)ticks.push(Math.round(i*(c.length-1)/(n-1||1)));
 histCur={c,ts,cur,xs:c.map((v,i)=>X(i)),ys:c.map(v=>Y(v)),col};
 const li=c.length-1;
 return `<div class="hpick" id="hpick"><b>${fmt(c[li],2)} ${esc(cur)}</b><span class="muted">${new Date(ts[li]*1000).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · último cierre</span></div><svg class="hchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Historial de precios; mueve el cursor para ver el precio de cada fecha" style="margin:4px 0 2px;touch-action:none"><polygon points="${p.l},${H-p.b} ${line} ${W-p.r},${H-p.b}" fill="${col}" opacity=".12"/>${pn?`<polyline points="${pline}" fill="none" stroke="${col}" stroke-width="1.8" stroke-dasharray="4 3" opacity=".75"/>`:''}<polyline points="${rline}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><text x="${p.l}" y="10" fill="var(--mu)" font-size="10">máx. ${fmt(mx,2)}</text><text x="${W-p.r}" y="10" text-anchor="end" fill="var(--mu)" font-size="10">mín. ${fmt(mn,2)}</text>${ticks.map((i,k)=>`<text x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="${k===0?'start':k===n-1?'end':'middle'}" fill="var(--mu)" font-size="10">${fd(ts[i])}</text>`).join('')}<g class="hx" style="display:none"><line y1="${p.t}" y2="${H-p.b}" stroke="var(--tx)" stroke-opacity=".45" stroke-dasharray="3 3"/><circle r="4.5" fill="${col}" stroke="var(--card)" stroke-width="2"/><rect rx="5" fill="var(--tx)" height="18"/><text font-size="11" font-weight="600" fill="var(--card)" y="${p.t+13}"></text></g><rect class="hhit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
}
// Cursor sobre el gráfico: fecha y precio del punto más cercano.
function histHover(svg,clientX){
 if(!histCur)return;const rect=svg.getBoundingClientRect(),xv=(clientX-rect.left)/rect.width*HW,n=histCur.c.length;
 let i=Math.round((xv-HP.l)/(HW-HP.l-HP.r)*(n-1));i=Math.max(0,Math.min(n-1,i));
 const g=svg.querySelector('.hx'),x=histCur.xs[i],y=histCur.ys[i],label=new Date(histCur.ts[i]*1000).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'2-digit'})+' · '+fmt(histCur.c[i],2)+' '+histCur.cur;
 g.style.display='';g.querySelector('line').setAttribute('x1',x);g.querySelector('line').setAttribute('x2',x);const ci=g.querySelector('circle');ci.setAttribute('cx',x);ci.setAttribute('cy',y);
 const tx=g.querySelector('text'),rc=g.querySelector('rect'),w=label.length*6.2+12,left=x+8+w>HW?x-8-w:x+8;tx.textContent=label;tx.setAttribute('x',left+6);rc.setAttribute('x',left);rc.setAttribute('y',HP.t);rc.setAttribute('width',w);
 const pk=document.getElementById('hpick');if(pk)pk.innerHTML=`<b>${fmt(histCur.c[i],2)} ${esc(histCur.cur)}</b><span class="muted">${new Date(histCur.ts[i]*1000).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}${i>0?' · '+sgn((histCur.c[i]/histCur.c[i-1]-1)*100)+pct((histCur.c[i]/histCur.c[i-1]-1)*100)+' respecto al cierre anterior':''}</span>`;
}
document.addEventListener('pointermove',e=>{const svg=e.target.closest&&e.target.closest('.hchart');if(svg)histHover(svg,e.clientX)});
document.addEventListener('pointerdown',e=>{const svg=e.target.closest&&e.target.closest('.hchart');if(svg)histHover(svg,e.clientX)});
function priceCard(x){
 const t=x.a.t,cur=x.q.currency||'',h=histOf(t,priceRange),k=t+'|'+priceRange;
 if(!h&&histState[k]!=='fail'&&histState[k]!=='loading')loadHist(t,priceRange);
 const seg=`<div class="seg hseg" role="group" aria-label="Rango del historial">${HRANGES.map(r=>`<button type="button" data-act="priceRange" data-r="${r[0]}" class="${priceRange===r[0]?'on':''}">${r[1]}</button>`).join('')}</div>`;
 let body;
 if(h){const ch=(h.closes[h.closes.length-1]/h.closes[0]-1)*100,fd=t=>new Date(t*1000).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  body=`<div class="hsum"><span><b class="${ch>=0?'g':'r'}">${sgn(ch)}${pct(ch)}</b> del ${fd(h.times[0])} al ${fd(h.times[h.times.length-1])}</span><span class="muted">${h.closes.length} cierres · ${fmt(h.closes[0],2)} → ${fmt(h.closes[h.closes.length-1],2)} ${esc(cur)}</span></div>`+histChart(h,cur)+(h.proxyN?`<p class="muted" style="font-size:12px;margin:2px 0 0">Línea discontinua: antes del ${fd(h.times[h.proxyN])} el ETF no cotizaba; se muestra su índice de referencia (${esc(h.proxyName)}) escalado al primer precio real.</p>`:'')}
 else if(histState[k]==='fail')body=`<p class="muted">No se pudo cargar este rango. <button type="button" class="chip" data-act="histRetry" data-r="${priceRange}">Reintentar</button></p>`;
 else body='<p class="muted" style="margin:14px 0">Cargando historial…</p>';
 return `<div class="card"><div class="card-head" style="margin-bottom:6px"><span class="lbl">Precio · historial</span>${seg}</div>${body}</div>`;
}
