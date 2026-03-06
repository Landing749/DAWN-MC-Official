/**
 * DawnMC — site.js  (public, no auth)
 * Domain guard: dawnmc.dpdns.org
 * Zero innerHTML for user data — textContent + DOM construction only
 */
'use strict';

/* ── FRAME BUST ── */
(function(){
  if(window.top!==window.self){
    try{window.top.location=window.self.location;}
    catch(e){document.documentElement.innerHTML='';}
  }
})();

/* ── DOMAIN GUARD ── */
(function(){
  const ok=['dawnmc.dpdns.org','localhost','127.0.0.1'];
  if(!ok.includes(window.location.hostname)){
    document.body.innerHTML='<p style="color:#FC8181;font-family:monospace;padding:40px;text-align:center">Unauthorized domain.</p>';
    throw new Error('Domain not allowed');
  }
})();

/* ══════════════════════════════════════════════
   FIREBASE CONFIG
══════════════════════════════════════════════ */
const FB={
  apiKey:'AIzaSyAdXd0d_uOwjH6rvpjNAlmzpKUSAf_w9RE',
  authDomain:'dawn-mc-8a7f9.firebaseapp.com',
  databaseURL:'https://dawn-mc-8a7f9-default-rtdb.firebaseio.com',
  projectId:'dawn-mc-8a7f9',
  storageBucket:'dawn-mc-8a7f9.firebasestorage.app',
  messagingSenderId:'329783945294',
  appId:'1:329783945294:web:e8f2cfa515945984a4fb1f'
};
let db=null;

/* ══════════════════════════════════════════════
   SANITIZER
══════════════════════════════════════════════ */
function san(v){
  if(v==null)return'';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim().slice(0,4000);
}
function safeImg(u){
  if(!u||typeof u!=='string')return false;
  const t=u.trim();
  return/^https:\/\/res\.cloudinary\.com\//.test(t)||
         /^https:\/\/firebasestorage\.googleapis\.com\//.test(t)||
         /^[a-zA-Z0-9._\-/]+\.(png|jpe?g|webp|gif)$/i.test(t);
}

/* ══════════════════════════════════════════════
   DOM HELPERS
══════════════════════════════════════════════ */
function mk(tag,cls,txt){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function mkImg(src,alt,cls){
  const i=document.createElement('img');
  i.src=src; i.alt=alt||''; i.loading='lazy';
  if(cls)i.className=cls;
  return i;
}
function toast(msg,type){
  type=type||'success';
  const c=document.getElementById('toast-container');
  if(!c)return;
  const t=mk('div','toast '+type,msg);
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400);},3500);
}
function showOffline(){
  const n=document.getElementById('db-offline-notice');
  if(n)n.classList.remove('hidden');
}

