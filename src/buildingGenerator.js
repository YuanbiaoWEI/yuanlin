// buildingGenerator.js - 生成建筑模型
import * as THREE from 'three';
import earcut from 'earcut';

export class BuildingGenerator {
    constructor(terrain) {
        this.terrain = terrain;
        this.wallHeight = 3.5; // 墙高（米）
        this.roofHeight = 1.5; // 屋顶高度
        this.wallThickness = 0.3; // 墙厚
    }

    // 生成实体建筑（封闭多边形）
    generateSolidBuilding(segment, material) {
        const group = new THREE.Group();
        const points = segment.points;

        if (points.length < 3) return group;

        // 确保多边形闭合
        const closedPoints = [...points];
        if (!this.isPointEqual(points[0], points[points.length - 1])) {
            closedPoints.push(points[0]);
        }

        // 调整建筑到地形高度
        const baseHeight = this.getAverageGroundHeight(closedPoints);

        // 创建墙体
        const walls = this.createWalls(closedPoints, baseHeight, this.wallHeight, material.wall);
        group.add(walls);

        // 创建屋顶
        const roof = this.createRoof(closedPoints, baseHeight + this.wallHeight, material.roof);
        group.add(roof);

        // 创建地基
        const foundation = this.createFoundation(closedPoints, baseHeight, material.foundation);
        group.add(foundation);

        return group;
    }

    // 生成半开放建筑
    generateSemiOpenBuilding(segment, material) {
        const group = new THREE.Group();
        const points = segment.points;

        if (points.length < 2) return group;

        // 检测是否闭合
        const isClosed = this.isPointEqual(points[0], points[points.length - 1]);

        // 调整建筑到地形高度
        const baseHeight = this.getAverageGroundHeight(points);

        // 创建连续墙体（不闭合则留出开口）
        if (!isClosed) {
            // 半开放建筑：只建造现有线段的墙体
            for (let i = 0; i < points.length - 1; i++) {
                const wall = this.createWallSegment(
                    points[i],
                    points[i + 1],
                    baseHeight,
                    this.wallHeight,
                    material.wall
                );
                group.add(wall);
            }

            // 创建部分屋顶（覆盖墙体区域）
            const partialRoof = this.createPartialRoof(points, baseHeight + this.wallHeight, material.roof);
            group.add(partialRoof);
        } else {
            // 如果闭合，按实体建筑处理
            return this.generateSolidBuilding(segment, material);
        }

        // 添加装饰柱
        const pillars = this.createPillars(points, baseHeight, material.pillar);
        group.add(pillars);

        return group;
    }

    // 创建墙体
    createWalls(points, baseHeight, height, material) {
        const group = new THREE.Group();

        for (let i = 0; i < points.length - 1; i++) {
            const wall = this.createWallSegment(points[i], points[i + 1], baseHeight, height, material);
            group.add(wall);
        }

        return group;
    }

    // 创建单面墙
    createWallSegment(p1, p2, baseHeight, height, material) {
        const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        const geometry = new THREE.BoxGeometry(distance, height, this.wallThickness);
        const wall = new THREE.Mesh(geometry, material);

        // 定位墙体
        wall.position.set(
            (p1.x + p2.x) / 2,
            baseHeight + height / 2,
            (p1.y + p2.y) / 2
        );
        wall.rotation.y = -angle;

        return wall;
    }

