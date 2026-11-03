import unittest
from unittest.mock import patch
import httpx
from rag.answerer import answer, GenerationError

class AnswerGenerationTests(unittest.IsolatedAsyncioTestCase):
 async def test_each_question_uses_source_text_not_saved_translation(self):
  payloads=[]
  class FakeClient:
   def __init__(self, **kwargs): pass
   async def __aenter__(self): return self
   async def __aexit__(self, *args): pass
   async def post(self, url, json):
    payloads.append(json)
    return httpx.Response(200, json={'message':{'content':'새로 생성된 답변'},'done_reason':'stop'}, request=httpx.Request('POST',url))
  hit={'document':'SKF','page':52,'section':'Table 18','text':'Let the pump cool down.','ko_fact':'미리 작성한 한국어 답변'}
  with patch('rag.answerer.httpx.AsyncClient',FakeClient):
   self.assertEqual(await answer('첫 질문',[hit]),('새로 생성된 답변','ollama'))
   await answer('다른 질문',[hit])
  self.assertEqual(len(payloads),2)
  self.assertIn('Let the pump cool down.',payloads[0]['messages'][1]['content'])
  self.assertNotIn('미리 작성한 한국어 답변',payloads[0]['messages'][1]['content'])
  self.assertIn('다른 질문',payloads[1]['messages'][1]['content'])
  self.assertFalse(payloads[0]['think'])

 async def test_truncated_response_fails(self):
  class FakeClient:
   def __init__(self, **kwargs): pass
   async def __aenter__(self): return self
   async def __aexit__(self, *args): pass
   async def post(self, url, json):
    return httpx.Response(200, json={'message':{'content':'잘린 답변'},'done_reason':'length'}, request=httpx.Request('POST',url))
  with patch('rag.answerer.httpx.AsyncClient',FakeClient):
   with self.assertRaises(GenerationError):
    await answer('질문',[{'page':1,'text':'원문'}])
