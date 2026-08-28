import * as THREE from 'three';
import { powerScale } from './physics';

export class ReplayEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private ball: THREE.Mesh;
  private player = new THREE.Group();
  private keeper = new THREE.Group();
  private raf = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private resizeObserver: ResizeObserver;

  constructor(private host: HTMLElement, private ovr: number) {
    const p = powerScale(ovr);
    this.scene.background = new THREE.Color('#07100d');
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    this.camera.position.set(-5.5, 3.2, 8.5);

    this.scene.add(new THREE.HemisphereLight(0xd8fff5, 0x07120e, 2.2));
    const flood = new THREE.DirectionalLight(0xffffff, 4);
    flood.position.set(-4, 8, 5); flood.castShadow = true; this.scene.add(flood);
    const stadium = new THREE.PointLight(0x73ffd3, 30, 25);
    stadium.position.set(1, 5, -4); this.scene.add(stadium);

    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), new THREE.MeshStandardMaterial({ color:0x12382c, roughness:.92 }));
    pitch.rotation.x = -Math.PI/2; pitch.position.y = -1.45; pitch.receiveShadow = true; this.scene.add(pitch);

    const lineMat = new THREE.LineBasicMaterial({ color:0xd6eee7 });
    const makeLine = (pts:number[][]) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(v => new THREE.Vector3(v[0],v[1],v[2])));
      this.scene.add(new THREE.Line(g,lineMat));
    };
    makeLine([[-7,-1.42,-5],[-7,-1.42,5],[7,-1.42,5],[7,-1.42,-5],[-7,-1.42,-5]]);
    makeLine([[3.6,-1.42,-2.2],[3.6,-1.42,2.2],[6.4,-1.42,2.2],[6.4,-1.42,-2.2],[3.6,-1.42,-2.2]]);

    this.makeGoal();
    this.makePlayer(this.player, 0xeeeeee, 0x132f25, false);
    this.player.position.set(-4.8,-.45,0);
    this.scene.add(this.player);
    this.makePlayer(this.keeper, 0x7bffd9, 0x0b2720, true);
    this.keeper.position.set(5.65,-.45,0);
    this.scene.add(this.keeper);

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.24,32,20), new THREE.MeshStandardMaterial({ color:0xffffff, roughness:.35 }));
    this.ball.castShadow = true; this.scene.add(this.ball);

    const count = Math.min(500, p.particles);
    const pos = new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*14;pos[i*3+1]=Math.random()*3-1.3;pos[i*3+2]=(Math.random()-.5)*8;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x8effdf,size:.022,transparent:true,opacity:.48})));

    this.resizeObserver = new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.animate();
  }

  private makeGoal(){
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.55});
    const post=(x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.castShadow=true;this.scene.add(m);};
    post(6.4,0,-2.2,.12,2.9,.12);post(6.4,0,2.2,.12,2.9,.12);post(6.4,1.45,0,.12,.12,4.5);
    for(let i=-2;i<=2;i++)post(6.42,.0,i*.85,.03,2.8,.025);
  }

  private makePlayer(group:THREE.Group, shirt:number, shorts:number, keeper:boolean){
    const skin=new THREE.MeshStandardMaterial({color:0xc98968,roughness:.7});
    const top=new THREE.MeshStandardMaterial({color:shirt,roughness:.6});
    const bottom=new THREE.MeshStandardMaterial({color:shorts,roughness:.7});
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.75,8,16),top);body.position.y=.55;body.castShadow=true;group.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.28,20,16),skin);head.position.y=1.35;head.castShadow=true;group.add(head);
    const legL=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.65,6,10),bottom);legL.position.set(-.17,-.02,0);legL.castShadow=true;group.add(legL);
    const legR=legL.clone();legR.position.x=.17;group.add(legR);
    const armL=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.62,6,10),top);armL.position.set(-.43,.62,0);armL.rotation.z=keeper?-.8:-.2;armL.castShadow=true;group.add(armL);
    const armR=armL.clone();armR.position.x=.43;armR.rotation.z=keeper?.8:.2;group.add(armR);
  }

  private resize(){
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
  }

  private animate=()=>{
    const dt=Math.min(this.clock.getDelta(),.04);this.elapsed+=dt;
    const p=powerScale(this.ovr);
    const normalized=Math.min(1,this.elapsed/(2.4+Math.min(3,1/p.speed)));
    const shot=Math.min(1,normalized/.66);
    const flight=Math.max(0,(normalized-.46)/.54);
    const kickEase=shot*shot*(3-2*shot);
    this.player.rotation.z=Math.sin(kickEase*Math.PI)*-.28;
    this.player.rotation.y=Math.sin(kickEase*Math.PI)*.18;
    this.player.position.x=-4.8+kickEase*.55;
    const curve=Math.sin(flight*Math.PI);
    const distance=4.8+flight*1.65;
    this.ball.position.set(-4.15+distance, -1.02+curve*(1.0+p.curve*.22), Math.sin(flight*Math.PI)*Math.min(1.0,p.curve*.16));
    this.ball.rotation.x+=.22*p.speed;this.ball.rotation.z+=.3*p.speed;
    const save=Math.max(0,flight-.72)/.28;
    this.keeper.position.y=-.45+Math.sin(Math.min(1,save)*Math.PI)*.45;
    this.keeper.position.z=-Math.min(1,save)*.7;
    this.keeper.rotation.z=-Math.min(1,save)*.8;
    const focus=this.ball.position;
    const camX=-4.8+flight*9.3;
    this.camera.position.x=camX-1.5+Math.sin(this.elapsed*.8)*.18;
    this.camera.position.y=2.6+curve*.9;
    this.camera.position.z=7.4-curve*1.8;
    this.camera.lookAt(focus.x,Math.max(-.2,focus.y),focus.z);
    this.renderer.render(this.scene,this.camera);
    this.raf=requestAnimationFrame(this.animate);
  };

  destroy(){cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.renderer.dispose();this.host.removeChild(this.renderer.domElement);}
}
