/* BSS Hub 1.0 - one menu for the Bee Swarm remake: multiplayer, mods, admin code. */
(function(){
if(window.BSSMod)return
var CFG=window.BSSMOD_CONFIG||{}
var CODE=CFG.code||'armadillo'
var MP_URL=CFG.mp||'https://cdn.jsdelivr.net/gh/TheArmadilloKing/BSS-Multiplayer-Servers@main/bssmp5.js'
var Z=99997
var mods={},order=[],act={},bus={},keys={},adminOn=false,booted=false,pending=[]
var S={off:{},urls:[],pasted:[],mp:0,inst:{},pos:{}}
try{var sv=JSON.parse(localStorage.getItem('bssmod')||'{}');if(sv.off)S.off=sv.off;if(sv.urls)S.urls=sv.urls;if(sv.pasted)S.pasted=sv.pasted;if(sv.mp)S.mp=1;if(sv.inst)S.inst=sv.inst;if(sv.pos)S.pos=sv.pos}catch(e){}
function save(){try{localStorage.setItem('bssmod',JSON.stringify(S))}catch(e){}}

/* ---------- small helpers ---------- */
function mk(tag,css,txt){var e=document.createElement(tag);if(css)e.style.cssText=css;if(txt!=null)e.textContent=txt;return e}
function stopKeys(e){['keydown','keyup','keypress'].forEach(function(k){e.addEventListener(k,function(x){x.stopPropagation()})})}
function btn(t,fn){var b=mk('button','font:12px sans-serif;padding:2px 8px;border-radius:4px;border:none;cursor:pointer;width:auto;height:22px',t);b.onclick=fn;return b}
function inp(ph,w){var i=mk('input','font:12px sans-serif;padding:2px 4px;border-radius:4px;border:none;height:20px;width:'+w+'px');i.placeholder=ph;stopKeys(i);return i}
function pl(){
  try{if(!window.player&&typeof window.exposeCheats==='function')window.exposeCheats()}catch(e){}
  var q=window.player
  return q&&q.body?q:null
}
function toast(t){
  var d=mk('div','position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:'+Z+';background:rgba(0,0,0,.82);color:#fff;font:13px sans-serif;padding:6px 12px;border-radius:8px;pointer-events:none;transition:opacity .5s',String(t).slice(0,140))
  document.documentElement.appendChild(d)
  setTimeout(function(){d.style.opacity=0},2400)
  setTimeout(function(){d.remove()},3000)
}

/* ---------- events ---------- */
function emit(ev,d){
  var a=bus[ev],i
  if(!a)return
  a=a.slice()
  for(i=0;i<a.length;i++){try{a[i].fn(d)}catch(e){toast('Mod "'+a[i].id+'" error: '+e.message)}}
}
function offAll(id){for(var k in bus)bus[k]=bus[k].filter(function(x){return x.id!==id})}

/* ---------- multiplayer bridge (works with bssmp.js) ---------- */
function mpState(){try{return JSON.parse(window.__bssmp())}catch(e){return null}}
var mpIds={}
function mpPoll(){
  var s=mpState(),g,k,now={}
  if(!s)return
  g=s.ghosts||{}
  for(k in g){now[k]=1;if(!mpIds[k])emit('join',{id:k,name:g[k].n})}
  for(k in mpIds){if(!now[k])emit('leave',{id:k,name:mpIds[k]})}
  mpIds={}
  for(k in g)mpIds[k]=g[k].n
}
var mpApi={
  inRoom:function(){var s=mpState();return !!(s&&(s.role||s.id))},
  players:function(){
    var s=mpState(),o=[],g,k
    if(!s)return o
    g=s.ghosts||{}
    for(k in g)o.push({id:k,name:g[k].n,x:g[k].tx,y:g[k].ty,z:g[k].tz,hidden:!!g[k].h,color:g[k].col})
    return o
  },
  chat:function(t){
    var c=document.querySelector('input[placeholder="chat..."]')
    if(!c||!t)return false
    c.value=String(t).slice(0,100)
    c.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))
    return true
  }
}

