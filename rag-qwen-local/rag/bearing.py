"""Bearing manual retrieval with traceable symptom -> solution-code links."""
import json
from pathlib import Path
import fitz
from .retriever import HybridRetriever
ROOT=Path(__file__).resolve().parents[1]
PDF=ROOT/'data/skf_bearing_damage.pdf'
INDEX=ROOT/'data/bearing_chunks.json'
DOC='SKF Bearing Damage and Failure Analysis'
# Verified Table 1c p.12 links to Table 2; model answers use retrieved source text.
GUIDES=[
 ('lubrication',[1,2,3,4],[14,15],'윤활 불량에 따른 마모'),
 ('contamination',[27,28],[23],'고형 오염물에 의한 접촉면 손상'),
 ('loose_fits',[30,31],[24],'내륜·외륜의 끼워맞춤 불량과 크리프'),
 ('spalling',[37,38],[27],'피로 또는 표면 손상에 따른 박리')]

def build():
 doc=fitz.open(PDF); chunks=[]
 for i,page in enumerate(doc,1):
  body=' '.join(page.get_text().split())
  for j,start in enumerate(range(0,len(body),950)):
   chunks.append(dict(id=f'bearing-p{i}-{j}',page=i,section='Bearing damage and failure analysis',text=body[start:start+1100],kind='text',document=DOC,pdf_link=f'/api/bearing-manual.pdf#page={i}'))
 for key,codes,pages,title in GUIDES:
  # Preserve source pages, including exact original text; do not mix table columns.
  chunks.append(dict(id=f'bearing-guide-{key}',page=12,section='Table 1c: Excessive vibration levels → Table 2',
    text='[PDF p.12 Table 1c: excessive vibration levels, left column]\n'+doc[11].get_text(clip=fitz.Rect(0, 0, doc[11].rect.width/2, doc[11].rect.height))+'\nLinked solution codes: '+','.join(map(str,codes))+'.\n'+ '\n'.join(f'[PDF p.{p}] '+doc[p-1].get_text() for p in pages),
    kind='linked_guidance',document=DOC,pdf_link='/api/bearing-manual.pdf#page=12',
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
