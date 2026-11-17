
/* ===== Panel: navegación y eventos ===== */
const railItem=(tag,attrs,ico,label)=>`<${tag} ${attrs} title="${label}" aria-label="${label}">${ico}<span class="rl">${label}</span></${tag}>`;
document.querySelector('.rail').innerHTML=`<a class="logo" href="#/dashboard" aria-label="Inicio"><span class="mark">${ICO.trend}</span><span class="rl" style="font-weight:700">Mi cartera</span></a>
<button type="button" class="railtog" data-act="railToggle" aria-label="Desplegar o contraer el menú" aria-expanded="false">${svgIco('<path d="M4 7h16M4 12h16M4 17h16"/>')}</button>
${railItem('button','type="button" data-act="search"',ICO.search,'Buscar')}
${railItem('a','data-view="dashboard" href="#/dashboard"',ICO.dash,'Panel')}
${railItem('a','data-view="portfolio" href="#/portfolio"',ICO.brief,'Cartera')}
${railItem('a','data-view="daily" href="#/daily"',ICO.news,'Edición diaria')}
${railItem('a','data-view="proyeccion" href="#/proyeccion"',ICO.trend,'Proyección')}
${railItem('a','data-view="extracto" href="#/extracto"',ICO.file,'Extracto eToro')}
<hr>${railItem('button','type="button" data-act="refresh"',ICO.refresh,'Actualizar precios')}`;
function setRail(open){const r=document.querySelector('.rail');r.classList.toggle('open',open);r.querySelector('.railtog').setAttribute('aria-expanded',String(open))}
// Al elegir una página el menú se contrae solo.
document.querySelector('.rail').addEventListener('click',e=>{if(e.target.closest('[data-view],.logo'))setRail(false)});
// Panel ordenado: las tres cifras clave suben bajo el saludo; el detalle de precios queda al final.
document.getElementById('kpiTop').appendChild(document.getElementById('liveKpis'));
document.addEventListener('click',e=>{
 if(e.target.id==='searchOverlay'){closeSearch();return}
 if(e.target.id==='addOverlay'){closeAdd();return}
 const b=e.target.closest('[data-act]');
 if(b){
  const act=b.dataset.act;
  if(act==='del'){e.preventDefault();removeAsset(b.dataset.t);return}
  if(act==='refresh'){const r=document.getElementById('refreshPrices');if(r&&!r.disabled)r.click()}
  else if(act==='search')openSearch();
  else if(act==='add')openAdd();
  else if(act==='addClose')closeAdd();
  else if(act==='railToggle')setRail(!document.querySelector('.rail').classList.contains('open'));
  else if(act==='dcaUndo')dcaUndo(b.dataset.ym);
  else if(act==='dcaRedo')dcaRedo(b.dataset.ym);
  else if(act==='priceRange'){priceRange=HINT[b.dataset.r]?b.dataset.r:'1mo';renderApp()}
  else if(act==='histRetry'){delete histState[curAsset+'|'+b.dataset.r];renderApp()}
  else if(act==='addPrev'){const t=b.dataset.t;openAdd();showAddForm2({t,n:previewNames[t]||t,ex:''})}
  else if(act==='prevRetry'){delete previewState[b.dataset.t];renderApp()}
  else if(act==='add2Back'){addBack();document.getElementById('addQ').focus()}
  else if(act==='addPick'){const t=b.dataset.t;showAddForm2(addRes.find(r=>r.t===t)||POPULAR.find(r=>r.t===t))}
  else if(act==='insRange'){insRange=Number(b.dataset.r)===7?7:30;renderApp()}
  else if(act==='pal')runPal(Number(b.dataset.i));
  else if(act==='closeSearch')closeSearch();
  else if(act==='addOk')confirmAdd();
  else if(act==='addCancel'){hideAddForm();document.getElementById('searchInput').focus()}
  else if(act==='tab'){dailyTab=b.dataset.tab;mvSort=null;renderApp()}
  else if(act==='sort'){const k=b.dataset.k,cur=mvSort||{k:b.dataset.def,d:-1};mvSort=cur.k===k?{k,d:-cur.d}:{k,d:k==='name'?1:-1};renderApp()}
  return;
 }
 const g=e.target.closest('[data-go]');if(g)location.hash=g.dataset.go;
});
document.getElementById('searchInput').addEventListener('input',e=>{
 const v=e.target.value;palSel=0;fillSearch(v);clearTimeout(remoteT);
 if(v.trim().length>=2)remoteT=setTimeout(()=>searchRemote(v),350);
});
document.getElementById('searchInput').addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(palItems.length){palSel=(palSel+(e.key==='ArrowDown'?1:-1)+palItems.length)%palItems.length;fillSearch(e.target.value)}}
 else if(e.key==='Enter'){e.preventDefault();runPal(palSel)}
});
document.getElementById('addForm').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();confirmAdd()}});
document.getElementById('investedStart').addEventListener('input',e=>{e.target.dataset.touched='1'});
document.getElementById('pm').addEventListener('input',scheduleApp);
dcaInit();
document.getElementById('addQ').addEventListener('input',e=>{
 addQv=e.target.value;clearTimeout(addT);
 if(addQv.trim().length>=2){addState='loading';renderAddList();addT=setTimeout(()=>addSearch(addQv),350)}else renderAddList();
});
document.getElementById('addForm2').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();confirmAdd()}});
window.addEventListener('hashchange',closeAdd);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSearch();closeAdd()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
window.addEventListener('hashchange',route);
if(customCost()>0)syncInvested();
route();loadNews();
