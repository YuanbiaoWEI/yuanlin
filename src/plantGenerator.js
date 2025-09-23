// plantGenerator.js - 生成植物和植被
import * as THREE from 'three';

export class PlantGenerator {
    constructor(terrain, materials) {
        this.terrain = terrain;
        this.materials = materials;
        this.treeTemplates = [];
        this.bushTemplates = [];
        this.createTemplates();
    }

    // 创建植物模板
    createTemplates() {
        // 创建几种不同的树木模板
        this.treeTemplates = [
            this.createPineTree(),
            this.createDecidousTree(),
            this.createCypressTree()
        ];

        // 创建灌木模板
        this.bushTemplates = [
            this.createBush(),
            this.createShrub()
        ];
    }

    // 创建松树
    createPineTree() {
        const group = new THREE.Group();

        // 树干
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
        const trunk = new THREE.Mesh(trunkGeometry, this.materials.treeTrunk);
        trunk.position.y = 1.5;
        group.add(trunk);

        // 树冠（锥形）
        const levels = 3;
        for (let i = 0; i < levels; i++) {
            const radius = 1.5 - i * 0.3;
            const height = 1.5 - i * 0.2;
            const y = 3 + i * 1.2;

            const coneGeometry = new THREE.ConeGeometry(radius, height, 8);
            const cone = new THREE.Mesh(coneGeometry, this.materials.tree);
            cone.position.y = y;
            group.add(cone);
        }

        group.name = 'pineTree';
        return group;
    }

    // 创建落叶树
    createDecidousTree() {
        const group = new THREE.Group();

        // 树干
        const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.35, 3, 8);
        const trunk = new THREE.Mesh(trunkGeometry, this.materials.treeTrunk);
        trunk.position.y = 1.5;
        group.add(trunk);

        // 树冠（球形）
        const crownGeometry = new THREE.SphereGeometry(2, 8, 6);
        const crown = new THREE.Mesh(crownGeometry, this.materials.tree);
        crown.position.y = 4;
        crown.scale.y = 0.8;
        group.add(crown);

