// 材质管理器
import * as THREE from 'three';

class MaterialManager {
    constructor() {
        this.materials = {};
        this.textures = {};
        this.loadDefaultTextures();
        this.createDefaultMaterials();
    }

    // 加载默认纹理
    loadDefaultTextures() {
        const textureLoader = new THREE.TextureLoader();

        // 创建程序化纹理
        this.textures.grass = this.createGrassTexture();
        this.textures.stone = this.createStoneTexture();
        this.textures.water = this.createWaterTexture();
        this.textures.wood = this.createWoodTexture();
    }

    // 创建草地纹理（程序化生成）
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 基础颜色
        ctx.fillStyle = '#5A8F5A';
        ctx.fillRect(0, 0, 512, 512);

        // 添加噪点和变化
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const brightness = 0.3 + Math.random() * 0.4;
            ctx.fillStyle = `rgba(90, ${143 + Math.random() * 30}, 90, ${brightness})`;
            ctx.fillRect(x, y, 2, 2);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);

        return texture;
    }

    // 创建石板纹理（程序化生成）
    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 基础颜色
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 256, 256);

        // 添加石板缝隙
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 2;

        // 横向缝隙
        for (let y = 0; y < 256; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(256, y);
            ctx.stroke();
        }

        // 纵向缝隙（交错）
        for (let y = 0; y < 256; y += 64) {
            const offset = (y / 64) % 2 === 0 ? 0 : 32;
            for (let x = offset; x < 256; x += 64) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + 64);
                ctx.stroke();
            }
        }

        // 添加纹理细节
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const brightness = 0.7 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(128, 128, 128, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5, 5);

        return texture;
    }

    // 创建水面纹理
    createWaterTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 创建渐变
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#4A90E2');
        gradient.addColorStop(0.5, '#5BA0F2');
        gradient.addColorStop(1, '#4A90E2');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // 添加波纹效果
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.arc(x, y, Math.random() * 50 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);

        return texture;
    }

    // 创建木材纹理
    createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 基础颜色
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 256, 512);

        // 添加木纹
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;

        for (let y = 0; y < 512; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);

            // 创建波浪形木纹
            for (let x = 0; x < 256; x += 4) {
                const offset = Math.sin(x * 0.05) * 3;
                ctx.lineTo(x, y + offset);
            }

            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 2);

        return texture;
    }

    // 创建默认材质
    createDefaultMaterials() {
        // 草地材质
        this.materials.grass = new THREE.MeshStandardMaterial({
            map: this.textures.grass,
            roughness: 0.9,
            metalness: 0.1,
            color: 0x8FBC8F
        });

        // 道路材质（石板）
        this.materials.road = new THREE.MeshStandardMaterial({
            map: this.textures.stone,
            roughness: 0.8,
            metalness: 0.2,
            color: 0x808080
        });

        // 水面材质（带反射）
        this.materials.water = new THREE.MeshPhysicalMaterial({
            map: this.textures.water,
            color: 0x4A90E2,
            metalness: 0.0,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            transparent: true,
            opacity: 0.8,
            reflectivity: 0.9,
            envMapIntensity: 1.0
        });

        // 建筑墙体材质
        this.materials.wall = new THREE.MeshStandardMaterial({
            color: 0xF5DEB3,
            roughness: 0.9,
            metalness: 0.1
        });

        // 屋顶瓦片材质
        this.materials.roof = new THREE.MeshStandardMaterial({
            color: 0x4A4A4A,
            roughness: 0.7,
            metalness: 0.2
        });

        // 木材材质（柱子、梁等）
        this.materials.wood = new THREE.MeshStandardMaterial({
            map: this.textures.wood,
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.1
        });

        // 山石材质
        this.materials.rock = new THREE.MeshStandardMaterial({
            color: 0x696969,
            roughness: 0.95,
            metalness: 0.05
        });

        // 植物材质
        this.materials.foliage = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        // 半透明窗户材质
        this.materials.window = new THREE.MeshPhysicalMaterial({
            color: 0x87CEEB,
            metalness: 0.0,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            transmission: 0.9,
            thickness: 0.1
        });
    }

    // 创建水面着色器材质
    createWaterShaderMaterial() {
        const waterShader = {
            uniforms: {
                time: { value: 0 },
                waterColor: { value: new THREE.Color(0x4A90E2) },
                sunDirection: { value: new THREE.Vector3(0.70707, 0.70707, 0) },
                distortionScale: { value: 3.7 },
                alpha: { value: 0.8 }
            },
            vertexShader: `
        uniform float time;
        uniform float distortionScale;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          
          vec3 pos = position;
          
          // 添加波浪效果
          float wave1 = sin(position.x * 0.1 + time) * 0.2;
          float wave2 = sin(position.y * 0.15 + time * 1.3) * 0.15;
          pos.z += wave1 + wave2;
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
            fragmentShader: `
        uniform float time;
        uniform vec3 waterColor;
        uniform vec3 sunDirection;
        uniform float alpha;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          // 基础颜色
          vec3 color = waterColor;
          
          // 添加波纹纹理
          float ripple1 = sin(vUv.x * 50.0 + time) * 0.05;
          float ripple2 = sin(vUv.y * 50.0 + time * 1.2) * 0.05;
          color += vec3(ripple1 + ripple2);
          
          // 简单的反射效果
          float fresnel = pow(1.0 - dot(vNormal, vec3(0, 0, 1)), 2.0);
          color = mix(color, vec3(1.0), fresnel * 0.5);
          
          // 阳光反射
          vec3 reflectDir = reflect(-sunDirection, vNormal);
          float spec = pow(max(dot(reflectDir, vec3(0, 0, 1)), 0.0), 64.0);
          color += vec3(1.0) * spec * 0.5;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide
        };

        return new THREE.ShaderMaterial(waterShader);
    }

    // 获取材质
    getMaterial(name) {
        return this.materials[name] || this.materials.wall;
    }

    // 更新水面着色器时间
    updateWaterTime(material, time) {
        if (material.uniforms && material.uniforms.time) {
            material.uniforms.time.value = time;
        }
    }

    // 创建地形混合材质
    createTerrainMaterial(waterDistance) {
        // 根据到水体的距离混合草地和石材质
        const blendFactor = Math.min(1, waterDistance / 20);

        return new THREE.MeshStandardMaterial({
            color: new THREE.Color().lerpColors(
                new THREE.Color(0x808080), // 石头颜色
                new THREE.Color(0x8FBC8F), // 草地颜色
                blendFactor
            ),
            roughness: 0.9 - blendFactor * 0.2,
            metalness: 0.1
        });
    }

    // 释放资源
    dispose() {
        Object.values(this.materials).forEach(material => {
            if (material.dispose) material.dispose();
        });

        Object.values(this.textures).forEach(texture => {
            if (texture.dispose) texture.dispose();
        });
    }
}

export default MaterialManager;