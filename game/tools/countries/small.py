import sys, re
sys.path.insert(0,'.')
import gen, tsgen, ukie
def load(f, w):
    src=open(f).read().replace('run(cfg)','')
    src=src.replace("float(sys.argv[1]) if len(sys.argv)>1 else 79",str(w)).replace("float(sys.argv[1])",str(w))
    ns={'sys':sys}; exec(src,ns); return ns['cfg']
DEP=[(8.3,55.05),(9.4,54.85),(10.0,54.6),(10.2,54.4),(11.1,54.45),(10.9,54.0),(11.5,54.0),(12.1,54.2),(12.5,54.45),(13.4,54.65),(14.2,53.95),(14.4,53.3),(14.6,52.6),(14.7,52.1),(14.9,51.6),(15.0,51.15),(14.8,50.85),(14.3,51.0),(13.5,50.65),(12.5,50.35),(12.1,50.3),(12.4,49.8),(12.6,49.4),(13.4,48.95),(13.8,48.75),(13.45,48.55),(13.0,48.25),(12.8,47.7),(13.0,47.5),(12.2,47.6),(11.4,47.45),(10.9,47.45),(10.2,47.3),(9.7,47.55),(9.0,47.7),(8.6,47.65),(7.6,47.6),(7.5,48.0),(7.8,48.6),(8.2,48.98),(7.0,49.1),(6.4,49.45),(6.1,49.5),(6.4,49.8),(6.1,50.2),(6.0,50.75),(5.9,51.05),(6.2,51.5),(5.95,51.8),(6.8,52.0),(7.0,52.25),(7.1,52.6),(7.2,53.25),(7.0,53.6),(8.0,53.7),(8.5,53.55),(8.9,53.9),(8.8,54.3),(8.6,54.5)]
def de_sea(lo,la):
    if la>54.75 and 8.2<lo<12.7: return False
    if la>53.55 and lo<9.0: return True
    if la>53.95 and 9.0<=lo<14.4: return True
    return False
DE=dict(name='Deutschland',polys=[DEP],lon0=5.4,lat0=55.4,latc=51,w=80,rows=15,cols=10,sea=de_sea,force=[],
 fixed=[(10.2,53.1,'D')],
 zones=[('G',11.0,47.5,70,1.0),('G',10.6,51.8,40,.95),('G',8.57,51.4,40,.95),('G',12.9,50.5,40,.9),('G',6.7,50.3,40,.8),('G',7.0,49.3,30,.7),
  ('W',8.2,48.3,60,1.0),('W',13.2,49.0,50,.9),('W',10.8,50.6,40,.85),('W',7.8,49.3,40,.8),('W',12.8,53.4,60,.7),
  ('A',11.4,52.1,60,1.0),('A',11.5,48.4,60,.85),('A',6.5,50.9,40,.85),('A',10.3,54.0,40,.8),('A',12.4,51.3,40,.8),
  ('P',9.3,54.6,50,1.0),('P',7.5,53.4,50,.95),('P',10.3,47.7,40,.85),('P',9.3,48.4,40,.8),
  ('H',7.3,51.5,40,.95),('H',11.1,49.4,40,.9),('H',12.1,49.0,40,.85),('H',14.3,51.5,40,.85),('H',8.8,53.1,40,.8),('H',9.7,52.4,40,.7)],
 cities=[('Berlin',13.4,52.52),('Hamburg',10.0,53.55),('München',11.58,48.14),('Köln',6.96,50.94),('Frankfurt',8.68,50.11),('Stuttgart',9.18,48.78),('Leipzig',12.37,51.34),('Dresden',13.74,51.05),('Hannover',9.73,52.37),('Nürnberg',11.08,49.45),('Bremen',8.8,53.08),('Kiel',10.13,54.32)],
 waters=[('Nordsee',7.0,54.6),('Ostsee',12.5,54.8)], seed=49)
