import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { buildTeacherExample } from './teacherLabs';
import { getTeacherWalkthrough } from './teacherWalkthrough';
import { networkInfo, type Cable, type Endpoint, type Topology } from './model';

function commandForm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(ena|en)$/, 'enable').replace(/^conf t$/, 'configure terminal').replace(/^int /, 'interface ').replace(/^ip add /, 'ip address ').replace(/^no shut$/, 'no shutdown');
}

type Action = { selector: string; text: string; event?: string; value?: string; reason?: string; cable?: Cable; phase?: 'start' | 'connected'; resumeCable?: Cable; confirmedCable?: Cable; dceChoice?: 'first' | 'second' };
export function buildClickTutorActions(labId: string, studentNumber: number): Action[] {
  const example = buildTeacherExample(labId, studentNumber);
  const result: Action[] = [];
  const add = (selector: string, text: string, event = 'click', value?: string, reason?: string) => result.push({ selector, text, event, value, reason });
  for (const device of example.devices) {
    const title = device.kind === 'pc' ? 'Insert Host' : device.kind === 'router' ? 'Insert Router 2600' : 'Insert Switch 2950';
    const label = device.kind === 'pc' ? 'hình máy tính' : device.kind === 'router' ? 'biểu tượng 2600' : 'biểu tượng 2950';
    add(`button[title^="${title} ·"]`, `Bấm ${label} đang viền vàng trên thanh công cụ để thêm ${device.name}.`);
  }
  for (const cable of example.cables) {
    for (const [index, end] of [cable.a, cable.b].entries()) {
      const device = example.devices.find(d => d.id === end.deviceId)!;
      add(`[data-guide-device="${device.id}"]`, `Nhấp CHUỘT PHẢI vào hình ${device.name} để mở mặt sau.`, 'contextmenu');
      result.at(-1)!.resumeCable = cable;
      const connection = `${example.devices.find(d => d.id === cable.a.deviceId)!.name} ${cable.a.port} ↔ ${example.devices.find(d => d.id === cable.b.deviceId)!.name} ${cable.b.port}`;
      add(`[data-guide-popup="${device.id}"] [data-guide-port="${end.port}"]`, `Bấm cổng ${device.kind === 'pc' ? 'F0/0' : end.port} trên mặt sau ${device.name}${index ? ' để nối dây' : ' để chọn đầu dây'}.`, 'click', undefined, `Nối đúng hai đầu: ${connection}.`);
      Object.assign(result.at(-1)!, { cable, resumeCable: cable, phase: index ? 'connected' : 'start' });
      if (!index && cable.dce) {
        const choice = cable.dce.deviceId === end.deviceId && cable.dce.port === end.port ? 'first' : 'second';
        const dceName = `${example.devices.find(d => d.id === cable.dce!.deviceId)!.name} ${cable.dce.port}`;
        add(`[data-guide-dce-choice="${choice}"]`, `Trong hộp DCE or DTE, bấm ${choice === 'first' ? 'DCE' : 'DTE'} để ${dceName} là đầu DCE.`, 'click', undefined, `RouterSim hỏi DCE/DTE ngay sau khi chọn đầu serial thứ nhất. ${choice === 'first' ? 'Chọn DCE để cổng vừa chọn cấp nhịp.' : 'Chọn DTE để cổng phía bên kia cấp nhịp.'} Sau khi nối dây, nhập clock rate 64000 tại ${dceName}.`);
        result.at(-1)!.dceChoice = choice;
      }
    }
  }
  const hosts = example.devices.filter(d => d.kind === 'pc');
  const addHostConfiguration = (host: typeof hosts[number]) => {
    const prefix = host.ports[0].ip ? networkInfo(host.ports[0].ip, host.ports[0].mask)?.prefix : undefined;
    const addressPlan = `IP ${host.ports[0].ip || 'chưa có'}; subnet ${host.ports[0].mask || 'chưa có'}${prefix !== undefined ? ` (/${prefix})` : ''}; gateway ${host.gateway || 'để trống'}.`;
    add(`[data-guide-device="${host.id}"]`, `Nhấp CHUỘT PHẢI vào hình ${host.name}. Cấu hình máy này: ${addressPlan}`, 'contextmenu');
    add('[data-guide-config]', `Bấm chữ Configs để đặt IP cho ${host.name}.`);
    add('[data-guide-field="Host Name"] input', `Bấm ô Host Name, thay tên bằng ${host.name}.`, 'input', host.name);
    add('[data-guide-manual-ip]', 'Bấm nút tròn “Use the following IP address”.');
    for (const [label, value] of [['IP Address', host.ports[0].ip], ['Subnet', host.ports[0].mask], ['Default Gateway', host.gateway]]) {
      if (!value) continue;
      for (const [i, octet] of value.split('.').entries()) {
        add(`input[aria-label="${label} octet ${i + 1}"]`, `Bấm ô thứ ${i + 1} của ${label}, nhập ${octet}.`, 'input', octet, `${label}: ${value}`);
      }
    }
    add('[data-guide-host-ok]', `Bấm OK để lưu IP của ${host.name}.`);
  };
  const walkthrough = getTeacherWalkthrough(labId, studentNumber);
  let consoleDeviceId: string | undefined;
  const initializedConsoles = new Set<string>();
  const closeConsole = () => {
    if (consoleDeviceId) {
      add('[data-testid="routersim-console"] button[aria-label^="Đóng"]', 'Bấm nút × để đóng console trước khi chuyển router.');
      consoleDeviceId = undefined;
    }
  };
  const addConsoleSteps = (items: typeof walkthrough) => {
    for (const step of items) {
      const device = example.devices.find(item => item.id === step.target!.deviceId)!;
      if (device.id !== consoleDeviceId) {
        closeConsole();
        add(`[data-guide-device="${device.id}"]`, `Nhấp ĐÚP vào hình ${device.name} để mở console.`, 'dblclick');
        consoleDeviceId = device.id;
        if (device.kind !== 'pc' && !initializedConsoles.has(device.id)) {
          add('[aria-label="RouterSim console command"]', 'Bấm Enter khi thấy Press RETURN to get started!.', 'submit', '');
          initializedConsoles.add(device.id);
        }
      }
      const command = step.commands![0];
      add('[aria-label="RouterSim console command"]', `Bấm ô lệnh, gõ ${command} rồi nhấn Enter.`, 'submit', command, step.why);
    }
  };
  const commandSteps = walkthrough.filter(item => item.commandInput && item.target?.deviceId);
  if (['week34-two-router-guide', 'week34-three-router-guide'].includes(labId)) {
    const interfaceSteps = commandSteps.filter(step => step.title.startsWith('Cấu hình cổng ·'));
    const routingSteps = commandSteps.filter(step => step.title.startsWith('RIP ·') || /: Show ip route$/.test(step.title));
    const otherSteps = commandSteps.filter(step => !interfaceSteps.includes(step) && !routingSteps.includes(step));

    // The lab is taught left to right: configure Host 1, finish every router's
    // interfaces, configure the remaining hosts, then enter RIP and verify routes.
    if (hosts[0]) addHostConfiguration(hosts[0]);
    addConsoleSteps(interfaceSteps);
    closeConsole();
    hosts.slice(1).forEach(addHostConfiguration);
    addConsoleSteps([...otherSteps, ...routingSteps]);
  } else {
    hosts.forEach(addHostConfiguration);
    addConsoleSteps(commandSteps);
  }
  closeConsole();
  add('button[title="Save Network (Ctrl+S)"]', 'Bấm biểu tượng đĩa mềm đang viền vàng trên thanh công cụ để lưu sơ đồ.');
  return result;
}

