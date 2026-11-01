// Developer-only UI fixture. Loaded by attachments-smoke.cjs, never by the app.
import {Panel} from '../src/renderer/js/panel.js';
import {Chat} from '../src/renderer/js/chat.js';
const panel=new Panel({panel:document.getElementById('panel'),ticker:document.getElementById('ticker'),labels:{state:{chat:'CHAT'}}});
const host={...window.host,chatStatus:async()=>({ok:true,model:'fixture-vision',provider:'custom'}),chatMemory:async()=>[],openApps:async()=>[],focusOverlay(){}};
const brain={t:{chat:{hello:['เอาล่ะ มีอะไรให้ช่วย'],again:['กลับมาแล้วสินะ'],moody:{},placeholder:'พิมพ์คำถามหรือแนบรูป',send:'ส่ง',close:'ปิด',badge:'Caprii',noteCloud:'ส่งรูปให้โมเดลที่เลือกเมื่อกดส่ง',failed:'วิเคราะห์ไม่สำเร็จ'}},custom:{}};
const chat=new Chat({panel,host,brain,voice:{},capri:{stowed:false,wake(){},perform(){},pulse(){}}});
window.fixtureChat=chat;window.fixturePanel=panel;await chat.start();window.fixtureReady=true;
