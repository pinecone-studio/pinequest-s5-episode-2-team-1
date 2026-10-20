import numpy as np, json, base64, io, colorsys
from PIL import Image
def load(n): return np.array(Image.open(f'raw_{n}.png')).astype(int)
def hexc(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
OUT='#2a140a'
def cleanup(a):
    dark=(a[...,:3].sum(-1)<120)&(a[...,3]>0); a[dark,:3]=hexc(OUT); return a
def desat(a,f,dk=0):
    out=a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            if a[y,x,3]==0: continue
            r,g,b=a[y,x,:3]/255; h,l,s=colorsys.rgb_to_hls(r,g,b)
            s*=1-f; l*=1-dk
            out[y,x,:3]=[int(round(v*255)) for v in colorsys.hls_to_rgb(h,l,s)]
    return out
def tint(a,col,amt):
    out=a.copy(); c=np.array(hexc(col)); m=a[...,3]>0
    out[m,:3]=(a[m,:3]*(1-amt)+c*amt).astype(int); return out
EYES=[(13,28),(41,56)]
def is_eye(p): return p[3]>0 and (p[:3].sum()<230 or p[:3].min()>195)
def lids(a,lidrow,col='#a65c39'):
    for x0,x1 in EYES:
        for y in range(25,lidrow):
            for x in range(x0,x1):
                if is_eye(a[y,x]): a[y,x,:3]=hexc(col)
        for x in range(x0,x1):
            if is_eye(a[lidrow,x]): a[lidrow,x,:3]=hexc(OUT)
    return a
def bags(a,rows,col):
    for y in rows:
        for x0,x1 in [(15,26),(43,54)]:
            for x in range(x0,x1):
                if a[y,x,3]>0: a[y,x,:3]=hexc(col)
    return a
def clear_mouth(a):
    mz=hexc('#fcd09f')
    for y in range(45,50):
        for x in range(22,48):
            if a[y,x,3]>0 and a[y,x,:3].sum()<500: a[y,x,:3]=mz
    return a
def put(a,pts,col):
    for y,x in pts: a[y,x,:3]=hexc(col); a[y,x,3]=255
    return a
stand=cleanup(load('stand')); cheer=cleanup(load('cheer')); sleep=cleanup(load('blanket'))
# tired
t=stand.copy(); t=lids(t,33); t=clear_mouth(t)
t=put(t,[(47,x) for x in range(31,39)],OUT)
t=desat(t,0.18); t=bags(t,[41],'#8f6db8')
# neglected
n=stand.copy(); n=lids(n,36,'#9b5a3c'); n=clear_mouth(n)
n=put(n,[(48,30),(47,31),(46,32),(46,33),(46,34),(46,35),(46,36),(46,37),(47,38),(48,39)],OUT)
n=desat(n,0.6,0.08); n=tint(n,'#8a9a7a',0.12)
n=bags(n,[41,42],'#5b3f86'); n=bags(n,[43],'#7d68a0')
n=put(n,[(49,40),(50,40),(51,40),(52,40)],'#7fc6ef')  # drool
sprites={'idle':stand,'cheer':cheer,'sleep':sleep,'tired':t,'neglected':n}
# ---------- accessories on stand grid (pad top 14, sides 6) ----------
PT,PS=14,6
def pad(a):
    h,w,_=a.shape; o=np.zeros((h+PT,w+2*PS,4),int); o[PT:,PS:PS+w]=a; return o
def px(o,y,x,col):
    yy,xx=y+PT,x+PS
    if 0<=yy<o.shape[0] and 0<=xx<o.shape[1]: o[yy,xx,:3]=hexc(col); o[yy,xx,3]=255
def rect(o,y0,y1,x0,x1,col):
    for y in range(y0,y1):
        for x in range(x0,x1): px(o,y,x,col)
def outline_layer(o,layer,col=OUT):
    # draw layer (mask dict y,x->color) with 1px outline
    keys=set(layer)
    for (y,x) in keys:
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            if (y+dy,x+dx) not in keys: px(o,y+dy,x+dx,col)
    for (y,x),c in layer.items(): px(o,y,x,c)
def scarf(o):
    L={}
    G,GD,GO='#2f7a4c','#1d5434','#e9b949'
    for x in range(13,58):
        cy=58-int(round(((x-35)/22)**2*3))
        for y in range(cy-2,cy+4): L[(y,x)]=G if y<cy+3 else GD
    for y in range(60,86):
        for x in range(40,49): L[(y,x)]=G if x<47 else GD
    for x in range(40,49):
        L[(84,x)]=GO; L[(85,x)]='#f0d27a'
    for y in range(86,90):
        for x in range(40,49,2): L[(y,x)]=GD
    # ulzii-ish diamonds
    for cx in (20,29,41,50):
        cy=58-int(round(((cx-35)/22)**2*3))
        for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)): L[(cy+dy,cx+dx)]=GO
    for cy in (66,74):
        for dy,dx in ((-1,0),(1,0),(0,-1),(0,1),(-2,0),(2,0),(0,-2),(0,2)): L[(cy+dy,44+dx)]=GO
        L[(cy,44)]=G
    outline_layer(o,L)
