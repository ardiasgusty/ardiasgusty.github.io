import * as THREE from 'three';
import { createCarModel } from './cars3d.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83a8cf);
scene.fog = new THREE.Fog(0x9cb5cd, 90, 310);

const camera = new THREE.PerspectiveCamera(63, innerWidth / innerHeight, .1, 800);

scene.add(new THREE.HemisphereLight(0xddeeff, 0x4b5b39, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.7);
sun.position.set(-80, 130, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -150; sun.shadow.camera.right = 150; sun.shadow.camera.top = 150; sun.shadow.camera.bottom = -150;
scene.add(sun);

const CAR_DATA = {
  brio:{name:'Honda Brio RS',maxSpeed:44,accel:23,handling:2.65,width:1.68,length:3.82,height:1.49,wheelbase:2.405,color:0xf5f5f2,type:'hatch'},
  wrv:{name:'Honda WR-V RS',maxSpeed:46,accel:21,handling:2.35,width:1.78,length:4.06,height:1.61,wheelbase:2.485,color:0xf4f5f7,type:'suv'},
  hrv:{name:'Honda HR-V e:HEV',maxSpeed:48,accel:22,handling:2.28,width:1.79,length:4.35,height:1.59,wheelbase:2.610,color:0xb81f2a,type:'suvCoupe'},
  civic:{name:'Honda Civic RS',maxSpeed:53,accel:24,handling:2.48,width:1.80,length:4.68,height:1.42,wheelbase:2.735,color:0xd1d4d8,type:'sedan'},
  typer:{name:'Honda Civic Type R',maxSpeed:58,accel:27,handling:2.72,width:1.89,length:4.595,height:1.405,wheelbase:2.735,color:0xe31b2d,type:'typeR'}
};

const menu = document.querySelector('#menu');
const hud = document.querySelector('#hud');
const startBtn = document.querySelector('#startBtn');
const carSelect = document.querySelector('#carSelect');
const carStats = document.querySelector('#carStats');
const speedEl = document.querySelector('#speed');
const positionEl = document.querySelector('#position');
const lapText = document.querySelector('#lapText');
const boostBar = document.querySelector('#boostBar');
const countdownEl = document.querySelector('#countdown');
const impactEl = document.querySelector('#impact');
const result = document.querySelector('#result');
const resultTitle = document.querySelector('#resultTitle');
const resultDetail = document.querySelector('#resultDetail');
const againBtn = document.querySelector('#againBtn');
const menuBtn = document.querySelector('#menuBtn');
const mobileControls = document.querySelector('#mobileControls');
const minimap = document.querySelector('#minimap');
const mctx = minimap.getContext('2d');

const isTouch = matchMedia('(pointer: coarse)').matches;
const keys = {gas:false,brake:false,left:false,right:false,boost:false};

let player, playerBody, raceActive=false, started=false, countdown=false;
let speed=0, boost=100, lap=1, prevProgress=0, raceStartTime=0, finishTime=0;
let playerProgress=0, playerNearestIndex=0;
let aiCars=[];
let collisionCooldown=0;

const trackPoints = [
  [-15,0,-112],[42,0,-108],[88,0,-78],[105,0,-24],[96,0,34],[62,0,78],
  [13,0,104],[-45,0,99],[-89,0,66],[-108,0,16],[-100,0,-39],[-67,0,-83]
].map(p=>new THREE.Vector3(...p));
const curve = new THREE.CatmullRomCurve3(trackPoints,true,'catmullrom',.5);
const SAMPLE_COUNT=560, ROAD_HALF=9.2;
const samples=[], tangents=[], rights=[];
for(let i=0;i<SAMPLE_COUNT;i++){
  const t=i/SAMPLE_COUNT;
  const p=curve.getPointAt(t); const tan=curve.getTangentAt(t).normalize();
  const right=new THREE.Vector3(tan.z,0,-tan.x).normalize();
  samples.push(p); tangents.push(tan); rights.push(right);
}

function makeRoad(){
  const verts=[], uvs=[], idx=[];
  for(let i=0;i<SAMPLE_COUNT;i++){
    const p=samples[i], r=rights[i];
    const l=p.clone().addScaledVector(r,-ROAD_HALF), rr=p.clone().addScaledVector(r,ROAD_HALF);
    verts.push(l.x,.04,l.z, rr.x,.04,rr.z);
    uvs.push(0,i/10, 1,i/10);
  }
  for(let i=0;i<SAMPLE_COUNT;i++){
    const n=(i+1)%SAMPLE_COUNT,a=i*2,b=i*2+1,c=n*2,d=n*2+1;
    idx.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const road=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x2f3338,roughness:.92,metalness:.02}));
  road.receiveShadow=true; scene.add(road);

  const shoulderMat=new THREE.MeshStandardMaterial({color:0xb9b7aa,roughness:1});
  for(const side of [-1,1]){
    const sv=[];
    for(let i=0;i<SAMPLE_COUNT;i++){
      const p=samples[i],r=rights[i];
      const a=p.clone().addScaledVector(r,side*(ROAD_HALF+.1));
      const b=p.clone().addScaledVector(r,side*(ROAD_HALF+1.5));
      sv.push(a.x,.02,a.z,b.x,.02,b.z);
    }
    const si=[];for(let i=0;i<SAMPLE_COUNT;i++){const n=(i+1)%SAMPLE_COUNT,a=i*2,b=i*2+1,c=n*2,d=n*2+1;si.push(a,b,c,b,d,c)}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));sg.setIndex(si);sg.computeVertexNormals();
    const s=new THREE.Mesh(sg,shoulderMat);s.receiveShadow=true;scene.add(s);
  }

  // center dashed markings
  const dashGeo=new THREE.BoxGeometry(.16,.035,2.8), dashMat=new THREE.MeshStandardMaterial({color:0xf2eee2});
  for(let i=0;i<SAMPLE_COUNT;i+=12){
    const p=samples[i],t=tangents[i];const dash=new THREE.Mesh(dashGeo,dashMat);dash.position.copy(p).setY(.075);dash.rotation.y=Math.atan2(t.x,t.z);scene.add(dash);
  }
  // start line
  const start = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF*2,.04,1.4),new THREE.MeshStandardMaterial({color:0xf4f4f4}));
  start.position.copy(samples[0]).setY(.08);start.rotation.y=Math.atan2(tangents[0].x,tangents[0].z);scene.add(start);
}

