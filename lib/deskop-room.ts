/** DesKop private rooms on Supabase Realtime. The uploaded game calls `window.claude.use('room')`. */

export function deskopRoomScript(url: string, key: string) {
  return `/* DesKop rooms on Supabase. The room code is the only way in. */
(function(){
  if(window.__deskopRoom)return;
  window.__deskopRoom=1;
  var SUPABASE_URL=${JSON.stringify(url)};
  var SUPABASE_KEY=${JSON.stringify(key)};
  var clientPromise=null;
  function client(){
    if(!clientPromise){
      clientPromise=new Promise(function(resolve,reject){
        if(window.supabase&&window.supabase.createClient){resolve(window.supabase);return}
        var s=document.createElement('script');
        s.src='/api/deskop-supabase';
        s.onload=function(){window.supabase&&window.supabase.createClient?resolve(window.supabase):reject({code:'unavailable',message:'supabase'})};
        s.onerror=function(){reject({code:'unavailable',message:'supabase'})};
        document.head.appendChild(s);
      }).then(function(lib){
        return lib.createClient(SUPABASE_URL,SUPABASE_KEY,{realtime:{params:{eventsPerSecond:10}}});
      });
    }
    return clientPromise;
  }
  function join(name){
    var room=String(name||'').toLowerCase().replace(/[^a-z0-9_-]/g,'');
    if(!room)return Promise.reject({code:'invalid_argument',message:'room'});
    return client().then(function(supabase){
      return new Promise(function(resolve,reject){
        var myId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random();
        var channel=supabase.channel('deskop-room:'+room,{config:{presence:{key:myId},broadcast:{self:false,ack:false}}});
        var payloads=new Map(),online={},mine=null,cbs=[],ccbs=[],last=new Map(),connected=false,settled=false,left=false,lastTrackAt=0;
        function setConn(v){if(connected===v)return;connected=v;ccbs.forEach(function(cb){try{cb(v)}catch(e){}})}
        function snapshot(){
          var ids={};Object.keys(online).forEach(function(id){ids[id]=1});ids[myId]=1;
          var a=[];Object.keys(ids).forEach(function(id){
            var p=payloads.get(id);if(!p||p.app!=='krk')return;
            a.push({peer:id,by:null,isMe:id===myId,sameTab:id===myId,kind:'viewer',guest:false,presence:p,updatedAt:Date.now()});
          });
          return a;
        }
        function emit(){
          var peers=snapshot(),joined=[],updated=[],gone=[],now=new Map();
          peers.forEach(function(x){var sig=JSON.stringify(x.presence);now.set(x.peer,sig);if(!last.has(x.peer))joined.push(x);else if(last.get(x.peer)!==sig)updated.push(x)});
          last.forEach(function(_,id){if(!now.has(id))gone.push({peer:id})});last=now;
          if(joined.length||updated.length||gone.length)cbs.slice().forEach(function(cb){try{cb({peers:peers,joined:joined,left:gone,updated:updated})}catch(e){console.error(e)}});
        }
        function remember(meta){
          if(!meta||meta.app!=='krk')return null;
          var copy={};Object.keys(meta).forEach(function(k){if(k!=='presence_ref')copy[k]=meta[k]});
          return copy;
        }
        function trackMine(force){
          if(!mine)return;
          var now=Date.now();
          if(!force&&now-lastTrackAt<8000)return;
          lastTrackAt=now;
          try{var t=channel.track(mine);if(t&&t.then)t.then(function(){},function(){})}catch(e){}
        }
        function sendMine(){
          if(!mine||!connected||left)return;
          channel.send({type:'broadcast',event:'p',payload:{id:myId,p:mine}});
        }
        function publish(p){
          try{mine=JSON.parse(JSON.stringify(p))}catch(e){mine=p}
          payloads.set(myId,mine);emit();
          trackMine(lastTrackAt===0);
          var msg={type:'broadcast',event:'p',payload:{id:myId,p:mine}};
          return channel.send(msg).then(function(res){return res==='ok'?res:channel.send(msg)});
        }
        var pulse=setInterval(function(){sendMine();trackMine(false)},1500);
        var api={name:name,
          presence:function(p){return settled?publish(p):Promise.resolve()},
          peers:function(){return snapshot()},
          onPeers:function(cb){cbs.push(cb);setTimeout(function(){var p=snapshot();try{cb({peers:p,joined:p,left:[],updated:[]})}catch(e){}},0);return function(){var i=cbs.indexOf(cb);if(i>=0)cbs.splice(i,1)}},
          onConnection:function(cb){ccbs.push(cb);setTimeout(function(){cb(connected)},0);return function(){var i=ccbs.indexOf(cb);if(i>=0)ccbs.splice(i,1)}},
          leave:function(){left=true;clearInterval(pulse);return supabase.removeChannel(channel).catch(function(){})}
        };
        channel.on('broadcast',{event:'p'},function(msg){
          var data=msg&&msg.payload;if(!data||data.id===myId||!data.p)return;
          if(!online[data.id]&&data.id!==myId)online[data.id]=1;
          payloads.set(data.id,data.p);emit();
        });
        channel.on('presence',{event:'sync'},function(){
          var state=channel.presenceState()||{};var next={};
          Object.keys(state).forEach(function(id){
            next[id]=1;
            if(id===myId)return;
            var metas=state[id]||[];
            for(var i=0;i<metas.length;i++){var copy=remember(metas[i]);if(copy)payloads.set(id,copy)}
          });
          online=next;
          emit();
        });
        channel.on('presence',{event:'leave'},function(msg){
          var id=msg&&msg.key;if(!id||id===myId)return;
          delete online[id];payloads.delete(id);emit();
        });
        channel.subscribe(function(status){
          if(left)return;
          if(status==='SUBSCRIBED'){
            if(!settled){settled=true;setConn(true);resolve(api)}
            else setConn(true);
            trackMine(false);
          }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
            if(!settled){settled=true;reject({code:'not_permitted',message:status})}else setConn(false);
          }else if(status==='CLOSED'){setConn(false)}
        });
      });
    });
  }
  var prev=window.claude;
  window.claude={use:function(n){
    if(n==='room')return Promise.resolve({join:join});
    if(prev&&typeof prev.use==='function'&&n!=='room')return prev.use(n);
    return Promise.resolve(null);
  }};
})();
`;
}
