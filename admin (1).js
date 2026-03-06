/**
 * DawnMC — admin.js  (auth required)
 * Domain: dawnmc.dpdns.org
 */
'use strict';

(function(){
  if(window.top!==window.self){try{window.top.location=window.self.location;}catch(e){document.documentElement.innerHTML='';}}
  const ok=['dawnmc.dpdns.org','localhost','127.0.0.1'];
  if(!ok.includes(window.location.hostname)){document.body.innerHTML='<p style="color:#FC8181;font-family:monospace;padding:40px;text-align:center">Unauthorized domain.</p>';throw new Error('Domain not allowed');}
})();

const FB={
  apiKey:'AIzaSyAdXd0d_uOwjH6rvpjNAlmzpKUSAf_w9RE',
  authDomain:'dawn-mc-8a7f9.firebaseapp.com',
  databaseURL:'https://dawn-mc-8a7f9-default-rtdb.firebaseio.com',
  projectId:'dawn-mc-8a7f9',
  storageBucket:'dawn-mc-8a7f9.firebasestorage.app',
  messagingSenderId:'329783945294',
  appId:'1:329783945294:web:e8f2cfa515945984a4fb1f'
};
let db,auth;

/* ── SANITIZER ── */
function san(v){
  if(v==null)return'';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim().slice(0,4000);
}
function safeImg(u){
  if(!u)return false;
  return/^https:\/\/res\.cloudinary\.com\//.test(u.trim())||/^https:\/\/firebasestorage\.googleapis\.com\//.test(u.trim());
}

/* ── LIMITS ── */
const LIMITS={title:120,desc:1000,name:120,role:60,social:80,price:30,perms:1000,rankName:60,version:20,patchDesc:1000,roadmapDesc:500};
function validate(field,val,max){
  const s=String(val||'').trim();
  if(!s)return{ok:false,msg:field+' is required.'};
  if(s.length>max)return{ok:false,msg:field+' must be under '+max+' chars.'};
  if(/<\s*script/i.test(s)||/javascript\s*:/i.test(s)||/<\s*iframe/i.test(s))return{ok:false,msg:'Invalid content in '+field+'.'};
  return{ok:true,val:s};
}
function validateOpt(val,max){const s=String(val||'').trim();return{ok:true,val:s.slice(0,max)};}
function validateImg(url){if(!url)return{ok:true,val:''};if(!safeImg(url))return{ok:false,msg:'Image must be uploaded via the upload button.'};return{ok:true,val:url};}

/* ── RATE LIMIT ── */
const _saves={},SAVE_CD=2000;
let _lastUpload=0;
const UPLOAD_CD=10000,MAX_UPLOAD=5*1024*1024;
const CLOUD_NAME='damr6r9op',CLOUD_PRESET='dawnmc';
const ALLOWED_TYPES=['image/png','image/jpeg','image/webp'];

function checkSave(key){
  const now=Date.now();
  if(_saves[key]&&now-_saves[key]<SAVE_CD){toast('Please wait before saving again.','error');return false;}
  _saves[key]=now;return true;
}

/* ── DOM HELPERS ── */
function mk(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function getV(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function setV(id,v){const e=document.getElementById(id);if(e)e.value=v;}
function setChk(id,v){const e=document.getElementById(id);if(e)e.checked=!!v;}
function getChk(id){const e=document.getElementById(id);return e?e.checked:false;}

function toast(msg,type){
  type=type||'success';
  const c=document.getElementById('toast-container');
  if(!c)return;
  const t=mk('div','toast '+type,msg);
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400);},3500);
}