function makeWorld(){
  const ground=new THREE.Mesh(new THREE.CircleGeometry(350,96),new THREE.MeshStandardMaterial({color:0x698253,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
  makeRoad();

  // Jakarta-ish skyline
  const mats=[0x9299a1,0xb8b8b2,0x77808a,0xd3d0c8].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.84}));
  for(let i=0;i<70;i++){
    const a=Math.random()*Math.PI*2,r=135+Math.random()*90;
    const w=7+Math.random()*13,d=7+Math.random()*13,h=8+Math.random()*42;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mats[i%mats.length]);
    b.position.set(Math.cos(a)*r,h/2,Math.sin(a)*r);b.castShadow=true;b.receiveShadow=true;scene.add(b);
  }
  // trees around road
  const trunkMat=new THREE.MeshStandardMaterial({color:0x6e4b2f}),leafMat=new THREE.MeshStandardMaterial({color:0x3d6d3b});
  for(let i=0;i<SAMPLE_COUNT;i+=10){
    for(const side of [-1,1]){
      if(Math.random()<.25) continue;
      const p=samples[i].clone().addScaledVector(rights[i],side*(ROAD_HALF+6+Math.random()*7));
      const tree=new THREE.Group();
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,3.1,8),trunkMat);tr.position.y=1.55;
      const crown=new THREE.Mesh(new THREE.SphereGeometry(1.8+Math.random()*.7,9,7),leafMat);crown.position.y=4.2;
      tree.add(tr,crown);tree.position.set(p.x,0,p.z);scene.add(tree);
    }
  }
  makeMonas();
}

