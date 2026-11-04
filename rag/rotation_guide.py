"""Page-level search over the user's rotating machinery dataset guide."""
import re
from pathlib import Path
import fitz
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

PDF = Path(__file__).resolve().parents[1] / 'public/rotation/guide.pdf'
DOC = '회전기계 고장유형 AI 데이터셋 분석실습 가이드북'

class GuideRetriever:
    def __init__(self, pdf=PDF):
        self.chunks = []
        with fitz.open(pdf) as doc:
            for page_no, page in enumerate(doc, 1):
                text = re.sub(r'\s+', ' ', re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', page.get_text())).strip()
                for n, start in enumerate(range(0, len(text), 850)):
                    part = text[start:start+1100]
                    if len(part) >= 60:
                        self.chunks.append({'id':f'guide-{page_no}-{n}', 'document':DOC, 'page':page_no, 'section':'회전기계 가이드북', 'text':part})
        if not self.chunks: raise ValueError('가이드북의 텍스트를 읽을 수 없습니다.')
        self.vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(2,5), sublinear_tf=True)
        self.matrix = normalize(self.vectorizer.fit_transform([c['text'] for c in self.chunks]))

    def search(self, query, top_k=5):
        scores = (self.matrix @ normalize(self.vectorizer.transform([query])).T).toarray().ravel()
        hits=[]
        for i in np.argsort(-scores):
            if scores[i] < .035: continue
            hits.append({**self.chunks[int(i)], 'score':round(float(scores[i]),4), 'rank':len(hits)+1})
            if len(hits) >= top_k: break
        return hits
