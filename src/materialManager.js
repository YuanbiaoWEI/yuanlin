// materialManager.js - 管理所有材质和纹理
import * as THREE from 'three';

export class MaterialManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.materials = {};
        this.textures = {};
        this.init();
    }

    init() {
        // 创建程序化纹理
        this.createProceduralTextures();

        // 创建材质
        this.createMaterials();
    }

    // 创建程序化纹理（当无法加载外部纹理时使用）
    createProceduralTextures() {
        // 石板纹理
        this.textures.stone = this.createStoneTexture();

        // 草地纹理
        this.textures.grass = this.createGrassTexture();

        // 瓦片纹理
        this.textures.tile = this.createTileTexture();

        // 水纹理
        this.textures.water = this.createWaterTexture();

        // 木材纹理
        this.textures.wood = this.createWoodTexture();
    }

    // 创建石材纹理
    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 基础颜色
        ctx.fillStyle = '#8B8680';
        ctx.fillRect(0, 0, 512, 512);

        // 添加噪点和纹理
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const brightness = Math.random() * 0.3 + 0.7;
            ctx.fillStyle = `rgba(139, 134, 128, ${brightness})`;
            ctx.fillRect(x, y, 2, 2);
        }

        // 添加裂缝
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }

    // 创建草地纹理
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 基础绿色
        ctx.fillStyle = '#567d46';
        ctx.fillRect(0, 0, 512, 512);

        // 添加草的纹理
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const greenVariation = Math.random() * 30 - 15;
            const g = 125 + greenVariation;
            ctx.fillStyle = `rgb(${86 + greenVariation / 2}, ${g}, 70)`;
            ctx.fillRect(x, y, 1, 3);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        return texture;
    }

    // 创建瓦片纹理
    createTileTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 深灰色基底
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(0, 0, 512, 512);

        // 绘制瓦片图案
        const tileSize = 64;
        ctx.strokeStyle = '#3A3A3A';
        ctx.lineWidth = 2;

        for (let x = 0; x < 512; x += tileSize) {
            for (let y = 0; y < 512; y += tileSize) {
                // 瓦片主体
                ctx.fillStyle = `hsl(0, 0%, ${25 + Math.random() * 10}%)`;
                ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

                // 瓦片边缘
                ctx.strokeRect(x, y, tileSize, tileSize);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    // 创建水纹理
    createWaterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 渐变蓝色
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#4A90E2');
        gradient.addColorStop(0.5, '#357ABD');
        gradient.addColorStop(1, '#2968A8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // 添加波纹
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 50 + 10;
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    // 创建木材纹理
    createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 木纹基色
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 512, 512);

        // 绘制木纹
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let y = 0; y < 512; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y + Math.sin(y * 0.1) * 5);
            for (let x = 0; x < 512; x += 10) {
                ctx.lineTo(x, y + Math.sin(x * 0.05) * 3);
            }
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    // 创建材质
    createMaterials() {
        // 地形材质
        this.materials.terrain = new THREE.MeshStandardMaterial({
            map: this.textures.grass,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        // 道路材质
        this.materials.road = new THREE.MeshStandardMaterial({
            map: this.textures.stone,
            roughness: 0.7,
            metalness: 0.2,
            color: new THREE.Color(0x888888)
        });

        // 建筑墙体材质
        this.materials.buildingWall = new THREE.MeshStandardMaterial({
            map: this.textures.stone,
            roughness: 0.6,
            metalness: 0.1,
            color: new THREE.Color(0xf5f5dc) // 米色
        });

        // 建筑屋顶材质
        this.materials.buildingRoof = new THREE.MeshStandardMaterial({
            map: this.textures.tile,
            roughness: 0.5,
            metalness: 0.3,
            color: new THREE.Color(0x8B4513) // 深褐色
        });

        // 建筑地基材质
        this.materials.buildingFoundation = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x696969),
            roughness: 0.9,
            metalness: 0.1
        });

        // 柱子材质
        this.materials.pillar = new THREE.MeshStandardMaterial({
            map: this.textures.wood,
            roughness: 0.7,
            metalness: 0.1,
            color: new THREE.Color(0x8B4513)
        });

        // 水体材质
        this.materials.water = new THREE.MeshStandardMaterial({
            map: this.textures.water,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.8,
            side: THREE.DoubleSide
        });

        // 岩石材质
        this.materials.rock = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x696969),
            roughness: 0.9,
            metalness: 0.1
        });

        // 植物材质
        this.materials.tree = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x228B22),
            roughness: 0.8,
            metalness: 0.1
        });

        this.materials.treeTrunk = new THREE.MeshStandardMaterial({
            map: this.textures.wood,
            roughness: 0.8,
            metalness: 0.1,
            color: new THREE.Color(0x654321)
        });
    }

    // 获取建筑材质集合
    getBuildingMaterials() {
        return {
            wall: this.materials.buildingWall,
            roof: this.materials.buildingRoof,
            foundation: this.materials.buildingFoundation,
            pillar: this.materials.pillar
        };
    }

    // 加载外部纹理（可选）
    async loadExternalTextures(textureUrls) {
        if (textureUrls.stone) {
            this.textures.stone = await this.loadTexture(textureUrls.stone);
            this.materials.road.map = this.textures.stone;
            this.materials.buildingWall.map = this.textures.stone;
        }

        if (textureUrls.grass) {
            this.textures.grass = await this.loadTexture(textureUrls.grass);
            this.materials.terrain.map = this.textures.grass;
        }

        if (textureUrls.tile) {
            this.textures.tile = await this.loadTexture(textureUrls.tile);
            this.materials.buildingRoof.map = this.textures.tile;
        }
    }

    // 加载单个纹理
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url,
                (texture) => {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }

    // 性能优化：降低移动端纹理质量
    optimizeForMobile() {
        Object.values(this.textures).forEach(texture => {
            if (texture.image && texture.image.width > 256) {
                // 降低纹理分辨率
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }
        });

        // 降低材质质量
        Object.values(this.materials).forEach(material => {
            if (material.roughness !== undefined) {
                material.roughness = Math.min(material.roughness + 0.1, 1);
            }
        });
    }
}