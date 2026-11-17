/* ===== Página del activo: lectura de tendencia calculada SOLO con precios (no es análisis de noticias) ===== */
let insRange=30;
const HZ=[{k:'s',n:5,lab:'Corto plazo',sub:'7 días'},{k:'m',n:63,lab:'Medio plazo',sub:'1-3 meses'},{k:'l',n:126,lab:'Largo plazo',sub:'6 meses'}];
const TLAB={up:'alcista',down:'bajista',neutral:'neutral'};
function scoreLab(s){return s>=60?'up':s<=40?'down':'neutral'}
// Puntuación 0-100: variación del periodo comparada con lo que suele moverse el activo (50 = plano, ±2 desviaciones = 100/0).
// Consistencia: R² de la recta de tendencia del logaritmo del precio en el periodo.
function trendAt(c,end,n){
 if(end-n<0)return null;
 const r=(c[end]/c[end-n]-1)*100,st=Math.max(1,end-62),rets=[];
 for(let i=st;i<=end;i++)rets.push(Math.log(c[i]/c[i-1]));
 if(rets.length<5)return null;
 const mu=rets.reduce((a,b)=>a+b,0)/rets.length,sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mu)*(b-mu),0)/(rets.length-1))*100,exp=sd*Math.sqrt(n)||1;
 let sx=0,sy=0,sxx=0,sxy=0,syy=0;const m=n+1;
 for(let i=0;i<m;i++){const y=Math.log(c[end-n+i]);sx+=i;sy+=y;sxx+=i*i;sxy+=i*y;syy+=y*y}
 const den=(m*sxx-sx*sx)*(m*syy-sy*sy),r2=den>0?Math.pow(m*sxy-sx*sy,2)/den:0;
 return {score:Math.round(Math.max(0,Math.min(100,50+25*r/exp))),r,sd,conf:Math.round(Math.max(0,Math.min(1,r2))*100)};
}
function insight(x){
 const src=Array.isArray(x.q.closesY)&&x.q.closesY.length>30?x.q.closesY:x.cl,c=src.filter(v=>v>0),last=c.length-1,out={c,last,hz:{},series:{}};
 HZ.forEach(h=>{out.hz[h.k]=last>=0?trendAt(c,last,h.n):null;const S=[];for(let e=last-29;e<=last;e++)S.push(e>=0?trendAt(c,e,h.n):null);out.series[h.k]=S});
 return out;
}
function ringSVG(v){const r=18,C=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 46 46" role="img" aria-label="Consistencia ${v} %"><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--soft2)" stroke-width="4"/><circle cx="23" cy="23" r="${r}" fill="none" stroke="var(--c2)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C*v/100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 23 23)"/><text x="23" y="27" text-anchor="middle" font-size="11" font-weight="700" fill="var(--tx)">${v}%</text></svg>`}
function hzBullets(k,x,I,d){
 const c=I.c,last=I.last,cur=esc(x.q.currency||''),px=v=>fmt(v,2)+(cur?' '+cur:''),sp=v=>sgn(v)+pct(v),ch=n=>last>=n?(c[last]/c[last-n]-1)*100:null,avg=n=>c.slice(-n).reduce((a,b)=>a+b,0)/n,ma=(n,name)=>{if(last<n-1)return null;const dv=(c[last]/avg(n)-1)*100;return `Cotiza un ${pct(Math.abs(dv))} por ${dv>=0?'encima':'debajo'} de su media de ${name}.`};
 if(k==='s'){const w=c.slice(-6);return [`Varía ${sp(d.r)} en las últimas 5 sesiones; último cierre ${px(c[last])}.`,x.day!=null?`Última sesión: ${sp(x.day)}.`:null,`Cierres de la semana entre ${px(Math.min(...w))} y ${px(Math.max(...w))}.`,`Volatilidad diaria reciente: ${fmt(d.sd,2)} %.`]}
 if(k==='m'){const w=c.slice(-64),mx=Math.max(...w),m1=ch(21);return [(m1!=null?`1 mes: ${sp(m1)}; `:'')+`3 meses: ${sp(d.r)}.`,`Máximo de cierre de 3 meses: ${px(mx)}; ${c[last]>=mx?'está en máximos.':'está un '+pct((1-c[last]/mx)*100)+' por debajo.'}`,ma(50,'50 sesiones')]}
 const mx=Math.max(...c),mn=Math.min(...c),yr=c.length>=240;
 return [`6 meses: ${sp(d.r)}`+(yr?`; 12 meses: ${sp((c[last]/c[0]-1)*100)}.`:'.'),`Máximo de cierre ${yr?'del último año':'del periodo disponible'}: ${px(mx)} (${c[last]>=mx?'en máximos':'−'+pct((1-c[last]/mx)*100)}); mínimo: ${px(mn)} (+${pct((c[last]/mn-1)*100)}).`,ma(200,'200 sesiones')];
}
function hzCard(h,x,I){
 const d=I.hz[h.k],head=`<span class="lbl">${h.lab} (${h.sub})</span>`;
 if(!d)return `<div class="icard"><div class="ihead">${head}</div><p class="muted" style="margin:0">Sin histórico suficiente (hacen falta ${h.n+1} sesiones). Actualiza los precios.</p></div>`;
 const t=TREND[scoreLab(d.score)];
 return `<div class="icard"><div class="ihead">${head}<span class="tagp ${t[2]}">${t[1]} ${t[0]}</span></div><div class="iscore"><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><span class="muted">Puntuación de tendencia</span><b class="${t[2]}">${d.score}/100</b></div><div class="gauge"><i style="left:${d.score}%"></i></div><div class="gl"><span>BAJISTA</span><span>NEUTRAL</span><span>ALCISTA</span></div></div><div style="text-align:center">${ringSVG(d.conf)}<div class="gl" style="justify-content:center">CONSISTENCIA</div></div></div><ul>${hzBullets(h.k,x,I,d).filter(Boolean).map(b=>`<li>${b}</li>`).join('')}</ul></div>`;
}
function insightSummary(I){
 const S=I.series,labs=k=>S[k].map(d=>d?scoreLab(d.score):null),now=k=>I.hz[k],out=[],col=l=>`<span class="${TREND[l][2]}">${TLAB[l]}</span>`;
 if(now('s')){const L=labs('s'),cur=L[L.length-1];let k=0;for(let i=L.length-1;i>=0&&L[i]===cur;i--)k++;const prev=L[L.length-1-k];
  out.push(k<=5&&prev?[`La lectura a 7 días pasó a ${col(cur)}`,`hace ${k} ${k===1?'sesión':'sesiones'} · antes ${TLAB[prev]}`]:[`La lectura a 7 días sigue ${col(cur)}`,`${k} sesiones seguidas`])}
 if(now('s')&&now('l')){const a=scoreLab(now('s').score),b=scoreLab(now('l').score);out.push([a===b?'Corto plazo y 6 meses coinciden':'Corto plazo y 6 meses discrepan',`7 días ${now('s').score} ${TLAB[a]} · 6 meses ${now('l').score} ${TLAB[b]}`])}
 if(now('m')&&now('l')){const lm=labs('m').filter(Boolean),ll=labs('l').filter(Boolean),a=scoreLab(now('m').score),b=scoreLab(now('l').score),same=a===b&&lm.every(v=>v===a)&&ll.every(v=>v===a);
  out.push(same?[`Medio y largo plazo se mantienen ${col(a)}`,`las ${Math.min(lm.length,ll.length)} sesiones mostradas`]:[`Medio plazo ${col(a)} · largo plazo ${col(b)}`,`1-3 meses ${now('m').score} · 6 meses ${now('l').score}`])}
 if(now('l')){const w=S.l[S.l.length-6],cf=now('l').conf;out.push([`${cf} % de consistencia en la lectura a 6 meses`,w?(w.conf===cf?'igual que hace 5 sesiones':(w.conf>cf?'baja':'sube')+' desde el '+w.conf+' % de hace 5 sesiones'):''])}
 return out;
}
function trendChart(I){
 const n=insRange,W=700,H=230,m={l:30,r:34,t:10,b:22},X=i=>m.l+i/(n-1)*(W-m.l-m.r),Y=v=>m.t+(100-v)/100*(H-m.t-m.b),cols={s:'var(--mu)',m:'var(--c2)',l:'var(--ac)'},pw=W-m.l-m.r;
 let z=`<rect x="${m.l}" y="${Y(100)}" width="${pw}" height="${Y(60)-Y(100)}" fill="var(--up)" opacity=".09"/><rect x="${m.l}" y="${Y(40)}" width="${pw}" height="${Y(0)-Y(40)}" fill="var(--dn)" opacity=".09"/><text x="${m.l+6}" y="${Y(100)+13}" font-size="9" font-weight="700" fill="var(--up)">ALCISTA</text><text x="${m.l+6}" y="${Y(0)-6}" font-size="9" font-weight="700" fill="var(--dn)">BAJISTA</text>`;
 [0,40,60,100].forEach(v=>{z+=`<line x1="${m.l}" x2="${W-m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--bd)"/><text x="${m.l-6}" y="${Y(v)+3}" text-anchor="end" font-size="10" fill="var(--mu)">${v}</text>`});
 HZ.forEach(h=>{const S=I.series[h.k].slice(-n),pts=[];S.forEach((d,i)=>{if(d)pts.push(X(i).toFixed(1)+','+Y(d.score).toFixed(1))});const lastD=S[S.length-1];
  if(pts.length>1)z+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${cols[h.k]}" stroke-width="${h.k==='l'?2.6:1.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if(lastD)z+=`<circle cx="${X(n-1)}" cy="${Y(lastD.score)}" r="3" fill="${cols[h.k]}"/><text x="${W-m.r+7}" y="${Y(lastD.score)+3.5}" font-size="10" fill="${cols[h.k]}">${lastD.score}</text>`});
 z+=`<text x="${m.l}" y="${H-5}" font-size="10" fill="var(--mu)">hace ${n} sesiones</text><text x="${W-m.r}" y="${H-5}" text-anchor="end" font-size="10" fill="var(--mu)">último cierre</text>`;
 const C=I.series.l.slice(-n),cp=[],H2=64,Y2=v=>6+(100-v)/100*(H2-12);C.forEach((d,i)=>{if(d)cp.push(X(i).toFixed(1)+','+Y2(d.conf).toFixed(1))});
 const leg=HZ.map(h=>{const d=I.hz[h.k];return `<span><i style="background:${cols[h.k]}"></i>${h.sub}${d?` <b>${d.score}</b> <span class="muted">${TLAB[scoreLab(d.score)]} · ${d.conf} %</span>`:''}</span>`}).join('');
 return `<div class="card"><div class="card-head" style="margin-bottom:4px"><span class="lbl">Tendencia en el tiempo</span><div class="seg" role="group" aria-label="Periodo del gráfico"><button type="button" data-act="insRange" data-r="7" class="${n===7?'on':''}">7 sesiones</button><button type="button" data-act="insRange" data-r="30" class="${n===30?'on':''}">30 sesiones</button></div></div><div class="ileg">${leg}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Puntuación de tendencia a 7 días, 1-3 meses y 6 meses">${z}</svg>${cp.length>1?`<div class="lbl" style="margin:12px 0 2px">Consistencia · 6 meses</div><svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="Consistencia de la lectura a 6 meses"><line x1="${m.l}" x2="${W-m.r}" y1="${Y2(50)}" y2="${Y2(50)}" stroke="var(--bd)"/><polyline points="${cp.join(' ')}" fill="none" stroke="var(--ac)" stroke-width="1.8" stroke-linejoin="round"/></svg>`:''}<p class="muted" style="font-size:12px;margin:8px 0 0">Cada punto es una sesión. La puntuación compara la variación del periodo con lo que suele moverse el activo (60 o más, alcista; 40 o menos, bajista). La consistencia mide lo regular que ha sido esa tendencia. Se calcula solo con precios; no es una recomendación.</p></div>`;
}
function renderAsset(S){
 let x=S.L.find(y=>y.a.t===curAsset),preview=false;const el=document.getElementById('assetBody');
 if(!x){
  // No está en la cartera: se muestra en vista previa con datos del mercado, sin guardar nada.
  const pt=cleanSym(curAsset),back='<a class="back" href="#/portfolio">← Cartera</a>';
  if(!pt){el.innerHTML=back+'<p>Activo no encontrado.</p>';return}
  if(!previewState[pt])loadPreview(pt);
  if(previewState[pt]!=='ok'){el.innerHTML=back+`<div class="ahead"><div class="tkx">${esc(pt)}</div></div><p class="muted" style="margin-top:14px">${previewState[pt]==='fail'?`No se pudieron cargar los datos de este activo. <button type="button" class="chip" data-act="prevRetry" data-t="${esc(pt)}">Reintentar</button>`:'Cargando datos del mercado…'}</p>`;return}
  x=assetStats(previewAsset(pt));preview=true;
 }
 const I=insight(x),t=TREND[x.trend],m=(l,v)=>`<div class="metric"><span class="muted">${l}</span><b>${v}</b></div>`,p=v=>v==null?'—':`<span class="${v>=0?'g':'r'}">${sgn(v)}${pct(v)}</span>`,sp=v=>sgn(v)+pct(v),per=k=>Number.isFinite(x.q[k+'Pct'])?x.q[k+'Pct']:x.q[k+'BaseEur']>0?x.q[k+'ChangeEur']/x.q[k+'BaseEur']*100:null;
 const news=preview?(previewNews[x.a.t]||[]):newsItems.filter(n=>n.t===x.a.t),avail=HZ.filter(h=>I.hz[h.k]),best=avail.slice().sort((a,b)=>I.hz[b.k].conf-I.hz[a.k].conf)[0],cur=esc(x.q.currency||''),c=I.c,last=I.last;
 const s0=I.series.s[I.series.s.length-6],s1=I.hz.s,since=s0&&s1?`<div class="since"><span class="lbl">Desde hace 5 sesiones</span><span><b>Lectura a 7 días: ${TLAB[scoreLab(s1.score)]}</b> · ${s0.score} → ${s1.score} <span class="${s1.score>=s0.score?'g':'r'}">(${s1.score>=s0.score?'+':''}${s1.score-s0.score})</span></span></div>`:'';
 let an='';
 if(last>=1){an=`${esc(x.a.t)} cerró a ${fmt(c[last],2)}${cur?' '+cur:''}`+(x.day!=null?`, ${sp(x.day)} en la última sesión.`:'.');
  const bits=[];if(x.week!=null)bits.push('en 5 sesiones '+sp(x.week));if(x.month!=null)bits.push('en un mes '+sp(x.month));const m6=per('m6');if(m6!=null)bits.push('en seis meses '+sp(m6));
  if(bits.length)an+=' Acumula '+bits.join(', ')+'.';
  if(c.length>60){const mx=Math.max(...c),mn=Math.min(...c);an+=` Está un ${pct((1-c[last]/mx)*100)} por debajo de su máximo de cierre del periodo (${fmt(mx,2)}) y un ${pct((c[last]/mn-1)*100)} por encima del mínimo (${fmt(mn,2)}).`}
  if(avail.length)an+=' La lectura es '+avail.map(h=>TLAB[scoreLab(I.hz[h.k].score)]+' a '+h.sub).join(', ')+'.';
  if(x.a.u>0&&x.v!=null)an+=` Tu posición vale ${eur(x.v)}`+(x.pl!=null?`, con un resultado de ${sgn(x.pl)}${eur(x.pl)} (${sp(x.plPct)}).`:'.')}
 const nd=ts=>ts?new Date(ts*1000).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'}):'';
 el.innerHTML=`<a class="back" href="#/portfolio">← Cartera</a><div class="ahead"><div class="tkx">${esc(x.a.t)}</div><div><span class="tagp ${t[2]}">${t[1]} ${t[0]}</span>${preview?` <button type="button" class="chip" data-act="addPrev" data-t="${esc(x.a.t)}">+ Añadir a la cartera</button>`:x.a.custom?` <button type="button" class="chip" data-act="del" data-t="${esc(x.a.t)}">Quitar de la cartera</button>`:''}<div class="muted" style="font-size:16px;margin-top:8px">${esc(x.a.n)}${x.q.marketTime?' · cotización: '+esc(x.q.marketTime):''}${preview?' · vista previa, no está en tu cartera':''}</div></div></div>
 ${since}
 <div class="h3">Lectura del mercado</div><div class="muted">${best?`Lectura más consistente: ${best.sub}, ${TLAB[scoreLab(I.hz[best.k].score)]}, ${I.hz[best.k].score}/100 con ${I.hz[best.k].conf} % de consistencia.`:'Todavía no hay histórico suficiente. Actualiza los precios.'}</div>
 <div class="igrid">${HZ.map(h=>hzCard(h,x,I)).join('')}</div>
 <div class="sumgrid">${insightSummary(I).map(r=>`<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>
 ${avail.length?trendChart(I):''}
 ${an?`<div class="h3">Resumen</div><p class="why" style="max-width:820px">${an}</p>`:''}
 ${preview?'':`<div class="card"><div class="lbl">${x.a.u>0?'Tu posición':'En seguimiento (sin unidades)'}</div><div class="mgrid">${m('Valor',x.v==null?'—':eur(x.v))}${m('Resultado',x.pl==null?'—':`<span class="${x.pl>=0?'g':'r'}">${sgn(x.pl)}${eur(x.pl)}</span>`)}${m('Rentabilidad',p(x.plPct))}${m('Coste de apertura',eur(x.cost))}${m('Unidades',fmt(x.a.u,6))}${m('Precio',x.q.price>0?fmt(x.q.price,2)+' '+cur:'—')}${m('Peso en cartera',pct(x.w))}</div></div>`}
 ${priceCard(x)}
 <div class="card"><div class="lbl">Variación por periodo</div><div class="mgrid">${m('Última sesión',p(x.day))}${m('5 sesiones',p(x.week))}${m('1 mes',p(x.month))}${m('3 meses',p(per('m3')))}${m('6 meses',p(per('m6')))}${m('1 año',p(per('y1')))}</div></div>
 <div class="card-head" style="margin:26px 0 0"><div class="h3" style="margin:0">Noticias recientes</div><span class="muted">${news.length?news.length+' '+(news.length===1?'artículo':'artículos'):''}</span></div>
 ${news.length?`<div class="ngrid">${news.map(n=>`<a class="ncard" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer"><div class="meta"><span>${esc(n.pub)}</span><span>${nd(n.ts)}</span></div><b>${esc(n.title)}</b></a>`).join('')}</div>`:`<div class="news">${newsFallback([x.a])}</div>`}
 <p class="disc">Estas lecturas se calculan automáticamente a partir de precios y son solo informativas; no son asesoramiento de inversión. Invertir conlleva riesgo, incluida la posible pérdida del capital. Haz tu propio análisis antes de decidir.</p>`;
}
