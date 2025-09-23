// 三维场景管理器
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class SceneManager {
    constructor(container = document.body) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.meshGroups = {
            terrain: new THREE.Group(),
            water: new THREE.Group(),
            buildings: new THREE.Group(),
            roads: new THREE.Group(),
            rocks: new THREE.Group(),
            plants: new THREE.Group()
        };

        this.init();
    }

    init() {
        // 初始化场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xE8F4F8);
        this.scene.fog = new THREE.Fog(0xE8F4F8, 100, 500);

        // 初始化相机
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(100, 80, 150);
        this.camera.lookAt(0, 0, 0);

        // 初始化渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.container.appendChild(this.renderer.domElement);

        // 初始化控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI * 0.45;

        // 添加光照
        this.setupLighting();

        // 添加组到场景
        Object.values(this.meshGroups).forEach(group => {
            this.scene.add(group);
        });

        // 窗口大小调整
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 主方向光（太阳光）
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 300;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        // 补充光
        const fillLight = new THREE.DirectionalLight(0xB0D0FF, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);

        // 半球光（天空与地面反射）
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4);
        this.scene.add(hemisphereLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // 添加网格到对应组
    addMesh(mesh, groupName) {
        if (this.meshGroups[groupName]) {
            this.meshGroups[groupName].add(mesh);
        }
    }

    // 清除特定组的内容
    clearGroup(groupName) {
        if (this.meshGroups[groupName]) {
            while (this.meshGroups[groupName].children.length > 0) {
                const child = this.meshGroups[groupName].children[0];
                this.meshGroups[groupName].remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        }
    }

    // 清除所有内容
    clearAll() {
        Object.keys(this.meshGroups).forEach(groupName => {
            this.clearGroup(groupName);
        });
    }

    // 渲染循环
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // 设置相机位置以适应园林边界
    fitCameraToBounds(bounds) {
        if (!bounds) return;

        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const maxDim = Math.max(width, height);

        const distance = maxDim * 1.5;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        this.camera.position.set(centerX + distance * 0.5, distance, centerY + distance * 0.5);
        this.controls.target.set(centerX, 0, centerY);
        this.controls.update();
    }

    // 获取渲染器
    getRenderer() {
        return this.renderer;
    }

    // 获取场景
    getScene() {
        return this.scene;
    }

    // 获取相机
    getCamera() {
        return this.camera;
    }
}

export default SceneManager;