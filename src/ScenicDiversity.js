export class ScenicDiversity {
    constructor(gardenData){
        this.buildings = gardenData.solidBuildings.concat(gardenData.semiOpenBuildings);
        this.waters    = gardenData.waters.map(w=>w.outer);
        this.rocks     = gardenData.rocks;
        this.plants    = gardenData.plants;
    }

    // 计算一条路径的景观变化频率
    calcDiversity(pathPoints){
        let changes = 0;
        let lastType = null;
        pathPoints.forEach(p=>{
            const type = this.getSceneType(p);
            if(type!==lastType){
                if(lastType!==null) changes++;
                lastType = type;
            }
        });
        return changes / Math.max(1,pathPoints.length-1);
    }

    getSceneType(p){
        // 简化判定：按最近元素类别
        const d = (arr)=>arr.some(seg=>this.pointNearSegment(p, seg.points||seg, 2));
        if(d(this.waters)) return 'water';
        if(d(this.rocks))  return 'rock';
        if(d(this.buildings)) return 'building';
        if(this.nearPlant(p)) return 'plant';
        return 'plain';
    }

    nearPlant(p){
        return this.plants.some(pl=>Math.hypot(pl.x-p.x, pl.y-p.y)<pl.radius+1);
    }

    pointNearSegment(p, pts, th){
        for(let i=0;i<pts.length-1;i++){
            const d=this.ptSegDist(p, pts[i], pts[i+1]);
            if(d<th) return true;
        }
        return false;
    }

    ptSegDist(p,a,b){
        const A=p.x-a.x,B=p.y-a.y,C=b.x-a.x,D=b.y-a.y;
        const dot=A*C+B*D,len=C*C+D*D;
        let t=len?dot/len:-1;
        t=Math.max(0,Math.min(1,t));
        const xx=a.x+t*C,yy=a.y+t*D;
        return Math.hypot(p.x-xx,p.y-yy);
    }
}
