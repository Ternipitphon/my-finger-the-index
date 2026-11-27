"""Offline experimental route prediction. Never executes actions or replaces Caprii's AI."""
import argparse,json,pathlib,torch
from safetensors.torch import load_file
from train_cpu import IntentNet,text
ap=argparse.ArgumentParser();ap.add_argument('--text',required=True);ap.add_argument('--connected',action='store_true');args=ap.parse_args()
root=pathlib.Path(__file__).parent/'results';meta=json.loads((root/'vocabulary.json').read_text());vocab=meta['vocab'];seq=[vocab.get(c,1) for c in text({'input':{'text':args.text,'connected':args.connected}})[-meta['max_length']:]]
x=torch.zeros(1,meta['max_length'],dtype=torch.long);x[0,:len(seq)]=torch.tensor(seq)
model=IntentNet(len(vocab)+2);model.load_state_dict(load_file(str(root/'intent-model.safetensors')));model.eval()
with torch.no_grad():p=model(x).softmax(1)[0];idx=p.argmax().item()
print(json.dumps({'route':meta['labels'][idx],'score':float(p[idx]),'calibrated_confidence':False,'experimental':True,'action_executed':False},ensure_ascii=False))
