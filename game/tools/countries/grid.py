import math, sys, json
def inside(pt, poly):
    x,y=pt; c=False; n=len(poly)
    for i in range(n):
        x1,y1=poly[i]; x2,y2=poly[(i+1)%n]
        if (y1>y)!=(y2>y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
def build(polys, cities, lon0, lat0, w, rows, cols, lat_c):
    kx=111*math.cos(math.radians(lat_c)); ky=111
    S=w/math.sqrt(3)
    proj=lambda lo,la: ((lo-lon0)*kx, (lat0-la)*ky)
    P=[[proj(*p) for p in poly] for poly in polys]
    grid=[]
    for r in range(rows):
        line=''
        for c in range(cols):
            x=w*(c+0.5*(r&1)); y=1.5*S*r
            k='.'
            for i,poly in enumerate(P):
                if inside((x,y),poly): k=str(i)
            line+=k
        grid.append(line)
    lab={}
    for name,(lo,la) in cities.items():
        x,y=proj(lo,la)
        best=None
        for r in range(rows):
            for c in range(cols):
                cx=w*(c+0.5*(r&1)); cy=1.5*S*r
                d=math.hypot(cx-x,cy-y)
                if best is None or d<best[0]: best=(d,r,c)
        lab[name]=(best[1],best[2],grid[best[1]][best[2]])
    return grid,lab
