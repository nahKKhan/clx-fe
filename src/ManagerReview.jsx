import { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, FileText, Search, ShieldCheck } from 'lucide-react';
import { WorkContext, WorkHeading, WorkEmpty, RoleSteps } from './RoleUI';
import { buildWorkReport, reportBasis } from './workReport';

export default function ManagerReview({asset,issue,assets,data,record,advance,save,reviewReport,go,initialSection}) {
  const f=record.flow||{},n=f.stage||0,approved=n>=9;
  const [search,setSearch]=useState(''),[mode,setMode]=useState(null),[draft,setDraft]=useState({}),[reason,setReason]=useState(''),[error,setError]=useState('');
  let view=initialSection||'overview';
  if(!['overview','review','approve'].includes(view))view='overview';
  if(view==='approve'&&n<8)view='review';
  const submitted=assets.filter(a=>a.issueId&&((data[a.issueId]?.flow?.stage||0)>=7||data[a.issueId]?.flow?.reviewStatus==='rejected'));
  const visible=submitted.filter(a=>(a.name+' '+a.sensor+' '+a.id+' '+a.issueId).toLowerCase().includes(search.toLowerCase()));
  const status=r=>(r.flow?.stage||0)>=9?'승인 완료':r.flow?.reviewStatus==='rejected'?'재제출 대기':(r.flow?.stage||0)>=8?'승인 대기':r.flow?.reviewStatus==='revised'?'수정본 재검토':'검토 대기';
  const open=section=>go('manager',issue.id,section);
  const steps=[
    {id:'overview',title:'제출 현황',desc:'검토할 작업 확인',enabled:true,done:view!=='overview'},
    {id:'review',title:'보고서 검토',desc:'계획과 실제 조치',enabled:n>=7||f.reviewStatus==='rejected',done:n>=8},
    {id:'approve',title:'최종 판단',desc:'의견과 승인',enabled:n>=8&&!mode,done:approved}
  ];
  function begin(kind) {
    setMode(kind);setReason('');setError('');
    setDraft({action:f.action||'',actionTime:f.actionTime||'',actionParts:f.actionParts||'',notes:f.notes||'',maintenanceReport:f.maintenanceReport||buildWorkReport(asset,issue,record)});
  }
  function changeFact(key,value) {
    const next={...draft,[key]:value};
    const nextRecord={...record,flow:{...f,...next}};
    setDraft({...next,maintenanceReport:buildWorkReport(asset,issue,nextRecord)});
  }
  function commit() {
    if(mode==='edit'&&!draft.maintenanceReport?.trim()){setError('보고서 본문을 입력해 주세요.');return;}
    const nextRecord={...record,flow:{...f,...draft}};
    if(reviewReport(mode,{...draft,maintenanceReportBasis:reportBasis(nextRecord),maintenanceReportProposal:null},reason)) {setMode(null);setReason('');setError('');}
    else setError('필수 항목과 수정·반려 사유를 확인해 주세요.');
  }
  return <div className="role-workspace" id={view==='overview'?'manager-overview':view==='review'?'manager-review':'manager-approve'}>
    <RoleSteps steps={steps} current={view} onChange={open} label="설비 관리 부서 작업 단계"/>
    {view==='overview'?<>
      <WorkHeading eyebrow="EQUIPMENT MANAGEMENT" title="점검 결과를 검토하고 다음 판단으로 이어갑니다">정비 부서가 제출한 보고서와 남은 확인 사항을 살펴보세요.</WorkHeading>
      <div className="role-stats"><div><span>검토할 보고서</span><strong>{submitted.filter(a=>(data[a.issueId]?.flow?.stage||0)===7).length}<small>건</small></strong></div><div><span>최종 승인 대기</span><strong>{submitted.filter(a=>(data[a.issueId]?.flow?.stage||0)===8).length}<small>건</small></strong></div><div><span>재제출 대기</span><strong>{submitted.filter(a=>data[a.issueId]?.flow?.reviewStatus==='rejected').length}<small>건</small></strong></div><div><span>승인 완료</span><strong>{submitted.filter(a=>(data[a.issueId]?.flow?.stage||0)>=9).length}<small>건</small></strong></div></div>
      <section className="role-panel"><div className="role-panel-heading"><h2>제출된 점검 보고서</h2><span>{submitted.length}건</span></div><div className="role-pad"><label className="role-search"><Search size={15}/><input aria-label="제출 보고서 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="설비명, 센서, 문제 ID 검색"/></label>{visible.length?<div className="role-inbox">{visible.map(a=><button key={a.id} onClick={()=>go('manager',a.issueId,'review')}><span className="role-equipment-icon"><FileText size={20}/></span><span className="role-inbox-name"><strong>{a.name}<small>{a.sensor}</small></strong><span>{a.issueTitle}</span><small>{a.issueId}</small></span><span className={'role-tag '+(data[a.issueId]?.flow?.reviewStatus==='rejected'?'amber':'')}>{status(data[a.issueId]||{})}</span><ArrowRight size={15}/></button>)}</div>:<WorkEmpty title={search?'검색 결과가 없습니다':'아직 제출된 보고서가 없습니다'}>{search?'설비명이나 센서명을 다시 확인하세요.':'정비 담당자가 보고서를 제출하면 여기서 검토할 수 있습니다.'}</WorkEmpty>}</div></section>
    </>:<>
      <WorkContext asset={asset} issue={issue} status={status(record)}/>
      {view==='review'&&<>
        <WorkHeading eyebrow="REPORT REVIEW" title={f.reviewStatus==='rejected'?'보완한 보고서의 재제출을 기다립니다':'계획과 실제 조치를 나란히 확인하세요'}>점검 결과와 미확인 사항을 검토한 뒤 승인 단계로 이동합니다.</WorkHeading>
        {n<7?<WorkEmpty title={f.reviewStatus==='rejected'?'정비 담당자 보완 중':'정비 보고서 제출 대기'} action={<button className="secondary" onClick={()=>go('maintenance',issue.id,'action')}>정비 기록 확인<ArrowRight size={14}/></button>}>{f.rejectionReason||'현재 제출된 보고서가 없습니다.'}</WorkEmpty>:<>
          <div className="role-two-columns">
            <section className="role-panel role-pad"><div className="role-panel-heading"><h2>엔지니어의 점검 계획</h2><span>전달본</span></div><pre className="role-document">{f.plan}</pre><div className="role-summary-pair"><div><span>예상 시간</span><strong>{f.planTime}</strong></div><div><span>필요 자재</span><strong>{f.planParts}</strong></div></div></section>
            <section className="role-panel role-pad"><div className="role-panel-heading"><h2>현장에서 수행한 조치</h2><span>정비 기록</span></div><dl className="role-facts"><div><dt>점검 결과</dt><dd>{record.inspection||'미입력'}</dd></div><div><dt>실제 조치</dt><dd>{f.action}</dd></div><div><dt>소요시간</dt><dd>{f.actionTime}</dd></div><div><dt>사용 자재</dt><dd>{f.actionParts}</dd></div><div><dt>특이사항</dt><dd>{f.notes||'미기재'}</dd></div></dl></section>
          </div>
          <section className="role-panel role-pad"><div className="role-panel-heading"><h2>확인이 필요한 사항</h2><span>{(record.checks||[]).filter(c=>asset.checks.includes(c)).length}/{asset.checks.length} 점검 완료 표시</span></div><div className="role-review-checks">{asset.checks.map(check=><div key={check} className={(record.checks||[]).includes(check)?'complete':''}><CheckCircle2 size={16}/><span>{check}</span><small>{(record.checks||[]).includes(check)?'완료 표시됨':'현장 확인 필요'}</small></div>)}</div><p className="role-copy">추정 원인: {asset.cause}. 조치 후 정상 복귀 여부는 실제 재측정 결과와 운전 조건을 함께 확인해야 합니다.</p></section>
          <section className="role-panel role-pad" id="review"><div className="role-panel-heading"><h2>제출된 점검 보고서</h2><span className="role-tag">{status(record)}</span></div><pre className="role-document role-submitted-report">{f.maintenanceReport||buildWorkReport(asset,issue,record)}</pre>{!approved&&!mode&&<div className="role-actions"><span>수정·반려 시 현재 제출본과 사유가 이력으로 보존됩니다.</span><div><button className="secondary" onClick={()=>begin('edit')}>보고서 수정</button><button className="role-reject" onClick={()=>begin('reject')}>보완 요청 · 반려</button></div></div>}
          {mode&&<div className="role-edit-panel"><h3>{mode==='edit'?'보고서 수정 후 다시 검토합니다':'보완할 내용을 정비 담당자에게 전달합니다'}</h3>{mode==='edit'&&<><p className="role-copy">점검 기록을 변경하면 보고서 본문도 다시 구성됩니다. 문구 수정은 기록 변경 후 작성하세요.</p><div className="role-two-fields">{[['action','실제 조치'],['actionTime','소요시간'],['actionParts','사용 자재'],['notes','특이사항']].map(([key,label])=><label key={key} className="role-field">{label}<textarea aria-label={'수정 '+label} value={draft[key]} onChange={e=>changeFact(key,e.target.value)}/></label>)}</div><label className="role-field">보고서 본문<textarea className="role-report-editor" aria-label="수정 보고서 본문" value={draft.maintenanceReport} onChange={e=>setDraft({...draft,maintenanceReport:e.target.value})}/></label></>}<label className="role-field">{mode==='edit'?'수정 사유':'반려 사유'}<span>필수</span><textarea aria-label={mode==='edit'?'수정 사유':'반려 사유'} value={reason} onChange={e=>setReason(e.target.value)} placeholder="변경 이유나 보완할 내용을 구체적으로 적어 주세요."/></label>{error&&<p role="alert" className="role-error">{error}</p>}<div className="role-actions"><button className="secondary" onClick={()=>{setMode(null);setError('');}}>취소</button><button className={mode==='edit'?'primary':'role-reject'} onClick={commit}>{mode==='edit'?'수정 저장 · 재검토':'반려 확정'}</button></div></div>}</section>
          <div className="role-actions"><button className="secondary" onClick={()=>open('overview')}><ArrowLeft size={14}/>제출 현황</button><button className="primary" disabled={n!==7||Boolean(mode)} onClick={()=>{advance(8);open('approve');}}>{n>=8?'보고서 검토 완료':'검토 완료 · 최종 판단'}<ArrowRight size={15}/></button>{n>=8&&<button className="primary" disabled={Boolean(mode)} onClick={()=>open('approve')}>최종 판단 보기<ArrowRight size={15}/></button>}</div>
        </>}
      </>}
      {view==='approve'&&<>
        <WorkHeading eyebrow="FINAL DECISION" title={approved?'최종 승인을 완료했습니다':'최종 검토 의견을 남겨 주세요'}>검토 근거와 추가로 확인할 사항을 의견에 남겨 기록을 마무리합니다.</WorkHeading>
        <section className="role-panel role-pad" id="approve"><div className="role-panel-heading"><h2>최종 검토</h2><span className="role-tag">{approved?'승인 완료':'승인 대기'}</span></div><div className="role-decision-summary"><ShieldCheck size={28}/><div><strong>{asset.name} · {asset.sensor}</strong><p>{issue.title}</p><small>계획·실제 조치·보고서 검토 완료</small></div></div><label className="role-field">최종 검토 의견<span>필수</span><textarea aria-label="최종 검토 의견" value={f.comment||''} readOnly={approved} onChange={e=>save({comment:e.target.value})} placeholder="검토 결과, 남은 확인 사항, 후속 판단을 기록하세요."/></label>{approved&&<p className="role-copy">승인 시각: {f.approvedAt} · 승인된 기록은 읽기 전용으로 보존됩니다.</p>}</section>
        <div className="role-handoff"><div><ShieldCheck size={23}/><div><h3>{approved?'승인된 결과를 보존했습니다':'의견과 보고서를 확인한 뒤 승인합니다'}</h3><p>최종 승인 후에는 이 기록을 수정하거나 반려할 수 없습니다.</p></div></div><button className="primary" disabled={n!==8||!f.comment?.trim()||Boolean(mode)} onClick={()=>advance(9)}>{approved?'승인 완료':'최종 승인'}<CheckCircle2 size={15}/></button></div><button className="role-text-button" onClick={()=>open('review')}><ArrowLeft size={14}/>보고서 다시 확인</button>
      </>}
      {Boolean(f.history?.length)&&<details className="role-reference"><summary>수정·반려 이력<span>{f.history.length}건</span></summary>{f.history.map((h,index)=><details className="role-history" key={index}><summary>{h.kind==='reject'?'반려':'관리 부서 수정'} · {new Date(h.at).toLocaleString('ko-KR')} · {h.reason}</summary><pre className="role-document">{h.before.maintenanceReport||('변경 전 조치: '+h.before.action+'\n소요시간: '+h.before.actionTime+'\n자재: '+h.before.actionParts+'\n특이사항: '+(h.before.notes||'미기재'))}</pre>{h.kind==='edit'&&<pre className="role-document">{h.changes.maintenanceReport||('변경 후 조치: '+h.changes.action+'\n소요시간: '+h.changes.actionTime+'\n자재: '+h.changes.actionParts)}</pre>}</details>)}</details>}
    </>}
    <p className="role-footnote">가상 설비 데이터 기반 프로토타입입니다. 검토 의견과 승인 기록은 문제별로 브라우저에 저장됩니다.</p>
  </div>;
}
