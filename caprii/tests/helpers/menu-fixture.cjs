'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mainRoot=path.join(__dirname,'../../src/main');
function createMenuFixture({Menu=null,lang='th',overrides={},hookInstalled=true}={}){
 const configBox={module:{exports:{}},require:n=>n==='electron'?{app:{}}:require(n),console};
 vm.runInNewContext(fs.readFileSync(path.join(mainRoot,'config.js'),'utf8'),configBox);
 const cfg={...configBox.module.exports.DEFAULTS,lang,claude:true,provider:'gemini',chatModel:'gemini-3.1-flash-lite',...overrides};
 const calls=[];let raw,organized,native;
 const source=fs.readFileSync(path.join(mainRoot,'main.js'),'utf8');const start=source.indexOf('function rebuildTray() {'),end=source.indexOf('// Run from a clone',start);
 const box={ui:(value,slots=[])=>require('../../src/renderer/js/ui-catalog').text(value,lang,slots),uiMessage:value=>require('../../src/renderer/js/ui-catalog').message(value,lang),config:{load:()=>cfg,save:patch=>Object.assign(cfg,patch)},activeHooks:()=>({status:()=>({installed:hookInstalled})}),activeAssistant:()=>({id:'claude',name:'Claude Code'}),TRAY:require(path.join(mainRoot,'labels')).TRAY,resolveLang:x=>x==='en'?'en':'th',displays:()=>[{id:1,size:{width:1920,height:1080}},{id:2,size:{width:1280,height:720}}],targetDisplay:()=>({id:1}),PORT:47823,
  Menu:{buildFromTemplate:template=>{native=Menu?Menu.buildFromTemplate(template):template;return native;}},tray:{setContextMenu(){}},app:{isPackaged:false,getVersion:()=>require('../../package.json').version,getPath:()=>'/fixture',getLoginItemSettings:()=>({openAtLogin:false}),setLoginItemSettings:()=>{},quit:()=>calls.push('quit')},process:{platform:'win32'},automaticActions:false,chats:new Map(),chatModels:['gemini-3.1-flash-lite','gemini-3.5-flash'],chatError:null,cloud:{free:[],account:null},ASSISTANTS:{claude:{name:'Claude Code'},codex:{name:'Codex'}},llm:{PROVIDERS:{gemini:{label:'Gemini'},ollama:{label:'Ollama'}},CLAUDE_MODES:['default','acceptEdits']},pickModel:()=>cfg.chatModel,
  sendCommand:(...args)=>calls.push(args),updateConfig:patch=>Object.assign(cfg,patch),playDemo:()=>calls.push('demo'),toggleVisible:()=>calls.push('visibility'),forgetChats:()=>calls.push('forget'),pickClaudeFolder:()=>{},signInToOllama:()=>{},loginItemOptions:()=>({}),runHooks:a=>calls.push(['hooks',a]),pickProvider:()=>{},chooseModelProfile:()=>{},userSoundsDir:()=>'/fixture',testLab:{open:async()=>calls.push('lab')},path,fs,console,require:n=>{
   if(n==='./context-menu')return{organizeMenu:(items,options)=>{raw=items;organized=require(path.join(mainRoot,'context-menu')).organizeMenu(items,options);return organized;}};
   return n.startsWith('./')?require(path.join(mainRoot,n)):require(n);
  }};
 vm.runInNewContext(source.slice(start,end)+'\nrebuildTray();',box);
 return{raw,organized,menu:native,calls,cfg,rebuild:()=>{box.rebuildTray();return native;}};
}
function walk(items){return items.flatMap(item=>[item,...walk(Array.isArray(item.submenu)?item.submenu:item.submenu?.items||[])]);}
module.exports={createMenuFixture,walk};
