from __future__ import annotations
import json, re
from pathlib import Path
import fitz
from .config import DOC_NAME, DOC_NO, VERSION, PDF_PATH, INDEX_PATH, PDF_URL
HEADING_RE = re.compile(r'^(\d+(?:\.\d+){0,3})\s+(.+)$')
STRUCTURED_FAULT_ROWS = [
{'page':50,'section':'11 Faults, causes, and remedies - Table 17','fault':'Pump does not run','causes':['Power supply to pump interrupted (main machine switched off, pump power cable detached or defective, external fuse defective)','The pump is in pause time','The motor of the pump is faulty','Internal cable break'],'remedies':['Check whether one of the specified faults exists, and remedy it according to responsibility.','Faults outside one\'s own scope of responsibility must be reported to the supervisor for initiation of further measures.','Please contact Customer Service if you cannot determine or resolve the error.'],'ko_fact':'펌프가 작동하지 않을 때 가능한 원인에는 펌프 전원 중단(메인 기계 꺼짐, 전원 케이블 분리·결함, 외부 퓨즈 결함), 일시정지 시간, 모터 고장, 내부 케이블 단선이 있다. 해당 원인을 확인해 담당 범위에서 조치하고, 범위를 벗어나면 상급자에게 보고한다.'},
{'page':50,'section':'11 Faults, causes, and remedies - Table 17','fault':'Pump runs, but delivers either no lubricant at all or not enough','causes':['Jam or malfunction within the centralized lubrication system','Check valve defective','Pressure relief valve defective','Suction bore in a pump element is clogged','Pump element R is set incorrectly','Air inclusion in the lubricant / under the follower plate','Consistency of the lubricant is too high (at low temperatures)','Consistency of the lubricant is too low (at high temperatures)','Metering device within the centralized lubrication system is configured incorrectly','Lubrication time or pause time of the pump is set incorrectly'],'remedies':['Check whether one of the specified faults exists, and remedy it according to responsibility.','Faults outside one\'s own scope of responsibility must be reported to the supervisor for initiation of further measures.','Please contact Customer Service if you cannot determine or resolve the error.'],'ko_fact':'펌프는 작동하지만 윤활제가 없거나 부족하게 공급되면 중앙 윤활 시스템 막힘·오작동, 체크 밸브/압력 릴리프 밸브 결함, 펌프 요소 흡입구 막힘, 펌프 요소 R 설정 오류, 윤활제 또는 follower plate 아래 공기 혼입, 온도에 따른 윤활제 점도(일관성) 부적합, 계량장치 설정 오류, 윤활/일시정지 시간 설정 오류 등을 가능한 원인으로 확인한다.'},
{'page':51,'section':'11 Faults, causes, and remedies - Table 18','fault':'Low-level signal','causes':['Lubricant supply of the pump is exhausted','The refill interval set by the user is too long for the level of lubricant consumption'],'remedies':['Top up lubricant','Top up lubricant and shorten the refill interval'],'ko_fact':'Low-level 신호가 나타나면 윤활제를 보충한다. 사용자가 설정한 보충 주기가 윤활제 소비량에 비해 너무 길다면 윤활제를 보충하고 보충 주기를 짧게 한다.'},
{'page':51,'section':'11 Faults, causes, and remedies - Table 18','fault':'Too few cycle switch signals received','causes':['The cycle time of the pump is set too short, so the pump cannot supply the required lubricant volume in that time, resulting in too few metering device cycles and cycle switch signals','Cycle switch defective or cable damaged','The lubricant metering device with the cycle switch is too far away from the pump','Lubricant not suitable for the actual ambient temperature (consistency too high)'],'remedies':['Extend the cycle time of the pump','Replace the cycle switch','Install the metering device with cycle switch closer to the pump','Use a suitable lubricant with a lower NLGI grade, if necessary'],'ko_fact':'사이클 스위치 신호가 부족하고 펌프의 사이클 시간이 너무 짧은 것이 원인이라면, 표에 제시된 조치는 펌프의 사이클 시간을 늘리는 것이다. 다른 가능 원인으로는 사이클 스위치/케이블 결함, 계량장치 위치, 주변 온도에 맞지 않는 높은 점도의 윤활제가 있다.'},
{'page':51,'section':'11 Faults, causes, and remedies - Table 18','fault':'Too many cycle switch signals received','causes':['Cycle time of the pump too long','Motor does not switch off when the expected number of cycle switch signals is reached'],'remedies':['Shorten the cycle time of the pump','Check and replace the motor if necessary. Contact Service department'],'ko_fact':'사이클 스위치 신호가 너무 많이 수신되면 가능한 원인으로 사이클 시간이 너무 길거나, 예상 신호 수에 도달해도 모터가 꺼지지 않는 경우가 있다. 각각 사이클 시간을 줄이거나 모터를 점검·필요 시 교체한다.'},
{'page':51,'section':'11 Faults, causes, and remedies - Table 18','fault':'Low-level sensor defective','causes':['Wire breakage on the low-level sensor'],'remedies':['Replace the low-level sensor. Contact Service department'],'ko_fact':'Low-level 센서 결함에서 가능한 원인은 센서 배선 단선이며, 조치는 low-level 센서를 교체하고 서비스 부서에 문의하는 것이다.'},
{'page':52,'section':'11 Faults, causes, and remedies - Table 18','fault':'The temperature of the pump went above the maximum permissible temperature','causes':['The temperature of the pump went above the maximum permissible temperature'],'remedies':['Let the pump cool down. When the temperature falls below the shut-down temperature, the error can be acknowledged and reset. The factory setting is 70 °C.'],'ko_fact':'펌프 온도가 허용 최고 온도를 넘으면 펌프를 냉각한다. 온도가 차단 온도 아래로 내려가면 오류를 확인(acknowledge)하고 재설정할 수 있다. 공장 설정은 70 °C이다.'},
{'page':52,'section':'11 Faults, causes, and remedies - Table 18','fault':'The temperature of the pump went below the minimum permissible temperature','causes':['The temperature of the pump went below the minimum permissible temperature'],'remedies':['Let the pump warm up. The error resets itself when the temperature goes back over the shut-down temperature.'],'ko_fact':'펌프 온도가 허용 최저 온도 아래로 내려가면 펌프를 따뜻하게 한다. 온도가 차단 온도를 다시 넘으면 오류가 자동으로 재설정된다.'}
]
SPECIAL_FACTS = [
(17,'3.7.1 Exiting the screensaver','The screensaver is activated after 2 minutes without any user action on the pump.','스크린세이버는 펌프에서 사용자 조작이 2분 동안 없으면 활성화된다.'),
(17,'3.7.2 Triggering additional lubrication','Additional lubrication can only be triggered when the pump is in pause time.','추가 윤활은 펌프가 일시정지 시간(pause time) 중일 때만 실행할 수 있다.'),
(23,'3.8.1 Changing the pump password','The master password supplied together with the pump cannot be changed. Only the specific pump password can be changed.','마스터 비밀번호는 변경할 수 없고, 개별 펌프 비밀번호만 변경할 수 있다.'),
(35,'3.13 Factory settings','Resetting to the factory settings also means resetting the pump password. Make sure that you know either the pump password set at the factory or the master password.','공장 설정으로 초기화하면 펌프 비밀번호도 초기화된다. 공장 설정 펌프 비밀번호 또는 마스터 비밀번호를 알고 있어야 한다.'),
(42,'6.1 Mounting dimensions','A clearance of at least 100 mm should be provided for in every direction in addition to the specified dimensions.','정비 작업과 추가 구성품 설치를 위해 제품의 지정 치수 외에 모든 방향으로 최소 100 mm의 여유 공간을 확보해야 한다.'),
(53,'12 Repairs','At a minimum, the following safety measures must be taken before any repairs: unauthorized persons must be kept away; mark and secure the work area; depressurize the product; isolate the product, and lock and tag it out; check to ensure live voltage is no longer present; ground and short-circuit the product; cover any adjacent live parts.','수리 전 최소 안전조치는 비인가자 접근 금지, 작업구역 표시·확보, 제품 감압, 제품 격리 및 lockout/tagout, 무전압 확인, 접지·단락, 인접 충전부 덮기이다.')]

