// The report source snapshot prevents stale edited reports from being submitted.
export function reportBasis(record) {
  const f=record.flow||{};
  return JSON.stringify({
    plan:f.plan||'',planTime:f.planTime||'',planParts:f.planParts||'',
    inspection:record.inspection||'',checks:[...(record.checks||[])].sort(),
    action:f.action??record.action??'',actionTime:f.actionTime||'',actionParts:f.actionParts||'',notes:f.notes||''
  });
}
export function reportIsCurrent(record) {
  const f=record.flow||{};
  return Boolean(f.maintenanceReport?.trim())&&f.maintenanceReportBasis===reportBasis(record);
}
export function buildWorkReport(asset,issue,record) {
  const f=record.flow||{},checks=record.checks||[];
  const completed=asset.checks.filter(c=>checks.includes(c));
  const pending=asset.checks.filter(c=>!checks.includes(c));
  return [
    '정비 점검 보고서 · 검토용 초안',
    '문제: '+issue.title,
    '문제 ID: '+issue.id,
    '설비: '+asset.name+' ('+asset.id+')',
    '대상 센서: '+asset.sensor+' / 관찰값 '+asset.value+' '+asset.unit,
    '',
    '1. 전달받은 점검 계획', f.plan||'미전달',
    '예상 소요시간: '+(f.planTime||'미입력'),
    '예상 필요 자재: '+(f.planParts||'미입력'),
    '',
    '2. 점검 결과',
    '완료 표시 항목: '+(completed.join(' · ')||'없음'),
    '미확인 항목: '+(pending.join(' · ')||'체크리스트상 없음'),
    '현장 점검 결과: '+(record.inspection||'미입력'),
    '',
    '3. 실제 조치',
    f.action??record.action??'미입력',
    '실제 소요시간: '+(f.actionTime||'미입력'),
    '사용 자재: '+(f.actionParts||'미입력'),
    '특이사항: '+(f.notes||'미기재'),
    '',
    '4. 근거와 추가 확인',
    '추정 원인: '+asset.cause+' · 현장 확인 필요',
    '참고: 예시 매뉴얼 '+asset.id+' §4.2 / 가상 사례 '+asset.group+'-2025-014',
    '원인 확정 여부와 조치 후 재측정 결과는 현장 확인이 필요합니다.',
    '',
    '가상 설비 데이터 기반 프로토타입입니다. 실제로 기록된 조치만 반영했습니다.'
  ].join('\n');
}
export function appliedReportProposal(record,at=new Date().toISOString()) {
  const f=record.flow||{},proposal=f.maintenanceReportProposal;
  if(f.stage!==6||!proposal||!reportIsCurrent(record))throw Error('최신 보고서 초안에서만 수정 제안을 적용할 수 있습니다.');
  return {
    maintenanceReport:f.maintenanceReport+'\n\n'+proposal.addition,
    maintenanceReportProposal:null,
    maintenanceReportHistory:[...(f.maintenanceReportHistory||[]),{text:f.maintenanceReport,at,request:proposal.request}]
  };
}
