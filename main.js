// main.js - 主程序入口
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GardenDataParser } from './src/dataParser.js';
import { RoutePlanner } from './src/RoutePlanner.js';


class GardenScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.gardenData = null;

    this.init();
    this.setupFileInput(); // 新增：文件选择
    this.createTestScene(); // 默认先加载测试场景
  }

  init() {
    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 500);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    this.camera.position.set(50, 30, 50);
    this.camera.lookAt(0, 0, 0);

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // 初始化控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    // 光照
    this.setupLighting();

    // 坐标轴辅助
    //const axesHelper = new THREE.AxesHelper(50);
    //this.scene.add(axesHelper);

    // 窗口自适应
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // 渲染循环
    this.animate();
  }

  setupLighting() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    this.scene.add(new THREE.AmbientLight(0x404040, 0.6));
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x545454, 0.4));
  }

  // --------------------- 测试场景 ---------------------
  createTestScene() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x567d46 });
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = Math.sin(vertices[i] * 0.1) * Math.cos(vertices[i + 1] * 0.1) * 2;
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    this.createTestBuilding(-20, 0, -20);
    this.createTestBuilding(20, 0, -20);
    this.createTestWater();
    this.createTestRoad();
    this.createTestTrees();
    this.createTestRocks();

    this.updateStatus('测试场景加载成功');
  }

  createTestBuilding(x, y, z) {
    const group = new THREE.Group();
    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(10, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
    );
    walls.position.y = 2.5;
    group.add(walls);

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(7, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    roof.position.y = 6.5;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    group.position.set(x, y, z);
    this.scene.add(group);
  }

  createTestWater() {
    const water = new THREE.Mesh(
        new THREE.CircleGeometry(15, 32),
        new THREE.MeshStandardMaterial({ color: 0x4A90E2, transparent: true, opacity: 0.7 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.1, -10);
    this.scene.add(water);
  }

  createTestRoad() {
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(60, 0.2, 3),
        new THREE.MeshStandardMaterial({ color: 0x696969 })
    );
    road.position.set(0, 0.1, 5);
    this.scene.add(road);
  }

  createTestTrees() {
    for (let i = 0; i < 10; i++) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 2, 8),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      trunk.position.y = 1;
      tree.add(trunk);

      const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x228B22 })
      );
      crown.position.y = 3;
      tree.add(crown);

      tree.position.set(Math.random() * 40 - 20, 0, Math.random() * 40 - 20);
      this.scene.add(tree);
    }
  }

  createTestRocks() {
    for (let i = 0; i < 3; i++) {
      const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.5, 0),
          new THREE.MeshStandardMaterial({ color: 0x808080 })
      );
      rock.position.set(Math.random() * 20 - 10, 0.7, Math.random() * 20 - 10);
      this.scene.add(rock);
    }
  }

  // --------------------- Excel 上传 ---------------------
  setupFileInput() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.style.position = 'absolute';
    fileInput.style.top = '20px';
    fileInput.style.right = '20px';
    fileInput.style.zIndex = '200';
    fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    document.body.appendChild(fileInput);
  }

  async handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    this.updateStatus('正在解析Excel数据...');
    try {
      const parser = new GardenDataParser();
      this.gardenData = await parser.parseExcelFile(file);

      // 清理旧场景
      this.clearScene();

      // 生成园林场景
      this.generateGardenScene();

      this.updateStatus('Excel 数据加载成功并生成场景');
    } catch (err) {
      console.error(err);
      this.updateStatus('Excel 加载失败: ' + err.message);
    }

    //p1
    const planner = new RoutePlanner(this.gardenData);
    const result  = planner.findOptimalRoute();
    if (!result.path) {
      alert('未找到可用游线');
      return;
    }
    console.log('最佳游线得分:', result.score);

    // 绘制立体高亮线路
    RoutePlanner.drawTubeRoute(this.scene, result.path);
  }

  drawOptimalRoute(path){
    const mat = new THREE.LineBasicMaterial({color:0xff0000, linewidth:3});
    const pts = path.map(p=>new THREE.Vector3(p.x,0.3,-p.y));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
  }

  clearScene() {
    const keep = [];
    this.scene.traverse(obj => {
      if (obj.isLight || obj.type === 'AxesHelper') keep.push(obj);
    });
    this.scene.clear();
    keep.forEach(obj => this.scene.add(obj));
  }

  // --------------------- Excel 场景生成 ---------------------
  // main.js 中的 generateGardenScene() 函数（完整替换）
  generateGardenScene() {
    if (!this.gardenData) return;

    // 读取 bounds，若没有则使用默认范围
    const bounds = this.gardenData.bounds || { min: { x: -100, y: -100 }, max: { x: 100, y: 100 } };
    const sizeX = bounds.max.x - bounds.min.x;
    const sizeY = bounds.max.y - bounds.min.y;

    // ---------------- 地形 ----------------
    // 分段数适度：不宜过大也不宜过小
    const segX = Math.max(10, Math.min(200, Math.floor(sizeX / 2)));
    const segY = Math.max(10, Math.min(200, Math.floor(sizeY / 2)));
    const groundGeometry = new THREE.PlaneGeometry(sizeX, sizeY, segX, segY);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x567d46, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // ---------------- 建筑（实体） ----------------
    (this.gardenData.solidBuildings || []).forEach(seg => {
      seg.points.forEach(p => {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5,4,32,1);
        const material = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });

        // BoxGeometry 默认有 6 个面，每个面 2 个三角形
        // 我们把“顶面”那一组的 drawRange 去掉
        // 顶面 group 在 geometry.groups[4]（顺序：右、左、上、下、前、后）
        // 所以删除“上”这个 group
        geometry.clearGroups();
        // 重新添加除了“上(top)”之外的 5 个面
        const box = new THREE.BoxGeometry(4, 4, 4);
        box.groups.forEach((g, idx) => {
          if (idx !== 2) { // idx=2 → 上面(top)，跳过
            geometry.addGroup(g.start, g.count, 0);
          }
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.set(p.x, 2, -p.y);
        building.castShadow = true;
        building.receiveShadow = true;

        this.scene.add(building);
      });
    });



    // ---------------- 半开放建筑（墙体） ----------------
    (this.gardenData.semiOpenBuildings || []).forEach(seg => {
      for (let i = 0; i < seg.points.length - 1; i++) {
        const p1 = seg.points[i];
        const p2 = seg.points[i + 1];

        // 坐标转换 (x, z)
        const p1x = p1.x, p1z = -p1.y;
        const p2x = p2.x, p2z = -p2.y;

        const dx = p2x - p1x;
        const dz = p2z - p1z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length <= 0.01) continue;

        const wallHeight = 1;
        const wallThickness = 0.3;

        const geometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
        const material = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
        const wall = new THREE.Mesh(geometry, material);

        wall.position.set((p1x + p2x) / 2, wallHeight / 2, (p1z + p2z) / 2);

        // 旋转对齐方向
        const angle = Math.atan2(dz, dx);
        wall.rotation.y = -angle;

        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
      }
    });

    // ---------------- 道路 ----------------
    (this.gardenData.roads || []).forEach(seg => {
      for (let i = 0; i < seg.points.length - 1; i++) {
        const p1 = seg.points[i];
        const p2 = seg.points[i + 1];
        // 先做坐标转换（x, z）
        const p1x = p1.x, p1z = -p1.y;
        const p2x = p2.x, p2z = -p2.y;
        const dx = p2x - p1x, dz = p2z - p1z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length <= 0.0001) continue;
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(length, 0.2, 2),
            new THREE.MeshStandardMaterial({ color: 0x696969 })
        );
        road.position.set((p1x + p2x) / 2, 0.1, (p1z + p2z) / 2);
        const angle = Math.atan2(dz, dx); // 基于 x,z 方向计算角度
        road.rotation.y = -angle;
        road.receiveShadow = true;
        this.scene.add(road);
      }
    });

    // ---------------- 水体 ----------------
    (this.gardenData.waters || []).forEach(water => {
      const shape = new THREE.Shape(water.outer.map(p => new THREE.Vector2(p.x, p.y)));
      (water.holes || []).forEach(hole => {
        const holePath = new THREE.Path(hole.map(p => new THREE.Vector2(p.x, p.y)));
        shape.holes.push(holePath);
      });

      const geometry = new THREE.ShapeGeometry(shape);
      const waterMesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ color: 0x4A90E2, transparent: true, opacity: 0.6 })
      );

      waterMesh.rotation.x = -Math.PI/2;
      waterMesh.position.y = 0.02;
      this.scene.add(waterMesh);
    });

    // ---------------- 假山（岩石） ----------------
    (this.gardenData.rocks || []).forEach(seg => {
      seg.points.forEach(p => {
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5, 0),
            new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        rock.position.set(p.x + (Math.random() - 0.5) * 1.0, 0.5 + Math.random() * 0.8, -p.y + (Math.random() - 0.5) * 1.0);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
      });
    });

    // ---------------- 植物 ----------------
    (this.gardenData.plants || []).forEach(p => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.3, 1.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
      );
      trunk.position.y = 0.7;
      tree.add(trunk);

      const crown = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.6, (p.radius || 1.0)), 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x228B22 })
      );
      crown.position.y = 1.9;
      tree.add(crown);

      tree.position.set(p.x, 0, -p.y);
      tree.castShadow = true;
      tree.receiveShadow = true;
      this.scene.add(tree);
    });
  }

  // --------------------- 通用 ---------------------
  updateStatus(message) {
    const status = document.getElementById('status');
    if (status) status.innerHTML = message;
    console.log('状态：', message);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// 启动应用
console.log('启动园林场景...');
const app = new GardenScene();
window.app = app;
