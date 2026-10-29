import { Activity, Check, ChevronRight, FileText } from 'lucide-react';
import './RoleWorkspace.css';

export function RoleSteps({steps,current,onChange,label}) {
  return <nav className="role-steps" aria-label={label} style={{'--step-count':steps.length}}>
    {steps.map((step,index)=><button key={step.id} disabled={!step.enabled} aria-current={current===step.id?'step':undefined}
      onClick={()=>onChange(step.id)} className={(current===step.id?'current ':'')+(step.done?'done':'')}>
      <span className="role-step-number">{step.done&&current!==step.id?<Check size={15}/>:String(index+1).padStart(2,'0')}</span>
      <span><strong>{step.title}</strong><small>{step.desc}</small></span>{index<steps.length-1&&<ChevronRight size={15}/>}
    </button>)}
  </nav>;
}
export function WorkContext({asset,issue,status}) {
  return <div className="role-context"><span className="role-context-icon"><Activity size={18}/></span><div><strong>{asset.name}</strong><small>{asset.id} · {asset.sensor} {asset.value} {asset.unit}</small></div><span className="role-context-id">{issue.id}</span><span className="role-tag">{status}</span></div>;
}
export function WorkHeading({eyebrow,title,children,aside}) {
  return <div className="role-heading"><div><span className="role-eyebrow">{eyebrow}</span><h2>{title}</h2>{children&&<p>{children}</p>}</div>{aside}</div>;
}
export function WorkEmpty({title,children,action}) {
  return <div className="role-empty"><FileText size={29}/><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function ReportProposal({proposal,current,onApply,onCancel,canApply=true}) {
  if(!proposal)return null;
  return <section className="role-panel role-pad role-proposal"><div className="role-panel-heading"><h2>Copilot 보고서 수정 제안</h2><span className="role-tag amber">검토 대기</span></div><p className="role-copy">요청: {proposal.request}</p>
    <div className="role-diff"><div><strong>현재 보고서</strong><pre>{current}</pre></div><div><strong>추가할 내용</strong><pre>+ {proposal.addition}</pre></div></div>
    <div className="role-actions"><span>적용 전 원문은 변경 이력에 보관됩니다.</span><div><button className="secondary" onClick={onCancel}>제안 취소</button><button className="primary" disabled={!canApply} onClick={onApply}>변경안 적용<Check size={14}/></button></div></div>
  </section>;
}
