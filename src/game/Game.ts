import * as THREE from 'three';

export type Difficulty='Beginner'|'Amateur'|'Semi-Pro'|'Professional'|'World Class'|'Legendary';
export type FormationName='4-3-3'|'4-4-2'|'4-2-3-1'|'3-5-2'|'5-3-2';
type PowerType='SPEED BOOST'|'SUPER KICK';
type P={team:number;n:number;name:string;role:string;ovr:number;pos:THREE.Vector3;vel:THREE.Vector3;mesh:THREE.Group;ball:boolean;stamina:number;speedBoost:number;superKick:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const FORM:Record<FormationName,number[][]>={
 '4-3-3':[[-5,0],[-3.5,-2.4],[-3.5,2.4],[-1.2,-3],[-1.2,3],[0,-1.4],[0,1.4],[1.5,-3.2],[2.2,0],[1.5,3]],
 '4-4-2':[[-5,0],[-3.5,-2.5],[-3.5,2.5],[-1,-3.1],[-1,3.1],[0,-3],[0,3],[0,0],[2.4,-1.6],[2.4,1.6]],
 '4-2-3-1':[[-5,0],[-3.5,-2.5],[-3.5,2.5],[-1,-3.1],[-1,3.1],[-.2,-1.5],[-.2,1.5],[1.4,-3],[1.8,0],[1.4,3]],
 '3-5-2':[[-5,0],[-3.3,-2.5],[-3.3,2.5],[-2,0],[-.5,-3.2],[-.5,-1.2],[-.5,1.2],[-.5,3.2],[1.3,-2],[2.5,-1.1],[2.5,1.1]],
 '5-3-2':[[-5,0],[-3.5,-2.8],[-3.5,-1],[-3.5,1],[-3.5,2.8],[-.5,-1.8],[-.5,1.8],[.3,0],[1.8,-1.5],[2.8,-1.2],[2.8,1.2]]
};

export class FootballGame{
 private scene=new THREE.Scene();
 private camera=new THREE.PerspectiveCamera(55,1,.1,100);
 private renderer:THREE.WebGLRenderer;
 private ball!:THREE.Mesh;
 private bv=new THREE.Vector3();
 private players:P[]=[];
 private controlled!:P;
 private keys=new Set<string>();
 private raf=0; private last=performance.now(); private t=0; private match=0; private half=1;
 private score=[0,0]; private event='KICK OFF'; private cooldown=0; private goalCooldown=0;
 private listeners=new Set<(s:any)=>void>(); private ro:ResizeObserver; private form:FormationName; private diff:Difficulty;
 private stats={shots:[0,0],shotsOn:[0,0],passes:[0,0],completed:[0,0],poss:[50,50]};
 private flash!:HTMLDivElement;
 private shake=0;
 private audio?:AudioContext;
 private powerup:THREE.Group|null=null;
 private powerType:PowerType='SPEED BOOST';
 private powerTimer=15;
 private powerActive=0;
 private particles:{mesh:THREE.Mesh;life:number;max:number}[]=[];
 private particleCursor=0;

 constructor(private host:HTMLElement,d:Difficulty='Amateur',f:FormationName='4-3-3'){
  this.diff=d;this.form=f;
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  this.renderer.shadowMap.enabled=true;
  host.appendChild(this.renderer.domElement);
  this.flash=document.createElement('div');
  Object.assign(this.flash.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'20',opacity:'0',background:'radial-gradient(circle,rgba(255,255,255,.98),rgba(255,220,80,.7) 25%,rgba(255,70,30,.2) 60%,transparent 75%)',mixBlendMode:'screen',transition:'opacity .08s ease'});
  host.style.position='relative';host.appendChild(this.flash);
  this.world();this.spawn();this.kickoff(0);this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);this.resize();
  addEventListener('keydown',this.down);addEventListener('keyup',this.up);this.raf=requestAnimationFrame(this.loop);
 }
 onState(fn:(s:any)=>void){this.listeners.add(fn);fn(this.state());return()=>this.listeners.delete(fn)}
 private emit(){const s=this.state();this.listeners.forEach(f=>f(s))}
 private state(){const m=Math.floor(this.match);return{score:[...this.score],time:`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,half:this.half,player:this.controlled?.name||'',stamina:Math.round(this.controlled?.stamina||100),event:this.event,shots:this.stats.shots,shotsOn:this.stats.shotsOn,passes:this.stats.passes,completed:this.stats.completed,poss:this.stats.poss,powerup:this.controlled?.speedBoost?'SPEED BOOST':this.controlled?.superKick?'SUPER KICK':''}}

 private world(){
  this.scene.background=new THREE.Color(0x07130e);
  this.scene.add(new THREE.HemisphereLight(0xdfffee,0x06100b,2));
  const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-5,12,7);sun.castShadow=true;this.scene.add(sun);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(11,7.14),new THREE.MeshStandardMaterial({color:0x17633d,roughness:1}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;this.scene.add(grass);
  const lm=new THREE.LineBasicMaterial({color:0xffffff});
  const line=(a:number[][])=>{const g=new THREE.BufferGeometry().setFromPoints(a.map(v=>new THREE.Vector3(v[0],.01,v[1])));this.scene.add(new THREE.Line(g,lm))};
  line([[-5.5,-3.57],[5.5,-3.57],[5.5,3.57],[-5.5,3.57],[-5.5,-3.57]]);line([[0,-3.57],[0,3.57]]);
  const c=new THREE.EllipseCurve(0,0,.87,.87,0,Math.PI*2);line(c.getPoints(48).map(p=>[p.x,p.y]));
  for(const x of[-5.5,5.5]){for(const z of[-.8,.8]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.08,8),new THREE.MeshStandardMaterial({color:0xffffff}));post.position.set(x,.04,z);this.scene.add(post)}const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,1.7,.08),new THREE.MeshStandardMaterial({color:0xffffff}));bar.rotation.z=Math.PI/2;bar.position.set(x,.04,0);this.scene.add(bar)}
  this.ball=new THREE.Mesh(new THREE.SphereGeometry(.13,16,10),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35}));this.ball.castShadow=true;this.scene.add(this.ball);
  for(let i=0;i<42;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0}));this.scene.add(m);this.particles.push({mesh:m,life:0,max:1})}
  this.camera.position.set(-.2,7.2,7.6);this.camera.lookAt(0,0,0);
 }

 private spawn(){for(let team=0;team<2;team++){this.players.push(this.make(team,0,'Keeper','GK',72));for(let i=0;i<10;i++){const role=i<4?'DEF':i<7?'MID':'ATT';this.players.push(this.make(team,i+1,`${team?'Red':'Blue'} ${i+1}`,role,62+(i%5)*6))}}this.controlled=this.players.find(p=>p.team===0&&p.role==='ATT')!}
 private make(team:number,n:number,name:string,role:string,ovr:number):P{const g=new THREE.Group();const shirt=new THREE.MeshStandardMaterial({color:team?0xd83f48:0x2f91ff,roughness:.7});const skin=new THREE.MeshStandardMaterial({color:0xc88668,roughness:.8});const body=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.25,5,8),shirt);body.position.y=.34;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),skin);head.position.y=.64;g.add(head);for(const x of[-.055,.055]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.035,.25,4,6),shirt);leg.position.set(x,.08,0);g.add(leg)}for(const x of[-.16,.16]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.22,4,6),shirt);arm.position.set(x,.38,0);g.add(arm)}g.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true});this.scene.add(g);return{team,n,name,role,ovr,pos:new THREE.Vector3(),vel:new THREE.Vector3(),mesh:g,ball:false,stamina:100,speedBoost:0,superKick:0}}

 private kickoff(team:number){this.ball.position.set(0,.13,0);this.bv.set(0,0,0);this.powerTimer=15;this.removePowerup();const spots=FORM[this.form];for(const p of this.players){if(p.n===0)p.pos.set(p.team?5.05:-5.05,0,0);else{const s=spots[p.n-1],side=p.team?1:-1;p.pos.set(side*s[0]*.91,0,s[1])}p.mesh.position.copy(p.pos);p.vel.set(0,0,0);p.ball=false}const k=this.players.find(p=>p.team===team&&p.role==='ATT')!;k.ball=true;this.event='KICK OFF'}
 private down=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();if([' ','j','k','l','i','o','p'].includes(k))e.preventDefault();this.keys.add(k)};
 private up=(e:KeyboardEvent)=>this.keys.delete(e.key.toLowerCase());

 private loop=(n:number)=>{const dt=clamp((n-this.last)/1000,0,.033);this.last=n;if(this.match<90*60)this.update(dt);this.renderer.render(this.scene,this.camera);this.raf=requestAnimationFrame(this.loop)};
 private update(dt:number){
  this.t+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.goalCooldown=Math.max(0,this.goalCooldown-dt);
  if(this.half===1){this.match=Math.min(45*60,this.match+dt);if(this.match>=45*60){this.half=2;this.event='HALF TIME';this.kickoff(1)}}else{this.match=Math.min(90*60,this.match+dt);if(this.match>=90*60){this.event='FULL TIME';return}}
  this.powerTimer-=dt;if(this.powerTimer<=0&&!this.powerup)this.spawnPowerup();
  this.updatePowerup(dt);this.user(dt);this.ai(dt);this.physics(dt);this.possession();this.updateParticles(dt);this.cameraFollow(dt);this.updateJuice(dt);
  if(Math.floor(this.t*8)%4===0)this.emit();
 }

 private user(dt:number){
  const p=this.controlled;let x=(this.keys.has('d')?1:0)-(this.keys.has('a')?1:0),z=(this.keys.has('s')?1:0)-(this.keys.has('w')?1:0);const dir=new THREE.Vector3(x,0,z);if(dir.lengthSq())dir.normalize();
  const sprint=this.keys.has('shift')&&p.stamina>2;const boost=p.speedBoost>0?1.38:1;const speed=(.9+p.ovr/100*.8)*(sprint?1.65:1)*boost;
  p.vel.lerp(dir.multiplyScalar(speed),1-Math.exp(-10*dt));p.pos.addScaledVector(p.vel,dt);p.pos.x=clamp(p.pos.x,-5.45,5.45);p.pos.z=clamp(p.pos.z,-3.45,3.45);p.stamina=clamp(p.stamina+(sprint?-10:4)*dt,0,100);p.speedBoost=Math.max(0,p.speedBoost-dt);p.superKick=Math.max(0,p.superKick-dt);p.mesh.position.copy(p.pos);
  if(p.ball)this.controlBall(p);
  if(this.keys.has(' ')&&this.cooldown<=0){this.cooldown=.3;this.controlled=this.players.filter(q=>q.team===0).sort((a,b)=>a.pos.distanceTo(this.ball.position)-b.pos.distanceTo(this.ball.position))[0]}
  if(this.keys.has('j'))this.pass(false);if(this.keys.has('k'))this.pass(true);if(this.keys.has('l'))this.shoot(false);if(this.keys.has('p'))this.shoot(true);if(this.keys.has('i'))this.shoot(false);if(this.keys.has('o'))this.tackle();
 }
 private controlBall(p:P){const offset=new THREE.Vector3(.22,0,.08);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(p.vel.z,p.vel.x)||0);this.ball.position.copy(p.pos).add(offset).setY(.15);this.bv.multiplyScalar(.5)}

 private pass(through:boolean){const p=this.controlled;if(this.cooldown>0||!p.ball)return;this.cooldown=.28;const mates=this.players.filter(q=>q.team===p.team&&q!==p&&!q.ball).sort((a,b)=>a.pos.distanceTo(p.pos)-b.pos.distanceTo(p.pos));const r=mates[0];if(!r)return;const d=r.pos.clone().sub(p.pos);d.y=0;if(d.lengthSq()<.001)return;d.normalize();const err=(100-p.ovr)/100*.35;d.z+=(Math.random()-.5)*err;d.normalize();p.ball=false;this.ball.position.copy(p.pos).setY(.15);this.bv.copy(d).multiplyScalar(2.8+p.ovr/80);this.bv.y=.15;this.stats.passes[p.team]++;this.event=through?'THROUGH BALL':'PASS'}
 private shoot(chip:boolean){const p=this.controlled;if(this.cooldown>0||!p.ball)return;this.cooldown=.5;p.ball=false;const goal=new THREE.Vector3(5.5,0,(Math.random()-.5)*2.2);const d=goal.sub(p.pos);d.y=0;if(d.lengthSq()<.001)return;d.normalize();d.z+=((Math.random()-.5)*(100-p.ovr)/100*.55);d.normalize();this.ball.position.copy(p.pos).setY(.16);const kickBoost=p.superKick>0?1.65:1;this.bv.copy(d).multiplyScalar((4+p.ovr/65)*kickBoost);this.bv.y=chip?2.2*kickBoost:1.05+p.ovr/130;this.stats.shots[p.team]++;this.event=chip?'CHIP':'SHOT'}
 private tackle(){const p=this.controlled;if(this.cooldown>0)return;this.cooldown=.35;const e=this.players.filter(q=>q.team!==p.team).sort((a,b)=>a.pos.distanceTo(p.pos)-b.pos.distanceTo(p.pos))[0];if(e&&e.pos.distanceTo(p.pos)<.5&&Math.random()<p.ovr/105){e.ball=false;this.players.forEach(q=>q.ball=false);this.ball.position.copy(e.pos).setY(.15);this.bv.set((p.pos.x-e.pos.x)*.5,0,(p.pos.z-e.pos.z)*.5);this.event='TACKLE'}}

 private ai(dt:number){
  for(const p of this.players){if(p===this.controlled)continue;let target=p.pos.clone();const teammates=this.players.filter(q=>q.team===p.team);const nearest=teammates.slice().sort((a,b)=>a.pos.distanceTo(this.ball.position)-b.pos.distanceTo(this.ball.position))[0];
   if(p.ball)target.set(p.team?-5.2:5.2,0,clamp(this.ball.position.z,-2.7,2.7));
   else if(nearest===p)target.copy(this.ball.position);
   else{const s=FORM[this.form][p.n-1];target.set((p.team?1:-1)*s[0]*.91,0,s[1]);target.lerp(this.ball.position,.16)}
   if(p.role==='GK'){target.set(p.team?5.05:-5.05,0,clamp(this.ball.position.z,-2.5,2.5));if(p.pos.distanceTo(this.ball.position)<.75)target.copy(this.ball.position)}
   const d=target.sub(p.pos);d.y=0;if(d.length()>.08)d.normalize();const speed=(.75+p.ovr/150)*(p.speedBoost>0?1.35:1);p.vel.lerp(d.multiplyScalar(speed),1-Math.exp(-5*dt));p.pos.addScaledVector(p.vel,dt);p.pos.x=clamp(p.pos.x,-5.45,5.45);p.pos.z=clamp(p.pos.z,-3.45,3.45);p.mesh.position.copy(p.pos);
   if(p.ball)this.controlBall(p);
   if(!p.ball&&p.pos.distanceTo(this.ball.position)<.22&&this.bv.length()<.5){this.players.forEach(q=>q.ball=false);p.ball=true;this.event='CONTROL'}
   p.speedBoost=Math.max(0,p.speedBoost-dt);p.superKick=Math.max(0,p.superKick-dt);
  }
 }

 private physics(dt:number){
  if(this.players.some(p=>p.ball))return;
  this.bv.y-=9.81*dt;this.bv.multiplyScalar(Math.max(0,1-1.1*dt));this.ball.position.addScaledVector(this.bv,dt);
  if(this.ball.position.y<.13){this.ball.position.y=.13;this.bv.y=Math.abs(this.bv.y)*.42;this.bv.x*=.86;this.bv.z*=.86}
  this.ball.rotation.x+=this.bv.z*dt*4;this.ball.rotation.z-=this.bv.x*dt*4;
  if(Math.abs(this.ball.position.z)>3.57){this.ball.position.z=clamp(this.ball.position.z,-3.57,3.57);this.bv.z*=-.7}
  if(this.ball.position.x>5.52&&Math.abs(this.ball.position.z)<1.05&&this.goalCooldown<=0){this.goal(0)}
  if(this.ball.position.x<-5.52&&Math.abs(this.ball.position.z)<1.05&&this.goalCooldown<=0){this.goal(1)}
  if(this.ball.position.x>5.55||this.ball.position.x<-5.55)this.bv.x*=-.7;
 }
 private goal(team:number){this.score[team]++;this.stats.shotsOn[team]++;this.event=team===0?'GOAL BLUE!':'GOAL RED!';this.goalCooldown=2;this.triggerGoalJuice();this.kickoff(team===0?1:0)}
 private possession(){const b=this.players.find(p=>p.ball);if(b)this.stats.poss[b.team]=Math.round(this.stats.poss[b.team]+(50-this.stats.poss[b.team])*.01);else{this.stats.poss[0]=50;this.stats.poss[1]=50}}

 private spawnPowerup(){
  this.removePowerup();this.powerType=Math.random()<.5?'SPEED BOOST':'SUPER KICK';
  const g=new THREE.Group();const color=this.powerType==='SPEED BOOST'?0x39ff88:0xffb52e;
  const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2,metalness:.15,roughness:.25});
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.22,1),mat);core.position.y=.25;g.add(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.025,8,24),mat);ring.rotation.x=Math.PI/2;ring.position.y=.25;g.add(ring);
  const s=(Math.random()*2-1);g.position.set((Math.random()*8.2-4.1),0,(Math.random()*5.4-2.7));g.userData={phase:Math.random()*Math.PI*2};this.scene.add(g);this.powerup=g;this.event=this.powerType;
 }
 private updatePowerup(dt:number){if(!this.powerup)return;this.powerTimer=15;this.powerup.rotation.y+=dt*2.5;this.powerup.position.y=.05+Math.sin(this.t*4+(this.powerup.userData.phase||0))*.05;const d=this.controlled.pos.distanceTo(this.powerup.position);if(d<.55){if(this.powerType==='SPEED BOOST')this.controlled.speedBoost=8;else this.controlled.superKick=8;this.event=this.powerType+' ACTIVATED';this.beep(this.powerType==='SPEED BOOST'?620:820,.12);this.removePowerup()}}
 private removePowerup(){if(this.powerup){this.scene.remove(this.powerup);this.powerup.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}});this.powerup=null} }

 private updateParticles(dt:number){
  const speed=this.bv.length();
  if(!this.players.some(p=>p.ball)&&speed>2.2){
   for(let n=0;n<(speed>5?3:1);n++){
    const item=this.particles[this.particleCursor++%this.particles.length];item.life=.34;item.max=.34;item.mesh.position.copy(this.ball.position);item.mesh.position.x+=(Math.random()-.5)*.06;item.mesh.position.z+=(Math.random()-.5)*.06;item.mesh.position.y=Math.max(.14,this.ball.position.y+(Math.random()-.5)*.05);(item.mesh.material as THREE.MeshBasicMaterial).opacity=.8;item.mesh.scale.setScalar(.7+Math.random()*.7)
   }
  }
  for(const p of this.particles){if(p.life>0){p.life-=dt;const a=clamp(p.life/p.max,0,1);(p.mesh.material as THREE.MeshBasicMaterial).opacity=a*.8;p.mesh.scale.multiplyScalar(1-dt*1.5)}}
 }

 private triggerGoalJuice(){
  this.shake=.75;
  this.flash.style.transition='none';this.flash.style.opacity='1';
  requestAnimationFrame(()=>{this.flash.style.transition='opacity .55s ease-out';this.flash.style.opacity='0'});
  this.beep(130,.18);setTimeout(()=>this.beep(180,.22),100);setTimeout(()=>this.beep(240,.25),210);
 }
 private updateJuice(dt:number){if(this.shake<=0){this.renderer.domElement.style.transform='';return}this.shake=Math.max(0,this.shake-dt);const amount=this.shake*.075;const x=(Math.random()-.5)*amount;const y=(Math.random()-.5)*amount;this.renderer.domElement.style.transform=`translate(${x}px,${y}px)`}
 private beep(freq:number,duration:number){try{if(!this.audio)this.audio=new AudioContext();if(this.audio.state==='suspended')this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.08,this.audio.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration+.02)}catch{}}
 private cameraFollow(dt:number){const target=new THREE.Vector3(this.ball.position.x,0,this.ball.position.z);const desired=new THREE.Vector3(target.x-1.4,7.2,target.z+7.2);this.camera.position.lerp(desired,1-Math.exp(-4*dt));this.camera.lookAt(target)}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false)}
 destroy(){cancelAnimationFrame(this.raf);this.ro.disconnect();removeEventListener('keydown',this.down);removeEventListener('keyup',this.up);this.audio?.close();this.renderer.dispose();this.removePowerup();this.particles.forEach(p=>{p.mesh.geometry.dispose();p.mesh.material.dispose()});this.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}});this.flash.remove();this.renderer.domElement.remove()}
}