/* ---------- mod instances ---------- */
function makeApi(inst){
  var id=inst.mod.id,api={}
  api.id=id
  api.version='1.0'
  api.game=window
  api.player=function(){
    var q=pl()
    if(!q)return null
    var b=q.body,p=b.position,v=b.velocity||{x:0,y:0,z:0}
    return {x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,yaw:q.yaw,raw:q}
  }
  api.teleport=function(x,y,z){
    var q=pl()
    if(!q)return false
    var b=q.body,p=b.position
    if(p.set)p.set(x,y,z);else{p.x=x;p.y=y;p.z=z}
    if(b.velocity&&b.velocity.set)b.velocity.set(0,0,0)
    return true
  }
  api.velocity=function(x,y,z){
    var q=pl()
    if(!q||!q.body.velocity)return false
    var v=q.body.velocity
    if(x!=null)v.x=x
    if(y!=null)v.y=y
    if(z!=null)v.z=z
    return true
  }
  api.on=function(ev,fn){(bus[ev]=bus[ev]||[]).push({id:id,fn:fn})}
  api.emit=function(ev,d){emit(ev,d)}
  api.every=function(ms,fn){inst.timers.push(setInterval(function(){try{fn()}catch(e){toast('Mod "'+id+'" error: '+e.message)}},ms))}
  api.key=function(k){return !!keys[k===' '||k==='space'?' ':String(k).toLowerCase()]}
  api.keybind=function(k,fn){
    k=k==='space'?' ':String(k).toLowerCase()
    api.on('key',function(e){if(e.down&&e.key===k)fn(e)})
  }
  api.toast=toast
  api.hideUI=function(h){
    var q=document.querySelectorAll('[data-bssui]'),i
    ui.launch.style.display=h?'none':''
    if(h)ui.win.style.display='none'
    for(i=0;i<q.length;i++)q[i].style.visibility=h?'hidden':''
  }
  api.store={
    get:function(k,d){try{var v=localStorage.getItem('bssmod:'+id+':'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
    set:function(k,v){try{localStorage.setItem('bssmod:'+id+':'+k,JSON.stringify(v))}catch(e){}}
  }
  api.mp=mpApi
  api.ui={
    button:function(label,fn){var b=btn(label,function(){try{fn()}catch(e){toast(e.message)}});body().appendChild(row(b));return b},
    toggle:function(label,init,fn){
      var l=mk('label','display:flex;align-items:center;gap:5px;cursor:pointer'),c=document.createElement('input')
      c.type='checkbox';c.checked=!!init
      c.onchange=function(){try{fn(c.checked)}catch(e){toast(e.message)}}
      l.appendChild(c);l.appendChild(document.createTextNode(label))
      body().appendChild(l)
      return {get:function(){return c.checked},set:function(v){c.checked=!!v;c.onchange()}}
    },
    slider:function(label,min,max,val,fn){
      var r=mk('div','display:flex;align-items:center;gap:6px'),s=document.createElement('input'),o=mk('span','min-width:30px',String(val))
      s.type='range';s.min=min;s.max=max;s.step=(max-min)>20?1:0.1;s.value=val;s.style.cssText='flex:1;min-width:0'
      s.oninput=function(){o.textContent=s.value;try{fn(parseFloat(s.value))}catch(e){toast(e.message)}}
      r.appendChild(mk('span',null,label));r.appendChild(s);r.appendChild(o)
      body().appendChild(r)
      return {get:function(){return parseFloat(s.value)},set:function(v){s.value=v;s.oninput()}}
    },
    input:function(label,ph,fn){
      var i=inp(ph||'',90)
      body().appendChild(row(mk('span',null,label),i,btn('Go',function(){try{fn(i.value)}catch(e){toast(e.message)}})))
      return i
    },
    select:function(label,getOpts,fn){
      var s=mk('select','flex:1;min-width:0;font:12px sans-serif')
      function fill(){
        var o=getOpts(),i,e
        s.textContent=''
        if(!o.length)o=[{label:'(none)',value:''}]
        for(i=0;i<o.length;i++){e=mk('option',null,o[i].label);e.value=o[i].value;s.appendChild(e)}
      }
      s.onfocus=fill;fill()
      body().appendChild(row(mk('span',null,label),s,btn('Go',function(){try{fn(s.value)}catch(e){toast(e.message)}})))
      return s
    },
    text:function(t){
      var d=mk('div','font:11px monospace;opacity:.9',t||'')
      body().appendChild(d)
      return function(v){d.textContent=v}
    }
  }
  function row(){
    var d=mk('div','display:flex;gap:6px;flex-wrap:wrap;align-items:center'),i
    for(i=0;i<arguments.length;i++)d.appendChild(arguments[i])
    return d
  }
  function body(){
    if(!inst.body){inst.body=mk('div','display:none;flex-direction:column;gap:6px');ui.content.appendChild(inst.body);addTab(inst)}
    return inst.body
  }
  return api
}
function start(id){
  var mod=mods[id],inst
  if(!mod||act[id])return
  inst={mod:mod,timers:[],body:null,tab:null}
  act[id]=inst
  try{mod.init(makeApi(inst))}
  catch(e){toast('Mod "'+id+'" failed: '+e.message);stop(id,true)}
  renderMods()
}
function stop(id,quiet){
  var inst=act[id]
  if(!inst)return
  try{if(inst.mod.stop)inst.mod.stop()}catch(e){}
  inst.timers.forEach(clearInterval)
  offAll(id)
  if(inst.body)inst.body.remove()
  if(inst.tab)inst.tab.remove()
  delete act[id]
  if(ui.cur===id)showTab('mods')
  if(!quiet)renderMods()
}
function register(mod){
  if(!mod||!/^[\w-]{1,32}$/.test(mod.id||'')||typeof mod.init!=='function'){toast('Bad mod (needs id and init)');return false}
  if(act[mod.id])stop(mod.id,true)
  if(!mods[mod.id])order.push(mod.id)
  mods[mod.id]=mod
  if(!booted){pending.push(mod.id);return true}
  if(!S.off[mod.id])start(mod.id)
  renderMods()
  return true
}

/* ---------- menu ---------- */
var ui={win:null,launch:null,tabs:null,content:null,play:null,mods:null,list:null,cur:'play',mpHold:null,mpNote:null,mpInstall:null,mpRemove:null,urlList:null,store:null}
function addTab(inst){
  var id=inst.mod.id
  inst.tab=btn(inst.mod.name||id,function(){showTab(id)})
  inst.tab.dataset.tab=id
  ui.tabs.appendChild(inst.tab)
}
function showTab(id){
  var k,t=ui.tabs.children,i
  ui.cur=id
  ui.play.style.display=id==='play'?'flex':'none'
  ui.mods.style.display=id==='mods'?'flex':'none'
  for(k in act){if(act[k].body)act[k].body.style.display=k===id?'flex':'none'}
  for(i=0;i<t.length;i++)t[i].style.background=(t[i].dataset.tab===id)?'#ffd54f':''
}
function renderMods(){
  if(!ui.mods||!ui.list)return
  ui.list.textContent=''
  order.forEach(function(id){
    var m=mods[id],l=mk('label','display:flex;align-items:center;gap:5px;cursor:pointer'),c=document.createElement('input')
    c.type='checkbox';c.checked=!!act[id]
    c.onchange=function(){if(c.checked){delete S.off[id];start(id)}else{S.off[id]=1;stop(id)};save()}
    l.appendChild(c)
    l.appendChild(document.createTextNode((m.name||id)+(m.version?' v'+m.version:'')+(m.author?' by '+m.author:'')))
    ui.list.appendChild(l)
  })
  if(!order.length)ui.list.appendChild(mk('div','opacity:.7','No mods yet.'))
  renderUrls()
}
function renderUrls(){
  if(!ui.urlList)return
  ui.urlList.textContent=''
  S.urls.forEach(function(u){
    var r=mk('div','display:flex;gap:4px;align-items:center')
    r.appendChild(mk('span','flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;opacity:.85',u))
    r.appendChild(btn('Remove',function(){S.urls=S.urls.filter(function(x){return x!==u});save();renderUrls();toast('Removed. Reload the page to finish.')}))
    ui.urlList.appendChild(r)
  })
}
function loadScript(url,done){
  if(!/^https:\/\//.test(url)){toast('Mod links must start with https://');return}
  var s=document.createElement('script')
  s.src=url
  s.onload=function(){if(done)done()}
  s.onerror=function(){toast('Could not load '+url.slice(0,60))}
  document.head.appendChild(s)
}
function runCode(code){
  var s=document.createElement('script')
  s.text=code
  document.head.appendChild(s)
}

/* ---------- multiplayer mod: loads bssmp.js, then moves its bar into the menu ---------- */
var embT=0,embBusy=false
function findBar(){
  var q=document.querySelectorAll('input'),i,p
  for(i=0;i<q.length;i++){
    p=q[i].parentNode
    if((q[i].placeholder||'').toLowerCase()==='code'&&p&&/Host/.test(p.textContent))return p
  }
  return null
}
function embedBar(){
  var n=0
  clearInterval(embT)
  embBusy=true
  embT=setInterval(function(){
    var b=findBar(),s,c,i
    if(b){
      clearInterval(embT);embBusy=false
      if(b.parentNode!==ui.mpHold){
        s=b.style
        s.position='static';s.maxWidth='none';s.background='none';s.padding='0';s.cursor='auto';s.left='';s.top='';s.bottom=''
        b.onmousedown=null
        window.__bssEmbed=1
        ui.mpHold.appendChild(b)
        c=b.children
        for(i=0;i<c.length;i++){if(c[i].tagName==='BUTTON'&&(c[i].textContent==='-'||c[i].textContent==='MP'))c[i].style.display='none'}
      }
    }else if(++n>40){clearInterval(embT);embBusy=false}
  },250)
}
function renderPlay(){
  if(!ui.play)return
  var on=!!window.__bssmpOwner
  ui.mpNote.textContent=on?'Multiplayer is installed. Type a room code and press Join, or press Lobby to find public games. Press T in the game to chat.':'Multiplayer is a mod. Install it to play with friends.'
  ui.mpInstall.style.display=on?'none':''
  ui.mpRemove.style.display=(on&&S.mp)?'':'none'
}
function installMp(){
  ui.mpNote.textContent='Installing multiplayer...'
  loadScript(MP_URL,function(){S.mp=1;save();renderPlay();embedBar()})
}

/* ---------- admin code ---------- */
function unlockAdmin(v){
  if(v!==CODE){toast('Wrong code');return false}
  if(adminOn){toast('Admin is already on');showTab('admin');return true}
  adminOn=true
  delete S.off.admin
  register(ADMIN)
  toast('Admin unlocked')
  if(act.admin)showTab('admin')
  emit('unlock')
  return true
}

function drag(h,t,key){
  var sx=0,sy=0,ox=0,oy=0,px=0,py=0,on=0,moved=0,raf=0
  function clamp(l,tp){return [Math.max(0,Math.min(window.innerWidth-60,l)),Math.max(0,Math.min(window.innerHeight-30,tp))]}
  function put(l,tp){
    var c=clamp(l,tp)
    t.style.left=c[0]+'px';t.style.top=c[1]+'px';t.style.bottom='auto';t.style.transform=''
  }
  function frame(){
    raf=0
    if(!on||!moved)return
    var c=clamp(ox+px-sx,oy+py-sy)
    t.style.transform='translate3d('+(c[0]-ox)+'px,'+(c[1]-oy)+'px,0)'
  }
  function end(){
    if(!on)return
    on=0
    if(raf){cancelAnimationFrame(raf);raf=0}
    t.style.willChange=''
    if(moved){
      put(ox+px-sx,oy+py-sy)
      S.pos[key]=[parseInt(t.style.left,10),parseInt(t.style.top,10)];save();h._drag=Date.now()
    }
  }
  h.style.touchAction='none'
  h.addEventListener('pointerdown',function(e){
    if(e.target!==h&&e.target.tagName==='BUTTON')return
    var r=t.getBoundingClientRect()
    sx=px=e.clientX;sy=py=e.clientY;ox=r.left;oy=r.top;on=1;moved=0
    try{h.setPointerCapture(e.pointerId)}catch(x){}
  })
  h.addEventListener('pointermove',function(e){
    if(!on)return
    px=e.clientX;py=e.clientY
    if(!moved){
      if(Math.abs(px-sx)+Math.abs(py-sy)<5)return
      moved=1;t.style.willChange='transform'
    }
    if(!raf)raf=requestAnimationFrame(frame)
  })
  h.addEventListener('pointerup',end)
  h.addEventListener('pointercancel',end)
  if(S.pos[key])put(S.pos[key][0],S.pos[key][1])
}
function buildHub(){
  var css=document.createElement('style')
  css.textContent='.bsshub,.bsshub *{font-family:Arial,Helvetica,sans-serif!important;letter-spacing:normal!important;text-shadow:none!important;font-style:normal!important}.bsshub textarea{font-family:Consolas,monospace!important}'
  document.documentElement.appendChild(css)
  var L=ui.launch=mk('button','position:fixed;left:6px;bottom:6px;z-index:'+Z+';font:13px sans-serif;padding:4px 10px;border-radius:8px;border:none;cursor:pointer;background:rgba(0,0,0,.75);color:#fff','BSShub')
  var w=ui.win=mk('div','display:none;position:fixed;left:6px;bottom:40px;z-index:'+Z+';background:rgba(0,0,0,.85);color:#fff;font:12px sans-serif;padding:8px;border-radius:8px;width:340px;max-width:94vw;max-height:70vh;flex-direction:column;gap:6px;box-sizing:border-box')
  var hd=mk('div','display:flex;align-items:center;gap:6px;cursor:move')
  hd.appendChild(mk('b','flex:1','BSShub (drag me)'))
  hd.appendChild(btn('Close',function(){w.style.display='none'}))
  L.className='bsshub'
  w.className='bsshub'
  L.onclick=function(){if(Date.now()-(L._drag||0)<300)return;w.style.display=w.style.display==='none'?'flex':'none'}
  stopKeys(w)
  w.appendChild(hd)
  ui.tabs=mk('div','display:flex;gap:4px;flex-wrap:wrap')
  var t1=btn('Multiplayer',function(){showTab('play')});t1.dataset.tab='play'
  var t2=btn('Mods',function(){showTab('mods')});t2.dataset.tab='mods'
  ui.tabs.appendChild(t1);ui.tabs.appendChild(t2)
  w.appendChild(ui.tabs)
  ui.content=mk('div','overflow:auto;display:flex;flex-direction:column;gap:6px')
  /* multiplayer pane */
  ui.play=mk('div','display:flex;flex-direction:column;gap:6px')
  ui.mpNote=mk('div','')
  ui.mpInstall=btn('Install multiplayer',installMp)
  ui.mpRemove=btn('Uninstall multiplayer',function(){S.mp=0;save();toast('Uninstalled. Reload the page.');renderPlay()})
  ui.mpHold=mk('div','')
  ui.play.appendChild(ui.mpNote)
  ui.play.appendChild(ui.mpInstall)
  ui.play.appendChild(ui.mpHold)
  ui.play.appendChild(ui.mpRemove)
  /* mods pane */
  ui.mods=mk('div','display:none;flex-direction:column;gap:6px')
  ui.list=mk('div','display:flex;flex-direction:column;gap:3px')
  ui.urlList=mk('div','display:flex;flex-direction:column;gap:3px')
  ui.mods.appendChild(mk('b',null,'Mod store (tap Install)'))
  ui.store=mk('div','display:flex;flex-direction:column;gap:8px')
  ui.mods.appendChild(ui.store)
  ui.mods.appendChild(mk('b',null,'Installed mods'))
  ui.mods.appendChild(ui.list)
  ui.mods.appendChild(mk('div','opacity:.7','Only add mods you trust. A mod can do anything this page can.'))
  ui.mods.appendChild(mk('b',null,'Add a mod'))
  var u=inp('https:// link to a mod .js',160)
  var r1=mk('div','display:flex;gap:4px;align-items:center')
  r1.appendChild(u)
  r1.appendChild(btn('Add',function(){
    var v=u.value.replace(/\s/g,'')
    if(!v)return
    loadScript(v,function(){if(S.urls.indexOf(v)<0){S.urls.push(v);save();renderUrls()};toast('Mod added')})
    u.value=''
  }))
  ui.mods.appendChild(r1)
  var ta=mk('textarea','width:100%;box-sizing:border-box;height:56px;font:11px monospace;border-radius:4px;border:none;resize:none')
  ta.placeholder='...or paste mod code here'
  stopKeys(ta)
  ui.mods.appendChild(ta)
  ui.mods.appendChild(btn('Add pasted code',function(){
    var c=ta.value
    if(!c)return
    try{runCode(c);S.pasted.push(c);save();ta.value='';toast('Mod code added')}catch(e){toast(e.message)}
  }))
  ui.mods.appendChild(ui.urlList)
  ui.mods.appendChild(btn('Forget all added mods',function(){S.urls=[];S.pasted=[];save();renderUrls();toast('Cleared. They will not load next time.')}))
  ui.mods.appendChild(mk('b',null,'Admin code'))
  var ai=inp('admin code',110)
  ai.type='password';ai.autocomplete='off'
  function tryCode(){var v=ai.value;ai.value='';unlockAdmin(v)}
  ai.addEventListener('keydown',function(e){if(e.key==='Enter')tryCode()})
  var r2=mk('div','display:flex;gap:4px;align-items:center')
  r2.appendChild(ai)
  r2.appendChild(btn('Unlock',tryCode))
  ui.mods.appendChild(r2)
  ui.content.appendChild(ui.play)
  ui.content.appendChild(ui.mods)
  w.appendChild(ui.content)
  document.documentElement.appendChild(w)
  document.documentElement.appendChild(L)
  drag(hd,w,'w')
  drag(L,L,'l')
}

/* ---------- main loop and keys ---------- */
var last=0
function loop(t){
  requestAnimationFrame(loop)
  var dt=last?Math.min(0.1,(t-last)/1000):0
  last=t
  emit('tick',dt)
}
function kk(e){return e.key===' '?' ':String(e.key).toLowerCase()}
document.addEventListener('keydown',function(e){
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return
  var k=kk(e);keys[k]=1
  emit('key',{key:k,down:true})
})
document.addEventListener('keyup',function(e){
  var k=kk(e);keys[k]=0
  emit('key',{key:k,down:false})
})
setInterval(mpPoll,500)
setInterval(function(){
  if(booted&&window.__bssmpOwner&&!ui.mpHold.firstChild&&!embBusy){embedBar();renderPlay()}
},1000)

window.BSSMod={version:'1.0',register:register,toast:toast,unlock:unlockAdmin,open:function(t){ui.win.style.display='flex';showTab(t||'play')},isUnlocked:function(){return adminOn},list:function(){return order.slice()}}

var ADMIN=({id:'admin',name:'Admin',version:'1.0',author:'built-in',init:function(api){
  var fly=false,saved=null,coords=api.ui.text('')
  api.ui.toggle('Fly (Space up, C down)',false,function(v){fly=v})
  api.ui.button('Up 50',function(){var p=api.player();if(p)api.teleport(p.x,p.y+50,p.z)})
  api.ui.button('Save spot',function(){var p=api.player();if(p){saved=[p.x,p.y,p.z];api.toast('Spot saved')}})
  api.ui.button('Back to spot',function(){if(saved)api.teleport(saved[0],saved[1],saved[2]);else api.toast('No spot saved yet')})
  api.ui.input('Go to x,y,z','10,20,30',function(v){
    var a=v.split(/[ ,]+/).map(parseFloat)
    if(a.length<3||a.some(isNaN)){api.toast('Type three numbers');return}
    api.teleport(a[0],a[1],a[2])
  })
  api.ui.select('Player',function(){return api.mp.players().filter(function(p){return !p.hidden}).map(function(p){return {label:p.name,value:p.x+','+(p.y+2)+','+p.z}})},function(v){
    if(!v){api.toast('No player to go to');return}
    var a=v.split(',').map(parseFloat);api.teleport(a[0],a[1],a[2])
  })
  api.ui.input('Announce','message',function(v){
    if(!api.mp.chat('[ADMIN] '+v))api.toast('Join a room first')
  })
  api.on('tick',function(){
    var p=api.player()
    if(!p)return
    if(fly)api.velocity(null,api.key(' ')?14:(api.key('c')?-14:0),null)
    coords('x '+p.x.toFixed(1)+'  y '+p.y.toFixed(1)+'  z '+p.z.toFixed(1))
  })
}})
var JUMP=({id:'jump',name:'High jump',version:'1.0',author:'built-in',init:function(api){
  var power=api.store.get('power',16)
  api.ui.slider('Power',8,40,power,function(v){power=v;api.store.set('power',v)})
  api.ui.toggle('Enabled',false,function(v){on=v})
  var on=false
  api.keybind(' ',function(){
    var p=api.player()
    if(on&&p&&Math.abs(p.vy)<0.6)api.velocity(null,power,null)
  })
}})

/* ---------- default mods (the Mod store) ---------- */
var STORE=[]
JUMP.desc='Jump much higher. A slider sets the power.'
STORE.push(JUMP)
STORE.push({id:'glider',name:'Glider',version:'1.0',author:'BSS',desc:'Hold Space while falling to float down slowly.',init:function(a){
  var cap=a.store.get('cap',3)
  a.ui.slider('Fall speed',1,10,cap,function(v){cap=v;a.store.set('cap',v)})
  a.ui.text('Hold Space while you fall.')
  a.on('tick',function(){var p=a.player();if(p&&a.key(' ')&&p.vy<-cap)a.velocity(null,-cap,null)})
}})
STORE.push({id:'sprint',name:'Sprint',version:'1.0',author:'BSS',desc:'Run faster. You pick the top speed.',init:function(a){
  var on=false,max=a.store.get('max',14)
  a.ui.toggle('Sprint on',false,function(v){on=v})
  a.ui.slider('Top speed',5,40,max,function(v){max=v;a.store.set('max',v)})
  a.on('tick',function(){
    var p=a.player(),h,f
    if(!on||!p)return
    h=Math.sqrt(p.vx*p.vx+p.vz*p.vz)
    if(h>0.5&&h<max){f=Math.min(max/h,1.12);a.velocity(p.vx*f,null,p.vz*f)}
  })
}})
STORE.push({id:'hud',name:'Info Panel',version:'1.0',author:'BSS',desc:'Shows your position, speed, FPS and compass on screen.',init:function(a){
  var d=document.createElement('div'),fr=0,fps=0,t0=performance.now()
  d.setAttribute('data-bssui','1')
  d.style.cssText='position:fixed;top:8px;right:8px;z-index:99996;background:rgba(0,0,0,.6);color:#fff;font:12px monospace;padding:6px 9px;border-radius:8px;pointer-events:none;white-space:pre'
  document.documentElement.appendChild(d)
  a.on('tick',function(){fr++})
  a.every(500,function(){
    var now=performance.now(),p=a.player(),deg,sp,dirs=['N','NE','E','SE','S','SW','W','NW']
    fps=Math.round(fr*1000/(now-t0));fr=0;t0=now
    if(!p){d.textContent='waiting for the game...';return}
    deg=((p.yaw*180/Math.PI)%360+360)%360
    sp=Math.sqrt(p.vx*p.vx+p.vz*p.vz)
    d.textContent='x '+p.x.toFixed(0)+'   y '+p.y.toFixed(0)+'   z '+p.z.toFixed(0)+'\nspeed '+sp.toFixed(1)+'   '+fps+' fps\nfacing '+dirs[Math.round(deg/45)%8]+' '+Math.round(deg)+' deg'
  })
  this.stop=function(){d.remove()}
}})
STORE.push({id:'home',name:'Home Spot',version:'1.0',author:'BSS',desc:'Save a spot, then zip back to it any time. Press H to go home.',init:function(a){
  var h=a.store.get('home',null),info=a.ui.text(h?'Home is saved.':'No home yet.')
  function go(){if(!h){a.toast('Set a home first');return}a.teleport(h[0],h[1]+1,h[2]);a.toast('Welcome home!')}
  a.ui.button('Set home here',function(){var p=a.player();if(!p){a.toast('Start the game first');return}h=[p.x,p.y,p.z];a.store.set('home',h);info('Home is saved.');a.toast('Home saved')})
  a.ui.button('Go home (H)',go)
  a.keybind('h',go)
}})
STORE.push({id:'filter',name:'Color Filter',version:'1.0',author:'BSS',desc:'Change how the world looks: sunset, night, old photo, rainbow party.',init:function(a){
  var F={'Normal':'','Sunset':'sepia(.5) saturate(1.5) hue-rotate(-15deg)','Night':'brightness(.55) saturate(.8) hue-rotate(190deg)','Old photo':'sepia(1) contrast(1.1)','Black and white':'grayscale(1)','Vivid':'saturate(1.8) contrast(1.1)','Rainbow':'x'},cur='Normal',hue=0,names=Object.keys(F)
  function cv(){
    var all=document.querySelectorAll('canvas'),best=null,ar=0,i,r
    for(i=0;i<all.length;i++){
      if(all[i].style.zIndex==='99998'||all[i].style.zIndex==='99996')continue
      r=all[i].getBoundingClientRect()
      if(r.width*r.height>ar){ar=r.width*r.height;best=all[i]}
    }
    return best
  }
  function apply(){var c=cv();if(c)c.style.filter=cur==='Rainbow'?'hue-rotate('+hue+'deg) saturate(1.4)':F[cur]}
  a.ui.select('Look',function(){return names.map(function(n){return {label:n,value:n}})},function(v){cur=v;apply()})
  a.every(100,function(){if(cur==='Rainbow'){hue=(hue+6)%360;apply()}})
  this.stop=function(){var c=cv();if(c)c.style.filter=''}
}})
STORE.push({id:'confetti',name:'Confetti',version:'1.0',author:'BSS',desc:'Press K or the button to pop a burst of confetti. Friends see a chat note.',init:function(a){
  var cv=null,parts=[],raf=0,lastChat=0
  function step(){
    var x=cv.getContext('2d'),i,p
    x.clearRect(0,0,cv.width,cv.height)
    for(i=parts.length-1;i>=0;i--){
      p=parts[i];p.vy+=0.35;p.vx*=0.99;p.x+=p.vx;p.y+=p.vy;p.life--
      if(p.life<=0||p.y>cv.height+20){parts.splice(i,1);continue}
      x.fillStyle=p.c;x.fillRect(p.x,p.y,p.s,p.s*0.6)
    }
    raf=parts.length?requestAnimationFrame(step):0
  }
  function pop(){
    var i,n,cols=['#ffd54f','#ff6b6b','#4dd0e1','#81c784','#ba68c8','#ffffff']
    if(!cv){
      cv=document.createElement('canvas')
      cv.setAttribute('data-bssui','1')
      cv.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99996'
      document.documentElement.appendChild(cv)
    }
    cv.width=window.innerWidth;cv.height=window.innerHeight
    for(i=0;i<140;i++)parts.push({x:cv.width/2,y:cv.height*0.55,vx:(Math.random()-.5)*16,vy:-Math.random()*16-4,s:4+Math.random()*5,c:cols[i%6],life:120+Math.random()*60})
    if(!raf)raf=requestAnimationFrame(step)
    n=Date.now()
    if(n-lastChat>3000&&a.mp.inRoom()){lastChat=n;a.mp.chat('*pops confetti*')}
  }
  a.ui.button('Pop confetti (K)',pop)
  a.keybind('k',pop)
  this.stop=function(){cancelAnimationFrame(raf);raf=0;if(cv)cv.remove();cv=null;parts=[]}
}})
STORE.push({id:'quickchat',name:'Quick Chat',version:'1.0',author:'BSS',desc:'One-tap messages for your friends in multiplayer.',init:function(a){
  ['Hi!','GG','Follow me!','Need help!','Bzzz!','Thanks!'].forEach(function(t){
    a.ui.button(t,function(){if(!a.mp.inRoom()){a.toast('Join a room first');return}a.mp.chat(t)})
  })
}})
STORE.push({id:'stopwatch',name:'Stopwatch',version:'1.0',author:'BSS',desc:'Time your races. Start, stop, lap and reset.',init:function(a){
  var acc=0,st=0,laps=[],show=a.ui.text('0:00.0'),lp=a.ui.text('')
  function el(){return acc+(st?Date.now()-st:0)}
  function fmt(ms){var s=ms/1000,m=Math.floor(s/60);return m+':'+('0'+(s%60).toFixed(1)).slice(-4)}
  a.ui.button('Start / Stop',function(){if(st){acc+=Date.now()-st;st=0}else st=Date.now()})
  a.ui.button('Lap',function(){laps.push(fmt(el()));lp('Laps: '+laps.slice(-5).join('   '))})
  a.ui.button('Reset',function(){acc=0;st=0;laps=[];lp('')})
  a.every(100,function(){show(fmt(el()))})
}})
STORE.push({id:'sparkle',name:'Sparkle Trail',version:'1.0',author:'BSS',desc:'Your mouse leaves a trail of golden sparkles.',init:function(a){
  var last=0
  function mv(e){
    var n=Date.now(),s
    if(n-last<30)return
    last=n
    s=document.createElement('div')
    s.style.cssText='position:fixed;pointer-events:none;z-index:99996;border-radius:50%;background:#ffd54f;box-shadow:0 0 8px #ffb300;width:7px;height:7px;transition:all .7s ease-out;opacity:1;left:'+(e.clientX-3)+'px;top:'+(e.clientY-3)+'px'
    document.documentElement.appendChild(s)
    setTimeout(function(){s.style.opacity='0';s.style.transform='translate(0,18px) scale(.2)'},20)
    setTimeout(function(){s.remove()},800)
  }
  document.addEventListener('mousemove',mv)
  this.stop=function(){document.removeEventListener('mousemove',mv)}
}})
STORE.push({id:'photo',name:'Photo Mode',version:'1.0',author:'BSS',desc:'Press P to hide the menu and overlays for clean screenshots.',init:function(a){
  var hid=false
  function t(){hid=!hid;a.hideUI(hid);if(hid)a.toast('Photo mode. Press P to bring the menu back.')}
  a.ui.button('Photo mode (P)',t)
  a.keybind('p',t)
  this.stop=function(){if(hid)a.hideUI(false)}
}})
function renderStore(){
  if(!ui.store)return
  ui.store.textContent=''
  STORE.forEach(function(m){
    var r=mk('div','display:flex;gap:6px;align-items:center'),d=mk('div','flex:1;min-width:0'),on=!!S.inst[m.id]
    d.appendChild(mk('b',null,m.name))
    d.appendChild(mk('div','font-size:11px;opacity:.8',m.desc))
    r.appendChild(d)
    r.appendChild(btn(on?'Remove':'Install',function(){if(on)uninstallStore(m.id);else installStore(m.id)}))
    ui.store.appendChild(r)
  })
}
function installStore(id){
  var m=STORE.filter(function(x){return x.id===id})[0]
  if(!m)return
  S.inst[id]=1;delete S.off[id];save()
  register(m)
  renderStore()
  toast('Installed '+m.name+(act[id]&&act[id].body?' - see its tab at the top':''))
}
function uninstallStore(id){
  delete S.inst[id];save()
  stop(id,true)
  delete mods[id]
  order=order.filter(function(x){return x!==id})
  renderMods();renderStore()
  toast('Removed')
}


var T0=Date.now()+Math.random()
function hasGame(){return typeof window.exposeCheats==='function'?1:0}
function setHubHidden(h){
  if(!ui.launch)return
  ui.launch.style.display=h?'none':''
  if(h&&ui.win)ui.win.style.display='none'
}
function sweepHub(){
  try{
    window.__bsshubInfo={g:hasGame(),t:T0}
    var rw=window,better=false
    try{while(rw.parent&&rw.parent!==rw){void rw.parent.document;rw=rw.parent}}catch(e){}
    var visit=function(w,d){
      var n=0,i,inf
      if(d>6)return
      try{void w.document}catch(e){return}
      if(w!==window){
        inf=w.__bsshubInfo
        if(inf&&(inf.g>hasGame()||(inf.g===hasGame()&&inf.t<T0)))better=true
      }
      try{n=w.frames.length}catch(e){}
      for(i=0;i<n;i++){try{visit(w.frames[i],d+1)}catch(e){}}
    }
    visit(rw,0)
    setHubHidden(better)
  }catch(e){}
}
function boot(){
  buildHub()
  booted=true
  pending.forEach(function(id){if(!S.off[id])start(id)})
  pending=[]
  STORE.forEach(function(m){if(S.inst[m.id])register(m)})
  renderStore()
  S.urls.forEach(function(u){loadScript(u)})
  S.pasted.forEach(function(c){try{runCode(c)}catch(e){}})
  renderMods()
  renderPlay()
  showTab('play')
  if(window.__bssmpOwner)embedBar()
  else if(S.mp)loadScript(MP_URL,function(){renderPlay();embedBar()})
  requestAnimationFrame(loop)
  setInterval(sweepHub,700)
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot)
})()
