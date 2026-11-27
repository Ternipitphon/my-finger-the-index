"""Export synthetic route-only SFT examples. Does not upload data or start paid training."""
import argparse,json,pathlib
root=pathlib.Path(__file__).parent
ap=argparse.ArgumentParser();ap.add_argument('--out',default=str(root/'results/sft'));args=ap.parse_args();out=pathlib.Path(args.out);out.mkdir(parents=True,exist_ok=True)
for split in ['train','dev','test']:
 rows=[json.loads(x) for x in (root/(split+'.jsonl')).read_text().splitlines() if x.strip()]
 examples=[{'messages':[{'role':'system','content':'Classify the current request using only provided context. Reply JSON with route: chat, look, media, website, agent, selected-tab, public-web, or clarify. This classifier never executes tools.'},{'role':'user','content':json.dumps(r['input'],ensure_ascii=False)},{'role':'assistant','content':json.dumps({'route':r['expected']['route']})}]} for r in rows]
 (out/(split+'.jsonl')).write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in examples))
print(json.dumps({'output':str(out),'task':'route-only classification, not full Caprii tool calling','uploaded':False,'training_started':False}))
