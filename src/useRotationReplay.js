import { useEffect, useMemo, useRef, useState } from 'react';

export const sensorIds = [1, 2].flatMap(g => [1, 2, 3, 4].map(s => `g${g}_sensor${s}`));
export const modeNames = ['정상', '질량 불균형', '지지 불량', '복합 고장'];
const initialSensors = () => Object.fromEntries(sensorIds.map(id => [id, {history: [], mode: 0, streak: 0, active: false, events: []}]));

export function useSensorReplay() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState('');
  const [state, setState] = useState(() => ({sensors: initialSensors(), tick: 0}));
  const [modes, setModes] = useState(() => Object.fromEntries(sensorIds.map(id => [id, 0])));
  const modesRef = useRef(modes);
  modesRef.current = modes;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}rotation/rms.json`, {signal: controller.signal}).then(r => {
      if (!r.ok) throw Error('진동 데이터를 불러오지 못했습니다.');
      return r.json();
    }).then(data => {
      if (!sensorIds.every(id => data.sensors?.[id]?.length >= 60)) throw Error('센서 데이터가 불완전합니다.');
      setDataset(data);
    }).catch(e => {if (e.name !== 'AbortError') setError(e.message);});
    return () => controller.abort();
  }, []);
  const limits = useMemo(() => Object.fromEntries(sensorIds.map(id => {
    const rows = dataset?.sensors?.[id];
    if (!rows) return [id, null];
    const values = rows.slice(0, 60).map(r => r.rms[0]);
    const mean = values.reduce((a,b) => a+b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((s,v) => s+(v-mean)**2, 0)/(values.length-1));
    return [id, mean+3*sd];
  })), [dataset]);
  useEffect(() => {
    if (!dataset) return;
    let lastTime = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now-lastTime)/1000);
      if (elapsed <= 0) return;
      lastTime += elapsed * 1000;
      // On a resumed tab, advance the replay clock but keep at most ten minutes of history.
      const steps = Math.min(elapsed, 600);
      const skip = elapsed - steps;
      const selectedModes = modesRef.current;
      setState(prev => {
        let tick = prev.tick + skip;
        let sensors = skip ? Object.fromEntries(sensorIds.map(id => [id, {...prev.sensors[id], streak: 0, active: false, history: []}])) : prev.sensors;
        for (let i=0; i<steps; i++) {
          const updated = {};
          for (const id of sensorIds) {
            const old = sensors[id], rows = dataset.sensors[id], mode = selectedModes[id];
            const row = rows[tick % rows.length], value = row.rms[mode], limit = limits[id];
            const streak = value > limit ? old.streak+1 : 0;
            const active = streak >= 3;
            const point = {value, mode, sourceSecond: row.second, at: lastTime - (steps-i-1)*1000, count: row.count, tick};
            const events = active && !old.active ? [{...point, limit}, ...old.events].slice(0,50) : old.events;
            updated[id] = {...old, mode, streak, active, events, history: [...old.history,point].slice(-60)};
          }
          sensors = updated; tick++;
        }
        return {tick, sensors};
      });
    }, 250);
    return () => clearInterval(timer);
  }, [dataset, limits]);
  const changeMode = (id, mode) => setModes(prev => ({...prev, [id]: mode}));
  return {dataset, error, sensors: state.sensors, tick: state.tick, limits, modes, changeMode};
}
