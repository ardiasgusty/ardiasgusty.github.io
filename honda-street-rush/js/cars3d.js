import * as THREE from 'three';

const tmpCanvas = document.createElement('canvas');

function materials(color) {
  return {
    body: new THREE.MeshPhysicalMaterial({
      color, metalness: .2, roughness: .28, clearcoat: .95, clearcoatRoughness: .14
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: .34, metalness: .14 }),
    blackSoft: new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: .65, metalness: .04 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x182939, roughness: .12, metalness: .06, transparent: true, opacity: .88,
      transmission: .04, clearcoat: .35
    }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: .22, metalness: .85 }),
    light: new THREE.MeshStandardMaterial({ color: 0xf1fbff, emissive: 0xc4e8ff, emissiveIntensity: 1.1, roughness: .18 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xd20b22, emissive: 0x6d0010, emissiveIntensity: .85, roughness: .25 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xff7f19, emissive: 0x8a2b00, emissiveIntensity: .5 }),
    redAccent: new THREE.MeshStandardMaterial({ color: 0xc91426, roughness: .3, metalness: .15 }),
  };
}

function superellipse(theta, halfW, cy, ry, n = 4.2) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * halfW;
  const py = cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
  return [px, py];
}

function makeLoft(sections, material, ringSegments = 14, exponent = 4.2) {
  const positions = [], indices = [];
  for (const sec of sections) {
    for (let j = 0; j < ringSegments; j++) {
      const th = j / ringSegments * Math.PI * 2;
      const [x, y] = superellipse(th, sec.w, sec.cy, sec.ry, exponent);
      positions.push(x, y, sec.z);
    }
  }
  for (let i = 0; i < sections.length - 1; i++) {
    for (let j = 0; j < ringSegments; j++) {
      const nj = (j + 1) % ringSegments;
      const a = i * ringSegments + j;
      const b = i * ringSegments + nj;
      const c = (i + 1) * ringSegments + j;
      const d = (i + 1) * ringSegments + nj;
      indices.push(a, c, b, b, c, d);
    }
  }
  // caps
  const frontCenter = positions.length / 3;
  positions.push(0, sections[0].cy, sections[0].z);
  const rearCenter = positions.length / 3;
  const last = sections.length - 1;
  positions.push(0, sections[last].cy, sections[last].z);
  for (let j = 0; j < ringSegments; j++) {
    const nj = (j + 1) % ringSegments;
    indices.push(frontCenter, nj, j);
    const a = last * ringSegments + j, b = last * ringSegments + nj;
    indices.push(rearCenter, a, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function cylinder(r, depth, mat, x, y, z, rotZ = Math.PI / 2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 24), mat);
  m.position.set(x, y, z); m.rotation.z = rotZ; m.castShadow = true; return m;
}

function makeWheel(radius, width, mats, sporty = false, brakeRed = false) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), mats.black);
  tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const rimRadius = radius * .66;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.035, sporty ? 12 : 10), mats.chrome);
  rim.rotation.z = Math.PI / 2; g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .16, radius * .16, width * 1.06, 18), mats.black);
  hub.rotation.z = Math.PI / 2; g.add(hub);
  if (brakeRed) {
    const caliper = box(width * 1.12, radius * .42, radius * .18, mats.redAccent, 0, radius * .12, radius * .25);
    g.add(caliper);
  }
  return g;
}

function addWheels(group, data, mats, { radius = .31, sporty = false, brakeRed = false } = {}) {
  const halfW = data.width / 2;
  const wb = data.wheelbase || data.length * .62;
  const frontZ = wb / 2, rearZ = -wb / 2;
  const y = radius + .045;
  for (const [x, z] of [[-halfW * .98, frontZ], [halfW * .98, frontZ], [-halfW * .98, rearZ], [halfW * .98, rearZ]]) {
    const w = makeWheel(radius, .22, mats, sporty, brakeRed);
    w.position.set(x, y, z); group.add(w);
  }
}

