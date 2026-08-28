import * as THREE from 'three';
import { powerScale } from './physics';

type ShotStyle = 'power' | 'finesse' | 'knuckle' | 'outside' | 'volley' | 'chip';

export class ReplayEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  private renderer: THREE.WebGLRenderer;
  private ball!: THREE.Mesh;
  private player = new THREE.Group();
  private keeper = new THREE.Group();
  private kickLeg!: THREE.Object3D;
  private plantLeg!: THREE.Object3D;
  private arms!: THREE.Object3D[];
  private goalNet!: THREE.Mesh;
  private raf=0; private clock=new THREE.Clock(); private elapsed=0;
  private resizeObserver:ResizeObserver; private kickPoint=new THREE.Vector3();
  private style:ShotStyle;

  constructor(private host:HTMLElement, private ovr:number, act='Rocket Free Kick') {
    this.style=this.pickStyle(act);
    const p=powerScale(ovr);
    this.scene.background=new THREE.Color('#06100c');
    this.renderer=new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2)); this.renderer.shadowMap.enabled=true;
    host.appendChild(this.renderer.domElement); this.camera.position.set(-6,2.8,8.5);
    this.scene.add(new THREE.HemisphereLight(0xdffff6,0x06120d,2.4));
    const flood=new THREE.DirectionalLight(0xffffff,4.2); flood.position.set(-3,8,5); flood.castShadow=true; this.scene.add(flood);
    const rim=new THREE.PointLight(0x70ffd0,35,28); rim.position.set(4,4,-2); this.scene.add(rim);
    const pitch=new THREE.Mesh(new THREE.PlaneGeometry(28,18),new THREE.MeshStandardMaterial({color:0x12382c,roughness:.92}));
    pitch.rotation.x=-Math.PI/2; pitch.position.y=-1.45; pitch.receiveShadow=true; this.scene.add(pitch);
    this.drawPitchLines(); this.makeGoal();
    this.makePlayer(this.player,0xf2f4f3,0x102b23,false); this.player.position.set(-5.8,-.45,.15); this.scene.add(this.player);
    this.makePlayer(this.keeper,0x70ffd0,0x0a2921,true); this.keeper.position.set(5.25,-.45,0); this.scene.add(this.keeper);
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(.24,32,20),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3})); this.ball.castShadow=true; this.scene.add(this.ball);
    const count=Math.min(1000,p.particles),pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*16;pos[i*3+1]=Math.random()*3.2-1.3;pos[i*3+2]=(Math.random()-.5)*9;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));this.scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x8effdf,size:.022,transparent:true,opacity:.42})));
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.animate();
  }

  private pickStyle(act:string):ShotStyle {
    const s=act.toLowerCase();
    if(s.includes('curl'))return'finesse'; if(s.includes('thunder')||s.includes('rocket'))return'power';
    if(s.includes('laser'))return'outside'; if(s.includes('skill'))return'chip';
    return'knuckle';
  }

  private drawPitchLines(){
    const mat=new THREE.LineBasicMaterial({color:0xd9f1e9,transparent:true,opacity:.8});
    const line=(pts:number[][])=>{const g=new THREE.BufferGeometry().setFromPoints(pts.map(v=>new THREE.Vector3(v[0],v[1],v[2])));this.scene.add(new THREE.Line(g,mat));}; const y=-1.42;
    line([[-12,y,-6],[12,y,-6],[12,y,6],[-12,y,6],[-12,y,-6]]);line([[0,y,-6],[0,y,6]]);
    const c=new THREE.EllipseCurve(0,0,1.65,1.65,0,Math.PI*2,false,0).getPoints(48);line(c.map(v=>[v.x,y,v.y]));
    line([[3.5,y,-3],[6.6,y,-3],[6.6,y,3],[3.5,y,3],[3.5,y,-3]]);line([[4.9,y,-1.45],[6.6,y,-1.45],[6.6,y,1.45],[4.9,y,1.45]]);
  }

  private makeGoal(){
    const mat=new THREE.MeshStandardMaterial({color:0xf7fffc,roughness:.45});
    const post=(x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.castShadow=true;this.scene.add(m);};
    post(6.65,0,-2.05,.13,2.9,.13);post(6.65,0,2.05,.13,2.9,.13);post(6.65,1.45,0,.13,.13,4.2);
    this.goalNet=new THREE.Mesh(new THREE.BoxGeometry(.8,2.75,4),new THREE.MeshBasicMaterial({color:0xd5fff3,transparent:true,opacity:.18,wireframe:true}));this.goalNet.position.set(7.05,0,0);this.scene.add(this.goalNet);
  }

  private makePlayer(group:THREE.Group,shirt:number,shorts:number,keeper:boolean){
    const skin=new THREE.MeshStandardMaterial({color:0xc98968,roughness:.7}),top=new THREE.MeshStandardMaterial({color:shirt,roughness:.55}),bottom=new THREE.MeshStandardMaterial({color:shorts,roughness:.65});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.72,8,16),top);body.position.y=.62;body.castShadow=true;group.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.28,24,18),skin);head.position.y=1.42;head.castShadow=true;group.add(head);
    const l=new THREE.Mesh(new THREE.CapsuleGeometry(.115,.7,6,10),bottom);l.position.set(-.17,-.08,0);l.castShadow=true;group.add(l);
    const r=l.clone();r.position.x=.17;group.add(r);this.plantLeg=l;this.kickLeg=r;
    const a=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.62,6,10),top);a.position.set(-.43,.67,0);a.castShadow=true;group.add(a);const b=a.clone();b.position.x=.43;group.add(b);this.arms=[a,b];
    if(keeper){a.rotation.z=-.85;b.rotation.z=.85;}
  }

  private animate=()=>{
    const dt=Math.min(this.clock.getDelta(),.04);this.elapsed+=dt;const p=powerScale(this.ovr);const c=this.elapsed%7;
    const smooth=(x:number)=>x*x*(3-2*x); const run=smooth(Math.min(1,c/1.8)); const contact=smooth(Math.min(1,Math.max(0,(c-1.55)/.32))); const flight=smooth(Math.min(1,Math.max(0,(c-1.87)/2.35)));
    this.player.position.x=-5.8+run*1.72;
    const style=this.style;
    const backswing=smooth(Math.min(1,Math.max(0,(c-.8)/.75)));
    let kickZ=.35+backswing*1.05;
    if(c>=1.55&&c<2.3) kickZ=1.4-contact*2.55;
    if(c>=2.3) kickZ=-.95*Math.max(0,1-(c-2.3)/1.05);
    if(style==='finesse') { kickZ*=.72; this.kickLeg.rotation.x=-.5*contact; }
    else if(style==='power') { kickZ*=1.18; this.kickLeg.rotation.x=-.28+contact*.7; }
    else if(style==='outside') { kickZ*=.88; this.kickLeg.rotation.y=-.42*contact; this.kickLeg.rotation.x=-.15+contact*.42; }
    else if(style==='chip') { kickZ*=.58; this.kickLeg.rotation.x=-.65+contact*1.05; }
    else { this.kickLeg.rotation.x=-.2+contact*.5; }
    this.kickLeg.rotation.z=kickZ; this.plantLeg.rotation.z=-Math.sin(c*7)*.25;
    this.arms[0].rotation.z=-.15-contact*.8;this.arms[1].rotation.z=.15+contact*.95;

    // The ball is literally placed at the boot until the contact frame.
    this.player.localToWorld(this.kickPoint.set(.18,-.75,.02));
    if(c<1.87){this.ball.position.copy(this.kickPoint);}
    else {
      const arc=Math.sin(flight*Math.PI), targetZ=style==='finesse'?1.55:style==='outside'?.7:style==='chip'?.15:.9;
      const baseArc=style==='chip'?.7:style==='power'?1.8:1.25;
      const curve=(style==='finesse'?1.6:style==='knuckle'?.25:.45)*Math.sin(flight*Math.PI);
      this.ball.position.x=THREE.MathUtils.lerp(this.kickPoint.x,6.62,flight);
      this.ball.position.y=THREE.MathUtils.lerp(this.kickPoint.y,style==='chip'?.05:0,flight)+arc*(baseArc+Math.min(4.5,p.curve*.55));
      this.ball.position.z=THREE.MathUtils.lerp(this.kickPoint.z,targetZ,flight)+curve;
      this.ball.rotation.x+=.3*p.speed;this.ball.rotation.z+=.48*p.speed;
    }

    const dive=smooth(Math.min(1,Math.max(0,(c-2.7)/.7)));this.keeper.position.z=dive*(this.ball.position.z>0?.95:-.95);this.keeper.position.y=-.45+Math.sin(dive*Math.PI)*.72;this.keeper.rotation.z=(this.ball.position.z>0?-1:1)*dive*.95;
    const scored=c>=4.22&&c<5.65;if(scored){const hit=Math.sin((c-4.22)*Math.PI*4)*.12;this.goalNet.position.x=7.05+hit;this.goalNet.scale.z=1+Math.abs(hit)*.7;}else{this.goalNet.position.x=7.05;this.goalNet.scale.z=1;}
    if(c<1.87)this.camera.position.set(-5.7,2.5,8.2);else if(c<4.1){this.camera.position.x=-4.9+flight*9.2;this.camera.position.y=2.45+Math.sin(flight*Math.PI);this.camera.position.z=7.6-Math.sin(flight*Math.PI)*2.4;}else{this.camera.position.set(5.2,2.1,5.5);}
    this.camera.lookAt(this.ball.position.x,Math.max(-.15,this.ball.position.y),this.ball.position.z);
    this.renderer.render(this.scene,this.camera);this.raf=requestAnimationFrame(this.animate);
  };

  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  destroy(){cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.renderer.dispose();if(this.host.contains(this.renderer.domElement))this.host.removeChild(this.renderer.domElement);}
}
