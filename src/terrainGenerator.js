// terrainGenerator.js - 生成园林地形
import * as THREE from 'three';
import Delaunator from 'delaunator';

export class TerrainGenerator {
    constructor(bounds, resolution = 2) {
        this.bounds = bounds;
        this.resolution = resolution; // 网格分辨率（米）
        this.maxHeight = 5; // 最大高度（米）
        this.heightMap = [];
        this.points = [];
        this.triangles = [];
    }

    // 生成地形
    generate(waterBodies, rockAreas) {
        // 生成网格点
        this.generateGridPoints();

        // 计算高度图
        this.calculateHeightMap(waterBodies, rockAreas);

        // 三角剖分
        this.triangulate();

        // 创建地形几何体
        return this.createTerrainGeometry();
    }

    // 生成网格点
    generateGridPoints() {
        const width = this.bounds.max.x - this.bounds.min.x;
        const height = this.bounds.max.y - this.bounds.min.y;
        const cols = Math.ceil(width / this.resolution);
        const rows = Math.ceil(height / this.resolution);

        this.points = [];
        this.heightMap = [];

        for (let row = 0; row <= rows; row++) {
            for (let col = 0; col <= cols; col++) {
                const x = this.bounds.min.x + col * this.resolution;
                const y = this.bounds.min.y + row * this.resolution;
                this.points.push([x, y]);
                this.heightMap.push(0);
            }
        }
    }

    // 计算高度图
    calculateHeightMap(waterBodies, rockAreas) {
        for (let i = 0; i < this.points.length; i++) {
            const [x, y] = this.points[i];
            let height = 0;

            // 计算到最近水体的距离
            let minWaterDistance = Infinity;
            waterBodies.forEach(water => {
                water.points.forEach((point, idx) => {
                    if (idx < water.points.length - 1) {
                        const dist = this.pointToLineDistance(
                            { x, y },
                            water.points[idx],
                            water.points[idx + 1]
                        );
                        minWaterDistance = Math.min(minWaterDistance, dist);
                    }
                });
            });

            // 基础高度：距离水体越远越高
            if (minWaterDistance < Infinity) {
                height = Math.min(minWaterDistance * 0.02, this.maxHeight * 0.5);
            }

            // 山体区域增加高度和扰动
            let nearRock = false;
            rockAreas.forEach(rock => {
                if (this.isPointInPolygon({ x, y }, rock.points)) {
                    nearRock = true;
                    // 添加随机扰动形成自然起伏
                    height += this.maxHeight * 0.3 + Math.random() * this.maxHeight * 0.4;
                }
            });

            // 添加柏林噪声使地形更自然
            height += this.perlinNoise(x * 0.05, y * 0.05) * 0.5;

            // 确保水体区域高度为0
            let inWater = false;
            waterBodies.forEach(water => {
                if (this.isPointInPolygon({ x, y }, water.points)) {
                    inWater = true;
                    height = 0;
                }
            });

            this.heightMap[i] = Math.max(0, height);
        }
    }

    // 三角剖分
    triangulate() {
        const delaunay = Delaunator.from(this.points);
        this.triangles = delaunay.triangles;
    }

    // 创建地形几何体
    createTerrainGeometry() {
        const geometry = new THREE.BufferGeometry();

        // 顶点数组
        const vertices = [];
        const normals = [];
        const uvs = [];

        // 添加所有顶点
        for (let i = 0; i < this.points.length; i++) {
            const [x, y] = this.points[i];
            const z = this.heightMap[i];
            vertices.push(x, z, y); // 注意：Three.js使用Y轴作为高度

            // UV坐标
            const u = (x - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x);
            const v = (y - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y);
            uvs.push(u * 10, v * 10); // 重复贴图
        }

        // 计算法线
        const tempNormals = new Array(vertices.length).fill(0);
        for (let i = 0; i < this.triangles.length; i += 3) {
            const a = this.triangles[i];
            const b = this.triangles[i + 1];
            const c = this.triangles[i + 2];

            // 计算三角形法线
            const v1 = new THREE.Vector3(
                vertices[a * 3] - vertices[b * 3],
                vertices[a * 3 + 1] - vertices[b * 3 + 1],
                vertices[a * 3 + 2] - vertices[b * 3 + 2]
            );
            const v2 = new THREE.Vector3(
                vertices[c * 3] - vertices[b * 3],
                vertices[c * 3 + 1] - vertices[b * 3 + 1],
                vertices[c * 3 + 2] - vertices[b * 3 + 2]
            );
            const normal = v1.cross(v2).normalize();

            // 累加到顶点法线
            tempNormals[a * 3] += normal.x;
            tempNormals[a * 3 + 1] += normal.y;
            tempNormals[a * 3 + 2] += normal.z;
            tempNormals[b * 3] += normal.x;
            tempNormals[b * 3 + 1] += normal.y;
            tempNormals[b * 3 + 2] += normal.z;
            tempNormals[c * 3] += normal.x;
            tempNormals[c * 3 + 1] += normal.y;
            tempNormals[c * 3 + 2] += normal.z;
        }

        // 归一化法线
        for (let i = 0; i < tempNormals.length; i += 3) {
            const len = Math.sqrt(
                tempNormals[i] ** 2 +
                tempNormals[i + 1] ** 2 +
                tempNormals[i + 2] ** 2
            );
            if (len > 0) {
                normals.push(
                    tempNormals[i] / len,
                    tempNormals[i + 1] / len,
                    tempNormals[i + 2] / len
                );
            } else {
                normals.push(0, 1, 0);
            }
        }

        // 设置几何体属性
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(this.triangles);

        return geometry;
    }

    // 获取指定位置的高度
    getHeightAt(x, y) {
        // 找到最近的网格点
        let minDist = Infinity;
        let nearestHeight = 0;

        for (let i = 0; i < this.points.length; i++) {
            const [px, py] = this.points[i];
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearestHeight = this.heightMap[i];
            }
        }

        return nearestHeight;
    }

    // 点到线段的距离
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 判断点是否在多边形内
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // 简单的柏林噪声实现
    perlinNoise(x, y) {
        // 简化的噪声函数
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }
}