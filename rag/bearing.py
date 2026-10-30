"""Bearing manual retrieval with traceable symptom -> solution-code links."""
import json
from pathlib import Path
import fitz
from .retriever import HybridRetriever
ROOT=Path(__file__).resolve().parents[1]
PDF=ROOT/'data/skf_bearing_damage.pdf'
INDEX=ROOT/'data/bearing_chunks.json'
DOC='SKF Bearing Damage and Failure Analysis'
# Verified Table 1c p.12 links to Table 2. Summaries are conditional, not diagnoses.
GUIDES=[
 ('lubrication',[1,2,3,4],[14,15],'윤활 불량에 따른 마모',
 '윤활 관련 마모가 확인되는 경우: 씰의 마모·손상·누유, 재윤활 주기와 실제 공급 여부를 점검합니다. 사용 윤활제의 점도·첨가제·호환성과 운전 조건에 맞는 윤활 방식을 검토합니다.'),
 ('contamination',[27,28],[23],'고형 오염물에 의한 접촉면 손상',
 '오염 가능성을 확인하려면 씰 선정·설치·마모·손상·누유를 점검하고 윤활제 청결도를 확인합니다. 교체 조립 시 하우징과 내부 부품을 철저히 청소하도록 안내합니다.'),
 ('loose_fits',[30,31],[24],'내륜·외륜의 끼워맞춤 불량과 크리프',
 '축 또는 하우징 시트의 마모·치수와 링의 상대 회전 여부를 확인합니다. 해당 문제가 확인된 경우 시트 복원 가공을 검토하며, 불평형 하중이 원인이면 불평형 원인을 제거하고 밸런싱하도록 안내합니다.'),
 ('spalling',[37,38],[27],'피로 또는 표면 손상에 따른 박리',
 '박리가 확인된 경우 정렬 불량과 타원형 체결을 점검합니다. 표면 기인 피로가 확인되면 베어링 교체와 적절한 윤활·밀봉, 실제 운전 온도에서의 점도 검토가 제시됩니다. RMS만으로 교체를 판단하지 않습니다.')]

def build():
 doc=fitz.open(PDF); chunks=[]
 for i,page in enumerate(doc,1):
  body=' '.join(page.get_text().split())
  for j,start in enumerate(range(0,len(body),950)):
   chunks.append(dict(id=f'bearing-p{i}-{j}',page=i,section='Bearing damage and failure analysis',text=body[start:start+1100],kind='text',document=DOC,pdf_link=f'/api/bearing-manual.pdf#page={i}'))
 for key,codes,pages,title,summary in GUIDES:
  # Preserve source pages, including exact original text; do not mix table columns.
  chunks.append(dict(id=f'bearing-guide-{key}',page=12,section='Table 1c: Excessive vibration levels → Table 2',
    text='Symptom: Excessive vibration levels. Possible cause: '+title+' '+key+' vibration bearing inspection. Solution codes: '+','.join(map(str,codes))+'.\n'+ '\n'.join(f'[p.{p}] '+doc[p-1].get_text() for p in pages),
    ko_fact=summary,kind='linked_guidance',document=DOC,pdf_link='/api/bearing-manual.pdf#page=12',
    title=title,codes=codes,action_pages=pages))
 INDEX.write_text(json.dumps(chunks,ensure_ascii=False))
 return chunks

class BearingRetriever(HybridRetriever):
 def __init__(self):
  build()
  super().__init__(INDEX)
 def evidence(self,query):
  # Retrieve within symptom-linked guidance so row relationships survive retrieval.
  hits=self.search(query,top_k=len(self.chunks))
  guides=[h for h in hits if h.get('kind')=='linked_guidance'][:4]
  context=next((h for h in hits if h['page']==9 and 'Monitoring' in h['text']),None)
  selected=guides+([context] if context else [])
  for rank,h in enumerate(selected,1):h['rank']=rank
  return selected
