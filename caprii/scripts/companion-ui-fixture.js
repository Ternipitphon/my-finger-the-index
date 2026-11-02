// Developer-only regression fixture: actual Capri renderer and pointer handlers.
import {Capri} from '../src/renderer/js/capri.js';
import {reducedMotion} from '../src/renderer/js/util.js';
const image=new Image();image.src='capri://app/assets/capri/capri-full.png';await image.decode();
const fx=new Proxy({}, {get:()=>()=>{}});
const capri=new Capri({root:document.getElementById('capri'),canvas:document.getElementById('sprite'),image,fx,voice:{play(){}}});
capri.wander=false;capri.setView(innerWidth,innerHeight,innerHeight-10);capri.pos={x:350,y:500};capri.place();
reducedMotion.setting='reduced';
window.fixtureCapri=capri;
window.fixturePoint=()=>{for(let y=300;y<490;y+=3)for(let x=260;x<430;x+=3)if(capri.hit(x,y)&&document.elementFromPoint(x,y)===capri.canvas)return{x,y};throw Error('No visible draggable sprite point');};
window.fixtureReady=true;
