"""Summarize each raw CSV into 1-second RMS windows for browser replay."""
import csv
import json
import math
import sys
from pathlib import Path

source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/data'
output = Path(__file__).resolve().parents[1] / 'public/rotation/rms.json'
result = {'window_seconds': 1, 'source': '회전기계 고장유형 AI 데이터셋', 'sensors': {}}
for group in (1, 2):
    for sensor in range(1, 5):
        name = f'g{group}_sensor{sensor}'
        bins = {}
        with (source / f'{name}.csv').open(newline='', encoding='utf-8-sig') as f:
            for line in csv.reader(f):
                if len(line) != 5:
                    raise ValueError(f'{name}: expected 5 columns')
                t, *values = map(float, line)
                if not all(map(math.isfinite, [t, *values])) or t < 0:
                    raise ValueError(f'{name}: invalid sample')
                window = math.floor(t)
                count, sums = bins.setdefault(window, [0, [0.0] * 4])
                bins[window][0] = count + 1
                for i, value in enumerate(values):
                    sums[i] += value * value
        windows = [{'second': second, 'count': count, 'rms': [round(math.sqrt(s / count), 6) for s in sums]} for second, (count, sums) in sorted(bins.items())]
        if [w['second'] for w in windows] != list(range(len(windows))):
            raise ValueError(f'{name}: missing time windows')
        result['sensors'][name] = windows
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Wrote {output}: {len(result["sensors"])} sensors')
