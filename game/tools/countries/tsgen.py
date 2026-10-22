import math, itertools, json
import gen
from gen import T
def nb(r,c):
    d=[(-1,0,0),(-1,1,1)] if False else None
def neighbour(r,c,side):
    # side: 0 NE, 1 E, 2 SE, 3 SW, 4 W, 5 NW in odd-r offset
    odd=r&1
    table={0:(-1,1 if odd else 0),1:(0,1),2:(1,1 if odd else 0),3:(1,0 if odd else -1),4:(0,-1),5:(-1,0 if odd else -1)}
    dr,dc=table[side]; return r+dr,c+dc
def pos(r,c): return (c+0.5*(r&1), r*0.866)
def cube(r,c):
    q=c-(r-(r&1))//2; return q,r,-q-r
def hexd(a,b):
    x1,y1,z1=cube(*a); x2,y2,z2=cube(*b); return max(abs(x1-x2),abs(y1-y2),abs(z1-z2))
KIND={'G':'gondola','W':'treehouse','H':'mine','A':'mine','P':'treehouse','D':'mine'}
PREF={'treehouse':['lumber','wool'],'gondola':['ore','wool'],'mine':['brick','ore'],'harbor':['grain','wool','lumber','brick','ore']}
def auto_ports(rows):
    R=len(rows); C=len(rows[0])
    land=[(r,c) for r in range(R) for c in range(C) if rows[r][c] in T]
    cx=sum(pos(*x)[0] for x in land)/len(land); cy=sum(pos(*x)[1] for x in land)/len(land)
    cands=[]
    for (r,c) in land:
        for side in range(6):
            nr,nc=neighbour(r,c,side)
            if not (0<=nr<R and 0<=nc<C): continue
            ch=rows[nr][nc]
            if ch=='~': kind='harbor'
            elif ch=='.': kind=KIND[rows[r][c]]
            else: continue
            x,y=pos(r,c); ang=math.degrees(math.atan2(y-cy,x-cx))
            end='E' if -45<=ang<45 else 'S' if 45<=ang<135 else 'N' if -135<=ang<-45 else 'W'
            dirv={'N':(0,-1),'E':(1,0),'S':(0,1),'W':(-1,0)}[end]
            proj=(x-cx)*dirv[0]+(y-cy)*dirv[1]
            cands.append(dict(r=r,c=c,side=side,kind=kind,end=end,proj=proj,ang=ang))
    chosen=[]
    def ok(cd,mind):
        return all(hexd((cd['r'],cd['c']),(o['r'],o['c']))>=mind for o in chosen)
    for end in 'NESW':
        cs=sorted([x for x in cands if x['end']==end],key=lambda x:-x['proj'])
        first=next((cd for cd in cs if ok(cd,2)),None)
        if not first: continue
        chosen.append(first)
        # The second post of an end: a different kind (land vs. sea) if there is one, for variety.
        land=lambda x: x['kind']!='harbor'
        for mind in (3,2):
            pick=next((cd for cd in cs if cd is not first and land(cd)!=land(first) and ok(cd,mind)),None) or next((cd for cd in cs if cd is not first and ok(cd,mind)),None)
            if pick: chosen.append(pick); break
    # top up if some end was short
    for mind in (3,2,1):
        for cd in sorted(cands,key=lambda x:-abs(x['proj'])):
            if len(chosen)>=8: break
            if ok(cd,mind): chosen.append(cd)
    chosen=chosen[:8]
    # A country with a coast always gets at least one harbour, on the sea side.
    harbours=[x for x in cands if x['kind']=='harbor']
    if harbours and not any(x['kind']=='harbor' for x in chosen):
        h=max(harbours,key=lambda x: min(hexd((x['r'],x['c']),(o['r'],o['c'])) for o in chosen))
        drop=min(chosen,key=lambda o: hexd((o['r'],o['c']),(h['r'],h['c'])))
        chosen[chosen.index(drop)]=h
    chosen.sort(key=lambda x:(x['ang']+90)%360)
    anyidx=[1,4,7]
    rest=[i for i in range(len(chosen)) if i not in anyidx]
    res=['lumber','brick','wool','grain','ore']
    best=None
    for perm in itertools.permutations(res):
        sc=0
        for i,rr in zip(rest,perm):
            k=chosen[i]['kind']; p=PREF[k]
            sc+= (2 if rr==p[0] else 1 if rr in p else 0)
        if best is None or sc>best[0]: best=(sc,perm)
    types=['any']*len(chosen)
    for i,rr in zip(rest,best[1]): types[i]=rr
    for cd,t in zip(chosen,types): cd['type']=t
    return chosen
