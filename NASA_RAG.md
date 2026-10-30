# NASA · RAG 분석 추가

기존 역할별 업무 화면과 업무 로직은 유지합니다. 사이드바 NASA · RAG 분석에서 측정 시점 선택 후 분석 버튼을 누르세요. 기준 구간/임계값 이하에서는 문서 검색을 생략합니다. 초과 시에는 베어링 매뉴얼의 점검 근거를 표시합니다. 하단 자유 질문은 CLP 펌프 매뉴얼 검색입니다. LLM 없이 실행됩니다.

## 실행
프로젝트 폴더에서:
```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-analysis.txt
.venv/bin/python -m uvicorn rag.server:app --host 127.0.0.1 --port 8012
```
다른 터미널:
```sh
npm install
npm run dev
```
현재 Mac에서는 기존 `/Users/changwoo/Downloads/skf_rag_mvp/.venv/bin/python`을 Python 실행 경로로 사용할 수도 있습니다.

기존 `/clx-fe/` 배포 경로를 보존했습니다. GitHub Pages 같은 정적 호스팅에서는 그래프는 표시되지만 Python 검색 API는 실행되지 않습니다. 배포 시 별도 API 서버와 `/api` 프록시가 필요합니다.

포함 자료: IMS 2nd_test 채널 1의 984개 파일에서 미리 계산한 RMS 결과 JSON, SKF CLP Touch 매뉴얼, SKF Bearing Damage and Failure Analysis 매뉴얼과 검색 코드. 대용량 원본 진동 파일은 중복 복사하지 않았습니다. 점검 후보는 검토된 4개 원인군이며 RMS만으로 원인 우선순위를 구분하지 않습니다.
