// src/RoutePlanner.js
import { PathGraph } from './PathGraph.js';
import { ScenicDiversity } from './ScenicDiversity.js';
import * as THREE from 'three';

export class RoutePlanner {
    constructor(gardenData) {
        this.graph = new PathGraph(gardenData.roads);
        this.divCalc = new ScenicDiversity(gardenData);
    }

    /**
     * 自动寻找同一连通分量内最远的两点
     * 保证必定返回一条可行路径
     */
    findOptimalRoute() {
        if (this.graph.nodes.length === 0 || this.graph.edges.length === 0) {
            console.warn('图中没有节点或边');
            return { path: null, score: -Infinity };
        }

        // 任选一个节点作为第一次 BFS 起点
        const start = this.graph.nodes[0];
        const dist1 = this._bfsDistances(start.id);
        let farthestId = start.id;
        let maxDist = 0;
        for (const [id, d] of dist1) {
            if (d > maxDist) { maxDist = d; farthestId = id; }
        }

        // 第二次 BFS：从第一次最远节点出发，找真正的最远端
        const dist2 = this._bfsDistances(farthestId);
        let targetId = farthestId;
        maxDist = 0;
        for (const [id, d] of dist2) {
            if (d > maxDist) { maxDist = d; targetId = id; }
        }

        // 最短路径
        const idPath = this._shortestPath(farthestId, targetId);
        if (!idPath) {
            console.warn('未能找到最短路径');
            return { path: null, score: -Infinity };
        }

        // 计算异景程度
        const nodePath = idPath.map(id => this.graph.nodes[id]);
        const diversity = this.divCalc.calcDiversity(nodePath);
        return { path: nodePath, score: diversity };
    }

    _bfsDistances(startId) {
        const queue = [startId];
        const dist = new Map([[startId, 0]]);
        while (queue.length) {
            const cur = queue.shift();
            for (const e of this.graph.edges) {
                const nb = (e.from === cur ? e.to : (e.to === cur ? e.from : null));
                if (nb !== null && !dist.has(nb)) {
                    dist.set(nb, dist.get(cur) + e.length);
                    queue.push(nb);
                }
            }
        }
        return dist;
    }

    _shortestPath(startId, endId) {
        const dist = new Map();
        const prev = new Map();
        const unvisited = new Set(this.graph.nodes.map(n => n.id));
        this.graph.nodes.forEach(n => dist.set(n.id, Infinity));
        dist.set(startId, 0);

        while (unvisited.size) {
            let cur = null, min = Infinity;
            for (const id of unvisited) {
                const d = dist.get(id);
                if (d < min) { min = d; cur = id; }
            }
            if (cur === null || cur === endId) break;
            unvisited.delete(cur);

            for (const e of this.graph.edges) {
                const nb = (e.from === cur ? e.to : (e.to === cur ? e.from : null));
                if (nb !== null && unvisited.has(nb)) {
                    const alt = dist.get(cur) + e.length;
                    if (alt < dist.get(nb)) {
                        dist.set(nb, alt);
                        prev.set(nb, cur);
                    }
                }
            }
        }
        if (!prev.has(endId) && startId !== endId) return null;

        const path = [];
        for (let at = endId; at !== undefined; at = prev.get(at)) {
            path.push(at);
            if (at === startId) break;
        }
        return path.reverse();
    }

    /**
     * 渲染最优路线为立体 Tube
     * @param {THREE.Scene} scene - three.js 场景
     * @param {Array} path - 节点坐标数组
     */
    static drawTubeRoute(scene, path) {
        if (!path || !Array.isArray(path) || path.length === 0) {
            console.warn('drawTubeRoute: path 为空或无效');
            return;
        }

        // 把二维坐标转换为 Three.js Vector3，整体抬高 0.5m
        const curvePoints = path.map(p => new THREE.Vector3(p.x, 0.5, -p.y));
        const curve = new THREE.CatmullRomCurve3(curvePoints);

        // 主管道
        const tubeGeo = new THREE.TubeGeometry(curve, 200, 0.5, 12, false);
        const tubeMat = new THREE.MeshBasicMaterial({
            color: 0xff4500,    // 橙红
            transparent: true,
            opacity: 0.85,
            depthTest: false,
            depthWrite: false
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.renderOrder = 9999;  // 永远在最上层
        scene.add(tube);

        // 辉光外层
        const glowGeo = new THREE.TubeGeometry(curve, 200, 0.7, 12, false);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffff99,
            transparent: true,
            opacity: 0.35,
            depthTest: false,
            depthWrite: false
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.renderOrder = 9998;
        scene.add(glow);

        // 起点绿色球
        const startMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const startSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), startMat);
        startSphere.position.set(path[0].x, 0.7, -path[0].y);
        startSphere.renderOrder = 9999;
        scene.add(startSphere);

        // 终点红色球
        const endMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const endSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), endMat);
        const last = path[path.length - 1];
        endSphere.position.set(last.x, 0.7, -last.y);
        endSphere.renderOrder = 9999;
        scene.add(endSphere);
    }
}
