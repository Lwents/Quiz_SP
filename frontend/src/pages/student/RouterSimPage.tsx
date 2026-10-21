import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { resolveMediaUrl } from '../../api/urls';
import {
  cableIsActive, createPreset, makeDevice, networkInfo, PRESET_LABELS, simulatePing, simulateRouterPing,
  type Device, type DeviceKind, type Endpoint, type LabPreset, type Port, type Topology,
} from '../../features/network-lab/model';
import { type ConsoleMode } from '../../features/network-lab/routerCli';
import { cdpNeighborTable, runRouterCommand, interactivePrompt, normalizeRouterCommand, type InteractiveRouterSession } from '../../features/network-lab/routerCommands';
import { routerHelp, completeRouterCommand } from '../../features/network-lab/routerHelp';
import { exportRsm } from '../../features/network-lab/exportRsm';
import { HOST_BANNER, runHostCommand } from '../../features/network-lab/hostCommands';
import { importRsm } from '../../features/network-lab/importRsm';
import { buildTeacherExample, buildTeacherTopology, TEACHER_LABS, teacherText, type TeacherLab } from '../../features/network-lab/teacherLabs';
import { getTeacherExplanation } from '../../features/network-lab/teacherExplanation';
import { getTeacherWalkthrough, type GuideTarget } from '../../features/network-lab/teacherWalkthrough';
import { ClickTutor, restoreClickTutorStep } from '../../features/network-lab/ClickTutor';
import { MarkdownAnswer } from '../../components/MarkdownAnswer';

const WIDTH = 1040;
const HEIGHT = 620;
const PRESETS = Object.keys(PRESET_LABELS) as LabPreset[];
const PICTURES: Record<DeviceKind, string> = {
  pc: '/routersim/host-transparent.png', switch: '/routersim/switch-transparent.png', router: '/routersim/router-transparent.png', netconnect: '/routersim/netconnect_up-transparent.png',
};
function pictureFor(device: Device): string {
  return device.kind === 'switch' && device.switchModel && device.switchModel !== '2950'
    ? `/routersim/switch${device.switchModel}-transparent.png` : PICTURES[device.kind];
}
const PICTURE_SIZE: Record<DeviceKind, { width: number; height: number }> = {
  pc: { width: 49, height: 36 }, switch: { width: 156, height: 22 }, router: { width: 142, height: 28 }, netconnect: { width: 47, height: 36 },
};

type Menu = 'File' | 'Edit' | 'View' | 'Insert' | 'Tools' | 'Help' | null;
type ConsoleMenu = 'File' | 'Edit' | 'View' | 'Tools' | 'Help' | null;
type Popup = { deviceId: string; x: number; y: number } | null;
type HostDraft = { manual: boolean; name: string; ip: string; mask: string; gateway: string };
type LabLibraryItem = { category: string; name: string; topology: Topology };

function loadPreset(preset: LabPreset): Topology {
  try {
    const raw = localStorage.getItem(`network-lab-v1:${preset}`);
    if (raw) {
      const value = JSON.parse(raw) as Topology;
      if (Array.isArray(value.devices) && Array.isArray(value.cables) && value.devices.every(item => Array.isArray(item.ports))) {
        // Older local saves predate DCE/clock-rate support. Preserve their
        // topology and configuration while assigning the first serial end DCE.
        for (const cable of value.cables) {
          if (cable.dce || (!cable.a.port.startsWith('S') && !cable.b.port.startsWith('S'))) continue;
          cable.dce = cable.a.port.startsWith('S') ? cable.a : cable.b;
          const device = value.devices.find(item => item.id === cable.dce?.deviceId);
          const port = device?.ports.find(item => item.name === cable.dce?.port);
          if (port?.ip && !port.clockRate) port.clockRate = 64000;
        }
        for (const device of value.devices.filter(item => item.kind === 'switch')) {
          const count = device.switchModel === '1900' ? 14 : device.switchModel === '3550' ? 10 : 12;
          for (let number = 1; number <= count; number++) {
            if (!device.ports.some(port => port.name === `P${number}`)) device.ports.push({ name: `P${number}`, ip: '', mask: '255.255.255.0', enabled: true });
          }
        }
        return value;
      }
    }
  } catch { /* Recover from an invalid local save. */ }
  return createPreset(preset);
}

type LabSnapshot = { preset: LabPreset; topology: Topology; loadedNetworkName: string | null; teacherLabId?: string | null; teacherStudentNumber?: number };

function loadNewTab(id: string | null): LabSnapshot | null {
  if (!id) return null;
  try {
    const saved = sessionStorage.getItem(`network-lab-tab:${id}`);
    if (saved) {
      const value = JSON.parse(saved);
      if (Array.isArray(value.topology?.devices) && Array.isArray(value.topology?.cables) && PRESETS.includes(value.preset)) return value;
    }
  } catch { /* Open a fresh blank network if this tab has no valid save. */ }
  return { preset: 'blank', topology: { devices: [], cables: [] }, loadedNetworkName: null };
}

function loadCurrentLab(): LabSnapshot {
  try {
    const raw = localStorage.getItem('network-lab-current');
    const saved = raw && JSON.parse(raw) as LabSnapshot;
    if (saved && PRESETS.includes(saved.preset)) return { ...saved, topology: loadPreset(saved.preset) };
  } catch { /* Fall back to the default practice network. */ }
  return { preset: 'two-routers', topology: loadPreset('two-routers'), loadedNetworkName: null };
}

function dot(device: Device, port: string, otherCenterX?: number): { x: number; y: number } {
  const index = Math.max(0, device.ports.findIndex(item => item.name === port));
  if (device.kind === 'pc' || device.kind === 'netconnect') return { x: device.x + 25, y: device.y + 42 };
  if (device.kind === 'switch') return { x: device.x + 13 + index * 11, y: device.y + 32 };
  if (otherCenterX !== undefined) {
    const rightSide = otherCenterX > device.x + PICTURE_SIZE[device.kind].width / 2;
    return { x: device.x + (rightSide ? port.startsWith('S') ? 110 : 96 : port.startsWith('S') ? 40 : 35), y: device.y + 39 };
  }
  return { x: device.x + 22 + index * 31, y: device.y + 39 };
}

function CableEndLabel({ device, port, point, other, serial, showPort, showIp }: { device: Device; port?: Port; point: { x: number; y: number }; other: { x: number; y: number }; serial: boolean; showPort: boolean; showIp: boolean }) {
  if (!port || (!showPort && !showIp)) return null;
  const dx = other.x - point.x;
  const dy = other.y - point.y;
  const length = Math.hypot(dx, dy) || 1;
  const distance = Math.min(85, length * 0.22);
  const x = point.x + dx / length * distance;
  const y = point.y + dy / length * distance;
  const color = serial ? '#ff3030' : '#f8fbff';
  const ip = port.ip && networkInfo(port.ip, port.mask);
  return <g fill={color} fontFamily="Arial, sans-serif" fontSize="11" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#000064', strokeWidth: 2 }}>
    {showPort && <text x={x} y={y - 7}>{port.name}</text>}
    {showIp && ip && device.kind !== 'pc' && <text x={x} y={y + 13}>{port.ip}/{ip.prefix}</text>}
  </g>;
}

function buttonStyle(active = false): React.CSSProperties {
  return {
    border: '1px solid transparent',
    background: active ? '#008000' : 'transparent',
    color: active ? 'white' : 'black',
  };
}

