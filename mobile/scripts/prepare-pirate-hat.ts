/** Reproducible pixel-grid tricorn fitted to the reference bear. */
import { blank, writePng } from './png.ts';
const img = blank(82, 42);
const colors = [[35,25,32,255],[53,45,56,255],[217,162,72,255],[249,230,190,255]];
function rect(x:number,y:number,w:number,h:number,c:number) {
  for(let py=y;py<y+h;py++) for(let px=x;px<x+w;px++) img.d.set(colors[c],(py*82+px)*4);
}
for(const [x,y,w,h] of [[24,2,34,4],[20,6,42,4],[16,10,50,8],[2,12,12,6],[68,12,12,6],[0,18,82,8],[4,26,74,6],[10,32,62,6],[18,38,46,4]]) rect(x,y,w,h,0);
for(const [x,y,w,h] of [[26,6,30,4],[22,10,38,6],[18,16,46,8],[4,18,12,6],[66,18,12,6],[6,24,70,6],[12,30,58,6],[20,36,42,2]]) rect(x,y,w,h,1);
for(const [x,y,w] of [[6,24,10],[16,28,12],[28,32,26],[54,28,12],[66,24,10]]) rect(x,y,w,2,2);
rect(36,14,10,8,3); rect(38,22,6,4,3); rect(38,17,2,2,0); rect(42,17,2,2,0);
for(const [x,y] of [[32,22],[34,24],[44,26],[46,28],[48,22],[46,24],[34,26],[32,28]]) rect(x,y,2,2,3);
writePng(new URL('../../docs/design/pixel-bear/sprites/item_pirate_hat.png',import.meta.url),img);
