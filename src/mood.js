const moodDk=ts=>{const d=new Date(ts*1000);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const WD=['L','M','X','J','V','S','D'];
function moodCols(){const now=new Date(),mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const d=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+i);return {k:moodDk(d.getTime()/1000),d,wd:WD[i],off:i>=5||d>now}})}
function moodHead(){return `<div class="moodrow moodhead" aria-hidden="true"><span></span><span class="sq">${moodCols().map(c=>`<b class="wd${c.off?' off':''}" title="${c.d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'})}">${c.wd}</b>`).join('')}</span><span></span></div>`}
