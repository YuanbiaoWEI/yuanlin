// 园林三维场景生成主程序
import * as THREE from 'three';
import SceneManager from './src/sceneManager.js';
import GardenDataParser from './src/dataParser.js';
import TerrainGenerator from './src/terrainGenerator.js';
import BuildingExtruder from './src/buildingExtruder.js';
import MaterialManager from './src/materialManager.js';

class Garden3DApp {
  constructor() {
    this.sceneManager = new SceneManager();
    this.dataParser = new GardenDataParser();
    this.terrainGenerator = null;
    this.buildingExtruder = new BuildingExtruder();
    this.materialManager = new MaterialManager();
    this.gardenData = null;
    this.animationTime = 0;
    this.waterMaterials = [];

    this.init();
  }

  init() {
    // 启动渲染循环
    this.animate();

    // 添加UI控制
    this.setupUI();

    // 加载示例数据
    this.loadSampleData();
  }

  setupUI() {
    // 创建控制面板
    const controlPanel = document.createElement('div');
    controlPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: 'Microsoft YaHei', Arial, sans-serif;
      z-index: 100;
      max-width: 280px;
    `;

    controlPanel.innerHTML = `
      <h3 style="margin-top:0; color: #333;">江南园林3D生成器</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #666;">选择文件：</label>
        <input type="file" id="fileInput" accept=".json,.geojson,.dxf,.xlsx,.xls" style="width: 100%;" />
      </div>
      <div style="margin-bottom: 15px;">
        <button id="loadSampleBtn" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          加载示例数据
        </button>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: #666;">渲染模式：</label>
        <select id="renderMode" style="width: 100%; padding: 5px;">
          <option value="3d">三维场景</option>
          <option value="2d">平面预览</option>
        </select>
      </div>
      <div style="margin-bottom: 15px;">
        <label>
          <input type="checkbox" id="showTerrain" checked /> 显示地形
        </label><br/>
        <label>
          <input type="checkbox" id="showBuildings" checked /> 显示建筑
        </label><br/>
        <label>
          <input type="checkbox" id="showWater" checked /> 显示水体
        </label><br/>
        <label>
          <input type="checkbox" id="showPlants" checked /> 显示植物
        </label>
      </div>
      <div id="statusInfo" style="color: #666; font-size: 12px; padding-top: 10px; border-top: 1px solid #ddd;">
        准备就绪
      </div>
    `;

    document.body.appendChild(controlPanel);

    // 绑定事件
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files[0]);
    });

    document.getElementById('loadSampleBtn').addEventListener('click', () => {
      this.loadSampleData();
    });

    document.getElementById('renderMode').addEventListener('change', (e) => {
      this.switchRenderMode(e.target.value);
    });

    // 显示控制
    ['showTerrain', 'showBuildings', 'showWater', 'showPlants'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.updateVisibility();
      });
    });
  }

  // 处理文件上传
  async handleFileUpload(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // 处理Excel文件
      this.handleExcelFile(file);
    } else {
      // 处理其他格式文件
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
            const data = JSON.parse(e.target.result);
            this.processGeoJSON(data);
          } else if (fileName.endsWith('.dxf')) {
            this.updateStatus('DXF解析功能开发中...');
          }
        } catch (error) {
          this.updateStatus('文件解析失败: ' + error.message);
        }
      };

      reader.readAsText(file);
    }
  }

  // 处理Excel文件
  async handleExcelFile(file) {
    this.updateStatus('正在读取Excel文件...');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 动态导入XLSX库
        import('xlsx').then(XLSX => {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });

          // 使用数据解析器处理Excel数据
          this.gardenData = this.dataParser.parseExcelCoordinates(workbook);

          // 生成三维场景
          this.generate3DScene();

          this.updateStatus(`已加载Excel数据: ${this.countElements()}个要素`);
        });
      } catch (error) {
        this.updateStatus('Excel解析失败: ' + error.message);
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // 处理 GeoJSON 数据
  processGeoJSON(geojsonData) {
    this.updateStatus('正在解析数据...');

    // 解析数据
    this.gardenData = this.dataParser.parseGeoJSON(geojsonData);

    // 生成三维场景
    this.generate3DScene();

    this.updateStatus(`已加载: ${this.countElements()}个要素`);
  }

  // 生成三维场景
  generate3DScene() {
    // 清除旧场景
    this.sceneManager.clearAll();
    this.waterMaterials = [];

    // 调整相机到合适位置
    this.sceneManager.fitCameraToBounds(this.dataParser.bounds);

    const renderMode = document.getElementById('renderMode').value;

    if (renderMode === '3d') {
      // 生成三维场景
      this.generate3DGeometry();
    } else {
      // 生成平面预览
      this.generateBasicGeometry();
    }
  }

  // 生成三维几何体
  generate3DGeometry() {
    const bounds = this.dataParser.bounds;
    if (!bounds) return;

    this.updateStatus('正在生成地形...');

    // 1. 生成地形
    this.terrainGenerator = new TerrainGenerator(bounds, 2);
    const heightMap = this.terrainGenerator.generateHeightMap(this.gardenData.waters);
    const terrainMesh = this.terrainGenerator.createTerrainMesh({
      color: 0x8FBC8F,
      wireframe: false
    });
    if (terrainMesh) {
      this.sceneManager.addMesh(terrainMesh, 'terrain');
    }

    this.updateStatus('正在生成水体...');

    // 2. 生成水体
    this.generate3DWater();

    this.updateStatus('正在生成道路...');

    // 3. 生成道路
    this.generate3DRoads();

    this.updateStatus('正在生成建筑...');

    // 4. 生成建筑
    this.generate3DBuildings();

    // 5. 生成山石
    this.generate3DRocks();

    this.updateStatus('正在生成植物...');

    // 6. 生成植物
    this.generate3DPlants();

    this.updateStatus('三维场景生成完成');
  }

  // 生成三维水体
  generate3DWater() {
    const waters = this.gardenData.waters;
    if (!waters || waters.length === 0) return;

    waters.forEach(water => {
      const shape = this.createShapeFromCoords(water.coordinates);
      if (!shape) return;

      const geometry = new THREE.ShapeGeometry(shape);
      const waterMaterial = this.materialManager.createWaterShaderMaterial();
      const mesh = new THREE.Mesh(geometry, waterMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.1;
      mesh.receiveShadow = true;

      this.waterMaterials.push(waterMaterial);
      this.sceneManager.addMesh(mesh, 'water');
    });
  }

  // 生成三维道路
  generate3DRoads() {
    const roads = this.gardenData.roads;
    if (!roads || roads.length === 0) return;

    roads.forEach(road => {
      const shape = this.createShapeFromCoords(road.coordinates);
      if (!shape) return;

      const geometry = new THREE.ShapeGeometry(shape);
      const material = this.materialManager.getMaterial('road');
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;

      // 道路贴地，但略高于地形
      if (this.terrainGenerator) {
        const [x, y] = road.centroid;
        const height = this.terrainGenerator.getHeightAt(x, y);
        mesh.position.y = height + 0.2;
      } else {
        mesh.position.y = 0.3;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.sceneManager.addMesh(mesh, 'roads');
    });
  }

  // 生成三维建筑
  generate3DBuildings() {
    // 实体建筑
    const buildings = this.gardenData.buildings;
    if (buildings && buildings.length > 0) {
      buildings.forEach(building => {
        const buildingMesh = this.buildingExtruder.createSolidBuilding(
            building.coordinates,
            { height: 6 + Math.random() * 4 }
        );

        if (buildingMesh) {
          // 设置建筑位置（贴地）
          if (this.terrainGenerator) {
            const [x, y] = building.centroid;
            const height = this.terrainGenerator.getHeightAt(x, y);
            buildingMesh.position.y = height;
          }

          this.sceneManager.addMesh(buildingMesh, 'buildings');
        }
      });
    }

    // 半开放建筑
    const semiOpenBuildings = this.gardenData.semiOpenBuildings;
    if (semiOpenBuildings && semiOpenBuildings.length > 0) {
      semiOpenBuildings.forEach(building => {
        const buildingMesh = this.buildingExtruder.createSemiOpenBuilding(
            building.coordinates,
            { height: 5 + Math.random() * 2 }
        );

        if (buildingMesh) {
          // 设置建筑位置（贴地）
          if (this.terrainGenerator) {
            const [x, y] = building.centroid;
            const height = this.terrainGenerator.getHeightAt(x, y);
            buildingMesh.position.y = height;
          }

          this.sceneManager.addMesh(buildingMesh, 'buildings');
        }
      });
    }
  }

  // 生成三维山石
  generate3DRocks() {
    const rocks = this.gardenData.rocks;
    if (!rocks || rocks.length === 0) return;

    rocks.forEach(rock => {
      // 使用不规则几何体表示山石
      const geometry = new THREE.DodecahedronGeometry(
          2 + Math.random() * 3,
          0
      );

      // 随机变形
      const vertices = geometry.attributes.position.array;
      for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] *= 0.8 + Math.random() * 0.4;
        vertices[i + 1] *= 0.6 + Math.random() * 0.4;
        vertices[i + 2] *= 0.8 + Math.random() * 0.4;
      }
      geometry.computeVertexNormals();

      const material = this.materialManager.getMaterial('rock');
      const mesh = new THREE.Mesh(geometry, material);

      const [x, y] = rock.centroid;
      let height = 0;
      if (this.terrainGenerator) {
        height = this.terrainGenerator.getHeightAt(x, y);
      }

      mesh.position.set(x, height + 1, y);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.sceneManager.addMesh(mesh, 'rocks');
    });
  }

  // 生成三维植物
  generate3DPlants() {
    const plants = this.gardenData.plants;
    if (!plants || plants.length === 0) return;

    plants.forEach(plant => {
      // 创建简化的树木模型
      const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
      const trunkMaterial = this.materialManager.getMaterial('wood');
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

      const radius = plant.properties?.radius || 2;
      const foliageGeometry = new THREE.SphereGeometry(radius, 8, 6);
      const foliageMaterial = this.materialManager.getMaterial('foliage');
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 3;

      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(foliage);

      const [x, y] = plant.centroid;
      let height = 0;
      if (this.terrainGenerator) {
        height = this.terrainGenerator.getHeightAt(x, y);
      }

      tree.position.set(x, height + 1.5, y);
      tree.castShadow = true;
      tree.receiveShadow = true;

      // 随机旋转和缩放
      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.scale.setScalar(0.8 + Math.random() * 0.4);

      this.sceneManager.addMesh(tree, 'plants');
    });
  }

  // 生成基础几何体（2D预览）
  generateBasicGeometry() {
    const bounds = this.dataParser.bounds;
    if (!bounds) return;

    // 创建地面
    const groundSize = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 1.5;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8FBC8F });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.sceneManager.addMesh(ground, 'terrain');

    // 显示各类要素的平面轮廓
    this.renderLayer('waters', 0x4A90E2, 0.1);
    this.renderLayer('roads', 0x808080, 0.2);
    this.renderLayer('buildings', 0x8B4513, 0.3);
    this.renderLayer('rocks', 0x696969, 0.25);

    // 显示植物点
    this.renderPlants();
  }

  // 切换渲染模式
  switchRenderMode(mode) {
    if (this.gardenData) {
      this.generate3DScene();
    }
  }

  // 更新可见性
  updateVisibility() {
    const showTerrain = document.getElementById('showTerrain').checked;
    const showBuildings = document.getElementById('showBuildings').checked;
    const showWater = document.getElementById('showWater').checked;
    const showPlants = document.getElementById('showPlants').checked;

    this.sceneManager.meshGroups.terrain.visible = showTerrain;
    this.sceneManager.meshGroups.buildings.visible = showBuildings;
    this.sceneManager.meshGroups.water.visible = showWater;
    this.sceneManager.meshGroups.plants.visible = showPlants;
    this.sceneManager.meshGroups.roads.visible = true; // 道路始终显示
    this.sceneManager.meshGroups.rocks.visible = true; // 山石始终显示
  }

  // 渲染图层
  renderLayer(layerName, color, height = 0) {
    const layer = this.gardenData[layerName];
    if (!layer || layer.length === 0) return;

    layer.forEach(item => {
      const shape = this.createShapeFromCoords(item.coordinates);
      if (!shape) return;

      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshLambertMaterial({
        color: color,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = height;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.sceneManager.addMesh(mesh, layerName);
    });
  }

  // 从坐标创建形状
  createShapeFromCoords(coords) {
    if (!coords || coords.length < 3) return null;

    const shape = new THREE.Shape();
    coords.forEach((coord, index) => {
      if (index === 0) {
        shape.moveTo(coord[0], coord[1]);
      } else {
        shape.lineTo(coord[0], coord[1]);
      }
    });
    shape.closePath();

    return shape;
  }

  // 渲染植物
  renderPlants() {
    const plants = this.gardenData.plants;
    if (!plants || plants.length === 0) return;

    const geometry = new THREE.SphereGeometry(1.5, 8, 6);
    const material = new THREE.MeshLambertMaterial({ color: 0x228B22 });

    plants.forEach(plant => {
      const mesh = new THREE.Mesh(geometry, material);
      const [x, y] = plant.centroid;
      mesh.position.set(x, 2, y);
      mesh.castShadow = true;

      this.sceneManager.addMesh(mesh, 'plants');
    });
  }

  // 加载示例数据
  loadSampleData() {
    this.updateStatus('正在生成示例数据...');

    // 创建示例 GeoJSON 数据
    const sampleData = {
      type: "FeatureCollection",
      features: [
        // 水体
        {
          type: "Feature",
          properties: { layer: "water" },
          geometry: {
            type: "Polygon",
            coordinates: [[[10, 10], [30, 10], [30, 25], [10, 25], [10, 10]]]
          }
        },
        // 建筑
        {
          type: "Feature",
          properties: { layer: "building" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-20, -10], [-5, -10], [-5, 0], [-20, 0], [-20, -10]]]
          }
        },
        // 半开放建筑
        {
          type: "Feature",
          properties: { layer: "semi_open_building" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-10, 20], [0, 20], [0, 30], [-10, 30], [-10, 20]]]
          }
        },
        // 道路
        {
          type: "Feature",
          properties: { layer: "road" },
          geometry: {
            type: "Polygon",
            coordinates: [[[-30, 0], [40, 0], [40, 5], [-30, 5], [-30, 0]]]
          }
        },
        // 山石
        {
          type: "Feature",
          properties: { layer: "rock" },
          geometry: {
            type: "Polygon",
            coordinates: [[[35, -10], [40, -10], [40, -5], [35, -5], [35, -10]]]
          }
        },
        // 植物
        {
          type: "Feature",
          properties: { layer: "plant", radius: 2 },
          geometry: {
            type: "Point",
            coordinates: [5, -15]
          }
        },
        {
          type: "Feature",
          properties: { layer: "plant", radius: 3 },
          geometry: {
            type: "Point",
            coordinates: [-10, 15]
          }
        },
        {
          type: "Feature",
          properties: { layer: "plant", radius: 2.5 },
          geometry: {
            type: "Point",
            coordinates: [25, -5]
          }
        }
      ]
    };

    this.processGeoJSON(sampleData);
  }

  // 动画循环
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // 更新时间
    this.animationTime += 0.01;

    // 更新水面着色器
    this.waterMaterials.forEach(material => {
      this.materialManager.updateWaterTime(material, this.animationTime);
    });

    this.sceneManager.controls.update();
    this.sceneManager.renderer.render(
        this.sceneManager.scene,
        this.sceneManager.camera
    );
  }

  // 统计要素数量
  countElements() {
    let count = 0;
    Object.values(this.gardenData).forEach(layer => {
      count += layer.length;
    });
    return count;
  }

  // 更新状态信息
  updateStatus(message) {
    const statusEl = document.getElementById('statusInfo');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
  new Garden3DApp();
});