UAP=[(23.6,51.55),(24.4,51.9),(25.3,51.95),(26.3,51.85),(27.2,51.6),(28.2,51.55),(29.2,51.45),(30.2,51.45),(30.6,51.3),(30.9,52.05),(31.8,52.1),(32.4,52.3),(33.2,52.36),(34.1,51.8),(34.4,51.25),(35.1,51.2),(35.4,50.6),(36.1,50.4),(37.4,50.35),(38.0,50.0),(38.6,49.95),(39.2,49.85),(40.1,49.6),(40.15,49.1),(39.7,48.6),(39.85,48.05),(39.0,47.85),(38.3,47.4),(38.2,47.1),(37.5,47.0),(36.8,46.7),(35.8,46.6),(35.2,46.3),(34.8,46.15),(33.8,46.1),(33.4,46.0),(32.6,46.1),(31.6,46.5),(31.5,46.6),(30.75,46.45),(30.4,46.1),(30.0,45.8),(29.7,45.4),(29.6,45.2),(28.8,45.3),(28.2,45.5),(28.5,45.75),(28.95,46.0),(29.6,46.4),(30.05,46.45),(29.9,46.8),(29.55,47.1),(29.2,47.5),(29.2,47.95),(28.7,48.1),(28.2,48.3),(27.5,48.48),(26.6,48.3),(26.2,48.0),(25.2,47.9),(24.6,47.95),(23.5,48.0),(22.9,47.95),(22.6,48.1),(22.15,48.4),(22.5,49.0),(22.7,49.15),(22.6,49.6),(23.1,50.05),(23.7,50.4),(24.1,50.9)]
CRI=[(33.75,46.1),(33.0,45.8),(32.5,45.35),(33.4,45.2),(33.5,44.6),(33.8,44.4),(34.2,44.5),(34.4,44.7),(35.0,44.85),(35.4,45.0),(36.6,45.35),(36.4,45.45),(35.9,45.4),(35.0,45.5),(34.5,46.0)]
def ua_sea(lo,la):
    if lo>36.8 and la<45.6: return False
    if lo<29.6 and la<45.4: return False
    if 29.6<lo<36.8 and la<46.3: return True
    if 34.8<lo<39.3 and 45.4<la<47.1: return True
    if 28.6<lo<41 and la<45.2: return True
    return False
UA=dict(name='Ukraine',polys=[UAP,CRI],lon0=21.6,lat0=52.6,latc=48.5,w=95,rows=13,cols=17,sea=ua_sea,force=[],
 fixed=[(32.9,46.6,'D'),(34.2,44.7,'G')],
 zones=[('G',24.3,48.3,70,1.0),('G',38.5,48.2,70,.95),('G',33.4,47.9,40,.95),('G',28.6,50.6,50,.85),('G',34.2,44.7,40,1.0),
  ('W',27.0,51.5,110,1.0),('W',31.5,51.6,60,.9),('W',23.5,48.6,40,.8),
  ('A',31.5,48.8,140,1.0),('A',33.0,46.8,60,.8),('A',34.5,49.6,60,.85),
  ('P',29.5,46.0,50,.95),('P',34.8,50.9,50,.8),('P',34.0,45.6,40,.8),('P',26.5,48.8,50,.7),
  ('H',24.0,49.8,50,.9),('H',35.0,48.5,50,.85),('H',35.2,47.8,40,.8),('H',36.3,50.0,40,.8),('H',28.5,49.2,40,.7)],
 cities=[('Kyjiw',30.52,50.45),('Charkiw',36.25,49.99),('Odesa',30.73,46.48),('Dnipro',35.05,48.46),('Lwiw',24.03,49.84),('Donezk',37.8,48.0),('Saporischschja',35.14,47.84),('Krywyj Rih',33.39,47.91),('Simferopol',34.1,44.95),('Winnyzja',28.47,49.23),('Mariupol',37.54,47.1)],
 waters=[('Schwarzes Meer',31.5,44.5),('Asowsches Meer',36.5,46.2)], seed=1991)
WAT={'pl':[('Ostsee',17.0,55.2)],
 'it':[('Adria',14.5,43.2),('Tyrrhenisches Meer',11.5,40.0),('Mittelmeer',13.0,36.6),('Ionisches Meer',18.0,38.5),('Ligurisches Meer',8.8,43.7)],
 'fr':[('Ärmelkanal',-2.0,50.0),('Atlantik',-5.5,46.5),('Mittelmeer',5.0,42.5),('Golf von Biskaya',-3.0,44.8)]}
