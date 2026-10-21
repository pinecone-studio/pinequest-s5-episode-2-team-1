import numpy as np, json, random
from PIL import Image
random.seed(7)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
class C:
    def __init__(s,w,h,bg=None):
        s.w,s.h=w,h; s.a=np.zeros((h,w,4),int)
        if bg: s.a[...,:3]=hx(bg); s.a[...,3]=255
    def p(s,x,y,col,al=255):
        x,y=int(x),int(y)
        if 0<=x<s.w and 0<=y<s.h:
            c=hx(col) if isinstance(col,str) else col
            if al>=255 or s.a[y,x,3]==0: s.a[y,x,:3]=c; s.a[y,x,3]=max(al,s.a[y,x,3])
            else:
                t=al/255; s.a[y,x,:3]=(np.array(c)*t+s.a[y,x,:3]*(1-t)).astype(int)
    def rect(s,x0,y0,x1,y1,col,al=255):
        for y in range(int(y0),int(y1)+1):
            for x in range(int(x0),int(x1)+1): s.p(x,y,col,al)
    def poly(s,pts,col,al=255):
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; n=len(pts)
        for y in range(max(0,int(min(ys))-1),min(s.h,int(max(ys))+2)):
            for x in range(max(0,int(min(xs))-1),min(s.w,int(max(xs))+2)):
                px,py=x+.5,y+.5; ins=False; j=n-1
                for i in range(n):
                    xi,yi=pts[i]; xj,yj=pts[j]
                    if (yi>py)!=(yj>py) and px<(xj-xi)*(py-yi)/(yj-yi)+xi: ins=not ins
                    j=i
                if ins: s.p(x,y,col,al)
    def blit(s,spr,x,y):
        h,w,_=spr.shape
        for j in range(h):
            for i in range(w):
                if spr[j,i,3]>0: s.p(x+i,y+j,tuple(spr[j,i,:3]),spr[j,i,3])
    def img(s): return Image.fromarray(np.clip(s.a,0,255).astype(np.uint8),'RGBA')
def outline(spr,col):
    h,w,_=spr.shape; o=np.zeros((h+2,w+2,4),int); o[1:-1,1:-1]=spr
    f=o[...,3]>0; c=hx(col)
    add=[]
    for y in range(h+2):
        for x in range(w+2):
            if f[y,x]: continue
            if any(0<=y+dy<h+2 and 0<=x+dx<w+2 and f[y+dy,x+dx] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))): add.append((y,x))
    for y,x in add: o[y,x,:3]=c; o[y,x,3]=255
    return o
FONT={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'5':['111','100','111','001','111'],'+':['000','010','111','010','000'],'?':['111','001','011','000','010'],'3':['111','001','111','001','111']}
def text(c,s,x,y,col):
    for ch in s:
        g=FONT[ch]
        for j,row in enumerate(g):
            for i,v in enumerate(row):
                if v=='1': c.p(x+i,y+j,col)
        x+=4
# ---------- sprites ----------
def pine(w,h,dark=False,fade=0.0):
    c=C(w,h)
    L,M,D,T='#6CC07A','#3F9A5C','#2B7148','#8A5530'
    if fade: L,M,D=('#A9D3B0','#8FBF9C','#7FAE90')
    tiers=4; th=(h-5)/tiers
    for t in range(tiers):
        top=t*th*0.82; bot=top+th*1.55
        half=(w/2-1)*(0.45+0.55*(t+1)/tiers)
        cx=w/2
        c.poly([(cx,top),(cx+half,bot),(cx-half,bot)],M)
        c.poly([(cx,top),(cx+half,bot),(cx+half*0.15,bot)],D)
        c.poly([(cx,top+1),(cx-half*0.55,bot-1),(cx-half*0.2,bot-1)],L)
    c.rect(w/2-1,h-6,w/2+1,h-1,T if not fade else '#B79A7E')
    return outline(c.a,'#1E4A30' if not fade else '#8FAE98')