/* ── AUTH ── */
function initFirebase(){
  try{firebase.initializeApp(FB);db=firebase.database();auth=firebase.auth();auth.onAuthStateChanged(onAuth);}
  catch(e){toast('Firebase init failed.','error');}
}
function onAuth(user){
  const login=document.getElementById('admin-login-screen');
  const dash=document.getElementById('admin-dashboard');
  if(user){login.classList.add('hidden');dash.classList.remove('hidden');listenAll();toast('Signed in as '+san(user.email),'success');}
  else{login.classList.remove('hidden');dash.classList.add('hidden');}
}
function doLogin(){
  const email=getV('login-email');
  const pass=document.getElementById('login-password').value;
  const err=document.getElementById('login-error');
  err.classList.add('hidden');
  if(!email||!pass){err.textContent='Fill in both fields.';err.classList.remove('hidden');return;}
  auth.signInWithEmailAndPassword(email,pass).catch(e=>{err.textContent='Sign-in failed: '+san(e.message);err.classList.remove('hidden');});
}
function requireAuth(){if(!auth||!auth.currentUser){toast('Session expired. Please sign in.','error');return false;}return true;}

/* ── PANEL NAV ── */
function initPanelNav(){
  document.querySelectorAll('.admin-nav-link').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      const id=link.dataset.panel;if(!id)return;
      document.querySelectorAll('.admin-panel').forEach(p=>{p.classList.remove('active');p.classList.add('hidden');});
      document.querySelectorAll('.admin-nav-link').forEach(l=>l.classList.remove('active'));
      const panel=document.getElementById(id);
      if(panel){panel.classList.remove('hidden');panel.classList.add('active');}
      link.classList.add('active');
    });
  });
}

