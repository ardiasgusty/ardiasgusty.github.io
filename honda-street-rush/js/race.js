const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;

export class RaceGame {
  constructor({ canvas, car, map, laps=3, multiplayer=null, playerId=null, onFinish=()=>{}, onExit=()=>{} }) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.car=car; this.map=map; this.totalLaps=Number(laps)||3;
    this.multiplayer=multiplayer; this.playerId=playerId; this.onFinish=onFinish; this.onExit=onExit;
    this.running=false; this.started=false; this.last=performance.now(); this.keys={}; this.remote=new Map(); this.ai=[];
    this.roadX=0; this.distance=0; this.lap=1; this.speed=0; this.boost=100; this.position=1; this.finishDistance=5200*this.totalLaps;
    this.player={x:0,y:0}; this.countdown=3; this.countdownEnd=performance.now()+3200;
    this.resize=this.resize.bind(this); this.loop=this.loop.bind(this); this.handleKey=this.handleKey.bind(this); this.handleMsg=this.handleMsg.bind(this);
    window.addEventListener('resize',this.resize); window.addEventListener('keydown',this.handleKey); window.addEventListener('keyup',this.handleKey);
    this.resize(); this.seedAI();
    if(this.multiplayer) this.offMsg=this.multiplayer.onMessage(this.handleMsg);
  }

  seedAI(){
    if(this.multiplayer) return;
    const names=['Rival 01','Rival 02','Rival 03','Rival 04','Rival 05'];
    this.ai=names.map((name,i)=>({id:`ai${i}`,name,x:(i%3-1)*.55,progress:100+i*110,speed:105+Math.random()*55,color:['#f5f5f5','#f0b52a','#258ad6','#272b32','#e34565'][i]}));
  }

  handleMsg(msg){
    if(msg.type==='RACE_STATE' && msg.from!==this.playerId){
      const p=this.remote.get(msg.from)||{x:0,tx:0,progress:0,tprogress:0,color:'#eee',name:'Player'};
      p.tx=msg.data.x; p.tprogress=msg.data.distance; p.color=msg.data.color||p.color; p.name=msg.data.name||p.name; p.last=performance.now();
      this.remote.set(msg.from,p);
    }
  }

  bindTouch(left,right,boost){
    const bind=(el,key)=>{if(!el)return; const on=()=>this.keys[key]=true,off=()=>this.keys[key]=false; el.addEventListener('pointerdown',on); el.addEventListener('pointerup',off); el.addEventListener('pointercancel',off); el.addEventListener('pointerleave',off)};
    bind(left,'ArrowLeft'); bind(right,'ArrowRight'); bind(boost,'Shift');
  }

  handleKey(e){ if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s','Shift'].includes(e.key)) { this.keys[e.key]=e.type==='keydown'; e.preventDefault(); } }
  resize(){const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=innerWidth*dpr;this.canvas.height=innerHeight*dpr;this.canvas.style.width=innerWidth+'px';this.canvas.style.height=innerHeight+'px';this.ctx.setTransform(dpr,0,0,dpr,0,0)}
  start(){this.running=true;this.last=performance.now();requestAnimationFrame(this.loop)}
  stop(){this.running=false;window.removeEventListener('resize',this.resize);window.removeEventListener('keydown',this.handleKey);window.removeEventListener('keyup',this.handleKey);if(this.offMsg)this.offMsg()}

  update(dt,now){
    if(!this.started){ const rem=this.countdownEnd-now; this.countdown=Math.ceil(rem/1000); if(rem<=0){this.started=true;this.countdown=0;} return; }
    const accel=(this.car.accel/100)*74; const max=125+(this.car.speed/100)*145; const steer=(this.car.handling/100)*1.55;
    const gas=this.keys['ArrowUp']||this.keys['w']||true;
    if(gas) this.speed+=accel*dt; else this.speed-=42*dt;
    if(this.keys['ArrowDown']||this.keys['s']) this.speed-=110*dt;
    const boosting=this.keys['Shift']&&this.boost>0;
    if(boosting){this.speed+=145*dt;this.boost-=28*dt}else this.boost=Math.min(100,this.boost+9*dt);
    this.speed=clamp(this.speed,0,max+(boosting?55:0));
    const dir=(this.keys['ArrowLeft']||this.keys['a']?-1:0)+(this.keys['ArrowRight']||this.keys['d']?1:0);
    this.player.x=clamp(this.player.x+dir*steer*dt*(.5+this.speed/max),-1.15,1.15);
    const offroad=Math.abs(this.player.x)>.95; if(offroad)this.speed*=1-.8*dt;
    this.distance+=this.speed*dt*1.15;
    this.lap=Math.min(this.totalLaps,Math.floor(this.distance/5200)+1);
    const curve=Math.sin(this.distance/800)*.22+Math.sin(this.distance/2700)*.28; this.roadX=curve;
    if(!this.multiplayer){this.ai.forEach((a,i)=>{a.progress+=a.speed*dt*(.96+Math.sin((now+i*500)/1700)*.05);a.x=Math.sin((now/1200)+i*2.1)*.72;});}
    for(const p of this.remote.values()){p.x=lerp(p.x,p.tx,.15);p.progress=lerp(p.progress,p.tprogress,.15)}
    const rivals=this.multiplayer?[...this.remote.values()]:this.ai; this.position=1+rivals.filter(r=>r.progress>this.distance).length;
    if(this.multiplayer && now-(this.lastBroadcast||0)>80){this.lastBroadcast=now;this.multiplayer.broadcast('RACE_STATE',{x:this.player.x,distance:this.distance,speed:this.speed,color:this.car.color,name:this.multiplayer.name});}
    if(this.distance>=this.finishDistance){this.finish();}
  }

  drawRoad(w,h){
    const c=this.ctx; const horizon=h*.23; c.fillStyle=this.map.sky1;c.fillRect(0,0,w,h); const g=c.createLinearGradient(0,0,0,horizon*1.5);g.addColorStop(0,this.map.sky1);g.addColorStop(1,this.map.sky2);c.fillStyle=g;c.fillRect(0,0,w,horizon*1.5);
    c.fillStyle=this.map.landmark; c.globalAlpha=.9;
    for(let i=0;i<12;i++){const bw=40+(i%4)*22,bh=40+((i*29)%120);c.fillRect(i*w/11-bw/2,horizon-bh,bw,bh)} c.globalAlpha=1;
    c.fillStyle='#1a291f';c.fillRect(0,horizon,w,h-horizon);
    const segments=42; for(let i=segments-1;i>=0;i--){const p=i/segments;const z=1-p;const y=horizon+Math.pow(z,1.55)*(h-horizon);const y2=horizon+Math.pow((segments-i+1)/segments,1.55)*(h-horizon);const half=35+Math.pow(z,1.2)*w*.47;const half2=35+Math.pow((segments-i+1)/segments,1.2)*w*.47;const curve=(Math.sin((this.distance+i*90)/800)*.22+Math.sin((this.distance+i*90)/2700)*.28)*w*.24*z;const curve2=(Math.sin((this.distance+(i-1)*90)/800)*.22+Math.sin((this.distance+(i-1)*90)/2700)*.28)*w*.24*((segments-i+1)/segments);const cx=w/2+curve,cx2=w/2+curve2;c.fillStyle=(i+Math.floor(this.distance/80))%2?this.map.road:'#2a2d32';c.beginPath();c.moveTo(cx-half,y);c.lineTo(cx+half,y);c.lineTo(cx2+half2,y2);c.lineTo(cx2-half2,y2);c.closePath();c.fill(); if((i+Math.floor(this.distance/110))%7<3){c.strokeStyle='#ffffffbb';c.lineWidth=Math.max(1,z*5);[-.33,.33].forEach(l=>{c.beginPath();c.moveTo(cx+half*l*2,y);c.lineTo(cx2+half2*l*2,y2);c.stroke()})}}
  }

  project(progress,x,w,h){const rel=progress-this.distance;const min=-250,max=1600;if(rel<min||rel>max)return null;const t=1-(rel-min)/(max-min);const horizon=h*.23;const y=horizon+Math.pow(t,1.7)*(h-horizon*.85);const scale=.22+t*1.05;const roadHalf=35+Math.pow(t,1.2)*w*.47;const curve=(Math.sin(progress/800)*.22+Math.sin(progress/2700)*.28)*w*.24*t;return{sx:w/2+curve+x*roadHalf*.78,sy:y,scale}}
  drawCar(x,y,scale,color,label){const c=this.ctx;const ww=58*scale,hh=86*scale;c.save();c.translate(x,y);c.fillStyle='#0008';c.beginPath();c.ellipse(0,hh*.22,ww*.62,hh*.42,0,0,Math.PI*2);c.fill();c.fillStyle=color;c.beginPath();c.roundRect(-ww/2,-hh/2,ww,hh,12*scale);c.fill();c.fillStyle='#18212b';c.fillRect(-ww*.32,-hh*.30,ww*.64,hh*.24);c.fillStyle='#fff7';c.fillRect(-ww*.34,hh*.24,ww*.68,4*scale);if(label&&scale>.55){c.font=`${Math.max(9,10*scale)}px sans-serif`;c.textAlign='center';c.fillStyle='#fff';c.fillText(label,0,-hh*.62)}c.restore()}
  draw(){const w=innerWidth,h=innerHeight;this.drawRoad(w,h);const rivals=this.multiplayer?[...this.remote.values()]:this.ai;rivals.sort((a,b)=>b.progress-a.progress).forEach(r=>{const p=this.project(r.progress,r.x,w,h);if(p)this.drawCar(p.sx,p.sy,p.scale,r.color,r.name)});const py=h*.79;this.drawCar(w/2+this.player.x*w*.29,py,1.05,this.car.color,this.car.name.replace('Honda ','').replace('City Hatchback RS','City HB RS'));}
  loop(now){if(!this.running)return;const dt=Math.min((now-this.last)/1000,.04);this.last=now;this.update(dt,now);this.draw();requestAnimationFrame(this.loop)}
  finish(){if(!this.running)return;this.stop();this.onFinish({position:this.position,lap:this.totalLaps,time:performance.now()});}
}