function makeMonas(){
  const g=new THREE.Group();
  const white=new THREE.MeshStandardMaterial({color:0xf1eee5,roughness:.7});
  const gold=new THREE.MeshStandardMaterial({color:0xd9a72f,metalness:.5,roughness:.25,emissive:0x2b1600});
  const base=new THREE.Mesh(new THREE.BoxGeometry(13,3,13),white);base.position.y=1.5;
  const lower=new THREE.Mesh(new THREE.BoxGeometry(7,6,7),white);lower.position.y=6;
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.75,35,8),white);shaft.position.y=26;
  const flame=new THREE.Mesh(new THREE.SphereGeometry(2.3,12,10),gold);flame.scale.set(.72,1.45,.72);flame.position.y=45;
  g.add(base,lower,shaft,flame);g.position.set(0,0,0);g.castShadow=true;scene.add(g);
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(24,48),new THREE.MeshStandardMaterial({color:0xc8c3b7,roughness:.95}));plaza.rotation.x=-Math.PI/2;plaza.position.y=.015;scene.add(plaza);
}

makeWorld();

const aiColors=[0x2274e8,0xf3ba22,0x111111,0x30a870,0xe94f96];
function spawnRaceCars(){
  if(player) scene.remove(player);
  aiCars.forEach(a=>scene.remove(a.mesh)); aiCars=[];
  const data=CAR_DATA[carSelect.value]; player=createCarModel(data);scene.add(player);
  const startIndex=4; const p=samples[startIndex],t=tangents[startIndex],r=rights[startIndex];
  player.position.copy(p).addScaledVector(r,-2.7);player.rotation.y=Math.atan2(t.x,t.z);player.position.y=.02;
  playerBody={radius:player.userData.radius};
  for(let i=0;i<5;i++){
    const aiData=Object.values(CAR_DATA)[i%Object.values(CAR_DATA).length];
    const mesh=createCarModel(aiData,aiColors[i]);scene.add(mesh);
    const idx=(startIndex-7-Math.floor(i/2)*8+SAMPLE_COUNT)%SAMPLE_COUNT;
    const lane=i%2===0?2.7:-2.7;
    const pp=samples[idx],tt=tangents[idx],rr=rights[idx];mesh.position.copy(pp).addScaledVector(rr,lane);mesh.rotation.y=Math.atan2(tt.x,tt.z);mesh.position.y=.02;
    aiCars.push({mesh,progress:idx/SAMPLE_COUNT,speed:28+Math.random()*5,targetSpeed:31+Math.random()*7,lane,lap:1,radius:mesh.userData.radius});
  }
}

function updateStats(){const d=CAR_DATA[carSelect.value];carStats.innerHTML=`<div class="stat"><b>${Math.round(d.maxSpeed*5.2)}</b><span>TOP SPEED*</span></div><div class="stat"><b>${Math.round(d.accel)}</b><span>ACCEL</span></div><div class="stat"><b>${d.handling.toFixed(1)}</b><span>HANDLING</span></div>`}
updateStats();carSelect.addEventListener('change',()=>{updateStats();spawnRaceCars();positionCameraPreview()});
spawnRaceCars();

function positionCameraPreview(){if(!player)return;const back=new THREE.Vector3(0,3.4,-8.3).applyQuaternion(player.quaternion);camera.position.copy(player.position).add(back);camera.lookAt(player.position.clone().add(new THREE.Vector3(0,1,0)))}
positionCameraPreview();

function nearestTrackInfo(pos){
  let best=Infinity,bestI=0;
  // search window near prior index for speed
  const span=70;
  for(let o=-span;o<=span;o++){
    const i=(playerNearestIndex+o+SAMPLE_COUNT)%SAMPLE_COUNT;const d=pos.distanceToSquared(samples[i]);if(d<best){best=d;bestI=i}
  }
  playerNearestIndex=bestI;
  const p=samples[bestI],r=rights[bestI];const lateral=new THREE.Vector3().subVectors(pos,p).dot(r);
  return{index:bestI,progress:bestI/SAMPLE_COUNT,lateral,distance:Math.sqrt(best)};
}

function flashImpact(){impactEl.classList.remove('hidden');clearTimeout(flashImpact.t);flashImpact.t=setTimeout(()=>impactEl.classList.add('hidden'),260)}

