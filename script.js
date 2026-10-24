const $=id=>document.getElementById(id);
const G=[
["Selling price",[["sp","Selling price incl. GST",1499,"₹"],["gstSale","GST rate on product (verify for your HSN code)",18,"%"]]],
["Product and packaging",[["cost","Purchase cost (ex-GST)",400,"₹"],["gstIn","Input GST on purchase",18,"%"],["pack","Packaging: box, foam, tape (ex-GST)",40,"₹"],["gstPack","Input GST on packaging",18,"%"]]],
["Amazon fees (ex-GST, copy from your rate card)",[["ref","Referral fee",10,"%"],["fba","FBA fulfilment + handling fee",70,"₹"],["esFee","Easy Ship fee (shipping + handling)",110,"₹"],["storage","Storage cost per unit (FBA)",5,"₹"],["inbound","Inbound transport per unit (FBA)",8,"₹"],["gstFee","GST on Amazon services",18,"%"]]],
["Advertising, returns and other",[["ads","Advertising cost per order (ex-GST)",60,"₹"],["ret","Return and damage allowance (% of net revenue)",5,"%"],["other","Other expenses per unit",10,"₹"]]],
["Goals and actuals",[["target","Target profit per unit",150,"₹"],["actual","Actual profit per unit (optional, from settlement report)","","₹"]]]];
const form=$('form');
G.forEach(([t,fs])=>{const d=document.createElement('div');d.className='card';
 d.innerHTML=`<h2>${t}</h2>`+fs.map(([id,l,v,u])=>`<div class="fld"><span>${l}</span><div class="in" id="w_${id}"><i>${u==='₹'?'₹':''}</i><input id="${id}" type="number" inputmode="decimal" min="0" step="any" value="${v}"><i>${u==='%'?'%':''}</i></div><p class="err" id="e_${id}"></p></div>`).join('');
 form.appendChild(d)});