TOP={'pl':['Warschau','Krakau','Łódź','Breslau','Posen','Danzig','Stettin','Kattowitz'],
 'it':['Rom','Mailand','Neapel','Turin','Palermo','Florenz','Venedig','Bari','Cagliari'],
 'fr':['Paris','Marseille','Lyon','Toulouse','Nizza','Nantes','Straßburg','Bordeaux','Lille','Dune du Pilat','Ajaccio'],
 'at':['Wien','Graz','Linz','Salzburg','Innsbruck','Klagenfurt','Seewinkel','Bregenz'],
 'ch':['Bern','Zürich','Genf','Basel','Lausanne','Luzern','Lugano','Aletschgletscher','Chur']}
FLAGS={'de':"{ colors: ['#000000', '#dd0000', '#ffce00'] }",'ua':"{ colors: ['#0057b7', '#ffd700'] }",'pl':"{ colors: ['#ffffff', '#dc143c'] }",
 'it':"{ colors: ['#009246', '#ffffff', '#ce2b37'], layout: 'vertical' }",'fr':"{ colors: ['#0055a4', '#ffffff', '#ef4135'], layout: 'vertical' }",
 'at':"{ colors: ['#ed2939', '#ffffff', '#ed2939'] }",'ch':"{ colors: ['#da291c', '#ffffff'], layout: 'cross' }",
 'uk':"{ colors: ['#012169', '#ffffff', '#c8102e'], layout: 'union' }",'ie':"{ colors: ['#169b62', '#ffffff', '#ff883e'], layout: 'vertical' }"}
FN={'de':'germanySmallMap','ua':'ukraineSmallMap','pl':'polandSmallMap','it':'italySmallMap','fr':'franceSmallMap','at':'austriaSmallMap','ch':'switzerlandSmallMap','uk':'unitedKingdomSmallMap','ie':'irelandSmallMap'}
cfgs={'de':DE,'ua':UA,'pl':load('pl.py',79),'it':load('it.py',72),'fr':load('fr.py',89),'at':load('at.py',47),'ch':load('ch.py',40),'uk':dict(ukie.UK),'ie':dict(ukie.IE)}
for k in ('pl','it','fr'): cfgs[k]['waters']=WAT[k]
for k,top in TOP.items():
    cmap={c[0]:c for c in cfgs[k]['cities']}
    cfgs[k]['cities']=[cmap[n] for n in top if n in cmap]
cfgs['uk']['cities']=[c for c in cfgs['uk']['cities'] if c[0] in ('London','Dungeness','Birmingham','Glasgow','Manchester','Edinburgh','Cardiff','Belfast','Newcastle','Plymouth')]
cfgs['ie']['cities']=[c for c in cfgs['ie']['cities'] if c[0] in ('Dublin','Burren','Cork','Limerick','Galway','Waterford','Sligo','Donegal')]
# small maps: no lakes, but keep islands
for k in ('pl','it','at','ch'): cfgs[k]['force']=[f for f in cfgs[k]['force'] if f[2] not in '~']
cfgs['it']['force']=[(14.2,37.5,'X'),(9.0,40.0,'X')]
cfgs['it']['fixed']=[f for f in cfgs['it']['fixed'] if f[2]=='D']+[(15.0,37.75,'G')]
cfgs['fr']['fixed']=[f for f in cfgs['fr']['fixed'] if f[2]=='D' or f[1]==48.86]
cfgs['fr']['force']=[(9.0,42.2,'X')]
cfgs['ie']['mainland_only']=True
out=[]
for k,cfg in cfgs.items():
    cfg['rows']=cfg['rows']+2; cfg['cols']=cfg['cols']+2
    w,n=tsgen.fit_small(cfg)
    g,lab,waters,n=tsgen.build(cfg,w,max_labels=8)
    ports=tsgen.auto_ports(g)
    print(f'=== {k} w={w:.0f} tiles={n} ports={len(ports)}'); gen.show(g); print(lab, waters)
    doc=f"{cfg['name']}, small: the same outline and regions in at most 21 tiles (about {w:.0f} km per hex)."
    out.append(tsgen.ts_function(FN[k],cfg['name'],FLAGS[k],g,lab,waters,ports,cfg['seed'],doc))
open('small.ts','w').write('\n'.join(out))
