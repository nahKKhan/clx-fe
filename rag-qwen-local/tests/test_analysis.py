import sys
import unittest
import tempfile
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.analyze_ims import analyze, retrieve_event
from rag.retriever import HybridRetriever

class AnalysisTests(unittest.TestCase):
    def test_rms_baseline_no_leakage(self):
        with tempfile.TemporaryDirectory() as folder:
            for i, value in enumerate([1, 1, 1, 5]):
                np.savetxt(Path(folder)/f'2004.02.12.10.{i:02d}.00', np.full((20480, 1), value))
            result=analyze(folder, baseline=3)
            self.assertEqual(result['threshold'], 1)
            self.assertEqual(result['anomaly_count'], 1)
            self.assertEqual(result['rows'][-1]['rms'], 5)
            with self.assertRaises(ValueError): analyze(folder, channel=1, baseline=3)
            with self.assertRaises(ValueError): analyze(folder, baseline=4)
    def test_real_retrieval_and_scope(self):
        r=HybridRetriever()
        vibration=retrieve_event(r, {'kind':'bearing_vibration'})
        self.assertFalse(vibration['supported'])
        self.assertEqual(vibration['citations'], [])
        hot=retrieve_event(r, {'kind':'pump_temperature','asset':'SKF CLP Touch','value':72})
        self.assertTrue(hot['supported'])
        self.assertIn('fault-7',hot['citations'])
        self.assertIn('70',hot['answer'])
        normal=retrieve_event(r, {'kind':'pump_temperature','asset':'SKF CLP Touch','value':70})
        self.assertEqual(normal['hits'], [])
        with self.assertRaises(ValueError): retrieve_event(r, {'kind':'pump_temperature','asset':'IMS bearing','value':72})

if __name__=='__main__': unittest.main()
