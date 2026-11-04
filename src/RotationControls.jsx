import { sensorIds, modeNames } from './useRotationReplay';
export default function RotationControls({replay,sensor,setSensor}){
 return <div className="eng-period" aria-label="시험 데이터 재생 설정"><label>시험 센서 <select aria-label="시험 센서" value={sensor} onChange={e=>setSensor(e.target.value)}>{sensorIds.map(id=><option key={id} value={id}>{id}</option>)}</select></label><label> 재생 상태 <select aria-label="재생 상태" value={replay.modes[sensor]} onChange={e=>replay.changeMode(sensor,Number(e.target.value))}>{modeNames.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label><small>별도 실험 데이터 반복 재생</small></div>;
}
