(function(){
if(window.__bssAdmin)return
window.__bssAdmin=1
var CODE='armadillo'
var box=null,panel=null,fly=false,keys={},saved=null,coordEl,flyBtn,sel,msgEl
function P(){
  try{if(!window.player&&typeof window.exposeCheats==='function')window.exposeCheats()}catch(e){}
  var q=window.player
  return q&&q.body?q:null
}
function mk(tag,css,txt){
  var e=document.createElement(tag)
  if(css)e.style.cssText=css
  if(txt!=null)e.textContent=txt
  return e
}
function stopKeys(e){['keydown','keyup','keypress'].forEach(function(k){e.addEventListener(k,function(x){x.stopPropagation()})})}
function btn(t,fn){
  var b=mk('button','font:12px sans-serif;padding:2px 8px;border-radius:4px;border:none;cursor:pointer;width:auto;height:22px',t)
  b.onclick=fn
  return b
}
function inp(ph,w){
  var i=mk('input','font:12px sans-serif;padding:2px 4px;border-radius:4px;border:none;height:20px;width:'+w+'px')
  i.placeholder=ph
  stopKeys(i)
  return i
}
function say(t){if(msgEl)msgEl.textContent=t}
function tp(x,y,z){
  var q=P()
  if(!q){say('Start a game first');return}
  var b=q.body,p=b.position
  if(p.set)p.set(x,y,z);else{p.x=x;p.y=y;p.z=z}
  if(b.velocity&&b.velocity.set)b.velocity.set(0,0,0)
  say('Teleported')
}
function friends(){
  var out=[],g,k
  try{g=JSON.parse(window.__bssmp()).ghosts}catch(e){return out}
  for(k in g){if(!g[k].h)out.push({id:k,n:g[k].n,x:g[k].tx,y:g[k].ty,z:g[k].tz})}
  return out
}
function loop(){
  requestAnimationFrame(loop)
  var q=P()
  if(!q)return
  if(fly&&q.body.velocity)q.body.velocity.y=keys[' ']?14:(keys.c?-14:0)
  if(coordEl){var p=q.body.position;coordEl.textContent='x '+p.x.toFixed(1)+'  y '+p.y.toFixed(1)+'  z '+p.z.toFixed(1)}
}
document.addEventListener('keydown',function(e){if(e.target&&e.target.tagName==='INPUT')return;keys[e.key===' '?' ':e.key.toLowerCase()]=1})
document.addEventListener('keyup',function(e){keys[e.key===' '?' ':e.key.toLowerCase()]=0})
function fillSel(){
  var f=friends(),i,o
  sel.textContent=''
  if(!f.length){sel.appendChild(mk('option',null,'(no players)'));return}
  for(i=0;i<f.length;i++){o=mk('option',null,f[i].n);o.value=JSON.stringify(f[i]);sel.appendChild(o)}
}
function open(){
  box.style.display='none'
  if(panel){panel.style.display='block';return}
  var p=panel=mk('div','position:fixed;left:6px;top:84px;z-index:99997;background:rgba(0,0,0,.78);color:#fff;font:12px sans-serif;padding:8px;border-radius:8px;width:230px;display:flex;flex-direction:column;gap:6px')
  var hd=mk('div','display:flex;align-items:center;gap:6px;cursor:move')
  hd.appendChild(mk('b','flex:1','Admin panel'))
  hd.appendChild(btn('Lock',function(){panel.style.display='none';box.style.display='';fly=false;flyBtn.textContent='Fly: OFF'}))
  p.appendChild(hd)
  hd.onmousedown=function(e){
    if(e.target.tagName==='BUTTON')return
    var r=p.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top
    function mv(ev){p.style.left=(ev.clientX-dx)+'px';p.style.top=(ev.clientY-dy)+'px'}
    function up(){document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)}
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)
  }
  coordEl=mk('div','font:11px monospace;opacity:.9','')
  p.appendChild(coordEl)
  var r1=mk('div','display:flex;gap:6px;flex-wrap:wrap;align-items:center')
  flyBtn=btn('Fly: OFF',function(){fly=!fly;flyBtn.textContent='Fly: '+(fly?'ON':'OFF');say(fly?'Hold Space to rise, C to sink':'Fly off')})
  r1.appendChild(flyBtn)
  r1.appendChild(btn('Up 50',function(){var q=P();if(q)tp(q.body.position.x,q.body.position.y+50,q.body.position.z)}))
  p.appendChild(r1)
  var r2=mk('div','display:flex;gap:6px;flex-wrap:wrap;align-items:center')
  r2.appendChild(btn('Save spot',function(){var q=P();if(!q)return;var s=q.body.position;saved=[s.x,s.y,s.z];say('Spot saved')}))
  r2.appendChild(btn('Back to spot',function(){if(!saved){say('No spot saved yet');return}tp(saved[0],saved[1],saved[2])}))
  p.appendChild(r2)
  var r3=mk('div','display:flex;gap:4px;align-items:center'),ix=inp('x',40),iy=inp('y',40),iz=inp('z',40)
  r3.appendChild(ix);r3.appendChild(iy);r3.appendChild(iz)
  r3.appendChild(btn('Go',function(){
    var x=parseFloat(ix.value),y=parseFloat(iy.value),z=parseFloat(iz.value)
    if(isNaN(x)||isNaN(y)||isNaN(z)){say('Type x, y and z numbers');return}
    tp(x,y,z)
  }))
  p.appendChild(r3)
  var r4=mk('div','display:flex;gap:4px;align-items:center')
  sel=mk('select','flex:1;min-width:0;font:12px sans-serif')
  sel.onfocus=fillSel
  r4.appendChild(sel)
  r4.appendChild(btn('Go to',function(){
    fillSel()
    try{var f=JSON.parse(sel.value);tp(f.x,f.y+2,f.z)}catch(e){say('No player to go to')}
  }))
  p.appendChild(r4)
  var r5=mk('div','display:flex;gap:4px;align-items:center'),im=inp('announce...',110)
  r5.appendChild(im)
  r5.appendChild(btn('Send',function(){
    var c=document.querySelector('input[placeholder="chat..."]')
    if(!c||!im.value){say('Join a room and type something');return}
    c.value='[ADMIN] '+im.value
    c.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))
    im.value='';say('Announced')
  }))
  p.appendChild(r5)
  msgEl=mk('div','opacity:.8;min-height:14px','Admin unlocked')
  p.appendChild(msgEl)
  fillSel()
  document.documentElement.appendChild(p)
}
function build(){
  box=mk('div','position:fixed;left:6px;top:84px;z-index:99997;opacity:.45')
  var i=inp('code',64)
  i.type='password'
  i.autocomplete='off'
  box.onmouseenter=function(){box.style.opacity=1}
  box.onmouseleave=function(){box.style.opacity=.45}
  i.addEventListener('keydown',function(e){
    if(e.key!=='Enter')return
    if(i.value===CODE){i.value='';open()}
    else{i.value='';i.style.outline='2px solid #f55';setTimeout(function(){i.style.outline=''},600)}
  })
  box.appendChild(i)
  document.documentElement.appendChild(box)
  requestAnimationFrame(loop)
}
if(document.readyState==='complete')build();else window.addEventListener('load',build)
})()
