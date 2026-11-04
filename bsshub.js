/* BSS Hub 1.0 - one menu for the Bee Swarm remake: multiplayer, mods, admin code. */
(function(){
if(window.BSSMod)return
var CFG=window.BSSMOD_CONFIG||{}
var CODE=CFG.code||'armadillo'
var MP_URL=CFG.mp||'https://cdn.jsdelivr.net/gh/TheArmadilloKing/BSS-Multiplayer-Servers@main/bssmp2.js'
var Z=99997
var mods={},order=[],act={},bus={},keys={},adminOn=false,booted=false,pending=[]
var S={off:{},urls:[],pasted:[],mp:0}
try{var sv=JSON.parse(localStorage.getItem('bssmod')||'{}');if(sv.off)S.off=sv.off;if(sv.urls)S.urls=sv.urls;if(sv.pasted)S.pasted=sv.pasted;if(sv.mp)S.mp=1}catch(e){}
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
var ui={win:null,launch:null,tabs:null,content:null,play:null,mods:null,list:null,cur:'play',mpHold:null,mpNote:null,mpInstall:null,mpRemove:null,urlList:null}
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

function buildHub(){
  var L=ui.launch=mk('button','position:fixed;left:6px;bottom:6px;z-index:'+Z+';font:13px sans-serif;padding:4px 10px;border-radius:8px;border:none;cursor:pointer;background:rgba(0,0,0,.75);color:#fff','Menu')
  var w=ui.win=mk('div','display:none;position:fixed;left:6px;bottom:40px;z-index:'+Z+';background:rgba(0,0,0,.85);color:#fff;font:12px sans-serif;padding:8px;border-radius:8px;width:340px;max-width:94vw;max-height:70vh;flex-direction:column;gap:6px;box-sizing:border-box')
  var hd=mk('div','display:flex;align-items:center;gap:6px')
  hd.appendChild(mk('b','flex:1','Menu'))
  hd.appendChild(btn('Close',function(){w.style.display='none'}))
  L.onclick=function(){w.style.display=w.style.display==='none'?'flex':'none'}
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

function boot(){
  buildHub()
  booted=true
  pending.forEach(function(id){if(!S.off[id])start(id)})
  pending=[]
  register(JUMP)
  S.urls.forEach(function(u){loadScript(u)})
  S.pasted.forEach(function(c){try{runCode(c)}catch(e){}})
  renderMods()
  renderPlay()
  showTab('play')
  if(window.__bssmpOwner)embedBar()
  else if(S.mp)loadScript(MP_URL,function(){renderPlay();embedBar()})
  requestAnimationFrame(loop)
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot)
})()