def water_cells(rows, cfg, center_fn, waters, r0, c0):
    out=[]
    R=len(rows); C=len(rows[0])
    for name,lo,la in waters:
        best=None
        for r in range(R):
            for c in range(C):
                if rows[r][c]!='~': continue
                x,y=center_fn(r+r0,c+c0)
                d=gen.dist((x,y),(lo,la),cfg['_kx'],111)
                if best is None or d<best[0]: best=(d,r,c)
        if best and best[0] < cfg['w']*2.5 and not any((best[1],best[2])==(o[0],o[1]) for o in out): out.append((best[1],best[2],name))
    return out
def build(cfg, w, max_labels=None):
    cfg=dict(cfg); cfg['w']=w
    grid,cells,center,kx,ky=gen.generate(cfg)
    if cfg.get('mainland_only'):
        # Drop specks of land cut off from the main body (rasterising artefacts, not real islands).
        cs=set(cells); comps=[]
        while cs:
            st=[cs.pop()]; comp={st[0]}
            while st:
                r,c=st.pop()
                for side in range(6):
                    n=neighbour(r,c,side)
                    if n in cs: cs.remove(n); comp.add(n); st.append(n)
            comps.append(comp)
        keep=max(comps,key=len)
        for rc in list(cells):
            if rc not in keep:
                cells.remove(rc); lo,la=center(*rc); grid[rc[0]][rc[1]]='~' if cfg['sea'](lo,la) else '.'
    gen.assign(cfg,grid,cells,center,kx,ky)
    lab=gen.labels(cfg,grid,cells,center,kx,ky)
    rows=len(grid); cols=len(grid[0])
    land=[(r,c) for r in range(rows) for c in range(cols) if grid[r][c] in T]
    r0=max(0,min(r for r,_ in land)-1); r0-=r0%2
    r1=min(rows-1,max(r for r,_ in land)+1)
    c0=max(0,min(c for _,c in land)-1); c1=min(cols-1,max(c for _,c in land)+1)
    g=[''.join(grid[r][c0:c1+1]) for r in range(r0,r1+1)]
    lab=[(r-r0,c-c0,n) for r,c,n in lab]
    if max_labels: lab=lab[:max_labels]
    cfg['_kx']=kx
    waters=water_cells(g,cfg,center,cfg.get('waters',[]),r0,c0)
    return g,lab,waters,len(cells)
def ts_function(fn, name, flag, rows, labels, waters, ports, seed, doc, bridges=None):
    L=[f"/**\n * {doc}\n */", f"export function {fn}(): MapDef {{", "  return drawnMap({", f"    name: '{name}',"]
    if flag: L.append(f"    flag: {flag},")
    L.append("    rows: [")
    for r in rows: L.append(f"      '{r}',")
    L.append("    ],")
    L.append("    // Two trading posts at each end of the country, the 3:1 ones never side by side.")
    L.append("    ports: [")
    for p in ports: L.append(f"      {{ row: {p['r']}, col: {p['c']}, type: '{p['type']}', kind: '{p['kind']}', sides: [{p['side']}] }},")
    L.append("    ],")
    L.append("    labels: [")
    for (r,c,n) in labels: L.append(f"      {{ row: {r}, col: {c}, text: '{n}' }},")
    L.append("    ],")
    if waters: L.append("    waters: [" + ", ".join(f"{{ row: {r}, col: {c}, text: '{n}' }}" for r,c,n in waters) + "],")
    if bridges: L.append(f"    bridges: {bridges},")
    L.append(f"    seed: {seed},")
    L.append("  });\n}\n")
    return '\n'.join(L)
def tiles_at(cfg, w):
    cfg=dict(cfg); cfg['w']=w
    grid,cells,center,kx,ky=gen.generate(cfg)
    return len(cells)
def fit_small(cfg, lo=17, hi=21):
    w=cfg['w']
    for k in range(200):
        n=tiles_at(cfg,w)
        if lo<=n<=hi: return w,n
        w*= 1.03 if n>hi else 0.97
    return w,n