def stone(kind):
    W,Hh,TH=22,11,4
    pal={'done':('#9BDB8F','#C3EDB0','#5FA862','#47864C','#25502E'),
         'lock':('#E7E6DE','#F5F4EF','#C6C4B9','#ACAA9F','#85837A')}[kind]
    top,hi,sl,sd,ol=pal
    c=C(W,Hh+TH+1); cx=W/2-0.5; cy=Hh/2
    c.poly([(0,cy),(cx,cy+Hh/2),(cx,cy+Hh/2+TH),(0,cy+TH)],sl)
    c.poly([(W-1,cy),(cx,cy+Hh/2),(cx,cy+Hh/2+TH),(W-1,cy+TH)],sd)
    c.poly([(0,cy),(cx,cy-Hh/2),(W-1,cy),(cx,cy+Hh/2)],top)
    c.poly([(1,cy),(cx,cy-Hh/2+0.6),(cx+3,cy-Hh/2+1.6),(4,cy+0.4)],hi)
    if kind=='done':
        for x,y in [(8,5),(9,6),(10,7),(11,6),(12,5),(13,4),(14,3)]: c.p(x,y,'#FFFFFF')
    else:
        c.rect(5,4,7,6,'#F6C445'); c.p(5,4,'#D99A2B'); c.p(7,6,'#D99A2B')
        text(c,'10',9,3,'#8C8A80')
    return outline(c.a,ol)
def pedestal(kind):
    W,Hh,TH=34,17,7
    pal={'done':('#9BDB8F','#C3EDB0','#5FA862','#47864C','#25502E'),
         'cur':('#F3F66C','#FBFCB8','#D9C93E','#B8A62A','#5E5212'),
         'lock':('#E7E6DE','#F5F4EF','#C6C4B9','#ACAA9F','#85837A'),
         'gift':('#BFE3F5','#E2F4FC','#86C2DE','#6AA6C4','#2E5E78'),
         'myst':('#E7E6DE','#F5F4EF','#C6C4B9','#ACAA9F','#85837A')}[kind]
    top,hi,sl,sd,ol=pal
    c=C(W,Hh+TH+1); cx=W/2-0.5; cy=Hh/2
    c.poly([(0,cy),(cx,cy+Hh/2),(cx,cy+Hh/2+TH),(0,cy+TH)],sl)
    c.poly([(W-1,cy),(cx,cy+Hh/2),(cx,cy+Hh/2+TH),(W-1,cy+TH)],sd)
    c.poly([(0,cy),(cx,cy-Hh/2),(W-1,cy),(cx,cy+Hh/2)],top)
    c.poly([(2,cy),(cx,cy-Hh/2+0.8),(cx+4,cy-Hh/2+2),(6,cy+0.5)],hi)
    for x in range(int(cx)-6,int(cx)+7,4): c.p(x,int(cy+Hh/2+TH/2),sd if x<cx else sl)
    return outline(c.a,ol)
def sapling():
    c=C(16,20)
    c.poly([(2,12),(13,12),(11,19),(4,19)],'#C9733E'); c.rect(2,12,13,13,'#E08A4E'); c.rect(4,18,11,19,'#9E5428')
    c.rect(4,11,11,11,'#5A3A22')
    c.rect(7,4,8,11,'#5A8A2E')
    c.poly([(7.5,1),(12,6),(3,6)],'#4FA35C'); c.poly([(7.5,3),(13,9),(2,9)],'#3F9A5C'); c.poly([(7.5,1),(5,5),(7,5)],'#8FD18A')
    return outline(c.a,'#2A140A')
def gift():
    c=C(18,17)
    c.rect(1,6,16,16,'#7FC6EF'); c.rect(1,6,16,8,'#A6DAF6'); c.rect(12,9,16,16,'#5FAAD6')
    c.rect(7,6,10,16,'#F6D24A'); c.rect(1,10,16,11,'#F6D24A')
    c.poly([(8.5,6),(3,1),(2,4),(6,6)],'#F6D24A'); c.poly([(8.5,6),(14,1),(15,4),(11,6)],'#F6D24A')
    c.p(8,5,'#E0A82E'); c.p(9,5,'#E0A82E')
    return outline(c.a,'#2A140A')
