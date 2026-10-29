import { useState } from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

const groups = {
 A: {label:'즉시 확인',axes:'중요도 높음 · 긴급도 높음',ids:['COMP-02'],reason:'핵심 설비로 가정한 압축기 5대에서 진동 기준 7.1 mm/s 초과가 관찰되어 즉시 확인 그룹으로 분류했습니다. 각 설비의 측정값과 추이는 상세 화면에서 확인하세요.'},
 B: {label:'계획 점검',axes:'중요도 높음 · 긴급도 낮음',ids:['PUMP-01'],reason:'중요 설비로 가정한 펌프 5대에서 온도 기준 80℃ 초과가 관찰됐습니다. 이 예시에서는 A보다 대응 긴급도를 낮게 설정했으며, 실제 점검 시점은 현장 상태 확인 후 결정해야 합니다.'},
 C: {label:'신속 확인·분담',axes:'중요도 낮음 · 긴급도 높음',ids:['MOTOR-03'],reason:'상대적 공정 영향도가 낮은 보조 설비로 가정한 모터 5대에서 전류 기준 40A 초과가 관찰되어 담당자의 신속한 부하 확인 대상으로 분류했습니다. 실제 공정 영향도는 확인이 필요합니다.'},
 D: {label:'관찰·일정 검토',axes:'중요도 낮음 · 긴급도 낮음',ids:[],reason:'현재 이 그룹에 배정된 활성 알람은 없습니다. 정상 설비는 알람 분류 대상에서 제외합니다.'}
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
 <div className="matrix-footnote">데모 분류 · 심각도와 중요도·긴급도는 별도 기준입니다. 실제 공정 영향도와 대응 시점은 현장 확인이 필요합니다.</div>
 </section>;
}