/* ── MODALS ── */
function openModal(id){const m=document.getElementById(id);if(m)m.classList.remove('hidden');}
function closeModal(id){
  const m=document.getElementById(id);if(!m)return;
  m.classList.add('hidden');
  m.querySelectorAll('input:not([type=checkbox]),textarea').forEach(i=>i.value='');
  m.querySelectorAll('input[type=checkbox]').forEach(i=>i.checked=false);
  m.querySelectorAll('input[type=hidden]').forEach(i=>i.value='');
  m.querySelectorAll('select').forEach(s=>s.selectedIndex=0);
  m.querySelectorAll('.upload-preview').forEach(i=>{i.src='';i.classList.add('hidden');});
}
function initModalClose(){
  document.querySelectorAll('[data-modal-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.modalClose)));
  document.querySelectorAll('.modal-overlay').forEach(ov=>ov.addEventListener('click',e=>{if(e.target===ov)closeModal(ov.id);}));
}

/* ── UPLOAD ── */
async function doUpload(fileId,previewId,urlId){
  const input=document.getElementById(fileId);
  const file=input&&input.files[0];
  if(!file)return;
  const now=Date.now();
  if(now-_lastUpload<UPLOAD_CD){toast('Wait '+(Math.ceil((UPLOAD_CD-(now-_lastUpload))/1000))+'s before next upload.','error');input.value='';return;}
  if(!ALLOWED_TYPES.includes(file.type)){toast('Only PNG, JPG, WEBP allowed.','error');input.value='';return;}
  if(file.size>MAX_UPLOAD){toast('Max file size is 5MB.','error');input.value='';return;}
  _lastUpload=now;
  toast('Uploading…','success');
  const fd=new FormData();fd.append('file',file);fd.append('upload_preset',CLOUD_PRESET);
  try{
    const res=await fetch('https://api.cloudinary.com/v1_1/'+CLOUD_NAME+'/image/upload',{method:'POST',body:fd});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(data.secure_url&&safeImg(data.secure_url)){
      setV(urlId,data.secure_url);
      const p=document.getElementById(previewId);
      if(p){p.src=data.secure_url;p.classList.remove('hidden');}
      toast('Image uploaded!','success');
    }else throw new Error('Bad URL from Cloudinary');
  }catch(e){toast('Upload failed: '+san(e.message),'error');}
  input.value='';
}

function initUploads(){
  [['ann-upload-area','ann-img-file','ann-img-preview','ann-img-url'],
   ['patch-upload-area','patch-img-file','patch-img-preview','patch-img-url'],
   ['event-upload-area','event-img-file','event-img-preview','event-img-url'],
   ['store-upload-area','store-img-file','store-img-preview','store-img-url'],
   ['staff-upload-area','staff-img-file','staff-img-preview','staff-img-url'],
   ['rank-upload-area','rank-img-file','rank-img-preview','rank-img-url']
  ].forEach(([areaId,fileId,prevId,urlId])=>{
    const area=document.getElementById(areaId),input=document.getElementById(fileId);
    if(area&&input){area.addEventListener('click',()=>input.click());input.addEventListener('change',()=>doUpload(fileId,prevId,urlId));}
  });
}

/* ── TABLE HELPERS ── */
function thumbEl(url){
  if(!url||!safeImg(url))return document.createTextNode('—');
  const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';img.style.cssText='width:48px;height:48px;object-fit:cover;border-radius:6px';
  img.addEventListener('error',()=>img.replaceWith(document.createTextNode('—')));
  return img;
}
function editBtn(label,fn){const b=mk('button','btn btn-ghost btn-sm',label);b.addEventListener('click',fn);return b;}
function delBtn(fn){const b=mk('button','btn btn-danger btn-sm','Delete');b.addEventListener('click',fn);return b;}
function makeRow(cells,actions){
  const tr=document.createElement('tr');
  cells.forEach(c=>{const td=document.createElement('td');if(c&&c.nodeName)td.appendChild(c);else td.textContent=String(c||'');tr.appendChild(td);});
  const actTd=document.createElement('td');actTd.className='table-actions';actions.forEach(a=>actTd.appendChild(a));tr.appendChild(actTd);
  return tr;
}
function emptyRow(cols){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=cols;td.className='admin-table-empty';td.textContent='No entries yet.';tr.appendChild(td);return tr;}
function deleteEntry(path,key){
  if(!requireAuth())return;
  if(!confirm('Delete this entry? Cannot be undone.'))return;
  db.ref(path+'/'+key).remove().then(()=>toast('Deleted.','success')).catch(e=>toast('Delete failed: '+san(e.message),'error'));
}

/* ══════════════════════════════════════════════
   LISTENERS + TABLE RENDERS
══════════════════════════════════════════════ */
function listenAll(){
  listenAnn();listenPatch();listenEvents();listenRoadmap();listenLb();listenStore();listenStaff();listenRanks();
}

/* ── ANNOUNCEMENTS ── */
function listenAnn(){
  db.ref('announcements').on('value',snap=>{
    const tbody=document.getElementById('ann-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    const items=Object.entries(d).sort((a,b)=>new Date(b[1].date)-new Date(a[1].date));
    items.forEach(([key,ann])=>{
      tbody.appendChild(makeRow([san(ann.title),san(ann.date),ann.isNew?'✓':'',thumbEl(ann.image)],
        [editBtn('Edit',()=>fillAnn(key,ann)),delBtn(()=>deleteEntry('announcements',key))]));
    });
  });
}

/* ── PATCH NOTES ── */
function listenPatch(){
  db.ref('patchnotes').on('value',snap=>{
    const tbody=document.getElementById('patch-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    const items=Object.entries(d).sort((a,b)=>new Date(b[1].releaseDate)-new Date(a[1].releaseDate));
    items.forEach(([key,p])=>{
      tbody.appendChild(makeRow(['v'+san(p.version),san(p.title),san(p.releaseDate||''),thumbEl(p.image)],
        [editBtn('Edit',()=>fillPatch(key,p)),delBtn(()=>deleteEntry('patchnotes',key))]));
    });
  });
}

/* ── EVENTS ── */
function listenEvents(){
  db.ref('events').on('value',snap=>{
    const tbody=document.getElementById('events-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    const items=Object.entries(d).sort((a,b)=>new Date(a[1].timestamp)-new Date(b[1].timestamp));
    items.forEach(([key,ev])=>{
      const badge=mk('span','badge badge-'+String(ev.status||'upcoming').toLowerCase(),san(ev.status||'upcoming'));
      tbody.appendChild(makeRow([san(ev.name),badge,san(ev.timestamp?new Date(ev.timestamp).toLocaleString():''),san(ev.duration?ev.duration+' min':'')],
        [editBtn('Edit',()=>fillEvent(key,ev)),delBtn(()=>deleteEntry('events',key))]));
    });
  });
}

/* ── ROADMAP ── */
function listenRoadmap(){
  db.ref('roadmap').on('value',snap=>{
    const tbody=document.getElementById('roadmap-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    const items=Object.entries(d).sort((a,b)=>new Date(a[1].plannedDate)-new Date(b[1].plannedDate));
    items.forEach(([key,m])=>{
      const pct=san(String(m.progressPercentage||0))+'%';
      const statusBadge=mk('span','milestone-status '+(m.status||'planned'),san(m.status||'planned'));
      tbody.appendChild(makeRow([san(m.title),statusBadge,pct,san(m.plannedDate||'')],
        [editBtn('Edit',()=>fillRoadmap(key,m)),delBtn(()=>deleteEntry('roadmap',key))]));
    });
  });
}

/* ── LEADERBOARDS ── */
let _lbAdminCat='kills';
function listenLb(){
  db.ref('leaderboards').on('value',snap=>{
    renderLbTable(_lbAdminCat,snap.val()||{});
  });
}
function renderLbTable(cat,allData){
  const tbody=document.getElementById('lb-tbody');if(!tbody)return;tbody.textContent='';
  const catData=allData[cat];
  if(!catData){tbody.appendChild(emptyRow(5));return;}
  const items=Object.entries(catData).sort((a,b)=>(a[1].rank||999)-(b[1].rank||999));
  items.forEach(([key,pl])=>{
    tbody.appendChild(makeRow([san(String(pl.rank||'?')),san(pl.playerName),san(pl.value),san(cat)],
      [editBtn('Edit',()=>fillLb(key,pl,cat)),delBtn(()=>deleteEntry('leaderboards/'+cat,key))]));
  });
}

function initLbAdminTabs(){
  const tabs=document.querySelectorAll('.lb-admin-tab');
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      _lbAdminCat=tab.dataset.lbAdmin||'kills';
      db.ref('leaderboards').once('value',snap=>renderLbTable(_lbAdminCat,snap.val()||{}));
    });
  });
  const refreshBtn=document.getElementById('lb-refresh-btn');
  if(refreshBtn)refreshBtn.addEventListener('click',()=>{
    if(!requireAuth())return;
    db.ref('leaderboards').once('value',snap=>renderLbTable(_lbAdminCat,snap.val()||{}));
    toast('Leaderboards refreshed.','success');
  });
  const clearBtn=document.getElementById('lb-clear-btn');
  if(clearBtn)clearBtn.addEventListener('click',()=>{
    if(!requireAuth())return;
    if(!confirm('Clear ALL leaderboard data?'))return;
    db.ref('leaderboards').remove().then(()=>toast('Cache cleared.','success')).catch(e=>toast(san(e.message),'error'));
  });
}

/* ── STORE ── */
function listenStore(){
  db.ref('store/items').on('value',snap=>{
    const tbody=document.getElementById('store-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    Object.entries(d).forEach(([key,it])=>{
      tbody.appendChild(makeRow([san(it.name),san(it.price),san(it.category),thumbEl(it.image)],
        [editBtn('Edit',()=>fillStore(key,it)),delBtn(()=>deleteEntry('store/items',key))]));
    });
  });
}

