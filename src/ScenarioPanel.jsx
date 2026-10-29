import { useRef, useState } from 'react';
export const scenarios=[
 {stage:1,label:'[설비 엔지니어] 1. 이상원인 파악',page:'engineer',section:'diagnosis'},
 {stage:2,label:'[설비 엔지니어] 2. 유사 사례 RAG 검색',page:'engineer',section:'engineer-rag'},
 {stage:3,label:'[설비 엔지니어] 3. 정비 계획서 초안 작성',page:'engineer',section:'plan'},
 {stage:4,label:'[설비 엔지니어] 4. 정비 계획서 전달',page:'engineer',section:'handoff'},
 {stage:5,label:'[설비 정비공] 5. 조치 기록 작성 반영',page:'maintenance',section:'action'},
 {stage:6,label:'[설비 정비공] 6. 과거 사례 RAG 검색',page:'maintenance',section:'maintenance-rag'},
 {stage:8,label:'[설비 운영부서] 7. 최종 보고서 작성 및 검토',page:'manager',section:'review'}
];
export function scenarioAvailable(stage,n){return stage<=n||stage===n+1;}
export function archiveHTML(issue,record){
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const f=record.flow||{};
 const sections=[['정비 계획',f.plan],['예상 시간 / 필요 자재',`${f.planTime||'미입력'} / ${f.planParts||'미입력'}`],['점검 결과',record.inspection],['실제 조치',f.action??record.action],['소요시간 / 사용 자재',`${f.actionTime||'미입력'} / ${f.actionParts||'미입력'}`],['특이사항',f.notes],['최종 검토 의견',f.comment],['제출 시각',f.submittedAt],['승인 시각',f.approvedAt]];
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(issue.title)} 보관</title><style>body{font:14px/1.8 system-ui;max-width:900px;margin:40px auto;padding:20px;color:#234}section{border:1px solid #dde;padding:20px;margin:16px 0;border-radius:8px}pre{white-space:pre-wrap;font:inherit}small{color:#678}</style><h1>${escape(issue.title)}</h1><p>${escape(issue.id)} · 업무 ${f.stage||0}/9 완료</p><small>문제 기록의 읽기 전용 보관본 · 데모 데이터</small>${sections.map(([t,v])=>`<section><h2>${escape(t)}</h2><pre>${escape(v||'미작성')}</pre></section>`).join('')}<section><h2>대화 기록</h2>${(record.messages||[]).map(m=>`<p><b>사용자</b> ${escape(m.q)}</p><pre><b>도우미</b> ${escape(m.a)}</pre>`).join('')}</section><script type="application/json" id="preserved-workflow">${JSON.stringify({issue,record}).replace(/</g,'\\u003c')}</script></html>`;
}
export default function ScenarioPanel({issue,record,run,reset,undo,canUndo}){
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('plant-scenario-collapsed')==='true'}catch{return false}});
 const [dragHeight,setDragHeight]=useState(null);
 const drag=useRef(null),suppressClick=useRef(false),panel=useRef(null);
 function fold(value){setCollapsed(value);setDragHeight(null);try{localStorage.setItem('plant-scenario-collapsed',String(value))}catch{}}
 function startDrag(e){if(e.button!==0)return;suppressClick.current=false;drag.current={y:e.clientY,height:panel.current.getBoundingClientRect().height,collapsed};e.currentTarget.setPointerCapture(e.pointerId);}
 function moveDrag(e){if(!drag.current)return;const delta=e.clientY-drag.current.y;if(Math.abs(delta)>5){suppressClick.current=true;setDragHeight(Math.max(38,Math.min(window.innerHeight*.48,drag.current.height-delta)));}}
 function endDrag(e){if(!drag.current)return;const delta=e.clientY-drag.current.y;const was=drag.current.collapsed;drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(Math.abs(delta)>20)fold(delta>0);else{setDragHeight(null);setCollapsed(was);}}
 const [confirm,setConfirm]=useState(false);const n=record.flow?.stage||0;const done=scenarios.filter(s=>s.stage<=n).length;
 function download(){const u=URL.createObjectURL(new Blob([archiveHTML(issue,record)],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`${issue.id}-업무기록.html`;a.click();URL.revokeObjectURL(u);}
 return <section ref={panel} className={`scenario-panel ${collapsed?'is-collapsed':''} ${dragHeight!==null?'is-dragging':''}`} style={dragHeight!==null?{height:dragHeight}:undefined} aria-label="시나리오 디버그"><button type="button" className="scenario-grip" aria-label={collapsed?'시나리오 디버그 펼치기':'시나리오 디버그 접기'} aria-expanded={!collapsed} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={()=>{drag.current=null;setDragHeight(null)}} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}fold(!collapsed)}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();fold(e.key==='ArrowDown')}}}><i/><span>시나리오 디버그 <small>{done}/7</small></span><b>{collapsed?'⌃':'⌄'}</b></button><div className="scenario-body" hidden={collapsed&&dragHeight===null}><div className="scenario-heading"><strong>시나리오 디버그 <small>(현재 문제 연동)</small></strong><button onClick={()=>setConfirm(!confirm)}>현재 문제 초기화</button></div>{confirm&&<div className="scenario-reset"><p>이 문제의 진행 상태와 대화를 초기화합니다.</p><button onClick={()=>{reset();setConfirm(false)}}>초기화</button><button onClick={()=>setConfirm(false)}>취소</button></div>}{canUndo&&<button className="scenario-undo" onClick={undo}>최근 초기화 되돌리기</button>}<p className="scenario-status" aria-live="polite">{done}/7 단계 · 입력 내용 자동 저장</p><button className="scenario-export" onClick={download}>진행 상태와 결과를 HTML로 보관</button><div className="scenario-steps">{scenarios.map(s=><button key={s.stage} disabled={!scenarioAvailable(s.stage,n)} onClick={()=>run(s)} className={s.stage<=n?'complete':''}>{s.stage<=n?'✓ ':''}{s.label}</button>)}</div>{n===6&&<p className="scenario-hint">정비 화면에서 보고서를 제출하면 7번이 활성화됩니다.</p>}</div></section>;
}
