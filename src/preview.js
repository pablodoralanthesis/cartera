/* ===== Vista previa de activos que NO están en la cartera (no se guarda nada) ===== */
const previewCache={},previewState={},previewNames={},previewNews={};
function previewAsset(t){return {t,n:previewNames[t]||t,u:0,cost:0,preview:true}}
async function loadPreview(t){
 previewState[t]='loading';
 try{
  const meta=await yahooChart(t),price=Number(meta.regularMarketPrice);if(!(price>0))throw new Error('sin precio');
  const q={price,currency:String(meta.currency||''),dayPct:dayPctOf(meta,price),marketTime:meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toLocaleString('es-ES'):'',fresh:true};
  if(!previewNames[t])previewNames[t]=cleanName(meta.longName||meta.shortName||'')||t;
  const H=await Promise.allSettled([yahooMonthlyChange(t),yahooMonthlyChange(t,'3mo'),yahooMonthlyChange(t,'6mo'),yahooMonthlyChange(t,'1y')]),ok=i=>H[i].status==='fulfilled'?H[i].value:null,ch=h=>(h.end/h.start-1)*100;
  if(ok(0)){q.closes=ok(0).closes.slice(-23);q.times=(ok(0).times||[]).slice(-23);q.monthPct=ch(ok(0))}
  if(ok(1))q.m3Pct=ch(ok(1));
  if(ok(2))q.m6Pct=ch(ok(2));
  if(ok(3)){q.y1Pct=ch(ok(3));q.closesY=ok(3).closes.slice(-260)}
  previewCache[t]=q;previewState[t]='ok';
 }catch(e){previewState[t]='fail'}
 if(curView==='asset'&&curAsset===t)renderApp();
 if(previewState[t]==='ok')loadPreviewNews(t);
}
async function loadPreviewNews(t){
 const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),generic=/^(ishares|invesco|vanguard|spdr|direxion|amundi|wisdomtree|xtrackers|lyxor|the|global|first)$/i;
 const sym=t.split(/[.\-=]/)[0].replace(/\^/g,'')||t,w=(previewNames[t]||'').split(' ')[0]||'',re=new RegExp('\\b'+reEsc(sym)+'\\b'+(w.length>=4&&!generic.test(w)?'|'+reEsc(w):''),'i');
 try{
  const r=await fetch(YF_PROXY+'https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(sym)+'&newsCount=12&quotesCount=0',{credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);
  const j=await r.json(),seen=new Set();
  previewNews[t]=(j&&Array.isArray(j.news)?j.news:[]).map(n=>({t,title:String(n.title||''),link:String(n.link||''),pub:String(n.publisher||''),ts:Number(n.providerPublishTime)||0})).filter(n=>re.test(n.title)&&!/^BC-/.test(n.title)&&/^https:\/\//.test(n.link)&&!seen.has(n.title)&&seen.add(n.title)).slice(0,6);
 }catch(e){previewNews[t]=[]}
 if(curView==='asset'&&curAsset===t)renderApp();
}
