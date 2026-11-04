import { useState } from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

const groups = {
 A: {label:'알림 확인',axes:'시험용 임시 분류',reason:'센서의 1초 RMS가 해당 센서의 시험 기준을 3초 연속 초과했습니다. 실제 설비의 중요도와 긴급도는 확인되지 않아 A에 임시로 모았습니다.'},
 B: {label:'미설정',axes:'실제 우선순위 미설정',reason:'설비의 실제 중요도와 긴급도가 제공되지 않았습니다.'},
 C: {label:'미설정',axes:'실제 우선순위 미설정',reason:'설비의 실제 중요도와 긴급도가 제공되지 않았습니다.'},
 D: {label:'미설정',axes:'실제 우선순위 미설정',reason:'설비의 실제 중요도와 긴급도가 제공되지 않았습니다.'}
};
export default function AlarmMatrix({assets,go}) {
 const [selected,setSelected]=useState('A');
 const active=assets.filter(a=>a.level!=='Normal');
 const members=key=>active.filter(a=>a.group===key);
 const group=groups[selected];
 return <section className="monitor-widget alarm-matrix" aria-label="알람 우선순위 매트릭스">
 <div className="widget-title"><AlertTriangle size={15}/>알람 우선순위 매트릭스<span>{active.length} EVENTS</span></div>
 <div className="matrix-content"><div className="matrix-plot"><div className="matrix-y">중요도 ↑<span>높음</span><span>낮음</span></div><div className="quadrants">{['B','A','D','C'].map(key=><button key={key} aria-pressed={selected===key} aria-label={`${key} ${groups[key].axes} ${members(key).length}건`} className={`quadrant group-${key} ${selected===key?'selected':''}`} onClick={()=>setSelected(key)}><span className="quadrant-heading"><b>{key}</b><strong>{members(key).length}<small>건</small></strong></span><span>{groups[key].label}</span></button>)}</div><div className="matrix-x"><span>낮음</span><strong>긴급도 →</strong><span>높음</span></div></div>
 <div className="matrix-detail"><div className="matrix-detail-heading"><b>{selected}</b><div><strong>{group.label}</strong><small>{group.axes}</small></div></div><div className="matrix-members">{members(selected).length?members(selected).map(a=><button key={a.id} onClick={()=>go('detail',a.issueId)}><span><strong>{a.issueTitle}</strong><small>{a.issueId} · {a.id} · {a.sensor} {a.value} {a.unit}</small></span><span className={'badge '+a.level.toLowerCase()}>{a.level}</span><ArrowUpRight size={14}/></button>):<p className="matrix-empty">해당 그룹의 활성 알람이 없습니다.</p>}</div><div className="matrix-reason"><strong>분류 이유</strong><p>{group.reason}</p></div></div></div>
 <div className="matrix-footnote">A는 시험용 임시 분류이며 실제 중요도·긴급도나 고장 원인을 뜻하지 않습니다.</div>
 </section>;
}
