import sys; sys.path.insert(0,'.')
from newc import *
FL={'nl':"{ colors: ['#ae1c28', '#ffffff', '#21468b'] }",'be':"{ colors: ['#000000', '#fdda24', '#ef3340'], layout: 'vertical' }",
 'lu':"{ colors: ['#ed2939', '#ffffff', '#00a1de'] }",'li':"{ colors: ['#002b7f', '#ce1126'] }",
 'es':"{ colors: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] }"}
DOC={'nl':"the Netherlands: Frisian pastures, Groningen farmland and gas, the Veluwe and Drenthe woods,\n * river-clay brickworks along the Rhine and Waal, IJmuiden steel and Limburg coal, the IJsselmeer, and the\n * Loonse Duinen sand dunes under the flag.",
 'be':"Belgium: Flemish fields and pastures, the Boom clay brickworks on the Rupel, Campine and Walloon coal\n * (Genk, Charleroi, Liège), the Ardennes forests and the Hautes Fagnes, and the Kalmthout heath under the flag.",
 'lu':"Luxembourg: the Ösling forests of the Ardennes in the north, Gutland farmland, Moselle vineyards, the\n * Mullerthal sandstone, the Minett iron-ore basin, and the Remerschen gravel pits under the flag.",
 'li':"Liechtenstein: Rhine valley farmland in the west, the Unterland hills, forested slopes, and the Alps from\n * Malbun to the Naafkopf; the flag stands on the Rhine gravel at Balzers.",
 'es':"Spain: Galician and Cantabrian pastures, the Pyrenees, Picos de Europa and Sierra Nevada, the wheat\n * of Castile and La Mancha, Extremadura's dehesa, Valencian and Catalan clay, the Río Tinto mines, Mallorca,\n * and the Tabernas desert under the flag."}
FN={'nl':'netherlands','be':'belgium','lu':'luxembourg','li':'liechtenstein','es':'spain'}
TARGET={'nl':((30,34),(18,21)),'be':((27,31),(18,21)),'lu':((24,28),(15,18)),'li':((22,26),(15,18)),'es':((72,80),(18,21))}
W0={'nl':33,'be':34,'lu':9,'li':3.2,'es':92}
cfgs={'nl':NL,'be':BE,'lu':LU,'li':LI,'es':ES}
out=[]
for k,c in cfgs.items():
    c=frame(dict(c),c['polys'])
    for size,(lo,hi) in zip(('big','small'),TARGET[k]):
        w,n=fit(c,lo,hi,W0[k] if size=='big' else W0[k]*1.4)
        cc=sized(c,w)
        if size=='small': cc['waters']=[x for x in cc['waters'] if x[0]!='IJsselmeer']; cc['force']=[f for f in cc['force'] if f[2]!='~']
        g,lab,waters,n=tsgen.build(cc,w,max_labels=None if size=='big' else 8)
        ports=tsgen.auto_ports(g)
        print(f'=== {k} {size} w={w:.1f} tiles={n} ports={len(ports)}'); gen.show(g); print(lab); print(waters)
        print([(p['r'],p['c'],p['kind'],p['type']) for p in ports])
        fn=FN[k]+('SmallMap' if size=='small' else 'Map')
        doc=(DOC[k][0].upper()+DOC[k][1:]) if size=='big' else f"{c['name']}, small: the same outline and regions in at most 21 tiles."
        out.append(tsgen.ts_function(fn,c['name'],FL[k],g,lab,waters,ports,c['seed'],doc))
open('newc.ts','w').write('\n'.join(out))
