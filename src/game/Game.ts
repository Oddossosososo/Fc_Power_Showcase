import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type Difficulty='Beginner'|'Amateur'|'Semi-Pro'|'Professional'|'World Class'|'Legendary';
export type FormationName='4-3-3'|'4-4-2'|'4-2-3-1'|'3-5-2'|'5-3-2';

type Player={team:0|1;number:number;name:string;role:'GK'|'DEF'|'MID'|'ATT';pos:THREE.Vector3;vel:THREE.Vector3;mesh:THREE.Group;ball:boolean;stamina:number;cooldown:number;face:THREE.Vector3;mixer?:THREE.AnimationMixer;idle?:THREE.AnimationAction;run?:THREE.AnimationAction};
const FIELD_X=52.5,FIELD_Z=34;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const formations:Record<FormationName,[number,number][]>={
 '4-3-3':[[-47,0],[-35,-24],[-35,24],[-10,-27],[-10,27],[0,-13],[0,13],[16,-29],[21,0],[16,29]],
 '4-4-2':[[-47,0],[-35,-25],[-35,25],[-10,-30],[-10,30],[0,-26],[0,26],[0,0],[22,-13],[22,13]],
 '4-2-3-1':[[-47,0],[-35,-25],[-35,25],[-10,-28],[-10,28],[-2,-13],[-2,13],[14,-27],[19,0],[14,27]],
 '3-5-2':[[-43,0],[-31,-24],[-31,24],[-7,-29],[-7,-10],[-7,10],[-7,29],[13,-21],[24,-11],[24,11]],
 '5-3-2':[[-43,0],[-35,-27],[-35,-9],[-35,9],[-35,27],[-8,-15],[-8,15],[10,0],[24,-12],[24,12]]
};

export class FootballGame{
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(50,1,.1,220);
 private renderer:THREE.WebGLRenderer;
 private ball!:THREE.Mesh;
 private ballVelocity=new THREE.Vector3();
 private players:Player[]=[];
 private controlled!:Player;
 private keys=new Set<string>();
 private raf=0;private last=performance.now();private match=0;private half=1;
 private score=[0,0];private event='KICK OFF';private kickoffPause=1.2;private switchCooldown=0;private goalPause=0;
 private listeners=new Set<(s:any)=>void>();private resizeObserver!:ResizeObserver;
 private formation:FormationName;private difficulty:Difficulty;private difficultyLevel=1;
 private flash!:HTMLDivElement;private powerupText='';private powerup?:{type:'SPEED'|'POWER';pos:THREE.Vector3;mesh:THREE.Mesh};
 private stats={shots:[0,0],shotsOn:[0,0],passes:[0,0],completed:[0,0]};
 private static model:{scene:THREE.Group;animations:THREE.AnimationClip[]}|null=null;
 private static loading:Promise<void>|null=null;

 constructor(private host:HTMLElement,difficulty:Difficulty='Amateur',formation:FormationName='4-3-3'){
  this.difficulty=difficulty;this.formation=formation;this.difficultyLevel=['Beginner','Amateur','Semi-Pro','Professional','World Class','Legendary'].indexOf(difficulty)+1;
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;
  host.innerHTML='';host.style.position='relative';host.style.overflow='hidden';host.appendChild(this.renderer.domElement);
  this.flash=document.createElement('div');Object.assign(this.flash.style,{position:'absolute',inset:'0',pointerEvents:'none',opacity:'0',zIndex:'10',background:'radial-gradient(circle,rgba(255,255,255,.95),transparent 65%)',transition:'opacity .1s'});host.appendChild(this.flash);
  this.buildWorld();
  FootballGame.loadPlayer(`${import.meta.env.BASE_URL}models/player.glb`).catch(()=>{}).finally(()=>this.start());
 }

