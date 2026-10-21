import numpy as np
from PIL import Image
OUT=(42,20,10)
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
class G:
    def __init__(s,w,h): s.w,s.h=w,h; s.c=np.zeros((h,w,4),int)
    def p(s,x,y,col):
        if 0<=x<s.w and 0<=y<s.h: s.c[y,x,:3]=hx(col) if isinstance(col,str) else col; s.c[y,x,3]=255
    def rect(s,x0,y0,x1,y1,col):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): s.p(x,y,col)
    def poly(s,pts,col):
        n=len(pts)
        for y in range(s.h):
            for x in range(s.w):
                px,py=x+.5,y+.5; ins=False; j=n-1
                for i in range(n):
                    xi,yi=pts[i]; xj,yj=pts[j]
                    if (yi>py)!=(yj>py) and px<(xj-xi)*(py-yi)/(yj-yi)+xi: ins=not ins
                    j=i
                if ins: s.p(x,y,col)
    def outline(s,col=OUT):
        f=s.c[...,3]>0; add=[]
        for y in range(s.h):
            for x in range(s.w):
                if f[y,x]: continue
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    xx,yy=x+dx,y+dy
                    if 0<=xx<s.w and 0<=yy<s.h and f[yy,xx]: add.append((x,y)); break
        for x,y in add: s.p(x,y,col)
    def img(s): return Image.fromarray(np.clip(s.c,0,255).astype(np.uint8),'RGBA')

def ger():
    g=G(20,18)
    W,S,O,OD,B,Y='#F6F1E7','#D8CDBA','#F08A3E','#C9652A','#3D6FD8','#F2C14A'
    g.poly([(1.5,9),(6,4.2),(14,4.2),(18.5,9)],W)
    for x in range(10,18):
        for y in range(5,9):
            if g.c[y,x,3]: g.p(x,y,S) if x>13 and y>5 else None
    g.rect(8,2,11,4,O); g.rect(8,2,8,4,'#F7AE6E')
    g.rect(2,9,17,9,B)
    for x in range(3,17,3): g.p(x,9,Y)
    g.rect(3,10,16,15,W); g.rect(3,15,16,15,S); g.rect(14,10,16,15,S)
    g.rect(8,11,11,15,O); g.rect(8,11,8,15,'#F7AE6E'); g.rect(11,11,11,15,OD)
    g.p(10,13,Y)
    g.outline()
    for x in range(3,17): g.p(x,10,OUT) if x in (7,12) else None
    return g
def sign():
    g=G(20,20)
    L,D,H='#C98A4B','#8A5530','#E8B678'
    g.rect(9,2,10,18,D); g.rect(9,2,9,18,L)
    g.poly([(3,4.5),(14.5,4.5),(17.5,7),(14.5,9.5),(3,9.5)],L)
    g.rect(4,5,13,5,H)
    g.poly([(16,11.5),(5.5,11.5),(2.5,14),(5.5,16.5),(16,16.5)],L)
    g.rect(6,12,15,12,H)
    for x in (6,12): g.p(x,7,D); g.p(x+1,7,D)
    for x in (8,13): g.p(x,14,D); g.p(x+1,14,D)
    g.rect(8,18,11,19,'#7CC47F')
    g.outline()
    return g
def cart():
    g=G(22,19)
    B1,B2,B3,BD,R='#9AD3EC','#6FB3D2','#4A90B2','#2E6B88','#E5484D'
    g.poly([(5,4),(20,4),(18,11),(7,11)],B2)
    g.poly([(12,4),(20,4),(18,11),(12,11)],B1)
    for y in (6,8):
        for x in range(7,18,3): g.rect(x,y,x+1,y,'#FFFFFF')
    g.rect(1,2,3,3,R); g.rect(4,2,5,3,BD); g.rect(5,4,6,12,BD)
    g.rect(6,12,18,12,B3); g.rect(17,12,18,14,B3); g.rect(5,14,18,14,B3)
    g.rect(6,16,8,17,BD); g.rect(15,16,17,17,BD)
    g.outline()
    return g
def pack():
    g=G(20,20)
    BR,BL,BD,GR,GL,GD,ST='#A8713A','#CF9752','#7A4D24','#B7D84A','#D3EC74','#7E9E2A','#E7B56C'
    g.rect(0,9,1,15,'#3B2A1E')
    g.poly([(3.5,8),(5,6.5),(15,6.5),(16.5,8),(16.5,17),(15,18.5),(5,18.5),(3.5,17)],BR)
    g.rect(14,8,16,17,BD)
    g.poly([(1.5,3.5),(2.5,2),(17.5,2),(18.5,3.5),(18.5,6),(17.5,7.5),(2.5,7.5),(1.5,6)],GR)
    g.rect(3,3,16,3,GL); g.rect(2,6,18,7,GD)
    g.rect(2,3,2,6,GD)
    g.rect(6,1,7,10,ST); g.rect(13,1,14,10,ST)
    g.poly([(4.5,11),(15.5,11),(15.5,17),(14.5,18),(5.5,18),(4.5,17)],BL)
    g.rect(5,11,15,12,ST); g.rect(9,12,11,14,ST); g.p(10,13,'#FFFFFF')
    g.outline()
    return g
def flag():
    g=G(20,20)
    P,PD,Y='#8B6CF6','#6A4FD6','#F3F66C'
    g.rect(4,1,5,17,'#5A5A66'); g.rect(4,1,4,17,'#8A8A96')
    g.poly([(6,2.5),(18.5,2.5),(15,6.5),(18.5,10.5),(6,10.5)],P)
    g.rect(6,9,15,10,PD)
    g.rect(9,5,11,7,Y); g.p(8,4,Y); g.p(12,4,Y); g.p(10,8,Y)
    g.rect(2,17,8,18,'#7CC47F')
    g.p(4,0,Y); g.p(5,0,Y)
    g.outline()
    return g
icons={'nav_home':ger(),'nav_path':sign(),'nav_shop':cart(),'nav_bag':pack(),'nav_crew':flag()}
def grey(im):
    a=np.array(im).astype(float); m=a[...,3]>0
    lum=0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
    v=185+ (lum/255)*55
    out=a.copy()
    for k in range(3): out[...,k]=np.where(m,v,0)
    dark=m&(lum<60); out[dark,:3]=148
    return Image.fromarray(out.astype(np.uint8),'RGBA')
row=[]
for k,g in icons.items():
    im=g.img(); im.save(f'sprites/{k}.png'); gi=grey(im); gi.save(f'sprites/{k}_off.png'); row+= [im,gi]
W=sum(i.width for i in row)+6*len(row); H=max(i.height for i in row)
c=Image.new('RGBA',(W,H),(255,255,255,255)); x=0
for i in row: c.alpha_composite(i,(x,0)); x+=i.width+6
c.resize((W*5,H*5),Image.NEAREST).save('preview_nav.png')
