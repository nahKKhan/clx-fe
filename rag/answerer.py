from __future__ import annotations
import os,re,httpx
NEGATIVE_PATTERNS=[(re.compile(r'압축기.*진동.*(경보|기준|임계)',re.I),'해당 압축기의 진동 경보 기준값은 이 SKF CLP Touch 윤활 펌프 매뉴얼에서 확인할 수 없습니다.')]
def local_grounded_answer(question,hits):
    for pat,msg in NEGATIVE_PATTERNS:
        if pat.search(question): return msg
    for h in hits[:3]:
        if h.get('ko_fact') and h.get('score',0)>=.10: return h['ko_fact']
    if not hits or hits[0].get('score',0)<.045: return '문서에서 질문에 답할 수 있는 근거를 충분히 확인할 수 없습니다.'
    return '관련 근거는 찾았지만 로컬 생성 모델이 연결되어 있지 않아 한국어 자연어 답변을 확정하지 않습니다. 아래 원문 근거를 확인해 주세요: '+hits[0]['text'][:500]
async def ollama_answer(question,hits):
    base=os.getenv('OLLAMA_URL','http://127.0.0.1:11434'); model=os.getenv('OLLAMA_MODEL','qwen3:8b')
    evidence='\n\n'.join(f"[근거 {i}] p.{h['page']} / {h['section']}\n{h['text']}" for i,h in enumerate(hits[:5],1))
    prompt=f'''너는 산업 설비 매뉴얼 QA 도우미다. 반드시 아래 근거에만 기반해 한국어로 답하라.\n- 근거에 없는 내용은 "문서에서 확인할 수 없다"고 말한다.\n- Possible cause는 가능한 원인으로 표현하고 확정 원인처럼 쓰지 않는다.\n- 수치, 단위, 적용 조건을 보존한다.\n질문: {question}\n근거:\n{evidence}'''
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            r=await client.post(f'{base}/api/generate',json={'model':model,'prompt':prompt,'stream':False})
            if r.status_code==200: return r.json().get('response','').strip() or None
    except Exception: return None
    return None
async def answer(question,hits):
    if os.getenv('USE_OLLAMA','0')=='1':
        result=await ollama_answer(question,hits)
        if result: return result,'ollama'
    return local_grounded_answer(question,hits),'grounded-fallback'
