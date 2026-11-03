"""Analyze real IMS snapshots, retrieve SKF evidence, export reproducible UI data."""
import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from rag.retriever import HybridRetriever
from rag.ingest import save_index


def analyze(folder, channel=0, baseline=100, sigma=3):
    files = sorted(p for p in Path(folder).iterdir() if re.fullmatch(r'\d{4}(?:\.\d{2}){5}', p.name))
    if baseline < 2 or len(files) <= baseline:
        raise ValueError('Need at least 2 baseline files and at least 1 subsequent snapshot')
    if channel < 0 or not math.isfinite(sigma) or sigma <= 0:
        raise ValueError('Channel must be nonnegative; sigma must be finite and positive')
    rows = []
    for p in files:
        matrix = np.loadtxt(p, ndmin=2)
        if matrix.shape[0] != 20480 or channel >= matrix.shape[1] or not np.isfinite(matrix).all():
            raise ValueError(f'Invalid IMS snapshot: {p.name}, shape={matrix.shape}')
        rms = float(np.sqrt(np.mean(np.square(matrix[:, channel]))))
        rows.append({'timestamp': p.name, 'rms': rms, 'samples': matrix.shape[0]})
    values = [r['rms'] for r in rows[:baseline]]
    mean, std = float(np.mean(values)), float(np.std(values, ddof=1))
    threshold = mean + sigma * std
    for i, row in enumerate(rows):
        row.update(baseline=i < baseline, anomaly=i >= baseline and row['rms'] > threshold)
    return {'channel': channel, 'baseline_count': baseline, 'sigma': sigma, 'mean': mean,
            'std': std, 'threshold': threshold, 'rows': rows,
            'anomaly_count': sum(r['anomaly'] for r in rows), 'unit': 'raw acceleration amplitude (source units)',
            'threshold_kind': 'demo statistical threshold; not NASA/SKF alarm specification',
            'baseline_assumption': 'First N chronological snapshots assumed healthy; not independently validated'}


def retrieve_event(retriever, event):
    if event['kind'] == 'bearing_vibration':
        query = 'NASA IMS 베어링 진동 이상: vibration bearing fault cause alarm threshold remedy'
        hits = retriever.search(query, top_k=5)
        return {'query': query, 'supported': False, 'mode': 'retrieval + guarded template (no LLM)',
                'answer': '진동 RMS의 통계 임계값 초과는 관찰됐지만, SKF CLP Touch 윤활 펌프 매뉴얼은 이 IMS 베어링의 진동 고장 원인·경보 기준·조치를 직접 뒷받침하지 않습니다. 윤활 부족이나 베어링 고장으로 확정하지 않습니다.',
                'hits': hits, 'citations': []}
    if event['kind'] != 'pump_temperature' or event.get('asset') != 'SKF CLP Touch':
        raise ValueError('Unsupported event scope')
    if event['value'] <= 70:
        return {'query': '', 'supported': False, 'mode': 'rule', 'answer': '데모 과온 기준 초과 없음. 과온 조치 검색을 실행하지 않았습니다.', 'hits': [], 'citations': []}
    query = '펌프 온도가 허용 최고 온도 70 초과 maximum permissible temperature cool down'
    hits = retriever.search(query, top_k=5)
    match = next((h for h in hits if h['id'] == 'fault-7' and h['page'] == 52), None)
    return {'query': query, 'supported': bool(match), 'mode': 'retrieval + grounded template (no LLM)',
            'answer': match['ko_fact'] if match else '검색 결과에서 해당 과온 조치 근거를 확인하지 못했습니다.',
            'hits': hits, 'citations': [match['id']] if match else []}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('folder', nargs='?', default=str(ROOT / 'data/ims/2nd_test'))
    parser.add_argument('--channel', type=int, default=0)
    parser.add_argument('--baseline-files', type=int, default=100)
    parser.add_argument('--sigma', type=float, default=3)
    args = parser.parse_args()
    result = analyze(args.folder, args.channel, args.baseline_files, args.sigma)
    save_index()
    retriever = HybridRetriever()
    anomalies = [r for r in result['rows'] if r['anomaly']]
    result['first_anomaly'] = anomalies[0] if anomalies else None
    result['peak'] = max(result['rows'], key=lambda r: r['rms'])
    result['rag'] = retrieve_event(retriever, {'kind': 'bearing_vibration'}) if anomalies else None
    result['temperature_demo'] = {'values': [65, 67, 68, 72], 'threshold': 70,
        'source': 'synthetic temperature; manual factory shutdown setting',
        'rag': retrieve_event(retriever, {'kind': 'pump_temperature', 'asset': 'SKF CLP Touch', 'value': 72})}
    result['provenance'] = {'dataset': 'NASA IMS / University of Cincinnati / 2nd_test',
        'url': 'https://data.nasa.gov/dataset/ims-bearings',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'manual_sha256': hashlib.sha256((ROOT / 'data/skf_clp_touch_v07.pdf').read_bytes()).hexdigest(),
        'snapshot_count': len(result['rows']), 'generation': 'No LLM used. Hybrid TF-IDF retrieval with explicit scope guards.'}
    out = ROOT / 'public/analysis/ims-result.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    print(json.dumps({k: result[k] for k in ['mean','std','threshold','anomaly_count','first_anomaly','peak']}, indent=2))
    print(f'Results: {out}')

if __name__ == '__main__':
    main()
