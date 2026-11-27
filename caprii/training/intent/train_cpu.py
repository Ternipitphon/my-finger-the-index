"""Train a small neural intent classifier FROM SCRATCH, not a fine-tune of Gemini.
Synthetic train/dev/test families; no API calls or user chat collection. Candidate is offline only.
"""
import argparse, collections, hashlib, json, pathlib, random, time, unicodedata
import torch
from torch import nn
from safetensors.torch import save_file

LABELS=['chat','look','media','website','agent','selected-tab','public-web','clarify']
def load(root,split):return [json.loads(x) for x in (root/(split+'.jsonl')).read_text().splitlines() if x.strip()]
def text(row):
 x=row['input'];history=' '.join(m['role']+': '+m['content'] for m in x.get('history',[]))
 return unicodedata.normalize('NFKC',history+' [connected='+str(x.get('connected',False))+'] '+x['text']).lower()
def validate(splits):
 ids=set();families={};texts={}
 for split,rows in splits.items():
  for r in rows:
   assert r['split']==split and r['id'] not in ids;ids.add(r['id'])
   assert r['expected']['route'] in LABELS
   key=json.dumps(r['input'],ensure_ascii=False,sort_keys=True)
   assert key not in texts or texts[key]==split,'Exact input leaked between splits'
   assert r['family'] not in families or families[r['family']]==split,'Family leaked between splits'
   texts[key]=split;families[r['family']]=split
class IntentNet(nn.Module):
 def __init__(self,vocab):
  super().__init__();self.embedding=nn.Embedding(vocab,48,padding_idx=0)
  self.convs=nn.ModuleList([nn.Conv1d(48,64,k,padding=k//2) for k in [3,5]])
  self.head=nn.Sequential(nn.Dropout(.15),nn.Linear(128,len(LABELS)))
 def forward(self,x):
  mask=x.ne(0).unsqueeze(1);z=self.embedding(x).transpose(1,2)
  z=torch.cat([torch.relu(c(z)).masked_fill(~mask,-1e4).amax(dim=2) for c in self.convs],dim=1)
  return self.head(z)
def metrics(y,p):
 per={}
 for k,label in enumerate(LABELS):
  tp=sum(a==k and b==k for a,b in zip(y,p));fp=sum(a!=k and b==k for a,b in zip(y,p));fn=sum(a==k and b!=k for a,b in zip(y,p))
  per[label]={'support':sum(a==k for a in y),'f1':2*tp/(2*tp+fp+fn) if 2*tp+fp+fn else 0}
 return {'accuracy':sum(a==b for a,b in zip(y,p))/len(y),'macro_f1':sum(v['f1'] for v in per.values())/len(LABELS),'per_class':per}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--out',default=str(pathlib.Path(__file__).parent/'results'));ap.add_argument('--epochs',type=int,default=80);args=ap.parse_args()
 torch.set_num_threads(2);torch.manual_seed(712);random.seed(712);root=pathlib.Path(__file__).parent;out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
 splits={s:load(root,s) for s in ['train','dev','test']};validate(splits)
 # Vocabulary comes from TRAIN only. Dev selects the checkpoint. Test is never used for checkpoint selection.
 chars=sorted(set(''.join(text(r) for r in splits['train'])));vocab={c:i+2 for i,c in enumerate(chars)}
 def encode(rows):
  seq=[[vocab.get(c,1) for c in text(r)[-256:]] for r in rows];x=torch.zeros(len(rows),256,dtype=torch.long)
  for i,t in enumerate(seq):x[i,:len(t)]=torch.tensor(t)
  return x,torch.tensor([LABELS.index(r['expected']['route']) for r in rows])
 x,y=encode(splits['train']);dx,dy=encode(splits['dev']);tx,ty=encode(splits['test'])
 model=IntentNet(len(vocab)+2);opt=torch.optim.AdamW(model.parameters(),lr=.003,weight_decay=.01)
 def predict(features):
  model.eval()
  with torch.no_grad():return model(features).argmax(1).tolist()
 majority=collections.Counter(y.tolist()).most_common(1)[0][0];baseline=metrics(ty.tolist(),[majority]*len(ty))
 before=metrics(ty.tolist(),predict(tx));best=None;best_score=-1;trace=[];started=time.monotonic()
 for epoch in range(1,args.epochs+1):
  model.train();order=torch.randperm(len(y));losses=[]
  for batch in order.split(16):
   opt.zero_grad();loss=nn.functional.cross_entropy(model(x[batch]),y[batch]);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),1);opt.step();losses.append(loss.item())
  if epoch%5==0 or epoch==1:
   score=metrics(dy.tolist(),predict(dx));trace.append({'epoch':epoch,'train_loss':sum(losses)/len(losses),'dev_macro_f1':score['macro_f1']})
   if score['macro_f1']>best_score:best_score=score['macro_f1'];best={k:v.detach().clone() for k,v in model.state_dict().items()}
   print(json.dumps(trace[-1]),flush=True)
 model.load_state_dict(best);pred=predict(tx);after=metrics(ty.tolist(),pred)
 stress=[{**r,'input':{**r['input'],'connected':True}} for r in splits['test']];sx,sy=encode(stress);stress_score=metrics(sy.tolist(),predict(sx))
 # Report all held-out mistakes; never use a failed candidate to dispatch user actions.
 report={'schema':1,'experiment':'synthetic-char-cnn-from-scratch','seed':712,'device':'cpu','base_model':None,'pretrained_model_fine_tuned':False,'gemini_weights_changed':False,'deployed_to_caprii':False,'parameters':sum(p.numel() for p in model.parameters()),'splits':{s:len(v) for s,v in splits.items()},'dataset_sha256':{s:hashlib.sha256((root/(s+'.jsonl')).read_bytes()).hexdigest() for s in splits},'test_majority_baseline':baseline,'test_before_training':before,'test_after_training':after,'test_all_connected_stress':stress_score,'data_revision':2,'runtime_versions':{'torch':torch.__version__},'training_seconds':round(time.monotonic()-started,2),'checkpoint_selection':'dev macro F1 only; earliest tie','trace':trace,'test_predictions':[{'id':r['id'],'expected':r['expected']['route'],'predicted':LABELS[p],'correct':p==LABELS.index(r['expected']['route'])} for r,p in zip(splits['test'],pred)],'limitations':['Small synthetic dataset, not user traffic','Predicts route only; cannot extract targets or reason about a screen','Not a Gemini or general LLM fine-tune','No production integration, regardless of score']}
 save_file(model.state_dict(),str(out/'intent-model.safetensors'));(out/'vocabulary.json').write_text(json.dumps({'vocab':vocab,'labels':LABELS,'max_length':256},ensure_ascii=False));(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({'report':str(out/'report.json'),'after_accuracy':after['accuracy'],'after_macro_f1':after['macro_f1'],'deployed':False}),flush=True)
if __name__=='__main__':main()
