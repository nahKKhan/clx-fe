import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from rag.rotation_server import app

class RotationGuideTests(unittest.TestCase):
    def test_alert_searches_guide_and_calls_model(self):
        with TestClient(app) as client, patch('rag.rotation_server.answer',new_callable=AsyncMock,return_value=('모델 응답','ollama')) as model:
            r=client.post('/rotation-api/analyze',json={'sensor':'g1_sensor1','rms':1.6,'threshold':0.75,'alarm':True})
            self.assertEqual(r.status_code,200)
            self.assertEqual(r.json()['answer_mode'],'ollama')
            self.assertIn(11,[s['page'] for s in r.json()['sources']])
            self.assertEqual(model.await_args.kwargs['observation']['rms'],1.6)
    def test_no_alarm_does_not_generate(self):
        with TestClient(app) as client, patch('rag.rotation_server.answer',new_callable=AsyncMock) as model:
            r=client.post('/rotation-api/analyze',json={'sensor':'g1_sensor1','rms':0.69,'threshold':0.75,'alarm':False})
            self.assertEqual(r.json()['answer_mode'],'no-event')
            model.assert_not_awaited()
