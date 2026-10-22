import math, random, json, sys
def inside(pt, poly):
    x,y=pt; c=False; n=len(poly)
    for i in range(n):
        x1,y1=poly[i]; x2,y2=poly[(i+1)%n]
        if (y1>y)!=(y2>y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
T='WPAHGD'
def generate(cfg):
    lon0,lat0,latc,w=cfg['lon0'],cfg['lat0'],cfg['latc'],cfg['w']
    kx=111*math.cos(math.radians(latc)); ky=111; S=w/math.sqrt(3)
    rows,cols=cfg['rows'],cfg['cols']
    def center(r,c):
        x=w*(c+0.5*(r&1)); y=1.5*S*r
        return (lon0+x/kx, lat0-y/ky)
    grid=[['.']*cols for _ in range(rows)]
    cells=[]
    for r in range(rows):
        for c in range(cols):
            lo,la=center(r,c)
            land=any(inside((lo,la),p) for p in cfg['polys']) and not any(inside((lo,la),p) for p in cfg.get('exclude',[]))
            if land: cells.append((r,c)); grid[r][c]='?'
            else: grid[r][c]='~' if cfg['sea'](lo,la) else '.'
    for (lo,la,ch) in cfg.get('force',[]):
        best=min(((r,c) for r in range(rows) for c in range(cols)), key=lambda rc: dist(center(*rc),(lo,la),kx,ky))
        r,c=best
        if ch in '~.':
            if (r,c) in cells: cells.remove((r,c))
            grid[r][c]=ch
        else:
            if (r,c) not in cells: cells.append((r,c))
            grid[r][c]='?'
    return grid,cells,center,kx,ky
def dist(a,b,kx,ky): return math.hypot((a[0]-b[0])*kx,(a[1]-b[1])*ky)
def assign(cfg,grid,cells,center,kx,ky):
    rnd=random.Random(cfg.get('seed',1))
    n=len(cells)
    fixed={}
    for (lo,la,t) in cfg.get('fixed',[]):
        rc=min(cells,key=lambda rc: dist(center(*rc),(lo,la),kx,ky)); fixed[rc]=t
    nd=sum(1 for t in fixed.values() if t=='D')
    num=n-nd
    share=cfg.get('share',{'W':4,'P':4,'A':4,'H':3,'G':3})
    tot=sum(share.values())
    quota={t:round(num*share[t]/tot) for t in share}
    while sum(quota.values())<num: quota[max(quota,key=lambda t: share[t]-quota[t]*tot/num)]+=1
    while sum(quota.values())>num: quota[max(quota,key=lambda t: quota[t]*tot/num-share[t])]-=1
    for rc,t in fixed.items():
        if t!='D': quota[t]-=1
    base={'W':.15,'P':.2,'A':.2,'H':.12,'G':.05}
    scores=[]
    for rc in cells:
        if rc in fixed: continue
        lo,la=center(*rc)
        for t in 'WPAHG':
            s=base[t]
            for (zt,zlo,zla,rad,wt) in cfg['zones']:
                if zt!=t: continue
                d=dist((lo,la),(zlo,zla),kx,ky)
                s=max(s, wt*math.exp(-(d/rad)**2))
            scores.append((s+rnd.random()*0.04, rc, t))
    scores.sort(reverse=True)
    out=dict(fixed)
    for s,rc,t in scores:
        if rc in out or quota[t]<=0: continue
        out[rc]=t; quota[t]-=1
    # Break blocks of more than 3 equal tiles with the swap that hurts realism least.
    sc={}
    for (sv,rc,t) in scores: sc[(rc,t)]=max(sc.get((rc,t),0),sv)
    def score(rc,t): return 1.0 if rc in fixed and fixed[rc]==t else sc.get((rc,t),0)
    def nbrs(r,c):
        if r&1: d=[(-1,0),(-1,1),(0,-1),(0,1),(1,0),(1,1)]
        else: d=[(-1,-1),(-1,0),(0,-1),(0,1),(1,-1),(1,0)]
        return [(r+a,c+b) for a,b in d]
    def cluster(rc):
        t=out[rc]; seen={rc}; st=[rc]
        while st:
            x=st.pop()
            for n in nbrs(*x):
                if n in out and n not in seen and out[n]==t: seen.add(n); st.append(n)
        return seen
    def hexd(a,b):
        def cube(r,c):
            q=c-(r-(r&1))//2; return q,r,-q-r
        x1,y1,z1=cube(*a); x2,y2,z2=cube(*b)
        return max(abs(x1-x2),abs(y1-y2),abs(z1-z2))
    for guard in range(400):
        big=[rc for rc in out if out[rc]!='D' and len(cluster(rc))>3]
        if not big: break
        best=None
        for c in big:
            if c in fixed: continue
            for p in out:
                if p in fixed or out[p] in ('D',out[c]) or hexd(c,p)>4: continue
                tc,tp=out[c],out[p]
                gain=score(c,tp)+score(p,tc)-score(c,tc)-score(p,tp)-0.02*hexd(c,p)
                out[c],out[p]=tp,tc
                ok=len(cluster(c))<=3 and len(cluster(p))<=3
                out[c],out[p]=tc,tp
                if ok and (best is None or gain>best[0]): best=(gain,c,p)
        if not best: break
        _,c,p=best; out[c],out[p]=out[p],out[c]
    for rc,t in out.items(): grid[rc[0]][rc[1]]=t
    return out
def labels(cfg,grid,cells,center,kx,ky):
    used={}; res=[]
    for (name,lo,la) in cfg['cities']:
        cand=[rc for rc in sorted(cells,key=lambda rc: dist(center(*rc),(lo,la),kx,ky)) if rc not in used]
        if not cand: continue
        rc=cand[0]
        if dist(center(*rc),(lo,la),kx,ky) > cfg['w']*0.95: continue
        used[rc]=name; res.append((rc[0],rc[1],name))
    return res
def run(cfg, show=True):
    grid,cells,center,kx,ky=generate(cfg)
    assign(cfg,grid,cells,center,kx,ky)
    lab=labels(cfg,grid,cells,center,kx,ky)
    if show:
        for i,l in enumerate(grid): print(f'{i:2d} '+(' ' if i&1 else '')+' '.join(l))
        from collections import Counter
        print(Counter(ch for l in grid for ch in l if ch in T), len(cells))
        print(lab)
    return grid,lab
def export(cfg):
    grid,lab=run(cfg,show=False)
    rows=len(grid); cols=len(grid[0])
    land=[(r,c) for r in range(rows) for c in range(cols) if grid[r][c] in T]
    r0=max(0,min(r for r,_ in land)-1); r0-=r0%2
    r1=min(rows-1,max(r for r,_ in land)+1)
    c0=max(0,min(c for _,c in land)-1); c1=min(cols-1,max(c for _,c in land)+1)
    g=[''.join(grid[r][c0:c1+1]) for r in range(r0,r1+1)]
    lab=[(r-r0,c-c0,n) for r,c,n in lab]
    return g,lab
def show(g):
    print('    '+''.join(f'{i%10}' for i in range(len(g[0]))))
    for i,l in enumerate(g): print(f'{i:2d} '+(' ' if i&1 else '')+' '.join(l))
