// src/PathGraph.js
import * as turf from '@turf/turf';

export class PathGraph {
    constructor(roads, tolerance = 2) {
        this.nodes = [];  // {id,x,y}
        this.edges = [];
        this.tolerance = tolerance;
        this.buildGraph(roads);
        this.autoConnect();     // ⭐ 自动连通
    }

    buildGraph(roads){
        roads.forEach(seg=>{
            const pts = seg.points;
            for(let i=0;i<pts.length;i++){
                let nodeId = this.addNode(pts[i]);
                if(i>0){
                    const prevId = this.addNode(pts[i-1]);
                    const length = this.distance(pts[i-1], pts[i]);
                    this.edges.push({from: prevId, to: nodeId, length});
                }
            }
        });
    }

    addNode(p){
        // 在已有节点中查找是否有距离小于 tolerance 的节点
        for (let i=0;i<this.nodes.length;i++){
            if (this.distance(this.nodes[i], p) < this.tolerance){
                return this.nodes[i].id;  // 复用现有节点
            }
        }
        const id = this.nodes.length;
        this.nodes.push({id, x:p.x, y:p.y});
        return id;
    }

    distance(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

    // === 自动连通 ===
    autoConnect(){
        const comps = this.connectedComponents();
        if (comps.length <= 1) return; // 已经连通

        // 逐个连通分量，找最近点并添加边
        while(comps.length > 1){
            let best = {dist: Infinity, a: null, b: null, iA: 0, iB: 0};
            for (let i=0; i<comps.length; i++){
                for (let j=i+1; j<comps.length; j++){
                    comps[i].forEach(idA=>{
                        comps[j].forEach(idB=>{
                            const d = this.distance(this.nodes[idA], this.nodes[idB]);
                            if (d < best.dist){
                                best = {dist: d, a: idA, b: idB, iA: i, iB: j};
                            }
                        });
                    });
                }
            }
            // 添加虚拟边
            this.edges.push({from: best.a, to: best.b, length: best.dist});
            // 合并连通分量
            comps[best.iA] = comps[best.iA].concat(comps[best.iB]);
            comps.splice(best.iB,1);
        }
        console.info('AutoConnect: graph fully connected, total edges:', this.edges.length);
    }

    // 求连通分量
    connectedComponents(){
        const visited = new Set();
        const comps = [];
        const dfs = (id, group)=>{
            visited.add(id);
            group.push(id);
            this.edges.forEach(e=>{
                if(e.from===id && !visited.has(e.to)) dfs(e.to, group);
                if(e.to===id && !visited.has(e.from)) dfs(e.from, group);
            });
        };
        this.nodes.forEach(n=>{
            if(!visited.has(n.id)){
                const group=[];
                dfs(n.id,group);
                comps.push(group);
            }
        });
        return comps;
    }
}
