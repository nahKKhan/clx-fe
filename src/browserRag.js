// Static-host compatible lexical retrieval. No Python endpoint or external AI call.
const base = import.meta.env?.BASE_URL || '/';
export const manualUrl = (bearing=false,page=1) => `${base}rag/${bearing?'bearing':'clp'}.pdf#page=${page}`;
let cached;
async function corpus(signal){
 if(!cached){const r=await fetch(`${base}rag/corpus.json`,{signal,cache:'no-cache'});if(!r.ok)throw Error('검색 문서를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.');cached=await r.json();}
 signal?.throwIfAborted();return cached;
}
function terms(text){return text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];}
function counts(text){const out=new Map();for(const t of terms(text))out.set(t,(out.get(t)||0)+1);return out;}
const indexes=new WeakMap();
function search(chunks,question,expansions){
 let idx=indexes.get(chunks);
 if(!idx){const docs=chunks.map(c=>counts(`${c.section} ${c.text} ${c.ko_fact||''}`));const df=new Map();for(const d of docs)for(const t of d.keys())df.set(t,(df.get(t)||0)+1);const idf=new Map([...df].map(([t,n])=>[t,Math.log((1+docs.length)/(1+n))+1]));const vector=d=>{let norm=0;const v=new Map();for(const [t,n] of d){if(!idf.has(t))continue;const w=(1+Math.log(n))*idf.get(t);v.set(t,w);norm+=w*w;}norm=Math.sqrt(norm)||1;return new Map([...v].map(([t,w])=>[t,w/norm]));};idx={vector,docs:docs.map(vector)};indexes.set(chunks,idx);}
 let expanded=question;for(const [ko,en] of Object.entries(expansions))if(question.toLowerCase().includes(ko.toLowerCase()))expanded+=' '+en;
 const q=idx.vector(counts(expanded));return chunks.map((c,i)=>({...c,score:[...q].reduce((s,[t,w])=>s+w*(idx.docs[i].get(t)||0),0)})).sort((a,b)=>b.score-a.score).map((c,i)=>({...c,rank:i+1}));
}
export async function askManual(question,signal){
 const c=await corpus(signal);const sources=search(c.clp,question,c.expansions).slice(0,5).map(h=>({...h,score:+h.score.toFixed(4),pdf_link:manualUrl(false,h.page)}));
 let answer,mode='browser-grounded';
 if(/진동|vibration|nasa|ims/i.test(question)){answer='SKF CLP Touch는 윤활 펌프 매뉴얼입니다. 해당 베어링 진동의 원인·임계값은 직접 확인할 수 없습니다. 위 NASA 시점 분석에서 베어링 진단 문서를 확인하세요.';mode='scope-guard';}
 else {const fact=sources.slice(0,3).find(h=>h.ko_fact&&h.score>=.1);answer=fact?.ko_fact||'질문에 답할 충분한 한국어 근거를 확인하지 못했습니다. 검색된 원문을 확인하거나 질문을 구체적으로 입력하세요.';}
 return {question,answer,answer_mode:mode,document:'SKF CLP Touch Lubrication Pump Assembly Instructions',version:'V07',sources};
}
export async function analyzeSnapshot(index,signal){
 const c=await corpus(signal),d=c.ims,rows=d.rows,row=rows[index];if(!row)throw Error('측정 시점을 확인하세요.');
 const previous=rows.slice(Math.max(0,index-6),index),mean=previous.length?previous.reduce((s,r)=>s+r.rms,0)/previous.length:null;
 const excess=(row.rms/d.threshold-1)*100,change=mean?(row.rms/mean-1)*100:null,event=index>=d.baseline_count&&excess>0;
 const status=index<d.baseline_count?'기준 구간 · 이상 판정 제외':event?'통계 임계값 초과':'통계 임계값 이하';
 const observation={timestamp:row.timestamp,rms:row.rms,threshold:d.threshold,status,excess_percent:excess,previous_count:previous.length,previous_mean:mean,change_percent:change,channel:d.channel+1};
 if(!event)return {observation,query:'',supported:false,search_performed:false,guidance:[],sources:[],document:'',limitation:'현재 RMS 통계 기준에서 이상 이벤트가 감지되지 않아 검색을 생략했습니다. 임계값 이하가 설비의 정상 상태를 보장하지는 않습니다.'};
 const query=`NASA IMS 베어링 ${d.channel+1}, ${row.timestamp}, 진동 RMS ${row.rms.toFixed(6)}, 임계값 ${d.threshold.toFixed(6)}, 기준 대비 ${excess.toFixed(2)}%, 직전 ${previous.length}개 평균 대비 ${change===null?'비교 없음':change.toFixed(2)+'%'}. excessive vibration levels bearing inspection fault solution`;
 const ranked=search(c.bearing,query,c.expansions);const guides=ranked.filter(h=>h.kind==='linked_guidance').slice(0,4);const context=ranked.find(h=>h.page===9&&h.text.includes('Monitoring'));
 const sources=[...guides,...(context?[context]:[])].map((h,i)=>({...h,rank:i+1,score:+h.score.toFixed(4),pdf_link:manualUrl(true,h.page)}));
 return {observation,query,supported:!!guides.length,search_performed:true,document:'SKF Bearing Damage and Failure Analysis',
 guidance:guides.map(h=>({title:h.title,text:h.ko_fact,codes:h.codes,action_pages:h.action_pages,source_id:h.id})),sources,
 limitation:'문서의 일반 점검 근거입니다. RMS만으로 원인과 후보 우선순위를 구분할 수 없습니다. 진동 주파수 특성·운전 조건·윤활·현장 점검으로 확인해야 합니다. 분해·정비 전 문서 p.13의 잠금/표찰 절차를 적용합니다.'};
}