def glasses(o):
    L={}
    for cx in (20,48):
        for y in range(24,45):
            for x in range(cx-10,cx+11):
                d=((x-cx)**2+(y-34)**2)**0.5
                if 8.6<=d<10.2: L[(y,x)]='#23233a'
    for x in range(30,39): L[(31,x)]='#23233a'
    for (y,x),c in L.items(): px(o,y,x,c)
    # lens glint
    for cx in (20,48):
        for d in range(3): px(o,28+d,cx-5+d,'#ffffff')
def gradcap(o):
    L={}
    N,ND,GO='#2e2f5c','#1f2042','#f2c14a'
    for y in range(-10,-3):
        w=18-abs(y+6)*3
        for x in range(35-w,35+w+1): L[(y,x)]=N if y<-6 else ND
    for y in range(-4,4):
        for x in range(23,48): L[(y,x)]=ND
    outline_layer(o,L)
    for x in range(35,51): px(o,-7,x,GO)
    for y in range(-7,6): px(o,y,51,GO)
    rect(o,6,10,50,53,GO); px(o,-7,35,'#ffe08a')
def headphones(o):
    L={}
    P,PD='#8b6cf6','#6a4fd6'
    for y in range(-8,40):
        for x in range(0,71):
            d=((x-35)**2+((y-26)*1.05)**2)**0.5
            if 31<=d<34.5 and y<12: L[(y,x)]=P
    for cx in (6,64):
        for y in range(6,26):
            for x in range(cx-5,cx+6):
                if abs(x-cx)+max(0,abs(y-16)-6)<=6: L[(y,x)]=P if x<cx+3 else PD
    outline_layer(o,L)
    for cx in (6,64): px(o,12,cx-2,'#c9b8ff'); px(o,13,cx-2,'#c9b8ff')
items={'scarf':scarf,'glasses':glasses,'gradcap':gradcap,'headphones':headphones}
def with_items(base,names):
    o=pad(base)
    for k in names: items[k](o)
    return o
padded={k:pad(v) for k,v in sprites.items() if k in('idle','tired','neglected')}
outfits={'idle_scarf':with_items(stand,['scarf']),'tired_scarf':with_items(t,['scarf']),'neglected_scarf':with_items(n,['scarf']),
 'item_scarf':with_items(stand,['scarf']),'item_glasses':with_items(stand,['glasses']),'item_gradcap':with_items(stand,['gradcap']),
 'item_headphones':with_items(stand,['headphones']),'full':with_items(stand,['scarf','glasses','gradcap'])}
