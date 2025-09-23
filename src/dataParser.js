// dataParser.js - 解析园林Excel数据
import * as XLSX from 'xlsx';

export class GardenDataParser {
    constructor() {
        this.data = {
            semiOpenBuildings: [],
            solidBuildings: [],
            roads: [],
            rocks: [],
            waters: [],
            plants: []
        };
        this.bounds = {
            min: { x: Infinity, y: Infinity },
            max: { x: -Infinity, y: -Infinity }
        };
    }

    // 解析Excel文件
    // dataParser.js 中的 parseExcelFile 函数（完整替换）
    async parseExcelFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // 重置数据和边界（防止重复调用残留）
        this.data = {
            semiOpenBuildings: [],
            solidBuildings: [],
            roads: [],
            rocks: [],
            waters: [],
            plants: []
        };
        this.bounds = {
            min: { x: Infinity, y: Infinity },
            max: { x: -Infinity, y: -Infinity }
        };

        // 解析各个工作表
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            switch(sheetName) {
                case '半开放建筑':
                    this.parseSemiOpenBuildings(data);
                    break;
                case '实体建筑':
                    this.parseSolidBuildings(data);
                    break;
                case '道路':
                    this.parseRoads(data);
                    break;
                case '假山':
                    this.parseRocks(data);
                    break;
                case '水体':
                    this.parseWaters(data);
                    break;
                case '植物':
                    this.parsePlants(data);
                    break;
                default:
                    // 其他 sheet 名称暂时忽略
                    break;
            }
        });

        // 归一化坐标（会更新 this.bounds）
        this.normalizeCoordinates();

        // 把 bounds 写回到返回对象，这样 main.js 可以直接读取到 bounds（避免 NaN）
        this.data.bounds = this.bounds;

        return this.data;
    }

    // 解析线段坐标
    parseLineSegments(data, targetArray, layerZ = 0) {
        let currentSegment = null;

        for (let i = 1; i < data.length; i++) {
            const cell = data[i][0];
            if (!cell) continue;

            const cellStr = cell.toString().trim();

            // 检查是否是新线段标记
            if (cellStr.includes('{') && cellStr.includes(';')) {
                // 保存上一个线段
                if (currentSegment && currentSegment.points.length > 0) {
                    targetArray.push(currentSegment);
                }
                // 开始新线段
                currentSegment = { points: [] };
            }
            // 解析坐标点
            else if (cellStr.includes('{') && cellStr.includes(',')) {
                const coordMatch = cellStr.match(/\{([^}]+)\}/);
                if (coordMatch) {
                    const coords = coordMatch[1].split(',').map(v => parseFloat(v.trim()));
                    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        const point = {
                            x: coords[0] / 1000, // 毫米转米
                            y: coords[1] / 1000,
                            z: layerZ
                        };

                        if (currentSegment) {
                            currentSegment.points.push(point);
                        }

                        // 更新边界
                        this.updateBounds(point);
                    }
                }
            }
        }

        // 保存最后一个线段
        if (currentSegment && currentSegment.points.length > 0) {
            targetArray.push(currentSegment);
        }
    }

    // 解析植物数据
    parsePlants(data) {
        for (let i = 1; i < data.length; i++) {
            const coordCell = data[i][0];
            const radiusCell = data[i][1];

            if (!coordCell || radiusCell === undefined) continue;

            const coordStr = coordCell.toString().trim();
            const coordMatch = coordStr.match(/\{([^}]+)\}/);

            if (coordMatch) {
                const coords = coordMatch[1].split(',').map(v => parseFloat(v.trim()));
                if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    const plant = {
                        x: coords[0] / 1000, // 毫米转米
                        y: coords[1] / 1000,
                        z: 1,
                        radius: parseFloat(radiusCell) / 1000 // 冠径转米
                    };

                    this.data.plants.push(plant);
                    this.updateBounds(plant);
                }
            }
        }
    }

    // 解析半开放建筑
    parseSemiOpenBuildings(data) {
        this.parseLineSegments(data, this.data.semiOpenBuildings,1);
    }

    // 解析实体建筑
    parseSolidBuildings(data) {
        this.parseLineSegments(data, this.data.solidBuildings, 1);
    }

    // 解析道路
    parseRoads(data) {
        this.parseLineSegments(data, this.data.roads,0);
    }

    // 解析假山
    parseRocks(data) {
        this.parseLineSegments(data, this.data.rocks,0);
    }

    // 解析水体
    // parseWaters - 去除噪音点，自动闭合，设置 z = 0
    parseWaters(data) {
        const minDistance = 0.2; // 噪音过滤阈值
        let currentPolygon = null;
        let currentHole = null;
        let isHole = false;

        const pushPolygon = () => {
            if (currentPolygon && currentPolygon.outer.length > 2) {
                // 闭合主边界
                const first = currentPolygon.outer[0];
                const last = currentPolygon.outer[currentPolygon.outer.length - 1];
                if (first.x !== last.x || first.y !== last.y) {
                    currentPolygon.outer.push({ ...first });
                }

                // 闭合每个岛屿
                currentPolygon.holes.forEach(h => {
                    const firstH = h[0];
                    const lastH = h[h.length - 1];
                    if (firstH.x !== lastH.x || firstH.y !== lastH.y) h.push({ ...firstH });
                });

                this.data.waters.push(currentPolygon);
            }
            currentPolygon = null;
        };

        currentPolygon = { outer: [], holes: [] };

        for (let i = 1; i < data.length; i++) {
            const cell = data[i][0];
            if (!cell) continue;
            const cellStr = cell.toString().trim();

            // 新边界或新岛屿标记
            if (cellStr.includes('{') && cellStr.includes(';')) {
                // 判断是否是岛屿标记，例如 "{0;a_hole}"
                if (cellStr.includes('hole')) {
                    isHole = true;
                    currentHole = [];
                } else {
                    if (currentPolygon.outer.length > 0 || currentPolygon.holes.length > 0) pushPolygon();
                    currentPolygon = { outer: [], holes: [] };
                    isHole = false;
                }
            }
            // 坐标点
            else if (cellStr.includes('{') && cellStr.includes(',')) {
                const coordMatch = cellStr.match(/\{([^}]+)\}/);
                if (coordMatch) {
                    const coords = coordMatch[1].split(',').map(v => parseFloat(v.trim()));
                    if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        const point = { x: coords[0] / 1000, y: coords[1] / 1000, z: 0 };
                        const lastPoint = isHole
                            ? currentHole[currentHole.length - 1]
                            : currentPolygon.outer[currentPolygon.outer.length - 1];

                        if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >= minDistance) {
                            if (isHole) currentHole.push(point);
                            else currentPolygon.outer.push(point);
                            this.updateBounds(point);
                        }
                    }
                }
            }

            // 如果是岛屿结束标记，可以把 currentHole 推入
            if (isHole && cellStr.includes('end_hole')) {
                currentPolygon.holes.push(currentHole);
                currentHole = null;
                isHole = false;
            }
        }

        // 保存最后一个水体
        pushPolygon();
    }

    // 更新边界
    updateBounds(point) {
        this.bounds.min.x = Math.min(this.bounds.min.x, point.x);
        this.bounds.min.y = Math.min(this.bounds.min.y, point.y);
        this.bounds.max.x = Math.max(this.bounds.max.x, point.x);
        this.bounds.max.y = Math.max(this.bounds.max.y, point.y);
    }

    // 归一化坐标到合理范围
    normalizeCoordinates() {
        const width = this.bounds.max.x - this.bounds.min.x;
        const height = this.bounds.max.y - this.bounds.min.y;
        const centerX = (this.bounds.min.x + this.bounds.max.x) / 2;
        const centerY = (this.bounds.min.y + this.bounds.max.y) / 2;

        // 缩放到目标大小（例如 200x200 米）
        const targetSize = 200;
        const scale = targetSize / Math.max(width, height);

        // 归一化所有坐标
        const normalizePoints = (segments) => {
            segments.forEach(segment => {
                if (segment.points) {
                    segment.points.forEach(point => {
                        point.x = (point.x - centerX) * scale;
                        point.y = (point.y - centerY) * scale;
                    });
                }
            });
        };

        normalizePoints(this.data.semiOpenBuildings);
        normalizePoints(this.data.solidBuildings);
        normalizePoints(this.data.roads);
        normalizePoints(this.data.rocks);

        // 特殊处理水体
        this.data.waters.forEach(water => {
            water.outer.forEach(p => {
                p.x = (p.x - centerX) * scale;
                p.y = (p.y - centerY) * scale;
            });
            (water.holes || []).forEach(hole => {
                hole.forEach(p => {
                    p.x = (p.x - centerX) * scale;
                    p.y = (p.y - centerY) * scale;
                });
            });
        });

        // 归一化植物坐标
        this.data.plants.forEach(plant => {
            plant.x = (plant.x - centerX) * scale;
            plant.y = (plant.y - centerY) * scale;
            plant.radius = plant.radius * scale;
        });

        // 更新边界
        this.bounds = {
            min: { x: -targetSize/2, y: -targetSize/2 },
            max: { x: targetSize/2, y: targetSize/2 }
        };
    }
}