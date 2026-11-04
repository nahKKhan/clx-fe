import {useEffect,useRef,useState} from 'react';
import RotationAnswer from './RotationAnswer';
export default function RotationInsight({replay,sensor}){
 const item=replay.sensors[sensor], point=item?.history.at(-1), event=item?.events[0], limit=replay.limits[sensor];
 const eventKey=item?.active&&event?`${sensor}:${event.tick}`:null;
 const [entry,setEntry]=useState(null);const requests=useRef(new Map()),attempted=useRef(new Set());
 const visible=entry?.key===eventKey&&eventKey?entry:null;
 function search(){
  if(!eventKey||!point||!limit||requests.current.has(eventKey))return;
  const key=eventKey, controller=new AbortController(),snapshot={sensor,rms:point.value,threshold:limit,alarm:true};
  requests.current.set(key,controller);setEntry({key,busy:true,snapshot});
  const timer=setTimeout(()=>controller.abort(),130000);
  fetch(`${import.meta.env.BASE_URL}rotation-api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:controller.signal})
   .then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.detail||'가이드북 검색 서버 응답을 확인해 주세요.');return d})
   .then(result=>{if(requests.current.get(key)===controller)setEntry(prev=>prev?.key===key?{key,result,snapshot}:prev)})
   .catch(e=>{if(requests.current.get(key)===controller)setEntry(prev=>prev?.key===key?{key,error:e.name==='AbortError'?'검색 시간이 초과되었습니다.':e.message==='Failed to fetch'?'검색 서버에 연결할 수 없습니다.':e.message,snapshot}:prev)})
   .finally(()=>{clearTimeout(timer);if(requests.current.get(key)===controller)requests.current.delete(key)});
 }
 useEffect(()=>{if(!eventKey||attempted.current.has(eventKey))return;attempted.current.add(eventKey);search()},[eventKey]);
 useEffect(()=>()=>{for(const c of requests.current.values())c.abort();requests.current.clear();attempted.current.clear()},[]);
 if(!eventKey)return <p className="eng-copy">현재 3초 연속 임계값 초과 알림이 없어 원인 검색을 실행하지 않았습니다. 기준 이내가 정상 상태를 보장하지는 않습니다.</p>;
 if(!visible||visible.busy)return <p className="eng-copy">가이드북을 검색하고 Qwen 답변을 생성하고 있습니다…</p>;
 if(visible.error)return <div><p role="alert" className="eng-copy">{visible.error} Ollama와 가이드북 검색 서버를 확인하세요.</p><button className="secondary" onClick={search}>다시 검색</button></div>;
 return <div className="eng-case"><p>검색 당시 RMS {visible.snapshot.rms.toFixed(4)} · 시험 기준 {visible.snapshot.threshold.toFixed(4)}</p><RotationAnswer text={visible.result.answer}/><p>문서의 일반적인 원인 후보이며 확정 진단이 아닙니다.</p><div>{visible.result.sources.map(s=><a key={s.id} href={`${import.meta.env.BASE_URL}rotation/guide.pdf#page=${s.page}`} target="_blank" rel="noreferrer">PDF {s.page}쪽 ↗　</a>)}</div><button className="secondary" onClick={search}>현재 데이터로 다시 검색</button></div>;
}
