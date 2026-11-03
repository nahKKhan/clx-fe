from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Literal
from .answerer import answer, GenerationError
from .config import DOC_NAME, VERSION, PDF_PATH
from .retriever import HybridRetriever
from fastapi import HTTPException

app = FastAPI(title='SKF CLP Touch Manual RAG')
retriever = HybridRetriever()
from .bearing import BearingRetriever, PDF as BEARING_PDF
bearing_retriever = BearingRetriever()

class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)
    document: Literal['clp', 'bearing'] = 'clp'

@app.get('/api/health')
def health():
    return {'status': 'ok', 'document': DOC_NAME, 'version': VERSION}

@app.get('/api/manual.pdf')
def manual():
    return FileResponse(PDF_PATH, media_type='application/pdf')

@app.get('/api/bearing-manual.pdf')
def bearing_manual():
    return FileResponse(BEARING_PDF, media_type='application/pdf')

@app.post('/api/ask')
async def ask(req: AskRequest):
    question = req.question.strip()
    selected = bearing_retriever if req.document == 'bearing' else retriever
    hits = selected.search(question, req.top_k)
    # Retrieval similarity is not evidence that this pump manual applies to a bearing.
    if req.document == 'clp' and any(term in question.lower() for term in ['진동', 'vibration', 'nasa', 'ims']):
        text = 'SKF CLP Touch 윤활 펌프 매뉴얼에서 해당 베어링·압축기의 진동 고장 원인, 경보 임계값 또는 조치를 직접 확인할 수 없습니다. 아래는 검색 후보이며 해당 진동 이상의 진단 근거가 아닙니다.'
        mode = 'scope-guard'
    else:
        try:
            text, mode = await answer(question, hits if hits and hits[0]['score'] >= .045 else [])
        except GenerationError as exc:
            raise HTTPException(503, str(exc)) from exc
    pdf_url = '/api/bearing-manual.pdf' if req.document == 'bearing' else '/api/manual.pdf'
    doc_name = 'SKF Bearing Damage and Failure Analysis' if req.document == 'bearing' else DOC_NAME
    return {'question': question, 'answer': text, 'answer_mode': mode,
            'document': doc_name, 'version': '' if req.document == 'bearing' else VERSION,
            'sources': [{**h, 'pdf_link': f"{pdf_url}#page={h['page']}"} for h in hits]}

# Resolve values from the analysis artifact, never from client-supplied measurements.
import json
from pathlib import Path

class SnapshotRequest(BaseModel):
    index: int = Field(ge=0)

@app.post('/api/ims/analyze')
async def analyze_snapshot(req: SnapshotRequest):
    path = Path(__file__).resolve().parents[1] / 'public/analysis/ims-result.json'
    if not path.exists():
        raise HTTPException(503, 'IMS analysis artifact missing')
    data = json.loads(path.read_text())
    rows = data['rows']
    if req.index >= len(rows):
        raise HTTPException(422, 'Snapshot index out of range')
    row = rows[req.index]
    previous = rows[max(0, req.index-6):req.index]
    mean = sum(r['rms'] for r in previous)/len(previous) if previous else None
    excess = (row['rms']/data['threshold']-1)*100
    change = (row['rms']/mean-1)*100 if mean else None
    baseline = req.index < data['baseline_count']
    status = '기준 구간 · 이상 판정 제외' if baseline else ('통계 임계값 초과' if excess>0 else '통계 임계값 이하')
    observation = {'timestamp':row['timestamp'], 'rms':row['rms'], 'threshold':data['threshold'],
        'status':status, 'excess_percent':excess, 'previous_count':len(previous),
        'previous_mean':mean, 'change_percent':change, 'channel':data['channel']+1}
    trend = f'직전 {len(previous)}개 평균 대비 {change:+.2f}%' if change is not None else '직전 데이터 없음'
    query = (f"NASA IMS 2nd_test 베어링 {data['channel']+1}, 측정 시각 {row['timestamp']}. "
        f"진동 acceleration RMS {row['rms']:.6f}, 통계 임계값 {data['threshold']:.6f}, "
        f"기준 대비 {excess:+.2f}%, {status}. {trend}. "
        '이 관측과 관련된 excessive vibration levels 증상표의 가능한 원인과 solution code별 점검 근거는 무엇인가? bearing vibration inspection fault remedy')
    is_event = not baseline and excess > 0
    if not is_event:
        return {'observation': observation, 'query': '', 'supported': False,
            'answer': '현재 통계 기준에서 이상 이벤트가 감지되지 않아 문서 검색을 실행하지 않았습니다.',
            'guidance': [], 'sources': [], 'document': '', 'search_performed': False,
            'limitation': '임계값 이하는 설비의 정상 상태를 보장하지 않습니다. 현재 적용한 RMS 기준으로는 점검 후보를 제시할 이상 이벤트가 없습니다.',
            'answer_mode': 'no-event'}
    hits = bearing_retriever.evidence(query)
    try:
        text, mode = await answer(query, hits, observation=observation)
    except GenerationError as exc:
        raise HTTPException(503, str(exc)) from exc
    return {'observation': observation, 'query': query, 'supported': bool(hits),
        'answer': text,
        'guidance': [],
        'limitation': '문서의 일반 점검 근거입니다. 통계 임계값은 제조사 기준이 아니며 RMS만으로 원인을 구분할 수 없습니다. 진동 주파수 특성·운전 조건·윤활 및 현장 점검 결과로 확인해야 합니다. 분해·정비 전에는 문서 p.13의 잠금/표찰 절차를 적용합니다.',
        'sources': hits, 'search_performed': True, 'document': 'SKF Bearing Damage and Failure Analysis',
        'answer_mode': mode}
