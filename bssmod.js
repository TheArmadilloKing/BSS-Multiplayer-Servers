/* BSSMod 1.0 - a small modding API for the Bee Swarm remake (Khan or GitHub). */
(function(){
if(window.BSSMod)return
var CFG=window.BSSMOD_CONFIG||{}
var CODE=CFG.code||'armadillo'
var Z=99997
var mods={},order=[],act={},bus={},keys={},unlocked=false
var S={off:{},urls:[],pasted:[]}
try{var sv=JSON.parse(localStorage.getItem('bssmod')||'{}');if(sv.off)S.off=sv.off;if(sv.urls)S.urls=sv.urls;if(sv.pasted)S.pasted=sv.pasted}catch(e){}
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
  if(!mod||act[id]||!unlocked)return
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
  if(unlocked&&!S.off[mod.id])start(mod.id)
  renderMods()
  return true
}

/* ---------- menu ---------- */
var ui={win:null,tabs:null,content:null,mods:null,cur:'mods',box:null}
function addTab(inst){
  var id=inst.mod.id
  inst.tab=btn(inst.mod.name||id,function(){showTab(id)})
  inst.tab.dataset.tab=id
  ui.tabs.insertBefore(inst.tab,ui.tabs.firstChild)
}
function showTab(id){
  ui.cur=id
  var k
  ui.mods.style.display=id==='mods'?'flex':'none'
  for(k in act){if(act[k].body)act[k].body.style.display=k===id?'flex':'none'}
  var t=ui.tabs.children,i
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
function buildMenu(){
  var w=ui.win=mk('div','display:none;position:fixed;left:6px;top:84px;z-index:'+Z+';background:rgba(0,0,0,.82);color:#fff;font:12px sans-serif;padding:8px;border-radius:8px;width:270px;max-height:70vh;flex-direction:column;gap:6px')
  var hd=mk('div','display:flex;align-items:center;gap:6px;cursor:move')
  hd.appendChild(mk('b','flex:1','Mod menu'))
  hd.appendChild(btn('Lock',lock))
  hd.onmousedown=function(e){
    if(e.target.tagName==='BUTTON')return
    var r=w.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top
    function mv(ev){w.style.left=(ev.clientX-dx)+'px';w.style.top=(ev.clientY-dy)+'px'}
    function up(){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)}
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)
  }
  w.appendChild(hd)
  ui.tabs=mk('div','display:flex;gap:4px;flex-wrap:wrap')
  var mt=btn('Mods',function(){showTab('mods')});mt.dataset.tab='mods'
  ui.tabs.appendChild(mt)
  w.appendChild(ui.tabs)
  ui.content=mk('div','overflow:auto;display:flex;flex-direction:column;gap:6px')
  ui.mods=mk('div','display:flex;flex-direction:column;gap:6px')
  ui.list=mk('div','display:flex;flex-direction:column;gap:3px')
  ui.mods.appendChild(ui.list)
  ui.mods.appendChild(mk('div','opacity:.7','Only load mods you trust. A mod can do anything this page can.'))
  var u=inp('https:// link to a mod .js',150)
  ui.mods.appendChild(mk('div','display:flex;gap:4px;align-items:center'))
  ui.mods.lastChild.appendChild(u)
  ui.mods.lastChild.appendChild(btn('Add',function(){
    var v=u.value.replace(/\s/g,'')
    if(!v)return
    loadScript(v,function(){if(S.urls.indexOf(v)<0){S.urls.push(v);save()};toast('Mod loaded')})
    u.value=''
  }))
  var ta=mk('textarea','width:100%;box-sizing:border-box;height:60px;font:11px monospace;border-radius:4px;border:none;resize:none')
  ta.placeholder='...or paste mod code here'
  stopKeys(ta)
  ui.mods.appendChild(ta)
  ui.mods.appendChild(btn('Run pasted code',function(){
    var c=ta.value
    if(!c)return
    try{runCode(c);S.pasted.push(c);save();ta.value='';toast('Mod code ran')}catch(e){toast(e.message)}
  }))
  ui.mods.appendChild(btn('Forget added mods',function(){S.urls=[];S.pasted=[];save();toast('Cleared. They will not load next time.')}))
  ui.content.appendChild(ui.mods)
  w.appendChild(ui.content)
  document.documentElement.appendChild(w)
}
function unlock(){
  if(unlocked)return
  unlocked=true
  ui.box.style.display='none'
  ui.win.style.display='flex'
  order.forEach(function(id){if(!S.off[id])start(id)})
  S.urls.forEach(function(u){loadScript(u)})
  S.pasted.forEach(function(c){try{runCode(c)}catch(e){}})
  showTab('mods')
  emit('unlock')
}
function lock(){
  if(!unlocked)return
  emit('lock')
  Object.keys(act).forEach(function(id){stop(id,true)})
  unlocked=false
  ui.win.style.display='none'
  ui.box.style.display=''
}
function buildBox(){
  var b=ui.box=mk('div','position:fixed;left:6px;top:84px;z-index:'+Z+';opacity:.45')
  var i=inp('code',64)
  i.type='password';i.autocomplete='off'
  b.onmouseenter=function(){b.style.opacity=1}
  b.onmouseleave=function(){b.style.opacity=.45}
  i.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return
    if(i.value===CODE){i.value='';unlock()}
    else{i.value='';i.style.outline='2px solid #f55';setTimeout(function(){i.style.outline=''},600)}
  })
  b.appendChild(i)
  document.documentElement.appendChild(b)
}

/* ---------- main loop and keys ---------- */
var last=0
function loop(t){
  requestAnimationFrame(loop)
  if(!unlocked)return
  var dt=last?Math.min(0.1,(t-last)/1000):0
  last=t
  emit('tick',dt)
}
function kk(e){return e.key===' '?' ':String(e.key).toLowerCase()}
document.addEventListener('keydown',function(e){
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return
  var k=kk(e);keys[k]=1
  if(unlocked)emit('key',{key:k,down:true})
})
document.addEventListener('keyup',function(e){
  var k=kk(e);keys[k]=0
  if(unlocked)emit('key',{key:k,down:false})
})
setInterval(function(){if(unlocked)mpPoll()},500)

window.BSSMod={version:'1.0',register:register,toast:toast,isUnlocked:function(){return unlocked},list:function(){return order.slice()}}

/* ---------- built-in mods (they use the same public API) ---------- */
register({id:'admin',name:'Admin',version:'1.0',author:'built-in',init:function(api){
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
register({id:'jump',name:'High jump',version:'1.0',author:'built-in',init:function(api){
  var power=api.store.get('power',16)
  api.ui.slider('Power',8,40,power,function(v){power=v;api.store.set('power',v)})
  api.ui.toggle('Enabled',false,function(v){on=v})
  var on=false
  api.keybind(' ',function(){
    var p=api.player()
    if(on&&p&&Math.abs(p.vy)<0.6)api.velocity(null,power,null)
  })
}})
function boot(){buildMenu();buildBox();requestAnimationFrame(loop)}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot)
})()
