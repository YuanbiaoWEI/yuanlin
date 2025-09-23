// 地形生成器
import * as THREE from 'three';

class TerrainGenerator {
    constructor(bounds, resolution = 1) {
        this.bounds = bounds;
        this.resolution = resolution; // 地形网格分辨率
        this.heightMap = [];
        this.waterBodies = [];
        this.maxHeight = 5; // 最大高度
        this.falloffDistance = 30; // 高度衰减距离
    }

    // 生成地形高度图
    generateHeightMap(waterAreas) {
        this.waterBodies = waterAreas;

        const width = Math.ceil((this.bounds.maxX - this.bounds.minX) / this.resolution);
        const height = Math.ceil((this.bounds.maxY - this.bounds.minY) / this.resolution);

        this.heightMap = [];

        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const worldX = this.bounds.minX + x * this.resolution;
                const worldY = this.bounds.minY + y * this.resolution;

                // 计算到最近水体的距离
                const distanceToWater = this.getDistanceToWater(worldX, worldY);

                // 根据距离计算高度
                let elevation = 0;
                if (distanceToWater > 0) {
                    // 使用平滑的高度过渡
                    elevation = Math.min(this.maxHeight,
                        this.maxHeight * Math.pow(distanceToWater / this.falloffDistance, 0.5));

                    // 添加一些噪声使地形更自然
                    elevation += this.noise(worldX * 0.05, worldY * 0.05) * 0.5;
                }

                row.push(elevation);
            }
            this.heightMap.push(row);
        }

        // 平滑高度图
        this.smoothHeightMap(2);

        return this.heightMap;
    }

    // 计算点到最近水体的距离
    getDistanceToWater(x, y) {
        let minDistance = Infinity;

        this.waterBodies.forEach(water => {
            if (this.isPointInPolygon(x, y, water.coordinates)) {
                minDistance = 0;
                return;
            }

            const distance = this.getDistanceToPolygon(x, y, water.coordinates);
            minDistance = Math.min(minDistance, distance);
        });

        return minDistance;
    }

    // 判断点是否在多边形内
    isPointInPolygon(x, y, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    // 计算点到多边形的最短距离
    getDistanceToPolygon(x, y, polygon) {
        let minDistance = Infinity;

        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            const distance = this.pointToLineDistance(
                x, y,
                polygon[i][0], polygon[i][1],
                polygon[j][0], polygon[j][1]
            );
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance;
    }

    // 点到线段的距离
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // 简单的噪声函数
    noise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }

    // 平滑高度图
    smoothHeightMap(iterations = 1) {
        for (let iter = 0; iter < iterations; iter++) {
            const newHeightMap = [];

            for (let y = 0; y < this.heightMap.length; y++) {
                const row = [];
                for (let x = 0; x < this.heightMap[y].length; x++) {
                    let sum = 0;
                    let count = 0;

                    // 3x3卷积核
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy;
                            const nx = x + dx;

                            if (ny >= 0 && ny < this.heightMap.length &&
                                nx >= 0 && nx < this.heightMap[ny].length) {
                                const weight = (dx === 0 && dy === 0) ? 2 : 1;
                                sum += this.heightMap[ny][nx] * weight;
                                count += weight;
                            }
                        }
                    }

                    row.push(sum / count);
                }
                newHeightMap.push(row);
            }

            this.heightMap = newHeightMap;
        }
    }

    // 创建地形网格
    createTerrainMesh(materialOptions = {}) {
        if (!this.heightMap || this.heightMap.length === 0) {
            console.warn('高度图未生成');
            return null;
        }

        const width = this.heightMap[0].length;
        const height = this.heightMap.length;

        // 创建平面几何体
        const geometry = new THREE.PlaneGeometry(
            (this.bounds.maxX - this.bounds.minX),
            (this.bounds.maxY - this.bounds.minY),
            width - 1,
            height - 1
        );

        // 应用高度图到顶点
        const vertices = geometry.attributes.position.array;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 3;
                vertices[index + 2] = this.heightMap[y][x]; // 设置Z坐标（高度）
            }
        }

        // 重新计算法线
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;

        // 创建材质
        const material = new THREE.MeshStandardMaterial({
            color: materialOptions.color || 0x8FBC8F,
            roughness: materialOptions.roughness || 0.8,
            metalness: materialOptions.metalness || 0.2,
            wireframe: materialOptions.wireframe || false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
            (this.bounds.minX + this.bounds.maxX) / 2,
            0,
            (this.bounds.minY + this.bounds.maxY) / 2
        );
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        return mesh;
    }

    // 获取特定位置的高度
    getHeightAt(x, y) {
        if (!this.heightMap || this.heightMap.length === 0) return 0;

        // 转换世界坐标到高度图索引
        const gridX = Math.floor((x - this.bounds.minX) / this.resolution);
        const gridY = Math.floor((y - this.bounds.minY) / this.resolution);

        // 边界检查
        if (gridX < 0 || gridX >= this.heightMap[0].length - 1 ||
            gridY < 0 || gridY >= this.heightMap.length - 1) {
            return 0;
        }

        // 双线性插值获得平滑的高度
        const fx = (x - this.bounds.minX) / this.resolution - gridX;
        const fy = (y - this.bounds.minY) / this.resolution - gridY;

        const h00 = this.heightMap[gridY][gridX];
        const h10 = this.heightMap[gridY][gridX + 1];
        const h01 = this.heightMap[gridY + 1][gridX];
        const h11 = this.heightMap[gridY + 1][gridX + 1];

        const h0 = h00 * (1 - fx) + h10 * fx;
        const h1 = h01 * (1 - fx) + h11 * fx;

        return h0 * (1 - fy) + h1 * fy;
    }
}

export default TerrainGenerator;