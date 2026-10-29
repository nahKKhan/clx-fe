import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronLeft, X } from 'lucide-react';
import './ChatDrawer.css';

export default function ChatDrawer({children}) {
  const [open,setOpen]=useState(false);
  const dialog=useRef(null),trigger=useRef(null),closeButton=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    closeButton.current?.focus({preventScroll:true});
    const keyboard=e=>{
      if(e.key==='Escape'){e.preventDefault();setOpen(false);return;}
      if(e.key!=='Tab')return;
      const items=Array.from(dialog.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]'));
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keyboard);
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keyboard);trigger.current?.focus({preventScroll:true});};
  },[open]);
  return <div className={'copilot-drawer '+(open?'is-open':'')}>
    <button ref={trigger} type="button" className="copilot-launcher" aria-label="Copilot 채팅 열기" aria-expanded={open} aria-controls="copilot-panel" onClick={()=>setOpen(true)} inert={open}><ChevronLeft size={14}/><Bot size={21}/><span>Copilot</span><i/></button>
    {open&&<button type="button" className="copilot-backdrop" aria-label="채팅 닫기 배경" tabIndex={-1} onClick={()=>setOpen(false)}/>}
    <div ref={dialog} id="copilot-panel" className="copilot-panel" role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label="Plant Copilot 채팅" aria-hidden={!open} inert={!open}>
      <button ref={closeButton} type="button" className="copilot-close" aria-label="Copilot 채팅 닫기" onClick={()=>setOpen(false)}><X size={19}/></button>
      {children}
    </div>
  </div>;
}