/* ── STAFF ── */
function listenStaff(){
  db.ref('staff').on('value',snap=>{
    const tbody=document.getElementById('staff-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    Object.entries(d).forEach(([key,s])=>{
      tbody.appendChild(makeRow([thumbEl(s.avatar),san(s.name),san(s.role),san(s.social)],
        [editBtn('Edit',()=>fillStaff(key,s)),delBtn(()=>deleteEntry('staff',key))]));
    });
  });
}

/* ── RANKS ── */
function listenRanks(){
  db.ref('ranks').on('value',snap=>{
    const tbody=document.getElementById('ranks-tbody');if(!tbody)return;tbody.textContent='';
    const d=snap.val();if(!d){tbody.appendChild(emptyRow(5));return;}
    Object.entries(d).forEach(([key,r])=>{
      const p=san(r.permissionsDescription||'').slice(0,60)+(String(r.permissionsDescription||'').length>60?'…':'');
      tbody.appendChild(makeRow([thumbEl(r.image),san(r.rankName),san(r.price),p],
        [editBtn('Edit',()=>fillRank(key,r)),delBtn(()=>deleteEntry('ranks',key))]));
    });
  });
}

/* ══════════════════════════════════════════════
   FILL MODALS
══════════════════════════════════════════════ */
function setImgPreview(previewId,url){
  const p=document.getElementById(previewId);
  if(p&&url&&safeImg(url)){p.src=url;p.classList.remove('hidden');}
}
function fillAnn(key,ann){
  setV('ann-key',key);setV('ann-title',ann.title||'');setV('ann-desc',ann.description||'');setV('ann-date',ann.date||'');setV('ann-img-url',ann.image||'');setChk('ann-isnew',ann.isNew);
  setImgPreview('ann-img-preview',ann.image);
  const t=document.getElementById('ann-modal-title');if(t)t.textContent='Edit Announcement';
  openModal('ann-modal');
}
function fillPatch(key,p){
  setV('patch-key',key);setV('patch-version',p.version||'');setV('patch-title',p.title||'');setV('patch-desc',p.description||'');setV('patch-date',p.releaseDate||'');
  const feats=Array.isArray(p.features)?p.features.join('\n'):(p.features||'');
  const fixes=Array.isArray(p.fixes)?p.fixes.join('\n'):(p.fixes||'');
  setV('patch-features',feats);setV('patch-fixes',fixes);setV('patch-img-url',p.image||'');
  setImgPreview('patch-img-preview',p.image);
  const t=document.getElementById('patch-modal-title');if(t)t.textContent='Edit Patch Note';
  openModal('patch-modal');
}
function fillEvent(key,ev){
  setV('event-key',key);setV('event-name',ev.name||'');setV('event-desc',ev.description||'');setV('event-ts',ev.timestamp||'');setV('event-duration',ev.duration||'');setV('event-category',ev.category||'Tournament');setV('event-status',ev.status||'upcoming');setV('event-img-url',ev.banner||'');
  setImgPreview('event-img-preview',ev.banner);
  const t=document.getElementById('event-modal-title');if(t)t.textContent='Edit Event';
  openModal('event-modal');
}
function fillRoadmap(key,m){
  setV('roadmap-key',key);setV('roadmap-title',m.title||'');setV('roadmap-desc',m.description||'');setV('roadmap-date',m.plannedDate||'');setV('roadmap-status',m.status||'planned');setV('roadmap-progress',m.progressPercentage||0);
  const t=document.getElementById('roadmap-modal-title');if(t)t.textContent='Edit Milestone';
  openModal('roadmap-modal');
}
function fillLb(key,pl,cat){
  setV('lb-key',key);setV('lb-category',cat||'kills');setV('lb-player',pl.playerName||'');setV('lb-value',pl.value||'');setV('lb-rank',pl.rank||'');
  const t=document.getElementById('lb-modal-title');if(t)t.textContent='Edit Entry';
  openModal('lb-modal');
}
function fillStore(key,it){
  setV('store-key',key);setV('store-name',it.name||'');setV('store-price',it.price||'');setV('store-desc',it.description||'');setV('store-cat',it.category||'Ranks');setV('store-img-url',it.image||'');
  setImgPreview('store-img-preview',it.image);
  const t=document.getElementById('store-modal-title');if(t)t.textContent='Edit Store Item';
  openModal('store-modal');
}
function fillStaff(key,s){
  setV('staff-key',key);setV('staff-name',s.name||'');setV('staff-role',s.role||'');setV('staff-social',s.social||'');setV('staff-img-url',s.avatar||'');
  setImgPreview('staff-img-preview',s.avatar);
  const t=document.getElementById('staff-modal-title');if(t)t.textContent='Edit Staff';
  openModal('staff-modal');
}
function fillRank(key,r){
  setV('rank-key',key);setV('rank-name',r.rankName||'');setV('rank-price',r.price||'');setV('rank-perms',r.permissionsDescription||'');setV('rank-img-url',r.image||'');
  setImgPreview('rank-img-preview',r.image);
  const t=document.getElementById('rank-modal-title');if(t)t.textContent='Edit Rank';
  openModal('rank-modal');
}