function makePlate(text, accent = '') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 144;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111318'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#3a3e45'; ctx.lineWidth = 8; ctx.strokeRect(5, 5, c.width - 10, c.height - 10);
  ctx.font = '900 70px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f7f7f7';
  ctx.fillText(text, c.width / 2, c.height / 2 - (accent ? 14 : 0));
  if (accent) { ctx.font = '900 34px Arial'; ctx.fillStyle = '#ef1b2f'; ctx.fillText(accent, c.width / 2, c.height - 31); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(.78, .22), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

function makeHBadge(red = false) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = red ? '#d7192d' : '#e9eef3'; ctx.lineWidth = 18;
  ctx.strokeRect(47, 36, 162, 184);
  ctx.font = '900 150px Arial Black, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = red ? '#d7192d' : '#e9eef3'; ctx.fillText('H', 128, 132);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
}

function addFrontIdentity(group, mats, data, cfg) {
  const z = data.length / 2 + .012;
  if (cfg.grille) {
    const grille = box(cfg.grille.w, cfg.grille.h, .055, mats.black, 0, cfg.grille.y, z);
    group.add(grille);
  }
  if (cfg.lowerGrille) group.add(box(cfg.lowerGrille.w, cfg.lowerGrille.h, .06, mats.black, 0, cfg.lowerGrille.y, z + .006));
  if (cfg.headlights) {
    for (const side of [-1, 1]) {
      const h = box(cfg.headlights.w, cfg.headlights.h, .055, mats.light, side * cfg.headlights.x, cfg.headlights.y, z + .012, 0, 0, side * (cfg.headlights.slant || 0));
      group.add(h);
    }
  }
  const badge = makeHBadge(!!cfg.redBadge); badge.position.set(0, cfg.badgeY || .65, z + .045); group.add(badge);
  if (cfg.plate) { const p = makePlate(cfg.plate.text, cfg.plate.accent || ''); p.position.set(0, cfg.plate.y, z + .052); group.add(p); }
}

function addRearPlate(group, data, text, accent = '') {
  const p = makePlate(text, accent); p.position.set(0, .59, -data.length / 2 - .04); p.rotation.y = Math.PI; group.add(p);
}

function createBrioRS(data, color) {
  const mats = materials(color); const g = new THREE.Group(); const L = data.length, W = data.width;
  const body = makeLoft([
    { z:L*.50,w:W*.40,cy:.55,ry:.27 }, { z:L*.45,w:W*.49,cy:.56,ry:.29 },
    { z:L*.25,w:W*.50,cy:.58,ry:.31 }, { z:-L*.24,w:W*.50,cy:.59,ry:.31 },
    { z:-L*.44,w:W*.47,cy:.60,ry:.30 }, { z:-L*.50,w:W*.41,cy:.58,ry:.27 }
  ], mats.body, 16, 4.5); g.add(body);
  const cabin = makeLoft([
    { z:L*.18,w:W*.35,cy:1.02,ry:.31 }, { z:L*.05,w:W*.40,cy:1.08,ry:.38 },
    { z:-L*.25,w:W*.42,cy:1.09,ry:.39 }, { z:-L*.37,w:W*.39,cy:1.02,ry:.34 }
  ], mats.glass, 16, 3.8); g.add(cabin);
  // black roof + pillars / sporty two-tone cue
  g.add(box(W*.69,.075,L*.35,mats.black,0,1.43,-.25,0,0,0));
  g.add(box(.08,.56,.10,mats.black,-W*.40,1.05,L*.06,0,0,-.10));
  g.add(box(.08,.56,.10,mats.black,W*.40,1.05,L*.06,0,0,.10));
  addFrontIdentity(g,mats,data,{grille:{w:W*.70,h:.23,y:.64},lowerGrille:{w:W*.78,h:.18,y:.38},headlights:{w:.50,h:.16,x:W*.30,y:.76,slant:.08},badgeY:.65,plate:{text:'BRIO',accent:'RS',y:.43}});
  // dark-chrome upper grille bar
  g.add(box(W*.63,.045,.06,mats.chrome,0,.73,L/2+.04));
  // LED fog lights in RS bumper
  for (const side of [-1,1]) { const fog = new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.035,20),mats.light); fog.rotation.x=Math.PI/2; fog.position.set(side*W*.36,.39,L/2+.055); g.add(fog); }
  // mirrors
  for (const side of [-1,1]) g.add(box(.18,.13,.26,mats.black,side*W*.55,1.05,L*.09,0,0,0));
  // tail lamps and spoiler
  for (const side of [-1,1]) g.add(box(.30,.30,.065,mats.tail,side*W*.36,.78,-L/2-.01,0,0,side*.04));
  g.add(box(W*.61,.075,.27,mats.black,0,1.34,-L*.46,0,0,0));
  g.add(box(W*.77,.11,.10,mats.blackSoft,0,.36,-L/2-.005));
  addRearPlate(g,data,'BRIO','RS');
  addWheels(g,data,mats,{radius:.30,sporty:true});
  g.userData.radius=Math.max(W*.55,L*.28); g.userData.model='Honda Brio RS'; return g;
}