 private static loadPlayer(url:string){
  if(this.model)return Promise.resolve();if(this.loading)return this.loading;
  const loader=new GLTFLoader();this.loading=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('player model timeout')),4500);loader.load(url,g=>{clearTimeout(timer);this.model={scene:g.scene,animations:g.animations};resolve()},undefined,e=>{clearTimeout(timer);reject(e)})});return this.loading;
 }

 private buildWorld(){
  this.scene.background=new THREE.Color(0x071018);
  this.scene.add(new THREE.HemisphereLight(0xdff6ff,0x07130b,2.5));
  const sun=new THREE.DirectionalLight(0xffffff,4);sun.position.set(-25,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);this.scene.add(sun);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(105,68),new THREE.MeshStandardMaterial({color:0x17683f,roughness:.92}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;this.scene.add(grass);
  for(let x=-52.5;x<52.5;x+=7){const stripe=new THREE.Mesh(new THREE.PlaneGeometry(7,68),new THREE.MeshBasicMaterial({color:0x1d7448,transparent:true,opacity:.3}));stripe.rotation.x=-Math.PI/2;stripe.position.set(x,.01,0);this.scene.add(stripe)}
  const lineMat=new THREE.LineBasicMaterial({color:0xffffff});const line=(pts:[number,number][])=>{const g=new THREE.BufferGeometry().setFromPoints(pts.map(([x,z])=>new THREE.Vector3(x,.04,z)));this.scene.add(new THREE.Line(g,lineMat))};
  line([[-52.5,-34],[52.5,-34],[52.5,34],[-52.5,34],[-52.5,-34]]);line([[0,-34],[0,34]]);line(new THREE.EllipseCurve(0,0,9.15,9.15,0,Math.PI*2).getPoints(80).map(p=>[p.x,p.y] as [number,number]));
  line([[-52.5,-20.15],[-36.5,-20.15],[-36.5,20.15],[-52.5,20.15],[-52.5,-20.15]]);line([[52.5,-20.15],[36.5,-20.15],[36.5,20.15],[52.5,20.15],[52.5,-20.15]]);
  line([[-52.5,-9.16],[-43.35,-9.16],[-43.35,9.16],[-52.5,9.16]]);line([[52.5,-9.16],[43.35,-9.16],[43.35,9.16],[52.5,9.16]]);
  this.makeGoals();this.makeCrowd();
  this.ball=new THREE.Mesh(new THREE.SphereGeometry(.72,20,14),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3}));this.ball.castShadow=true;this.scene.add(this.ball);
 }

 private makeGoals(){for(const x of[-FIELD_X,FIELD_X]){const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.4});for(const z of[-7.32,7.32]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,5.5,10),mat);p.position.set(x,2.75,z);p.castShadow=true;this.scene.add(p)}const bar=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,14.64,10),mat);bar.rotation.x=Math.PI/2;bar.position.set(x,5.5,0);this.scene.add(bar);const net=new THREE.Mesh(new THREE.BoxGeometry(5.5,5,14.5),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.16}));net.position.set(x+(x>0?2.75:-2.75),2.5,0);this.scene.add(net)}}
 private makeCrowd(){const mat=new THREE.MeshStandardMaterial({color:0x252b35,roughness:.9});for(const z of[-45,45]){const stand=new THREE.Mesh(new THREE.BoxGeometry(130,8,16),mat);stand.position.set(0,4,z);this.scene.add(stand);for(let i=0;i<90;i++){const fan=new THREE.Mesh(new THREE.SphereGeometry(.45,6,5),new THREE.MeshBasicMaterial({color:[0xffffff,0x4da3ff,0xffd34e][i%3]}));fan.position.set(-49+(i%30)*3.4,8+(Math.floor(i/30)%2)*1.3,z+(z>0?-5:5));this.scene.add(fan)}}}

 private start(){this.spawnTeams();this.resetKickoff(0);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.host);this.resize();window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);this.raf=requestAnimationFrame(this.loop)}
 private spawnTeams(){for(const team of[0,1] as const){this.players.push(this.createPlayer(team,0,'GK','GK'));for(let n=1;n<=10;n++){const role=n<=4?'DEF':n<=7?'MID':'ATT';this.players.push(this.createPlayer(team,n,role,`${team?'RED':'BLUE'} ${n}`))}}this.controlled=this.players.find(p=>p.team===0&&p.role==='ATT')!}
 private createPlayer(team:0|1,number:number,role:Player['role'],name:string):Player{const g=new THREE.Group();let mixer:THREE.AnimationMixer|undefined,idle:THREE.AnimationAction|undefined,run:THREE.AnimationAction|undefined;
  if(FootballGame.model){const clone=SkeletonUtils.clone(FootballGame.model.scene) as THREE.Group;clone.scale.setScalar(.82);clone.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map((m:any)=>{const q=m.clone();if(q.color&&/jersey|shirt|cloth/i.test(q.name||m.name||''))q.color.set(team?0xd52e49:0x1977ff);return q})}});g.add(clone);mixer=new THREE.AnimationMixer(clone);const a=FootballGame.model.animations.find(x=>/idle/i.test(x.name));const r=FootballGame.model.animations.find(x=>/run|walk/i.test(x.name));if(a){idle=mixer.clipAction(a);idle.play()}if(r){run=mixer.clipAction(r)}}else{this.fallbackModel(g,team)}
  this.scene.add(g);return{team,number,name,role,pos:new THREE.Vector3(),vel:new THREE.Vector3(),mesh:g,ball:false,stamina:100,cooldown:0,face:new THREE.Vector3(team? -1:1,0,0),mixer,idle,run}}
 private fallbackModel(g:THREE.Group,team:0|1){const kit=new THREE.MeshStandardMaterial({color:team?0xd52e49:0x1977ff,roughness:.6}),skin=new THREE.MeshStandardMaterial({color:0xc98a6d}),dark=new THREE.MeshStandardMaterial({color:0x15181d});const body=new THREE.Mesh(new THREE.CapsuleGeometry(1.05,2.2,6,10),kit);body.position.y=2.9;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.9,12,10),skin);head.position.y=5.9;g.add(head);for(const x of[-.5,.5]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.3,1.8,5,8),dark);leg.position.set(x,.35,0);g.add(leg)}g.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true})}

 private resetKickoff(team:0|1){this.ball.position.set(0,.72,0);this.ballVelocity.set(0,0,0);this.kickoffPause=1.15;this.goalPause=0;this.event='KICK OFF';const spots=formations[this.formation];for(const p of this.players){p.ball=false;p.vel.set(0,0,0);if(p.number===0)p.pos.set(p.team?FIELD_X-3:-FIELD_X+3,0,0);else{const [x,z]=spots[p.number-1];p.pos.set((p.team?1:-1)*x,0,z)}p.mesh.position.copy(p.pos)}const k=this.players.find(p=>p.team===team&&p.role==='ATT')!;k.ball=true;this.controlled=this.players.find(p=>p.team===0&&p.role==='ATT')!;this.powerupText=''}

 private keyDown=(e:KeyboardEvent)=>{const k=e.key.toLowerCase(),map:Record<string,string>={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};if(['w','a','s','d',' ','shift','j','k','l','o','p'].includes(map[k]||k))e.preventDefault();this.keys.add(map[k]||k)};
 private keyUp=(e:KeyboardEvent)=>{const k=e.key.toLowerCase(),map:Record<string,string>={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};this.keys.delete(map[k]||k)};

 private loop=(now:number)=>{const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.update(dt);this.render();this.raf=requestAnimationFrame(this.loop)};
 private update(dt:number){
  if(this.goalPause>0){this.goalPause-=dt;this.updateCamera(dt);this.emit();return}
  if(this.kickoffPause>0){this.kickoffPause-=dt;this.updateCamera(dt);this.emit();return}
  this.match+=dt*1.8;
  if(this.match>=45){if(this.half===1){this.half=2;this.match=45;this.event='HALFTIME';this.resetKickoff(1);this.half=2}else{this.match=90;this.event='FULL TIME';this.goalPause=999;this.emit();return}}
  this.updatePlayer(dt);this.updateAI(dt);this.updateBall(dt);this.checkGoals();this.spawnPowerup(dt);this.collectPowerup();this.updateCamera(dt);this.emit();
 }

 private updatePlayer(dt:number){const p=this.controlled;if(p.ball){this.ball.position.set(p.pos.x+p.face.x*1.15,.72,p.pos.z+p.face.z*1.15)}const x=(this.keys.has('d')?1:0)-(this.keys.has('a')?1:0),z=(this.keys.has('s')?1:0)-(this.keys.has('w')?1:0);const sprint=this.keys.has('shift')&&p.stamina>1;const speed=sprint?10:6.2;if(x||z){const v=new THREE.Vector3(x,0,z).normalize();p.vel.lerp(v.multiplyScalar(speed),Math.min(1,dt*12));p.face.lerp(v,Math.min(1,dt*10));if(sprint)p.stamina=clamp(p.stamina-dt*17,0,100)}else{p.vel.multiplyScalar(Math.max(0,1-dt*9));p.stamina=clamp(p.stamina+dt*8,0,100)}p.pos.addScaledVector(p.vel,dt);p.pos.x=clamp(p.pos.x,-FIELD_X+1,FIELD_X-1);p.pos.z=clamp(p.pos.z,-FIELD_Z+1,FIELD_Z-1);p.mesh.position.copy(p.pos);this.animate(p,dt);
  if(this.keys.has(' ')&&this.switchCooldown<=0){this.switchPlayer();this.switchCooldown=.25}
  this.switchCooldown=Math.max(0,this.switchCooldown-dt);
  if(p.ball){if(this.keys.has('j'))this.pass(false);else if(this.keys.has('k'))this.pass(true);else if(this.keys.has('l'))this.shoot(false);else if(this.keys.has('p'))this.shoot(true)}
  if(this.keys.has('o')&&p.cooldown<=0){this.tackle();p.cooldown=.55}p.cooldown=Math.max(0,p.cooldown-dt);
 }
 private updateAI(dt:number){for(const p of this.players){if(p===this.controlled)continue;let target=new THREE.Vector3(p.team?FIELD_X*.45:-FIELD_X*.45,0,0);const dist=p.pos.distanceTo(this.ball.position);const own=p.ball;const attack=p.team===this.ballOwnerTeam();
   if(own){target.set(p.team?FIELD_X-8:-FIELD_X+8,0,this.ball.position.z*.55);if(Math.abs(this.ball.position.x)>28&&Math.random()<dt*.7)this.passAI(p)}
   else if(dist<13||this.closestToBall(p)){target.copy(this.ball.position)}
   else {const spots=formations[this.formation];const [x,z]=p.number?spots[p.number-1]:[p.team?49:-49,0];target.set((p.team?1:-1)*x+(this.ball.position.x-(p.team?1:-1)*x)*.22,0,z+(this.ball.position.z-z)*.12)}
   const dir=target.clone().sub(p.pos);dir.y=0;const d=dir.length();if(d>.7){dir.normalize();const speed=(own?5.8:4.5)+(this.difficultyLevel-1)*.25;p.vel.lerp(dir.multiplyScalar(speed),Math.min(1,dt*5));p.face.lerp(dir,Math.min(1,dt*5));p.pos.addScaledVector(p.vel,dt)}else p.vel.multiplyScalar(Math.max(0,1-dt*7));p.pos.x=clamp(p.pos.x,-FIELD_X+1,FIELD_X-1);p.pos.z=clamp(p.pos.z,-FIELD_Z+1,FIELD_Z-1);p.mesh.position.copy(p.pos);this.animate(p,dt);p.stamina=clamp(p.stamina+dt*5,0,100);
   if(p.ball){this.ball.position.set(p.pos.x+p.face.x*1.15,.72,p.pos.z+p.face.z*1.15);if(p.role==='ATT'&&p.pos.x*(p.team?1:-1)>30&&Math.random()<dt*(.25+this.difficultyLevel*.04))this.shootAI(p)}
  }
  this.resolvePossession();
 }
 private closestToBall(p:Player){let best=Infinity;for(const q of this.players)if(q.team===p.team)best=Math.min(best,q.pos.distanceTo(this.ball.position));return p.pos.distanceTo(this.ball.position)<=best+.05}
 private ballOwnerTeam(){const p=this.players.find(x=>x.ball);return p?p.team:-1}
 private resolvePossession(){const owner=this.players.find(p=>p.ball);if(owner)return;let best:Player|undefined,bd=2.1;for(const p of this.players){const d=p.pos.distanceTo(this.ball.position);if(d<bd){bd=d;best=p}}if(best){best.ball=true;this.event=best.team===0?'BLUE WIN POSSESSION':'RED WIN POSSESSION'}}

 private pass(through:boolean){const p=this.controlled;if(!p.ball)return;const mates=this.players.filter(x=>x.team===p.team&&x!==p);let best=mates[0],score=-Infinity;for(const q of mates){const ahead=(q.pos.x-p.pos.x)*(p.team===0?1:-1);const d=p.pos.distanceTo(q.pos);const s=ahead*.7-d*.25+(q.role==='ATT'?5:0);if(s>score){score=s;best=q}}if(!best)return;const dir=best.pos.clone().sub(p.pos);dir.y=0;dir.normalize();this.ballVelocity.copy(dir.multiplyScalar(through?15:11));if(through)this.ballVelocity.x+=(p.team? -1:1)*2;p.ball=false;this.stats.passes[p.team]++;this.event=through?'THROUGH BALL':'PASS';p.cooldown=.25}
 private passAI(p:Player){const mates=this.players.filter(x=>x.team===p.team&&x!==p);if(!mates.length)return;const q=mates[Math.floor(Math.random()*mates.length)];const d=q.pos.clone().sub(p.pos).setY(0).normalize();p.ball=false;this.ballVelocity.copy(d.multiplyScalar(10));this.stats.passes[p.team]++}
 private shoot(chip:boolean){const p=this.controlled;if(!p.ball)return;const goalX=p.team===0?FIELD_X:-FIELD_X;const target=new THREE.Vector3(goalX,0,(Math.random()-.5)*10);const dir=target.sub(p.pos).setY(0).normalize();const power=chip?14:19;this.ballVelocity.copy(dir.multiplyScalar(power));if(chip)this.ballVelocity.y=7;p.ball=false;this.stats.shots[p.team]++;this.event=chip?'CHIP SHOT':'SHOT';p.cooldown=.4}
 private shootAI(p:Player){const goalX=p.team===0?FIELD_X:-FIELD_X;const dir=new THREE.Vector3(goalX-p.pos.x,0,(Math.random()-.5)*7-p.pos.z).normalize();p.ball=false;this.ballVelocity.copy(dir.multiplyScalar(15+this.difficultyLevel*.6));this.stats.shots[p.team]++;this.event='RED SHOT'}
 private tackle(){const p=this.controlled;if(p.ball)return;let victim:Player|undefined,bd=3;for(const q of this.players)if(q.team!==p.team){const d=p.pos.distanceTo(q.pos);if(d<bd){bd=d;victim=q}}if(victim){victim.ball=false;this.ball.position.copy(p.pos).add(new THREE.Vector3(p.face.x,0,p.face.z));this.event='TACKLE WIN';p.ball=true}}

 private updateBall(dt:number){const owner=this.players.find(p=>p.ball);if(owner)return;this.ball.position.addScaledVector(this.ballVelocity,dt);this.ballVelocity.multiplyScalar(Math.max(0,1-dt*1.7));if(this.ball.position.y>0.72){this.ballVelocity.y-=18*dt;this.ball.position.y=Math.max(.72,this.ball.position.y)}else this.ballVelocity.y=0;if(this.ball.position.z<-FIELD_Z+.7||this.ball.position.z>FIELD_Z-.7){this.ball.position.z=clamp(this.ball.position.z,-FIELD_Z+.7,FIELD_Z-.7);this.ballVelocity.z*=-.65}this.resolvePossession()}
 private checkGoals(){if(this.goalPause>0)return;if(Math.abs(this.ball.position.x)>FIELD_X+.5&&Math.abs(this.ball.position.z)<7.4){const team=this.ball.position.x>0?0:1;this.score[team]++;this.event=team===0?'⚽ BLUE GOAL!':'⚽ RED GOAL!';this.flash.style.opacity='1';setTimeout(()=>{if(this.flash)this.flash.style.opacity='0'},130);this.goalPause=2.2;this.ballVelocity.set(0,0,0);setTimeout(()=>{if(this.goalPause>0&&this.half<3)this.resetKickoff((team?0:1) as 0|1)},900)}}

 private spawnPowerup(dt:number){if(this.powerup||Math.floor(this.match)%15!==0||Math.floor((this.match-dt*1.8)/15)===Math.floor(this.match/15))return;const type=Math.random()<.5?'SPEED':'POWER';const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(1.05),new THREE.MeshBasicMaterial({color:type==='SPEED'?0x55eaff:0xffcf33}));mesh.position.set((Math.random()-.5)*70,1,(Math.random()-.5)*45);this.scene.add(mesh);this.powerup={type,pos:mesh.position.clone(),mesh};}
 private collectPowerup(){if(!this.powerup)return;this.powerup.mesh.rotation.y+=.04;const p=this.players.find(x=>x.ball&&x.team===0);if(p&&p.pos.distanceTo(this.powerup.pos)<2.5){this.powerupText=this.powerup.type==='SPEED'?'SPEED BOOST':'SUPER KICK';if(this.powerup.type==='SPEED')p.stamina=100;this.powerup.mesh.removeFromParent();this.powerup=undefined}}

 private switchPlayer(){const candidates=this.players.filter(p=>p.team===0&&!p.ball);if(!candidates.length)return;let best=candidates[0],score=Infinity;for(const p of candidates){const d=p.pos.distanceTo(this.ball.position);const danger=Math.abs(p.pos.x-this.ball.position.x);const s=d-danger*.15;if(s<score){score=s;best=p}}this.controlled=best;this.event=`CONTROL: ${best.name}`}
 private animate(p:Player,dt:number){p.mixer?.update(dt);const moving=p.vel.length()>.35;if(moving){p.run?.setEffectiveWeight(1);p.idle?.setEffectiveWeight(0)}else{p.run?.setEffectiveWeight(0);p.idle?.setEffectiveWeight(1)}if(moving)p.mesh.rotation.y=Math.atan2(p.vel.x,p.vel.z)}

 private updateCamera(dt:number){const p=this.controlled||this.players[0];if(!p)return;const target=new THREE.Vector3(p.pos.x*.55,0,p.pos.z*.4);this.camera.position.lerp(new THREE.Vector3(p.pos.x*.35,58,p.pos.z+55),Math.min(1,dt*4));this.camera.lookAt(target)}
 private resize(){const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
 private render(){this.renderer.render(this.scene,this.camera)}

 private emit(){const m=Math.min(90,Math.floor(this.match));this.listeners.forEach(fn=>fn({score:[...this.score],time:`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,half:this.half,player:this.controlled?.name||'',stamina:Math.round(this.controlled?.stamina||100),event:this.event,shots:[...this.stats.shots],shotsOn:[...this.stats.shotsOn],passes:[...this.stats.passes],completed:[...this.stats.completed],poss:this.possession(),powerup:this.powerupText}))}
 private possession(){let a=0,b=0;for(const p of this.players){if(p.ball)p.team===0?a++:b++}if(!a&&!b)return[50,50];const total=a+b;return[Math.round(a/total*100),Math.round(b/total*100)]}
 onState(fn:(s:any)=>void){this.listeners.add(fn);fn({score:[...this.score],time:'00:00',half:1,player:this.controlled?.name||'',stamina:100,event:this.event,shots:[0,0],shotsOn:[0,0],passes:[0,0],completed:[0,0],poss:[50,50],powerup:''});return()=>this.listeners.delete(fn)}
 destroy(){cancelAnimationFrame(this.raf);window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);this.resizeObserver?.disconnect();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}});this.renderer.dispose();this.listeners.clear()}
}