# heads (stand grid rows 0..58)
def head(a,rows=60): return a[:rows]
heads={'h_happy':cheer[:54,4:86],'h_idle':head(stand),'h_sleep':head(sleep),'h_tired':head(t),'h_neglected':head(n)}
# ---------- pixel icons ----------
ICONS={
'coin':(['....####....','..##YYYY##..','.#YYWWYYYY#.','.#YWYYYYOY#.','#YYWYOOYYOY#','#YYYYOOYYOY#','#YYYYOOYYOY#','#YYYYOOYYOY#','.#YYYYYYOY#.','.#YOYYYYOO#.','..##OOOO##..','....####....'],{'#':'#2a140a','Y':'#f6c445','W':'#fff3c4','O':'#d99a2b'}),
'flame':(['.....#......','....#R#.....','...#RR#.....','...#RRR#.#..','..#RRORR##R#','..#ROORRRR#.','.#RROOORRR#.','.#ROOYYOOR#.','.#ROYYYYOR#.','.#ROYYYYOR#.','..#ROYYOR#..','...######...'],{'#':'#2a140a','R':'#f0643c','O':'#f79a3c','Y':'#ffd95a'}),
'star':(['.....##.....','....#YY#....','....#YY#....','.###YYYY###.','#YYYYWYYYYY#','.#YYYWYYYY#.','..#YYYYYY#..','..#YYYYYY#..','.#YYY##YYY#.','.#YY#..#YY#.','.##.....##..','............'],{'#':'#2a140a','Y':'#b8a4ff','W':'#ffffff'}),
'heart':(['............','.###...###..','#RRR#.#RRR#.','#RWRR#RRRR#.','#RWRRRRRRR#.','#RRRRRRRRR#.','.#RRRRRRR#..','..#RRRRR#...','...#RRR#....','....#R#.....','.....#......','............'],{'#':'#2a140a','R':'#f27fa8','W':'#ffd6e6'}),
'box':(['..##########..','.#GGGGGGGGGG#.','#GGGGGWWGGGGG#','#DDDDDWWDDDDD#','.#GGGGWWGGGG#.','.#GGG?WW?GGG#.','.#GGGGWWGGGG#.','.#GG?GWWG?GG#.','.#GGGGWWGGGG#.','.#DDDDWWDDDD#.','.############.'],{'#':'#2a140a','G':'#8b6cf6','D':'#6a4fd6','W':'#f2f56b','?':'#ffffff'}),
'lock':(['...####...','..#....#..','..#....#..','.########.','.#YYYYYY#.','.#YY##YY#.','.#YY##YY#.','.#YYYYYY#.','.########.'],{'#':'#2a140a','Y':'#c9c8be','.':None}),
'leaf':(['.......###','.....##GG#','...##GGGG#','..#GGGLGG#','.#GGGLGG#.','.#GGLGG#..','#GGLGG#...','#GLL##....','##........'],{'#':'#2a140a','G':'#7cc47f','L':'#4f9a57'}),
}
def icon_img(rows,cmap):
    h=len(rows); w=max(len(r) for r in rows); o=np.zeros((h,w,4),int)
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            c=cmap.get(ch)
            if c: o[y,x,:3]=hexc(c); o[y,x,3]=255
    return o
icons={k:icon_img(*v) for k,v in ICONS.items()}
def b64(a):
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8),'RGBA'); bio=io.BytesIO(); im.save(bio,'PNG',optimize=True)
    return 'data:image/png;base64,'+base64.b64encode(bio.getvalue()).decode(), im
allimg={}
for d in (sprites,padded and {('p_'+k):v for k,v in padded.items()},outfits,heads,icons):
    for k,v in d.items():
        uri,im=b64(v); allimg[k]={'uri':uri,'w':im.width,'h':im.height}; im.save(f'sprites/{k}.png')
json.dump(allimg,open('sprites.json','w'))
print({k:(v['w'],v['h'],len(v['uri'])) for k,v in allimg.items()})
# ---- cheer + scarf (head centred 10px right, no top pad needed) ----
def scarf_shift(base,dx):
    global PT,PS
    oPT,oPS=PT,PS; PT,PS=3,dx
    o=base.copy(); scarf(o); PT,PS=oPT,oPS; return o
cs=scarf_shift(cheer,10)
Image.fromarray(np.clip(cs,0,255).astype(np.uint8),'RGBA').save('sprites/cheer_scarf.png')