export function restoreClickTutorStep(labId: string | null | undefined, studentNumber: number, topology: Topology): number {
  if (!labId) return 0;
  const steps = buildClickTutorActions(labId, studentNumber);
  const current = sessionStorage.getItem(`click-tutor-progress:v4:${labId}:${studentNumber}`);
  if (current === null && ['week34-two-router-guide', 'week34-three-router-guide'].includes(labId)) return 0;
  const legacy = Number(sessionStorage.getItem(`click-tutor-progress:${labId}:${studentNumber}`)) || 0;
  const oldSteps = steps.map((step, index) => ({ step, index })).filter(({ step }) => !step.selector.startsWith('[data-guide-dce-'));
  const index = current !== null ? Number(current) || 0 : oldSteps[legacy]?.index ?? steps.length;
  const cable = steps[index]?.resumeCable ?? steps[index]?.confirmedCable;
  if (cable && !topology.cables.some(c => ((c.a.deviceId === cable.a.deviceId && c.a.port === cable.a.port && c.b.deviceId === cable.b.deviceId && c.b.port === cable.b.port) || (c.b.deviceId === cable.a.deviceId && c.b.port === cable.a.port && c.a.deviceId === cable.b.deviceId && c.a.port === cable.b.port)) && (!cable.dce || (c.dce?.deviceId === cable.dce.deviceId && c.dce?.port === cable.dce.port)))) return steps.findIndex(step => step.resumeCable?.id === cable.id);
  return index;
}

