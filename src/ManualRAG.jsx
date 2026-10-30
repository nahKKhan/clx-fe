import { askManual } from './browserRag';
import { useEffect, useRef, useState } from 'react';
import './ManualRAG.css';
const examples=['펌프가 작동하지 않는 원인은 무엇인가요?','펌프 온도가 허용 최고 온도를 넘으면 어떻게 하나요?','사이클 스위치 신호가 부족하면 어떻게 하나요?','압축기 진동 경보 기준은 무엇인가요?'];
export default function ManualRAG(){
 const [question,setQuestion]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function ask(e){
  e.preventDefault();if(question.trim().length<2||busy)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setError('');setResult(null);
  const timeout=setTimeout(()=>controller.abort(),35000);
  try{const data=await askManual(question.trim(),controller.signal);setResult(data)}catch(e){setError(e.name==='AbortError'?'검색 시간이 초과되었습니다. 다시 시도하세요.':e.message)}finally{clearTimeout(timeout);setBusy(false)}
 }
 return <section className="box manual-rag" id="manual-rag"><div className="section-head"><h2>SKF CLP Touch 매뉴얼 RAG MVP</h2><span className="pill">실제 문서 검색</span></div><p>한국어 질문 → 영문 매뉴얼 검색 → 근거 기반 답변 + 페이지 출처</p><p className="hint">951-171-072-EN · V07 · 윤활 펌프 매뉴얼입니다. 현재 선택된 가상 설비의 전용 매뉴얼은 아닙니다.</p><div className="manual-examples">{examples.map(q=><button key={q} disabled={busy} onClick={()=>setQuestion(q)}>{q}</button>)}</div><form onSubmit={ask}><label htmlFor="manual-question">매뉴얼에 질문하기</label><textarea id="manual-question" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="예: 펌프가 작동하지 않는 원인은 무엇인가요?" maxLength={2000} disabled={busy}/><button className="primary" disabled={busy||question.trim().length<2}>{busy?'매뉴얼 검색 중…':'질문하기'}</button></form>{error&&<p role="alert">{error}</p>}<div aria-live="polite">{result&&<><h3>답변</h3><p className="manual-answer">{result.answer}</p><p className="hint">질문: {result.question}<br/>{result.document} · {result.version} · {result.answer_mode==='ollama'?'Ollama 근거 기반 생성':result.answer_mode==='scope-guard'?'문서 적용 범위 밖 · 답변 제한':'근거 기반 로컬 답변 · LLM 미사용'}</p><h3>검색된 근거 Top-{result.sources.length}</h3><p className="hint">유사도는 검색 점수이며 진단 신뢰도가 아닙니다.</p>{result.sources.map(s=><article className="manual-source" key={s.rank}><strong>#{s.rank} · p.{s.page} · {s.section}</strong><small>유사도 {s.score}</small><p>{s.text}</p><a href={s.pdf_link} target="_blank" rel="noreferrer">PDF p.{s.page} 원문 열기 ↗</a></article>)}</>}</div></section>
}
