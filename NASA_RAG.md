# GitHub Pages용 NASA · RAG 분석

화면의 시점 분석과 자유 질문은 이제 브라우저에서 실행됩니다. Python 서버나 API 주소 설정이 필요 없습니다.

```sh
npm ci
npm run dev
# 배포 파일 생성
npm run build
```

브라우저는 public/rag/corpus.json의 문서를 한국어-영어 질의 확장 + 단어 TF-IDF 코사인 유사도로 검색합니다. Python의 단어/문자 혼합 검색과 순위·점수가 다를 수 있습니다. 답변은 검토한 문서 요약이며 LLM은 사용하지 않습니다. 기준 구간/임계값 이하에서는 검색을 생략합니다. RMS만으로 원인 순위를 결정하지 않습니다.

PDF 원문은 public/rag/clp.pdf 및 bearing.pdf로 제공되며 기존 /clx-fe/ 배포 경로를 지원합니다. public/rag/corpus.json은 현재 문서와 IMS 분석 결과의 정적 사본입니다. 문서 또는 측정 결과를 변경하면 이 사본도 갱신해야 합니다. rag/ Python 코드는 이전 로컬 실행 참고용으로 보존됩니다.
