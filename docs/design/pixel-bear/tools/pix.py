import sys, numpy as np
from PIL import Image
src=sys.argv[1]; out=sys.argv[2]; block=float(sys.argv[3])
rgba=np.array(Image.open(src).convert('RGBA')).astype(int)
m=rgba[...,3]>128; a=rgba[...,:3]
ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
a=a[y0:y1,x0:x1]; m=m[y0:y1,x0:x1]
h,w=m.shape; gw=int(round(w/block)); gh=int(round(h/block))
res=np.zeros((gh,gw,4),np.uint8)
for j in range(gh):
    for i in range(gw):
        ya,yb=int(j*h/gh),int((j+1)*h/gh); xa,xb=int(i*w/gw),int((i+1)*w/gw)
        cy0=ya+(yb-ya)//4; cy1=max(cy0+1,yb-(yb-ya)//4); cx0=xa+(xb-xa)//4; cx1=max(cx0+1,xb-(xb-xa)//4)
        cm=m[cy0:cy1,cx0:cx1]
        if cm.mean()<0.5: continue
        px=a[cy0:cy1,cx0:cx1][cm]
        res[j,i,:3]=np.median(px,axis=0); res[j,i,3]=255
Image.fromarray(res,'RGBA').save(out)
print(out,(x0,y0,x1,y1),gw,gh)
