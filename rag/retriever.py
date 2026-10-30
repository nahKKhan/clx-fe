from __future__ import annotations
import json
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from .config import INDEX_PATH
from .ingest import save_index

KO_EN={
'스크린세이버':'screensaver user action 2 minutes','언제 켜':'activated after minutes','추가 윤활':'additional lubrication triggering','일시정지':'pause time','마스터 비밀번호':'master password cannot be changed','비밀번호 변경':'password change master pump','공장 설정':'factory settings resetting pump password','초기화':'reset factory settings password','정비 공간':'mounting dimensions clearance 100 mm every direction','설치 공간':'mounting clearance 100 mm','작동하지':'pump does not run power supply pause motor internal cable break','돌아가는데':'pump runs no lubricant not enough','윤활제가 부족':'no lubricant not enough jam valve air inclusion consistency metering device','윤활제 수준':'low-level signal top up lubricant refill interval','수준이 낮':'low-level signal top up lubricant','사이클 스위치':'cycle switch signals','신호가 부족':'too few cycle switch signals received','사이클 시간이 너무 짧':'cycle time too short extend cycle time','온도':'temperature pump maximum permissible','허용 최고':'above maximum permissible temperature cool down 70 °C','수리 전':'before repairs safety measures depressurize isolate lock tag voltage ground short circuit','안전 조치':'safety measures before repairs lock tag depressurize voltage','압축기':'compressor','진동':'vibration alarm threshold','경보 기준':'alarm threshold limit','NLGI':'NLGI','cycle switch':'cycle switch'}

def expand_query(q:str)->str:
    parts=[q]
    ql=q.lower()
    for ko,en in KO_EN.items():
        if ko.lower() in ql: parts.append(en)
    return ' '.join(parts)

class HybridRetriever:
    def __init__(self,index_path:Path=INDEX_PATH):
        if not index_path.exists(): save_index(index_path)
        self.chunks=json.loads(index_path.read_text(encoding='utf-8'))
        docs=[]
        for c in self.chunks:
            extra=c.get('ko_fact','')
            if c.get('kind')=='fault_row': extra+=' '+c.get('fault','')+' '+' '.join(c.get('causes',[]))+' '+' '.join(c.get('remedies',[]))
            docs.append(f"{c['section']} {c['text']} {extra}")
        self.word=TfidfVectorizer(lowercase=True,ngram_range=(1,2),token_pattern=r'(?u)\b\w[\w\-°/\.]*\b',sublinear_tf=True)
        self.char=TfidfVectorizer(lowercase=True,analyzer='char_wb',ngram_range=(3,5),min_df=1,sublinear_tf=True)
        self.word_m=normalize(self.word.fit_transform(docs)); self.char_m=normalize(self.char.fit_transform(docs))
    def search(self,query:str,top_k:int=5):
        expanded=expand_query(query)
        qw=normalize(self.word.transform([expanded])); qc=normalize(self.char.transform([expanded]))
        sw=(self.word_m@qw.T).toarray().ravel(); sc=(self.char_m@qc.T).toarray().ravel(); score=.72*sw+.28*sc
        ql=query.lower()
        for i,c in enumerate(self.chunks):
            hay=(c.get('section','')+' '+c.get('text','')+' '+c.get('ko_fact','')).lower()
            if 'cycle switch' in ql and 'cycle switch' in hay: score[i]+=.12
            if 'nlgi' in ql and 'nlgi' in hay: score[i]+=.15
            if '70' in ql and '70' in hay: score[i]+=.15
            if '압축기' in ql and 'compressor' in hay: score[i]+=.08
        order=np.argsort(-score)[:top_k]; out=[]
        for rank,i in enumerate(order,1):
            c=dict(self.chunks[int(i)]); c['score']=round(float(score[int(i)]),4); c['rank']=rank; out.append(c)
        return out
