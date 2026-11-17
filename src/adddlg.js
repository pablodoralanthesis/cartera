/* ===== Diálogo «Añadir activo»: buscador de mercado + activos populares ===== */
const POPULAR=[
 {t:'QQQ',n:'Invesco QQQ Trust',d:'Sigue el índice Nasdaq-100, con mucho peso en empresas tecnológicas.'},
 {t:'IBIT',n:'iShares Bitcoin Trust ETF',d:'Sigue el precio al contado de bitcoin a través de un ETF.'},
 {t:'SPY',n:'SPDR S&P 500 ETF Trust',d:'Sigue el S&P 500, las 500 mayores empresas de EE. UU.'},
 {t:'SOXS',n:'Direxion Daily Semiconductor Bear 3x',d:'Apalancado inverso 3x diario sobre semiconductores; sube cuando los chips bajan.'},
 {t:'VWCE.DE',n:'Vanguard FTSE All-World UCITS ETF (Acc)',d:'Renta variable mundial de acumulación, cotizado en Xetra.'},
 {t:'NVDA',n:'NVIDIA',d:'Diseña chips gráficos y aceleradores para inteligencia artificial.'},
 {t:'MSFT',n:'Microsoft',d:'Software, nube (Azure) y productividad.'},
 {t:'BTC-USD',n:'Bitcoin',d:'Criptomoneda, cotizada en dólares.'}
];
let addQv='',addRes=[],addState='idle',addT=null;
async function yahooQuotes(q){
 const url='https://query1.finance.yahoo.com/v1/finance/search?q='+encodeURIComponent(q.trim())+'&quotesCount=12&newsCount=0';
 const r=await fetch(YF_PROXY+url,{credentials:'omit'});if(!r.ok)throw new Error('HTTP '+r.status);
 const j=await r.json(),rank={EQUITY:0,ETF:0,MUTUALFUND:1,INDEX:1,CRYPTOCURRENCY:1,CURRENCY:2,FUTURE:3,OPTION:4};
 return (j&&Array.isArray(j.quotes)?j.quotes:[]).map((x,i)=>({t:cleanSym(x.symbol),n:cleanName(x.shortname||x.longname||x.symbol),ex:cleanName(x.exchDisp||x.exchange||''),ty:cleanName(x.typeDisp||x.quoteType||''),k:(rank[String(x.quoteType||'').toUpperCase()]??2)*100+i})).filter(x=>x.t).sort((a,b)=>a.k-b.k);
}
function addRowHTML(r,desc){
 const own=D.assets.some(a=>a.t===r.t);
 return `<div class="arow"><span class="achip">${esc(r.t)}</span><div style="min-width:0"><b>${esc(r.n)}<a href="https://finance.yahoo.com/quote/${encodeURIComponent(r.t)}" target="_blank" rel="noopener noreferrer" title="Ver en Yahoo Finance" aria-label="Ver ${esc(r.t)} en Yahoo Finance">↗</a></b><p>${esc(desc)}</p></div>${own?'<span class="aown">En cartera</span>':`<button type="button" class="aplus" data-act="addPick" data-t="${esc(r.t)}" title="Añadir ${esc(r.t)}" aria-label="Añadir ${esc(r.t)}">+</button>`}</div>`;
}
function renderAddList(){
 const q=addQv.trim(),el=document.getElementById('addList'),note=s=>`<p class="adsub">${s}</p>`;
 document.getElementById('addCount').textContent=D.assets.length+' en cartera';
 if(q.length<2){el.innerHTML=note('…o añade uno de los activos populares')+POPULAR.map(p=>addRowHTML(p,p.d)).join('');return}
 if(addState==='loading')el.innerHTML=note('Buscando en el mercado…');
 else if(addState==='fail')el.innerHTML=note('No se pudo consultar el buscador. Inténtalo de nuevo.');
 else if(!addRes.length)el.innerHTML=note('Sin resultados para «'+esc(q)+'».');
 else el.innerHTML=addRes.map(r=>addRowHTML(r,[r.ex,r.ty].filter(Boolean).join(' · '))).join('');
}
async function addSearch(q){
 const key=q.trim().toLowerCase();addState='loading';addRes=[];renderAddList();
 try{const res=await yahooQuotes(q);if(addQv.trim().toLowerCase()!==key)return;addRes=res;addState='ok'}
 catch(e){if(addQv.trim().toLowerCase()!==key)return;addState='fail'}
 renderAddList();
}
function addBack(){pendingAdd=null;const f=document.getElementById('addForm2');f.hidden=true;f.innerHTML='';document.getElementById('addMain').hidden=false}
function openAdd(){closeSearch();addBack();addQv='';addState='idle';addRes=[];const i=document.getElementById('addQ');i.value='';document.getElementById('addOverlay').hidden=false;renderAddList();i.focus()}
function closeAdd(){const o=document.getElementById('addOverlay');if(o.hidden)return;addBack();o.hidden=true}
function showAddForm2(r){
 if(!r)return;pendingAdd=r;document.getElementById('addMain').hidden=true;
 const f=document.getElementById('addForm2');f.hidden=false;
 f.innerHTML=`<div class="addf" style="padding:6px 0 0"><div><div style="font-size:26px;font-weight:650;letter-spacing:-.02em">${esc(r.t)}</div><div class="muted">${esc(r.n)}${r.ex?' · '+esc(r.ex):''}</div></div>
 <label>Unidades (opcional)<input id="addU" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
 <label>Coste total en € (opcional)<input id="addC" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></label>
 <div class="muted" style="font-size:12.5px">Sin unidades se añade solo en seguimiento. Si indicas unidades, indica también lo que te costaron para que la ganancia sea correcta. Se guarda en este navegador.</div>
 <div class="row"><button type="button" class="ghost" data-act="add2Back">Atrás</button><button type="button" data-act="addOk">Añadir a la cartera</button></div></div>`;
 document.getElementById('addU').focus();
}
