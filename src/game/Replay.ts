import * as THREE from 'three';
import { powerScale } from './physics';

export class ReplayEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private ball: THREE.Mesh;
  private player = new THREE.Group();
  private keeper = new THREE.Group();
  private kickLeg!: THREE.Object3D;
  private plantedLeg!: THREE.Object3D;
  private arms!: THREE.Object3D[];
  private goalNet!: THREE.Mesh;
  private raf = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private resizeObserver: ResizeObserver;
  private scored = false;

  constructor(private host: HTMLElement, private ovr: number) {
    const p = powerScale(ovr);
    this.scene.background = new THREE.Color('#06100c');
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(-5.8, 2.8, 8.8);

    this.scene.add(new THREE.HemisphereLight(0xdffff6, 0x06120d, 2.4));
    const flood = new THREE.DirectionalLight(0xffffff, 4.2);
    flood.position.set(-3, 8, 5); flood.castShadow = true; this.scene.add(flood);
    const rim = new THREE.PointLight(0x70ffd0, 35, 28);
    rim.position.set(4, 4, -2); this.scene.add(rim);

    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), new THREE.MeshStandardMaterial({ color: 0x12382c, roughness: .92 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = -1.45; pitch.receiveShadow = true; this.scene.add(pitch);
    this.drawPitchLines();
    this.makeGoal();

    this.makePlayer(this.player, 0xf2f4f3, 0x102b23, false);
    this.player.position.set(-5.8, -.45, 0.15); this.scene.add(this.player);
    this.makePlayer(this.keeper, 0x70ffd0, 0x0a2921, true);
    this.keeper.position.set(5.25, -.45, 0); this.scene.add(this.keeper);

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.24, 32, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3 }));
    this.ball.castShadow = true; this.scene.add(this.ball);

    const count = Math.min(800, p.particles);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - .5) * 16;
      pos[i * 3 + 1] = Math.random() * 3.2 - 1.3;
      pos[i * 3 + 2] = (Math.random() - .5) * 9;
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x8effdf, size: .022, transparent: true, opacity: .42 })));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host); this.resize(); this.animate();
  }

  private drawPitchLines() {
    const mat = new THREE.LineBasicMaterial({ color: 0xd9f1e9, transparent: true, opacity: .8 });
    const line = (pts: number[][]) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map(v => new THREE.Vector3(v[0], v[1], v[2])));
      this.scene.add(new THREE.Line(g, mat));
    };
    const y = -1.42;
    line([[-12,y,-6], [12,y,-6], [12,y,6], [-12,y,6], [-12,y,-6]]);
    line([[0,y,-6], [0,y,6]]);
    const circle = new THREE.EllipseCurve(0, 0, 1.65, 1.65, 0, Math.PI * 2, false, 0).getPoints(48);
    line(circle.map(v => [v.x, y, v.y]));
    line([[3.5,y,-3], [6.6,y,-3], [6.6,y,3], [3.5,y,3], [3.5,y,-3]]);
    line([[4.9,y,-1.45], [6.6,y,-1.45], [6.6,y,1.45], [4.9,y,1.45]]);
  }

  private makeGoal() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf7fffc, roughness: .45 });
    const post = (x:number,y:number,z:number,sx:number,sy:number,sz:number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      m.position.set(x,y,z); m.castShadow = true; this.scene.add(m);
    };
    post(6.65, 0, -2.05, .13, 2.9, .13);
    post(6.65, 0, 2.05, .13, 2.9, .13);
    post(6.65, 1.45, 0, .13, .13, 4.2);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xd5fff3, transparent: true, opacity: .18, wireframe: true });
    this.goalNet = new THREE.Mesh(new THREE.BoxGeometry(.8, 2.75, 4), netMat);
    this.goalNet.position.set(7.05, 0, 0); this.scene.add(this.goalNet);
  }

  private makePlayer(group: THREE.Group, shirt:number, shorts:number, keeper:boolean) {
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98968, roughness: .7 });
    const top = new THREE.MeshStandardMaterial({ color: shirt, roughness: .55 });
    const bottom = new THREE.MeshStandardMaterial({ color: shorts, roughness: .65 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .72, 8, 16), top);
    body.position.y = .62; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.28, 24, 18), skin);
    head.position.y = 1.42; head.castShadow = true; group.add(head);
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(.115, .7, 6, 10), bottom);
    legL.position.set(-.17, -.08, 0); legL.castShadow = true; group.add(legL);
    const legR = legL.clone(); legR.position.x = .17; group.add(legR);
    this.plantedLeg = legL; this.kickLeg = legR;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(.09, .62, 6, 10), top);
    armL.position.set(-.43, .67, 0); armL.castShadow = true; group.add(armL);
    const armR = armL.clone(); armR.position.x = .43; group.add(armR);
    this.arms = [armL, armR];
    if (keeper) { armL.rotation.z = -.85; armR.rotation.z = .85; }
  }

  private animate = () => {
    const dt = Math.min(this.clock.getDelta(), .04);
    this.elapsed += dt;
    const p = powerScale(this.ovr);

    // Full sequence: approach -> plant -> contact -> flight -> goal -> reset.
    const cycle = this.elapsed % 5.8;
    const run = Math.min(1, cycle / 1.55);
    const contact = Math.min(1, Math.max(0, (cycle - 1.35) / .42));
    const flight = Math.min(1, Math.max(0, (cycle - 1.68) / 2.0));
    const scored = cycle >= 3.55 && cycle < 4.55;
    this.scored = scored;

    const runEase = run * run * (3 - 2 * run);
    this.player.position.x = -5.8 + runEase * 1.7;
    this.player.position.y = -.45 + Math.abs(Math.sin(run * Math.PI * 5)) * .035;
    this.player.rotation.y = .02;

    // Legs visibly swing through the ball at contact.
    const stride = Math.sin(run * Math.PI * 5) * .65;
    this.plantedLeg.rotation.z = -stride * .55;
    this.kickLeg.rotation.z = stride * .55;
    const kick = contact * contact * (3 - 2 * contact);
    this.kickLeg.rotation.z = -.55 - kick * 1.75;
    this.kickLeg.rotation.x = kick * .18;
    this.arms[0].rotation.z = -.2 - kick * .75;
    this.arms[1].rotation.z = .2 + kick * .8;

    // Before contact, the ball is at the player's foot. After contact it flies.
    if (cycle < 1.68) {
      this.ball.position.set(this.player.position.x + .58, -.96 + kick * .08, .05);
    } else {
      const f = flight;
      const ease = f * f * (3 - 2 * f);
      const startX = -4.98;
      const targetX = 6.62;
      const arc = Math.sin(f * Math.PI);
      const curve = Math.sin(f * Math.PI * .9) * Math.min(1.15, p.curve * .12);
      const targetZ = Math.sin((this.ovr % 17) / 17 * Math.PI) * 1.05;
      this.ball.position.x = THREE.MathUtils.lerp(startX, targetX, ease);
      this.ball.position.y = -.96 + arc * (1.45 + Math.min(4.5, p.curve * .55));
      this.ball.position.z = THREE.MathUtils.lerp(.05, targetZ, ease) + curve * .18;
      this.ball.rotation.x += .3 * p.speed;
      this.ball.rotation.z += .38 * p.speed;
    }

    // Keeper reads the shot, dives late, but the showcase is scripted as a goal.
    const dive = Math.min(1, Math.max(0, (cycle - 2.55) / .75));
    const diveEase = dive * dive * (3 - 2 * dive);
    this.keeper.position.z = diveEase * (this.ball.position.z > 0 ? .95 : -.95);
    this.keeper.position.y = -.45 + Math.sin(diveEase * Math.PI) * .75;
    this.keeper.rotation.z = (this.ball.position.z > 0 ? -1 : 1) * diveEase * .95;

    if (scored) {
      const hit = Math.sin((cycle - 3.55) * Math.PI * 3) * .08;
      this.goalNet.scale.z = 1 + hit;
      this.goalNet.position.x = 7.05 + hit * .3;
    } else {
      this.goalNet.scale.z = 1;
      this.goalNet.position.x = 7.05;
    }

    // Cinematic tracking camera follows the ball during the strike.
    const focus = this.ball.position;
    this.camera.position.x = -4.8 + Math.min(10.5, Math.max(0, flight * 9.5));
    this.camera.position.y = 2.4 + Math.sin(flight * Math.PI) * 1.1;
    this.camera.position.z = 7.6 - Math.sin(flight * Math.PI) * 2.5;
    this.camera.lookAt(focus.x, Math.max(-.1, focus.y), focus.z);

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.animate);
  };

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) this.host.removeChild(this.renderer.domElement);
  }
}