/* ══════════════════════════════════════════════
   SAVES
══════════════════════════════════════════════ */
function wireSave(btnId,key,saveKey,pathFn,buildData,modalId){
  const btn=document.getElementById(btnId);
  if(!btn)return;
  btn.addEventListener('click',()=>{
    if(!requireAuth())return;
    if(!checkSave(saveKey))return;
    const data=buildData();
    if(!data)return;
    const k=getV(key);
    const ref=k?db.ref(pathFn(k)):db.ref(pathFn(null)).push();
    if(k)ref.set(data).then(()=>{toast('Updated!','success');closeModal(modalId);}).catch(e=>toast(san(e.message),'error'));
    else ref.set(data).then(()=>{toast('Created!','success');closeModal(modalId);}).catch(e=>toast(san(e.message),'error'));
  });
}

function initSaves(){
  /* Announcement */
  wireSave('ann-save-btn','ann-key','ann',k=>k?'announcements/'+k:'announcements',()=>{
    const tV=validate('Title',getV('ann-title'),LIMITS.title);if(!tV.ok){toast(tV.msg,'error');return null;}
    const dV=validateOpt(getV('ann-desc'),LIMITS.desc);
    const iV=validateImg(getV('ann-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    return{title:tV.val,description:dV.val,date:getV('ann-date')||'',image:iV.val,isNew:getChk('ann-isnew')};
  },'ann-modal');

  /* Patch Note */
  wireSave('patch-save-btn','patch-key','patch',k=>k?'patchnotes/'+k:'patchnotes',()=>{
    const vV=validate('Version',getV('patch-version'),LIMITS.version);if(!vV.ok){toast(vV.msg,'error');return null;}
    const tV=validate('Title',getV('patch-title'),LIMITS.title);if(!tV.ok){toast(tV.msg,'error');return null;}
    const dV=validateOpt(getV('patch-desc'),LIMITS.patchDesc);
    const iV=validateImg(getV('patch-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    const features=getV('patch-features').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,50);
    const fixes=getV('patch-fixes').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,50);
    return{version:vV.val,title:tV.val,description:dV.val,releaseDate:getV('patch-date')||'',features,fixes,image:iV.val};
  },'patch-modal');

  /* Event */
  wireSave('event-save-btn','event-key','event',k=>k?'events/'+k:'events',()=>{
    const nV=validate('Event name',getV('event-name'),LIMITS.name);if(!nV.ok){toast(nV.msg,'error');return null;}
    const dV=validateOpt(getV('event-desc'),LIMITS.desc);
    const iV=validateImg(getV('event-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    return{name:nV.val,description:dV.val,timestamp:getV('event-ts')||'',duration:parseInt(getV('event-duration'))||0,category:getV('event-category')||'Community',status:getV('event-status')||'upcoming',banner:iV.val};
  },'event-modal');

  /* Roadmap */
  wireSave('roadmap-save-btn','roadmap-key','roadmap',k=>k?'roadmap/'+k:'roadmap',()=>{
    const tV=validate('Title',getV('roadmap-title'),LIMITS.title);if(!tV.ok){toast(tV.msg,'error');return null;}
    const dV=validateOpt(getV('roadmap-desc'),LIMITS.roadmapDesc);
    const prog=Math.min(Math.max(parseInt(getV('roadmap-progress'))||0,0),100);
    return{title:tV.val,description:dV.val,plannedDate:getV('roadmap-date')||'',status:getV('roadmap-status')||'planned',progressPercentage:prog};
  },'roadmap-modal');

  /* Leaderboard entry */
  wireSave('lb-save-btn','lb-key','lb',k=>{
    const cat=getV('lb-category')||'kills';
    return k?'leaderboards/'+cat+'/'+k:'leaderboards/'+cat;
  },()=>{
    const pV=validate('Player name',getV('lb-player'),60);if(!pV.ok){toast(pV.msg,'error');return null;}
    const valV=validate('Value',getV('lb-value'),40);if(!valV.ok){toast(valV.msg,'error');return null;}
    return{playerName:pV.val,value:valV.val,rank:parseInt(getV('lb-rank'))||1,category:getV('lb-category')||'kills'};
  },'lb-modal');

  /* Store */
  wireSave('store-save-btn','store-key','store',k=>k?'store/items/'+k:'store/items',()=>{
    const nV=validate('Name',getV('store-name'),LIMITS.name);if(!nV.ok){toast(nV.msg,'error');return null;}
    const pV=validate('Price',getV('store-price'),LIMITS.price);if(!pV.ok){toast(pV.msg,'error');return null;}
    const dV=validateOpt(getV('store-desc'),LIMITS.desc);
    const iV=validateImg(getV('store-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    return{name:nV.val,price:pV.val,description:dV.val,category:getV('store-cat')||'Ranks',image:iV.val};
  },'store-modal');

  /* Staff */
  wireSave('staff-save-btn','staff-key','staff',k=>k?'staff/'+k:'staff',()=>{
    const nV=validate('Name',getV('staff-name'),LIMITS.name);if(!nV.ok){toast(nV.msg,'error');return null;}
    const rV=validate('Role',getV('staff-role'),LIMITS.role);if(!rV.ok){toast(rV.msg,'error');return null;}
    const iV=validateImg(getV('staff-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    return{name:nV.val,role:rV.val,social:validateOpt(getV('staff-social'),LIMITS.social).val,avatar:iV.val};
  },'staff-modal');

  /* Rank */
  wireSave('rank-save-btn','rank-key','rank',k=>k?'ranks/'+k:'ranks',()=>{
    const nV=validate('Rank name',getV('rank-name'),LIMITS.rankName);if(!nV.ok){toast(nV.msg,'error');return null;}
    const pV=validate('Price',getV('rank-price'),LIMITS.price);if(!pV.ok){toast(pV.msg,'error');return null;}
    const permsV=validateOpt(getV('rank-perms'),LIMITS.perms);
    const iV=validateImg(getV('rank-img-url'));if(!iV.ok){toast(iV.msg,'error');return null;}
    return{rankName:nV.val,price:pV.val,permissionsDescription:permsV.val,image:iV.val};
  },'rank-modal');
}

/* ── NEW BUTTONS ── */
function initNewButtons(){
  const map={
    'ann-new-btn':['ann-modal','ann-modal-title','New Announcement'],
    'patch-new-btn':['patch-modal','patch-modal-title','New Patch Note'],
    'event-new-btn':['event-modal','event-modal-title','New Event'],
    'roadmap-new-btn':['roadmap-modal','roadmap-modal-title','New Milestone'],
    'lb-new-btn':['lb-modal','lb-modal-title','Add Leaderboard Entry'],
    'store-new-btn':['store-modal','store-modal-title','New Store Item'],
    'staff-new-btn':['staff-modal','staff-modal-title','New Staff Member'],
    'rank-new-btn':['rank-modal','rank-modal-title','New Rank'],
  };
  Object.entries(map).forEach(([btnId,[modalId,titleId,label]])=>{
    const btn=document.getElementById(btnId);
    if(btn)btn.addEventListener('click',()=>{const t=document.getElementById(titleId);if(t)t.textContent=label;closeModal(modalId);openModal(modalId);});
  });
}

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  const loginBtn=document.getElementById('login-btn');
  if(loginBtn)loginBtn.addEventListener('click',doLogin);
  const passInput=document.getElementById('login-password');
  if(passInput)passInput.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  const logoutBtn=document.getElementById('logout-btn');
  if(logoutBtn)logoutBtn.addEventListener('click',()=>auth&&auth.signOut().then(()=>toast('Signed out.','success')));
  initPanelNav();
  initModalClose();
  initUploads();
  initNewButtons();
  initSaves();
  initLbAdminTabs();
  if(typeof firebase!=='undefined')initFirebase();
  else window.addEventListener('load',()=>{if(typeof firebase!=='undefined')initFirebase();else toast('Firebase failed to load.','error');});
});
