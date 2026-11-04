/* BSS public lobby bot. Runs forever and hosts public rooms so they are always open.
   Settings (all optional): ROOMS="LOBBY,LOBBY2"  PEER_HOST / PEER_PORT / PEER_PATH / PEER_SECURE (default: 0.peerjs.com) */
const wrtc=require('@roamhq/wrtc')
Object.assign(globalThis,{RTCPeerConnection:wrtc.RTCPeerConnection,RTCSessionDescription:wrtc.RTCSessionDescription,RTCIceCandidate:wrtc.RTCIceCandidate,WebSocket:require('ws')})
const {Peer}=require('peerjs')
const PRE='bssmp-'
const ROOMS=(process.env.ROOMS||'LOBBY').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)
const CFG={host:process.env.PEER_HOST||'0.peerjs.com',port:+(process.env.PEER_PORT||443),path:process.env.PEER_PATH||'/',secure:(process.env.PEER_SECURE||'1')!=='0'}
const log=(...a)=>console.log(new Date().toISOString().slice(11,19),...a)
function num(v){v=+v;return isFinite(v)?Math.round(v*100)/100:0}
function clean(d){
  const c=String(d.c||''),h=d.h?1:0
  return {n:String(d.n||'Bee').slice(0,16),c:/^#[0-9a-f]{6}$/i.test(c)?c:'',x:h?0:num(d.x),y:h?0:num(d.y),z:h?0:num(d.z),h:h,seen:Date.now()}
}
function cleanEv(ev){
  const k=ev&&ev.k
  if(k!=='chat'&&k!=='emo'&&k!=='ping')return null
  return {k:k,m:String(ev.m||'').slice(0,k==='chat'?100:8),x:num(ev.x),y:num(ev.y),z:num(ev.z)}
}
function runRoom(code){
  let peer=null,conns=[],players={},nextId=1,tick=null,retry=null
  function sendAll(msg,except){for(const o of conns){if(o.c!==except&&o.c.open){try{o.c.send(msg)}catch(e){}}}}
  function world(){
    const now=Date.now(),w={}
    for(const k in players){
      const o=players[k]
      if(now-o.seen>5000){delete players[k];continue}
      w[k]={n:o.n,c:o.c,x:o.x,y:o.y,z:o.z,h:o.h,a:now-o.seen}
    }
    return w
  }
  function again(ms){clearInterval(tick);tick=null;try{peer&&peer.destroy()}catch(e){};peer=null;conns=[];players={};clearTimeout(retry);retry=setTimeout(open,ms)}
  function open(){
    const p=peer=new Peer(PRE+code,CFG)
    p.on('open',()=>{
      if(peer!==p)return
      log('room',code,'is open')
      tick=setInterval(()=>sendAll({t:'w',p:world()}),66)
    })
    p.on('connection',c=>{
      if(peer!==p)return
      if(conns.length>=15){
        c.on('open',()=>{try{c.send({t:'full'})}catch(e){};setTimeout(()=>{try{c.close()}catch(e){}},400)})
        return
      }
      const cid='p'+(nextId++),o={id:cid,c:c,ev:0}
      c.on('open',()=>{conns.push(o);c.send({t:'id',id:cid});log(code,'joined',cid,'total',conns.length)})
      c.on('data',d=>{
        if(!d)return
        if(d.t==='s')players[cid]=clean(d)
        else if(d.t==='e'){
          const now=Date.now(),ev=cleanEv(d.ev)
          if(!ev||now-o.ev<250)return
          o.ev=now
          ev.f=cid;ev.n=players[cid]?players[cid].n:'Bee'
          sendAll({t:'e',ev:ev},c)
        }
      })
      c.on('close',()=>{conns=conns.filter(q=>q!==o);delete players[cid];log(code,'left',cid,'total',conns.length)})
    })
    p.on('disconnected',()=>{if(peer===p&&!p.destroyed){try{p.reconnect()}catch(e){}}})
    p.on('error',e=>{
      if(peer!==p)return
      if(e.type==='unavailable-id'){log(code,'busy, trying again in 20s');again(20000)}
      else{log(code,'error',e.type,'- restarting in 15s');again(15000)}
    })
    p.on('close',()=>{if(peer===p){log(code,'closed - restarting in 10s');again(10000)}})
  }
  open()
}
log('BSS lobby bot starting. Rooms:',ROOMS.join(', '))
ROOMS.forEach(runRoom)
process.on('uncaughtException',e=>log('oops',e&&e.message))
process.on('unhandledRejection',e=>log('oops',e&&e.message))
