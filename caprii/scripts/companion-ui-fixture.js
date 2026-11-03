import {trackDragCursor} from '../src/renderer/js/drag-cursor.js';
// Developer-only regression fixture: actual Capri renderer and pointer handlers.
import {Capri} from '../src/renderer/js/capri.js';
import {reducedMotion} from '../src/renderer/js/util.js';
const image=new Image();image.src='capri://app/assets/capri/capri-full.png';await image.decode();
const fx=new Proxy({}, {get:()=>()=>{}});
const capri=new Capri({root:document.getElementById('capri'),canvas:document.getElementById('sprite'),image,fx,voice:{play(){}}});
capri.wander=false;capri.setView(innerWidth,innerHeight,innerHeight-10);capri.pos={x:350,y:500};capri.place();
reducedMotion.setting='reduced';
window.fixtureCursor=null;
window.fixtureTracker=trackDragCursor({capri,cursor:async()=>window.fixtureCursor});
window.fixtureCapri=capri;window.fixtureMotion=setting=>{reducedMotion.setting=setting;};
window.fixturePoint=()=>{const r=capri.canvas.getBoundingClientRect();for(let y=Math.max(1,r.top);y<Math.min(innerHeight-1,r.bottom);y+=3)for(let x=Math.max(1,r.left);x<Math.min(innerWidth-1,r.right);x+=3)if(capri.hit(x,y)&&document.elementFromPoint(x,y)===capri.canvas)return{x:Math.round(x),y:Math.round(y)};throw Error('No visible draggable sprite point');};
window.fixtureReady=true;
