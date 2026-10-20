import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTeacherExample } from './teacherLabs';
import { getTeacherWalkthrough } from './teacherWalkthrough';
import type { Cable, Endpoint, Topology } from './model';

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
        add(`[data-guide-dce-choice="${choice}"]`, `Chọn “${choice === 'first' ? 'This end · đầu vừa chọn' : 'Other end · đầu bên kia'}” để ${dceName} làm DCE.`, 'change', undefined, `DCE cấp nhịp cho dây ${connection}. Sau khi nối, nhập clock rate 64000 ở ${dceName}. Word liệt kê clock rate ở hai đầu; mô phỏng chỉ cấp nhịp tại đầu DCE đã chọn.`);
        result.at(-1)!.confirmedCable = cable;
        add('[data-guide-dce-ok]', 'Bấm OK xác nhận đầu DCE, rồi chọn cổng ở router còn lại.');
        result.at(-1)!.dceChoice = choice;
        result.at(-1)!.confirmedCable = cable;
      }
    }
  }
  for (const host of example.devices.filter(d => d.kind === 'pc')) {
    add(`[data-guide-device="${host.id}"]`, `Nhấp CHUỘT PHẢI vào hình ${host.name}.`, 'contextmenu');
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
  }
  const walkthrough = getTeacherWalkthrough(labId, studentNumber);
  for (const device of [...example.devices.filter(d => d.kind === 'router'), ...example.devices.filter(d => d.kind === 'pc')]) {
    const commands = walkthrough.filter(s => s.target?.deviceId === device.id && s.commandInput);
    if (!commands.length) continue;
    add(`[data-guide-device="${device.id}"]`, `Nhấp ĐÚP vào hình ${device.name} để mở console.`, 'dblclick');
    for (const step of commands) {
      const command = step.commands![0];
      add('[aria-label="RouterSim console command"]', `Bấm ô lệnh, gõ ${command} rồi nhấn Enter.`, 'submit', command, step.why);
    }
    add('[data-testid="routersim-console"] button[aria-label^="Đóng"]', `Bấm nút × để đóng console ${device.name}.`);
  }
  add('button[title="Save Network (Ctrl+S)"]', 'Bấm biểu tượng đĩa mềm đang viền vàng trên thanh công cụ để lưu sơ đồ.');
  return result;
}