function updatePlayer(dt){
  if(!player||!started)return;
  const d=CAR_DATA[carSelect.value];
  if(keys.gas) speed+=d.accel*dt; else speed-=7.5*dt;
  if(keys.brake) speed-=31*dt;
  const boosting=keys.boost&&boost>1&&speed>7;
  if(boosting){speed+=18*dt;boost-=28*dt}else boost=Math.min(100,boost+8*dt);
  speed=THREE.MathUtils.clamp(speed,-6,d.maxSpeed*(boosting?1.12:1));

  const steer=(keys.left?1:0)-(keys.right?1:0);
  const steerStrength=d.handling*dt*THREE.MathUtils.clamp(Math.abs(speed)/14,.16,1.25);
  player.rotation.y+=steer*steerStrength*(speed>=0?1:-1);
  const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));
  player.position.addScaledVector(forward,speed*dt);

  const track=nearestTrackInfo(player.position);playerProgress=track.progress;
  if(Math.abs(track.lateral)>ROAD_HALF-1.0){speed*=Math.pow(.36,dt);}
  if(Math.abs(track.lateral)>ROAD_HALF+5){
    const rescue=samples[track.index].clone().addScaledVector(rights[track.index],Math.sign(track.lateral)*(ROAD_HALF+4.6));
    const push=rescue.sub(player.position);push.y=0;player.position.addScaledVector(push,dt*4);speed*=.72;
  }

  collisionCooldown=Math.max(0,collisionCooldown-dt);
  aiCars.forEach(ai=>{
    const dx=player.position.x-ai.mesh.position.x,dz=player.position.z-ai.mesh.position.z;
    const dist=Math.hypot(dx,dz), min=playerBody.radius+ai.radius;
    if(dist<min&&dist>.001){
      const nx=dx/dist,nz=dz/dist,overlap=min-dist;
      player.position.x+=nx*overlap*.68;player.position.z+=nz*overlap*.68;
      ai.mesh.position.x-=nx*overlap*.32;ai.mesh.position.z-=nz*overlap*.32;
      speed=Math.sign(speed)*Math.min(Math.abs(speed)*.16,5.0);ai.speed*=.34;
      if(collisionCooldown<=0){flashImpact();collisionCooldown=.45}
    }
  });

  if(prevProgress>.84&&playerProgress<.16&&speed>0){lap++;if(lap>3) finishRace();}
  prevProgress=playerProgress;
}

function updateAI(dt){
  aiCars.forEach((ai,idx)=>{
    ai.speed+=(ai.targetSpeed-ai.speed)*dt*.35;
    // simple spacing / collision braking
    let brake=false;
    aiCars.forEach(other=>{if(other===ai)return;const delta=(other.progress-ai.progress+1)%1;if(delta<.025&&delta>0&&Math.abs(other.lane-ai.lane)<1.5)brake=true});
    if(brake)ai.speed=Math.max(15,ai.speed-20*dt);
    const oldProgress=ai.progress;
    ai.progress=(ai.progress+(ai.speed*dt)/(curve.getLength()))%1;
    if(oldProgress>.85&&ai.progress<.15) ai.lap++;
    const fi=ai.progress*SAMPLE_COUNT, i=Math.floor(fi)%SAMPLE_COUNT;
    const p=samples[i],t=tangents[i],r=rights[i];
    const target=p.clone().addScaledVector(r,ai.lane+Math.sin(performance.now()*.00045+idx)*.35);
    ai.mesh.position.lerp(target,.22);ai.mesh.position.y=.02;ai.mesh.rotation.y=Math.atan2(t.x,t.z);
    // AI bump player
    if(started){const dx=ai.mesh.position.x-player.position.x,dz=ai.mesh.position.z-player.position.z;const dist=Math.hypot(dx,dz),min=ai.radius+playerBody.radius;if(dist<min&&dist>.001){const nx=dx/dist,nz=dz/dist,overlap=min-dist;ai.mesh.position.x+=nx*overlap*.55;ai.mesh.position.z+=nz*overlap*.55;ai.speed*=.42}}
  });
}

function updateCamera(dt){
  if(!player)return;
  const q=player.quaternion;
  const desired=new THREE.Vector3(0,3.25,-7.7).applyQuaternion(q).add(player.position);
  const look=new THREE.Vector3(0,.95,4.2).applyQuaternion(q).add(player.position);
  camera.position.lerp(desired,1-Math.pow(.002,dt));
  const currentLook=new THREE.Vector3();camera.getWorldDirection(currentLook);camera.lookAt(look);
}