def qblock():
    c=C(17,17)
    c.rect(0,0,16,16,'#F6C445'); c.rect(0,0,16,1,'#FFE08A'); c.rect(0,0,1,16,'#FFE08A'); c.rect(15,0,16,16,'#D99A2B'); c.rect(0,15,16,16,'#D99A2B')
    for x,y in [(2,2),(14,2),(2,14),(14,14)]: c.p(x,y,'#B07A1E')
    for x,y in [(6,4),(7,4),(8,4),(9,4),(10,5),(10,6),(9,7),(8,8),(8,9),(8,12),(8,13),(5,5)]: c.rect(x,y,x,y,'#FFFFFF')
    for x,y in [(7,5),(6,5),(9,5),(10,7),(9,8),(9,9),(9,13)]: c.p(x+1 if x>=9 else x,y+1,'#B07A1E')
    return outline(c.a,'#2A140A')
def cloud(w):
    c=C(w,9)
    c.rect(3,4,w-4,7,'#FFFFFF'); c.rect(6,2,w//2,4,'#FFFFFF'); c.rect(w//2-2,1,w//2+5,4,'#FFFFFF'); c.rect(3,7,w-4,7,'#E3ECEC')
    return outline(c.a,'#C7D6D6')
def butterfly(open_):
    c=C(7,5)
    if open_:
        c.rect(0,0,2,2,'#F29779'); c.rect(4,0,6,2,'#F29779'); c.rect(1,3,2,4,'#F7B79F'); c.rect(4,3,5,4,'#F7B79F')
    else:
        c.rect(2,0,2,3,'#F29779'); c.rect(4,0,4,3,'#F29779')
    c.rect(3,0,3,4,'#3A2A1E')
    return c.a
def ring():
    c=C(44,22)
    for y in range(22):
        for x in range(44):
            d=((x-21.5)/21.5)**2+((y-10.5)/10.5)**2
            if 0.72<=d<=1.0: c.p(x,y,'#FFF6A0')
    return c.a
def arrow():
    c=C(9,8)
    c.poly([(0,2),(9,2),(4.5,8)],'#F3F66C'); c.rect(2,0,6,2,'#F3F66C')
    return outline(c.a,'#2A140A')
# ---------- map bear ----------
mb=np.array(Image.open('mapbear_22.png')).astype(int)
dark=(mb[...,:3].sum(-1)<120)&(mb[...,3]>0); mb[dark,:3]=hx('#2a140a')
MZ=hx('#fcd09f')
for y in (22,23):
    for x in range(11,22):
        if mb[y,x,3] and mb[y,x,:3].sum()<500: mb[y,x,:3]=MZ
for y,x in [(21,16),(22,13),(22,19),(23,14),(23,15),(23,17),(23,18),(22,16)]: mb[y,x,:3]=hx('#2a140a'); mb[y,x,3]=255
def add_scarf(a,dy=0):
    a=a.copy(); h,w,_=a.shape; L={}
    G,GD,GO='#2f7a4c','#1d5434','#e9b949'
    for x in range(6,28):
        cy=27+dy-int(round(((x-16.5)/11)**2*1.5))
        for y in range(cy-1,cy+2): L[(y,x)]=G if y<cy+1 else GD
    for y in range(28+dy,37+dy):
        for x in range(19,24): L[(y,x)]=G if x<23 else GD
    for x in range(19,24): L[(36+dy,x)]=GO
    for x in (9,14,19,24):
        cy=27+dy-int(round(((x-16.5)/11)**2*1.5)); L[(cy,x)]=GO
    L[(31+dy,21)]=GO; L[(33+dy,21)]=GO
    keys=set(L)
    for (y,x) in keys:
        for ddx,ddy in ((1,0),(-1,0),(0,1),(0,-1)):
            k=(y+ddy,x+ddx)
            if k not in keys and 0<=k[0]<h and 0<=k[1]<w: a[k[0],k[1],:3]=hx('#2a140a'); a[k[0],k[1],3]=255
    for (y,x),c in L.items():
        if 0<=y<h and 0<=x<w: a[y,x,:3]=hx(c); a[y,x,3]=255
    return a
bear=add_scarf(mb)
blink=bear.copy(); FUR=hx('#b8693f')
for x0,x1 in [(6,13),(19,27)]:
    for y in range(11,19):
        for x in range(x0,x1):
            p=blink[y,x]
            if p[3] and (p[:3].sum()<230 or p[:3].min()>195): blink[y,x,:3]=FUR
for x in range(8,13): blink[17,x,:3]=hx('#2a140a')
for x in range(20,25): blink[17,x,:3]=hx('#2a140a')
blink[16,7,:3]=hx('#2a140a'); blink[16,25,:3]=hx('#2a140a')
# ---------- map ----------
W,H=195,380
m=C(W,H)
bands=['#E6EFE3','#E3EDD6','#DCE9C9','#D3E5BC','#C9E0AE','#BFDAA1']
bay=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
for y in range(H):
    t=min(len(bands)-1.001,max(0,(y-20)/(H-20)*(len(bands)-1)))
    i=int(t); f=t-i
    for x in range(W):
        col=bands[i+1] if f*16>bay[y%4][x%4] else bands[i]
        m.p(x,y,col)
# mountains
for (cx,hw,top,col) in [(30,60,18,'#C9D9D6'),(120,70,10,'#C3D4D2'),(190,50,22,'#C9D9D6'),(80,40,26,'#D3E0DB')]:
    m.poly([(cx-hw,58),(cx,top),(cx+hw,58)],col)
    m.poly([(cx,top),(cx+5,top+4),(cx+2,top+5),(cx-1,top+7),(cx-4,top+4)],'#F4F8F6')
for y in range(50,64):
    for x in range(W):
        if random.random()<(y-50)/14: m.p(x,y,bands[0])
# far pine row
for x in range(-4,W,9):
    fp=pine(9,15,fade=True); m.blit(fp,x+random.randint(-2,2),46+random.randint(-2,3))
# path nodes
seq=[('done',1),('done',1),('done',1),('ped_sapling',-1),('done',-1),('done',-1),('ped_cur',1),('lock',1),('lock',1),('ped_gift',-1),('lock',-1),('lock',-1),('ped_myst',1),('lock',1),('lock',1),('ped_end',0)]
nodes=[]; x,y=70,342; d=1; prevped=False
for k,(kind,nd) in enumerate(seq):
    if k>0:
        ped=kind.startswith('ped')
        if ped or prevped: x+=d*26; y-=19
        else: x+=d*20; y-=14
    nodes.append({'kind':kind,'x':x,'y':y})
    prevped=kind.startswith('ped')
    d=nd if nd else d
xs=[n['x'] for n in nodes]; print('x range',min(xs),max(xs),'y range',nodes[-1]['y'],nodes[0]['y'])
# trees (avoid path)
def near_path(tx,ty):
    return any(abs(tx-n['x'])<34 and -40<ty-n['y']<24 for n in nodes)
trees=[]
for ty in range(70,380,26):
    for side in (0,1):
        tx=random.randint(-6,16) if side==0 else random.randint(168,190)
        trees.append((tx,ty+random.randint(-8,8),random.choice([(20,32),(24,38),(18,28)])))
for tx,ty,sz in [(150,120,(16,26)),(160,300,(18,30)),(30,250,(16,26)),(150,200,(14,22)),(28,160,(14,22))]:
    if not near_path(tx,ty): trees.append((tx,ty,sz))
# grass tufts & flowers
for _ in range(170):
    tx,ty=random.randint(0,W-1),random.randint(66,H-1)
    if near_path(tx,ty): continue
    if random.random()<0.75:
        g='#9EC57F' if ty>200 else '#AFCB95'
        m.p(tx,ty,g); m.p(tx-1,ty-1,g); m.p(tx+1,ty-1,g)
    else:
        col=random.choice(['#FFFFFF','#F2A7C0','#F6D24A','#B8A4FF'])
        m.p(tx,ty+1,'#6FA357'); m.p(tx,ty,col)
# draw stones & static pedestals (back to front = top to bottom)
SP={'done':stone('done'),'lock':stone('lock')}
PD={'ped_sapling':pedestal('done'),'ped_cur':pedestal('cur'),'ped_gift':pedestal('gift'),'ped_myst':pedestal('myst'),'ped_end':pedestal('lock')}
items=[]
for n in nodes: items.append((n['y'],'node',n))
for t in trees: items.append((t[1]+t[2][1],'tree',t))
items.sort(key=lambda z:z[0])
endpine=pine(26,40)
for _,typ,obj in items:
    if typ=='tree':
        tx,ty,(tw,th)=obj
        for xx in range(tx+2,tx+tw):
            m.p(xx,ty+th,'#9FC486',150)
        m.blit(pine(tw,th),tx,ty)
    else:
        n=obj
        if n['kind'] in SP:
            spr=SP[n['kind']]; m.blit(spr,n['x']-12,n['y']-7)
            n['top']=(n['x'],n['y'])
        else:
            spr=PD[n['kind']]; m.blit(spr,n['x']-18,n['y']-10)
            n['top']=(n['x'],n['y'])
            if n['kind']=='ped_end':
                m.blit(endpine,n['x']-14,n['y']-40)
                m.rect(n['x']+12,n['y']-30,n['x']+12,n['y']-4,'#5A5A66')
                m.poly([(n['x']+13,n['y']-30),(n['x']+24,n['y']-27),(n['x']+13,n['y']-23)],'#8B6CF6')
# shadows for current bear
Image.fromarray(np.clip(m.a,0,255).astype(np.uint8)).save('sprites/map_bg.png')
def save(a,name): Image.fromarray(np.clip(a,0,255).astype(np.uint8),'RGBA').save(f'sprites/{name}.png')
save(bear,'map_bear'); save(blink,'map_bear_blink'); save(sapling(),'map_sapling'); save(gift(),'map_gift'); save(qblock(),'map_qblock')
save(cloud(30),'map_cloud_a'); save(cloud(22),'map_cloud_b'); save(ring(),'map_ring'); save(arrow(),'map_arrow')
bf=np.concatenate([butterfly(True),butterfly(False)],axis=1); save(bf,'map_butterfly')
json.dump(nodes,open('map_nodes.json','w'))
# preview composite
pv=C(W,H); pv.a=m.a.copy()
cur=[n for n in nodes if n['kind']=='ped_cur'][0]
pv.blit(ring(),cur['x']-22,cur['y']-11)
pv.blit(bear,cur['x']-17,cur['y']-61+2)
for n in nodes:
    if n['kind']=='ped_sapling': pv.blit(sapling(),n['x']-8,n['y']-20)
    if n['kind']=='ped_gift': pv.blit(gift(),n['x']-9,n['y']-17)
    if n['kind']=='ped_myst': pv.blit(qblock(),n['x']-9,n['y']-19)
pv.blit(cloud(30),40,20); pv.blit(cloud(22),130,30)
pv.img().resize((W*2,H*2),Image.NEAREST).save('preview_map.png')
print(json.dumps(nodes))
# ---- extra exports for dynamic layouts ----
g=C(W,H); g.a=m.a.copy()
save(SP['done'],'tile_stone_done'); save(SP['lock'],'tile_stone_lock')
for k,v in PD.items(): save(v,'tile_'+k.replace('ped_','pedestal_'))
save(pine(20,32),'tree_pine_m'); save(pine(24,38),'tree_pine_l'); save(pine(9,15,fade=True),'tree_pine_far')
