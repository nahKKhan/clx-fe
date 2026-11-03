import unittest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from rag.answerer import GenerationError
from rag.server import app

class SnapshotTests(unittest.TestCase):
 def test_selection_and_scope(self):
  with TestClient(app) as c:
   first=c.post('/api/ims/analyze',json={'index':0}).json()
   with patch('rag.server.answer', new_callable=AsyncMock, return_value=('문서 기반으로 생성한 답변 [근거 1]', 'ollama')) as generate:
    later=c.post('/api/ims/analyze',json={'index':512}).json()
    self.assertEqual(generate.await_count, 1)
    self.assertEqual(later['answer_mode'], 'ollama')
    self.assertEqual(later['answer'], '문서 기반으로 생성한 답변 [근거 1]')
   self.assertIsNone(first['observation']['change_percent'])
   self.assertFalse(first['search_performed'])
   self.assertEqual(first['guidance'],[])
   normal=c.post('/api/ims/analyze',json={'index':161}).json()
   self.assertFalse(normal['search_performed'])
   self.assertEqual(normal['sources'],[])
   self.assertTrue(later['search_performed'])
   self.assertIn('기준 구간',first['observation']['status'])
   self.assertIn('초과',later['observation']['status'])
   self.assertNotEqual(first['query'],later['query'])
   self.assertIn(later['observation']['timestamp'],later['query'])
   self.assertEqual(len(later['sources']),5)
   self.assertTrue(later['supported'])
   self.assertEqual(later['guidance'], [])
   self.assertTrue(all(s['pdf_link'].startswith('/api/bearing-manual.pdf') for s in later['sources']))
   self.assertEqual(c.get('/api/bearing-manual.pdf').status_code,200)
   for index in [-1,984]:
    self.assertEqual(c.post('/api/ims/analyze',json={'index':index}).status_code,422)

 def test_generation_failure_is_not_a_prepared_answer(self):
  with TestClient(app) as c, patch('rag.server.answer', new_callable=AsyncMock, side_effect=GenerationError('모델 연결 실패')):
   self.assertEqual(c.post('/api/ims/analyze', json={'index':512}).status_code, 503)
   self.assertEqual(c.post('/api/ask', json={'question':'펌프가 작동하지 않습니다'}).status_code, 503)

 def test_pump_question_uses_retrieved_evidence(self):
  with TestClient(app) as c, patch('rag.server.answer', new_callable=AsyncMock, return_value=('질문에 따른 새 답변', 'ollama')) as generate:
   response = c.post('/api/ask', json={'question':'펌프가 작동하지 않습니다'})
   self.assertEqual(response.status_code, 200)
   self.assertEqual(response.json()['answer'], '질문에 따른 새 답변')
   self.assertTrue(generate.await_args.args[1])

 def test_bearing_manual_selection_searches_bearing_document(self):
  with TestClient(app) as c, patch('rag.server.answer', new_callable=AsyncMock, return_value=('베어링 검색 답변', 'ollama')) as generate:
   response = c.post('/api/ask', json={'document':'bearing','question':'윤활 불량으로 인한 베어링 손상은 어떻게 점검하나요?'})
   self.assertEqual(response.status_code, 200)
   self.assertEqual(response.json()['answer_mode'], 'ollama')
   self.assertTrue(generate.await_args.args[1])
   self.assertTrue(all(h['pdf_link'].startswith('/api/bearing-manual.pdf') for h in response.json()['sources']))