function createHRVEHEV(data, color) {
  const mats = materials(color); const g = new THREE.Group(); const L=data.length,W=data.width;
  g.add(makeLoft([
    {z:L*.50,w:W*.40,cy:.60,ry:.29},{z:L*.44,w:W*.49,cy:.61,ry:.32},
    {z:L*.20,w:W*.50,cy:.65,ry:.36},{z:-L*.30,w:W*.50,cy:.67,ry:.36},
    {z:-L*.45,w:W*.48,cy:.66,ry:.34},{z:-L*.50,w:W*.42,cy:.63,ry:.30}
  ],mats.body,16,4.7));
  g.add(makeLoft([
    {z:L*.20,w:W*.36,cy:1.12,ry:.35},{z:L*.04,w:W*.43,cy:1.18,ry:.42},
    {z:-L*.23,w:W*.44,cy:1.18,ry:.42},{z:-L*.39,w:W*.39,cy:1.10,ry:.35}
  ],mats.glass,16,3.9));
  // roof / cladding
  g.add(box(W*.72,.075,L*.39,mats.black,0,1.55,-.28));
  g.add(box(W*1.01,.16,L*.79,mats.blackSoft,0,.31,0));
  // grille with horizontal slats and very slim headlamps
  addFrontIdentity(g,mats,data,{grille:{w:W*.67,h:.32,y:.62},lowerGrille:{w:W*.74,h:.12,y:.37},headlights:{w:.53,h:.085,x:W*.31,y:.84,slant:.03},badgeY:.66,plate:{text:'HR-V',accent:'e:HEV',y:.43}});
  for(let i=0;i<5;i++) g.add(box(W*.60,.016,.062,mats.chrome,0,.53+i*.055,L/2+.043));
  // mirrors and subtle rear handle cue
  for(const side of [-1,1]) g.add(box(.20,.14,.29,mats.body,side*W*.55,1.13,L*.08));
  // full-width rear light strip + corner lamps
  g.add(box(W*.70,.055,.055,mats.tail,0,.93,-L/2-.028));
  for (const side of [-1,1]) g.add(box(.33,.17,.065,mats.tail,side*W*.36,.88,-L/2-.02,0,0,side*.03));
  addRearPlate(g,data,'HR-V','e:HEV');
  addWheels(g,data,mats,{radius:.34,sporty:true});
  g.userData.radius=Math.max(W*.55,L*.28); g.userData.model='Honda HR-V e:HEV'; return g;
}

