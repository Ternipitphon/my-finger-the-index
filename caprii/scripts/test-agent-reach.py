"""Actual pinned upstream parsers/adapter with deterministic transport fixtures; no network."""
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
BASE = Path(__file__).resolve().parent.parent / 'integrations/agent-reach'
sys.path.insert(0, str(BASE))
import caprii_bridge as bridge
from agent_reach.channels.web import WebChannel
from agent_reach.channels import youtube

class ReachTests(unittest.TestCase):
    def test_actual_runtime_status(self):
        r = subprocess.run([sys.executable, '-I', '-B', str(BASE / 'caprii_bridge.py')], input=json.dumps({'operation':'status'}), capture_output=True, text=True, timeout=10)
        data=json.loads(r.stdout);self.assertTrue(data['ok']);self.assertEqual(data['result']['version'],'1.6.0');self.assertFalse(data['result']['account_import'])
    def test_actual_public_parser(self):
        with patch.object(WebChannel, 'read', return_value='Title: Fixture\nMarkdown Content:\nHello evidence'):
            r=bridge.execute({'operation':'read','channel':'web','url':'https://example.com/'})
        self.assertEqual(r['items'][0]['title'],'Fixture');self.assertIn('Hello evidence',r['items'][0]['text'])
    def test_youtube_config_is_ignored_and_metadata_is_not_video(self):
        calls=[]
        def run(args,**kwargs):
            calls.append(args);return json.dumps({'title':'Fixture','description':'Description only','webpage_url':'https://www.youtube.com/watch?v=0MeXKrFAoME'})
        with patch.object(youtube,'run_cmd',side_effect=run):
            r=bridge.execute({'operation':'read','channel':'youtube','url':'https://www.youtube.com/watch?v=0MeXKrFAoME'})
        self.assertEqual(r['evidence'],'metadata');self.assertIn('--ignore-config',calls[0]);self.assertIn('--no-plugin-dirs',calls[0]);self.assertNotIn('--cookies-from-browser',calls[0]);self.assertNotIn('--no-check-certificates',calls[0])
    def test_partial_evidence_and_no_management_actions(self):
        with patch.object(WebChannel,'read',return_value='Title: Long\nMarkdown Content:\n'+'ก'*30000):
            r=bridge.execute({'operation':'read','url':'https://example.com/'})
        self.assertTrue(r['truncated']);self.assertLessEqual(len(r['items'][0]['text']),12000)
        for operation in ('login','install','configure','transcribe'):
            with self.assertRaises(ValueError):bridge.execute({'operation':operation,'url':'https://example.com/'})

if __name__=='__main__':unittest.main()