export function ClickTutor({ labId, studentNumber, stepIndex, onStepChange, onClose, topology, pending, dceEnd }: { topology: Topology; pending: Endpoint | null; dceEnd: 'first' | 'second' | null; labId: string; studentNumber: number; stepIndex: number; onStepChange: (index: number) => void; onClose: () => void }) {
  const steps = useMemo(() => buildClickTutorActions(labId, studentNumber), [labId, studentNumber]);
  const index = Math.min(stepIndex, steps.length);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [dialogRect, setDialogRect] = useState<DOMRect | null>(null);
  const [tutorPosition, setTutorPosition] = useState<{ left: number; top: number } | null>(null);
  const tutorPanelRef = useRef<HTMLElement | null>(null);
  const tutorDrag = useRef<{ pointerId: number; startX: number; startY: number; left: number; top: number } | null>(null);
  const step = steps[index];
  const live = useRef({ topology, pending, dceEnd });
  live.current = { topology, pending, dceEnd };
  useEffect(() => {
    setCanContinue(false);
    if (!step) return;
    let advanceTimer: ReturnType<typeof setTimeout> | undefined;
    let observed: HTMLElement | null = null;
    const advance = () => {
      if (advanceTimer !== undefined) return;
      advanceTimer = setTimeout(() => {
        advanceTimer = undefined;
        onStepChange(index + 1);
        setExpanded(false);
      }, step.event === 'input' ? 450 : 150);
    };
    const cancelAdvance = () => {
      if (advanceTimer !== undefined) clearTimeout(advanceTimer);
      advanceTimer = undefined;
    };
    const update = () => {
      const next = document.querySelector<HTMLElement>(step.selector);
      if (next !== observed) {
        observed?.removeAttribute('data-click-tutor-target');
        observed = next;
        observed?.setAttribute('data-click-tutor-target', 'true');
        if (observed instanceof HTMLInputElement && step.event === 'input') { observed.focus(); observed.select(); }
        // The console input can be below a scrolling output log.
        if (observed && step.event === 'submit') observed.scrollIntoView({ block: 'nearest' });
      }
      setRect(observed?.getBoundingClientRect() ?? null);
      setDialogRect(observed?.closest('[data-guide-dialog], [data-host-config-dialog]')?.getBoundingClientRect() ?? null);
      const valid = (observed instanceof HTMLInputElement && step.event === 'input' && observed.value.trim() === step.value)
        || (step.dceChoice !== undefined && live.current.dceEnd === step.dceChoice);
      const same = (a?: Endpoint | null, b?: Endpoint | null) => !!a && !!b && a.deviceId === b.deviceId && a.port === b.port;
      const { topology: current, pending: first } = live.current;
      const wanted = step.cable ?? step.confirmedCable;
      const linked = wanted && current.cables.some(c => ((same(c.a, wanted!.a) && same(c.b, wanted!.b)) || (same(c.b, wanted!.a) && same(c.a, wanted!.b))) && (!wanted!.dce || same(c.dce, wanted!.dce)));
      const cableReady = !!((step.confirmedCable && linked) || (step.cable && (step.phase === 'start' ? same(first, step.cable.a) || linked : linked)));
      setCanContinue(valid || cableReady);
      if (valid || cableReady) advance();
    };
    const listener = (event: Event) => {
      if (step.cable) return;
      const target = event.target as HTMLElement;
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element) return;
      const matched = step.event === 'submit' ? target.contains(element) : element === target || element.contains(target);
      if (!matched) return;
      if (step.value !== undefined && (step.event === 'submit' ? commandForm((element as HTMLInputElement).value) !== commandForm(step.value) : (element as HTMLInputElement).value.trim() !== step.value)) {
        cancelAdvance();
        setCanContinue(false);
        return;
      }
      setCanContinue(true);
      advance();
    };
    update();
    const timer = setInterval(update, 150);
    document.addEventListener(step.event ?? 'click', listener, true);
    return () => { clearInterval(timer); cancelAdvance(); document.removeEventListener(step.event ?? 'click', listener, true); observed?.removeAttribute('data-click-tutor-target'); };
  }, [step, index, onStepChange]);
  const width = Math.min(340, window.innerWidth - 24);
  const sideLeft = dialogRect && dialogRect.right + width + 24 < window.innerWidth ? dialogRect.right + 12 : dialogRect && dialogRect.left > width + 24 ? dialogRect.left - width - 12 : null;
  const left = sideLeft ?? (rect ? Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)) : 12);
  const top = dialogRect ? Math.max(12, Math.min(window.innerHeight - 230, sideLeft !== null ? dialogRect.top : dialogRect.bottom + 230 < window.innerHeight ? dialogRect.bottom + 12 : dialogRect.top - 230)) : rect ? (rect.bottom + 12 + 175 < window.innerHeight ? rect.bottom + 12 : Math.max(12, rect.top - 170)) : 150;
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const bounds = tutorPanelRef.current?.getBoundingClientRect();
    if (!bounds) return;
    tutorDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: bounds.left, top: bounds.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = tutorDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const panelHeight = tutorPanelRef.current?.offsetHeight ?? 180;
    setTutorPosition({
      left: Math.max(12, Math.min(window.innerWidth - width - 12, drag.left + event.clientX - drag.startX)),
      top: Math.max(12, Math.min(window.innerHeight - panelHeight - 12, drag.top + event.clientY - drag.startY)),
    });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (tutorDrag.current?.pointerId !== event.pointerId) return;
    tutorDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <>
    <style>{`[data-click-tutor-target="true"] { outline: 4px solid #facc15 !important; outline-offset: 5px; box-shadow: 0 0 0 9px #facc1533 !important; }`}</style>
    {rect && <div aria-hidden="true" className="pointer-events-none fixed z-[80] text-3xl" style={{ left: Math.max(0, rect.left - 30), top: rect.top - 10 }}>👉</div>}
    <aside ref={tutorPanelRef} data-testid="click-tutor" className="fixed z-[80] rounded-xl border-2 border-yellow-400 bg-white p-3 text-sm text-slate-950 shadow-xl" style={{ left: tutorPosition?.left ?? left, top: tutorPosition?.top ?? top, width }}>
      <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} className="mb-2 flex cursor-move touch-none select-none items-center justify-between text-xs text-slate-500" aria-label="Kéo để di chuyển phần hướng dẫn"><span>Thao tác {Math.min(index + 1, steps.length)}/{steps.length}</span><button onClick={onClose} aria-label="Dừng hướng dẫn chỉ tay" className="px-2 text-lg">×</button></div>
      <p className="font-bold">{step ? step.text : 'Hoàn thành! Bạn đã tự dựng và cấu hình sơ đồ.'}</p>
      {step && !rect && <p className="mt-2 text-xs text-red-700">Chưa thấy vị trí cần bấm. Hãy mở lại cửa sổ của bước này hoặc quay về bước trước.</p>}
      {step?.reason && <><button className="mt-2 text-xs text-blue-700 underline" onClick={() => setExpanded(!expanded)}>Vì sao làm bước này?</button>{expanded && <p className="mt-1 text-xs">{step.reason}</p>}</>}
      <div className="mt-2 flex items-center justify-between text-xs"><button disabled={!index} onClick={() => onStepChange(index - 1)} className="text-blue-700 disabled:opacity-30">← Bước trước</button><span>{step ? <button disabled={!canContinue} onClick={() => { onStepChange(index + 1); setExpanded(false); }} className="text-blue-700 disabled:text-slate-500">{canContinue ? 'Bước tiếp →' : 'Tự chuyển khi thao tác đúng'}</button> : <button onClick={onClose}>Kết thúc</button>}</span></div>
    </aside>
  </>;
}
