"""Optional local Qwen service for the rotating-machine guide."""
from functools import lru_cache
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from .rotation_guide import GuideRetriever
from .rotation_answer import answer, GenerationError

app=FastAPI(title='Rotation guide RAG')

@lru_cache(maxsize=1)
def retriever(): return GuideRetriever()

class Request(BaseModel):
    sensor: str = Field(pattern=r'^g[12]_sensor[1-4]$')
    rms: float = Field(ge=0, le=100000, allow_inf_nan=False)
    threshold: float = Field(gt=0, le=100000, allow_inf_nan=False)
    alarm: bool

@app.post('/rotation-api/analyze')
async def analyze(req: Request):
    if not req.alarm:
        return {'observation':req.model_dump(),'answer':'','answer_mode':'no-event','sources':[]}
    query='회전기계 진동 발생 가능한 원인 질량 불균형 지지 불량 고장유형 원인 실험 점검'
    try: hits=retriever().search(query,5)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        raise HTTPException(503,'가이드북 검색 인덱스를 만들 수 없습니다.') from exc
    question=('이 가이드북에서 설명하는 진동 원인 후보와 관련 확인 사항을 설명하세요. '
              '문서의 실험 장치를 실제 설비와 구분하고 실험 고장을 만드는 방법을 작업 지시로 제시하지 마세요. '
              '해당 센서의 고장으로 단정하거나 순위를 매기지 마세요. '
              '관측 수치와 시험 기준은 PDF의 내용이 아니므로 PDF 출처를 붙이지 마세요.')
    obs={'sensor':req.sensor,'rms':req.rms,'threshold':req.threshold,'alarm':True,
         'unit':'가속도 단위 미확인','source':'실험 데이터 재생'}
    try: text,mode=await answer(question,hits,observation=obs)
    except GenerationError as exc: raise HTTPException(503,str(exc)) from exc
    return {'observation':obs,'answer':text,'answer_mode':mode,'sources':hits}