function getRacePosition(){
  const me=(lap-1)+playerProgress;let pos=1;
  aiCars.forEach(a=>{const ap=(a.lap-1)+a.progress;if(ap>me)pos++});return pos;
}

function updateHud(){speedEl.textContent=Math.max(0,Math.round(speed*5.2));boostBar.style.width=`${boost}%`;positionEl.textContent=getRacePosition();lapText.textContent=`LAP ${Math.min(lap,3)} / 3`;drawMinimap()}

function drawMinimap(){
  const w=minimap.width,h=minimap.height;mctx.clearRect(0,0,w,h);mctx.fillStyle='rgba(8,9,14,.82)';mctx.fillRect(0,0,w,h);
  const xs=samples.map(p=>p.x),zs=samples.map(p=>p.z),minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);const pad=18,scale=Math.min((w-pad*2)/(maxx-minx),(h-pad*2)/(maxz-minz));
  const conv=p=>[pad+(p.x-minx)*scale,h-pad-(p.z-minz)*scale];
  mctx.strokeStyle='#c7ccd4';mctx.lineWidth=8;mctx.lineJoin='round';mctx.beginPath();samples.forEach((p,i)=>{const [x,y]=conv(p);i?mctx.lineTo(x,y):mctx.moveTo(x,y)});mctx.closePath();mctx.stroke();
  mctx.strokeStyle='#30343c';mctx.lineWidth=4;mctx.stroke();
  // start line
  const [sx,sy]=conv(samples[0]);mctx.fillStyle='#ffffff';mctx.fillRect(sx-3,sy-3,6,6);
  aiCars.forEach(a=>{const [x,y]=conv(a.mesh.position);mctx.beginPath();mctx.fillStyle='#e9edf2';mctx.arc(x,y,3.5,0,Math.PI*2);mctx.fill()});
  if(player){const [x,y]=conv(player.position);mctx.beginPath();mctx.fillStyle='#e8192f';mctx.arc(x,y,5,0,Math.PI*2);mctx.fill();mctx.strokeStyle='#fff';mctx.lineWidth=1.5;mctx.stroke()}
}

async function beginRace(){
  spawnRaceCars();speed=0;boost=100;lap=1;prevProgress=0;playerProgress=0;playerNearestIndex=4;started=false;raceActive=true;menu.classList.add('hidden');result.classList.add('hidden');hud.classList.remove('hidden');if(isTouch)mobileControls.classList.remove('hidden');
  countdown=true;countdownEl.classList.remove('hidden');
  for(const n of ['3','2','1','GO!']){countdownEl.textContent=n;await new Promise(r=>setTimeout(r,n==='GO!'?650:780));}
  countdownEl.classList.add('hidden');countdown=false;started=true;raceStartTime=performance.now();
}
function finishRace(){if(!started)return;started=false;raceActive=false;finishTime=(performance.now()-raceStartTime)/1000;hud.classList.add('hidden');mobileControls.classList.add('hidden');result.classList.remove('hidden');const pos=getRacePosition();resultTitle.textContent=pos===1?'1ST PLACE!':'FINISH!';resultDetail.textContent=`Posisi ${pos}/6 • ${finishTime.toFixed(2)} detik • ${CAR_DATA[carSelect.value].name}`}

startBtn.addEventListener('click',beginRace);againBtn.addEventListener('click',beginRace);menuBtn.addEventListener('click',()=>{result.classList.add('hidden');menu.classList.remove('hidden');spawnRaceCars();positionCameraPreview()});

const keyMap={ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'boost',ShiftRight:'boost'};
addEventListener('keydown',e=>{const k=keyMap[e.code];if(k){keys[k]=true;e.preventDefault()}});addEventListener('keyup',e=>{const k=keyMap[e.code];if(k){keys[k]=false;e.preventDefault()}});
if(isTouch){document.querySelectorAll('[data-key]').forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off)})}

function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();

let last=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.035,(now-last)/1000);last=now;
  if(raceActive){if(started)updatePlayer(dt);updateAI(dt);updateCamera(dt);updateHud()}else if(!menu.classList.contains('hidden')){player.rotation.y+=dt*.18;positionCameraPreview()}
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
