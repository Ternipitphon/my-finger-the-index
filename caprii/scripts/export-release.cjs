'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),version=require('../package.json').version;
const target=path.join(repo,'release/source');
fs.mkdirSync(target,{recursive:true});
const files=execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8'}).split('\0').filter(Boolean);
files.push('caprii/BUILD-INFO.json');
const entries=[];
for(const name of [...new Set(files)].sort()){
 if(path.isAbsolute(name)||name.split(/[\\/]/).includes('..')||/(^|\/)(?:node_modules|vendor-runtime|\.git|release|\.env)(\/|$)/.test(name))throw Error('Invalid source path');
 const source=path.join(repo,name),info=fs.lstatSync(source);
 if(!info.isFile()||info.isSymbolicLink()||info.size>20*1024*1024)throw Error('Invalid source file');
 const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
 entries.push({path:name,bytes:info.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
}
fs.writeFileSync(path.join(target,'SOURCE_MANIFEST.json'),JSON.stringify({version,commit:process.env.GITHUB_SHA,baseCommit:'6899749c0c1e5ad33de58e05cb5420320443962d',license:require('../package.json').license,files:entries},null,2)+'\n');
console.log(JSON.stringify({directory:target,files:entries.length}));