/* ══════════════════════════════════════════════
   CINEMATIC LOADER
   Phase timeline (ms):
   0    — black
   300  — stars appear
   800  — horizon glow fades in
   1400 — sun core expands + rays sweep
   2200 — logo drops in
   2800 — wordmark letters cascade
   3400 — tagline typewriter
   3900 — progress bar + label cycle
   5200 — fade to site
══════════════════════════════════════════════ */
function initLoader(){
  const canvas=document.getElementById('loading-canvas');
  const ctx=canvas&&canvas.getContext('2d');
  const ls=document.getElementById('loading-screen');
  const logoImg=document.getElementById('loading-logo');
  const logoFb=document.getElementById('loading-logo-fallback');
  const wordmark=document.getElementById('loading-wordmark');
  const tagEl=document.getElementById('loading-tagline-text');
  const progressBar=document.getElementById('loading-progress-bar');
  const progressLabel=document.getElementById('loading-progress-label');
  const progressWrap=document.getElementById('loading-progress-wrap');
  const logoWrap=document.getElementById('loading-logo-wrap');
  const raysEl=document.getElementById('loading-rays');
  const sunEl=document.getElementById('loading-sun-core');
  const horizonEl=document.getElementById('loading-horizon-glow');

  if(!ls)return;

  /* ── handle logo error without inline onerror ── */
  if(logoImg){
    logoImg.addEventListener('error',()=>{
      logoImg.style.display='none';
      if(logoFb){logoFb.style.display='flex';}
    });
  }
  const navLogoImg=document.getElementById('nav-logo-img');
  if(navLogoImg)navLogoImg.addEventListener('error',()=>{navLogoImg.style.display='none';});

  /* ── STAR PARTICLES ── */
  let W,H,stars=[],raf;
  function resizeCanvas(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
  }
  function initStars(){
    stars=[];
    for(let i=0;i<220;i++){
      stars.push({
        x:Math.random(),y:Math.random()*.75,
        r:Math.random()*1.5+.2,
        a:Math.random()*.8+.1,
        twinkleSpeed:Math.random()*.02+.005,
        twinklePhase:Math.random()*Math.PI*2
      });
    }
  }
  let starOpacity=0,sunProgress=0,raysProgress=0;
  function drawFrame(t){
    ctx.clearRect(0,0,W,H);
    // background gradient
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#000');
    bg.addColorStop(.6,'#04040F');
    bg.addColorStop(1,'#0A0520');
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,W,H);
    // stars
    if(starOpacity>0){
      for(const s of stars){
        const twinkle=Math.sin(t*s.twinkleSpeed+s.twinklePhase)*.3+.7;
        ctx.beginPath();
        ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,240,200,${s.a*starOpacity*twinkle})`;
        ctx.fill();
      }
    }
    raf=requestAnimationFrame(drawFrame);
  }
  window.addEventListener('resize',resizeCanvas,{passive:true});
  resizeCanvas();
  initStars();
  drawFrame(0);

  /* ── BUILD RAYS ── */
  const RAY_COUNT=24;
  for(let i=0;i<RAY_COUNT;i++){
    const ray=mk('div','loading-ray');
    const angle=(-90+(i/RAY_COUNT)*180);
    const len=Math.random()*180+80;
    ray.style.cssText=`transform:rotate(${angle}deg);height:${len}px;opacity:0;width:${i%3===0?2:1}px`;
    raysEl.appendChild(ray);
  }

  /* ── ANIMATION PHASES ── */
  function phase(delay,fn){setTimeout(fn,delay);}

  // Phase 1 — stars fade in
  phase(400,()=>{
    let p=0;
    const iv=setInterval(()=>{
      p=Math.min(p+.025,1);
      starOpacity=p;
      if(p>=1)clearInterval(iv);
    },20);
  });

  // Phase 2 — horizon + sun
  phase(900,()=>{
    if(horizonEl){horizonEl.style.opacity='1';}
    if(sunEl){
      sunEl.style.opacity='1';
      sunEl.style.transition='all 1.4s cubic-bezier(.2,0,.4,1)';
      sunEl.style.width='120px';
      sunEl.style.height='120px';
      sunEl.style.boxShadow='0 0 80px 40px rgba(255,140,0,.5),0 0 200px 80px rgba(255,107,53,.3),0 0 400px 140px rgba(255,107,53,.1)';
    }
  });

  // Phase 3 — rays sweep
  phase(1500,()=>{
    if(raysEl){raysEl.style.opacity='1';}
    const rays=raysEl?raysEl.querySelectorAll('.loading-ray'):[];
    rays.forEach((r,i)=>{
      setTimeout(()=>{
        r.style.transition='opacity .6s ease, height .8s ease';
        r.style.opacity=String(.15+Math.random()*.25);
        r.style.height=String(parseInt(r.style.height)+100)+'px';
      },i*25);
    });
  });

  // Phase 4 — logo
  phase(2300,()=>{
    if(logoWrap){
      logoWrap.style.transition='opacity .8s ease, transform .8s cubic-bezier(.2,0,.3,1)';
      logoWrap.style.opacity='1';
      logoWrap.style.transform='scale(1)';
      if(logoImg){logoImg.style.filter='drop-shadow(0 0 30px rgba(255,107,53,.9))';}
      if(logoFb&&logoFb.style.display!=='none'){logoFb.style.filter='drop-shadow(0 0 30px rgba(255,107,53,.9))';}
    }
  });

  // Phase 5 — wordmark cascade
  phase(2900,()=>{
    if(!wordmark)return;
    const spans=wordmark.querySelectorAll('span');
    spans.forEach((s,i)=>{
      setTimeout(()=>{
        s.style.transition='opacity .5s ease, transform .5s cubic-bezier(.2,0,.3,1)';
        s.style.opacity='1';
        s.style.transform='translateY(0) scale(1)';
      },i*80);
    });
  });

  // Phase 6 — tagline typewriter
  const TAGLINE='Anarchy  •  RPG  •  Survival';
  phase(3500,()=>{
    if(!tagEl)return;
    const tEl=document.getElementById('loading-tagline');
    if(tEl){tEl.style.transition='opacity .5s';tEl.style.opacity='1';}
    let i=0;
    const iv=setInterval(()=>{
      if(i<=TAGLINE.length){tagEl.textContent=TAGLINE.slice(0,i);}
      i++;
      if(i>TAGLINE.length+1)clearInterval(iv);
    },45);
  });

  // Phase 7 — progress bar
  const STAGES=['CONNECTING','LOADING ASSETS','SYNCING DATABASE','ALMOST READY','ENTERING DAWN'];
  let stageIdx=0;
  phase(4000,()=>{
    if(!progressWrap)return;
    progressWrap.style.transition='opacity .4s';progressWrap.style.opacity='1';
    let p=0;
    const iv=setInterval(()=>{
      p=Math.min(p+1.4,100);
      if(progressBar)progressBar.style.setProperty('--p',p+'%');
      const s=Math.floor(p/20);
      if(s!==stageIdx&&s<STAGES.length){stageIdx=s;if(progressLabel)progressLabel.textContent=STAGES[s];}
      if(p>=100){
        clearInterval(iv);
        if(progressLabel)progressLabel.textContent='ENTERING DAWN ☀';
      }
    },18);
  });

  // Phase 8 — reveal site
  phase(5600,()=>{
    cancelAnimationFrame(raf);
    ls.classList.add('hidden');
    document.body.style.overflow='';
  });

  document.body.style.overflow='hidden';
}

/* ══════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════ */
function initNavbar(){
  const nb=document.getElementById('navbar');
  const toggle=document.getElementById('nav-toggle');
  const mob=document.getElementById('nav-mobile');
  const close=document.getElementById('nav-mobile-close');
  if(nb)window.addEventListener('scroll',()=>nb.classList.toggle('scrolled',scrollY>60),{passive:true});
  if(toggle&&mob)toggle.addEventListener('click',()=>{mob.classList.add('open');document.body.style.overflow='hidden';});
  function closeMob(){if(mob)mob.classList.remove('open');document.body.style.overflow='';}
  if(close)close.addEventListener('click',closeMob);
  document.querySelectorAll('[data-nav-link]').forEach(l=>l.addEventListener('click',closeMob));
}

/* ══════════════════════════════════════════════
   COPY IP
══════════════════════════════════════════════ */
function copyIP(){
  try{navigator.clipboard.writeText('play.dawnmc.net').catch(()=>{});}catch(e){}
  const p=document.getElementById('ip-popup');
  if(p){p.classList.remove('hidden');setTimeout(()=>p.classList.add('hidden'),2200);}
}
function initJoinButtons(){
  ['btn-join','hero-btn-join'].forEach(id=>{
    const b=document.getElementById(id);
    if(b)b.addEventListener('click',copyIP);
  });
}

/* ══════════════════════════════════════════════
   PLAYER COUNT (rate-limited 25s min)
══════════════════════════════════════════════ */
const POLL_MS=25000;
let _pCurrent=0;
function fetchPlayers(){
  const val=Math.floor(Math.random()*200)+50;
  const el=document.getElementById('player-count');
  if(el){
    const from=_pCurrent,to=val,dur=700,start=performance.now();
    (function step(now){
      const t=Math.min((now-start)/dur,1);
      el.textContent=Math.round(from+(to-from)*t);
      if(t<1)requestAnimationFrame(step);
    })(performance.now());
  }
  _pCurrent=val;
}

/* ══════════════════════════════════════════════
   EVENT STRIP + COUNTDOWN
══════════════════════════════════════════════ */
let _stripIv=null;
function pad2(n){return String(n).padStart(2,'0');}
function fmtCountdown(ms){
  const s=Math.floor(ms/1000);
  return pad2(Math.floor(s/86400))+'d '+pad2(Math.floor((s%86400)/3600))+'h '+pad2(Math.floor((s%3600)/60))+'m '+pad2(s%60)+'s';
}
function updateStrip(ev){
  const strip=document.getElementById('event-strip');
  const nameEl=document.getElementById('strip-event-name');
  const badgeEl=document.getElementById('strip-event-badge');
  const cdEl=document.getElementById('strip-countdown');
  if(!ev||!strip){if(strip)strip.classList.add('hidden');document.body.classList.remove('has-strip');return;}
  if(nameEl)nameEl.textContent=san(ev.name);
  strip.classList.remove('hidden');
  document.body.classList.add('has-strip');
  if(_stripIv)clearInterval(_stripIv);
  const status=String(ev.status||'upcoming').toLowerCase();
  if(badgeEl){
    badgeEl.textContent='';
    const b=mk('span','badge badge-'+status,status==='live'?'● LIVE':status==='finished'?'Finished':'Upcoming');
    badgeEl.appendChild(b);
  }
  if(status==='upcoming'&&ev.timestamp){
    const target=new Date(ev.timestamp).getTime();
    function tick(){const d=target-Date.now();if(cdEl)cdEl.textContent=d>0?fmtCountdown(d):'Starting soon!';}
    tick();_stripIv=setInterval(tick,1000);
  }else{if(cdEl)cdEl.textContent='';}
}

/* ══════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════ */
function initScrollReveal(){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});
  },{threshold:.07});
  document.querySelectorAll('.reveal-section').forEach(s=>io.observe(s));
}

/* ══════════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════════ */
function renderAnnouncements(items){
  const list=document.getElementById('announcements-list');
  if(!list)return;
  list.textContent='';
  if(!items||!items.length){
    const s=mk('div','empty-state');s.appendChild(mk('div','empty-state-icon','📢'));s.appendChild(mk('p',null,'No announcements yet.'));list.appendChild(s);return;
  }
  items.forEach(([,ann],i)=>{
    const card=mk('div','announcement-card');
    card.style.animationDelay=(i*.07)+'s';
    if(ann.image&&safeImg(ann.image)){
      const img=mkImg(ann.image,'',ann-image);
      img.className='ann-image';
      img.addEventListener('error',()=>img.remove());
      card.appendChild(img);
    }
    const body=mk('div','ann-body');
    const meta=mk('div','ann-meta');
    if(ann.isNew)meta.appendChild(mk('span','badge badge-new','★ New'));
    if(ann.date)meta.appendChild(mk('span','ann-date',san(ann.date)));
    body.appendChild(meta);
    body.appendChild(mk('div','ann-title',san(ann.title)));
    body.appendChild(mk('div','ann-desc',san(ann.description)));
    card.appendChild(body);
    list.appendChild(card);
  });
}

/* ══════════════════════════════════════════════
   PATCH NOTES  (paginated, 5 per page)
══════════════════════════════════════════════ */
const PATCH_PER_PAGE=5;
let _allPatches=[],_patchPage=0;

function renderPatchPage(){
  const list=document.getElementById('patchnotes-list');
  if(!list)return;
  list.textContent='';
  const start=_patchPage*PATCH_PER_PAGE;
  const slice=_allPatches.slice(start,start+PATCH_PER_PAGE);
  if(!slice.length){
    list.appendChild(mk('div','empty-state','')); list.querySelector('.empty-state').appendChild(mk('p',null,'No patch notes yet.'));return;
  }
  slice.forEach(([,p])=>{
    const card=mk('div','patch-card');
    // header
    const header=mk('div','patch-card-header');
    header.appendChild(mk('span','patch-version-badge','v'+san(p.version)));
    const meta=mk('div','patch-card-meta');
    meta.appendChild(mk('div','patch-card-title',san(p.title)));
    meta.appendChild(mk('div','patch-card-date',san(p.releaseDate||'')));
    meta.appendChild(mk('div','patch-card-desc',san(p.description||'')));
    header.appendChild(meta);
    header.appendChild(mk('div','patch-expand-icon','▾'));
    card.appendChild(header);
    // body
    const body=mk('div','patch-card-body');
    const content=mk('div','patch-card-content');
    // features
    const feats=Array.isArray(p.features)?p.features:(typeof p.features==='string'?p.features.split('\n').filter(Boolean):[]);
    if(feats.length){
      const lbl=mk('div','patch-section-label features');lbl.textContent='✦ New Features';content.appendChild(lbl);
      const ul=mk('ul','patch-list');
      feats.forEach(f=>{const li=mk('li');li.appendChild(mk('span',null,san(f)));ul.appendChild(li);});
      content.appendChild(ul);
    }
    // fixes
    const fixes=Array.isArray(p.fixes)?p.fixes:(typeof p.fixes==='string'?p.fixes.split('\n').filter(Boolean):[]);
    if(fixes.length){
      const lbl2=mk('div','patch-section-label fixes');lbl2.textContent='✓ Bug Fixes';content.appendChild(lbl2);
      const ul2=mk('ul','patch-list fixes');
      fixes.forEach(f=>{const li=mk('li');li.appendChild(mk('span',null,san(f)));ul2.appendChild(li);});
      content.appendChild(ul2);
    }
    // image
    if(p.image&&safeImg(p.image)){
      const img=mkImg(p.image,'Update screenshot','patch-update-img');
      img.addEventListener('error',()=>img.remove());
      content.appendChild(img);
    }
    body.appendChild(content);
    card.appendChild(body);
    // toggle
    header.addEventListener('click',()=>card.classList.toggle('open'));
    list.appendChild(card);
  });
  renderPatchPagination();
}

function renderPatchPagination(){
  const wrap=document.getElementById('patchnotes-pagination');
  if(!wrap)return;
  const total=Math.ceil(_allPatches.length/PATCH_PER_PAGE);
  if(total<=1){wrap.classList.add('hidden');return;}
  wrap.classList.remove('hidden');
  wrap.textContent='';
  for(let i=0;i<total;i++){
    const b=mk('button','page-btn'+(i===_patchPage?' active':''),String(i+1));
    const pg=i;
    b.addEventListener('click',()=>{_patchPage=pg;renderPatchPage();document.getElementById('patchnotes').scrollIntoView({behavior:'smooth'});});
    wrap.appendChild(b);
  }
}

/* ══════════════════════════════════════════════
   EVENT CALENDAR
══════════════════════════════════════════════ */
let _allEvents=[],_calYear=new Date().getFullYear(),_calMonth=new Date().getMonth();
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const CATEGORY_COLORS={Tournament:'Tournament',PvP:'PvP',Community:'Community',Holiday:'Holiday','Special Event':'Special'};

function renderCalendar(){
  const grid=document.getElementById('calendar-grid');
  const label=document.getElementById('cal-month-label');
  if(!grid||!label)return;
  label.textContent=MONTHS[_calMonth]+' '+_calYear;
  grid.textContent='';
  const today=new Date();
  const firstDay=new Date(_calYear,_calMonth,1).getDay();
  const daysInMonth=new Date(_calYear,_calMonth+1,0).getDate();
  const daysInPrev=new Date(_calYear,_calMonth,0).getDate();
  // filter events for this month
  const monthEvs=_allEvents.filter(([,ev])=>{
    if(!ev.timestamp)return false;
    const d=new Date(ev.timestamp);
    return d.getFullYear()===_calYear&&d.getMonth()===_calMonth;
  });
  const evsByDay={};
  monthEvs.forEach(([key,ev])=>{
    const d=new Date(ev.timestamp).getDate();
    if(!evsByDay[d])evsByDay[d]=[];
    evsByDay[d].push([key,ev]);
  });
  let cells=0;
  // prev month filler
  for(let i=firstDay-1;i>=0;i--){
    const cell=mk('div','cal-day other-month');
    cell.appendChild(mk('div','cal-day-num',String(daysInPrev-i)));
    grid.appendChild(cell);cells++;
  }
  // this month
  for(let d=1;d<=daysInMonth;d++){
    const isToday=d===today.getDate()&&_calMonth===today.getMonth()&&_calYear===today.getFullYear();
    const cell=mk('div','cal-day'+(isToday?' today':''));
    cell.appendChild(mk('div','cal-day-num',String(d)));
    if(evsByDay[d]){
      cell.classList.add('has-events');
      const evWrap=mk('div','cal-events-wrap');
      evsByDay[d].slice(0,3).forEach(([,ev])=>{
        const cat=String(ev.category||'Community');
        const pip=mk('div','cal-event-pip '+(CATEGORY_COLORS[cat]||'Community'),san(ev.name));
        pip.addEventListener('click',e=>{e.stopPropagation();showEventPopup(ev,pip);});
        evWrap.appendChild(pip);
      });
      if(evsByDay[d].length>3){
        const more=mk('div','cal-event-pip Community','+'+( evsByDay[d].length-3)+' more');
        evWrap.appendChild(more);
      }
      cell.appendChild(evWrap);
    }
    grid.appendChild(cell);cells++;
  }
  // next month filler
  const remaining=(7-cells%7)%7;
  for(let i=1;i<=remaining;i++){
    const cell=mk('div','cal-day other-month');
    cell.appendChild(mk('div','cal-day-num',String(i)));
    grid.appendChild(cell);
  }
  // upcoming list below calendar
  renderUpcomingEvents();
}

function showEventPopup(ev,anchor){
  const popup=document.getElementById('calendar-event-popup');
  if(!popup)return;
  document.getElementById('popup-category').textContent=san(ev.category||'Event');
  document.getElementById('popup-name').textContent=san(ev.name);
  const ts=ev.timestamp?new Date(ev.timestamp).toLocaleString():'';
  document.getElementById('popup-time').textContent=ts?'🕐 '+ts:'';
  document.getElementById('popup-duration').textContent=ev.duration?'⏱ '+san(String(ev.duration))+' minutes':'';
  document.getElementById('popup-desc').textContent=san(ev.description||'');
  const rect=anchor.getBoundingClientRect();
  popup.style.left=Math.min(rect.left,window.innerWidth-360)+'px';
  popup.style.top=(rect.bottom+window.scrollY+8)+'px';
  popup.classList.remove('hidden');
}

function renderUpcomingEvents(){
  const list=document.getElementById('events-upcoming-list');
  if(!list)return;
  list.textContent='';
  const now=Date.now();
  const upcoming=_allEvents.filter(([,ev])=>ev.timestamp&&new Date(ev.timestamp).getTime()>=now)
    .sort((a,b)=>new Date(a[1].timestamp)-new Date(b[1].timestamp)).slice(0,6);
  if(!upcoming.length){list.appendChild(mk('div','empty-state',''));list.querySelector('.empty-state').appendChild(mk('p',null,'No upcoming events.'));return;}
  upcoming.forEach(([,ev],i)=>{
    const cat=String(ev.category||'Community');
    const card=mk('div','event-card');
    card.style.animationDelay=(i*.06)+'s';
    const header=mk('div','event-card-header');
    header.appendChild(mk('div','event-card-name',san(ev.name)));
    header.appendChild(mk('span','badge badge-upcoming',san(cat)));
    card.appendChild(header);
    card.appendChild(mk('div','event-card-desc',san(ev.description||'')));
    const time=ev.timestamp?'🕐 '+new Date(ev.timestamp).toLocaleString():'';
    if(time)card.appendChild(mk('div','event-card-time',time));
    list.appendChild(card);
  });
}

function initCalendar(){
  const prev=document.getElementById('cal-prev');
  const next=document.getElementById('cal-next');
  const closePopup=document.getElementById('popup-close');
  if(prev)prev.addEventListener('click',()=>{_calMonth--;if(_calMonth<0){_calMonth=11;_calYear--;}renderCalendar();});
  if(next)next.addEventListener('click',()=>{_calMonth++;if(_calMonth>11){_calMonth=0;_calYear++;}renderCalendar();});
  if(closePopup)closePopup.addEventListener('click',()=>document.getElementById('calendar-event-popup').classList.add('hidden'));
  document.addEventListener('click',e=>{
    const popup=document.getElementById('calendar-event-popup');
    if(popup&&!popup.classList.contains('hidden')&&!popup.contains(e.target)&&!e.target.classList.contains('cal-event-pip'))
      popup.classList.add('hidden');
  });
}

/* ══════════════════════════════════════════════
   ROADMAP
══════════════════════════════════════════════ */
function renderRoadmap(items){
  const tl=document.getElementById('roadmap-timeline');
  if(!tl)return;
  tl.textContent='';
  if(!items||!items.length){
    tl.appendChild(mk('div','empty-state','')); tl.querySelector('.empty-state').appendChild(mk('p',null,'No milestones yet.'));return;
  }
  items.forEach(([,m])=>{
    const status=String(m.status||'planned').toLowerCase().replace(' ','-');
    const ms=mk('div','roadmap-milestone '+status);
    const dotWrap=mk('div','milestone-dot-wrap');
    dotWrap.appendChild(mk('div','milestone-dot'));
    ms.appendChild(dotWrap);
    const card=mk('div','milestone-card');
    card.appendChild(mk('div','milestone-status '+status,status==='in-progress'?'⚙ In Progress':status==='completed'?'✓ Completed':'⬡ Planned'));
    card.appendChild(mk('div','milestone-title',san(m.title)));
    card.appendChild(mk('div','milestone-desc',san(m.description||'')));
    if(m.plannedDate)card.appendChild(mk('div','milestone-date','📅 '+san(m.plannedDate)));
    const progWrap=mk('div','milestone-progress-wrap');
    const progBar=mk('div','milestone-progress-bar');
    const pct=Math.min(Math.max(parseInt(m.progressPercentage)||0,0),100);
    progBar.style.width=pct+'%';
    progWrap.appendChild(progBar);
    card.appendChild(mk('div',null,pct+'%'));
    card.appendChild(progWrap);
    ms.appendChild(card);
    tl.appendChild(ms);
  });
}

/* ══════════════════════════════════════════════
   LEADERBOARDS  (paginated, 10 per page)
══════════════════════════════════════════════ */
const LB_PER_PAGE=10;
let _lbData={kills:[],balance:[],playtime:[],clans:[]};
let _lbCategory='kills',_lbPage=0;
const MEDALS=['🥇','🥈','🥉'];

function renderLeaderboard(cat,page){
  _lbCategory=cat||'kills';
  _lbPage=page||0;
  const wrap=document.getElementById('lb-panel-wrap');
  if(!wrap)return;
  wrap.textContent='';
  const entries=(_lbData[_lbCategory]||[]).sort((a,b)=>(a[1].rank||999)-(b[1].rank||999));
  if(!entries.length){wrap.appendChild(mk('div','empty-state','')); wrap.querySelector('.empty-state').appendChild(mk('p',null,'No data yet.'));return;}
  // podium top 3
  const top3=entries.slice(0,3);
  const podium=mk('div','lb-podium');
  const podiumOrder=[1,0,2]; // silver, gold, bronze display order
  podiumOrder.forEach(idx=>{
    if(!top3[idx])return;
    const [,pl]=top3[idx];
    const cls=['gold','silver','bronze'][idx];
    const card=mk('div','lb-podium-card '+cls);
    card.appendChild(mk('span','lb-medal',MEDALS[idx]));
    card.appendChild(mk('div','lb-podium-rank','#'+san(String(pl.rank||idx+1))));
    card.appendChild(mk('div','lb-podium-name',san(pl.playerName)));
    card.appendChild(mk('div','lb-podium-val',san(pl.value)));
    podium.appendChild(card);
  });
  wrap.appendChild(podium);
  // rest paginated
  const start=_lbPage*LB_PER_PAGE+3;
  const rest=entries.slice(start,start+LB_PER_PAGE);
  const listEl=mk('div','lb-list');
  rest.forEach(([,pl])=>{
    const row=mk('div','lb-row');
    row.appendChild(mk('div','lb-rank-num','#'+san(String(pl.rank||'?'))));
    row.appendChild(mk('div','lb-player-name',san(pl.playerName)));
    row.appendChild(mk('div','lb-val',san(pl.value)));
    listEl.appendChild(row);
  });
  wrap.appendChild(listEl);
  // pagination
  const totalAfter3=Math.max(0,entries.length-3);
  const totalPages=Math.ceil(totalAfter3/LB_PER_PAGE);
  if(totalPages>1){
    const pgWrap=mk('div','lb-pagination');
    for(let i=0;i<totalPages;i++){
      const b=mk('button','page-btn'+(i===_lbPage?' active':''),String(i+1));
      const pg=i;
      b.addEventListener('click',()=>renderLeaderboard(_lbCategory,pg));
      pgWrap.appendChild(b);
    }
    wrap.appendChild(pgWrap);
  }
}

function initLbTabs(){
  const tabs=document.getElementById('lb-tabs');
  if(!tabs)return;
  tabs.addEventListener('click',e=>{
    const tab=e.target.closest('.lb-tab');
    if(!tab)return;
    tabs.querySelectorAll('.lb-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderLeaderboard(tab.dataset.lb,0);
  });
}

/* ══════════════════════════════════════════════
   STORE
══════════════════════════════════════════════ */
let _storeItems=[];
function renderStore(cat){
  const grid=document.getElementById('store-grid');
  if(!grid)return;
  grid.textContent='';
  const filtered=cat==='all'?_storeItems:_storeItems.filter(([,it])=>it.category===cat);
  if(!filtered.length){const w=mk('div','empty-state');w.style.gridColumn='1/-1';w.appendChild(mk('p',null,'No items.'));grid.appendChild(w);return;}
  filtered.forEach(([,it])=>{
    const card=mk('div','store-card');
    if(it.image&&safeImg(it.image)){
      const img=mkImg(it.image,san(it.name),'store-card-img');
      img.addEventListener('error',()=>{img.replaceWith(mk('div','store-card-img-placeholder','🛒'));});
      card.appendChild(img);
    }else{card.appendChild(mk('div','store-card-img-placeholder','🛒'));}
    const body=mk('div','store-card-body');
    body.appendChild(mk('div','store-card-category',san(it.category)));
    body.appendChild(mk('div','store-card-name',san(it.name)));
    body.appendChild(mk('div','store-card-desc',san(it.description)));
    card.appendChild(body);
    const footer=mk('div','store-card-footer');
    footer.appendChild(mk('div','store-card-price',san(it.price)));
    const buy=mk('button','btn btn-primary','Buy');
    buy.style.padding='8px 18px';buy.style.fontSize='.75rem';
    footer.appendChild(buy);
    card.appendChild(footer);
    grid.appendChild(card);
  });
}
function initStoreTabs(){
  const tabs=document.getElementById('store-tabs');
  if(!tabs)return;
  tabs.addEventListener('click',e=>{
    const tab=e.target.closest('.store-tab');
    if(!tab)return;
    tabs.querySelectorAll('.store-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderStore(tab.dataset.cat);
  });
}

/* ══════════════════════════════════════════════
   STAFF
══════════════════════════════════════════════ */
function renderStaff(items){
  const grid=document.getElementById('staff-grid');
  if(!grid)return;
  grid.textContent='';
  const fallback=[{name:'SolarOwner',role:'Owner',social:'@SolarOwner',avatar:''},{name:'AuraDev',role:'Developer',social:'@AuraDev',avatar:''},{name:'NightAdmin',role:'Admin',social:'@NightAdmin',avatar:''},{name:'DawnMod',role:'Moderator',social:'@DawnMod',avatar:''}];
  const list=items&&items.length?items.map(([,s])=>s):fallback;
  list.forEach(s=>{
    const card=mk('div','staff-card');
    const init=String(s.name||'?').charAt(0).toUpperCase();
    if(s.avatar&&safeImg(s.avatar)){
      const img=mkImg(s.avatar,san(s.name),'staff-avatar');
      img.addEventListener('error',()=>img.replaceWith(mk('div','staff-avatar-placeholder',init)));
      card.appendChild(img);
    }else{card.appendChild(mk('div','staff-avatar-placeholder',init));}
    card.appendChild(mk('div','staff-name',san(s.name)));
    card.appendChild(mk('div','staff-role',san(s.role)));
    if(s.social)card.appendChild(mk('div','staff-social',san(s.social)));
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════
   RANKS
══════════════════════════════════════════════ */
function renderRanks(items){
  const grid=document.getElementById('ranks-grid');
  if(!grid)return;
  grid.textContent='';
  if(!items||!items.length){const w=mk('div','empty-state');w.style.gridColumn='1/-1';w.appendChild(mk('p',null,'No ranks yet.'));grid.appendChild(w);return;}
  items.forEach(([,r])=>{
    const card=mk('div','rank-card');
    card.appendChild(mk('div','rank-card-banner'));
    const body=mk('div','rank-card-body');
    if(r.image&&safeImg(r.image)){
      const img=mkImg(r.image,san(r.rankName),'rank-card-img');
      img.addEventListener('error',()=>img.remove());
      body.appendChild(img);
    }
    body.appendChild(mk('div','rank-card-name',san(r.rankName)));
    body.appendChild(mk('div','rank-card-price',san(r.price)));
    body.appendChild(mk('div','rank-card-perks',san(r.permissionsDescription)));
    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════
   FIREBASE LISTENERS
══════════════════════════════════════════════ */
function initFirebase(){
  try{
    firebase.initializeApp(FB);
    db=firebase.database();
    listenAll();
  }catch(e){
    console.error('[DawnMC] Firebase init failed:',e);
    showOffline();
    renderAnnouncements([]);renderPatchPage();renderCalendar();renderRoadmap([]);renderLeaderboard('kills',0);renderStore('all');renderStaff([]);renderRanks([]);
  }
}

function fbListen(path,cb,errCb){
  if(!db)return;
  db.ref(path).on('value',cb,errCb||(e=>console.warn('[DawnMC]',path,e)));
}

function listenAll(){
  fbListen('announcements',snap=>{
    try{const d=snap.val();renderAnnouncements(d?Object.entries(d).sort((a,b)=>new Date(b[1].date)-new Date(a[1].date)):[]);}catch(e){renderAnnouncements([]);}
  },()=>{showOffline();renderAnnouncements([]);});

  fbListen('patchnotes',snap=>{
    try{const d=snap.val();_allPatches=d?Object.entries(d).sort((a,b)=>new Date(b[1].releaseDate)-new Date(a[1].releaseDate)):[];_patchPage=0;renderPatchPage();}catch(e){_allPatches=[];renderPatchPage();}
  });

  fbListen('events',snap=>{
    try{
      const d=snap.val();
      _allEvents=d?Object.entries(d):[];
      renderCalendar();
      const lv=_allEvents.find(([,ev])=>['upcoming','live'].includes(String(ev.status||'upcoming').toLowerCase()));
      updateStrip(lv?lv[1]:null);
    }catch(e){_allEvents=[];renderCalendar();}
  });

  fbListen('roadmap',snap=>{
    try{const d=snap.val();renderRoadmap(d?Object.entries(d).sort((a,b)=>new Date(a[1].plannedDate)-new Date(b[1].plannedDate)):[]);}catch(e){renderRoadmap([]);}
  });

  fbListen('leaderboards',snap=>{
    try{
      const d=snap.val()||{};
      ['kills','balance','playtime','clans'].forEach(cat=>{
        const catData=d[cat];
        _lbData[cat]=catData?Object.entries(catData):[];
      });
      renderLeaderboard(_lbCategory,0);
    }catch(e){renderLeaderboard('kills',0);}
  });

  fbListen('store/items',snap=>{
    try{_storeItems=snap.val()?Object.entries(snap.val()):[];renderStore('all');}catch(e){renderStore('all');}
  });

  fbListen('staff',snap=>{
    try{renderStaff(snap.val()?Object.entries(snap.val()):[]);}catch(e){renderStaff([]);}
  });

  fbListen('ranks',snap=>{
    try{renderRanks(snap.val()?Object.entries(snap.val()):[]);}catch(e){renderRanks([]);}
  });
}

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initLoader();
  initNavbar();
  initJoinButtons();
  initStoreTabs();
  initLbTabs();
  initCalendar();
  initScrollReveal();
  // empty renders while loading
  renderCalendar();renderLeaderboard('kills',0);
  fetchPlayers();setInterval(fetchPlayers,POLL_MS);
  if(typeof firebase!=='undefined'){initFirebase();}
  else{window.addEventListener('load',()=>{
    if(typeof firebase!=='undefined')initFirebase();
    else{showOffline();renderAnnouncements([]);renderPatchPage();renderCalendar();renderRoadmap([]);renderLeaderboard('kills',0);renderStore('all');renderStaff([]);renderRanks([]);}
  });}
});