function createCivicTypeR(data, color) {
  const mats=materials(color); const g=new THREE.Group(); const L=data.length,W=data.width;
  // FL5-like long, clean body instead of the older ultra-angular FK8 look
  g.add(makeLoft([
    {z:L*.50,w:W*.39,cy:.50,ry:.24},{z:L*.44,w:W*.49,cy:.51,ry:.27},
    {z:L*.25,w:W*.50,cy:.54,ry:.29},{z:-L*.30,w:W*.50,cy:.56,ry:.29},
    {z:-L*.45,w:W*.48,cy:.56,ry:.28},{z:-L*.50,w:W*.42,cy:.53,ry:.25}
  ],mats.body,18,5.0));
  g.add(makeLoft([
    {z:L*.18,w:W*.35,cy:.96,ry:.30},{z:L*.02,w:W*.42,cy:1.02,ry:.36},
    {z:-L*.24,w:W*.43,cy:1.03,ry:.36},{z:-L*.38,w:W*.39,cy:.97,ry:.31}
  ],mats.glass,18,4.1));
  // roof and side skirts
  g.add(box(W*.70,.065,L*.36,mats.body,0,1.34,-.26));
  g.add(box(W*.96,.08,L*.73,mats.black,0,.265,0));
  addFrontIdentity(g,mats,data,{grille:{w:W*.68,h:.21,y:.61},lowerGrille:{w:W*.80,h:.20,y:.38},headlights:{w:.55,h:.09,x:W*.31,y:.75,slant:.035},redBadge:true,badgeY:.62,plate:{text:'TYPE',accent:'R',y:.40}});
  // hood vent
  g.add(box(W*.29,.025,.33,mats.black,0,.81,L*.25,-.04,0,0));
  // side intake accents
  for(const side of [-1,1]) g.add(box(.22,.23,.06,mats.black,side*W*.39,.43,L/2+.015,0,0,0));
  // mirrors
  for(const side of [-1,1]) g.add(box(.20,.13,.30,mats.body,side*W*.55,1.02,L*.08));
  // FL5-style large but clean rear wing
  const wing=box(W*.82,.065,.22,mats.black,0,1.35,-L*.40,0,0,0); g.add(wing);
  for(const side of [-1,1]) g.add(box(.055,.31,.10,mats.black,side*W*.30,1.17,-L*.37,0,0,side*.05));
  // tail lights
  for(const side of [-1,1]) g.add(box(.43,.13,.065,mats.tail,side*W*.31,.76,-L/2-.02,0,0,side*.03));
  // triple centre exhaust
  for(const x of [-.17,0,.17]) { const ex=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.16,18),mats.chrome); ex.rotation.x=Math.PI/2; ex.position.set(x,.31,-L/2-.09); g.add(ex); }
  g.add(box(W*.82,.12,.11,mats.black,0,.34,-L/2-.02));
  addRearPlate(g,data,'TYPE','R');
  addWheels(g,data,mats,{radius:.34,sporty:true,brakeRed:true});
  g.userData.radius=Math.max(W*.55,L*.28); g.userData.model='Honda Civic Type R'; return g;
}

function createGeneric(data, color) {
  const mats=materials(color); const g=new THREE.Group(); const L=data.length,W=data.width;
  const suv=data.type==='suv'; const sedan=data.type==='sedan';
  g.add(makeLoft([
    {z:L*.50,w:W*.40,cy:.55,ry:.27},{z:L*.43,w:W*.49,cy:.57,ry:.30},
    {z:L*.22,w:W*.50,cy:.60,ry:.31},{z:-L*.30,w:W*.50,cy:.61,ry:.31},
    {z:-L*.50,w:W*.42,cy:.58,ry:.27}
  ],mats.body,14,4.4));
  g.add(makeLoft([
    {z:L*.15,w:W*.34,cy:suv?1.08:.98,ry:suv?.37:.31},{z:0,w:W*.41,cy:suv?1.14:1.04,ry:suv?.42:.36},
    {z:-L*.28,w:W*.42,cy:suv?1.14:1.04,ry:suv?.42:.36},{z:-L*.39,w:W*.37,cy:suv?1.07:.98,ry:suv?.34:.29}
  ],mats.glass,14,4));
  addFrontIdentity(g,mats,data,{grille:{w:W*.65,h:.22,y:.62},headlights:{w:.48,h:.11,x:W*.30,y:.75},badgeY:.64,plate:{text:data.type==='sedan'?'CIVIC':'WR-V',accent:data.type==='sedan'?'RS':'RS',y:.42}});
  addRearPlate(g,data,data.type==='sedan'?'CIVIC':'WR-V','RS'); addWheels(g,data,mats,{radius:suv?.33:.32,sporty:true});
  if(suv) g.add(box(W*1.01,.15,L*.72,mats.blackSoft,0,.30,0));
  g.userData.radius=Math.max(W*.55,L*.28); return g;
}

export function createCarModel(data, colorOverride) {
  const color=colorOverride ?? data.color;
  if(data.type==='hatch') return createBrioRS(data,color);
  if(data.type==='suvCoupe') return createHRVEHEV(data,color);
  if(data.type==='typeR') return createCivicTypeR(data,color);
  return createGeneric(data,color);
}