export const RouterSimPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const subjectId = params.get('subject');
  const newTabId = params.get('new');
  const [tabSnapshot] = useState(() => loadNewTab(newTabId) ?? loadCurrentLab());
  const [minimized, setMinimized] = useState(false);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [preset, setPreset] = useState<LabPreset>(tabSnapshot.preset);
  const [loadedNetworkName, setLoadedNetworkName] = useState<string | null>(tabSnapshot.loadedNetworkName);
  const [labLibrary, setLabLibrary] = useState<LabLibraryItem[]>([]);
  const [topology, setTopology] = useState<Topology>(() => tabSnapshot.topology);
  const [teacherLabId, setTeacherLabId] = useState<string | null>(tabSnapshot.teacherLabId ?? null);
  const [teacherStudentNumber, setTeacherStudentNumber] = useState(tabSnapshot.teacherStudentNumber ?? 1);
  const [draftStudentNumber, setDraftStudentNumber] = useState(tabSnapshot.teacherStudentNumber ?? 1);
  const [showTeacherLabs, setShowTeacherLabs] = useState(false);
  const [showTeacherExplanation, setShowTeacherExplanation] = useState(!!tabSnapshot.teacherLabId);
  const [clickTutorActive, setClickTutorActive] = useState(false);
  const tutorProgressKey = `click-tutor-progress:v4:${teacherLabId}:${teacherStudentNumber}`;
  const [clickTutorStep, setClickTutorStep] = useState(() => restoreClickTutorStep(tabSnapshot.teacherLabId, tabSnapshot.teacherStudentNumber ?? 1, tabSnapshot.topology));
  const [clickTutorStarted, setClickTutorStarted] = useState(() => ["click-tutor-progress:v4", "click-tutor-progress"].some(prefix => sessionStorage.getItem(`${prefix}:${tabSnapshot.teacherLabId}:${tabSnapshot.teacherStudentNumber ?? 1}`) !== null));
  useEffect(() => { if (clickTutorStarted && teacherLabId) sessionStorage.setItem(tutorProgressKey, String(clickTutorStep)); }, [clickTutorStarted, clickTutorStep, teacherLabId, tutorProgressKey]);
  const [guidedTargetId, setGuidedTargetId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [backPanels, setBackPanels] = useState<NonNullable<Popup>[]>([]);
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const [removeConnection, setRemoveConnection] = useState<Endpoint | null>(null);
  const [pending, setPending] = useState<Endpoint | null>(null);
  const [cableCursor, setCableCursor] = useState<{ x: number; y: number } | null>(null);
  const [dceEnd, setDceEnd] = useState<'first' | 'second' | null>(null);
  const [showDceDialog, setShowDceDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hostConfigId, setHostConfigId] = useState<string | null>(null);
  const [hostDraft, setHostDraft] = useState<HostDraft | null>(null);
  const [consoleId, setConsoleId] = useState<string | null>(null);
  const [consoleMenu, setConsoleMenu] = useState<ConsoleMenu>(null);
  const [consoleMinimized, setConsoleMinimized] = useState(false);
  const [consoleMaximized, setConsoleMaximized] = useState(false);
  const [consolePosition, setConsolePosition] = useState<{ x: number; y: number } | null>(null);
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>('user');
  const [consolePort, setConsolePort] = useState('F0/0');
  const consoleSessions = useRef(new Map<string, { mode: ConsoleMode; port: string; lines: string[]; history: string[]; pending?: InteractiveRouterSession['pending']; pager: string[]; started: boolean }>());
  const [consoleStarted, setConsoleStarted] = useState(false);
  const [consolePending, setConsolePending] = useState<InteractiveRouterSession['pending']>();
  const [consolePager, setConsolePager] = useState<string[]>([]);
  const [pendingPaste, setPendingPaste] = useState<string[]>([]);
  const [showSupportedCommands, setShowSupportedCommands] = useState(false);
  const [consoleToolbar, setConsoleToolbar] = useState({ file: true, edit: true, tools: true });
  const [consoleContext, setConsoleContext] = useState<{ x: number; y: number } | null>(null);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<string[]>(['', '', '', 'Press RETURN to get started!', '', '', '']);
  useEffect(() => {
    if (consoleId) consoleSessions.current.set(consoleId, { mode: consoleMode, port: consolePort, lines, history: commandHistory, pending: consolePending, pager: consolePager, started: consoleStarted });
  }, [consoleId, consoleMode, consolePort, lines, commandHistory, consolePending, consolePager, consoleStarted]);
  const [showIp, setShowIp] = useState(true);
  const [showPort, setShowPort] = useState(true);
  const [showHostnames, setShowHostnames] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [lineThickness, setLineThickness] = useState(1);
  const [canvasColor, setCanvasColor] = useState('#000064');
  const [toolbarGroups, setToolbarGroups] = useState({ file: true, insert: true, tools: true });
  const [showAssessment, setShowAssessment] = useState(false);
  const [showNetConnectManager, setShowNetConnectManager] = useState(false);
  const [autoSizeCanvas, setAutoSizeCanvas] = useState(true);
  const [showDeviceListAtStart, setShowDeviceListAtStart] = useState(() => localStorage.getItem('routersim-device-list-at-start') === 'true');
  const [showGuide, setShowGuide] = useState(false);
  const [status, setStatus] = useState('Ready. Double-click a device for its console; right-click it for ports.');
  const [ping, setPing] = useState<ReturnType<typeof simulatePing> | null>(null);
  const [pingTarget, setPingTarget] = useState('192.168.1.150');
  const [sourceId, setSourceId] = useState('pc1');
  const [showPing, setShowPing] = useState(false);
  const [showNetConfigs, setShowNetConfigs] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(() => localStorage.getItem('routersim-device-list-at-start') === 'true');
  const [showPreferences, setShowPreferences] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const consoleOutputRef = useRef<HTMLDivElement>(null);
  const consoleDragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; x: number; y: number; clientX: number; clientY: number } | null>(null);
  const undoStack = useRef<Topology[]>([topology]);
  const skipUndoRecord = useRef(false);
  const clipboardDevice = useRef<Device | null>(null);

  const selected = topology.devices.find(item => item.id === selectedId);
  const consoleDevice = topology.devices.find(item => item.id === consoleId);
  const hostConfig = topology.devices.find(item => item.id === hostConfigId && item.kind === 'pc');
  const teacherLab = TEACHER_LABS.find(item => item.id === teacherLabId);
  const occupied = useMemo(() => new Set(topology.cables.flatMap(c => [`${c.a.deviceId}:${c.a.port}`, `${c.b.deviceId}:${c.b.port}`])), [topology.cables]);
  useEffect(() => {
    if (newTabId) sessionStorage.setItem(`network-lab-tab:${newTabId}`, JSON.stringify({ preset, topology, loadedNetworkName, teacherLabId, teacherStudentNumber }));
    else {
      localStorage.setItem(`network-lab-v1:${preset}`, JSON.stringify(topology));
      localStorage.setItem('network-lab-current', JSON.stringify({ preset, loadedNetworkName, teacherLabId, teacherStudentNumber }));
    }
  }, [newTabId, preset, topology, loadedNetworkName, teacherLabId, teacherStudentNumber]);
  useEffect(() => { void fetch('/routersim/labs.json').then(response => response.json()).then((labs: LabLibraryItem[]) => setLabLibrary(labs)).catch(() => setStatus('RouterSim sample layouts could not be loaded.')); }, []);
  useEffect(() => { localStorage.setItem('routersim-device-list-at-start', String(showDeviceListAtStart)); }, [showDeviceListAtStart]);
  useEffect(() => {
    if (skipUndoRecord.current) { skipUndoRecord.current = false; return; }
    if (undoStack.current.at(-1) !== topology) undoStack.current = [...undoStack.current.slice(-29), topology];
  }, [topology]);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (!consoleId || consoleMinimized) return;
    const frame = requestAnimationFrame(() => consoleInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [consoleId, consoleMinimized]);
  useEffect(() => {
    if (consoleOutputRef.current) consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
  }, [lines, consoleId]);
  const canvasWidth = autoSizeCanvas ? Math.max(WIDTH, viewport.width) : WIDTH;
  const canvasHeight = autoSizeCanvas ? Math.max(HEIGHT, viewport.height - 96) : HEIGHT;
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => setStatus('Trình duyệt không cho mở toàn màn hình; thử nhấn F11.')); setMenu(null); };
  const exitLab = () => { if (document.fullscreenElement) void document.exitFullscreen(); navigate(subjectId ? `/courses/${subjectId}` : '/courses'); };

  const updateDevice = (id: string, transform: (item: Device) => Device) => {
    setTopology(old => ({ ...old, devices: old.devices.map(item => item.id === id ? transform(item) : item) }));
    setPing(null);
  };
  const updatePort = (id: string, name: string, change: Partial<Port>) => {
    updateDevice(id, item => ({ ...item, ports: item.ports.map(port => port.name === name ? { ...port, ...change } : port) }));
  };
  const openPreset = (next: LabPreset) => {
    setBackPanels([]);
    consoleSessions.current.clear();
    setTeacherLabId(null); setShowTeacherExplanation(false);
    setPreset(next); setLoadedNetworkName(null); setTopology(loadPreset(next)); setMenu(null); setCanvasMenu(null); setPending(null); setDceEnd(null); setShowDceDialog(false);
    setConsoleId(null); setHostConfigId(null); setSelectedId(null); setPing(null);
    setSourceId('pc1'); setPingTarget(next === 'two-routers' ? '192.168.1.150' : '');
    setStatus(`Opened ${PRESET_LABELS[next]}.`);
  };
  const openLibraryLab = (lab: LabLibraryItem) => {
    setBackPanels([]);
    consoleSessions.current.clear();
    setTeacherLabId(null); setShowTeacherExplanation(false);
    const data = structuredClone(lab.topology);
    setPreset('blank'); setLoadedNetworkName(lab.name); setTopology(data);
    setMenu(null); setCanvasMenu(null); setPending(null); setConsoleId(null); setSelectedId(null); setPing(null);
    setSourceId(data.devices.find(d => d.kind === 'pc')?.id || '');
    setPingTarget(data.devices.filter(d => d.kind === 'pc').at(-1)?.ports[0]?.ip || '');
    setStatus(`Opened RouterSim lab: ${lab.name}.`);
  };
  const openTeacherLab = (lab: TeacherLab) => {
    setBackPanels([]);
    consoleSessions.current.clear();
    setClickTutorActive(false); setClickTutorStarted(false); setClickTutorStep(0);
    const studentNumber = Math.max(1, Math.min(254, Math.trunc(draftStudentNumber) || 1));
    const data = buildTeacherTopology(lab.id, studentNumber);
    setPreset('blank'); setLoadedNetworkName(lab.title); setTopology(data);
    setTeacherLabId(lab.id); setTeacherStudentNumber(studentNumber);
    setShowTeacherLabs(false); setShowTeacherExplanation(true);
    setMenu(null); setConsoleMenu(null); setCanvasMenu(null); setPending(null); setDceEnd(null); setShowDceDialog(false);
    setConsoleId(null); setHostConfigId(null); setSelectedId(null); setPing(null);
    setSourceId(data.devices.find(device => device.kind === 'pc')?.id || '');
    setPingTarget(data.devices.filter(device => device.kind === 'pc').at(-1)?.ports[0]?.ip || '');
    setGuidedTargetId(null);
    setStatus(`Đã mở ${lab.title} trên canvas trống. Làm từng thao tác trong Hướng dẫn thực hành.`);
  };
  const addDeviceAt = (kind: DeviceKind, position?: { x: number; y: number }, switchModel: '1900' | '2950' | '3550' = '2950') => {
    const prefix = kind === 'pc' ? 'pc' : kind === 'router' ? 'r' : kind === 'netconnect' ? 'net' : 'sw';
    let num = 1;
    while (topology.devices.some(item => item.id === `${prefix}${num}`)) num++;
    const id = `${prefix}${num}`;
    const count = topology.devices.length;
    const device = makeDevice(id, kind, kind === 'pc' ? `Host ${num}` : kind === 'router' ? 'Router' : kind === 'netconnect' ? `Net Connect ${num}` : `${switchModel} Switch ${num}`, position?.x ?? 70 + (count % 4) * 225, position?.y ?? 100 + Math.floor(count / 4) * 145, switchModel);
    setTopology(old => ({ ...old, devices: [...old.devices, device] }));
    setSelectedId(id); setMenu(null); setStatus(`${device.name} inserted. Drag it to position.`);
  };
  const addDevice = (kind: DeviceKind) => addDeviceAt(kind);
  const deleteSelected = () => {
    if (!selectedId) return;
    consoleSessions.current.delete(selectedId);
    setTopology(old => ({ devices: old.devices.filter(d => d.id !== selectedId), cables: old.cables.filter(c => c.a.deviceId !== selectedId && c.b.deviceId !== selectedId) }));
    setSelectedId(null); setConsoleId(null); setPing(null);
  };
  const copySelected = () => {
    if (!selected) return;
    clipboardDevice.current = structuredClone(selected);
    setStatus(`${selected.name} copied.`);
    setMenu(null);
  };
  const cutSelected = () => {
    if (!selected) return;
    copySelected();
    deleteSelected();
  };
  const pasteDevice = () => {
    const original = clipboardDevice.current;
    if (!original) return;
    const prefix = original.kind === 'pc' ? 'pc' : original.kind === 'router' ? 'r' : original.kind === 'netconnect' ? 'net' : 'sw';
    let number = 1;
    while (topology.devices.some(device => device.id === `${prefix}${number}`)) number++;
    const copy = { ...structuredClone(original), id: `${prefix}${number}`, name: `${original.name} copy`, x: original.x + 35, y: original.y + 35 };
    setTopology(old => ({ ...old, devices: [...old.devices, copy] }));
    setSelectedId(copy.id); setMenu(null); setStatus(`${copy.name} pasted.`);
  };
  const undo = () => {
    if (undoStack.current.length < 2) return;
    undoStack.current.pop();
    skipUndoRecord.current = true;
    setTopology(undoStack.current.at(-1)!);
    setMenu(null); setStatus('Last topology change undone.');
  };
  const clearNetwork = () => {
    setBackPanels([]);
    consoleSessions.current.clear(); setConsoleId(null);
    setTeacherLabId(null); setShowTeacherExplanation(false); setLoadedNetworkName(null);
    setTopology({ devices: [], cables: [] }); setSelectedId(null); setPending(null);
    setMenu(null); setStatus('Network Visualizer cleared.');
  };
  const startPractice = () => {
    setBackPanels([]);
    consoleSessions.current.clear();
    setTopology(old => ({
      ...old,
      devices: old.devices.map(device => ({
        ...device,
        gateway: '', ripNetworks: [],
        ports: device.ports.map(port => ({ ...port, ip: '', clockRate: undefined, enabled: device.kind !== 'router' })),
      })),
    }));
    setPing(null); setConsoleId(null); setHostConfigId(null); setPending(null); setMenu(null);
    setStatus('Practice started: configure IP, gateway, router interfaces and RIP, then ping.');
  };
  const choosePort = (point: Endpoint) => {
    const key = `${point.deviceId}:${point.port}`;
    if (occupied.has(key)) { setRemoveConnection(point); return; }
    if (!pending) {
      setPending(point);
      setDceEnd(null); setShowDceDialog(point.port.startsWith('S'));
      // Close the source device window as soon as its port is picked. Otherwise
      // that window can sit over the next device the learner must open.
      setBackPanels([]);
      const source = topology.devices.find(device => device.id === point.deviceId);
      if (source) setCableCursor(dot(source, point.port));
      setStatus(`Connect ${point.port} to a port on another device.`);
    }
    else if (pending.deviceId === point.deviceId) { setPending(null); setCableCursor(null); setDceEnd(null); setStatus('Cable canceled.'); }
    else {
      const serial = pending.port.startsWith('S') || point.port.startsWith('S');
      if (pending.port.startsWith('S') !== point.port.startsWith('S')) { setStatus('Cáp serial phải nối hai cổng serial S0/x; không nối vào cổng Ethernet.'); return; }
      if (serial && dceEnd === null) { setStatus('Choose which end of the serial cable is DCE first.'); return; }
      setTopology(old => ({ ...old, cables: [...old.cables, { id: `c${Date.now()}`, a: pending, b: point, ...(serial ? { dce: dceEnd === 'second' ? point : pending } : {}) }] }));
      setPending(null); setCableCursor(null); setDceEnd(null); setBackPanels([]); setStatus(serial ? 'Serial cable connected. Set clock rate on the DCE interface.' : 'Cable connected.'); setPing(null);
    }

  };
  const disconnect = (point: Endpoint) => {
    setTopology(old => ({ ...old, cables: old.cables.filter(c => !(c.a.deviceId === point.deviceId && c.a.port === point.port) && !(c.b.deviceId === point.deviceId && c.b.port === point.port)) }));
    setPing(null); setStatus('Cable disconnected.');
  };
  const saveFile = () => {
    try {
      const blob = new Blob([exportRsm(topology, loadedNetworkName || PRESET_LABELS[preset])], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `routersim-${preset}.rsm`; anchor.click();
      URL.revokeObjectURL(url); setMenu(null); setStatus('Network saved as RouterSim RSM.');
    } catch (error) {
      setMenu(null);
      setStatus(error instanceof Error ? error.message : 'Could not save this RouterSim network.');
    }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const source = await file.text();
      const imported = file.name.toLowerCase().endsWith('.rsm') ? importRsm(source) : null;
      const data = imported?.topology || JSON.parse(source) as Topology;
      if (!Array.isArray(data.devices) || !Array.isArray(data.cables) || !data.devices.every(d => Array.isArray(d.ports) && ['pc', 'router', 'switch', 'netconnect'].includes(d.kind))) throw Error('Invalid topology');
      setBackPanels([]);
    consoleSessions.current.clear(); setConsoleId(null);
      setPreset('blank'); setLoadedNetworkName(imported?.name || file.name); setTopology(data); setStatus(`Opened ${file.name}.`); setMenu(null); setPing(null);
      setTeacherLabId(null); setShowTeacherExplanation(false);
      setSourceId(data.devices.find(d => d.kind === 'pc')?.id || '');
      setPingTarget(data.devices.filter(d => d.kind === 'pc').at(-1)?.ports[0]?.ip || '');
    } catch { setStatus('Could not open this RouterSim JSON/RSM file.'); }
  };
  const prompt = () => {
    if (!consoleDevice) return '';
    if (!consoleStarted) return '';
    if (consoleDevice.kind === 'pc') return 'C:\\>';
    return interactivePrompt(consoleDevice, { mode: consoleMode, port: consolePort, pending: consolePending });
  };
  const runCommand = (provided?: string) => {
    if (!consoleDevice) return;
    const input = (provided ?? command).trim();
    if (!consoleStarted) { setConsoleStarted(true); setCommand(''); return; }
    if (!input && !consolePending) { setLines(old => [...old, prompt()]); return; }
    setCommandHistory(old => [...old.slice(-49), input]);
    setCommandHistoryIndex(-1);
    const typed = input.toLowerCase().replace(/\s+/g, ' ');
    const cmd = consoleDevice.kind === 'router' ? normalizeRouterCommand(input) : typed;
    const output: string[] = [];
    let paginate = false;
    const runningConfig = () => [
      'Building configuration...', 'Current configuration:', '!', `hostname ${consoleDevice.name.replace(/\s/g, '')}`,
      ...consoleDevice.ports.flatMap(port => ['!', `interface ${port.name}`, ...(port.ip ? [` ip address ${port.ip} ${port.mask}`] : [' no ip address']), ...(port.clockRate ? [` clock rate ${port.clockRate}`] : []), port.enabled ? ' no shutdown' : ' shutdown']),
      ...(consoleDevice.ripNetworks.length ? ['!', 'router rip', ...consoleDevice.ripNetworks.map(net => ` network ${net}`)] : []), '!', 'end',
    ];
    const interfaces = () => consoleDevice.ports.flatMap(port => [`${port.name} is ${port.enabled ? 'up' : 'administratively down'}, line protocol is ${port.enabled && occupied.has(`${consoleDevice.id}:${port.name}`) ? 'up' : 'down'}`, `  Internet address is ${port.ip || 'unassigned'}${port.ip ? `/${networkInfo(port.ip, port.mask)?.prefix ?? ''}` : ''}`, `  MTU 1500 bytes${port.clockRate ? `, clock rate ${port.clockRate}` : ''}`]);
    if (consoleDevice.kind === 'pc') {
      const result = runHostCommand(topology, consoleDevice.id, input);
      if (result.close) { setConsoleId(null); return; }
      output.push(...result.output);
    } else if (consoleDevice.kind === 'router') {
      const native = runRouterCommand(topology, consoleDevice.id, { mode: consoleMode, port: consolePort, pending: consolePending }, input);
      if (native) {
        setConsoleMode(native.state.mode); setConsolePort(native.state.port); setConsolePending(native.state.pending);
        paginate = native.paginate;
        if (native.device !== consoleDevice) updateDevice(consoleDevice.id, () => native.device);
        output.push(...native.output);
      }
      else if (cmd === 'disable') setConsoleMode('user');
      else if (cmd === 'exit') setConsoleMode(consoleMode === 'interface' || consoleMode === 'rip' ? 'config' : 'privileged');
      else if ((cmd === 'no ip add' || cmd === 'no ip address') && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { ip: '' });
      else if (cmd === 'show ip interface brief') output.push('Interface       IP-Address      OK? Method Status                Protocol', ...consoleDevice.ports.map(p => `${p.name.padEnd(15)} ${String(p.ip || 'unassigned').padEnd(15)} YES manual ${p.enabled ? 'up'.padEnd(21) : 'administratively down'} ${p.enabled && occupied.has(`${consoleDevice.id}:${p.name}`) ? 'up' : 'down'}`));
      else if (cmd === 'show interfaces' || cmd === 'show interface') output.push(...interfaces());
      else if (/^show (interfaces?|int)\s+/.test(cmd)) { const name = cmd.split(' ').slice(2).join('').toUpperCase().replace(/^FASTETHERNET/, 'F').replace(/^FA/, 'F').replace(/^SERIAL/, 'S'); const port = consoleDevice.ports.find(p => p.name === name); if (port) output.push(`${port.name} is ${port.enabled ? 'up' : 'administratively down'}, line protocol is ${port.enabled && occupied.has(`${consoleDevice.id}:${port.name}`) ? 'up' : 'down'}`, `  Internet address is ${port.ip || 'unassigned'}`, `  MTU 1500 bytes${port.clockRate ? `, clock rate ${port.clockRate}` : ''}`); else output.push('% Invalid interface.'); }
      else if (cmd === 'show running-config' || cmd === 'show startup-config') output.push(...runningConfig());
      else if (cmd === 'show ip protocols') output.push(consoleDevice.ripNetworks.length ? 'Routing Protocol is "rip"' : 'Routing Protocol is not configured', ...consoleDevice.ripNetworks.map(net => `  Routing for Networks: ${net}`));
      else if (cmd === 'show version') output.push('RouterSim Network Visualizer · Cisco 2600 command practice', `${consoleDevice.name} uptime is simulated`, `${consoleDevice.ports.length} network interfaces`);
      else if (cmd === 'show arp') output.push('Protocol  Address          Interface', ...consoleDevice.ports.filter(p => p.ip).map(p => `Internet  ${p.ip.padEnd(16)} ${p.name}`));
      else if (cmd === 'show cdp neighbors') output.push(...cdpNeighborTable(topology, consoleDevice.id));
      else if (cmd === 'show ?') output.push('arp  cdp  interfaces  ip  running-config  startup-config  version');
      else if (cmd === 'show ip ?') output.push('interface  protocols  route');
      else if (cmd === 'interface ?' && consoleMode === 'config') output.push(consoleDevice.ports.map(p => p.name).join('  '));
      else if (cmd === 'wr' || cmd === 'write memory' || cmd === 'copy running-config startup-config') output.push('Building configuration...', '[OK]');
      else if (cmd === 'help' || cmd === '?') output.push('enable  configure terminal  interface  router rip  ping IP  show  copy  write memory  exit', 'Use show ? or show ip ? for available display commands.');
      else output.push(`${' '.repeat(prompt().length)}^`, "% Invalid input detected at '^' marker.");
    } else {
      if (cmd === 'enable' || cmd === 'ena' || cmd === 'en') setConsoleMode('privileged');
      else if (cmd === 'disable') setConsoleMode('user');
      else if (cmd === 'conf t' || cmd === 'configure terminal') { setConsoleMode('config'); output.push('Enter configuration commands, one per line.'); }
      else if (cmd === 'end') setConsoleMode('privileged');
      else if (cmd === 'exit') setConsoleMode(consoleMode === 'interface' ? 'config' : 'privileged');
      else if (/^hostname [a-z0-9_-]+$/i.test(input) && consoleMode === 'config') updateDevice(consoleDevice.id, d => ({ ...d, name: input.split(' ')[1] }));
      else if (/^(int|interface)\s+p(1[0-4]|[1-9])$/.test(cmd) && (consoleMode === 'config' || consoleMode === 'interface')) { const port = cmd.split(' ').at(-1)!.toUpperCase(); if (consoleDevice.ports.some(item => item.name === port)) { setConsolePort(port); setConsoleMode('interface'); } else output.push('% Invalid switch port.'); }
      else if ((cmd === 'no shut' || cmd === 'no shutdown') && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { enabled: true });
      else if (cmd === 'shutdown' && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { enabled: false });
      else if (cmd === 'show interfaces status' || cmd === 'show int status') output.push('Port   Status       VLAN', ...consoleDevice.ports.map(port => `${port.name.padEnd(6)} ${port.enabled ? 'connected' : 'disabled '}    1`));
      else if (cmd === 'show vlan brief') output.push('VLAN Name                             Status    Ports', `1    default                          active    ${consoleDevice.ports.filter(port => port.enabled).map(port => port.name).join(', ')}`);
      else if (cmd === 'show running-config' || cmd === 'show startup-config') output.push(...runningConfig());
      else if (cmd === 'show ip interface brief') output.push('Interface       IP-Address      Status', ...consoleDevice.ports.map(p => `${p.name.padEnd(15)} ${String(p.ip || 'unassigned').padEnd(15)} ${p.enabled ? 'up' : 'down'}`));
      else if (cmd === 'show ?') output.push('interfaces  ip  running-config  startup-config  vlan');
      else if (cmd === 'wr' || cmd === 'write memory' || cmd === 'copy running-config startup-config') output.push('Building configuration...', '[OK]');
      else if (cmd === 'help' || cmd === '?') output.push('enable, conf t, hostname NAME, int P1, shutdown, no shut, show interfaces status, show vlan brief, end, wr');
      else output.push('% Invalid input detected. Type help for supported commands.');
    }
    const page = paginate && output.length > 24 ? output.slice(0, 24) : output;
    setConsolePager(paginate && output.length > 24 ? output.slice(24) : []);
    setLines(old => [...old.slice(-2000), `${prompt()}${input}`, ...page]);
    setCommand('');
  };
  const copyConsole = () => {
    void navigator.clipboard?.writeText([...lines, consolePager.length ? '--More--' : prompt() + command].join('\n')).catch(() => setStatus('Could not copy console text.'));
    setConsoleMenu(null); setConsoleContext(null);
  };
  const pasteConsole = () => {
    void navigator.clipboard?.readText().then(text => {
      const commands = text.replace(/\r/g, '').split('\n').filter(line => line.trim());
      if (commands.length > 1) setPendingPaste(commands); else setCommand(old => old + text.trim());
    }).catch(() => setStatus('Clipboard is unavailable in this browser.'));
    setConsoleMenu(null); setConsoleContext(null);
    requestAnimationFrame(() => consoleInputRef.current?.focus());
  };
  const nextConsolePage = (singleLine = false) => {
    const count = singleLine ? 1 : 24;
    setLines(old => [...old, ...consolePager.slice(0, count)]);
    setConsolePager(old => old.slice(count));
  };
  useEffect(() => {
    if (!pendingPaste.length || consolePager.length || consolePending || !consoleId) return;
    const timer = window.setTimeout(() => { runCommand(pendingPaste[0]); setPendingPaste(old => old.slice(1)); }, 100);
    return () => window.clearTimeout(timer);
  }, [pendingPaste, consolePager, consolePending, consoleId, consoleMode, consolePort, topology]);
  const openConsole = (device: Device) => {
    const saved = consoleSessions.current.get(device.id);
    setConsoleId(device.id); setConsoleMode(saved?.mode || 'user'); setConsolePort(saved?.port || 'F0/0'); setConsolePending(saved?.pending); setConsolePager(saved?.pager || []); setConsoleStarted(saved?.started ?? device.kind === 'pc'); setPendingPaste([]); setConsoleContext(null);
    setCommandHistory(saved?.history || []);
    setLines(saved?.lines || (device.kind === 'pc' ? HOST_BANNER : ['', '', '', '', `${device.name} Con0 is now available`, '', '', '', 'Press RETURN to get started!', '', '', '']));
    setCommand(''); setCommandHistoryIndex(-1); setSelectedId(device.id); setConsoleMenu(null); setConsoleMinimized(false); setConsoleMaximized(false); setConsolePosition(showTeacherExplanation && viewport.width >= 1200 ? { x: 12, y: 215 } : null);
  };
  const startConsoleDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (consoleMaximized || (event.target as HTMLElement).closest('button')) return;
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    consoleDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const moveConsoleDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = consoleDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setConsolePosition({
      x: Math.max(0, Math.min(window.innerWidth - drag.width, drag.left + event.clientX - drag.x)),
      y: Math.max(0, Math.min(window.innerHeight - Math.min(drag.height, 80), drag.top + event.clientY - drag.y)),
    });
  };
  const stopConsoleDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (consoleDragRef.current?.pointerId !== event.pointerId) return;
    consoleDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    requestAnimationFrame(() => consoleInputRef.current?.focus());
  };

  const openHostConfig = (device: Device) => {
    setHostConfigId(device.id);
    setHostDraft({ manual: !!device.ports[0].ip, name: device.name, ip: device.ports[0].ip, mask: device.ports[0].mask, gateway: device.gateway });

  };
  const saveHostConfig = () => {
    if (!hostConfig || !hostDraft) return;
    if (hostDraft.manual && !networkInfo(hostDraft.ip, hostDraft.mask)) { setStatus('Invalid host IP address or subnet mask.'); return; }
    updateDevice(hostConfig.id, device => ({ ...device, name: hostDraft.name, gateway: hostDraft.gateway, ports: device.ports.map(port => port.name === 'Eth0' ? { ...port, ip: hostDraft.manual ? hostDraft.ip : '', mask: hostDraft.mask } : port) }));
    setHostConfigId(null); setHostDraft(null);
  };
  const openBackPanel = (device: Device) => {
    const width = device.kind === 'router' ? 497 : device.kind === 'pc' ? 355 : device.kind === 'switch' ? 430 : 208;
    const height = device.kind === 'switch' ? 100 : device.kind === 'netconnect' ? 110 : 86;
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
    const maxX = Math.max(0, canvasWidth - width), maxY = Math.max(0, canvasHeight - height);
    const wanted = { x: clamp(device.x + 25, maxX), y: clamp(device.y + 30, maxY) };
    const xs = [...new Set([wanted.x, 0, maxX])];
    const ys = [...new Set([wanted.y, clamp(device.y - height - 8, maxY), 0, maxY])];
    const area = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    const candidates = xs.flatMap(x => ys.map(y => ({ x, y, w: width, h: height })));
    const position = candidates.map(candidate => {
      const deviceOverlap = topology.devices.filter(other => other.id !== device.id).reduce((sum, other) => {
        const size = PICTURE_SIZE[other.kind];
        return sum + area(candidate, { x: other.x, y: other.y, w: size.width, h: size.height });
      }, 0);
      const panelOverlap = backPanels.filter(panel => panel.deviceId !== device.id).reduce((sum, panel) => {
        const other = topology.devices.find(item => item.id === panel.deviceId);
        if (!other) return sum;
        const otherWidth = other.kind === 'router' ? 497 : other.kind === 'pc' ? 355 : other.kind === 'switch' ? 430 : 208;
        const otherHeight = other.kind === 'switch' ? 100 : other.kind === 'netconnect' ? 110 : 86;
        return sum + area(candidate, { x: panel.x, y: panel.y, w: otherWidth, h: otherHeight });
      }, 0);
      return { candidate, score: deviceOverlap * 10 + panelOverlap * 4 + Math.abs(candidate.x - wanted.x) + Math.abs(candidate.y - wanted.y) };
    }).sort((a, b) => a.score - b.score)[0].candidate;
    // RouterSim shows one active device back panel. Keeping the old panel open
    // leaves it covering the next device, especially during the guided lab.
    setBackPanels([{ deviceId: device.id, x: position.x, y: position.y }]);
  };
  const locateGuideTarget = (target: GuideTarget) => {
    if (target.kind === 'devices') { setShowDeviceList(true); return; }
    const device = topology.devices.find(item => item.id === target.deviceId);
    if (!device) {
      setShowDeviceList(true);
      setStatus('Chưa có thiết bị này. Hãy thêm Host/Router theo bước đầu của hướng dẫn.');
      return;
    }
    setSelectedId(device.id); setGuidedTargetId(device.id);
    if (target.kind === 'host') openHostConfig(device);
    else if (target.kind === 'console') {
      if (consoleId !== device.id) openConsole(device);
      else { setConsoleMinimized(false); requestAnimationFrame(() => consoleInputRef.current?.focus()); }
    } else openBackPanel(device);
  };
  const runPing = () => { setPing(simulatePing(topology, sourceId, pingTarget.trim())); };
  const newNetwork = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('new', crypto.randomUUID());
    const tab = window.open(url.toString(), '_blank');
    if (tab) tab.opener = null;
    else setStatus('Trình duyệt đã chặn tab mới. Hãy cho phép mở tab từ trang này.');
    setMenu(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(null); setConsoleMenu(null); setCanvasMenu(null); setPending(null);
        setShowGuide(false); setShowPreferences(false); setShowDeviceList(false); setShowTeacherLabs(false); setShowTeacherExplanation(false);
        setShowNetConfigs(false); setShowPing(false); setShowAssessment(false); setShowNetConnectManager(false); setHostConfigId(null);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]') || consoleId || hostConfigId) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey && !event.altKey && !event.metaKey) {
        const actions: Record<string, () => void> = {
          n: newNetwork, o: () => fileRef.current?.click(), s: saveFile,
          p: () => window.print(), d: () => setShowDeviceList(true),
          a: () => setShowAssessment(true), m: () => setShowNetConnectManager(true),
          f: () => setShowNetConfigs(true), t: () => setShowPing(true),
          z: undo, x: cutSelected, c: copySelected, v: pasteDevice,
        };
        if (actions[key]) { event.preventDefault(); actions[key](); }
      } else if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const insertActions: Record<string, () => void> = {
          f: () => fileRef.current?.click(),
          h: () => addDevice('pc'), n: () => addDevice('netconnect'), r: () => addDevice('router'),
          s: () => addDeviceAt('switch', undefined, '1900'),
          t: () => addDeviceAt('switch', undefined, '2950'),
          u: () => addDeviceAt('switch', undefined, '3550'),
        };
        if (insertActions[key]) { event.preventDefault(); insertActions[key](); }
      } else if (event.key === 'Delete') { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return <div className="h-screen overflow-hidden bg-[#000064] text-slate-900" style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}>
    {minimized ? <div className="flex h-screen items-end bg-[#e9edf4]"><button onClick={() => setMinimized(false)} className="m-3 flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-white"><img src="/logo.svg" alt="Lwent Pro" className="h-7 w-7" />Lwent Pro · RouterSim Network Visualizer</button></div> : <div className="flex h-screen flex-col overflow-hidden border border-[#b9bec7]">
      <div className="flex h-8 shrink-0 items-center border-b border-[#bcbcbc] bg-[#eef3f9] pl-2 text-[14px] text-black">
        <img src="/routersim/app.ico" alt="" className="mr-2 h-4 w-4" />
        <span className="min-w-0 flex-1 truncate">RouterSim Network Visualizer - {loadedNetworkName || PRESET_LABELS[preset]}</span>
        <NativeWindowButtons title="RouterSim" onMinimize={() => setMinimized(true)} onMaximize={toggleFullscreen} onClose={exitLab} />
      </div>
      <div className="relative flex h-7 items-center gap-1 border-b border-slate-400 bg-white px-1 text-[14px]">
        {(['File', 'Edit', 'View', 'Insert', 'Tools', 'Help'] as const).map(name => <button data-guide-menu={name} key={name} onClick={() => setMenu(menu === name ? null : name)} className="px-2 py-0.5 hover:bg-blue-100" style={buttonStyle(menu === name)}>{name}</button>)}
        {menu && <div className="absolute left-1 top-7 z-40 min-w-52 border border-slate-600 bg-[#f0f0f0] p-1 shadow-lg" style={{ marginLeft: `${(['File', 'Edit', 'View', 'Insert', 'Tools', 'Help'] as const).indexOf(menu) * 37}px` }}>
          {menu === 'File' && <><MenuItem label="New..." shortcut="Ctrl+N" onClick={newNetwork} /><MenuItem label="Open..." shortcut="Ctrl+O" onClick={() => { fileRef.current?.click(); setMenu(null); }} /><MenuItem label="Save..." shortcut="Ctrl+S" onClick={saveFile} /><MenuItem label="Print..." shortcut="Ctrl+P" onClick={() => { setMenu(null); window.print(); }} /><div className="my-1 border-t" /><MenuItem label="Close" onClick={exitLab} /></>}
          {menu === 'Edit' && <><MenuItem label="Clear" onClick={clearNetwork} /><MenuItem label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={undoStack.current.length < 2} /><div className="my-1 border-t" /><MenuItem label="Cut" shortcut="Ctrl+X" onClick={cutSelected} disabled={!selected} /><MenuItem label="Copy" shortcut="Ctrl+C" onClick={copySelected} disabled={!selected} /><MenuItem label="Paste" shortcut="Ctrl+V" onClick={pasteDevice} disabled={!clipboardDevice.current} /><MenuItem label="Delete" shortcut="Del" onClick={deleteSelected} disabled={!selected} /></>}
          {menu === 'View' && <><LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} onTeacher={openTeacherLab} /><MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { openConsole(d); setMenu(null); }} />)}</MenuSubmenu><MenuSubmenu label="Toolbars"><MenuItem label={`${toolbarGroups.file ? '✓ ' : ''}File buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, file: !old.file })); setMenu(null); }} /><MenuItem label={`${toolbarGroups.insert ? '✓ ' : ''}Insert buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, insert: !old.insert })); setMenu(null); }} /><MenuItem label={`${toolbarGroups.tools ? '✓ ' : ''}Tools buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, tools: !old.tools })); setMenu(null); }} /></MenuSubmenu><div className="my-1 border-t" /><MenuItem label={`${showIp ? '✓ ' : ''}IP Addresses`} onClick={() => { setShowIp(!showIp); setMenu(null); }} /><MenuItem label={`${showPort ? '✓ ' : ''}Port Numbers`} onClick={() => { setShowPort(!showPort); setMenu(null); }} /><MenuItem label={`${showHostnames ? '✓ ' : ''}Hostnames`} onClick={() => { setShowHostnames(!showHostnames); setMenu(null); }} /><MenuItem label={`${showTooltips ? '✓ ' : ''}Tooltips`} onClick={() => { setShowTooltips(!showTooltips); setMenu(null); }} /><MenuSubmenu label="Line Thickness">{[1, 2, 3].map(size => <MenuItem key={size} label={`${lineThickness === size ? '✓ ' : ''}${size === 1 ? 'Thin' : size === 2 ? 'Medium' : 'Thick'}`} onClick={() => { setLineThickness(size); setMenu(null); }} />)}</MenuSubmenu></>}
          {menu === 'Insert' && <><MenuItem label="File..." shortcut="Alt+F" onClick={() => { fileRef.current?.click(); setMenu(null); }} /><MenuItem label="Host" shortcut="Alt+H" onClick={() => addDevice('pc')} /><MenuItem label="Net Connect" shortcut="Alt+N" onClick={() => addDevice('netconnect')} /><MenuItem label="Router 2600" shortcut="Alt+R" onClick={() => addDevice('router')} /><MenuItem label="Switch 1900" shortcut="Alt+S" onClick={() => addDeviceAt('switch', undefined, '1900')} /><MenuItem label="Switch 2950" shortcut="Alt+T" onClick={() => addDeviceAt('switch', undefined, '2950')} /><MenuItem label="Switch 3550" shortcut="Alt+U" onClick={() => addDeviceAt('switch', undefined, '3550')} /></>}
          {menu === 'Tools' && <><MenuItem label="Device List" shortcut="Ctrl+D" onClick={() => { setShowDeviceList(true); setMenu(null); }} /><MenuItem label="Net Assessment" shortcut="Ctrl+A" onClick={() => { setShowAssessment(true); setMenu(null); }} /><MenuItem label="Net Configs" shortcut="Ctrl+F" onClick={() => { setShowNetConfigs(true); setMenu(null); }} /><MenuItem label="Net Connect Manager" shortcut="Ctrl+M" onClick={() => { setShowNetConnectManager(true); setMenu(null); }} /><MenuItem label="Net Packet Monitor" shortcut="Ctrl+T" onClick={() => { setShowPing(true); setMenu(null); }} /><div className="my-1 border-t" /><MenuItem label="Preferences" onClick={() => { setShowPreferences(true); setMenu(null); }} /><MenuItem label="Clear Configuration (Start Lab)" onClick={startPractice} /><MenuItem label="Reset selected lab" onClick={() => { consoleSessions.current.clear(); setConsoleId(null); localStorage.removeItem(`network-lab-v1:${preset}`); setTopology(teacherLab ? buildTeacherTopology(teacherLab.id, teacherStudentNumber) : createPreset(preset)); setMenu(null); setPing(null); }} /></>}
          {menu === 'Help' && <><MenuItem label="Hướng dẫn thực hành bài đang chọn" disabled={!teacherLab} onClick={() => { setShowTeacherExplanation(true); setMenu(null); }} /><MenuItem label="How to use RouterSim" onClick={() => { setShowGuide(true); setMenu(null); }} /><MenuItem label="RouterSim manual (PDF)" onClick={() => { window.open(resolveMediaUrl('/media/course-slides/comp303_routersim_manual.pdf'), '_blank'); setMenu(null); }} /></>}
        </div>}
      </div>
      <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-400 bg-[#f3f3f3] px-1">
        {toolbarGroups.file && <><ToolButton title="New Network (Ctrl+N)" onClick={newNetwork}><img src="/routersim/newnetvis_up-transparent.png" alt="New" /></ToolButton><ToolButton title="Open saved network (Ctrl+O)" onClick={() => fileRef.current?.click()}><img src="/routersim/folder_up-transparent.png" alt="Open" /></ToolButton><ToolButton title="Save Network (Ctrl+S)" onClick={saveFile}><img src="/routersim/diskette_up-transparent.png" alt="Save" /></ToolButton><ToolButton title="Print Network (Ctrl+P)" onClick={() => window.print()}><img src="/routersim/printer_up-transparent.png" alt="Print" /></ToolButton><ToolButton title="Delete selected (Del)" onClick={deleteSelected}><img src="/routersim/trash_up-transparent.png" alt="Delete" /></ToolButton></>}
        {toolbarGroups.insert && <><ToolButton title="Insert from file" onClick={() => fileRef.current?.click()}><img src="/routersim/insert_up-transparent.png" alt="Insert file" /></ToolButton>
        <ToolButton title="Insert Host · click or drag onto canvas" onClick={() => addDevice('pc')} deviceKind="pc"><img src="/routersim/smallhost_up-transparent.png" alt="Host" /></ToolButton>
        <ToolButton title="Insert Net Connect · click or drag onto canvas" onClick={() => addDevice('netconnect')} deviceKind="netconnect"><img src="/routersim/netconnect_up-transparent.png" alt="Net Connect" /></ToolButton>
        <ToolButton title="Insert Router 2600 · click or drag onto canvas" onClick={() => addDevice('router')} deviceKind="router"><img src="/routersim/2600device_up-transparent.png" alt="2600" /></ToolButton>
        <ToolButton title="Insert Switch 1900 · click or drag onto canvas" onClick={() => addDeviceAt('switch', undefined, '1900')} deviceKind="switch" switchModel="1900"><img src="/routersim/1900device_up-transparent.png" alt="1900" /></ToolButton>
        <ToolButton title="Insert Switch 2950 · click or drag onto canvas" onClick={() => addDevice('switch')} deviceKind="switch"><img src="/routersim/2950device_up-transparent.png" alt="2950" /></ToolButton>
        <ToolButton title="Insert Switch 3550 · click or drag onto canvas" onClick={() => addDeviceAt('switch', undefined, '3550')} deviceKind="switch" switchModel="3550"><img src="/routersim/3550device_up-transparent.png" alt="3550" /></ToolButton></>}
        {toolbarGroups.tools && <><ToolButton title="Net Assessment (Ctrl+A)" onClick={() => setShowAssessment(true)}><img src="/routersim/assessment_up-transparent.png" alt="Net Assessment" /></ToolButton><ToolButton title="Net Configs (Ctrl+F)" onClick={() => setShowNetConfigs(true)}><img src="/routersim/netconfig_up-transparent.png" alt="Net Configs" /></ToolButton><ToolButton title="Net Packet Monitor (Ctrl+T)" onClick={() => setShowPing(true)}><img src="/routersim/netpacket_up-transparent.png" alt="Net Packet Monitor" /></ToolButton></>}
        <button type="button" onClick={() => { setDraftStudentNumber(teacherStudentNumber); setShowTeacherLabs(true); }} className="ml-auto shrink-0 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50">Bài tập của thầy</button>
        {teacherLab && clickTutorStarted && !clickTutorActive && <button type="button" onClick={() => { setShowTeacherExplanation(false); setClickTutorActive(true); }} className="shrink-0 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">▶ Tiếp tục hướng dẫn</button>}
        {teacherLab && <button type="button" onClick={() => setShowTeacherExplanation(true)} className="shrink-0 rounded-md border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-50">Hướng dẫn thực hành</button>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" style={{ backgroundColor: canvasColor }}>
        <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: canvasHeight, backgroundColor: canvasColor }} onPointerMove={e => { if (!pending) return; const rect = e.currentTarget.getBoundingClientRect(); setCableCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top }); }} onClick={() => { setMenu(null); setCanvasMenu(null); }} onContextMenu={e => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setCanvasMenu({ x: Math.min(canvasWidth - 190, e.clientX - rect.left), y: Math.min(canvasHeight - 360, e.clientY - rect.top) }); }} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-routersim-device')) e.preventDefault(); }} onDrop={e => { const kind = e.dataTransfer.getData('application/x-routersim-device'); if (!['pc', 'router', 'switch', 'netconnect'].includes(kind)) return; e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const model = e.dataTransfer.getData('application/x-routersim-model'); addDeviceAt(kind as DeviceKind, { x: Math.max(2, Math.min(canvasWidth - PICTURE_SIZE[kind as DeviceKind].width, e.clientX - rect.left - 25)), y: Math.max(2, Math.min(canvasHeight - 55, e.clientY - rect.top - 20)) }, model === '1900' || model === '3550' ? model : '2950'); }}>
          <svg className="pointer-events-none absolute inset-0" width={canvasWidth} height={canvasHeight}>
            <defs><marker id="routersim-cable-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M 0 0 L 9 4.5 L 0 9 z" fill="#ff3030" /></marker></defs>
            {topology.cables.map(link => {
              const a = topology.devices.find(d => d.id === link.a.deviceId); const b = topology.devices.find(d => d.id === link.b.deviceId);
              if (!a || !b) return null;
              const one = dot(a, link.a.port, b.x + PICTURE_SIZE[b.kind].width / 2); const two = dot(b, link.b.port, a.x + PICTURE_SIZE[a.kind].width / 2);
              const serial = link.a.port.startsWith('S') || link.b.port.startsWith('S');
              const firstPort = a.ports.find(port => port.name === link.a.port);
              const secondPort = b.ports.find(port => port.name === link.b.port);
              const middle = { x: (one.x + two.x) / 2, y: (one.y + two.y) / 2 };
              const serialPath = `M ${one.x} ${one.y} L ${middle.x - 28} ${middle.y} L ${middle.x + 10} ${middle.y - 11} L ${middle.x - 8} ${middle.y + 9} L ${middle.x + 28} ${middle.y} L ${two.x} ${two.y}`;
              return <g key={link.id}>{serial ? <path d={serialPath} fill="none" stroke="#f32525" strokeWidth={lineThickness} strokeDasharray={!cableIsActive(topology, link) ? '6 3' : undefined} /> : <line x1={one.x} y1={one.y} x2={two.x} y2={two.y} stroke="#f0f0f0" strokeWidth={lineThickness} />}<circle cx={one.x} cy={one.y} r="2" fill="white" /><circle cx={two.x} cy={two.y} r="2" fill="white" /><CableEndLabel device={a} port={firstPort} point={one} other={two} serial={serial} showPort={showPort} showIp={showIp} /><CableEndLabel device={b} port={secondPort} point={two} other={one} serial={serial} showPort={showPort} showIp={showIp} /></g>;
            })}
            {pending && cableCursor && (() => {
              const source = topology.devices.find(device => device.id === pending.deviceId);
              if (!source) return null;
              const start = dot(source, pending.port, cableCursor.x);
              return <line data-testid="pending-cable" x1={start.x} y1={start.y} x2={cableCursor.x} y2={cableCursor.y} stroke="#ff3030" strokeWidth="2" markerEnd="url(#routersim-cable-arrow)" />;
            })()}
          </svg>
          {topology.devices.map(device => <div key={device.id} data-guide-device={device.id} title={showTooltips ? `${device.name} · ${pending ? 'click for connection ports' : 'right-click for ports, double-click for console'}` : undefined} className={`absolute select-none text-center text-white ${guidedTargetId === device.id ? 'rounded ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#000064]' : ''}`} style={{ left: device.x, top: device.y, width: PICTURE_SIZE[device.kind].width, touchAction: 'none', cursor: pending ? 'crosshair' : 'move' }}
            onPointerDown={event => { if (event.button !== 0 || pending) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: device.id, x: device.x, y: device.y, clientX: event.clientX, clientY: event.clientY }; setSelectedId(device.id); }}
            onPointerMove={event => { const drag = dragRef.current; if (!drag || drag.id !== device.id) return; updateDevice(device.id, d => ({ ...d, x: Math.max(3, Math.min(canvasWidth - PICTURE_SIZE[d.kind].width - 4, drag.x + event.clientX - drag.clientX)), y: Math.max(3, Math.min(canvasHeight - 60, drag.y + event.clientY - drag.clientY)) })); }}
            onPointerUp={() => { dragRef.current = null; }}
            onClick={event => { if (!pending) return; event.stopPropagation(); if (device.id === pending.deviceId) return; if (device.kind === 'pc' && !occupied.has(`${device.id}:Eth0`)) choosePort({ deviceId: device.id, port: 'Eth0' }); else openBackPanel(device); }}
            onDoubleClick={event => { event.stopPropagation(); if (device.kind === 'netconnect') setShowNetConnectManager(true); else openConsole(device); }}
            onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setSelectedId(device.id); setCanvasMenu(null); openBackPanel(device); }}>
            {guidedTargetId === device.id && <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-yellow-300 px-2 py-1 text-xs font-bold text-black">👇 Thao tác ở đây</div>}
            {showHostnames && <div className="mb-1 truncate text-[11px]" style={{ textShadow: '1px 1px black' }}>{device.name}</div>}
            <img src={pictureFor(device)} alt={device.kind} width={PICTURE_SIZE[device.kind].width} height={PICTURE_SIZE[device.kind].height} className={`mx-auto block ${selectedId === device.id ? 'outline outline-1 outline-dotted outline-white' : ''}`} draggable={false} style={{ imageRendering: 'pixelated' }} />
            {showIp && device.kind === 'pc' && device.ports[0]?.ip && <div className={`absolute top-[18px] whitespace-nowrap font-mono text-[11px] font-bold text-[#00fb20] ${device.x > 105 ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]'}`}>{device.ports[0].ip}/{networkInfo(device.ports[0].ip, device.ports[0].mask)?.prefix}</div>}
          </div>)}
          {backPanels.map(popup => { const popupDevice = topology.devices.find(item => item.id === popup.deviceId); if (!popupDevice) return null; return <div key={popup.deviceId} data-guide-popup={popupDevice.id} className="absolute z-20 text-xs text-black shadow-xl" style={{ left: popup.x, top: popup.y }} onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
            {popupDevice.kind === 'router' ? <div className="relative h-[86px] w-[497px]" style={{ backgroundImage: 'url(/routersim/router-back.png)', imageRendering: 'pixelated' }}>
              {([
                ['S0/1', 77, 7, 98, 28], ['S0/0', 209, 7, 91, 28],
                ['F0/1', 103, 41, 68, 29], ['F0/0', 182, 41, 68, 29],
              ] as const).map(([name, x, y, w, h]) => {
                const cable = topology.cables.find(link => (link.a.deviceId === popupDevice.id && link.a.port === name) || (link.b.deviceId === popupDevice.id && link.b.port === name));
                const peer = cable && (cable.a.deviceId === popupDevice.id && cable.a.port === name ? cable.b : cable.a);
                const peerDevice = topology.devices.find(device => device.id === peer?.deviceId);
                const connectedTo = peer && peerDevice ? `${peerDevice.name} · ${peer.port}` : undefined;
                return <PortHotspot key={name} name={name} x={x} y={y} w={w} h={h} connectedTo={connectedTo} onChoose={() => choosePort({ deviceId: popupDevice.id, port: name })} onDisconnect={() => disconnect({ deviceId: popupDevice.id, port: name })} onInspect={() => setRemoveConnection({ deviceId: popupDevice.id, port: name })} />;
              })}
              <button className="absolute bottom-2 left-3 h-5 w-11" title="Close" onClick={() => { setBackPanels(old => old.filter(panel => panel.deviceId !== popup.deviceId)); }} />

            </div> : popupDevice.kind === 'pc' ? <div className="relative h-[86px] w-[355px] border-[3px] border-[#2189d8] bg-gradient-to-r from-[#78b8e2] to-[#a8d7f7] font-[Tahoma] shadow-inner">
              <strong className="absolute left-3 top-2 text-lg text-white">Host</strong>
              <span className="absolute top-2 -translate-x-1/2 text-sm font-bold" style={{ left: 'calc(50% + 5px)' }}>F0/0</span>
              <button data-guide-port="Eth0" title={occupied.has(`${popupDevice.id}:Eth0`) ? 'F0/0 · connected · click to disconnect' : 'F0/0 · click to connect'} aria-label={occupied.has(`${popupDevice.id}:Eth0`) ? 'F0/0 · disconnect cable' : 'F0/0 · connect cable'} onClick={() => occupied.has(`${popupDevice.id}:Eth0`) ? setRemoveConnection({ deviceId: popupDevice.id, port: 'Eth0' }) : choosePort({ deviceId: popupDevice.id, port: 'Eth0' })} className={`absolute top-[25px] grid h-[45px] w-[42px] -translate-x-1/2 place-items-center bg-transparent p-0 hover:outline hover:outline-2 hover:outline-yellow-300 ${occupied.has(`${popupDevice.id}:Eth0`) ? 'outline outline-2 outline-green-500' : ''}`} style={{ left: 'calc(50% + 5px)' }}><img src="/routersim/ethernet-connected.png" alt="Ethernet port" draggable={false} className="pointer-events-none h-[45px] w-[42px] object-contain [image-rendering:pixelated]" /></button>
              {occupied.has(`${popupDevice.id}:Eth0`) && <button title="Disconnect cable" onClick={() => disconnect({ deviceId: popupDevice.id, port: 'Eth0' })} className="absolute top-[67px] -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-red-700 underline" style={{ left: 'calc(50% + 5px)' }}>Disconnect</button>}
              <button className="absolute bottom-1 left-3 rounded border border-slate-600 bg-gradient-to-b from-white to-[#c0cad3] px-4 py-0.5 text-xs" onClick={() => { setBackPanels(old => old.filter(panel => panel.deviceId !== popup.deviceId)); }}>Close</button>
              <button data-guide-config onClick={() => openHostConfig(popupDevice)} className="absolute bottom-1 right-3 rounded border border-slate-700 bg-gradient-to-b from-white to-[#c0cad3] px-3 py-0.5 text-xs font-bold">Configs</button>
            </div> : popupDevice.kind === 'netconnect' ? <div className="w-52 overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] p-2"><strong>{popupDevice.name}</strong><p className="my-1 text-[10px]">Local two-port bridge</p><div className="flex gap-2">{popupDevice.ports.map(port => <button key={port.name} onClick={() => choosePort({ deviceId: popupDevice.id, port: port.name })} className="border border-slate-600 bg-white px-2 py-1">{port.name}</button>)}</div><button className="mt-2 underline" onClick={() => { setShowNetConnectManager(true); }}>Configure...</button></div> : <div className="relative h-[100px] w-[430px] border-[3px] border-slate-500 bg-gradient-to-b from-[#f5f7f6] via-[#8fa1a4] to-[#4a6168] p-2">
              <div className="mb-1 font-bold text-slate-800">{popupDevice.switchModel || '2950'} Switch · {popupDevice.name}</div>
              <div className="flex flex-wrap gap-1">{popupDevice.ports.map(port => <div key={port.name} className="group relative text-center"><button data-guide-port={port.name} title={`${port.name} · click to connect`} onClick={() => choosePort({ deviceId: popupDevice.id, port: port.name })} className={`h-5 w-7 border border-slate-700 text-[10px] text-white hover:outline hover:outline-yellow-300 ${occupied.has(`${popupDevice.id}:${port.name}`) ? 'bg-emerald-800' : 'bg-slate-950'}`}>▣</button>{occupied.has(`${popupDevice.id}:${port.name}`) && <button title={`Disconnect ${port.name}`} onClick={() => disconnect({ deviceId: popupDevice.id, port: port.name })} className="absolute -right-1 -top-2 hidden rounded bg-red-600 px-1 text-[9px] text-white group-hover:block">×</button>}<div className="text-[9px] font-bold text-white">{port.name}</div></div>)}</div>
              <button className="absolute bottom-1 right-2 rounded border bg-slate-100 px-2 text-[10px]" onClick={() => { setBackPanels(old => old.filter(panel => panel.deviceId !== popup.deviceId)); }}>Close</button>
            </div>}
          </div>; })}
          {canvasMenu && <div className="absolute z-20 w-52 border border-slate-600 bg-[#f0f0f0] p-1 text-xs text-black shadow-xl" style={{ left: canvasMenu.x, top: canvasMenu.y }} onClick={e => e.stopPropagation()}>
            <MenuItem label="Open..." onClick={() => { setCanvasMenu(null); fileRef.current?.click(); }} /><MenuItem label="Save..." onClick={saveFile} /><MenuItem label="Print..." onClick={() => { setCanvasMenu(null); window.print(); }} />
            <MenuSubmenu label="Edit"><MenuItem label="Clear" onClick={clearNetwork} /><MenuItem label="Undo" onClick={undo} disabled={undoStack.current.length < 2} /><MenuItem label="Cut" onClick={cutSelected} disabled={!selected} /><MenuItem label="Copy" onClick={copySelected} disabled={!selected} /><MenuItem label="Paste" onClick={pasteDevice} disabled={!clipboardDevice.current} /><MenuItem label="Delete" onClick={deleteSelected} disabled={!selected} /></MenuSubmenu>
            <LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} onTeacher={openTeacherLab} />
            <MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { setCanvasMenu(null); openConsole(d); }} />)}</MenuSubmenu>
            <MenuItem label={`${showIp ? '✓ ' : ''}IP Addresses`} onClick={() => { setShowIp(!showIp); setCanvasMenu(null); }} /><MenuItem label={`${showPort ? '✓ ' : ''}Port Numbers`} onClick={() => { setShowPort(!showPort); setCanvasMenu(null); }} /><MenuItem label={`${showHostnames ? '✓ ' : ''}Hostnames`} onClick={() => { setShowHostnames(!showHostnames); setCanvasMenu(null); }} /><MenuItem label={`${showTooltips ? '✓ ' : ''}Tooltips`} onClick={() => { setShowTooltips(!showTooltips); setCanvasMenu(null); }} />
            <MenuSubmenu label="Line Thickness">{[1, 2, 3].map(size => <MenuItem key={size} label={`${lineThickness === size ? '✓ ' : ''}${size === 1 ? 'Thin' : size === 2 ? 'Medium' : 'Thick'}`} onClick={() => { setLineThickness(size); setCanvasMenu(null); }} />)}</MenuSubmenu>
            <MenuSubmenu label="Insert"><MenuItem label="Host" onClick={() => { setCanvasMenu(null); addDeviceAt('pc', canvasMenu); }} /><MenuItem label="Net Connect" onClick={() => { setCanvasMenu(null); addDeviceAt('netconnect', canvasMenu); }} /><MenuItem label="Router 2600" onClick={() => { setCanvasMenu(null); addDeviceAt('router', canvasMenu); }} />{(['1900', '2950', '3550'] as const).map(model => <MenuItem key={model} label={`Switch ${model}`} onClick={() => { setCanvasMenu(null); addDeviceAt('switch', canvasMenu, model); }} />)}</MenuSubmenu>
            <MenuItem label="Device List" onClick={() => { setCanvasMenu(null); setShowDeviceList(true); }} /><MenuItem label="Net Assessment" onClick={() => { setCanvasMenu(null); setShowAssessment(true); }} /><MenuItem label="Net Configs" onClick={() => { setCanvasMenu(null); setShowNetConfigs(true); }} /><MenuItem label="Net Connect Manager" onClick={() => { setCanvasMenu(null); setShowNetConnectManager(true); }} /><MenuItem label="Net Packet Monitor" onClick={() => { setCanvasMenu(null); setShowPing(true); }} /><MenuItem label="Preferences" onClick={() => { setCanvasMenu(null); setShowPreferences(true); }} /><MenuItem label="Help" onClick={() => { setCanvasMenu(null); setShowGuide(true); }} />
          </div>}
          {pending && <div className="absolute bottom-2 left-2 rounded bg-yellow-100 px-2 py-1 text-xs text-black">Cable: {topology.devices.find(d => d.id === pending.deviceId)?.name} {pending.port} → click another device, then choose its port. {pending.port.startsWith('S') && <span className="ml-2">DCE: {dceEnd === 'first' ? 'This end' : dceEnd === 'second' ? 'Other end' : 'chưa chọn'} <button className="underline" onClick={e => { e.stopPropagation(); setShowDceDialog(true); }}>Chọn đầu DCE…</button></span>} <button className="underline" onClick={e => { e.stopPropagation(); setPending(null); setCableCursor(null); setDceEnd(null); }}>Cancel</button></div>}
        </div>
      </div>
      <div className="flex h-7 items-center justify-between border-t border-slate-500 bg-[#ece9d8] px-2 text-[11px]"><span className="truncate">{status}</span><span className="ml-3 whitespace-nowrap">{topology.devices.length} devices · {topology.cables.length} cables</span></div>
    </div>}

    {clickTutorActive && teacherLab && <ClickTutor topology={topology} pending={pending} dceEnd={dceEnd} labId={teacherLab.id} studentNumber={teacherStudentNumber} stepIndex={clickTutorStep} onStepChange={setClickTutorStep} onClose={() => { setClickTutorActive(false); setShowTeacherExplanation(false); }} />}
    {removeConnection && <div className="fixed inset-0 z-50 flex items-center justify-center"><div role="dialog" aria-label="Remove connection" className="w-[min(435px,calc(100vw-24px))] overflow-hidden border border-[#888] shadow-xl"><WindowTitle title="Remove" onClose={() => setRemoveConnection(null)} />
      <div className="px-5 py-4 text-[13px] text-white" style={{ background: 'repeating-linear-gradient(0deg,#064b8a 0px,#064b8a 1px,#006fc4 1px,#006fc4 2px,#042568 2px,#042568 5px)' }}><div className="flex items-center gap-3"><span className="rounded-full bg-white px-2 text-xl font-bold text-blue-800">?</span><span>Port {removeConnection.port} of {topology.devices.find(d=>d.id===removeConnection.deviceId)?.name} is not open. Remove this connection?</span></div><div className="mt-5 flex justify-center gap-2">{(['Yes','No'] as const).map(choice=><button key={choice} onClick={()=>{if(choice==='Yes')disconnect(removeConnection);setRemoveConnection(null);}} className="w-20 rounded-xl border border-[#477642] bg-gradient-to-b from-[#b3d6a6] via-[#1b771b] to-[#075b07] py-1 text-white shadow-inner">{choice}</button>)}</div></div>
    </div></div>}
    {showDceDialog && pending?.port.startsWith('S') && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-transparent"><section data-guide-dialog role="dialog" aria-label="DCE or DTE" className="w-[320px] overflow-hidden rounded-lg border border-[#174a88] bg-[#f2f2f3] font-[Tahoma] shadow-2xl">
      <WindowTitle title="DCE or DTE" onClose={() => { setShowDceDialog(false); setPending(null); setCableCursor(null); setDceEnd(null); }} />
      <div className="min-h-[132px] px-3 pb-3 pt-2 text-[13px] leading-[18px] text-white" style={{ background: 'repeating-linear-gradient(0deg,#064b8a 0px,#064b8a 1px,#006fc4 1px,#006fc4 2px,#042568 2px,#042568 5px)' }}>
        <p>Starting serial connection from port: {pending.port}</p>
        <p className="mt-1">Specify DCE or DTE for this connection:</p>
        <div className="mt-4 flex justify-center gap-3">
          <button data-guide-dce-choice="first" aria-label="DCE" onClick={() => { setDceEnd('first'); setShowDceDialog(false); setStatus(`Starting serial connection from port: ${pending.port}. This end is DCE; choose the remote serial port.`); }} className="min-w-[82px] rounded-full border border-[#477642] bg-gradient-to-b from-[#b3d6a6] via-[#1b771b] to-[#075b07] px-4 py-1.5 font-bold text-white shadow-inner">DCE</button>
          <button data-guide-dce-choice="second" aria-label="DTE" onClick={() => { setDceEnd('second'); setShowDceDialog(false); setStatus(`Starting serial connection from port: ${pending.port}. This end is DTE; the remote end will be DCE.`); }} className="min-w-[82px] rounded-full border border-[#477642] bg-gradient-to-b from-[#b3d6a6] via-[#1b771b] to-[#075b07] px-4 py-1.5 font-bold text-white shadow-inner">DTE</button>
        </div>
      </div>
    </section></div>}
    {hostConfig && hostDraft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onMouseDown={() => { setHostConfigId(null); setHostDraft(null); }}><div data-host-config-dialog className="w-[min(390px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl" onMouseDown={e => e.stopPropagation()}>
      <WindowTitle title={`Configure ${hostConfig.name}`} onClose={() => setHostConfigId(null)} />
      <div className="space-y-2 p-4 text-xs"><Field label="Host Name" value={hostDraft.name} onChange={value => setHostDraft(d => d && { ...d, name: value })} />
        <label className="flex items-center gap-2"><input type="radio" checked={!hostDraft.manual} onChange={() => setHostDraft(d => d && { ...d, manual: false, ip: '' })} /> Obtain an IP address automatically</label>
        <label className="flex items-center gap-2"><input data-guide-manual-ip type="radio" checked={hostDraft.manual} onChange={() => setHostDraft(d => d && { ...d, manual: true })} /> Use the following IP address:</label>
        <IpField label="IP Address" value={hostDraft.ip} onChange={value => setHostDraft(d => d && { ...d, ip: value })} />
        <IpField label="Subnet" value={hostDraft.mask} onChange={value => setHostDraft(d => d && { ...d, mask: value })} />
        <IpField label="Default Gateway" value={hostDraft.gateway} onChange={value => setHostDraft(d => d && { ...d, gateway: value })} />
        {hostDraft.ip && !networkInfo(hostDraft.ip, hostDraft.mask) && <p className="text-red-700">Check IP address and subnet mask.</p>}
        <div className="flex justify-center gap-5 pt-2"><button className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-8 py-1 font-bold text-white" data-guide-host-ok onClick={saveHostConfig}>OK</button><button className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-6 py-1 font-bold text-white" onClick={() => { setHostConfigId(null); setHostDraft(null); }}>Cancel</button></div>
      </div>
    </div></div>}

    {consoleDevice && consoleMinimized && <button onClick={() => setConsoleMinimized(false)} className="fixed bottom-2 left-3 z-40 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-lg"><img src="/logo.svg" alt="" className="h-4 w-4" />Console for {consoleDevice.name}</button>}
    {consoleDevice && !consoleMinimized && <div data-testid="routersim-console" style={!consoleMaximized ? { ...(consolePosition ? { left: consolePosition.x, top: consolePosition.y } : {}), resize: 'both', minWidth: 280, minHeight: 200, maxWidth: 'calc(100vw - 12px)', maxHeight: 'calc(100dvh - 12px)' } : undefined} className={`fixed z-40 flex flex-col overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-2xl ${consoleMaximized ? 'inset-0' : `${consolePosition ? '' : 'bottom-5 right-5'} h-[405px] w-[min(600px,calc(100vw-24px))]`}`}><WindowTitle title={`Console for ${consoleDevice.name}`} onClose={() => { setConsoleId(null); setConsoleMenu(null); }} onMinimize={() => setConsoleMinimized(true)} onMaximize={() => { setConsoleMaximized(!consoleMaximized); requestAnimationFrame(() => consoleInputRef.current?.focus()); }} onDragStart={startConsoleDrag} onDragMove={moveConsoleDrag} onDragEnd={stopConsoleDrag} />
      <div className="relative flex h-6 shrink-0 items-center gap-4 border-b border-[#9b9b9b] bg-white px-2 text-[14px]">{(['File', 'Edit', 'View', 'Tools', 'Help'] as const).map(name => <button key={name} onClick={() => setConsoleMenu(consoleMenu === name ? null : name)} className="hover:bg-blue-100">{name}</button>)}
        {consoleMenu && <div className="absolute left-1 top-6 z-50 min-w-44 border border-slate-600 bg-[#f0f0f0] p-1 shadow-lg" style={{ marginLeft: `${(['File', 'Edit', 'View', 'Tools', 'Help'] as const).indexOf(consoleMenu) * 31}px` }}>
          {consoleMenu === 'File' && <><MenuItem label="Print..." onClick={() => { setConsoleMenu(null); window.print(); }} /><MenuItem label="Close" onClick={() => { setConsoleId(null); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Edit' && <><MenuItem label="Copy" onClick={copyConsole} /><MenuItem label="Paste" onClick={pasteConsole} /></>}
          {consoleMenu === 'View' && <><LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} onTeacher={openTeacherLab} /><MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { openConsole(d); setConsoleMenu(null); }} />)}</MenuSubmenu><MenuSubmenu label="Toolbars">{(['file', 'edit', 'tools'] as const).map(group => <MenuItem key={group} label={`${consoleToolbar[group] ? '✓ ' : ''}${group[0].toUpperCase()+group.slice(1)} buttons`} onClick={() => { setConsoleToolbar(old => ({ ...old, [group]: !old[group] })); setConsoleMenu(null); }} />)}</MenuSubmenu><MenuItem label="Net Visualizer Screen" onClick={() => { setConsoleId(null); setConsoleMenu(null); }} /><MenuItem label="Supported Commands" onClick={() => { setShowSupportedCommands(true); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Tools' && <><MenuItem label="Net Packet Monitor" onClick={() => { setShowPing(true); setConsoleMenu(null); }} /><MenuItem label="Net Detective" onClick={() => { setShowAssessment(true); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Help' && <MenuItem label="RouterSim Help" onClick={() => { setShowGuide(true); setConsoleMenu(null); }} />}
        </div>}
      </div>
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b-2 border-[#999] bg-white px-1">{consoleToolbar.file && <ToolButton title="Print Console" onClick={() => window.print()}><img src="/routersim/printer_up-transparent.png" alt="Print" /></ToolButton>}{consoleToolbar.edit && <><ToolButton title="Copy Console" onClick={copyConsole}><img src="/routersim/copy_up-transparent.png" alt="Copy" className="h-8 w-8" /></ToolButton><ToolButton title="Paste Command" onClick={pasteConsole}><img src="/routersim/paste_up-transparent.png" alt="Paste" className="h-8 w-8" /></ToolButton></>}{consoleToolbar.tools && <><ToolButton title="Net Detective" onClick={() => setShowAssessment(true)}><img src="/routersim/netdetective_up-transparent.png" alt="Net Detective" /></ToolButton><ToolButton title="Net Packet Monitor" onClick={() => setShowPing(true)}><img src="/routersim/netpacket_up-transparent.png" alt="Packet monitor" /></ToolButton></>}</div>
      <div ref={consoleOutputRef} onContextMenu={event => { event.preventDefault(); setConsoleMenu(null); setConsoleContext({ x: Math.min(window.innerWidth - 210, event.clientX), y: Math.max(0, Math.min(window.innerHeight - 350, event.clientY)) }); }} onClick={() => consoleInputRef.current?.focus()} className="min-h-0 flex-1 overflow-auto whitespace-pre bg-white px-1.5 py-1 text-[14px] leading-[17.5px] text-black [font-family:'Courier_New',monospace]">{lines.map((line, i) => <div key={i}>{line || '\u00a0'}</div>)}<form onSubmit={e => { e.preventDefault(); if (consolePager.length) { nextConsolePage(true); return; } runCommand(); requestAnimationFrame(() => consoleInputRef.current?.focus()); }} className="flex min-h-5 items-center"><span className="shrink-0">{consolePager.length ? '--More--' : prompt()}</span><input ref={consoleInputRef} autoFocus aria-label="RouterSim console command" value={consolePager.length ? '' : command} onChange={e => { if (!consolePager.length) setCommand(e.target.value); }} onKeyDown={e => {
        if (consolePager.length) {
          e.preventDefault();
          if (e.key === ' ' || e.key === 'Enter') nextConsolePage(e.key === 'Enter');
          else if (e.key.toLowerCase() === 'q' || (e.ctrlKey && e.key.toLowerCase() === 'c')) setConsolePager([]);
          return;
        }
        if (e.key === 'ArrowUp' && commandHistory.length) { e.preventDefault(); const next = commandHistoryIndex < 0 ? commandHistory.length - 1 : Math.max(0, commandHistoryIndex - 1); setCommandHistoryIndex(next); setCommand(commandHistory[next]); }
        if (e.key === 'ArrowDown' && commandHistoryIndex >= 0) { e.preventDefault(); const next = commandHistoryIndex + 1; setCommandHistoryIndex(next < commandHistory.length ? next : -1); setCommand(next < commandHistory.length ? commandHistory[next] : ''); }
        if (e.key === '?' && consoleDevice.kind === 'router') {
          e.preventDefault();
          const help = routerHelp(consoleMode, command + '?');
          setLines(old => [...old, `${prompt()}${command}?`, ...help.slice(0, 24)]);
          setConsolePager(help.slice(24));
          return;
        }
        if (e.key === 'Tab') { e.preventDefault(); setCommand(completeRouterCommand(consoleMode, command)); }
        if (e.ctrlKey && e.key.toLowerCase() === 'u') { e.preventDefault(); setCommand(''); }
        if (e.ctrlKey && e.key.toLowerCase() === 'z' && consoleDevice.kind === 'router') { e.preventDefault(); if (consoleMode !== 'user') setConsoleMode('privileged'); setCommand(''); }
        if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); setLines(old => [...old, `${prompt()}${command}^C`]); setCommand(''); if (consoleDevice.kind !== 'pc' && consoleMode !== 'user') setConsoleMode('privileged'); }
      }} className="min-w-0 flex-1 bg-transparent p-0 text-[14px] leading-[17.5px] text-black outline-none [font-family:'Courier_New',monospace]" autoComplete="off" spellCheck={false} /></form></div>
    </div>}

    {consoleContext && consoleDevice && <div className="fixed inset-0 z-50" onClick={() => setConsoleContext(null)} onContextMenu={event => { event.preventDefault(); setConsoleContext(null); }}><div role="menu" aria-label="Console context menu" className="absolute w-52 border border-[#999] bg-[#f0f0f0] p-0.5 text-[13px] text-black shadow-lg" style={{ left: consoleContext.x, top: consoleContext.y }} onClick={event => event.stopPropagation()}>
      <MenuItem label="Print..." onClick={() => { window.print(); setConsoleContext(null); }} /><MenuItem label="Copy" onClick={copyConsole} /><MenuItem label="Paste" onClick={pasteConsole} /><div className="my-0.5 border-t border-[#aaa]" />
      <LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} onTeacher={openTeacherLab} />
      <MenuSubmenu label="Console">{topology.devices.filter(device => device.kind !== 'netconnect').map(device => <MenuItem key={device.id} label={`${device.id === consoleId ? '• ' : ''}${device.name}`} onClick={() => openConsole(device)} />)}</MenuSubmenu>
      <MenuItem label="Net Visualizer Screen" onClick={() => { setConsoleId(null); setConsoleContext(null); }} /><MenuItem label="Supported Commands" onClick={() => { setShowSupportedCommands(true); setConsoleContext(null); }} /><div className="my-0.5 border-t border-[#aaa]" />
      <MenuItem label="Net Detective" onClick={() => { setShowAssessment(true); setConsoleContext(null); }} /><MenuItem label="Net Packet Monitor" onClick={() => { setShowPing(true); setConsoleContext(null); }} /><div className="my-0.5 border-t border-[#aaa]" /><MenuItem label="Help" onClick={() => { setShowGuide(true); setConsoleContext(null); }} />
    </div></div>}
    {showSupportedCommands && <div className="fixed inset-4 z-50 flex flex-col border border-[#888] bg-white shadow-2xl"><WindowTitle title="Supported Commands" onClose={() => setShowSupportedCommands(false)} /><iframe title="RouterSim Supported Commands" src="/routersim/supported_commands.html" sandbox="" className="min-h-0 flex-1 border-0" /></div>}
    {showPing && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowPing(false)}><div className="w-[min(760px,calc(100vw-20px))] overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Packet Monitor" onClose={() => setShowPing(false)} />
      <div className="border-b border-slate-400 bg-white px-2 py-1 text-xs">File　 View</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-400 bg-white px-3 py-2 text-[10px]"><span><i className="mr-1 inline-block h-2 w-2 bg-pink-400" />Echo Request</span><span><i className="mr-1 inline-block h-2 w-2 bg-violet-600" />Echo Reply</span><span><i className="mr-1 inline-block h-2 w-2 bg-green-500" />Telnet Request</span><span><i className="mr-1 inline-block h-2 w-2 bg-red-500" />RIP Update</span></div>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-400 p-2 text-xs"><Field label="Source Host" value={sourceId} onChange={setSourceId} asSelect={topology.devices.filter(d => d.kind === 'pc').map(d => ({ id: d.id, label: d.name }))} /><Field label="Destination IP" value={pingTarget} onChange={setPingTarget} /><button onClick={runPing} className="border border-slate-500 bg-white px-4 py-1 hover:bg-blue-100">Ping</button><button onClick={() => setPing(null)} className="border border-slate-500 bg-white px-4 py-1 hover:bg-blue-100">Clear</button></div>
      <div className="min-h-48 max-h-[45vh] overflow-auto bg-white p-1 text-xs"><table className="w-full border-collapse text-left"><thead><tr className="bg-[#ece9d8]">{['Network', 'Device', 'Interface', 'Type', 'Time'].map(label => <th key={label} className="border border-slate-400 px-2 py-1">{label}</th>)}</tr></thead><tbody>{ping?.path.map((name, index) => <tr key={`${name}-${index}`}><td className="border border-slate-300 px-2">{PRESET_LABELS[preset]}</td><td className="border border-slate-300 px-2">{name}</td><td className="border border-slate-300 px-2">{index === 0 ? 'OUT' : 'IN'}</td><td className="border border-slate-300 bg-pink-400 px-2">Echo Request</td><td className="border border-slate-300 px-2">{new Date().toLocaleTimeString()}</td></tr>)}{ping?.ok && [...ping.path].reverse().map((name, index) => <tr key={`reply-${name}-${index}`}><td className="border border-slate-300 px-2">{PRESET_LABELS[preset]}</td><td className="border border-slate-300 px-2">{name}</td><td className="border border-slate-300 px-2">{index === 0 ? 'OUT' : 'IN'}</td><td className="border border-slate-300 bg-violet-500 px-2 text-white">Echo Reply</td><td className="border border-slate-300 px-2">{new Date().toLocaleTimeString()}</td></tr>)}</tbody></table>{ping && <div className={`mt-2 p-2 ${ping.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{ping.message} · {ping.why}</div>}</div>
    </div></div>}

    {showAssessment && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowAssessment(false)}><div className="w-[min(600px,calc(100vw-20px))] overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Assessment" onClose={() => setShowAssessment(false)} /><div className="max-h-[65vh] overflow-auto bg-white p-4 text-xs"><p className="mb-3 font-bold">Connectivity test for each pair of hosts</p>{topology.devices.filter(d => d.kind === 'pc').flatMap(source => topology.devices.filter(d => d.kind === 'pc' && d.id !== source.id).map(target => { const result = simulatePing(topology, source.id, target.ports[0]?.ip || ''); return <div key={`${source.id}-${target.id}`} className="mb-2 border-b pb-2"><span className={result.ok ? 'font-bold text-green-700' : 'font-bold text-red-700'}>{result.ok ? 'PASS' : 'FAIL'}</span> · {source.name} → {target.name} ({target.ports[0]?.ip || 'unassigned'})<div className="text-slate-600">{result.why}</div></div>; }))}{topology.devices.filter(d => d.kind === 'pc').length < 2 && <p>Add at least two hosts to test the network.</p>}</div></div></div>}

    {showNetConnectManager && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowNetConnectManager(false)}><div className="w-[min(450px,calc(100vw-20px))] overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Connect Manager" onClose={() => setShowNetConnectManager(false)} /><div className="space-y-3 bg-white p-4 text-xs"><p>Net Connect devices act as local two-port bridges in this browser simulator. The original program's online peer service is separate.</p>{topology.devices.filter(d => d.kind === 'netconnect').map(device => <div key={device.id} className="flex items-center gap-3 border p-2"><img src="/routersim/netconnect_up-transparent.png" alt="" className="h-9 w-12 object-contain" /><div><strong>{device.name}</strong><p>{device.ports.map(port => `${port.name}: ${occupied.has(`${device.id}:${port.name}`) ? 'connected' : 'empty'}`).join(' · ')}</p></div></div>)}<button onClick={() => { addDevice('netconnect'); setShowNetConnectManager(false); }} className="border border-slate-500 bg-[#ece9d8] px-3 py-1">Insert Net Connect</button></div></div></div>}

    {showNetConfigs && <div data-testid="routersim-net-configs" className="fixed left-4 top-24 z-40 w-[min(350px,calc(100vw-30px))] overflow-hidden border border-[#8c8c8c] bg-white shadow-xl"><WindowTitle title="Net Configs" onClose={() => setShowNetConfigs(false)} /><div className="max-h-[65vh] overflow-auto p-1 text-[12px] leading-[18px]">
      <details open><summary className="cursor-pointer">📁 {loadedNetworkName || PRESET_LABELS[preset]}.rsm</summary>
      {topology.devices.map(device => <details key={device.id} open className="ml-4"><summary className="cursor-pointer whitespace-nowrap" onDoubleClick={() => openConsole(device)}><img src={pictureFor(device)} alt="" className="mr-1 inline-block h-3 w-6 object-contain" />{device.kind === 'router' ? `2600 Router ${String.fromCharCode(65 + topology.devices.filter(d => d.kind === 'router').findIndex(d => d.id === device.id))}` : device.name}</summary>
        <div className="ml-4">Hostname: {device.name}</div>
        {[...device.ports].sort((a,b) => b.name.localeCompare(a.name)).map(port => <details key={port.name} className="ml-4" open={!!port.ip}><summary className={`cursor-pointer ${port.enabled && port.ip ? 'text-[#008000]' : 'text-red-600'}`}>Interface {port.name}</summary><div className="ml-4 whitespace-nowrap">IP Address: {port.ip || 'unassigned'}<br />Subnet: {port.mask || 'unassigned'}</div></details>)}
        {device.kind === 'pc' ? <div className="ml-4">Default Gateway: {device.gateway || 'unassigned'}</div> : <details className="ml-4"><summary className="cursor-pointer">Routing Protocols</summary><div className="ml-4">{device.ripNetworks.length ? `RIP: ${device.ripNetworks.join(', ')}` : 'None'}</div></details>}
      </details>)}</details>
    </div></div>}


    {showDeviceList && <div className="fixed left-8 top-16 z-40 w-[265px] overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-2xl"><WindowTitle title="Device List" onClose={() => setShowDeviceList(false)} /><div className="max-h-[70vh] space-y-3 overflow-auto bg-white p-3 text-center text-xs">{([['pc', 'Host', '/routersim/host-transparent.png', '2950'], ['router', '2600 Router', '/routersim/router-transparent.png', '2950'], ['switch', '1900 Switch', '/routersim/switch1900-transparent.png', '1900'], ['switch', '2950 Switch', '/routersim/switch-transparent.png', '2950'], ['switch', '3550 Switch', '/routersim/switch3550-transparent.png', '3550'], ['netconnect', 'Net Connect', '/routersim/netconnect_up-transparent.png', '2950']] as const).map(([kind, label, picture, model]) => <button key={label} draggable onDragStart={e => { e.dataTransfer.setData('application/x-routersim-device', kind); e.dataTransfer.setData('application/x-routersim-model', model); }} onClick={() => addDeviceAt(kind, undefined, model)} className="block w-full cursor-grab border border-transparent p-1 hover:border-blue-400 hover:bg-blue-50"><span className="block">{label}</span><img className="mx-auto mt-1" src={picture} alt={label} style={{ imageRendering: 'pixelated' }} /></button>)}</div></div>}

    {showPreferences && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowPreferences(false)}><div className="w-[min(350px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Preferences" onClose={() => setShowPreferences(false)} /><div className="space-y-3 p-4 text-xs"><strong>Background Color</strong><p>Click a color to change the Network Visualizer background.</p><div className="grid grid-cols-10 gap-1">{['#ffffff','#000000','#000064','#0000ff','#00b7c6','#b9c9ff','#505050','#888888','#008542','#00e200','#ff00ff','#e6ad00','#ffaaaa','#e00000','#ffff00','#ffffcc','#dbffdf','#008b89'].map(color => <button key={color} title={color} aria-label={`Background ${color}`} onClick={() => setCanvasColor(color)} className={`h-5 w-5 border border-slate-500 ${canvasColor === color ? 'outline-2 outline-offset-1 outline-blue-700' : ''}`} style={{ backgroundColor: color }} />)}</div><label className="flex items-center gap-2"><input type="checkbox" checked={showDeviceListAtStart} onChange={e => setShowDeviceListAtStart(e.target.checked)} /> Show Device List with Network Visualizer</label><label className="flex items-center gap-2"><input type="checkbox" checked={autoSizeCanvas} onChange={e => setAutoSizeCanvas(e.target.checked)} /> Autosize Network Visualizer when loading a network</label><button onClick={() => setShowPreferences(false)} className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-6 py-1 font-bold text-white">Close</button></div></div></div>}

    {showTeacherLabs && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-3" onMouseDown={() => setShowTeacherLabs(false)}><section aria-label="Bài tập của thầy COMP303" className="w-[min(900px,100%)] overflow-hidden rounded-xl border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl" onMouseDown={event => event.stopPropagation()}><WindowTitle title="Bài tập của thầy · COMP303" onClose={() => setShowTeacherLabs(false)} /><div className="max-h-[75vh] overflow-auto p-4"><p className="mb-3 text-sm text-slate-700">Chọn bài để tự thêm thiết bị, nối dây và nhập từng lệnh. Mỗi bài có hướng dẫn bấm vào đâu và điền gì.</p><label className="mb-4 flex items-center gap-2 text-sm"><span>Số thứ tự (STT) cho bài 4 router:</span><input aria-label="Số thứ tự STT" type="number" min={1} max={254} value={draftStudentNumber} onChange={event => setDraftStudentNumber(Number(event.target.value))} className="w-20 rounded border border-slate-400 bg-white px-2 py-1" /></label><div className="grid gap-3 md:grid-cols-2">{TEACHER_LABS.map(lab => <article key={lab.id} className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm"><div className="mb-1 text-xs font-semibold text-blue-800">{lab.basis}</div><h3 className="font-bold text-slate-900">{lab.title}</h3><p className="mt-1 text-xs text-slate-500">Nguồn: {lab.source}</p><p className="mt-2 text-sm leading-5">{lab.summary}</p><button onClick={() => openTeacherLab(lab)} className="mt-3 rounded-md bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800">Bắt đầu tự dựng sơ đồ</button></article>)}</div></div></section></div>}
    {teacherLab && showTeacherExplanation && !clickTutorActive && <TeacherExplanationWindow key={`${teacherLab.id}:${teacherStudentNumber}`} lab={teacherLab} studentNumber={teacherStudentNumber} topology={topology} onStartClickTutor={() => { openTeacherLab(teacherLab); setClickTutorStarted(true); setClickTutorActive(true); }} onLocate={locateGuideTarget} onRestart={() => openTeacherLab(teacherLab)} onClose={() => setShowTeacherExplanation(false)} />}
    {showGuide && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowGuide(false)}><section className="w-[min(600px,calc(100vw-20px))] overflow-hidden border border-[#8c8c8c] bg-[#f2f2f3] shadow-2xl" onMouseDown={event => event.stopPropagation()}><WindowTitle title="RouterSim Help · Làm bài COMP303" onClose={() => setShowGuide(false)} /><div className="max-h-[70vh] overflow-auto p-4 text-sm leading-6"><ol className="list-decimal pl-5"><li>Chọn sơ đồ trong <strong>View → Labs</strong> hoặc mở tệp RouterSim <code>.rsm</code> bằng <strong>File → Open</strong>. Vào <strong>Tools → Clear Configuration</strong> để bắt đầu cấu hình từ đầu.</li><li>Kéo thiết bị từ thanh công cụ hoặc Device List vào vùng xanh. Nhấp chuột phải lên thiết bị và chọn cổng ở hai đầu để nối dây. Với cáp serial, chọn đầu DCE và đặt <code>clock rate 64000</code> trên cổng DCE.</li><li>Nhấp phải PC → Configs để nhập IP, mask và gateway. Nhấp đúp router để mở console; gõ <code>enable</code>, <code>conf t</code>, <code>int F0/0</code>, <code>ip add ...</code>, <code>no shut</code>, <code>router rip</code> và <code>network ...</code>.</li><li>Nhấp đúp PC, chạy <code>ping IP_đích</code>. Dùng <code>show ip route</code> để xem tuyến; dùng mũi tên ↑/↓ để gọi lại lệnh.</li></ol><p className="mt-2">Nút ô vuông bên phải thanh tiêu đề phóng to cửa sổ. Các phím tắt chính: Ctrl+O mở tệp, Ctrl+S lưu tệp RouterSim .rsm, Ctrl+D mở Device List, Ctrl+F mở Net Configs, Ctrl+T mở Net Packet Monitor.</p></div></section></div>}
    <input ref={fileRef} type="file" accept=".json,.rsm,application/json,application/xml,text/xml" className="hidden" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
  </div>;
};

function TeacherExplanationWindow({ lab, studentNumber, topology, onStartClickTutor, onLocate, onRestart, onClose }: { lab: TeacherLab; studentNumber: number; topology: Topology; onStartClickTutor: () => void; onLocate: (target: GuideTarget) => void; onRestart: () => void; onClose: () => void }) {
  const lesson = getTeacherExplanation(lab.id);
  const show = (value: string) => teacherText(value, studentNumber);
  const referenceContent = <>
    <NetworkLabAiChat lab={lab} studentNumber={studentNumber} topology={topology} />
    <h3 className="mt-5 text-base font-bold text-slate-900">Đi từ dễ đến khó</h3>
    <div className="mt-2 space-y-3">{lesson.steps.map((step, index) => <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><h4 className="font-bold text-blue-900">Bước {index + 1}: {step.title}</h4><p className="mt-1 text-slate-800">{show(step.explanation)}</p>{step.analogy && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-amber-950"><strong>Hình dung như thế này:</strong> {show(step.analogy)}</p>}<p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-slate-800"><strong>Nhìn vào sơ đồ:</strong> {show(step.example)}</p></article>)}</div>
    <h3 className="mt-5 text-base font-bold text-slate-900">Bảng địa chỉ trong ví dụ</h3>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">{lab.networkPlan.map(row => <article key={row.network} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="font-mono font-bold text-blue-900">{show(row.network)}</div><div className="mt-1 font-semibold">{show(row.purpose)}</div><p className="mt-1 text-slate-700">{show(row.reason)}</p></article>)}</div>
    <h3 className="mt-5 text-base font-bold text-slate-900">Theo chân một gói tin</h3><ol className="mt-2 list-decimal space-y-2 pl-5">{lesson.packetJourney.map(step => <li key={step}>{show(step)}</li>)}</ol>
    <h3 className="mt-5 text-base font-bold text-slate-900">Nếu ping chưa được, kiểm tra gì?</h3><ul className="mt-2 list-disc space-y-1 pl-5">{lesson.commonMistakes.map(mistake => <li key={mistake}>{show(mistake)}</li>)}</ul>
    <h3 className="mt-5 text-base font-bold text-slate-900">Thực hành tự kiểm tra</h3><ol className="mt-2 list-decimal space-y-1 pl-5">{lab.verify.map(step => <li key={step}>{show(step)}</li>)}</ol>
  </>;
  return <section data-testid="teacher-explanation" className="fixed right-3 top-32 z-30 flex max-h-[calc(100vh-160px)] w-[min(690px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl">
    <WindowTitle title="Hướng dẫn thực hành từng bước · COMP303" onClose={onClose} />
    <div className="min-h-0 overflow-y-auto bg-white p-4 text-sm leading-6 sm:p-5">
      <div className="rounded-lg bg-blue-50 p-3"><div className="text-xs font-semibold text-blue-800">{lab.basis}</div><h2 className="mt-1 text-lg font-bold text-slate-900">{lab.title}</h2><p className="mt-1 text-xs text-slate-600">Nguồn: {lab.source}</p><p className="mt-2 text-slate-800">{show(lab.summary)}</p></div>
      <button type="button" onClick={onStartClickTutor} className="mt-3 w-full rounded-xl bg-blue-700 p-4 text-base font-bold text-white">👉 Bắt đầu chỉ tay từng cú bấm (dựng lại từ đầu)</button><TeacherPractice labId={lab.id} studentNumber={studentNumber} onLocate={onLocate} onRestart={onRestart} />
      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer font-semibold text-blue-900">Giải thích thêm, bảng IP và hỏi gia sư AI</summary>
        <div className="mt-3">{referenceContent}</div>
      </details>
    </div>
  </section>;
}

function TeacherPractice({ labId, studentNumber, onLocate, onRestart }: { labId: string; studentNumber: number; onLocate: (target: GuideTarget) => void; onRestart: () => void }) {
  const steps = getTeacherWalkthrough(labId, studentNumber);
  const savedStepKey = `teacher-guide-step:${labId}:${studentNumber}`;
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, Math.min(steps.length - 1, Number(sessionStorage.getItem(savedStepKey)) || 0)));
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { sessionStorage.setItem(savedStepKey, String(stepIndex)); headingRef.current?.scrollIntoView({ block: 'nearest' }); }, [stepIndex, savedStepKey]);
  const step = steps[stepIndex];
  return <section data-testid="teacher-walkthrough" className="mt-3 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
    <header className="border-b border-blue-100 bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-2"><strong className="text-blue-950">Hướng dẫn thao tác từ đầu</strong><span className="whitespace-nowrap text-xs text-blue-800">Bước {stepIndex + 1}/{steps.length}</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
      <p className="mt-2 text-xs text-blue-950">Làm lần lượt: bấm nơi được chỉ, nhập nội dung rồi nhấn Enter hoặc OK. Nút bên dưới mở đúng cửa sổ để bạn thao tác.</p>
    </header>
    <div className="border-b border-slate-200 p-3">
      <button type="button" onClick={() => { setStepIndex(0); onRestart(); }} className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900">Bắt đầu lại từ vùng vẽ trống</button>
      <label className="mt-2 flex items-center gap-2 text-xs">Đến bước:<select aria-label="Chọn bước hướng dẫn" value={stepIndex} onChange={event => setStepIndex(Number(event.target.value))} className="min-w-0 flex-1 rounded border border-slate-300 p-1">{steps.map((item, index) => <option key={index} value={index}>{index + 1}. {item.title}</option>)}</select></label>
    </div>
    <article aria-live="polite" className="space-y-3 p-3">
      <h3 ref={headingRef} className="text-base font-bold text-slate-950">{step.title}</h3>
      {step.target && <button type="button" onClick={() => onLocate(step.target!)} className="w-full rounded-lg border-2 border-blue-500 bg-blue-100 px-3 py-2 font-bold text-blue-950 hover:bg-blue-200">{step.target.label}</button>}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-slate-900"><strong className="text-amber-950">Vì sao?</strong><p className="mt-1">{step.why}</p></div>
      <div><h4 className="font-semibold text-slate-900">Bạn thao tác như sau</h4><ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-800">{step.actions.map((action, index) => <li key={`${step.title}-action-${index}`}>{action}</li>)}</ol></div>
      {step.connections && <div className="overflow-x-auto rounded-md border border-slate-200"><table className="w-full min-w-[480px] border-collapse text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Đoạn mạng</th><th className="p-2">Nối cổng</th><th className="p-2">Subnet</th><th className="p-2">DCE</th></tr></thead><tbody>{step.connections.map(connection => <tr key={connection.name} className="border-t border-slate-200"><td className="p-2 font-semibold">{connection.name}</td><td className="p-2">{connection.first} ↔ {connection.second}</td><td className="p-2 font-mono">{connection.subnet}</td><td className="p-2">{connection.dce ?? '—'}</td></tr>)}</tbody></table></div>}
      {step.commands && <div className="overflow-hidden rounded-md border border-slate-300 bg-slate-950 text-slate-100"><div className="border-b border-slate-700 px-3 py-1.5 text-xs text-slate-300">{step.commandInput ? 'Gõ dòng này vào ô lệnh dưới console rồi nhấn Enter' : 'Thông tin nhập theo từng thiết bị'}</div><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5">{step.commands.join('\n')}</pre></div>}
      {step.commandGroups && <div className="space-y-2">{step.commandGroups.map(group => <div key={group.label} className="overflow-hidden rounded-md border border-slate-300 bg-slate-950 text-slate-100"><div className="border-b border-slate-700 px-3 py-1.5 text-xs text-slate-300">{group.label} · gõ từng dòng rồi nhấn Enter</div><pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5">{group.lines.join('\n')}</pre></div>)}</div>}
      {step.result && <p className="rounded-md border border-green-200 bg-green-50 p-3 text-green-950"><strong>Sau bước này:</strong> {step.result}</p>}
    </article>
    <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-2">
      <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(index => Math.max(0, index - 1))} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Bước trước</button>
      {stepIndex < steps.length - 1
        ? <button type="button" onClick={() => setStepIndex(index => Math.min(steps.length - 1, index + 1))} className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">Tôi đã làm xong · bước tiếp theo</button>
        : <button type="button" onClick={() => setStepIndex(0)} className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">Xem lại từ bước đầu</button>}
    </footer>
  </section>;
}

type LabChatMessage = { role: 'user' | 'assistant'; content: string };

function NetworkLabAiChat({ lab, studentNumber, topology }: { lab: TeacherLab; studentNumber: number; topology: Topology }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<LabChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef<AbortController | null>(null);
  useEffect(() => () => pendingRef.current?.abort(), []);
  const show = (value: string) => teacherText(value, studentNumber);
  const suggestions = lab.id === 'week1-switch'
    ? ['Vì sao không cần gateway?', 'Switch làm gì khi PC1 gửi cho PC2?']
    : lab.id === 'week1-one-router'
      ? ['Gateway của PC1 là cổng nào?', 'Vì sao chưa cần RIP?']
      : ['Vì sao phải chia subnet như vậy?', 'Gateway của PC1 là cổng nào?', 'Tôi ping không được thì kiểm tra gì?'];
  const ask = async (suggested?: string) => {
    const text = (suggested ?? question).trim();
    if (!text || pendingRef.current) return;
    const lesson = getTeacherExplanation(lab.id);
    const walkthrough = getTeacherWalkthrough(lab.id, studentNumber);
    const lessonContext = [
      `Tên bài: ${lab.title}. Nguồn: ${lab.source}. Loại: ${lab.basis}.`,
      show(lab.summary),
      ...lab.networkPlan.map(row => `${show(row.network)}: ${show(row.purpose)}. ${show(row.reason)}`),
      ...lesson.steps.slice(0, 4).map(step => `${step.title}: ${show(step.explanation)}`),
      ...walkthrough.map(step => step.title),
    ].join('\n').slice(0, 8000);
    const topologyContext = [
      ...topology.devices.map(device => `${device.name} (${device.kind}): ${device.kind === 'pc' ? `gateway ${device.gateway || 'chưa đặt'}; ` : ''}${device.ports.filter(port => port.ip || port.name.startsWith('S')).map(port => `${port.name} ${port.ip || 'chưa đặt'}/${port.mask} ${port.enabled ? 'bật' : 'tắt'}${port.clockRate ? ` clock ${port.clockRate}` : ''}`).join('; ')}${device.kind === 'router' ? `; RIP ${device.ripNetworks.join(', ') || 'chưa đặt'}` : ''}`),
      ...topology.cables.map(cable => `Dây: ${cable.a.deviceId} ${cable.a.port} ↔ ${cable.b.deviceId} ${cable.b.port}${cable.dce ? `; DCE ${cable.dce.deviceId} ${cable.dce.port}` : ''}`),
    ].join('\n').slice(0, 6000);
    const history = messages.slice(-6).map(message => ({ role: message.role, content: message.content.slice(0, 1200) }));
    const controller = new AbortController();
    pendingRef.current = controller;
    setMessages(previous => [...previous, { role: 'user', content: text }]);
    setQuestion(''); setError(''); setLoading(true);
    try {
      const response = await apiClient.post<{ answer: string }>('/ai/network-lab/ask', {
        lab_id: lab.id, question: text, lesson_context: lessonContext, topology_context: topologyContext, history,
      }, { signal: controller.signal });
      setMessages(previous => [...previous, { role: 'assistant', content: response.data.answer }]);
    } catch (reason) {
      if (controller.signal.aborted) return;
      const detail = (reason as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Chưa nhận được câu trả lời. Hãy thử lại.');
      setMessages(previous => previous.slice(0, -1));
      setQuestion(text);
    } finally {
      if (pendingRef.current === controller) pendingRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  return <section aria-label="Hỏi AI về bài tập" className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
    <h3 className="font-bold text-blue-950">Hỏi AI về sơ đồ này</h3>
    <p className="mt-1 text-xs text-blue-900">Bạn có thể hỏi theo cách của mình. AI sẽ xem bài đang mở và các IP bạn đang đặt trên sơ đồ.</p>
    <div className="mt-2 flex flex-wrap gap-2">{suggestions.map(suggestion => <button key={suggestion} type="button" disabled={loading} onClick={() => void ask(suggestion)} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs text-blue-900 hover:bg-blue-100 disabled:opacity-50">{suggestion}</button>)}</div>
    {messages.length > 0 && <div aria-live="polite" className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-md bg-white p-2">{messages.map((message, index) => <div key={index} className={`rounded-md px-3 py-2 text-sm ${message.role === 'user' ? 'ml-8 whitespace-pre-wrap bg-blue-100 text-blue-950' : 'mr-8 bg-slate-100 text-slate-900'}`}><strong className="mb-1 block text-xs">{message.role === 'user' ? 'Bạn' : 'Gia sư AI'}</strong>{message.role === 'assistant' ? <MarkdownAnswer content={message.content} /> : message.content}</div>)}</div>}
    {loading && <p role="status" className="mt-2 text-xs text-blue-900">AI đang giải thích bài này...</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void ask(); }} className="mt-3 flex items-end gap-2"><textarea aria-label="Nhập câu hỏi cho AI về bài tập" value={question} maxLength={1000} rows={2} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ví dụ: Vì sao PC1 phải đặt gateway là IP của R1?" className="min-h-16 min-w-0 flex-1 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-blue-600" /><button type="submit" disabled={loading || !question.trim()} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Gửi</button></form>
  </section>;
}

function ToolButton({ title, onClick, children, deviceKind, switchModel }: { title: string; onClick: () => void; children: React.ReactNode; deviceKind?: DeviceKind; switchModel?: '1900' | '2950' | '3550' }) {
  return <button title={title} onClick={onClick} draggable={!!deviceKind} onDragStart={e => { if (deviceKind) e.dataTransfer.setData('application/x-routersim-device', deviceKind); if (switchModel) e.dataTransfer.setData('application/x-routersim-model', switchModel); }} className="flex h-10 min-w-10 appearance-none items-center justify-center border-0 rounded-none bg-transparent px-0.5 text-xl shadow-none hover:brightness-110 active:translate-y-px">{children}</button>;
}
function PortHotspot({ name, x, y, w, h, connectedTo, onChoose, onInspect }: { name: string; x: number; y: number; w: number; h: number; connectedTo?: string; onChoose: () => void; onDisconnect: () => void; onInspect: () => void }) {
  return <div className="absolute" style={{ left: x, top: y, width: w, height: h }}>
    <button data-guide-port={name} title={connectedTo ? `${name} → ${connectedTo}` : name} aria-label={connectedTo ? `${name} connected to ${connectedTo}` : `${name} · click to connect`} onClick={connectedTo ? onInspect : onChoose} className="relative h-full w-full border border-transparent hover:outline hover:outline-1 hover:outline-yellow-300">
      {connectedTo && name.startsWith('F') && <img src="/routersim/ethernet-connected.png" alt="Connected" className="pointer-events-none absolute left-0 top-0 h-8 w-[30px] object-contain" />}
    </button>
  </div>;
}

function MenuItem({ label, onClick, shortcut, disabled = false }: { label: string; onClick: () => void; shortcut?: string; disabled?: boolean }) {
  return <button data-guide-item={label} onClick={onClick} disabled={disabled} className="flex w-full items-center justify-between gap-5 whitespace-nowrap px-3 py-1 text-left hover:bg-[#008000] hover:text-white disabled:text-slate-400 disabled:hover:bg-transparent"><span>{label}</span>{shortcut && <span className="text-[10px] opacity-80">{shortcut}</span>}</button>;
}
function MenuSubmenu({ label, children, scroll = false }: { label: string; children: React.ReactNode; scroll?: boolean }) {
  return <div className="rs-submenu relative"><button className="flex w-full items-center justify-between gap-5 whitespace-nowrap px-3 py-1 text-left hover:bg-[#008000] hover:text-white">{label}<span>▸</span></button><div className={`rs-submenu-panel absolute left-full top-0 z-50 hidden min-w-44 border border-slate-600 bg-[#f0f0f0] p-1 text-black shadow-lg ${scroll ? 'max-h-[70vh] overflow-y-auto' : ''}`}>{children}</div></div>;
}
function LabsMenu({ labs, onPreset, onLibrary, onTeacher }: { labs: LabLibraryItem[]; onPreset: (preset: LabPreset) => void; onLibrary: (lab: LabLibraryItem) => void; onTeacher: (lab: TeacherLab) => void }) {
  const categories = [...new Set(labs.map(lab => lab.category))];
  return <MenuSubmenu label="Labs"><MenuSubmenu label="Bài tập của thầy COMP303" scroll>{TEACHER_LABS.map(lab => <MenuItem key={lab.id} label={lab.title} onClick={() => onTeacher(lab)} />)}</MenuSubmenu><MenuSubmenu label="COMP303 practice">{PRESETS.filter(p => p !== 'blank').map(p => <MenuItem key={p} label={PRESET_LABELS[p]} onClick={() => onPreset(p)} />)}</MenuSubmenu>{categories.map(category => <MenuSubmenu key={category} label={category} scroll>{labs.filter(lab => lab.category === category).map((lab, index) => <MenuItem key={`${lab.name}-${index}`} label={lab.name} onClick={() => onLibrary(lab)} />)}</MenuSubmenu>)}</MenuSubmenu>;
}
function WindowTitle({ title, onClose, onMinimize, onMaximize, onDragStart, onDragMove, onDragEnd }: {
  title: string;
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const drag = React.useRef<{ pointerId: number; x: number; y: number; left: number; top: number; width: number; height: number; parent: HTMLElement } | null>(null);
  const start = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    if (onDragStart) { onDragStart(event); return; }
    const parent = event.currentTarget.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, parent };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (onDragMove) { onDragMove(event); return; }
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.parent.style.position = 'fixed';
    current.parent.style.left = `${Math.max(0, Math.min(window.innerWidth - current.width, current.left + event.clientX - current.x))}px`;
    current.parent.style.top = `${Math.max(0, Math.min(window.innerHeight - Math.min(current.height, 80), current.top + event.clientY - current.y))}px`;
    current.parent.style.right = 'auto';
    current.parent.style.bottom = 'auto';
    current.parent.style.margin = '0';
  };
  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    if (onDragEnd) { onDragEnd(event); return; }
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="flex h-8 shrink-0 cursor-default items-center border-b border-[#bcbcbc] bg-[#eef3f9] pl-2 text-[14px] text-black select-none" style={{ touchAction: 'none' }}>
    <img src="/routersim/app.ico" alt="" className="mr-2 h-4 w-4 shrink-0" />
    <span className="min-w-0 flex-1 truncate">{title}</span>
    <NativeWindowButtons title={title} onClose={onClose} onMinimize={onMinimize} onMaximize={onMaximize} />
  </div>;
}
function NativeWindowButtons({ title, onClose, onMinimize, onMaximize }: { title: string; onClose: () => void; onMinimize?: () => void; onMaximize?: () => void }) {
  return <div className="flex h-full shrink-0" onPointerDown={event => event.stopPropagation()}>
    {onMinimize && <button type="button" title="Thu nhỏ" aria-label={`Thu nhỏ ${title}`} disabled={!onMinimize} onClick={onMinimize} className="h-full w-10 text-base hover:bg-[#dce1e7] disabled:opacity-30">−</button>}
    {onMaximize && <button type="button" title="Phóng to" aria-label={`Phóng to ${title}`} disabled={!onMaximize} onClick={onMaximize} className="h-full w-10 text-base hover:bg-[#dce1e7] disabled:opacity-30">□</button>}
    <button type="button" title="Đóng" aria-label={`Đóng ${title}`} onClick={onClose} className="h-full w-10 text-lg hover:bg-[#c42b1c] hover:text-white">×</button>
  </div>;
}

function Field({ label, value, onChange, asSelect }: { label: string; value: string; onChange: (value: string) => void; asSelect?: Array<{ id: string; label: string }> }) {
  return <label data-guide-field={label} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2"><span>{label}</span>{asSelect ? <select value={value} onChange={e => onChange(e.target.value)} className="border border-slate-500 bg-white px-1 py-0.5">{asSelect.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <input value={value} onChange={e => onChange(e.target.value)} className="min-w-0 border border-slate-500 bg-white px-1 py-0.5" />}</label>;
}
function IpField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const inputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const parts = value ? value.split('.').slice(0, 4) : [];
  while (parts.length < 4) parts.push('');
  const update = (index: number, octet: string) => { const next = [...parts]; next[index] = octet; onChange(next.join('.')); };
  const focus = (index: number) => { const input = inputs.current[index]; input?.focus(); input?.select(); };
  return <div data-guide-field={label} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-center gap-1 sm:gap-2"><span>{label}</span><span className="flex items-center gap-0.5">{parts.map((part, index) => <React.Fragment key={index}><input ref={input => { inputs.current[index] = input; }} aria-label={`${label} octet ${index + 1}`} inputMode="numeric" maxLength={3} value={part} onFocus={event => event.currentTarget.select()} onChange={event => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 3);
    update(index, digits);
    if (digits.length === 3 && index < 3 && Number(digits) <= 255) requestAnimationFrame(() => focus(index + 1));
  }} onKeyDown={event => {
    if ((event.key === '.' || event.key === 'Decimal' || event.key === 'Enter') && index < 3) { event.preventDefault(); focus(index + 1); }
    else if (event.key === 'ArrowRight' && event.currentTarget.selectionStart === part.length && index < 3) { event.preventDefault(); focus(index + 1); }
    else if (event.key === 'ArrowLeft' && event.currentTarget.selectionStart === 0 && index > 0) { event.preventDefault(); focus(index - 1); }
    else if (event.key === 'Backspace' && !part && index > 0) { event.preventDefault(); focus(index - 1); }
  }} onPaste={event => {
    const pasted = event.clipboardData.getData('text').trim();
    if (!/^\d{1,3}(?:\.\d{1,3}){1,3}$/.test(pasted)) return;
    event.preventDefault();
    const octets = pasted.split('.');
    if (octets.some(octet => Number(octet) > 255)) return;
    const next = [...parts];
    octets.slice(0, 4 - index).forEach((octet, offset) => { next[index + offset] = octet; });
    onChange(next.join('.'));
    requestAnimationFrame(() => focus(Math.min(3, index + octets.length - 1)));
  }} className="w-11 border border-slate-500 bg-white px-1 py-0.5 text-center" />{index < 3 && <span>.</span>}</React.Fragment>)}</span></div>;
}
