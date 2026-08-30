import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'public/models/player.glb';
const root = new THREE.Group();
root.name = 'Player';

const jersey = new THREE.MeshStandardMaterial({ name: 'Jersey', color: 0x197dff, roughness: 0.62, metalness: 0.02 });
const skin = new THREE.MeshStandardMaterial({ name: 'Skin', color: 0xc98a6d, roughness: 0.8 });
const dark = new THREE.MeshStandardMaterial({ name: 'BootsAndHair', color: 0x11151a, roughness: 0.55 });
const white = new THREE.MeshStandardMaterial({ name: 'Socks', color: 0xf2f4f7, roughness: 0.75 });

const mesh = (name, geometry, material, parent, position, scale = [1, 1, 1]) => {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.position.set(...position);
  m.scale.set(...scale);
  m.castShadow = true;
  parent.add(m);
  return m;
};

const torso = mesh('Jersey', new THREE.CapsuleGeometry(1.15, 2.25, 8, 14), jersey, root, [0, 3.35, 0], [1, 1, 0.82]);
mesh('Shorts', new THREE.BoxGeometry(2.0, 0.95, 1.55), jersey, root, [0, 1.75, 0]);
mesh('Head', new THREE.SphereGeometry(1.0, 20, 14), skin, root, [0, 6.25, 0]);
mesh('Hair', new THREE.SphereGeometry(1.04, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark, root, [0, 6.55, 0]);

const leftArm = new THREE.Group(); leftArm.name = 'LeftArm'; leftArm.position.set(-1.35, 4.15, 0); root.add(leftArm);
mesh('LeftSleeve', new THREE.CapsuleGeometry(0.31, 1.05, 6, 10), jersey, leftArm, [0, -0.65, 0], [1, 1, 0.9]);
mesh('LeftHand', new THREE.SphereGeometry(0.34, 12, 8), skin, leftArm, [0, -1.55, 0]);

const rightArm = new THREE.Group(); rightArm.name = 'RightArm'; rightArm.position.set(1.35, 4.15, 0); root.add(rightArm);
mesh('RightSleeve', new THREE.CapsuleGeometry(0.31, 1.05, 6, 10), jersey, rightArm, [0, -0.65, 0], [1, 1, 0.9]);
mesh('RightHand', new THREE.SphereGeometry(0.34, 12, 8), skin, rightArm, [0, -1.55, 0]);

const leftLeg = new THREE.Group(); leftLeg.name = 'LeftLeg'; leftLeg.position.set(-0.58, 1.25, 0); root.add(leftLeg);
mesh('LeftSock', new THREE.CapsuleGeometry(0.36, 1.65, 7, 10), white, leftLeg, [0, -0.9, 0]);
mesh('LeftBoot', new THREE.BoxGeometry(0.72, 0.38, 1.5), dark, leftLeg, [0, -1.95, 0.25]);

const rightLeg = new THREE.Group(); rightLeg.name = 'RightLeg'; rightLeg.position.set(0.58, 1.25, 0); root.add(rightLeg);
mesh('RightSock', new THREE.CapsuleGeometry(0.36, 1.65, 7, 10), white, rightLeg, [0, -0.9, 0]);
mesh('RightBoot', new THREE.BoxGeometry(0.72, 0.38, 1.5), dark, rightLeg, [0, -1.95, 0.25]);

const idle = new THREE.AnimationClip('Idle', 1.4, [
  new THREE.VectorKeyframeTrack('Player.scale', [0, 0.7, 1.4], [0.92,0.92,0.92, 0.925,0.925,0.925, 0.92,0.92,0.92]),
]);

const runTimes = [0, 0.2, 0.4, 0.6, 0.8];
const run = new THREE.AnimationClip('Run', 0.8, [
  new THREE.NumberKeyframeTrack('LeftLeg.rotation[z]', runTimes, [0.28, -0.28, 0.28, -0.28, 0.28]),
  new THREE.NumberKeyframeTrack('RightLeg.rotation[z]', runTimes, [-0.28, 0.28, -0.28, 0.28, -0.28]),
  new THREE.NumberKeyframeTrack('LeftArm.rotation[z]', runTimes, [-0.22, 0.22, -0.22, 0.22, -0.22]),
  new THREE.NumberKeyframeTrack('RightArm.rotation[z]', runTimes, [0.22, -0.22, 0.22, -0.22, 0.22]),
]);

const scene = new THREE.Scene();
scene.add(root);
await mkdir('public/models', { recursive: true });
const exporter = new GLTFExporter();
const arrayBuffer = await new Promise((resolve, reject) => {
  exporter.parse(scene, result => resolve(result), error => reject(error), { binary: true, animations: [idle, run], trs: true, onlyVisible: true });
});
await writeFile(out, Buffer.from(arrayBuffer));
console.log(`Generated ${out} (${Buffer.byteLength(arrayBuffer)} bytes)`);
