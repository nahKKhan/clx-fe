import { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, ClipboardList, FileText, Search, ShieldCheck, Sparkles } from 'lucide-react';
import './EngineerWorkspace.css';

const groups = {
  A: { name: '즉시 확인', axes: '중요도 높음 · 긴급도 높음', color: '#f08e96' },
  B: { name: '계획 점검', axes: '중요도 높음 · 긴급도 낮음', color: '#e9bc76' },
  C: { name: '신속 확인·분담', axes: '중요도 낮음 · 긴급도 높음', color: '#78b5ee' },
  D: { name: '관찰·일정 검토', axes: '중요도 낮음 · 긴급도 낮음', color: '#6ec7b0' }
};
const steps = [
  ['overview', '설비 현황', '우선순위 확인'],
  ['equipment', '설비 확인', '대상·센서 선택'],
  ['diagnosis', '센서 확인', '트렌드·근거 검토'],
  ['plan', '정비 계획서', '검토 후 전달']
];
function status(asset) {
  const ratio = asset.value / asset.limit;
  if (asset.level === 'Normal') return { label: '정상', key: 'normal' };
  if (asset.level === 'Critical') return { label: '긴급 확인', key: 'urgent' };
  return ratio > 1.03 ? { label: '주의', key: 'attention' } : { label: '관찰', key: 'watch' };
}
function Status({ asset }) {
  const value = status(asset);
  return <span className={'eng-status ' + value.key}><i />{value.label}</span>;
}
function reason(asset) {
  const excess = ((asset.value / asset.limit - 1) * 100).toFixed(1);
  return asset.level === 'Normal'
    ? '현재 대표 센서 값은 예시 기준 이내입니다. 관찰 기간 밖의 상태는 별도 확인이 필요합니다.'
    : asset.sensor + ' ' + asset.value + ' ' + asset.unit + '로 예시 기준 ' + asset.limit + ' ' + asset.unit + ' 대비 ' + excess + '% 초과했습니다. 운전 부하와 현장 측정값을 함께 확인하세요.';
}
export default function EngineerWorkspace({ assets, issue, asset, record, save, advance, go, section, chart, period, setPeriod }) {
  const [group, setGroup] = useState('A');
  const [search, setSearch] = useState('');
  const [hover, setHover] = useState(null);
  const [sensorSelected, setSensorSelected] = useState(true);
  const [sourceOpen, setSourceOpen] = useState(false);
  const f = record.flow || {}, n = f.stage || 0, locked = n >= 4;
  const equipmentConfirmed = Boolean(f.engineerEquipmentConfirmed || n >= 1);
  const requested = section === 'engineer-rag' ? 'diagnosis' : section === 'handoff' ? 'plan' : section || 'overview';
  let view = steps.some(s => s[0] === requested) ? requested : 'overview';
  if (view === 'diagnosis' && !equipmentConfirmed) view = 'equipment';
  if (view === 'plan' && n < 3) view = equipmentConfirmed ? 'diagnosis' : 'equipment';
  const current = steps.findIndex(s => s[0] === view);
  const active = assets.filter(a => a.level !== 'Normal');
  const members = active.filter(a => a.group === group);
  const visible = members.filter(a => (a.name + ' ' + a.id + ' ' + a.sensor).toLowerCase().includes(search.toLowerCase()));
  const open = (target, id = issue.id) => go('engineer', id, target);
  const hovered = active.find(a => a.id === hover);
  const canVisit = index => index < 2 || (index === 2 ? equipmentConfirmed : n >= 3);
  const complete = index => index === 1 ? equipmentConfirmed : index === 2 ? n >= 3 : index === 3 ? locked : current > 0;
  const dotPosition = a => {
    const index = active.filter(item => item.group === a.group).findIndex(item => item.id === a.id);
    const points = [[.28,.31],[.63,.62],[.43,.78],[.79,.27],[.23,.64]];
    const point = points[index % points.length];
    const x0 = ['A','C'].includes(a.group) ? 270 : 64;
    const y0 = ['A','B'].includes(a.group) ? 30 : 168;
    return [x0 + 24 + point[0] * 150, y0 + 20 + point[1] * 88];
  };
  const chooseSensor = () => {
    if (!locked) save({ engineerEquipmentConfirmed: true, engineerSensor: asset.sensor });
    open('diagnosis');
  };
  const note = <p className="eng-footnote">가상 센서·매뉴얼·사례를 사용한 화면 예시입니다. 중요도·긴급도와 상태 기준은 현장 검증 전입니다.</p>;

  return <div className="engineer-workspace" id={view==='overview'?'overview':view==='equipment'?'equipment':undefined}>
    <nav className="eng-steps" aria-label="엔지니어 작업 단계">
      {steps.map(([id, title, desc], index) => <button key={id} type="button" disabled={!canVisit(index)}
        aria-current={view === id ? 'step' : undefined} onClick={() => open(id)}
        className={(current === index ? 'current ' : '') + (complete(index) ? 'done' : '')}>
        <span className="eng-step-num">{complete(index) && current !== index ? <Check size={15} /> : String(index + 1).padStart(2, '0')}</span>
        <span><strong>{title}</strong><small>{desc}</small></span>{index < 3 && <ChevronRight size={15} />}
      </button>)}
    </nav>

    {view === 'overview' ? <>
      <div className="eng-view-heading"><div><span className="eng-eyebrow">PRIORITY OVERVIEW</span><h2>지금, 확인이 필요한 설비</h2><p>알람의 우선순위를 살펴보고 검토할 설비를 선택하세요.</p></div><span className="eng-live"><i />센서 스냅샷 · 10.28 15:00</span></div>
      <div className="eng-stats">
        <div><span>전체 설비</span><strong>{assets.length}<small>대</small></strong></div>
        {[['urgent','긴급 확인'],['attention','주의'],['watch','관찰'],['normal','정상']].map(([key,label]) =>
          <div key={key} className={key}><span><i />{label}</span><strong>{assets.filter(a=>status(a).key===key).length}<small>대</small></strong></div>)}
      </div>
      <section className="eng-panel">
        <div className="eng-panel-heading"><div><Activity size={16} /><h2>설비 우선순위</h2></div><span>활성 알람 {active.length}건</span></div>
        <div className="eng-priority-grid">
          <div className="eng-matrix-side">
            <div className="eng-matrix-caption"><span>중요도와 긴급도로 분류</span><span>예시 기준</span></div>
            <svg className="eng-matrix" viewBox="0 0 500 355" role="group" aria-label="중요도와 긴급도에 따른 설비 분포">
              {[['B',64,30],['A',270,30],['D',64,168],['C',270,168]].map(([key,x,y]) => <g key={key} role="button" tabIndex={0}
                aria-label={key+' '+groups[key].name+' '+active.filter(a=>a.group===key).length+'건'} aria-pressed={group===key}
                onClick={()=>{setGroup(key);setSearch('');setHover(null);}}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setGroup(key);setSearch('');setHover(null);}}}>
                <rect x={x} y={y} width="202" height="134" rx="5" fill={group===key ? groups[key].color+'15' : '#15212b'} stroke={group===key?groups[key].color:'#2c3b48'} />
                <text x={x+14} y={y+24} fill={groups[key].color} className="eng-quadrant-title">{key} <tspan>{groups[key].name}</tspan></text>
                <text x={x+184} y={y+24} fill="#8298aa" textAnchor="end">{active.filter(a=>a.group===key).length}</text>
              </g>)}
              <line x1="58" y1="304" x2="478" y2="304" stroke="#486071" />
              <line x1="58" y1="304" x2="58" y2="24" stroke="#486071" />
              <text x="24" y="175" fill="#89a2b5" transform="rotate(-90 24 175)">중요도 →</text>
              <text x="269" y="338" fill="#89a2b5" textAnchor="middle">긴급도 →</text>
              <text x="63" y="322" fill="#617b90">낮음</text><text x="475" y="322" fill="#617b90" textAnchor="end">높음</text>
              <text x="40" y="43" fill="#617b90" textAnchor="end">높음</text><text x="40" y="294" fill="#617b90" textAnchor="end">낮음</text>
              {active.map(a=>{const [x,y]=dotPosition(a);return <g key={a.id} role="button" tabIndex={0} aria-label={a.name+' 설비 확인'}
                onClick={()=>open('equipment',a.issueId)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open('equipment',a.issueId);}}}
                onMouseEnter={()=>setHover(a.id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(a.id)} onBlur={()=>setHover(null)}
                opacity={hover && hover!==a.id ? .25 : 1} className="eng-point">
                <circle cx={x} cy={y} r={hover===a.id?13:10} fill="transparent" />
                {hover===a.id&&<circle cx={x} cy={y} r="12" fill={groups[a.group].color+'22'} stroke={groups[a.group].color}/>}
                <circle cx={x} cy={y} r={hover===a.id?6:4.5} fill={groups[a.group].color} stroke="#101923" strokeWidth="1.5" />
                <title>{a.name+' · '+a.sensor+' '+a.value+' '+a.unit}</title>
              </g>})}
            </svg>
            <div className="eng-hover-info" aria-live="polite">{hovered ? <><span style={{color:groups[hovered.group].color}}>●</span><strong>{hovered.name}</strong><span>{hovered.sensor} {hovered.value} {hovered.unit}</span></> : <><span>↗</span><span>설비 목록이나 점에 마우스를 올려 위치를 확인하세요.</span></>}</div>
            <p className="eng-matrix-note">점 위치는 예시 분포입니다. 실제 중요도·긴급도 산식은 멘토링 후 확정합니다.</p>
          </div>
          <div className="eng-list-side">
            <div className="eng-group-heading"><span style={{color:groups[group].color,borderColor:groups[group].color+'66'}}>{group}</span><div><h3>{groups[group].name}</h3><p>{groups[group].axes}</p></div><b>{members.length}<small>건</small></b></div>
            <div className="eng-group-tabs" aria-label="우선순위 그룹">{Object.entries(groups).map(([key,g])=><button key={key} aria-pressed={group===key} onClick={()=>{setGroup(key);setSearch('');setHover(null);}}>{key}<span>{g.name}</span></button>)}</div>
            <label className="eng-search"><Search size={14}/><input aria-label="그룹 내 설비 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="설비명, ID, 센서 검색"/></label>
            <div className="eng-asset-list">
              {visible.map(a=><button key={a.id} className={'eng-asset-row '+(hover===a.id?'highlighted':'')} onClick={()=>open('equipment',a.issueId)}
                onMouseEnter={()=>setHover(a.id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(a.id)} onBlur={()=>setHover(null)}>
                <span className="eng-machine-icon"><Activity size={17}/></span><span className="eng-asset-name"><strong>{a.name}</strong><small>{a.id} · {a.sensor} {a.value} {a.unit}</small></span><Status asset={a}/><ChevronRight size={14}/>
              </button>)}
              {!visible.length&&<div className="eng-empty"><ShieldCheck size={28}/><strong>{search?'검색 결과가 없습니다.':'현재 이 그룹의 활성 알람이 없습니다.'}</strong><p>{search?'설비명이나 센서명을 다시 확인하세요.':'다른 그룹을 선택해 설비를 확인하세요.'}</p></div>}
            </div>
            <div className="eng-list-footer"><span>{visible.length}개 표시</span><span>설비 선택 → 센서 상태 확인</span></div>
          </div>
        </div>
        {note}
      </section>
      <details className="eng-criteria"><summary>화면에 사용한 상태 분류 기준</summary><p>기존 Critical 알람은 ‘긴급 확인’, Warning 알람 중 기준 초과율 3% 이하는 ‘관찰’, 나머지는 ‘주의’, Normal은 ‘정상’으로 표시합니다. 화면 검토용 예시이며 실제 설비 안전 기준을 의미하지 않습니다.</p></details>
    </> : <>
      <div className="eng-context"><button onClick={()=>open('overview')}><ArrowLeft size={14}/>설비 현황</button><span className="eng-context-divider"/><strong>{asset.name}</strong><span>{asset.id}</span><Status asset={asset}/><small>{issue.id}</small></div>
      <div className="eng-view-heading"><div><span className="eng-eyebrow">{current===1?'EQUIPMENT REVIEW':current===2?'SENSOR ANALYSIS':'MAINTENANCE PLAN'}</span><h2>{current===1?'설비와 점검할 센서를 확인하세요':current===2?'센서의 변화에서 원인을 좁혀보세요':'정비 계획을 검토하고 전달하세요'}</h2><p>{current===1?'현재 상태와 분류 이유를 확인한 뒤 분석할 센서를 선택합니다.':current===2?'트렌드, 예상 원인, 근거 자료를 차례로 확인합니다.':'진단과 참고 사례를 바탕으로 작성한 초안입니다. 작업 범위를 직접 확인하세요.'}</p></div>{locked&&<span className="eng-saved"><CheckCircle2 size={14}/>계획서 전달 완료</span>}</div>

      {view==='equipment'&&<>
        <div className="eng-equipment-grid">
          <section className="eng-panel eng-pad"><div className="eng-panel-heading"><div><Activity size={16}/><h2>설비 정보</h2></div><Status asset={asset}/></div><div className="eng-equipment-title"><span className="eng-large-icon"><Activity size={28}/></span><div><h3>{asset.name}</h3><p>{asset.id} · 울산 CLX</p></div></div><dl className="eng-metadata"><div><dt>확인 대상</dt><dd>{issue.title}</dd></div><div><dt>우선순위</dt><dd style={{color:groups[asset.group].color}}>{asset.group} · {groups[asset.group].name}</dd></div><div><dt>발생 시각</dt><dd>{issue.openedAt}</dd></div><div><dt>진행 상태</dt><dd>{locked?'정비 부서 전달 완료':n>=3?'계획서 검토 중':n>=1?'진단 검토 중':'설비 확인 중'}</dd></div></dl></section>
          <section className="eng-panel eng-pad"><div className="eng-panel-heading"><div><ShieldCheck size={16}/><h2>이 상태로 분류한 이유</h2></div></div><div className="eng-reading"><strong>{asset.value}<small>{asset.unit}</small></strong><span>예시 기준 {asset.limit} {asset.unit}</span></div><p className="eng-copy">{reason(asset)}</p><div className="eng-info"><strong>{groups[asset.group].axes}</strong><p>공정 영향도와 대응 시점에 따른 예시 그룹입니다. 현장 운전 조건과 대응 우선순위는 담당자가 확인합니다.</p></div></section>
        </div>
        <section className="eng-panel eng-pad"><div className="eng-panel-heading"><div><h2>설비에 연결된 센서</h2></div><span>대표 센서 {1}개</span></div><div className="eng-table-wrap"><table className="eng-sensor-table"><thead><tr><th>선택</th><th>센서</th><th>현재 측정값</th><th>예시 기준</th><th>현재 상태</th></tr></thead><tbody><tr><td><input aria-label={asset.sensor+' 센서 선택'} type="checkbox" checked={sensorSelected} disabled={locked} onChange={e=>setSensorSelected(e.target.checked)}/></td><td><strong>{asset.sensor}</strong><small>{asset.id} / 대표 센서</small></td><td>{asset.value} <small>{asset.unit}</small></td><td>{asset.limit} <small>{asset.unit}</small></td><td><Status asset={asset}/></td></tr></tbody></table></div><p className="eng-subtle">현재 프로토타입의 설비별 대표 센서를 표시합니다.</p></section>
        <div className="eng-actions"><span><CheckCircle2 size={14}/>{sensorSelected?'분석할 센서 1개 선택됨':'분석할 센서를 선택하세요'}</span><button className="primary" disabled={!sensorSelected} onClick={chooseSensor}>센서 상태 확인<ArrowRight size={15}/></button></div>
      </>}

      {view==='diagnosis'&&<>
        <section className="eng-panel eng-pad" id="diagnosis"><div className="eng-panel-heading"><div><Activity size={16}/><h2>{asset.sensor} 트렌드</h2></div><div className="eng-period" aria-label="트렌드 기간">{['1시간','30분'].map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>최근 {p}</button>)}</div></div>{chart}<div className="eng-signal-insight"><Sparkles size={17}/><div><strong>{asset.value>asset.limit?'기준 초과 · 상승 추이 관찰':'예시 기준 이내'}</strong><p>{reason(asset)}</p></div><b>{((asset.value/asset.limit-1)*100).toFixed(1)}<small>% 기준 대비</small></b></div></section>
        <section className="eng-panel eng-pad"><div className="eng-panel-heading"><div><Sparkles size={16}/><h2>예상 원인과 권장 점검</h2></div><span className="eng-review-label">현장 확인 필요</span></div><div className="eng-diagnosis-grid"><div><span className="eng-eyebrow">POSSIBLE CAUSE</span><h3>{asset.cause}</h3><p className="eng-copy">단일 센서만으로 원인을 확정할 수 없습니다. 운전 조건과 현장 점검 결과를 함께 확인하세요.</p><button className="eng-source" aria-expanded={sourceOpen} onClick={()=>setSourceOpen(!sourceOpen)}><FileText size={15}/><span>예시 매뉴얼 {asset.id}<small>§4.2 · 센서 이상 점검</small></span><ChevronRight size={15}/></button>{sourceOpen&&<div className="eng-source-excerpt">{asset.sensor} 이상 시 {asset.checks.join(', ')}을 확인하고 조치 전후 동일 운전 조건에서 재측정합니다.<small>실제 매뉴얼 인용이 아닌 프로토타입 예시입니다.</small></div>}</div><div className="eng-check-list">{asset.checks.map((check,index)=><div key={check}><span>{String(index+1).padStart(2,'0')}</span><strong>{check}</strong></div>)}</div></div><div className="eng-inline-actions"><span>{n>=1?'진단 확인 완료':'트렌드와 진단 내용을 검토한 뒤 확인하세요.'}</span><button className="secondary" disabled={n!==0} onClick={()=>advance(1)}><Check size={14}/>{n>=1?'진단 확인됨':'진단 내용 확인'}</button></div></section>
        <section className="eng-panel eng-pad" id="engineer-rag"><div className="eng-panel-heading"><div><FileText size={16}/><h2>유사 사례와 근거</h2></div><button className="secondary" disabled={n!==1} onClick={()=>advance(2)}>{n>=2?'조회 완료':'유사 사례 조회'}</button></div>{n>=2?<div className="eng-case"><span>REFERENCE CASE</span><h3>{asset.sensor} 이상에 따른 점검 · {asset.group}-2025-014</h3><p>{asset.cause} 의심 상황에서 {asset.checks.join(' → ')} 순서로 확인한 예시입니다. 조치 후 같은 운전 조건에서 재측정하고 이상이 남으면 추가 진단합니다.</p><small>가상 사례 · 실제 사례 검색 연동 전</small></div>:<div className="eng-empty compact"><FileText size={24}/><p>{n===0?'진단 내용을 먼저 확인하면 참고 사례를 조회할 수 있습니다.':'유사 사례를 조회해 계획서에 참고할 점검 항목을 확인하세요.'}</p></div>}</section>
        <div className="eng-actions"><button className="secondary" onClick={()=>open('equipment')}><ArrowLeft size={14}/>설비 다시 확인</button><button className="primary" disabled={n<2} onClick={()=>n===2?advance(3):open('plan')}>{n>=3?'계획서 열기':'정비 계획서 초안 작성'}<ArrowRight size={15}/></button></div>
      </>}

      {view==='plan'&&<>
        <section className="eng-panel eng-pad" id="plan"><div className="eng-panel-heading"><div><ClipboardList size={17}/><h2>정비 계획서</h2></div><span className="eng-plan-version">v{1+(f.engineerPlanHistory?.length||0)} · {locked?'전달 완료':'작성 중 · 자동 저장'}</span></div>
          <div className="eng-plan-context"><span><strong>대상 설비</strong>{asset.name} · {asset.sensor}</span><span><strong>참고 근거</strong>예시 매뉴얼 §4.2 / 사례 {asset.group}-2025-014</span></div>
          <label className="eng-field">작업 계획 <span>필수</span><textarea aria-label="작업 계획" value={f.plan||''} readOnly={locked} onChange={e=>save({plan:e.target.value})}/></label>
          <div className="eng-plan-fields"><label className="eng-field">예상 소요시간 <span>필수</span><input aria-label="예상 소요시간" value={f.planTime||''} readOnly={locked} onChange={e=>save({planTime:e.target.value})}/></label><label className="eng-field">예상 필요 자재 <span>필수</span><input aria-label="예상 필요 자재" value={f.planParts||''} readOnly={locked} onChange={e=>save({planParts:e.target.value})}/></label></div>
          {!locked&&<div className="eng-plan-help"><Sparkles size={16}/><span>오른쪽 Copilot에서 ‘재측정 항목 추가’ 또는 ‘안전 절차 추가’를 요청하면 변경안을 검토할 수 있습니다.</span></div>}
        </section>
        {f.engineerPlanProposal&&!locked&&<section className="eng-panel eng-pad eng-proposal"><div className="eng-panel-heading"><div><Sparkles size={16}/><h2>Copilot 수정 제안</h2></div><span className="eng-review-label">아직 반영되지 않음</span></div><p className="eng-copy">요청: {f.engineerPlanProposal.request}</p><div className="eng-diff"><div><strong>현재 계획</strong><pre>{f.plan}</pre></div><div><strong>추가할 항목</strong><pre>+ {f.engineerPlanProposal.addition}</pre></div></div><div className="eng-inline-actions"><span>검토 후 적용하면 이전 계획이 보관됩니다.</span><div><button className="secondary" onClick={()=>save({engineerPlanProposal:null})}>제안 취소</button><button className="primary" onClick={()=>save({plan:(f.plan||'')+'\n'+f.engineerPlanProposal.addition,engineerPlanProposal:null,engineerPlanHistory:[...(f.engineerPlanHistory||[]),{plan:f.plan,planTime:f.planTime,planParts:f.planParts,savedAt:new Date().toISOString(),request:f.engineerPlanProposal.request}]})}>변경안 적용<Check size={14}/></button></div></div></section>}
        {Boolean(f.engineerPlanHistory?.length)&&<details className="eng-criteria"><summary>Copilot 변경 이력 · {f.engineerPlanHistory.length}건</summary>{f.engineerPlanHistory.map((item,index)=><div key={index} className="eng-history"><strong>v{index+1} · {new Date(item.savedAt).toLocaleString('ko-KR')}</strong><p>{item.request}</p><pre>{item.plan}</pre><small>예상 시간: {item.planTime} · 필요 자재: {item.planParts}</small></div>)}</details>}
        <section className="eng-handoff" id="handoff"><div><ShieldCheck size={22}/><div><h3>{locked?'정비 담당자에게 전달했습니다':'작성한 계획을 정비 담당자에게 전달합니다'}</h3><p>{locked?'전달한 계획서는 읽기 전용으로 보존됩니다.':'계획·시간·자재를 확인하세요. 전달 후에는 계획서가 읽기 전용으로 보존됩니다.'}</p></div></div><button className="primary" disabled={!locked&&(n!==3||![f.plan,f.planTime,f.planParts].every(v=>v?.trim())||Boolean(f.engineerPlanProposal))} onClick={()=>locked?go('maintenance',issue.id,'action'):advance(4)}>{locked?'전달된 계획 확인':'계획서 전달'}<ArrowRight size={15}/></button></section>
        {f.engineerPlanProposal&&!locked&&<p className="eng-subtle">전달 전에 수정 제안을 적용하거나 취소하세요.</p>}
        <button className="eng-back" onClick={()=>open('diagnosis')}><ArrowLeft size={14}/>진단 근거 다시 확인</button>
      </>}
      {note}
    </>}
  </div>;
}