def page_link(page:int)->str: return f'{PDF_URL}#page={page}'
def normalize(text:str)->str: return re.sub(r'\s+',' ',text.replace('\u00ad','')).strip()
def detect_section(lines,current):
    for line in lines:
        m=HEADING_RE.match(line.strip())
        if m and len(line)<100: return line.strip()
    return current

def build_chunks(pdf_path:Path=PDF_PATH):
    doc=fitz.open(pdf_path); chunks=[]; current='Front matter'
    for idx,page in enumerate(doc,start=1):
        lines=[l.strip() for l in (page.get_text('text') or '').splitlines() if l.strip()]
        current=detect_section(lines,current)
        if idx in (50,51,52): continue
        body=normalize(' '.join(lines))
        if not body: continue
        start=0; part=0
        while start<len(body):
            piece=body[start:start+1100]
            chunks.append({'id':f'p{idx}-c{part}','kind':'text','document':DOC_NAME,'document_no':DOC_NO,'version':VERSION,'section':current,'page':idx,'text':piece,'ko_fact':'','pdf_link':page_link(idx)})
            if start+1100>=len(body): break
            start+=950; part+=1
    for i,(page,section,text,ko_fact) in enumerate(SPECIAL_FACTS,1):
        chunks.append({'id':f'fact-{i}','kind':'fact','document':DOC_NAME,'document_no':DOC_NO,'version':VERSION,'section':section,'page':page,'text':text,'ko_fact':ko_fact,'pdf_link':page_link(page)})
    for i,row in enumerate(STRUCTURED_FAULT_ROWS,1):
        text='Fault: '+row['fault']+'. Possible causes: '+'; '.join(row['causes'])+'. Remedies: '+'; '.join(row['remedies'])
        chunks.append({'id':f'fault-{i}','kind':'fault_row','document':DOC_NAME,'document_no':DOC_NO,'version':VERSION,'section':row['section'],'page':row['page'],'text':text,'fault':row['fault'],'causes':row['causes'],'remedies':row['remedies'],'ko_fact':row['ko_fact'],'pdf_link':page_link(row['page'])})
    return chunks

def save_index(path:Path=INDEX_PATH):
    chunks=build_chunks(); path.write_text(json.dumps(chunks,ensure_ascii=False,indent=2),encoding='utf-8'); return chunks
if __name__=='__main__': print(f'saved {len(save_index())} chunks -> {INDEX_PATH}')
