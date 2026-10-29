export function reviseReport(record,kind,patch,reason,at=new Date().toISOString()){
 const f=record.flow||{};
 if(!['edit','reject'].includes(kind)||![7,8].includes(f.stage))throw Error('제출된 미승인 보고서만 수정·반려할 수 있습니다.');
 if(!reason.trim())throw Error(kind==='reject'?'반려 사유를 입력해 주세요.':'수정 사유를 입력해 주세요.');
 const allowed=['action','actionTime','actionParts','notes','maintenanceReport','maintenanceReportBasis','maintenanceReportProposal'];
 const changes=Object.fromEntries(allowed.filter(k=>Object.hasOwn(patch,k)).map(k=>[k,patch[k]]));
 if(kind==='edit'&&!['action','actionTime','actionParts'].every(k=>(changes[k]??f[k])?.trim()))throw Error('실제 조치, 소요시간, 사용 자재를 입력해 주세요.');
 if(kind==='edit'&&Object.hasOwn(changes,'maintenanceReport')&&!changes.maintenanceReport?.trim())throw Error('보고서 본문을 입력해 주세요.');
 const {history,...snapshot}=f;
 const entry={kind,reason:reason.trim(),at,before:snapshot,inspection:record.inspection||'',changes:kind==='edit'?changes:{}};
 return {...record,reviewed:false,flow:{...f,...(kind==='edit'?changes:{}),stage:kind==='reject'?4:7,comment:'',reviewStatus:kind==='reject'?'rejected':'revised',rejectionReason:kind==='reject'?reason.trim():f.rejectionReason,history:[...(history||[]),entry]}};
}
