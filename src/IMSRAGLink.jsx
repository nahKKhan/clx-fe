import {useEffect,useRef,useState} from 'react';
export default function IMSRAGLink({index,row}){
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function analyze(){
  const c=new AbortController();request.current=c;setBusy(true);setError('');setResult(null);
  const timer=setTimeout(()=>c.abort(),30000);
  try{const r=await fetch('/api/ims/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index}),signal:c.signal});if(!r.ok)throw Error('분석 서버 연결 또는 데이터 확인에 실패했습니다. 다시 시도하세요.');setResult(await r.json())}catch(e){if(!c.signal.aborted)setError(e.message);else setError('검색이 취소되었거나 시간이 초과되었습니다.')}finally{clearTimeout(timer);setBusy(false)}
 }
 const percent=v=>v===null?'비교 데이터 없음':`${v>0?'+':''}${v.toFixed(2)}%`;
 const o=result?.observation;
 const event=o?.status==='통계 임계값 초과';
 return <section className="box manual-rag ims-review">
  <div className="section-head"><h2>선택 시점 → RAG 근거 검색</h2><span className="pill">실제 데이터 연동</span></div>
  <p>선택: {row.timestamp} · RMS {row.rms.toFixed(6)}</p>
  <p className="hint">시점을 선택한 뒤 분석하면 측정값과 최근 변화에 관련된 매뉴얼 근거를 확인할 수 있습니다.</p>
  <button className="primary" onClick={analyze} disabled={busy}>{busy?'선택 데이터로 검색 중…':'이 시점 분석 · RAG 검색'}</button>
  {error&&<p role="alert">{error}</p>}
  <div aria-live="polite">{result&&<div className="review-results">
   <div className="review-title"><div><span className="review-eyebrow">분석 결과</span><h3>데이터 + 문서 검토 결과</h3></div><span className={'review-status '+(event?'is-alert':'')}>{o.status}</span></div>
   <div className="review-metrics">
    <div><span>선택 시점 RMS</span><strong>{o.rms.toFixed(6)}</strong><small>{o.timestamp}</small></div>
    <div><span>통계 임계값 대비</span><strong>{percent(o.excess_percent)}</strong><small>임계값 {o.threshold.toFixed(6)}</small></div>
    <div><span>직전 {o.previous_count}개 평균 대비</span><strong>{percent(o.change_percent)}</strong><small>선택 시점 이전 측정값과 비교</small></div>
   </div>
   <div className="review-takeaway"><strong>{event?'진동 상승 관찰 · 원인 확인 필요':'이 시점은 이상 이벤트로 판정하지 않음'}</strong><p>{event?'아래는 매뉴얼에 제시된 가능한 원인과 점검 항목입니다. 현재 데이터만으로 특정 원인을 확정하거나 후보의 우선순위를 정할 수 없습니다.':'현재 통계 기준에서 이상이 감지되지 않아 문서 검색을 실행하지 않았습니다. 점검 후보는 임계값 초과 이벤트가 있을 때 표시합니다.'}</p></div>
   {event&&<><div className="review-subhead"><h3>문서 기반 점검 후보</h3><span>미확정 · 고장 가능성 순위 아님</span></div>
   <div className="review-cards">{result.guidance?.map(g=><article className="review-card" key={g.source_id}>
    <h4>{g.title}</h4><span className="review-card-label">확인할 항목 · 조건부 조치</span>
    <ul>{g.text.split(/(?<=\.)\s+/).filter(Boolean).map((sentence,i)=><li key={i}>{sentence}</li>)}</ul>
    <div className="review-citations"><a href="/api/bearing-manual.pdf#page=12" target="_blank" rel="noreferrer">증상표 p.12 ↗</a>{g.action_pages.map(p=><a key={p} href={'/api/bearing-manual.pdf#page='+p} target="_blank" rel="noreferrer">조치 p.{p} ↗</a>)}</div>
    <small className="review-code">매뉴얼 해결 코드 {g.codes.join(', ')}</small>
   </article>)}</div></>}
   <div className="review-limits"><strong>판단 범위와 다음 확인</strong><p>{result.limitation}</p></div>
   {event&&<><p className="review-document">근거 문서 · {result.document}<br/>검토된 4개 원인군과 해결 코드 연결 · LLM 미사용</p>
   <details className="review-details"><summary>검색 질문과 원문 근거 {result.sources.length}개 보기</summary><p>{result.query}</p>{result.sources.map(s=><details className="review-source" key={s.id}><summary>p.{s.page} · {s.section}</summary><small>검색 유사도 {s.score} · 고장 확률이 아닙니다.</small><p>{s.text}</p><a href={s.pdf_link} target="_blank" rel="noreferrer">PDF p.{s.page} 원문 열기 ↗</a></details>)}</details></>}
  </div>}</div>
 </section>
}
