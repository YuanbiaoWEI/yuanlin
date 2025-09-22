import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 初始化场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaadfff);

// 相机
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 80, 100);

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 控制器
const controls = new OrbitControls(camera, renderer.domElement);

// 光照
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 100, 50);
scene.add(light);
scene.add(new THREE.AmbientLight(0x888888));

// 示例园林数据
const data = {
  roads: [ { x:0, y:0, w:40, h:5 } ],
  waters: [ { x:10, y:10, w:20, h:10 } ],
  buildings: [ { x:-20, y:-10, w:15, h:10 } ],
  rocks: [ { x:5, y:-15, r:4 } ]
};

// 道路
data.roads.forEach(r => {
  const geometry = new THREE.BoxGeometry(r.w, 0.5, r.h);
  const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(r.x, 0, r.y);
  scene.add(mesh);
});

// 水体
data.waters.forEach(w => {
  const geometry = new THREE.BoxGeometry(w.w, 0.2, w.h);
  const material = new THREE.MeshPhongMaterial({ color: 0x3399ff, transparent: true, opacity: 0.7 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(w.x, -0.1, w.y);
  scene.add(mesh);
});

// 建筑
data.buildings.forEach(b => {
  const geometry = new THREE.BoxGeometry(b.w, 10, b.h);
  const material = new THREE.MeshPhongMaterial({ color: 0x996633 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(b.x, 5, b.y);
  scene.add(mesh);
});

// 假山
data.rocks.forEach(r => {
  const geometry = new THREE.SphereGeometry(r.r, 16, 16);
  const material = new THREE.MeshPhongMaterial({ color: 0x555555 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(r.x, r.r, r.y);
  scene.add(mesh);
});

// 地面
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x55aa55 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 窗口自适应
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