        group.name = 'deciduousTree';
        return group;
    }

    // 创建柏树
    createCypressTree() {
        const group = new THREE.Group();

        // 树干
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2, 6);
        const trunk = new THREE.Mesh(trunkGeometry, this.materials.treeTrunk);
        trunk.position.y = 1;
        group.add(trunk);

        // 树冠（细长锥形）
        const crownGeometry = new THREE.ConeGeometry(0.8, 4, 6);
        const crown = new THREE.Mesh(crownGeometry, this.materials.tree);
        crown.position.y = 4;
        group.add(crown);

        group.name = 'cypressTree';
        return group;
    }

    // 创建灌木
    createBush() {
        const group = new THREE.Group();

        // 使用多个小球体组成灌木丛
        for (let i = 0; i < 3; i++) {
            const bushGeometry = new THREE.SphereGeometry(0.6 + Math.random() * 0.3, 6, 5);
            const bush = new THREE.Mesh(bushGeometry, this.materials.tree);
            bush.position.set(
                (Math.random() - 0.5) * 0.5,
                0.4 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.5
            );
            group.add(bush);
        }

        group.name = 'bush';
        return group;
    }

    // 创建小灌木
    createShrub() {
        const group = new THREE.Group();

        const shrubGeometry = new THREE.SphereGeometry(0.4, 6, 5);
        const shrub = new THREE.Mesh(shrubGeometry, this.materials.tree);
        shrub.position.y = 0.3;
        shrub.scale.y = 0.6;
        group.add(shrub);

        group.name = 'shrub';
        return group;
    }

    // 生成植物分布
    generatePlants(plantData, roads, buildings) {
        const plants = new THREE.Group();

        // 1. 处理原始植物数据（从DWG导入的）
        plantData.forEach(data => {
            const tree = this.createPlantFromData(data);
            if (tree) {
                plants.add(tree);
            }
        });

        // 2. 在道路边缘添加行道树
        this.addRoadSideTrees(roads, plants);

        // 3. 在建筑周围添加装饰植物
        this.addBuildingPlants(buildings, plants);

        // 4. 在开阔地带添加植物群
        this.addOpenAreaPlants(plants, roads, buildings);

        return plants;
    }

    // 根据数据创建植物
    createPlantFromData(data) {
        // 根据冠径选择植物类型
        let template;
        if (data.radius > 3) {
            // 大树
            template = this.treeTemplates[Math.floor(Math.random() * this.treeTemplates.length)];
        } else if (data.radius > 1.5) {
            // 中等树木
            template = this.treeTemplates[1]; // 落叶树
        } else {
            // 灌木
            template = this.bushTemplates[Math.floor(Math.random() * this.bushTemplates.length)];
        }

        const plant = template.clone();

        // 设置位置和缩放
        const groundHeight = this.terrain.getHeightAt(data.x, data.y);
        plant.position.set(data.x, groundHeight, data.y);

        // 根据冠径调整缩放
        const scale = data.radius / 2;
        plant.scale.set(scale, scale, scale);

        // 随机旋转
        plant.rotation.y = Math.random() * Math.PI * 2;

        return plant;
    }

    // 添加道路边树木
    addRoadSideTrees(roads, plantsGroup) {
        const treeSpacing = 5; // 树间距
        const roadOffset = 2; // 离道路边缘距离

        roads.forEach(road => {
            const points = road.points;
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                const numTrees = Math.floor(distance / treeSpacing);

                // 计算垂直于道路的方向
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const perpAngle = angle + Math.PI / 2;

                for (let j = 0; j <= numTrees; j++) {
                    const t = j / numTrees;
                    const x = p1.x + (p2.x - p1.x) * t;
                    const y = p1.y + (p2.y - p1.y) * t;

                    // 两侧都种树
                    for (const side of [-1, 1]) {
                        const treeX = x + Math.cos(perpAngle) * roadOffset * side;
                        const treeY = y + Math.sin(perpAngle) * roadOffset * side;

                        // 随机选择树类型
                        const template = this.treeTemplates[2]; // 柏树适合作行道树
                        const tree = template.clone();

                        const groundHeight = this.terrain.getHeightAt(treeX, treeY);
                        tree.position.set(treeX, groundHeight, treeY);
                        tree.rotation.y = Math.random() * Math.PI * 2;
                        tree.scale.setScalar(0.8 + Math.random() * 0.4);

                        plantsGroup.add(tree);
                    }
                }
            }
        });
    }

    // 在建筑周围添加植物
    addBuildingPlants(buildings, plantsGroup) {
        buildings.forEach(building => {
            const points = building.points;
            const buildingOffset = 3; // 离建筑距离

            // 在建筑角落放置装饰植物
            points.forEach((point, index) => {
                if (index % 2 === 0) { // 每隔一个角落放置
                    const angle = Math.random() * Math.PI * 2;
                    const distance = buildingOffset + Math.random() * 2;
                    const x = point.x + Math.cos(angle) * distance;
                    const y = point.y + Math.sin(angle) * distance;

                    // 使用灌木
                    const template = this.bushTemplates[Math.floor(Math.random() * this.bushTemplates.length)];
                    const plant = template.clone();

                    const groundHeight = this.terrain.getHeightAt(x, y);
                    plant.position.set(x, groundHeight, y);
                    plant.scale.setScalar(0.8 + Math.random() * 0.4);

                    plantsGroup.add(plant);
                }
            });
        });
    }

    // 在开阔地带添加植物群
    addOpenAreaPlants(plantsGroup, roads, buildings) {
        const bounds = this.terrain.bounds;
        const gridSize = 10; // 网格大小
        const plantDensity = 0.3; // 植物密度

        for (let x = bounds.min.x; x < bounds.max.x; x += gridSize) {
            for (let y = bounds.min.y; y < bounds.max.y; y += gridSize) {
                // 检查是否远离道路和建筑
                if (this.isOpenArea(x, y, roads, buildings, 5)) {
                    if (Math.random() < plantDensity) {
                        // 创建植物群
                        const clusterSize = Math.floor(Math.random() * 3) + 2;
                        for (let i = 0; i < clusterSize; i++) {
                            const offsetX = x + (Math.random() - 0.5) * gridSize;
                            const offsetY = y + (Math.random() - 0.5) * gridSize;

                            // 随机选择植物类型
                            const isTree = Math.random() > 0.3;
                            const template = isTree
                                ? this.treeTemplates[Math.floor(Math.random() * this.treeTemplates.length)]
                                : this.bushTemplates[Math.floor(Math.random() * this.bushTemplates.length)];

                            const plant = template.clone();
                            const groundHeight = this.terrain.getHeightAt(offsetX, offsetY);
                            plant.position.set(offsetX, groundHeight, offsetY);
                            plant.rotation.y = Math.random() * Math.PI * 2;
                            plant.scale.setScalar(0.6 + Math.random() * 0.8);

                            plantsGroup.add(plant);
                        }
                    }
                }
            }
        }
    }

    // 检查是否是开阔区域
    isOpenArea(x, y, roads, buildings, minDistance) {
        // 检查离道路的距离
        for (const road of roads) {
            for (let i = 0; i < road.points.length - 1; i++) {
                const dist = this.pointToLineDistance(
                    { x, y },
                    road.points[i],
                    road.points[i + 1]
                );
                if (dist < minDistance) return false;
            }
        }

        // 检查离建筑的距离
        for (const building of buildings) {
            if (this.isPointNearPolygon({ x, y }, building.points, minDistance)) {
                return false;
            }
        }

        return true;
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

        if (lenSq !== 0) param = dot / lenSq;

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

    // 检查点是否接近多边形
    isPointNearPolygon(point, polygon, distance) {
        for (const p of polygon) {
            const dx = point.x - p.x;
            const dy = point.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < distance) {
                return true;
            }
        }
        return false;
    }

    // 性能优化：使用实例化网格
    optimizePlants(plants) {
        // 将相同类型的植物转换为实例化网格
        const instances = {};

        plants.children.forEach(plant => {
            const name = plant.name;
            if (!instances[name]) {
                instances[name] = {
                    positions: [],
                    rotations: [],
                    scales: []
                };
            }

            instances[name].positions.push(plant.position);
            instances[name].rotations.push(plant.rotation);
            instances[name].scales.push(plant.scale);
        });

        // 创建实例化网格
        const optimizedGroup = new THREE.Group();

        Object.entries(instances).forEach(([name, data]) => {
            if (data.positions.length > 10) {
                // 对于大量重复的植物使用实例化
                // 这里简化处理，实际项目中需要使用InstancedMesh
                console.log(`优化 ${name}: ${data.positions.length} 个实例`);
            }
        });

        return optimizedGroup;
    }
}