const IDS=G.flatMap(g=>g[1].map(f=>f[0]));
const money=n=>(n<0?'-':'')+'₹'+Math.abs(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>n.toFixed(1)+'%';
const row=(a,b,neg)=>`<div class="row"><span>${a}</span><b class="${neg?'neg':''}">${b}</b></div>`;
function read(){
 const p={mode:$('mode').value,itc:$('itc').checked,refInc:$('refInc').checked};let ok=true;
 G.forEach(([,fs])=>fs.forEach(([id,,,u])=>{
  const el=$(id),raw=el.value.trim();let m='';
  if(raw===''){if(id==='actual')p[id]=null;else m='Required';}
  else{const v=+raw;if(isNaN(v)||v<0)m='Enter a number, 0 or more';else if(u==='%'&&v>100)m='Cannot be above 100%';else if(id==='sp'&&v<=0)m='Must be above 0';p[id]=v;}
  $('e_'+id).textContent=m;$('w_'+id).classList.toggle('bad',!!m);if(m)ok=false;}));
 return ok?p:null}
function calc(p,m,sp){
 const fg=p.gstFee/100,u=p.itc?0:1,spx=sp/(1+p.gstSale/100);
 const buy=p.cost+u*p.cost*p.gstIn/100,pack=p.pack+u*p.pack*p.gstPack/100;
 const ref=p.ref/100*(p.refInc?sp:spx),fee=m==='fba'?p.fba:p.esFee,logi=m==='fba'?p.storage+p.inbound:0;
 const svc=ref+fee+logi,svcG=u*svc*fg,adsG=u*p.ads*fg,ret=p.ret/100*spx;
 const profit=spx-buy-pack-svc-svcG-p.ads-adsG-ret-p.other;
 return{sp,spx,gstOut:sp-spx,buy,pack,ref,fee,logi,svcG,ads:p.ads,adsG,ret,other:p.other,profit,u,
  invested:buy+pack+logi}}
function metrics(p,m){
 const c=calc(p,m,p.sp),P=s=>calc(p,m,s).profit,p0=P(0),k=(P(1000)-p0)/1000;
 const pre=c.profit+c.ads+c.adsG,maxAd=Math.max(0,pre/(1+c.u*p.gstFee/100));
 return{c,margin:c.profit/c.spx*100,roi:c.invested>0?c.profit/c.invested*100:0,
  be:k>0?-p0/k:null,tp:k>0?(p.target-p0)/k:null,maxAd,acos:maxAd/p.sp*100}}
const na=v=>v===null?'Not reachable':money(v);
function render(){
 const p=read();
 try{localStorage.setItem('sw_in',JSON.stringify(Object.fromEntries([...IDS.map(i=>[i,$(i).value]),['mode',$('mode').value],['itc',$('itc').checked],['refInc',$('refInc').checked]])))}catch(e){}
 if(!p){['profit','barp'].forEach(i=>$(i).textContent='-');$('kpis').innerHTML='<p>Fix the highlighted fields to see results.</p>';
  ['targets','adlim','brk','act'].forEach(i=>$(i).innerHTML='');$('cmp').innerHTML='';return null}
 const x=metrics(p,p.mode),c=x.c,f=metrics(p,'fba'),e=metrics(p,'es');
 $('profit').textContent=$('barp').textContent=money(c.profit);
 $('profit').classList.toggle('neg',c.profit<0);
 $('kpis').innerHTML=`<div><small>Profit margin</small>${pct(x.margin)}</div><div><small>ROI</small>${pct(x.roi)}</div>`;
 $('targets').innerHTML=row('Break-even selling price (incl. GST)',na(x.be))+row('Selling price for target profit of '+money(p.target),na(x.tp))+row('Your current price',money(p.sp));
 $('adlim').innerHTML=row('Current ad cost per order',money(p.ads))+row('Maximum ad spend per order',money(x.maxAd))+row('Break-even ACoS',pct(x.acos))+row('Current ACoS',pct(p.ads/p.sp*100),p.ads>x.maxAd);
 $('cmp').innerHTML=`<tr><th></th><th>FBA</th><th>Easy Ship</th></tr>`+[['Net profit',m=>money(m.c.profit)],['Margin',m=>pct(m.margin)],['ROI',m=>pct(m.roi)],['Break-even price',m=>na(m.be)]].map(([l,fn])=>`<tr><td>${l}</td><td>${fn(f)}</td><td>${fn(e)}</td></tr>`).join('');
 $('brk').innerHTML=row('Selling price incl. GST',money(c.sp))+row('Output GST collected',money(-c.gstOut))+row('Net revenue (ex-GST)',money(c.spx))+
  row('Purchase cost'+(c.u?' (incl. GST, no ITC)':''),money(-c.buy))+row('Packaging',money(-c.pack))+row('Referral fee',money(-c.ref))+row(p.mode==='fba'?'FBA fulfilment + handling':'Easy Ship fee',money(-c.fee))+
  row('Storage + inbound',money(-c.logi))+row('Unrecovered GST on Amazon fees',money(-(c.svcG+c.adsG)))+row('Advertising',money(-c.ads))+row('Returns and damage',money(-c.ret))+row('Other expenses',money(-c.other))+
  row('Estimated net profit',money(c.profit),c.profit<0);
 $('actualCard').hidden=p.actual===null;
 if(p.actual!==null){const d=p.actual-c.profit;$('act').innerHTML=row('Estimated profit',money(c.profit))+row('Actual profit (from settlement)',money(p.actual))+row('Difference (actual − estimated)',money(d),d<0)}
 $('tag').textContent=p.actual!==null?'Estimated (actual entered below)':'Estimated';
 return p}
let saved=[];try{saved=JSON.parse(localStorage.getItem('sw_saved'))||[]}catch(e){}
const persist=()=>{try{localStorage.setItem('sw_saved',JSON.stringify(saved))}catch(e){}};
function list(){$('saved').innerHTML=saved.length?saved.map((s,i)=>{const m=metrics(s.p,s.p.mode);return`<div class="item"><span>${s.name.replace(/[<>&]/g,'')}<br><small>${money(m.c.profit)} per unit</small></span><span><button data-l="${i}">Load</button><button class="del" data-d="${i}">Delete</button></span></div>`}).join(''):'<p>No saved products yet.</p>'}
$('saveBtn').onclick=()=>{const p=read(),n=$('pname').value.trim();
 $('saveErr').textContent=!n?'Enter a product name.':!p?'Fix the highlighted fields first.':'';
 if(!n||!p)return;saved.push({name:n,p});persist();list();$('pname').value=''};
$('saved').onclick=e=>{const l=e.target.dataset.l,d=e.target.dataset.d;
 if(l!==undefined){const p=saved[l].p;IDS.forEach(i=>$(i).value=p[i]===null?'':p[i]);$('mode').value=p.mode;$('itc').checked=p.itc;$('refInc').checked=p.refInc;render()}
 if(d!==undefined){saved.splice(d,1);persist();list()}};
$('csvBtn').onclick=()=>{const cur=read(),rows=saved.slice();
 if(!rows.length&&cur)rows.push({name:'Current calculation',p:cur});
 if(!rows.length)return;
 const H=['Name','Status','Fulfilment','ITC claimed','Selling price incl GST','Net revenue ex GST','Estimated profit per unit','Margin %','ROI %','Break-even price','Target profit price','Max ad spend','Break-even ACoS %','Actual profit per unit'];
 const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const r=rows.map(({name,p})=>{const m=metrics(p,p.mode),n=v=>v===null?'':v.toFixed(2);
  return[name,p.actual===null?'Estimated':'Estimated + actual',p.mode==='fba'?'FBA':'Easy Ship',p.itc?'Yes':'No',p.sp,n(m.c.spx),n(m.c.profit),n(m.margin),n(m.roi),n(m.be),n(m.tp),n(m.maxAd),n(m.acos),p.actual===null?'':p.actual].map(q).join(',')});
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+[H.map(q).join(','),...r].join('\n')],{type:'text/csv'}));
 a.download='separate-way-profit.csv';a.click();URL.revokeObjectURL(a.href)};
try{const s=JSON.parse(localStorage.getItem('sw_in'));if(s){IDS.forEach(i=>{if(s[i]!==undefined)$(i).value=s[i]});$('mode').value=s.mode||'fba';$('itc').checked=s.itc!==false;$('refInc').checked=s.refInc!==false}}catch(e){}
document.addEventListener('input',render);document.addEventListener('change',render);
list();render();
