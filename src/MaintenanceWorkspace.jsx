import { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Download, FileText, Search, ShieldCheck } from 'lucide-react';
import { WorkContext, WorkHeading, WorkEmpty, RoleSteps, ReportProposal } from './RoleUI';
import { buildWorkReport, reportBasis, reportIsCurrent, appliedReportProposal } from './workReport';

export default function MaintenanceWorkspace({asset,issue,assets,data,record,update,save,advance,go,initialSection}) {
  const [search,setSearch]=useState('');
  const f=record.flow||{},n=f.stage||0,locked=n>=7;
  const confirmed=Boolean(f.maintenancePlanConfirmed||n>=5);
  const reportReady=reportIsCurrent(record),sourceCurrent=f.maintenanceReportBasis===reportBasis(record),hasReport=typeof f.maintenanceReport==='string';
  let view=initialSection==='maintenance-rag'?'action':initialSection||'overview';
  if(!['overview','received','action','submit'].includes(view))view='overview';
  if(view!=='overview'&&n<4)view='overview';
  if(view==='action'&&!confirmed)view='received';
  if(view==='submit'&&n<6)view=confirmed?'action':'received';
  const open=(section,id=issue.id)=>go('maintenance',id,section);
  const received=assets.filter(a=>a.issueId&&(data[a.issueId]?.flow?.stage||0)>=4);
  const matches=received.filter(a=>(a.name+' '+a.id+' '+a.sensor+' '+a.issueId).toLowerCase().includes(search.toLowerCase()));
  const stageText=r=>r.flow?.reviewStatus==='rejected'?'보완 요청':(r.flow?.stage||0)>=9?'승인 완료':(r.flow?.stage||0)>=7?'검토 대기':(r.flow?.stage||0)>=5?'보고서 준비':'점검 대기';
  const steps=[
    {id:'overview',title:'인계 현황',desc:'받은 작업 확인',enabled:true,done:view!=='overview'},
    {id:'received',title:'계획 확인',desc:'설비·센서·계획',enabled:n>=4,done:confirmed},
    {id:'action',title:'점검·조치',desc:'기록과 근거 확인',enabled:n>=4&&confirmed,done:n>=6},
    {id:'submit',title:'보고서',desc:'검토 후 제출',enabled:n>=6,done:locked}
  ];
  function generateReport() {
    save({
      maintenanceReport:buildWorkReport(asset,issue,record),
      maintenanceReportBasis:reportBasis(record),
      maintenanceReportProposal:null,
      maintenanceReportHistory:f.maintenanceReport?[...(f.maintenanceReportHistory||[]),{text:f.maintenanceReport,at:new Date().toISOString(),request:'점검 기록으로 보고서 다시 구성'}]:(f.maintenanceReportHistory||[])
    });
  }
  function exportReport() {
    const blob=new Blob([f.maintenanceReport||buildWorkReport(asset,issue,record)],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=issue.id+'-점검보고서.txt';a.click();URL.revokeObjectURL(url);
  }
  const field=(key,label,placeholder)=><label className="role-field">{label}<span>필수</span><input aria-label={label} value={f[key]||''} readOnly={locked} onChange={e=>save({[key]:e.target.value})} placeholder={placeholder}/></label>;
  return <div className="role-workspace" id={view==='overview'?'maintenance-overview':view==='received'?'received':view==='action'?'maintenance-action':'maintenance-report'}>
    <RoleSteps steps={steps} current={view} onChange={open} label="정비 담당자 작업 단계"/>
    {view==='overview'?<>
      <WorkHeading eyebrow="MAINTENANCE INBOX" title="전달받은 점검, 한 곳에서 확인하세요">엔지니어가 검토한 설비·센서와 계획서를 받아 점검을 시작합니다.</WorkHeading>
      <div className="role-stats"><div><span>전달받은 작업</span><strong>{received.length}<small>건</small></strong></div><div><span>점검·보고서 작성</span><strong>{received.filter(a=>(data[a.issueId]?.flow?.stage||0)<7).length}<small>건</small></strong></div><div><span>관리 부서 검토 대기</span><strong>{received.filter(a=>[7,8].includes(data[a.issueId]?.flow?.stage)).length}<small>건</small></strong></div><div><span>보완 요청</span><strong>{received.filter(a=>data[a.issueId]?.flow?.reviewStatus==='rejected').length}<small>건</small></strong></div></div>
      <section className="role-panel"><div className="role-panel-heading"><h2>인계된 설비·센서 목록</h2><span>{received.length}건</span></div><div className="role-pad"><label className="role-search"><Search size={15}/><input aria-label="인계 작업 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="설비명, 센서, 문제 ID 검색"/></label>
        {matches.length?<div className="role-inbox">{matches.map(a=><button key={a.id} onClick={()=>open('received',a.issueId)}><span className="role-equipment-icon"><Activity size={20}/></span><span className="role-inbox-name"><strong>{a.name}<small>{a.sensor}</small></strong><span>{a.issueTitle}</span><small>{a.issueId} · {a.id}</small></span><span className={'role-tag '+(data[a.issueId]?.flow?.reviewStatus==='rejected'?'amber':'')}>{stageText(data[a.issueId]||{})}</span><ArrowRight size={15}/></button>)}</div>:<WorkEmpty title={search?'검색 결과가 없습니다':'아직 전달받은 계획서가 없습니다'} action={!search&&<button className="secondary" onClick={()=>go('engineer',issue.id,'overview')}>엔지니어 업무 공간<ArrowRight size={14}/></button>}>{search?'설비명이나 센서명을 다시 확인해 주세요.':'엔지니어가 계획서를 전달하면 이 목록에 설비와 센서가 표시됩니다.'}</WorkEmpty>}
      </div></section>
    </>:<>
      <WorkContext asset={asset} issue={issue} status={stageText(record)}/>
      {f.reviewStatus==='rejected'&&<div className="role-notice amber"><strong>관리 부서에서 보완을 요청했습니다</strong><p>{f.rejectionReason}</p><small>점검 기록 보완 → 사례 확인 → 최신 보고서 구성 후 재제출하세요.</small></div>}
      {view==='received'&&<>
        <WorkHeading eyebrow="HANDOVER REVIEW" title="무엇을, 왜 점검하는지 먼저 확인하세요">전달된 설비·센서와 엔지니어가 작성한 계획을 함께 확인합니다.</WorkHeading>
        <div className="role-two-columns">
          <section className="role-panel role-pad"><div className="role-panel-heading"><h2>전달받은 설비·센서</h2><span className="role-tag">그룹 {asset.group}</span></div><div className="role-asset-hero"><span className="role-equipment-icon"><Activity size={28}/></span><div><h3>{asset.name}</h3><p>{asset.id} · 울산 CLX</p></div></div><div className="role-sensor-card"><div><strong>{asset.sensor}</strong><small>엔지니어가 선택한 대표 센서</small></div><b>{asset.value}<small>{asset.unit}</small></b></div><dl className="role-facts"><div><dt>예시 기준</dt><dd>{asset.limit} {asset.unit}</dd></div><div><dt>추정 원인</dt><dd>{asset.cause}</dd></div><div><dt>참고 자료</dt><dd>예시 매뉴얼 §4.2 / 가상 사례 {asset.group}-2025-014</dd></div></dl></section>
          <section className="role-panel role-pad"><div className="role-panel-heading"><h2>엔지니어의 점검 계획서</h2><span>전달본 · 읽기 전용</span></div><pre className="role-document">{f.plan}</pre><div className="role-summary-pair"><div><span>예상 소요시간</span><strong>{f.planTime}</strong></div><div><span>예상 필요 자재</span><strong>{f.planParts}</strong></div></div></section>
        </div>
        <div className="role-handoff"><div><ShieldCheck size={23}/><div><h3>{confirmed?'계획 확인을 완료했습니다':'설비·센서와 계획을 확인한 뒤 점검을 시작하세요'}</h3><p>실제 점검과 조치 결과는 다음 단계에서 작성합니다.</p></div></div><button className="primary" onClick={()=>{if(!locked)save({maintenancePlanConfirmed:true});open('action');}}>{locked?'점검 기록 보기':'계획 확인 · 점검 시작'}<ArrowRight size={15}/></button></div>
      </>}
      {view==='action'&&<>
        <WorkHeading eyebrow="INSPECTION & ACTION" title="현장에서 확인한 내용을 기록하세요">완료한 점검 항목과 실제 수행한 조치를 구분해 남깁니다.</WorkHeading>
        <details className="role-reference"><summary>전달받은 계획 다시 보기<span>{asset.name} · {asset.sensor}</span></summary><pre className="role-document">{f.plan}{'\n'}예상 시간: {f.planTime}{'\n'}필요 자재: {f.planParts}</pre></details>
        <section className="role-panel role-pad" id="action"><div className="role-panel-heading"><h2>현장 점검 체크리스트</h2><span>{(record.checks||[]).filter(c=>asset.checks.includes(c)).length}/{asset.checks.length} 완료</span></div><div className="role-checks">{asset.checks.map((check,index)=><label key={check} className={(record.checks||[]).includes(check)?'checked':''}><input type="checkbox" disabled={locked} checked={(record.checks||[]).includes(check)} onChange={e=>update({checks:e.target.checked?[...(record.checks||[]),check]:(record.checks||[]).filter(c=>c!==check)})}/><span>{String(index+1).padStart(2,'0')}</span><strong>{check}</strong></label>)}</div><label className="role-field">점검 결과<span>필수</span><textarea aria-label="점검 결과" value={record.inspection||''} readOnly={locked} onChange={e=>update({inspection:e.target.value})} placeholder="측정값, 확인한 상태와 확인하지 못한 항목을 기록하세요."/></label></section>
        <section className="role-panel role-pad"><div className="role-panel-heading"><h2>실제로 수행한 조치</h2><span>문제별 자동 저장</span></div><label className="role-field">실제 조치 내역<span>필수</span><textarea aria-label="실제 조치 내역" value={f.action??record.action??''} readOnly={locked} onChange={e=>save({action:e.target.value})} placeholder="계획과 구분해 실제로 수행한 조치만 입력하세요."/></label><div className="role-two-fields">{field('actionTime','실제 소요시간','예: 1시간 30분')}{field('actionParts','사용 자재','사용하지 않았으면 없음')}</div><label className="role-field">특이사항<input aria-label="특이사항" value={f.notes||''} readOnly={locked} onChange={e=>save({notes:e.target.value})} placeholder="추가로 확인할 사항이나 남은 리스크"/></label><div className="role-actions"><span>{locked?'제출된 기록은 읽기 전용입니다.':'점검 결과·실제 조치·시간·자재를 입력하면 다음으로 진행할 수 있습니다.'}</span><button className="primary" disabled={n!==4||![record.inspection,f.action??record.action,f.actionTime,f.actionParts].every(v=>v?.trim())} onClick={()=>advance(5)}>{n>=5?'기록 반영 완료':'점검 완료 · 기록 반영'}<CheckCircle2 size={14}/></button></div></section>
        <section className="role-panel role-pad" id="maintenance-rag"><div className="role-panel-heading"><h2>조치와 비교할 참고 사례</h2><button className="secondary" disabled={n!==5} onClick={()=>advance(6)}>{n>=6?'확인 완료':'유사 사례 확인'}</button></div>{n>=6?<div className="role-case"><span>REFERENCE CASE · {asset.group}-2025-014</span><h3>{asset.cause} 의심 시 점검</h3><p>{asset.checks.join(' → ')} 순서로 확인하고 같은 운전 조건에서 재측정하는 가상 사례입니다. 실제 조치의 적절성은 현장 조건과 함께 검토합니다.</p><small>실제 사례 검색 연동 전의 예시입니다.</small></div>:<p className="role-copy">조치 기록을 반영한 뒤 과거 사례를 확인합니다. 조회 결과를 실제 수행한 조치로 간주하지 않습니다.</p>}</section>
        <div className="role-actions"><button className="secondary" onClick={()=>open('received')}><ArrowLeft size={14}/>계획 다시 확인</button><button className="primary" disabled={n<6} onClick={()=>open('submit')}>보고서 확인·수정<ArrowRight size={15}/></button></div>
      </>}
      {view==='submit'&&<>
        <WorkHeading eyebrow="REPORT REVIEW" title={locked?'제출한 점검 보고서입니다':'점검 결과를 보고서로 정리하고 검토하세요'}>입력한 기록으로 초안을 구성합니다. 본문을 수정하고 변경 이력을 확인할 수 있습니다.</WorkHeading>
        <div className="role-report-facts"><span><strong>점검 완료</strong>{(record.checks||[]).filter(c=>asset.checks.includes(c)).length}/{asset.checks.length}개</span><span><strong>소요시간</strong>{f.actionTime}</span><span><strong>사용 자재</strong>{f.actionParts}</span></div>
        {!locked&&hasReport&&!sourceCurrent&&<div className="role-notice amber"><strong>점검 기록이 변경됐습니다</strong><p>현재 기록으로 보고서를 다시 구성한 뒤 검토·제출하세요. 기존 보고서는 변경 이력에 보관됩니다.</p></div>}
        <section className="role-panel role-pad" id="submit"><div className="role-panel-heading"><h2>점검 보고서</h2><span className="role-tag">{locked?'제출 완료':'v'+(1+(f.maintenanceReportHistory?.length||0))+' · 작성 중'}</span></div>
          {hasReport?<label className="role-field report-body-label">보고서 본문<textarea className="role-report-editor" aria-label="점검 보고서 본문" value={f.maintenanceReport} readOnly={locked||!sourceCurrent} onChange={e=>save({maintenanceReport:e.target.value})}/></label>:locked?<pre className="role-document">{buildWorkReport(asset,issue,record)}</pre>:<WorkEmpty title="기록을 모아 보고서 초안을 구성합니다" action={<button className="primary" onClick={generateReport}><FileText size={15}/>보고서 초안 구성</button>}>완료한 점검 항목, 현장 결과, 실제 조치, 시간과 자재를 보고서로 정리합니다.</WorkEmpty>}
          {!locked&&hasReport&&<div className="role-actions"><span>본문 편집은 자동 저장됩니다. Copilot의 수정 제안은 검토 후 적용합니다.</span><button className="secondary" onClick={generateReport}>기록으로 다시 구성</button></div>}
        </section>
        {f.maintenanceReportProposal&&!locked&&<ReportProposal proposal={f.maintenanceReportProposal} canApply={reportReady} current={f.maintenanceReport} onCancel={()=>save({maintenanceReportProposal:null})} onApply={()=>{if(reportReady)save(appliedReportProposal(record));}}/>}
        {Boolean(f.maintenanceReportHistory?.length)&&<details className="role-reference"><summary>보고서 변경 이력<span>{f.maintenanceReportHistory.length}건</span></summary>{f.maintenanceReportHistory.map((h,index)=><details className="role-history" key={index}><summary>v{index+1} · {new Date(h.at).toLocaleString('ko-KR')} · {h.request}</summary><pre className="role-document">{h.text}</pre></details>)}</details>}
        <div className="role-handoff"><div><ShieldCheck size={23}/><div><h3>{locked?'관리 부서에 제출했습니다':'검토한 보고서를 관리 부서에 제출합니다'}</h3><p>{locked?'제출된 기록은 보존되며, 보완 요청을 받으면 수정 후 재제출할 수 있습니다.':f.maintenanceReportProposal?'수정 제안을 적용하거나 취소한 뒤 제출하세요.':'최신 기록과 보고서 본문을 확인하세요. 제출 후에는 읽기 전용으로 보존됩니다.'}</p></div></div><div className="role-button-pair">{(hasReport||locked)&&<button className="secondary" onClick={exportReport}><Download size={14}/>TXT</button>}<button className="primary" disabled={!locked&&(n!==6||!reportReady||Boolean(f.maintenanceReportProposal))} onClick={()=>locked?go('manager',issue.id,'review'):advance(7)}>{locked?'검토 상태 확인':f.reviewStatus==='rejected'?'수정 보고서 재제출':'관리 부서에 제출'}<ArrowRight size={15}/></button></div></div>
        <button className="role-text-button" onClick={()=>open('action')}><ArrowLeft size={14}/>점검 기록 다시 확인</button>
      </>}
    </>}
    <p className="role-footnote">가상 설비·매뉴얼·사례를 사용하는 프로토타입입니다. 현장 확인과 최종 검토는 담당자가 수행합니다.</p>
  </div>;
}