export function restoreClickTutorStep(labId: string | null | undefined, studentNumber: number, topology: Topology): number {
  if (!labId) return 0;
  const steps = buildClickTutorActions(labId, studentNumber);
  const current = sessionStorage.getItem(`click-tutor-progress:v2:${labId}:${studentNumber}`);
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
  const step = steps[index];
  const live = useRef({ topology, pending, dceEnd });
  live.current = { topology, pending, dceEnd };
  useEffect(() => {
    setCanContinue(false);
    if (!step) return;
    let advanceTimer: ReturnType<typeof setTimeout> | undefined;
    let observed: HTMLElement | null = null;
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
      const valid = observed instanceof HTMLInputElement && step.event === 'input' && observed.value.trim() === step.value;
      setCanContinue(valid);
      const same = (a?: Endpoint | null, b?: Endpoint | null) => !!a && !!b && a.deviceId === b.deviceId && a.port === b.port;
      const { topology: current, pending: first } = live.current;
      const wanted = step.cable ?? step.confirmedCable;
      const linked = wanted && current.cables.some(c => ((same(c.a, wanted!.a) && same(c.b, wanted!.b)) || (same(c.b, wanted!.a) && same(c.a, wanted!.b))) && (!wanted!.dce || same(c.dce, wanted!.dce)));
      if (valid || (step.confirmedCable && linked) || (step.cable && (step.phase === 'start' ? same(first, step.cable.a) || linked : linked))) advance();
      else if (step.event === 'input' && advanceTimer) { clearTimeout(advanceTimer); advanceTimer = undefined; }
    };
    const advance = () => {
      if (advanceTimer) return;
      advanceTimer = setTimeout(() => { onStepChange(index + 1); setExpanded(false); }, step.event === 'input' ? 450 : 150);
    };
    const listener = (event: Event) => {
      if (step.cable || (step.dceChoice && live.current.dceEnd !== step.dceChoice)) return;
      const target = event.target as HTMLElement;
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element) return;
      const matched = step.event === 'submit' ? target.contains(element) : element === target || element.contains(target);
      if (!matched) return;
      if (step.value !== undefined && (step.event === 'submit' ? commandForm((element as HTMLInputElement).value) !== commandForm(step.value) : (element as HTMLInputElement).value.trim() !== step.value)) {
        if (advanceTimer) clearTimeout(advanceTimer);
        advanceTimer = undefined;
        return;
      }
      advance();
    };
    update();
    const timer = setInterval(update, 150);
    document.addEventListener(step.event ?? 'click', listener, true);
    return () => { clearInterval(timer); if (advanceTimer) clearTimeout(advanceTimer); document.removeEventListener(step.event ?? 'click', listener, true); observed?.removeAttribute('data-click-tutor-target'); };
  }, [step, index, onStepChange]);
  const width = Math.min(340, window.innerWidth - 24);
  const sideLeft = dialogRect && dialogRect.right + width + 24 < window.innerWidth ? dialogRect.right + 12 : dialogRect && dialogRect.left > width + 24 ? dialogRect.left - width - 12 : null;
  const left = sideLeft ?? (rect ? Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)) : 12);
  const top = dialogRect ? Math.max(12, Math.min(window.innerHeight - 230, sideLeft !== null ? dialogRect.top : dialogRect.bottom + 230 < window.innerHeight ? dialogRect.bottom + 12 : dialogRect.top - 230)) : rect ? (rect.bottom + 12 + 175 < window.innerHeight ? rect.bottom + 12 : Math.max(12, rect.top - 170)) : 150;
  return <>
    <style>{`[data-click-tutor-target="true"] { outline: 4px solid #facc15 !important; outline-offset: 5px; box-shadow: 0 0 0 9px #facc1533 !important; }`}</style>
    {rect && <div aria-hidden="true" className="pointer-events-none fixed z-[80] text-3xl" style={{ left: Math.max(0, rect.left - 30), top: rect.top - 10 }}>👉</div>}
    <aside data-testid="click-tutor" className="fixed z-[80] rounded-xl border-2 border-yellow-400 bg-white p-3 text-sm text-slate-950 shadow-xl" style={{ left, top, width }}>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500"><span>Thao tác {Math.min(index + 1, steps.length)}/{steps.length}</span><button onClick={onClose} aria-label="Dừng hướng dẫn chỉ tay" className="px-2 text-lg">×</button></div>
      <p className="font-bold">{step ? step.text : 'Hoàn thành! Bạn đã tự dựng và cấu hình sơ đồ.'}</p>
      {step && !rect && <p className="mt-2 text-xs text-red-700">Chưa thấy vị trí cần bấm. Hãy mở lại cửa sổ của bước này hoặc quay về bước trước.</p>}
      {step?.reason && <><button className="mt-2 text-xs text-blue-700 underline" onClick={() => setExpanded(!expanded)}>Vì sao làm bước này?</button>{expanded && <p className="mt-1 text-xs">{step.reason}</p>}</>}
      <div className="mt-2 flex items-center justify-between text-xs"><button disabled={!index} onClick={() => onStepChange(index - 1)} className="text-blue-700 disabled:opacity-30">← Bước trước</button><span>{step ? <button disabled={!canContinue} onClick={() => { onStepChange(index + 1); setExpanded(false); }} className="text-blue-700 disabled:text-slate-500">{canContinue ? 'Bước tiếp →' : 'Tự chuyển khi thao tác đúng'}</button> : <button onClick={onClose}>Kết thúc</button>}</span></div>
    </aside>
  </>;
}
