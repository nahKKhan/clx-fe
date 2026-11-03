import { useState } from 'react';
export function evidenceStats(asset){const v=asset.values;let consecutive=0;for(let i=v.length-1;i>=0&&v[i]>asset.limit;i--)consecutive++;return {first:v[0],last:v.at(-1),delta:v.at(-1)-v[0],excess:(v.at(-1)/asset.limit-1)*100,above:v.filter(x=>x>asset.limit).length,consecutive,total:v.length};}
export default function DiagnosisEvidence({asset,record,advance}){
 const [collapsed,setCollapsed]=useState(false);
 const opened=(record.flow?.stage||0)>=1&&!collapsed;
 const m=evidenceStats(asset),vibration=asset.sensor==='진동';
 const candidates=vibration?[
 ['회전체 불평형·축 정렬·체결 상태 이상','전체 진동값 상승과 양립하는 후보입니다. 현재 데이터에는 회전 주파수 성분·위상·방향별 측정이 없어 구분할 수 없습니다.','RPM과 연동한 FFT 스펙트럼, 축·반경 방향 진동, 정렬 및 체결 점검 결과'],
 ['베어링 또는 윤활 상태 이상','진동 상승만으로 베어링 마모나 윤활 부족을 우선 원인으로 확정할 수 없습니다. 베어링 형식과 윤활 정보도 미등록입니다.','베어링 온도·윤활 상태·정비 이력, 베어링 형식에 맞는 추가 진동 분석'],
 ['운전 조건 변화 또는 측정 이상','부하·회전수 변화와 센서 상태를 확인하지 않아 실제 열화와 측정 조건 차이를 분리하지 못했습니다.','동일 부하·RPM에서 재측정, 센서 부착·교정 상태, 운전 변경 이력']
 ]:asset.sensor.includes('온도')?[
 ['냉각 상태·운전 부하 변화','온도 상승은 관찰되지만 냉각 문제와 부하 변화 중 어느 쪽인지 판단할 동시 측정값이 없습니다.','냉각수 유량·입출구 온도, 운전 부하·주변 온도'],
 ['마찰·윤활 상태 또는 센서 영향','온도 상승만으로 원인을 구분할 수 없습니다. 고장 판정이 아닌 추가 점검 후보입니다.','베어링 온도 위치, 진동·윤활 기록, 센서 교정과 독립 측정값']
 ]:[
 ['부하 증가 또는 전원 상태 변화','전류 상승은 관찰되지만 상별 전류·전압과 부하가 없어 원인을 구분할 수 없습니다.','상별 전류·전압, 운전 부하와 변경 이력'],
 ['기계적 저항 또는 측정 영향','전체 전류만으로 기계 고장 또는 계측 문제를 확정할 수 없습니다.','축계 상태·진동·온도, 계측 범위·교정 및 재측정']
 ];
 return <section className="box diagnosis-evidence"><div className="section-head"><h2>예상 원인과 진단 근거</h2><span className="pill">이상 관찰 · 원인 미확정</span></div><h3>{asset.sensor} 기준 초과와 상승 확인 — 원인 판별에는 추가 데이터 필요</h3><p className="hint">현재 {m.last} {asset.unit} · 데모 기준 대비 +{m.excess.toFixed(1)}%. 상세 진단에서 관찰 근거와 추가 점검 항목을 확인하세요.</p><button className="primary" aria-expanded={opened} aria-controls="diagnosis-details" onClick={()=>{if((record.flow?.stage||0)===0){setCollapsed(false);advance(1);}else setCollapsed(!collapsed);}}>{opened?'진단 내용 접기':(record.flow?.stage||0)>=1?'진단 내용 다시 보기':'진단 내용 확인'}</button>{opened&&<div id="diagnosis-details" className="diagnosis-details"><div className="diagnosis-revealed" role="status">진단 내용을 확인했습니다 · 원인 후보와 확인할 정보를 검토해 주세요.</div><div className="evidence-metrics"><div><span>조회 시작 → 현재</span><strong>{m.first} → {m.last} {asset.unit}</strong></div><div><span>데모 기준 대비</span><strong>+{m.excess.toFixed(1)}%</strong></div><div><span>기준 초과 샘플</span><strong>{m.above}/{m.total}개</strong></div></div><p className="body-copy">최근 1시간 표시 구간에서 {asset.sensor} 값이 {m.delta.toFixed(1)} {asset.unit} 증가했습니다. 마지막 {m.consecutive}개 샘플이 연속으로 기준 {asset.limit} {asset.unit}를 초과했습니다. 이는 관찰된 이상 근거이며 특정 고장 원인의 증거는 아닙니다.</p><div className="candidate-list">{candidates.map(([name,reason,need])=><div className="candidate" key={name}><h4>{name}<span>미검증 후보</span></h4><p>{reason}</p><small><b>구분에 필요한 정보</b> · {need}</small></div>)}</div><details className="evidence-source"><summary>근거 데이터와 해석 한계</summary><p>데이터: {asset.id} · {asset.sensor}, 가상 시계열 {m.total}개, 표시 구간 2026.10.28 14:00–15:00. 초과율 = (마지막 값 ÷ 데모 기준 − 1) × 100. 샘플별 실제 수집 시각이 없어 초과 지속시간은 산정하지 않았습니다.</p><p>기준 {asset.limit} {asset.unit}는 데모 설정값입니다. 제조사 허용치나 ISO 판정 기준을 적용한 값이 아닙니다.{vibration?' 측정 대역, RMS/Peak 구분, 측정 위치도 등록되지 않았습니다.':''} 실제 설비 매뉴얼과 과거 고장 사례는 아직 연결되지 않았습니다.</p>{vibration&&<p>일반 해석 참고: 전체 진동 상승만으로 원인을 특정하지 않고 추가 측정으로 구분합니다. <a href="https://www.skf.com/binaries/pub12/Images/0901d196802179ea-JM02001_Introduction_Guide_to_Vibration_Monitoring_2017_tcm_12-312756.pdf" target="_blank" rel="noreferrer">SKF · Introduction Guide to Vibration Monitoring ↗</a> (해당 설비 진단을 입증하는 문서는 아닙니다.)</p>}</details><p className="hint">다음 단계: 하단 업무 흐름 또는 챗봇 시나리오의 ‘2. 유사 사례 검색’에서 근거를 보완하세요.</p></div>}</section>;
}
