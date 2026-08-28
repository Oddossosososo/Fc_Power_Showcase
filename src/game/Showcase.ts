import * as THREE from 'three';
import { ballPosition, powerScale } from './physics';

export class ShowcaseEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  private renderer: THREE.WebGLRenderer;
  private ball: THREE.Mesh;
  private particles: THREE.Points;
  private ring: THREE.Mesh;
  private raf = 0;
  private start = performance.now();

  constructor(private host:HTMLElement, private ovr:number, private offset:number) {
    this.scene.background = new THREE.Color('#07100e');
    this.camera.position.set(0, 2, 7.5);
    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0x9ffff0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(3,6,4); key.castShadow = true; this.scene.add(key);
    const rim = new THREE.PointLight(0x55ffcc, 18, 16);
    rim.position.set(-4,2,2); this.scene.add(rim);

    const field = new THREE.Mesh(new THREE.PlaneGeometry(14,9), new THREE.MeshStandardMaterial({color:0x0c2a22, roughness:.9}));
    field.rotation.x = -Math.PI/2; field.position.y = -1.25; field.receiveShadow = true; this.scene.add(field);

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.34,32,20), new THREE.MeshStandardMaterial({color:0xf5f7f6,roughness:.45}));
    this.ball.castShadow = true; this.scene.add(this.ball);

    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.05,.025,8,64), new THREE.MeshBasicMaterial({color:0x70ffd0,transparent:true,opacity:.8}));
    this.ring.rotation.x = Math.PI/2; this.ring.position.y = -1.21; this.scene.add(this.ring);

    const count = powerScale(ovr).particles;
    const pos = new Float32Array(count*3);
    for(let i=0;i<count;i++) { pos[i*3]=(Math.random()-.5)*8; pos[i*3+1]=Math.random()*4-1.1; pos[i*3+2]=(Math.random()-.5)*4; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.particles = new THREE.Points(geo,new THREE.PointsMaterial({color:0x8effdf,size:.026,transparent:true,opacity:.8}));
    this.scene.add(this.particles);
    this.resize();
    new ResizeObserver(()=>this.resize()).observe(host);
    this.animate();
  }

  private resize() {
    const w=this.host.clientWidth,h=this.host.clientHeight;
    if(!w||!h)return;
    this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h,false);
  }

  private animate=()=>{
    const time=(performance.now()-this.start)/1000;
    const p=powerScale(this.ovr);
    const b=ballPosition(time,this.ovr,this.offset);
    this.ball.position.set(b.x,b.y,b.z);
    this.ball.rotation.x += .12*p.speed;
    this.ball.rotation.z += .18*p.speed;
    this.ring.scale.setScalar(1+Math.sin(time*p.speed)*.12);
    this.ring.rotation.z=time*.35;
    this.particles.rotation.y=time*.025;
    this.camera.position.x=Math.sin(time*.28)*(.12+Math.min(this.ovr/99,20)*.012);
    this.camera.lookAt(0,-.25,0);
    this.renderer.render(this.scene,this.camera);
    this.raf=requestAnimationFrame(this.animate);
  };

  destroy(){
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.host.removeChild(this.renderer.domElement);
  }
}
