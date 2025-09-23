// 建筑挤出系统
import * as THREE from 'three';

class BuildingExtruder {
    constructor() {
        this.defaultHeight = 8; // 默认建筑高度
        this.wallThickness = 0.3; // 墙体厚度
        this.windowHeight = 1.5; // 窗户高度
        this.windowWidth = 1.2; // 窗户宽度
        this.doorHeight = 2.2; // 门高度
        this.doorWidth = 1.0; // 门宽度
    }

    // 创建实体建筑
    createSolidBuilding(coordinates, options = {}) {
        const height = options.height || this.defaultHeight;
        const floors = options.floors || Math.floor(height / 3);

        // 创建建筑形状
        const shape = this.createShape(coordinates);
        if (!shape) return null;

        // 挤出设置
        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 2
        };

        // 创建几何体
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // 创建建筑材质（传统中式建筑风格）
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: options.color || 0x8B7355, // 棕褐色墙体
            roughness: 0.9,
            metalness: 0.1
        });

        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A4A4A, // 灰色瓦片
            roughness: 0.7,
            metalness: 0.2
        });

        // 创建建筑网格
        const building = new THREE.Mesh(geometry, [wallMaterial, roofMaterial]);
        building.rotation.x = -Math.PI / 2;
        building.castShadow = true;
        building.receiveShadow = true;

        // 添加屋顶（中式飞檐）
        const roof = this.createChineseRoof(coordinates, height, options);
        if (roof) {
            const group = new THREE.Group();
            group.add(building);
            group.add(roof);
            return group;
        }

        return building;
    }

    // 创建半开放建筑（亭台楼阁）
    createSemiOpenBuilding(coordinates, options = {}) {
        const height = options.height || 6;
        const group = new THREE.Group();

        // 创建柱子
        const pillars = this.createPillars(coordinates, height, options);
        pillars.forEach(pillar => group.add(pillar));

        // 创建围墙（带窗户和门）
        const walls = this.createWallsWithOpenings(coordinates, height, options);
        walls.forEach(wall => group.add(wall));

        // 创建屋顶
        const roof = this.createChineseRoof(coordinates, height, options);
        if (roof) group.add(roof);

        return group;
    }

    // 创建中式屋顶
    createChineseRoof(coordinates, baseHeight, options = {}) {
        if (coordinates.length < 3) return null;

        const shape = this.createShape(coordinates);
        if (!shape) return null;

        // 创建多层递减的屋顶
        const roofLayers = [];
        const layerCount = options.roofLayers || 2;

        for (let i = 0; i < layerCount; i++) {
            const scale = 1 + (i + 1) * 0.15; // 每层外扩
            const scaledShape = this.scaleShape(shape, scale);

            const extrudeSettings = {
                depth: 0.5,
                bevelEnabled: true,
                bevelThickness: 0.2,
                bevelSize: 0.3,
                bevelSegments: 3
            };

            const geometry = new THREE.ExtrudeGeometry(scaledShape, extrudeSettings);
            const material = new THREE.MeshStandardMaterial({
                color: i === 0 ? 0x4A4A4A : 0x3A3A3A,
                roughness: 0.7,
                metalness: 0.2
            });

            const roofLayer = new THREE.Mesh(geometry, material);
            roofLayer.rotation.x = -Math.PI / 2;
            roofLayer.position.y = baseHeight + i * 0.6;
            roofLayer.castShadow = true;
            roofLayer.receiveShadow = true;

            roofLayers.push(roofLayer);
        }

        const roofGroup = new THREE.Group();
        roofLayers.forEach(layer => roofGroup.add(layer));

        return roofGroup;
    }

    // 创建柱子
    createPillars(coordinates, height, options = {}) {
        const pillars = [];
        const pillarRadius = options.pillarRadius || 0.3;
        const pillarColor = options.pillarColor || 0x8B4513;

        // 在每个角点创建柱子
        coordinates.forEach(coord => {
            const geometry = new THREE.CylinderGeometry(
                pillarRadius,
                pillarRadius * 1.1, // 底部稍粗
                height,
                8
            );

            const material = new THREE.MeshStandardMaterial({
                color: pillarColor,
                roughness: 0.8,
                metalness: 0.1
            });

            const pillar = new THREE.Mesh(geometry, material);
            pillar.position.set(coord[0], height / 2, coord[1]);
            pillar.castShadow = true;
            pillar.receiveShadow = true;

            pillars.push(pillar);
        });

        return pillars;
    }

    // 创建带开口的墙体
    createWallsWithOpenings(coordinates, height, options = {}) {
        const walls = [];
        const wallHeight = height * 0.7; // 墙体只到建筑高度的70%

        for (let i = 0; i < coordinates.length; i++) {
            const start = coordinates[i];
            const end = coordinates[(i + 1) % coordinates.length];

            const wallLength = Math.sqrt(
                Math.pow(end[0] - start[0], 2) +
                Math.pow(end[1] - start[1], 2)
            );

            // 判断是否需要开门或窗
            const needsDoor = i === 0; // 第一面墙开门
            const needsWindow = !needsDoor && wallLength > 3; // 长墙开窗

            if (needsDoor) {
                walls.push(...this.createWallWithDoor(start, end, wallHeight, options));
            } else if (needsWindow) {
                walls.push(...this.createWallWithWindows(start, end, wallHeight, options));
            } else {
                walls.push(this.createSimpleWall(start, end, wallHeight, options));
            }
        }

        return walls;
    }

    // 创建带门的墙体
    createWallWithDoor(start, end, height, options = {}) {
        const walls = [];
        const wallThickness = this.wallThickness;

        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 门的位置（墙中央）
        const doorStart = (wallLength - this.doorWidth) / 2;
        const doorEnd = doorStart + this.doorWidth;

        // 左侧墙体
        if (doorStart > 0.1) {
            const leftGeometry = new THREE.BoxGeometry(doorStart, height, wallThickness);
            const leftMaterial = this.createWallMaterial(options);
            const leftWall = new THREE.Mesh(leftGeometry, leftMaterial);

            leftWall.position.set(
                start[0] + Math.cos(angle) * doorStart / 2,
                height / 2,
                start[1] + Math.sin(angle) * doorStart / 2
            );
            leftWall.rotation.y = angle;
            leftWall.castShadow = true;
            leftWall.receiveShadow = true;
            walls.push(leftWall);
        }

        // 右侧墙体
        if (wallLength - doorEnd > 0.1) {
            const rightLength = wallLength - doorEnd;
            const rightGeometry = new THREE.BoxGeometry(rightLength, height, wallThickness);
            const rightMaterial = this.createWallMaterial(options);
            const rightWall = new THREE.Mesh(rightGeometry, rightMaterial);

            rightWall.position.set(
                start[0] + Math.cos(angle) * (doorEnd + rightLength / 2),
                height / 2,
                start[1] + Math.sin(angle) * (doorEnd + rightLength / 2)
            );
            rightWall.rotation.y = angle;
            rightWall.castShadow = true;
            rightWall.receiveShadow = true;
            walls.push(rightWall);
        }

        // 门上方的横梁
        if (this.doorHeight < height) {
            const topGeometry = new THREE.BoxGeometry(
                this.doorWidth,
                height - this.doorHeight,
                wallThickness
            );
            const topMaterial = this.createWallMaterial(options);
            const topWall = new THREE.Mesh(topGeometry, topMaterial);

            topWall.position.set(
                start[0] + Math.cos(angle) * (doorStart + this.doorWidth / 2),
                (height + this.doorHeight) / 2,
                start[1] + Math.sin(angle) * (doorStart + this.doorWidth / 2)
            );
            topWall.rotation.y = angle;
            topWall.castShadow = true;
            topWall.receiveShadow = true;
            walls.push(topWall);
        }

        return walls;
    }

    // 创建带窗户的墙体
    createWallWithWindows(start, end, height, options = {}) {
        const walls = [];
        const wallThickness = this.wallThickness;

        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 计算窗户数量和间距
        const windowCount = Math.floor((wallLength - 1) / (this.windowWidth + 1));
        const spacing = (wallLength - windowCount * this.windowWidth) / (windowCount + 1);

        let currentPos = 0;

        for (let i = 0; i <= windowCount; i++) {
            // 墙段
            if (i === 0 || spacing > 0.1) {
                const segmentLength = i === 0 ? spacing :
                    (i === windowCount ? spacing : spacing);

                if (segmentLength > 0.1) {
                    const geometry = new THREE.BoxGeometry(segmentLength, height, wallThickness);
                    const material = this.createWallMaterial(options);
                    const wall = new THREE.Mesh(geometry, material);

                    wall.position.set(
                        start[0] + Math.cos(angle) * (currentPos + segmentLength / 2),
                        height / 2,
                        start[1] + Math.sin(angle) * (currentPos + segmentLength / 2)
                    );
                    wall.rotation.y = angle;
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    walls.push(wall);

                    currentPos += segmentLength;
                }
            }

            // 窗户（用半透明材质表示）
            if (i < windowCount) {
                const windowGeometry = new THREE.BoxGeometry(
                    this.windowWidth,
                    this.windowHeight,
                    wallThickness * 0.5
                );
                const windowMaterial = new THREE.MeshStandardMaterial({
                    color: 0x87CEEB,
                    transparent: true,
                    opacity: 0.3,
                    roughness: 0.1,
                    metalness: 0.8
                });

                const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
                windowMesh.position.set(
                    start[0] + Math.cos(angle) * (currentPos + this.windowWidth / 2),
                    height / 2,
                    start[1] + Math.sin(angle) * (currentPos + this.windowWidth / 2)
                );
                windowMesh.rotation.y = angle;
                walls.push(windowMesh);

                currentPos += this.windowWidth;
            }
        }

        return walls;
    }

    // 创建简单墙体
    createSimpleWall(start, end, height, options = {}) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const geometry = new THREE.BoxGeometry(wallLength, height, this.wallThickness);
        const material = this.createWallMaterial(options);
        const wall = new THREE.Mesh(geometry, material);

        wall.position.set(
            (start[0] + end[0]) / 2,
            height / 2,
            (start[1] + end[1]) / 2
        );
        wall.rotation.y = angle;
        wall.castShadow = true;
        wall.receiveShadow = true;

        return wall;
    }

    // 创建墙体材质
    createWallMaterial(options = {}) {
        return new THREE.MeshStandardMaterial({
            color: options.wallColor || 0xF5DEB3, // 米黄色
            roughness: 0.9,
            metalness: 0.1,
            map: options.wallTexture || null
        });
    }

    // 从坐标创建形状
    createShape(coordinates) {
        if (!coordinates || coordinates.length < 3) return null;

        const shape = new THREE.Shape();
        coordinates.forEach((coord, index) => {
            if (index === 0) {
                shape.moveTo(coord[0], coord[1]);
            } else {
                shape.lineTo(coord[0], coord[1]);
            }
        });
        shape.closePath();

        return shape;
    }

    // 缩放形状
    scaleShape(shape, scale) {
        const points = shape.getPoints();
        const centroid = this.getShapeCentroid(points);

        const scaledShape = new THREE.Shape();
        points.forEach((point, index) => {
            const scaledX = centroid.x + (point.x - centroid.x) * scale;
            const scaledY = centroid.y + (point.y - centroid.y) * scale;

            if (index === 0) {
                scaledShape.moveTo(scaledX, scaledY);
            } else {
                scaledShape.lineTo(scaledX, scaledY);
            }
        });
        scaledShape.closePath();

        return scaledShape;
    }

    // 获取形状质心
    getShapeCentroid(points) {
        const sum = points.reduce((acc, point) => {
            return {
                x: acc.x + point.x,
                y: acc.y + point.y
            };
        }, { x: 0, y: 0 });

        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }
}

export default BuildingExtruder;