    // 创建屋顶（中国传统风格）
    createRoof(points, baseHeight, material) {
        const group = new THREE.Group();

        // 准备多边形顶点用于三角剖分
        const vertices = [];
        const indices = [];

        // 转换为平面坐标数组
        const flatCoords = [];
        points.forEach(p => {
            flatCoords.push(p.x, p.y);
        });

        // 使用 earcut 进行三角剖分
        const triangles = earcut(flatCoords);

        // 创建屋顶基底
        const baseGeometry = new THREE.BufferGeometry();
        const baseVertices = [];
        const baseNormals = [];
        const baseUvs = [];

        // 添加顶点
        points.forEach(p => {
            baseVertices.push(p.x, baseHeight, p.y);
            baseNormals.push(0, 1, 0);
            baseUvs.push((p.x + 100) / 200, (p.y + 100) / 200);
        });

        baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseVertices, 3));
        baseGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(baseNormals, 3));
        baseGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(baseUvs, 2));
        baseGeometry.setIndex(triangles);

        const baseMesh = new THREE.Mesh(baseGeometry, material);
        group.add(baseMesh);

        // 创建屋顶坡面（简化的四坡顶）
        const center = this.getPolygonCenter(points);
        const roofPeak = new THREE.Vector3(center.x, baseHeight + this.roofHeight, center.y);

        // 为每个边创建三角形坡面
        for (let i = 0; i < points.length - 1; i++) {
            const slopeGeometry = new THREE.BufferGeometry();
            const vertices = [
                points[i].x, baseHeight, points[i].y,
                points[i + 1].x, baseHeight, points[i + 1].y,
                roofPeak.x, roofPeak.y, roofPeak.z
            ];
            slopeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            slopeGeometry.computeVertexNormals();

            const slope = new THREE.Mesh(slopeGeometry, material);
            group.add(slope);
        }

        return group;
    }

    // 创建部分屋顶（用于半开放建筑）
    createPartialRoof(points, baseHeight, material) {
        const group = new THREE.Group();

        // 沿墙体线创建条形屋顶
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

            // 创建瓦片屋顶段
            const roofGeometry = new THREE.BoxGeometry(distance, 0.3, 2);
            const roofSegment = new THREE.Mesh(roofGeometry, material);

            roofSegment.position.set(
                (p1.x + p2.x) / 2,
                baseHeight + 0.15,
                (p1.y + p2.y) / 2
            );
            roofSegment.rotation.y = -angle;

            group.add(roofSegment);
        }

        return group;
    }

    // 创建装饰柱
    createPillars(points, baseHeight, material) {
        const group = new THREE.Group();
        const pillarRadius = 0.15;
        const pillarHeight = this.wallHeight;

        // 在每个转角点放置柱子
        points.forEach(point => {
            const geometry = new THREE.CylinderGeometry(
                pillarRadius,
                pillarRadius * 1.2,
                pillarHeight,
                8
            );
            const pillar = new THREE.Mesh(geometry, material);
            pillar.position.set(
                point.x,
                baseHeight + pillarHeight / 2,
                point.y
            );
            group.add(pillar);
        });

        return group;
    }

    // 创建地基
    createFoundation(points, baseHeight, material) {
        const foundationHeight = 0.5;
        const group = new THREE.Group();

        // 转换为平面坐标数组
        const flatCoords = [];
        points.forEach(p => {
            flatCoords.push(p.x, p.y);
        });

        // 三角剖分
        const triangles = earcut(flatCoords);

        // 创建地基几何体
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const uvs = [];

        points.forEach(p => {
            vertices.push(p.x, baseHeight - foundationHeight / 2, p.y);
            normals.push(0, 1, 0);
            uvs.push((p.x + 100) / 200, (p.y + 100) / 200);
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(triangles);

        const foundation = new THREE.Mesh(geometry, material);
        group.add(foundation);

        return group;
    }

    // 获取多边形中心
    getPolygonCenter(points) {
        let x = 0, y = 0;
        for (const p of points) {
            x += p.x;
            y += p.y;
        }
        return {
            x: x / points.length,
            y: y / points.length
        };
    }

    // 获取平均地面高度
    getAverageGroundHeight(points) {
        let totalHeight = 0;
        for (const p of points) {
            totalHeight += this.terrain.getHeightAt(p.x, p.y);
        }
        return totalHeight / points.length;
    }

    // 判断两点是否相同
    isPointEqual(p1, p2, tolerance = 0.01) {
        return Math.abs(p1.x - p2.x) < tolerance &&
            Math.abs(p1.y - p2.y) < tolerance;
    }
}