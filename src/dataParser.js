// 园林数据解析器
import * as turf from '@turf/turf';
import * as XLSX from 'xlsx';

class GardenDataParser {
    constructor() {
        this.layers = {
            buildings: [],      // 建筑
            semiOpenBuildings: [], // 半开放建筑
            roads: [],         // 道路
            waters: [],        // 水体
            rocks: [],         // 山石
            plants: []         // 植物
        };
        this.bounds = null;
        this.center = null;
    }

    // 解析 GeoJSON 数据
    parseGeoJSON(geojsonData) {
        const features = geojsonData.features || [];

        features.forEach(feature => {
            const layer = feature.properties?.layer || 'unknown';
            const geometry = feature.geometry;

            switch(layer.toLowerCase()) {
                case 'building':
                case '实体建筑':
                    this.layers.buildings.push(this.processFeature(feature));
                    break;
                case 'semi_open_building':
                case '半开放建筑':
                    this.layers.semiOpenBuildings.push(this.processFeature(feature));
                    break;
                case 'road':
                case '道路':
                    this.layers.roads.push(this.processFeature(feature));
                    break;
                case 'water':
                case '水体':
                    this.layers.waters.push(this.processFeature(feature));
                    break;
                case 'rock':
                case '山石':
                    this.layers.rocks.push(this.processFeature(feature));
                    break;
                case 'plant':
                case '植物':
                    this.layers.plants.push(this.processFeature(feature));
                    break;
            }
        });

        this.calculateBounds();
        return this.layers;
    }

    // 处理单个要素
    processFeature(feature) {
        const coords = this.extractCoordinates(feature.geometry);
        const properties = feature.properties || {};

        return {
            type: feature.geometry.type,
            coordinates: coords,
            properties: properties,
            centroid: this.calculateCentroid(coords),
            area: this.calculateArea(feature)
        };
    }

    // 提取坐标
    extractCoordinates(geometry) {
        if (geometry.type === 'Point') {
            return [geometry.coordinates];
        } else if (geometry.type === 'LineString') {
            return geometry.coordinates;
        } else if (geometry.type === 'Polygon') {
            return geometry.coordinates[0]; // 只取外环
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates[0][0]; // 简化处理，只取第一个多边形的外环
        }
        return [];
    }

    // 计算质心
    calculateCentroid(coords) {
        if (coords.length === 0) return [0, 0];

        const x = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        const y = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        return [x, y];
    }

    // 计算面积
    calculateArea(feature) {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            return turf.area(feature);
        }
        return 0;
    }

    // 计算边界
    calculateBounds() {
        const allCoords = [];

        Object.values(this.layers).forEach(layer => {
            layer.forEach(item => {
                allCoords.push(...item.coordinates);
            });
        });

        if (allCoords.length === 0) return;

        const minX = Math.min(...allCoords.map(c => c[0]));
        const maxX = Math.max(...allCoords.map(c => c[0]));
        const minY = Math.min(...allCoords.map(c => c[1]));
        const maxY = Math.max(...allCoords.map(c => c[1]));

        this.bounds = { minX, maxX, minY, maxY };
        this.center = [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    // 从Excel坐标数据解析（针对你提供的数据格式）
    parseExcelCoordinates(workbook) {
        // 解析每个工作表的坐标数据
        const sheetMap = {
            '半开放建筑': 'semiOpenBuildings',
            '实体建筑': 'buildings',
            '道路': 'roads',
            '假山': 'rocks',
            '水体': 'waters',
            '植物': 'plants'
        };

        for (const sheetName in sheetMap) {
            if (workbook.SheetNames.includes(sheetName)) {
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (sheetName === '植物') {
                    this.parsePlantsData(data, sheetMap[sheetName]);
                } else {
                    this.parseCoordinateData(data, sheetMap[sheetName]);
                }
            }
        }

        this.calculateBounds();
        return this.layers;
    }

    // 解析坐标数据（建筑、道路、水体等）
    parseCoordinateData(data, layerName) {
        const lines = [];
        let currentLine = [];

        data.forEach(row => {
            // 跳过标题行
            if (row[0] === '区分线段的点位坐标') return;

            // 检查是否为新线段标记
            if (typeof row[0] === 'string' && row[0].includes('{0;')) {
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = [];
            }
            // 解析坐标点
            else if (typeof row[0] === 'string' && row[0].includes('{')) {
                const match = row[0].match(/\{(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\}/);
                if (match) {
                    const x = parseFloat(match[1]) / 1000; // 毫米转米
                    const y = parseFloat(match[2]) / 1000;
                    currentLine.push([x, y]);
                }
            }
        });

        // 添加最后一条线段
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // 将线段添加到对应图层
        lines.forEach(line => {
            if (line.length >= 2) {
                this.layers[layerName].push({
                    type: 'LineString',
                    coordinates: line,
                    properties: { source: layerName },
                    centroid: this.calculateCentroid(line),
                    area: 0
                });
            }
        });
    }

    // 解析植物数据
    parsePlantsData(data, layerName) {
        data.forEach((row, index) => {
            // 跳过标题行
            if (index === 0) return;

            // 解析植物中心坐标和冠径
            if (row[0] && typeof row[0] === 'string' && row[0].includes('{')) {
                const centerMatch = row[0].match(/\{(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\}/);
                const radius = row[1] ? parseFloat(row[1]) / 1000 : 1; // 默认半径1米

                if (centerMatch) {
                    const x = parseFloat(centerMatch[1]) / 1000;
                    const y = parseFloat(centerMatch[2]) / 1000;

                    this.layers[layerName].push({
                        type: 'Point',
                        coordinates: [[x, y]],
                        properties: {
                            source: layerName,
                            radius: radius
                        },
                        centroid: [x, y],
                        area: Math.PI * radius * radius
                    });
                }
            }
        });
    }
}

export default GardenDataParser;