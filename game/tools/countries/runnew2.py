import sys; sys.path.insert(0,'.')
from newc2 import *
FL={'pt':"{ colors: ['#006600', '#ff0000', '#ff0000'], layout: 'vertical' }",
 'cz':"{ colors: ['#ffffff', '#d7141a', '#11457e'], layout: 'triangle' }",
 'sk':"{ colors: ['#ffffff', '#0b4ea2', '#ee1c25'], emblem: 'sk' }",
 'si':"{ colors: ['#ffffff', '#005da4', '#ed1c24'], emblem: 'si' }",
 'hu':"{ colors: ['#ce2939', '#ffffff', '#477050'] }"}
DOC={'pt':"Portugal: Minho forests and pastures, the mountains of Trás-os-Montes and the Serra da Estrela,\n * Douro vineyards, Alentejo wheat and cork, Aveiro ceramics, the Neves-Corvo mine and the Algarve, with the\n * Tróia dunes under the flag.",
 'cz':"Czechia: the Bohemian basin's fields, the Erzgebirge, Giant Mountains and Jeseníky, Ostrava coal, the\n * Bohemian Forest and Beskids, the Bohemian-Moravian highlands, Pilsen and Most, and the Moravian Sahara.",
 'sk':"Slovakia: the High and Low Tatras, the Slovak Ore Mountains and Banská Štiavnica, Košice steel, the\n * Danubian and East Slovak lowlands, Liptov and Orava meadows, and the Záhorie sand dunes under the flag.",
 'si':"Slovenia: the Julian and Kamnik Alps, Idrija's mercury mine, Kočevje and Pohorje forests, Karst pastures\n * of the Lipizzaners, the Prekmurje and Drava plains, and a short Adriatic coast at Koper.",
 'hu':"Hungary: the Great Plain's wheat, the Hortobágy puszta, the Mátra and Bükk, Mecsek coal and Bakony\n * bauxite, the Őrség and Gemenc forests, Lake Balaton, and the Kiskunság sands under the flag."}
FN={'pt':'portugal','cz':'czechia','sk':'slovakia','si':'slovenia','hu':'hungary'}
TARGET={'pt':((38,42),(18,21)),'cz':((36,40),(18,21)),'sk':((28,32),(17,20)),'si':((22,25),(15,17)),'hu':((38,42),(18,21))}
W0={'pt':48,'cz':45,'sk':40,'si':28,'hu':48}
cfgs={'pt':PT,'cz':CZ,'sk':SK,'si':SI,'hu':HU}
out=[]
for k,c in cfgs.items():
    c=frame(dict(c),c['polys'])
    for size,(lo,hi) in zip(('big','small'),TARGET[k]):
        w,n=fit(c,lo,hi,W0[k] if size=='big' else W0[k]*1.4)
        cc=sized(c,w)
        if size=='small': cc['force']=[f for f in cc['force'] if f[2]!='~']; cc['waters']=[x for x in cc['waters'] if x[0]!='Plattensee']
        g,lab,waters,n=tsgen.build(cc,w,max_labels=None if size=='big' else 8)
        ports=tsgen.auto_ports(g)
        print(f'=== {k} {size} w={w:.1f} tiles={n}'); gen.show(g); print(waters); print([(p['r'],p['c'],p['kind'],p['type']) for p in ports])
        fn=FN[k]+('SmallMap' if size=='small' else 'Map')
        doc=DOC[k] if size=='big' else f"{c['name']}, small: the same outline and regions in at most 21 tiles."
        out.append(tsgen.ts_function(fn,c['name'],FL[k],g,lab,waters,ports,c['seed'],doc))
open('newc2.ts','w').write('\n'.join(out))
