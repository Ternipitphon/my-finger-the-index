import {Panel} from '../src/renderer/js/panel.js';
import {Chat} from '../src/renderer/js/chat.js';
const panel=new Panel({panel:document.getElementById('panel'),ticker:document.getElementById('ticker'),labels:{state:{idle:'พักอยู่',chat:'AI'}}});
const brain={t:{chat:{hello:['คุยได้เลย'],again:['กลับมาแล้ว'],moody:{},badge:'AI',placeholder:'พิมพ์ข้อความ',send:'ส่ง',close:'ปิด',noteCloud:'AI',failed:'เปิดคุยไม่สำเร็จ',offline:'AI ออฟไลน์',noModel:'ยังไม่มีโมเดล',ok:'ตกลง'}},custom:{}};
let finish,fail;window.statusCalls=0;window.holds=[];panel.onPointerHold=on=>window.holds.push(on);
const host={onChatDelta(){},focusOverlay:on=>window.focused=on,chatStatus:()=>{window.statusCalls++;return new Promise((resolve,reject)=>{finish=resolve;fail=reject;});},chatMemory:async()=>[],openApps:async()=>[]};
const chat=new Chat({panel,host,brain,voice:{},capri:{stowed:false,wake(){},towardCenter(){return 1;},perform(){},pulse(){}}});
window.fixturePanel=panel;window.fixtureChat=chat;
window.resolveStatus=()=>finish({ok:true,provider:'custom',model:'fixture'});window.rejectStatus=()=>fail(Error('fixture status offline'));
window.offer=()=>{panel.setAnchor({x:450,y:400,top:320},{w:1000,h:800});panel.say({kind:'idle',line:'ตอนนี้ยังไม่มีงาน ขอพักแถวนี้นะ',actions:[{id:'talk',label:'คุยกับฉัน'}],onAction:()=>chat.start(),hold:2000});};
window.offer();window.fixtureReady=true;

window.pointerEvents=[];for(const type of ['pointerdown','pointerup','mousedown','mouseup','click'])document.addEventListener(type,e=>pointerEvents.push({type,x:e.clientX,y:e.clientY,target:e.target.className,id:e.target.dataset.id}),true);
