import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  cableIsActive, createPreset, ipNumber, lanPeers, makeDevice, networkInfo, PRESET_LABELS, simulatePing,
  type Device, type DeviceKind, type Endpoint, type LabPreset, type Port, type Topology,
} from '../../features/network-lab/model';
import { importRsm } from '../../features/network-lab/importRsm';

const WIDTH = 1040;
const HEIGHT = 620;
const PRESETS = Object.keys(PRESET_LABELS) as LabPreset[];
const PICTURES: Record<DeviceKind, string> = {
  pc: '/routersim/host.png', switch: '/routersim/switch.png', router: '/routersim/router.png', netconnect: '/routersim/netconnect_up.png',
};
function pictureFor(device: Device): string {
  return device.kind === 'switch' && device.switchModel && device.switchModel !== '2950'
    ? `/routersim/switch${device.switchModel}.png` : PICTURES[device.kind];
}
const PICTURE_SIZE: Record<DeviceKind, { width: number; height: number }> = {
  pc: { width: 49, height: 36 }, switch: { width: 156, height: 22 }, router: { width: 142, height: 28 }, netconnect: { width: 47, height: 36 },
};

type Menu = 'File' | 'Edit' | 'View' | 'Insert' | 'Tools' | 'Help' | null;
type ConsoleMenu = 'File' | 'Edit' | 'View' | 'Tools' | 'Help' | null;
type ConsoleMode = 'user' | 'privileged' | 'config' | 'interface' | 'rip';
type Popup = { deviceId: string; x: number; y: number } | null;
type HostDraft = { name: string; ip: string; mask: string; gateway: string };
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

function loadNewTab(id: string | null): { preset: LabPreset; topology: Topology; loadedNetworkName: string | null } | null {
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

function dot(device: Device, port: string): { x: number; y: number } {
  const index = Math.max(0, device.ports.findIndex(item => item.name === port));
  if (device.kind === 'pc' || device.kind === 'netconnect') return { x: device.x + 25, y: device.y + 42 };
  if (device.kind === 'switch') return { x: device.x + 13 + index * 11, y: device.y + 32 };
  return { x: device.x + 22 + index * 31, y: device.y + 39 };
}

function buttonStyle(active = false): React.CSSProperties {
  return {
    border: active ? '1px inset #7289a7' : '1px solid transparent',
    background: active ? '#c9dbf4' : 'transparent',
  };
}

export const RouterSimPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const subjectId = params.get('subject');
  const newTabId = params.get('new');
  const [tabSnapshot] = useState(() => loadNewTab(newTabId));
  const [minimized, setMinimized] = useState(false);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [preset, setPreset] = useState<LabPreset>(tabSnapshot?.preset ?? 'two-routers');
  const [loadedNetworkName, setLoadedNetworkName] = useState<string | null>(tabSnapshot?.loadedNetworkName ?? null);
  const [labLibrary, setLabLibrary] = useState<LabLibraryItem[]>([]);
  const [topology, setTopology] = useState<Topology>(() => tabSnapshot?.topology ?? loadPreset('two-routers'));
  const [menu, setMenu] = useState<Menu>(null);
  const [popup, setPopup] = useState<Popup>(null);
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null);
  const [pending, setPending] = useState<Endpoint | null>(null);
  const [cableCursor, setCableCursor] = useState<{ x: number; y: number } | null>(null);
  const [dceEnd, setDceEnd] = useState<'first' | 'second' | null>(null);
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
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<string[]>(['Press RETURN to get started!']);
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
  const consoleDragRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; x: number; y: number; clientX: number; clientY: number } | null>(null);
  const undoStack = useRef<Topology[]>([topology]);
  const skipUndoRecord = useRef(false);
  const clipboardDevice = useRef<Device | null>(null);

  const selected = topology.devices.find(item => item.id === selectedId);
  const consoleDevice = topology.devices.find(item => item.id === consoleId);
  const hostConfig = topology.devices.find(item => item.id === hostConfigId && item.kind === 'pc');
  const popupDevice = topology.devices.find(item => item.id === popup?.deviceId);
  const occupied = useMemo(() => new Set(topology.cables.flatMap(c => [`${c.a.deviceId}:${c.a.port}`, `${c.b.deviceId}:${c.b.port}`])), [topology.cables]);
  useEffect(() => {
    if (newTabId) sessionStorage.setItem(`network-lab-tab:${newTabId}`, JSON.stringify({ preset, topology, loadedNetworkName }));
    else localStorage.setItem(`network-lab-v1:${preset}`, JSON.stringify(topology));
  }, [newTabId, preset, topology, loadedNetworkName]);
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
    setPreset(next); setLoadedNetworkName(null); setTopology(loadPreset(next)); setMenu(null); setPopup(null); setCanvasMenu(null); setPending(null); setDceEnd(null);
    setConsoleId(null); setHostConfigId(null); setSelectedId(null); setPing(null);
    setSourceId('pc1'); setPingTarget(next === 'two-routers' ? '192.168.1.150' : '');
    setStatus(`Opened ${PRESET_LABELS[next]}.`);
  };
  const openLibraryLab = (lab: LabLibraryItem) => {
    const data = structuredClone(lab.topology);
    setPreset('blank'); setLoadedNetworkName(lab.name); setTopology(data);
    setMenu(null); setCanvasMenu(null); setPopup(null); setPending(null); setConsoleId(null); setSelectedId(null); setPing(null);
    setSourceId(data.devices.find(d => d.kind === 'pc')?.id || '');
    setPingTarget(data.devices.filter(d => d.kind === 'pc').at(-1)?.ports[0]?.ip || '');
    setStatus(`Opened RouterSim lab: ${lab.name}.`);
  };
  const addDeviceAt = (kind: DeviceKind, position?: { x: number; y: number }, switchModel: '1900' | '2950' | '3550' = '2950') => {
    const prefix = kind === 'pc' ? 'pc' : kind === 'router' ? 'r' : kind === 'netconnect' ? 'net' : 'sw';
    let num = 1;
    while (topology.devices.some(item => item.id === `${prefix}${num}`)) num++;
    const id = `${prefix}${num}`;
    const count = topology.devices.length;
    const device = makeDevice(id, kind, kind === 'pc' ? `Host ${num}` : kind === 'router' ? `2600 Router ${num}` : kind === 'netconnect' ? `Net Connect ${num}` : `${switchModel} Switch ${num}`, position?.x ?? 70 + (count % 4) * 225, position?.y ?? 100 + Math.floor(count / 4) * 145, switchModel);
    setTopology(old => ({ ...old, devices: [...old.devices, device] }));
    setSelectedId(id); setMenu(null); setStatus(`${device.name} inserted. Drag it to position.`);
  };
  const addDevice = (kind: DeviceKind) => addDeviceAt(kind);
  const deleteSelected = () => {
    if (!selectedId) return;
    setTopology(old => ({ devices: old.devices.filter(d => d.id !== selectedId), cables: old.cables.filter(c => c.a.deviceId !== selectedId && c.b.deviceId !== selectedId) }));
    setSelectedId(null); setPopup(null); setConsoleId(null); setPing(null);
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
    setTopology({ devices: [], cables: [] }); setSelectedId(null); setPending(null);
    setMenu(null); setStatus('Network Visualizer cleared.');
  };
  const startPractice = () => {
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
    if (occupied.has(key)) { setStatus('This port already has a cable. Disconnect it before connecting another.'); setPopup(null); return; }
    if (!pending) {
      setPending(point);
      setDceEnd('first');
      const source = topology.devices.find(device => device.id === point.deviceId);
      if (source) setCableCursor(dot(source, point.port));
      setStatus(`Connect ${point.port} to a port on another device.`);
    }
    else if (pending.deviceId === point.deviceId) { setPending(null); setCableCursor(null); setDceEnd(null); setStatus('Cable canceled.'); }
    else {
      const serial = pending.port.startsWith('S') || point.port.startsWith('S');
      if (serial && dceEnd === null) { setStatus('Choose which end of the serial cable is DCE first.'); setPopup(null); return; }
      setTopology(old => ({ ...old, cables: [...old.cables, { id: `c${Date.now()}`, a: pending, b: point, ...(serial ? { dce: dceEnd === 'second' ? point : pending } : {}) }] }));
      setPending(null); setCableCursor(null); setDceEnd(null); setStatus(serial ? 'Serial cable connected. Set clock rate on the DCE interface.' : 'Cable connected.'); setPing(null);
    }
    setPopup(null);
  };
  const disconnect = (point: Endpoint) => {
    setTopology(old => ({ ...old, cables: old.cables.filter(c => !(c.a.deviceId === point.deviceId && c.a.port === point.port) && !(c.b.deviceId === point.deviceId && c.b.port === point.port)) }));
    setPopup(null); setPing(null); setStatus('Cable disconnected.');
  };
  const saveFile = () => {
    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `routersim-${preset}.json`; anchor.click();
    URL.revokeObjectURL(url); setMenu(null); setStatus('Network saved as JSON.');
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const source = await file.text();
      const imported = file.name.toLowerCase().endsWith('.rsm') ? importRsm(source) : null;
      const data = imported?.topology || JSON.parse(source) as Topology;
      if (!Array.isArray(data.devices) || !Array.isArray(data.cables) || !data.devices.every(d => Array.isArray(d.ports) && ['pc', 'router', 'switch', 'netconnect'].includes(d.kind))) throw Error('Invalid topology');
      setPreset('blank'); setLoadedNetworkName(imported?.name || file.name); setTopology(data); setStatus(`Opened ${file.name}.`); setMenu(null); setPing(null);
      setSourceId(data.devices.find(d => d.kind === 'pc')?.id || '');
      setPingTarget(data.devices.filter(d => d.kind === 'pc').at(-1)?.ports[0]?.ip || '');
    } catch { setStatus('Could not open this RouterSim JSON/RSM file.'); }
  };
  const routesFor = (device: Device): string[] => {
    const direct = device.ports.flatMap(port => {
      const net = port.enabled ? networkInfo(port.ip, port.mask) : null;
      return net ? [`C    ${net.network}/${net.prefix} is directly connected, ${port.name}`] : [];
    });
    const seenNetworks = new Set(direct.map(line => line.trim().split(/\s+/)[1]));
    const learned: string[] = [];
    const seenRouters = new Set([device.id]);
    const queue: Array<{ router: Device; firstHop: string }> = [{ router: device, firstHop: '' }];
    while (queue.length) {
      const { router, firstHop } = queue.shift()!;
      for (const port of router.ports) {
        const localNet = networkInfo(port.ip, port.mask);
        if (!port.enabled || !localNet || !router.ripNetworks.includes(localNet.network)) continue;
        for (const peer of lanPeers(topology, { deviceId: router.id, port: port.name })) {
          const neighbor = topology.devices.find(d => d.id === peer.deviceId);
          const neighborPort = neighbor?.ports.find(p => p.name === peer.port);
          const neighborNet = neighborPort && networkInfo(neighborPort.ip, neighborPort.mask);
          if (!neighbor || neighbor.kind !== 'router' || seenRouters.has(neighbor.id) || !neighborPort?.enabled || !neighborNet || neighborNet.network !== localNet.network || !neighbor.ripNetworks.includes(localNet.network)) continue;
          seenRouters.add(neighbor.id); const hop = firstHop || neighbor.name;
          queue.push({ router: neighbor, firstHop: hop });
          for (const advertised of neighbor.ports) {
            const remote = networkInfo(advertised.ip, advertised.mask);
            if (!advertised.enabled || !remote || !neighbor.ripNetworks.includes(remote.network)) continue;
            const key = `${remote.network}/${remote.prefix}`;
            if (!seenNetworks.has(key)) { seenNetworks.add(key); learned.push(`R    ${key} via ${hop}`); }
          }
        }
      }
    }
    return [...direct, ...learned];
  };
  const prompt = () => {
    if (!consoleDevice) return '';
    if (consoleDevice.kind === 'pc') return `${consoleDevice.name}>`;
    const base = consoleDevice.name.replace(/\s/g, '') || 'Router';
    return consoleMode === 'user' ? `${base}>` : consoleMode === 'privileged' ? `${base}#` : `${base}(${consoleMode === 'interface' ? 'config-if' : consoleMode === 'rip' ? 'config-router' : 'config'})#`;
  };
  const runCommand = () => {
    if (!consoleDevice) return;
    const input = command.trim();
    if (!input) { setLines(old => [...old, prompt()]); return; }
    setCommandHistory(old => [...old.slice(-49), input]);
    setCommandHistoryIndex(-1);
    const typed = input.toLowerCase().replace(/\s+/g, ' ');
    const cmd = typed.replace(/^sh\b/, 'show').replace(/^show run$/, 'show running-config').replace(/^show start$/, 'show startup-config').replace(/^show ip int br(?:ief)?$/, 'show ip interface brief').replace(/^show int br(?:ief)?$/, 'show ip interface brief').replace(/^config t$/, 'configure terminal').replace(/^copy run start$/, 'copy running-config startup-config');
    const output: string[] = [];
    const runningConfig = () => [
      'Building configuration...', 'Current configuration:', '!', `hostname ${consoleDevice.name.replace(/\s/g, '')}`,
      ...consoleDevice.ports.flatMap(port => ['!', `interface ${port.name}`, ...(port.ip ? [` ip address ${port.ip} ${port.mask}`] : [' no ip address']), ...(port.clockRate ? [` clock rate ${port.clockRate}`] : []), port.enabled ? ' no shutdown' : ' shutdown']),
      ...(consoleDevice.ripNetworks.length ? ['!', 'router rip', ...consoleDevice.ripNetworks.map(net => ` network ${net}`)] : []), '!', 'end',
    ];
    const interfaces = () => consoleDevice.ports.flatMap(port => [`${port.name} is ${port.enabled ? 'up' : 'administratively down'}, line protocol is ${port.enabled && occupied.has(`${consoleDevice.id}:${port.name}`) ? 'up' : 'down'}`, `  Internet address is ${port.ip || 'unassigned'}${port.ip ? `/${networkInfo(port.ip, port.mask)?.prefix ?? ''}` : ''}`, `  MTU 1500 bytes${port.clockRate ? `, clock rate ${port.clockRate}` : ''}`]);
    if (consoleDevice.kind === 'pc') {
      if (cmd === 'ipconfig' || cmd === 'ipconfig /all') output.push('Ethernet adapter Local Area Connection:', '', ...(cmd.endsWith('/all') ? ['   Description . . . . . . : RouterSim Host Adapter', '   DHCP Enabled. . . . . . : No'] : []), `   IP Address . . . . . . : ${consoleDevice.ports[0].ip || '0.0.0.0'}`, `   Subnet Mask  . . . . . : ${consoleDevice.ports[0].mask}`, `   Default Gateway . . . : ${consoleDevice.gateway || '0.0.0.0'}`);
      else if (cmd.startsWith('ping ')) {
        const result = simulatePing(topology, consoleDevice.id, input.split(/\s+/)[1] || '');
        output.push(`Pinging ${input.split(/\s+/)[1]}...`, result.ok ? 'Reply from destination: bytes=32 time<1ms TTL=128' : 'Request timed out.', result.ok ? 'Packets: Sent = 1, Received = 1, Lost = 0' : `Packets: Sent = 1, Received = 0, Lost = 1`, `Why: ${result.why}`);
      } else if (cmd === 'help' || cmd === '?') output.push('Commands: ipconfig, ipconfig /all, ping IP');
      else output.push('Bad command or file name. Type help.');
    } else if (consoleDevice.kind === 'router') {
      if (cmd === 'enable' || cmd === 'ena' || cmd === 'en') { setConsoleMode('privileged'); }
      else if (cmd === 'disable') setConsoleMode('user');
      else if (cmd === 'conf t' || cmd === 'configure terminal') { setConsoleMode('config'); output.push('Enter configuration commands, one per line.'); }
      else if (cmd === 'end') setConsoleMode('privileged');
      else if (cmd === 'exit') setConsoleMode(consoleMode === 'interface' || consoleMode === 'rip' ? 'config' : 'privileged');
      else if (/^hostname [a-z0-9_-]+$/i.test(input) && consoleMode === 'config') updateDevice(consoleDevice.id, d => ({ ...d, name: input.split(' ')[1] }));
      else if (/^(int|interface)\s+/.test(cmd) && (consoleMode === 'config' || consoleMode === 'interface')) {
        const port = input.split(/\s+/).slice(1).join('').toUpperCase().replace(/^FASTETHERNET/, 'F').replace(/^FA/, 'F').replace(/^SERIAL/, 'S');
        if (consoleDevice.ports.some(p => p.name === port)) { setConsolePort(port); setConsoleMode('interface'); }
        else output.push('% Invalid interface. Use F0/0, F0/1, S0/0, S0/1.');
      } else if (/^ip (add|address)\s+/.test(cmd) && consoleMode === 'interface') {
        const [, , ip, mask] = input.split(/\s+/);
        if (networkInfo(ip, mask)) updatePort(consoleDevice.id, consolePort, { ip, mask });
        else output.push('% Invalid IP address or subnet mask.');
      } else if ((cmd === 'no ip add' || cmd === 'no ip address') && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { ip: '' });
      else if ((cmd === 'no shut' || cmd === 'no shutdown') && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { enabled: true });
      else if (cmd === 'shutdown' && consoleMode === 'interface') updatePort(consoleDevice.id, consolePort, { enabled: false });
      else if (cmd.startsWith('clock rate ') && consoleMode === 'interface') {
        const rate = Number(cmd.split(' ').at(-1));
        const isDce = topology.cables.some(link => link.dce?.deviceId === consoleDevice.id && link.dce?.port === consolePort);
        if (!consolePort.startsWith('S')) output.push('% Clock rate applies to a serial interface.');
        else if (!isDce) output.push('% This interface is not the DCE end of a connected serial cable.');
        else if (!Number.isInteger(rate) || rate <= 0) output.push('% Invalid clock rate. Example: clock rate 64000');
        else { updatePort(consoleDevice.id, consolePort, { clockRate: rate }); output.push(`Clock rate ${rate} set on ${consolePort}.`); }
      }
      else if (cmd === 'router rip' && (consoleMode === 'config' || consoleMode === 'rip')) setConsoleMode('rip');
      else if (/^(no )?network\s+/.test(cmd) && consoleMode === 'rip') {
        const net = cmd.split(' ').at(-1)!;
        if (ipNumber(net) === null) output.push('% Invalid network address.');
        else updateDevice(consoleDevice.id, d => ({ ...d, ripNetworks: cmd.startsWith('no ') ? d.ripNetworks.filter(n => n !== net) : [...new Set([...d.ripNetworks, net])] }));
      } else if (cmd === 'show ip route') output.push('Codes: C - connected, R - RIP', 'Gateway of last resort is not set', ...(routesFor(consoleDevice).length ? routesFor(consoleDevice) : ['No routes.']));
      else if (cmd === 'show ip interface brief') output.push('Interface       IP-Address      OK? Method Status                Protocol', ...consoleDevice.ports.map(p => `${p.name.padEnd(15)} ${String(p.ip || 'unassigned').padEnd(15)} YES manual ${p.enabled ? 'up'.padEnd(21) : 'administratively down'} ${p.enabled && occupied.has(`${consoleDevice.id}:${p.name}`) ? 'up' : 'down'}`));
      else if (cmd === 'show interfaces' || cmd === 'show interface') output.push(...interfaces());
      else if (/^show (interfaces?|int)\s+/.test(cmd)) { const name = cmd.split(' ').slice(2).join('').toUpperCase().replace(/^FASTETHERNET/, 'F').replace(/^FA/, 'F').replace(/^SERIAL/, 'S'); const port = consoleDevice.ports.find(p => p.name === name); if (port) output.push(`${port.name} is ${port.enabled ? 'up' : 'administratively down'}, line protocol is ${port.enabled && occupied.has(`${consoleDevice.id}:${port.name}`) ? 'up' : 'down'}`, `  Internet address is ${port.ip || 'unassigned'}`, `  MTU 1500 bytes${port.clockRate ? `, clock rate ${port.clockRate}` : ''}`); else output.push('% Invalid interface.'); }
      else if (cmd === 'show running-config' || cmd === 'show startup-config') output.push(...runningConfig());
      else if (cmd === 'show ip protocols') output.push(consoleDevice.ripNetworks.length ? 'Routing Protocol is "rip"' : 'Routing Protocol is not configured', ...consoleDevice.ripNetworks.map(net => `  Routing for Networks: ${net}`));
      else if (cmd === 'show version') output.push('RouterSim Network Visualizer · Cisco 2600 command practice', `${consoleDevice.name} uptime is simulated`, `${consoleDevice.ports.length} network interfaces`);
      else if (cmd === 'show arp') output.push('Protocol  Address          Interface', ...consoleDevice.ports.filter(p => p.ip).map(p => `Internet  ${p.ip.padEnd(16)} ${p.name}`));
      else if (cmd === 'show cdp neighbors') output.push('Device ID          Local Intrfce      Port ID', ...topology.cables.flatMap(cable => { const end = cable.a.deviceId === consoleDevice.id ? cable.a : cable.b.deviceId === consoleDevice.id ? cable.b : null; if (!end) return []; const peer = end === cable.a ? cable.b : cable.a; const device = topology.devices.find(d => d.id === peer.deviceId); return device && device.kind !== 'pc' ? [`${device.name.padEnd(18)} ${end.port.padEnd(18)} ${peer.port}`] : []; }));
      else if (cmd === 'show ?') output.push('arp  cdp  interfaces  ip  running-config  startup-config  version');
      else if (cmd === 'show ip ?') output.push('interface  protocols  route');
      else if (cmd === 'interface ?' && consoleMode === 'config') output.push(consoleDevice.ports.map(p => p.name).join('  '));
      else if (cmd === 'wr' || cmd === 'write memory' || cmd === 'copy running-config startup-config') output.push('Building configuration...', '[OK]');
      else if (cmd === 'help' || cmd === '?') output.push('enable  configure terminal  interface  router rip  show  copy  write memory  exit', 'Use show ? or show ip ? for available display commands.');
      else output.push('% Invalid input detected. Type help for supported commands.');
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
    setLines(old => [...old.slice(-100), `${prompt()}${input}`, ...output]);
    setCommand('');
  };
  const openConsole = (device: Device) => {
    setConsoleId(device.id); setConsoleMode('user'); setLines(device.kind === 'pc' ? ['Microsoft Windows [Version 5.1]', '(C) Microsoft Corporation. All rights reserved.'] : [`${device.kind === 'switch' ? 'Switch' : 'Router'} Con0 is now available`, 'Press RETURN to get started!']);
    setCommand(''); setCommandHistoryIndex(-1); setPopup(null); setSelectedId(device.id); setConsoleMenu(null); setConsoleMinimized(false); setConsoleMaximized(false); setConsolePosition(null);
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
  const saveConsoleLog = () => {
    if (!consoleDevice) return;
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `${consoleDevice.name}-console.txt`; a.click(); URL.revokeObjectURL(url);
    setConsoleMenu(null);
  };
  const openHostConfig = (device: Device) => {
    setHostConfigId(device.id);
    setHostDraft({ name: device.name, ip: device.ports[0].ip, mask: device.ports[0].mask, gateway: device.gateway });
    setPopup(null);
  };
  const saveHostConfig = () => {
    if (!hostConfig || !hostDraft) return;
    if (hostDraft.ip && !networkInfo(hostDraft.ip, hostDraft.mask)) { setStatus('Invalid host IP address or subnet mask.'); return; }
    updateDevice(hostConfig.id, device => ({ ...device, name: hostDraft.name, gateway: hostDraft.gateway, ports: device.ports.map(port => port.name === 'Eth0' ? { ...port, ip: hostDraft.ip, mask: hostDraft.mask } : port) }));
    setHostConfigId(null); setHostDraft(null);
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
        setMenu(null); setConsoleMenu(null); setPopup(null); setCanvasMenu(null); setPending(null);
        setShowGuide(false); setShowPreferences(false); setShowDeviceList(false);
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
    {minimized ? <div className="flex h-screen items-end bg-[#e9edf4]"><button onClick={() => setMinimized(false)} className="m-3 flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-white"><img src="/logo.svg" alt="HNUE" className="h-7 w-7" />HNUE · RouterSim Network Visualizer</button></div> : <div className="flex h-screen flex-col overflow-hidden border border-[#b9bec7]">
      <div className="relative flex h-10 shrink-0 items-center border-b border-[#c6c8cd] bg-gradient-to-b from-[#fafafa] to-[#e9e9eb] px-3 text-[13px] text-[#34373b] shadow-sm">
        <div className="z-10 flex items-center gap-2" aria-label="Điều khiển cửa sổ RouterSim">
          <button title="Đóng và về khóa học" aria-label="Đóng RouterSim và về khóa học" onClick={exitLab} className="group flex h-[13px] w-[13px] items-center justify-center rounded-full border border-[#e0443e] bg-[#ff5f57] text-[10px] leading-none text-[#7a201c] shadow-[inset_0_1px_1px_#ffffff99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">×</span></button>
          <button title="Thu nhỏ" aria-label="Thu nhỏ RouterSim" onClick={() => setMinimized(true)} className="group flex h-[13px] w-[13px] items-center justify-center rounded-full border border-[#dba629] bg-[#febc2e] text-[10px] leading-none text-[#805800] shadow-[inset_0_1px_1px_#ffffff99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">−</span></button>
          <button title="Toàn màn hình" aria-label="Bật hoặc tắt toàn màn hình" onClick={toggleFullscreen} className="group flex h-[13px] w-[13px] items-center justify-center rounded-full border border-[#1ba93d] bg-[#28c840] text-[9px] leading-none text-[#17612a] shadow-[inset_0_1px_1px_#ffffff99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">⤢</span></button>
        </div>
        <div className="pointer-events-none absolute inset-x-20 flex min-w-0 items-center justify-center gap-1.5 text-center font-semibold"><img src="/logo.svg" alt="Logo HNUE" className="h-6 w-6 shrink-0" /><span className="truncate">HNUE · RouterSim Network Visualizer</span></div>
        <span className="ml-auto hidden max-w-[25%] truncate pl-3 text-xs text-slate-500 md:block">&lt;{loadedNetworkName || PRESET_LABELS[preset]}&gt;</span>
      </div>
      <div className="relative flex h-7 items-center gap-1 border-b border-slate-400 bg-[#ece9d8] px-1 text-[12px]">
        {(['File', 'Edit', 'View', 'Insert', 'Tools', 'Help'] as const).map(name => <button key={name} onClick={() => setMenu(menu === name ? null : name)} className="px-2 py-0.5 hover:bg-blue-100" style={buttonStyle(menu === name)}>{name}</button>)}
        {menu && <div className="absolute left-1 top-7 z-40 min-w-52 border border-slate-600 bg-[#f5f5f1] p-1 shadow-lg" style={{ marginLeft: `${(['File', 'Edit', 'View', 'Insert', 'Tools', 'Help'] as const).indexOf(menu) * 37}px` }}>
          {menu === 'File' && <><MenuItem label="New..." shortcut="Ctrl+N" onClick={newNetwork} /><MenuItem label="Open..." shortcut="Ctrl+O" onClick={() => { fileRef.current?.click(); setMenu(null); }} /><MenuItem label="Save..." shortcut="Ctrl+S" onClick={saveFile} /><MenuItem label="Print..." shortcut="Ctrl+P" onClick={() => { setMenu(null); window.print(); }} /><div className="my-1 border-t" /><MenuItem label="Close" onClick={exitLab} /></>}
          {menu === 'Edit' && <><MenuItem label="Clear" onClick={clearNetwork} /><MenuItem label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={undoStack.current.length < 2} /><div className="my-1 border-t" /><MenuItem label="Cut" shortcut="Ctrl+X" onClick={cutSelected} disabled={!selected} /><MenuItem label="Copy" shortcut="Ctrl+C" onClick={copySelected} disabled={!selected} /><MenuItem label="Paste" shortcut="Ctrl+V" onClick={pasteDevice} disabled={!clipboardDevice.current} /><MenuItem label="Delete" shortcut="Del" onClick={deleteSelected} disabled={!selected} /></>}
          {menu === 'View' && <><LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} /><MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { openConsole(d); setMenu(null); }} />)}</MenuSubmenu><MenuSubmenu label="Toolbars"><MenuItem label={`${toolbarGroups.file ? '✓ ' : ''}File buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, file: !old.file })); setMenu(null); }} /><MenuItem label={`${toolbarGroups.insert ? '✓ ' : ''}Insert buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, insert: !old.insert })); setMenu(null); }} /><MenuItem label={`${toolbarGroups.tools ? '✓ ' : ''}Tools buttons`} onClick={() => { setToolbarGroups(old => ({ ...old, tools: !old.tools })); setMenu(null); }} /></MenuSubmenu><div className="my-1 border-t" /><MenuItem label={`${showIp ? '✓ ' : ''}IP Addresses`} onClick={() => { setShowIp(!showIp); setMenu(null); }} /><MenuItem label={`${showPort ? '✓ ' : ''}Port Numbers`} onClick={() => { setShowPort(!showPort); setMenu(null); }} /><MenuItem label={`${showHostnames ? '✓ ' : ''}Hostnames`} onClick={() => { setShowHostnames(!showHostnames); setMenu(null); }} /><MenuItem label={`${showTooltips ? '✓ ' : ''}Tooltips`} onClick={() => { setShowTooltips(!showTooltips); setMenu(null); }} /><MenuSubmenu label="Line Thickness">{[1, 2, 3].map(size => <MenuItem key={size} label={`${lineThickness === size ? '✓ ' : ''}${size === 1 ? 'Thin' : size === 2 ? 'Medium' : 'Thick'}`} onClick={() => { setLineThickness(size); setMenu(null); }} />)}</MenuSubmenu></>}
          {menu === 'Insert' && <><MenuItem label="File..." shortcut="Alt+F" onClick={() => { fileRef.current?.click(); setMenu(null); }} /><MenuItem label="Host" shortcut="Alt+H" onClick={() => addDevice('pc')} /><MenuItem label="Net Connect" shortcut="Alt+N" onClick={() => addDevice('netconnect')} /><MenuItem label="Router 2600" shortcut="Alt+R" onClick={() => addDevice('router')} /><MenuItem label="Switch 1900" shortcut="Alt+S" onClick={() => addDeviceAt('switch', undefined, '1900')} /><MenuItem label="Switch 2950" shortcut="Alt+T" onClick={() => addDeviceAt('switch', undefined, '2950')} /><MenuItem label="Switch 3550" shortcut="Alt+U" onClick={() => addDeviceAt('switch', undefined, '3550')} /></>}
          {menu === 'Tools' && <><MenuItem label="Device List" shortcut="Ctrl+D" onClick={() => { setShowDeviceList(true); setMenu(null); }} /><MenuItem label="Net Assessment" shortcut="Ctrl+A" onClick={() => { setShowAssessment(true); setMenu(null); }} /><MenuItem label="Net Configs" shortcut="Ctrl+F" onClick={() => { setShowNetConfigs(true); setMenu(null); }} /><MenuItem label="Net Connect Manager" shortcut="Ctrl+M" onClick={() => { setShowNetConnectManager(true); setMenu(null); }} /><MenuItem label="Net Packet Monitor" shortcut="Ctrl+T" onClick={() => { setShowPing(true); setMenu(null); }} /><div className="my-1 border-t" /><MenuItem label="Preferences" onClick={() => { setShowPreferences(true); setMenu(null); }} /><MenuItem label="Clear Configuration (Start Lab)" onClick={startPractice} /><MenuItem label="Reset selected lab" onClick={() => { localStorage.removeItem(`network-lab-v1:${preset}`); setTopology(createPreset(preset)); setMenu(null); setPing(null); }} /></>}
          {menu === 'Help' && <><MenuItem label="How to use RouterSim" onClick={() => { setShowGuide(true); setMenu(null); }} /><MenuItem label="RouterSim manual (PDF)" onClick={() => { window.open('http://localhost:8000/media/course-slides/comp303_routersim_manual.pdf', '_blank'); setMenu(null); }} /></>}
        </div>}
      </div>
      <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-400 bg-[#f3f3f3] px-1">
        {toolbarGroups.file && <><ToolButton title="New Network (Ctrl+N)" onClick={newNetwork}><img src="/routersim/newnetvis_up.png" alt="New" /></ToolButton><ToolButton title="Open saved network (Ctrl+O)" onClick={() => fileRef.current?.click()}><img src="/routersim/folder_up.png" alt="Open" /></ToolButton><ToolButton title="Save Network (Ctrl+S)" onClick={saveFile}><img src="/routersim/diskette_up.png" alt="Save" /></ToolButton><ToolButton title="Print Network (Ctrl+P)" onClick={() => window.print()}><img src="/routersim/printer_up.png" alt="Print" /></ToolButton><ToolButton title="Delete selected (Del)" onClick={deleteSelected}><img src="/routersim/trash_up.png" alt="Delete" /></ToolButton></>}
        {toolbarGroups.insert && <><ToolButton title="Insert from file" onClick={() => fileRef.current?.click()}><img src="/routersim/insert_up.png" alt="Insert file" /></ToolButton>
        <ToolButton title="Insert Host · click or drag onto canvas" onClick={() => addDevice('pc')} deviceKind="pc"><img src="/routersim/smallhost_up.png" alt="Host" /></ToolButton>
        <ToolButton title="Insert Net Connect · click or drag onto canvas" onClick={() => addDevice('netconnect')} deviceKind="netconnect"><img src="/routersim/netconnect_up.png" alt="Net Connect" /></ToolButton>
        <ToolButton title="Insert Router 2600 · click or drag onto canvas" onClick={() => addDevice('router')} deviceKind="router"><img src="/routersim/2600device_up.png" alt="2600" /></ToolButton>
        <ToolButton title="Insert Switch 1900 · click or drag onto canvas" onClick={() => addDeviceAt('switch', undefined, '1900')} deviceKind="switch" switchModel="1900"><img src="/routersim/1900device_up.png" alt="1900" /></ToolButton>
        <ToolButton title="Insert Switch 2950 · click or drag onto canvas" onClick={() => addDevice('switch')} deviceKind="switch"><img src="/routersim/2950device_up.png" alt="2950" /></ToolButton>
        <ToolButton title="Insert Switch 3550 · click or drag onto canvas" onClick={() => addDeviceAt('switch', undefined, '3550')} deviceKind="switch" switchModel="3550"><img src="/routersim/3550device_up.png" alt="3550" /></ToolButton></>}
        {toolbarGroups.tools && <><ToolButton title="Net Assessment (Ctrl+A)" onClick={() => setShowAssessment(true)}><img src="/routersim/assessment_up.png" alt="Net Assessment" /></ToolButton><ToolButton title="Net Configs (Ctrl+F)" onClick={() => setShowNetConfigs(true)}><img src="/routersim/netconfig_up.png" alt="Net Configs" /></ToolButton><ToolButton title="Net Packet Monitor (Ctrl+T)" onClick={() => setShowPing(true)}><img src="/routersim/netpacket_up.png" alt="Net Packet Monitor" /></ToolButton></>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto" style={{ backgroundColor: canvasColor }}>
        <div ref={canvasRef} className="relative" style={{ width: canvasWidth, height: canvasHeight, backgroundColor: canvasColor }} onPointerMove={e => { if (!pending) return; const rect = e.currentTarget.getBoundingClientRect(); setCableCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top }); }} onClick={() => { setPopup(null); setMenu(null); setCanvasMenu(null); }} onContextMenu={e => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setPopup(null); setCanvasMenu({ x: Math.min(canvasWidth - 190, e.clientX - rect.left), y: Math.min(canvasHeight - 360, e.clientY - rect.top) }); }} onDragOver={e => { if (e.dataTransfer.types.includes('application/x-routersim-device')) e.preventDefault(); }} onDrop={e => { const kind = e.dataTransfer.getData('application/x-routersim-device'); if (!['pc', 'router', 'switch', 'netconnect'].includes(kind)) return; e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); const model = e.dataTransfer.getData('application/x-routersim-model'); addDeviceAt(kind as DeviceKind, { x: Math.max(2, Math.min(canvasWidth - PICTURE_SIZE[kind as DeviceKind].width, e.clientX - rect.left - 25)), y: Math.max(2, Math.min(canvasHeight - 55, e.clientY - rect.top - 20)) }, model === '1900' || model === '3550' ? model : '2950'); }}>
          <svg className="pointer-events-none absolute inset-0" width={canvasWidth} height={canvasHeight}>
            <defs><marker id="routersim-cable-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M 0 0 L 9 4.5 L 0 9 z" fill="#ff3030" /></marker></defs>
            {topology.cables.map(link => {
              const a = topology.devices.find(d => d.id === link.a.deviceId); const b = topology.devices.find(d => d.id === link.b.deviceId);
              if (!a || !b) return null;
              const one = dot(a, link.a.port); const two = dot(b, link.b.port);
              const serial = link.a.port.startsWith('S') || link.b.port.startsWith('S');
              const firstLabel = { x: one.x + (two.x - one.x) * 0.34, y: one.y + (two.y - one.y) * 0.34 - 8 };
              const secondLabel = { x: two.x + (one.x - two.x) * 0.34, y: two.y + (one.y - two.y) * 0.34 - 8 };
              const firstPort = a.ports.find(port => port.name === link.a.port);
              const secondPort = b.ports.find(port => port.name === link.b.port);
              const label = (name: string, port?: Port) => `${showPort ? name : ''}${showPort && showIp && port?.ip ? ' · ' : ''}${showIp && port?.ip ? `${port.ip}/${networkInfo(port.ip, port.mask)?.prefix || ''}` : ''}`;
              const middle = { x: (one.x + two.x) / 2, y: (one.y + two.y) / 2 };
              const serialPath = `M ${one.x} ${one.y} L ${middle.x - 28} ${middle.y} L ${middle.x + 10} ${middle.y - 11} L ${middle.x - 8} ${middle.y + 9} L ${middle.x + 28} ${middle.y} L ${two.x} ${two.y}`;
              return <g key={link.id}>{serial ? <path d={serialPath} fill="none" stroke="#f32525" strokeWidth={lineThickness} strokeDasharray={!cableIsActive(topology, link) ? '6 3' : undefined} /> : <line x1={one.x} y1={one.y} x2={two.x} y2={two.y} stroke="#f0f0f0" strokeWidth={lineThickness} />}<circle cx={one.x} cy={one.y} r="2" fill="white" /><circle cx={two.x} cy={two.y} r="2" fill="white" />{(showPort || showIp) && <><text x={firstLabel.x} y={firstLabel.y} fill={serial ? '#ff3333' : 'white'} fontSize="11">{label(link.a.port, firstPort)}</text><text x={secondLabel.x} y={secondLabel.y} fill={serial ? '#ff3333' : 'white'} fontSize="11">{label(link.b.port, secondPort)}</text></>}</g>;
            })}
            {pending && cableCursor && (() => {
              const source = topology.devices.find(device => device.id === pending.deviceId);
              if (!source) return null;
              const start = dot(source, pending.port);
              return <line data-testid="pending-cable" x1={start.x} y1={start.y} x2={cableCursor.x} y2={cableCursor.y} stroke="#ff3030" strokeWidth="2" markerEnd="url(#routersim-cable-arrow)" />;
            })()}
          </svg>
          {topology.devices.map(device => <div key={device.id} title={showTooltips ? `${device.name} · ${pending ? 'click for connection ports' : 'right-click for ports, double-click for console'}` : undefined} className="absolute select-none text-center text-white" style={{ left: device.x, top: device.y, width: PICTURE_SIZE[device.kind].width, touchAction: 'none', cursor: pending ? 'crosshair' : 'move' }}
            onPointerDown={event => { if (event.button !== 0 || pending) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: device.id, x: device.x, y: device.y, clientX: event.clientX, clientY: event.clientY }; setSelectedId(device.id); }}
            onPointerMove={event => { const drag = dragRef.current; if (!drag || drag.id !== device.id) return; updateDevice(device.id, d => ({ ...d, x: Math.max(3, Math.min(canvasWidth - PICTURE_SIZE[d.kind].width - 4, drag.x + event.clientX - drag.clientX)), y: Math.max(3, Math.min(canvasHeight - 60, drag.y + event.clientY - drag.clientY)) })); }}
            onPointerUp={() => { dragRef.current = null; }}
            onClick={event => { if (!pending) return; event.stopPropagation(); if (device.id === pending.deviceId) return; if (device.kind === 'pc' && !occupied.has(`${device.id}:Eth0`)) choosePort({ deviceId: device.id, port: 'Eth0' }); else setPopup({ deviceId: device.id, x: Math.max(0, Math.min(canvasWidth - (device.kind === 'router' ? 497 : device.kind === 'pc' ? 355 : 430), device.x + 25)), y: Math.max(0, Math.min(canvasHeight - 110, device.y + 30)) }); }}
            onDoubleClick={event => { event.stopPropagation(); if (device.kind === 'netconnect') setShowNetConnectManager(true); else openConsole(device); }}
            onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setSelectedId(device.id); setCanvasMenu(null); setPopup({ deviceId: device.id, x: Math.max(0, Math.min(canvasWidth - (device.kind === 'router' ? 497 : device.kind === 'pc' ? 355 : 430), device.x + 25)), y: Math.max(0, Math.min(canvasHeight - 110, device.y + 30)) }); }}>
            {showHostnames && <div className="mb-1 truncate text-[11px]" style={{ textShadow: '1px 1px black' }}>{device.name}</div>}
            <img src={pictureFor(device)} alt={device.kind} width={PICTURE_SIZE[device.kind].width} height={PICTURE_SIZE[device.kind].height} className={`mx-auto block ${selectedId === device.id ? 'outline outline-1 outline-dotted outline-white' : ''}`} draggable={false} style={{ imageRendering: 'pixelated' }} />
            {showIp && device.kind !== 'switch' && device.kind !== 'netconnect' && <div className="mt-1 whitespace-nowrap text-[10px]">{device.ports.find(p => p.ip)?.ip || 'unassigned'}</div>}
          </div>)}
          {popup && popupDevice && <div className="absolute z-20 text-xs text-black shadow-xl" style={{ left: popup.x, top: popup.y }} onClick={e => e.stopPropagation()}>
            {popupDevice.kind === 'router' ? <div className="relative h-[86px] w-[497px]" style={{ backgroundImage: 'url(/routersim/router-back.png)', imageRendering: 'pixelated' }}>
              {([
                ['S0/1', 77, 7, 98, 28], ['S0/0', 209, 7, 91, 28],
                ['F0/1', 103, 41, 68, 29], ['F0/0', 182, 41, 68, 29],
              ] as const).map(([name, x, y, w, h]) => {
                const cable = topology.cables.find(link => (link.a.deviceId === popupDevice.id && link.a.port === name) || (link.b.deviceId === popupDevice.id && link.b.port === name));
                const peer = cable && (cable.a.deviceId === popupDevice.id && cable.a.port === name ? cable.b : cable.a);
                const peerDevice = topology.devices.find(device => device.id === peer?.deviceId);
                const connectedTo = peer && peerDevice ? `${peerDevice.name} · ${peer.port}` : undefined;
                return <PortHotspot key={name} name={name} x={x} y={y} w={w} h={h} connectedTo={connectedTo} onChoose={() => choosePort({ deviceId: popupDevice.id, port: name })} onDisconnect={() => disconnect({ deviceId: popupDevice.id, port: name })} onInspect={() => setStatus(`${name} connected to ${connectedTo}. Click × on the port to disconnect.`)} />;
              })}
              <button className="absolute bottom-2 left-3 h-5 w-11" title="Close" onClick={() => setPopup(null)} />
              {topology.cables.some(link => link.a.deviceId === popupDevice.id || link.b.deviceId === popupDevice.id) && <div className="absolute left-0 top-full max-w-[497px] border border-slate-500 bg-[#eff8f1] px-2 py-1 text-[11px] text-[#14532d] shadow-sm">{topology.cables.filter(link => link.a.deviceId === popupDevice.id || link.b.deviceId === popupDevice.id).map(link => { const end = link.a.deviceId === popupDevice.id ? link.a : link.b; const peer = end === link.a ? link.b : link.a; return `${end.port} ↔ ${topology.devices.find(device => device.id === peer.deviceId)?.name || peer.deviceId} (${peer.port})`; }).join(' · ')}</div>}
            </div> : popupDevice.kind === 'pc' ? <div className="relative h-[86px] w-[355px] border-[3px] border-[#2189d8] bg-gradient-to-r from-[#78b8e2] to-[#a8d7f7] font-[Tahoma] shadow-inner">
              <strong className="absolute left-3 top-2 text-lg text-white">Host</strong>
              <span className="absolute left-[145px] top-1 text-sm font-bold">F0/0</span>
              <button title={occupied.has(`${popupDevice.id}:Eth0`) ? 'F0/0 · connected' : 'F0/0 · click to connect'} aria-label="F0/0 · connect cable" onClick={() => occupied.has(`${popupDevice.id}:Eth0`) ? setStatus('Host F0/0 is already connected. Click Disconnect to remove its cable.') : choosePort({ deviceId: popupDevice.id, port: 'Eth0' })} className={`absolute left-[149px] top-[27px] grid h-8 w-9 place-items-center border bg-gradient-to-b from-[#dce9f2] to-[#7c9cba] shadow-[inset_1px_1px_0_white] hover:outline hover:outline-2 hover:outline-yellow-400 ${occupied.has(`${popupDevice.id}:Eth0`) ? 'border-2 border-green-500' : 'border-[#333b44]'}`}><span className="grid h-[17px] w-[17px] place-items-center border-2 border-black bg-[#1b4d73] text-[8px] text-white">▣</span></button>
              {occupied.has(`${popupDevice.id}:Eth0`) && <button onClick={() => disconnect({ deviceId: popupDevice.id, port: 'Eth0' })} className="absolute left-[139px] top-[61px] text-[10px] font-bold text-red-700 underline">Disconnect</button>}
              <button className="absolute bottom-1 left-3 rounded border border-slate-600 bg-gradient-to-b from-white to-[#c0cad3] px-4 py-0.5 text-xs" onClick={() => setPopup(null)}>Close</button>
              <button onClick={() => openHostConfig(popupDevice)} className="absolute bottom-1 right-3 rounded border border-slate-700 bg-gradient-to-b from-white to-[#c0cad3] px-3 py-0.5 text-xs font-bold">Configs</button>
            </div> : popupDevice.kind === 'netconnect' ? <div className="w-52 overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] p-2"><strong>{popupDevice.name}</strong><p className="my-1 text-[10px]">Local two-port bridge</p><div className="flex gap-2">{popupDevice.ports.map(port => <button key={port.name} onClick={() => choosePort({ deviceId: popupDevice.id, port: port.name })} className="border border-slate-600 bg-white px-2 py-1">{port.name}</button>)}</div><button className="mt-2 underline" onClick={() => { setPopup(null); setShowNetConnectManager(true); }}>Configure...</button></div> : <div className="relative h-[100px] w-[430px] border-[3px] border-slate-500 bg-gradient-to-b from-[#f5f7f6] via-[#8fa1a4] to-[#4a6168] p-2">
              <div className="mb-1 font-bold text-slate-800">{popupDevice.switchModel || '2950'} Switch · {popupDevice.name}</div>
              <div className="flex flex-wrap gap-1">{popupDevice.ports.map(port => <div key={port.name} className="group relative text-center"><button title={`${port.name} · click to connect`} onClick={() => choosePort({ deviceId: popupDevice.id, port: port.name })} className={`h-5 w-7 border border-slate-700 text-[10px] text-white hover:outline hover:outline-yellow-300 ${occupied.has(`${popupDevice.id}:${port.name}`) ? 'bg-emerald-800' : 'bg-slate-950'}`}>▣</button>{occupied.has(`${popupDevice.id}:${port.name}`) && <button title={`Disconnect ${port.name}`} onClick={() => disconnect({ deviceId: popupDevice.id, port: port.name })} className="absolute -right-1 -top-2 hidden rounded bg-red-600 px-1 text-[9px] text-white group-hover:block">×</button>}<div className="text-[9px] font-bold text-white">{port.name}</div></div>)}</div>
              <button className="absolute bottom-1 right-2 rounded border bg-slate-100 px-2 text-[10px]" onClick={() => setPopup(null)}>Close</button>
            </div>}
          </div>}
          {canvasMenu && <div className="absolute z-20 w-52 border border-slate-600 bg-[#f1f1ef] p-1 text-xs text-black shadow-xl" style={{ left: canvasMenu.x, top: canvasMenu.y }} onClick={e => e.stopPropagation()}>
            <MenuItem label="Open..." onClick={() => { setCanvasMenu(null); fileRef.current?.click(); }} /><MenuItem label="Save..." onClick={saveFile} /><MenuItem label="Print..." onClick={() => { setCanvasMenu(null); window.print(); }} />
            <MenuSubmenu label="Edit"><MenuItem label="Clear" onClick={clearNetwork} /><MenuItem label="Undo" onClick={undo} disabled={undoStack.current.length < 2} /><MenuItem label="Cut" onClick={cutSelected} disabled={!selected} /><MenuItem label="Copy" onClick={copySelected} disabled={!selected} /><MenuItem label="Paste" onClick={pasteDevice} disabled={!clipboardDevice.current} /><MenuItem label="Delete" onClick={deleteSelected} disabled={!selected} /></MenuSubmenu>
            <LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} />
            <MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { setCanvasMenu(null); openConsole(d); }} />)}</MenuSubmenu>
            <MenuItem label={`${showIp ? '✓ ' : ''}IP Addresses`} onClick={() => { setShowIp(!showIp); setCanvasMenu(null); }} /><MenuItem label={`${showPort ? '✓ ' : ''}Port Numbers`} onClick={() => { setShowPort(!showPort); setCanvasMenu(null); }} /><MenuItem label={`${showHostnames ? '✓ ' : ''}Hostnames`} onClick={() => { setShowHostnames(!showHostnames); setCanvasMenu(null); }} /><MenuItem label={`${showTooltips ? '✓ ' : ''}Tooltips`} onClick={() => { setShowTooltips(!showTooltips); setCanvasMenu(null); }} />
            <MenuSubmenu label="Line Thickness">{[1, 2, 3].map(size => <MenuItem key={size} label={`${lineThickness === size ? '✓ ' : ''}${size === 1 ? 'Thin' : size === 2 ? 'Medium' : 'Thick'}`} onClick={() => { setLineThickness(size); setCanvasMenu(null); }} />)}</MenuSubmenu>
            <MenuSubmenu label="Insert"><MenuItem label="Host" onClick={() => { setCanvasMenu(null); addDeviceAt('pc', canvasMenu); }} /><MenuItem label="Net Connect" onClick={() => { setCanvasMenu(null); addDeviceAt('netconnect', canvasMenu); }} /><MenuItem label="Router 2600" onClick={() => { setCanvasMenu(null); addDeviceAt('router', canvasMenu); }} />{(['1900', '2950', '3550'] as const).map(model => <MenuItem key={model} label={`Switch ${model}`} onClick={() => { setCanvasMenu(null); addDeviceAt('switch', canvasMenu, model); }} />)}</MenuSubmenu>
            <MenuItem label="Device List" onClick={() => { setCanvasMenu(null); setShowDeviceList(true); }} /><MenuItem label="Net Assessment" onClick={() => { setCanvasMenu(null); setShowAssessment(true); }} /><MenuItem label="Net Configs" onClick={() => { setCanvasMenu(null); setShowNetConfigs(true); }} /><MenuItem label="Net Connect Manager" onClick={() => { setCanvasMenu(null); setShowNetConnectManager(true); }} /><MenuItem label="Net Packet Monitor" onClick={() => { setCanvasMenu(null); setShowPing(true); }} /><MenuItem label="Preferences" onClick={() => { setCanvasMenu(null); setShowPreferences(true); }} /><MenuItem label="Help" onClick={() => { setCanvasMenu(null); setShowGuide(true); }} />
          </div>}
          {pending && <div className="absolute bottom-2 left-2 rounded bg-yellow-100 px-2 py-1 text-xs text-black">Cable: {topology.devices.find(d => d.id === pending.deviceId)?.name} {pending.port} → click another device, then choose its port. {pending.port.startsWith('S') && <span className="ml-2">DCE end: <button className={`px-1 ${dceEnd === 'first' ? 'font-bold underline' : ''}`} onClick={e => { e.stopPropagation(); setDceEnd('first'); }}>This end</button> / <button className={`px-1 ${dceEnd === 'second' ? 'font-bold underline' : ''}`} onClick={e => { e.stopPropagation(); setDceEnd('second'); }}>Other end</button></span>} <button className="underline" onClick={e => { e.stopPropagation(); setPending(null); setCableCursor(null); setDceEnd(null); }}>Cancel</button></div>}
        </div>
      </div>
      <div className="flex h-7 items-center justify-between border-t border-slate-500 bg-[#ece9d8] px-2 text-[11px]"><span className="truncate">{status}</span><span className="ml-3 whitespace-nowrap">{topology.devices.length} devices · {topology.cables.length} cables</span></div>
    </div>}

    {hostConfig && hostDraft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onMouseDown={() => { setHostConfigId(null); setHostDraft(null); }}><div className="w-[390px] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl" onMouseDown={e => e.stopPropagation()}>
      <WindowTitle title={`Configure ${hostConfig.name}`} onClose={() => setHostConfigId(null)} />
      <div className="space-y-2 p-4 text-xs"><Field label="Host Name" value={hostDraft.name} onChange={value => setHostDraft(d => d && { ...d, name: value })} />
        <label className="flex items-center gap-2"><input type="radio" checked={!hostDraft.ip} onChange={() => setHostDraft(d => d && { ...d, ip: '' })} /> Obtain an IP address automatically</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!!hostDraft.ip} onChange={() => setHostDraft(d => d && { ...d, ip: d.ip || '192.168.1.10' })} /> Use the following IP address:</label>
        <IpField label="IP Address" value={hostDraft.ip} onChange={value => setHostDraft(d => d && { ...d, ip: value })} />
        <IpField label="Subnet" value={hostDraft.mask} onChange={value => setHostDraft(d => d && { ...d, mask: value })} />
        <IpField label="Default Gateway" value={hostDraft.gateway} onChange={value => setHostDraft(d => d && { ...d, gateway: value })} />
        {hostDraft.ip && !networkInfo(hostDraft.ip, hostDraft.mask) && <p className="text-red-700">Check IP address and subnet mask.</p>}
        <div className="flex justify-center gap-5 pt-2"><button className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-8 py-1 font-bold text-white" onClick={saveHostConfig}>OK</button><button className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-6 py-1 font-bold text-white" onClick={() => { setHostConfigId(null); setHostDraft(null); }}>Cancel</button></div>
      </div>
    </div></div>}

    {consoleDevice && consoleMinimized && <button onClick={() => setConsoleMinimized(false)} className="fixed bottom-2 left-3 z-40 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-lg"><img src="/logo.svg" alt="" className="h-4 w-4" />Console for {consoleDevice.name}</button>}
    {consoleDevice && !consoleMinimized && <div data-testid="routersim-console" style={!consoleMaximized && consolePosition ? { left: consolePosition.x, top: consolePosition.y } : undefined} className={`fixed z-40 overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl ${consoleMaximized ? 'inset-0 flex flex-col' : `${consolePosition ? '' : 'bottom-5 right-5'} w-[min(620px,calc(100vw-24px))]`}`}><WindowTitle title={`Console for ${consoleDevice.name}`} onClose={() => { setConsoleId(null); setConsoleMenu(null); }} onMinimize={() => setConsoleMinimized(true)} onMaximize={() => { setConsoleMaximized(!consoleMaximized); requestAnimationFrame(() => consoleInputRef.current?.focus()); }} onDragStart={startConsoleDrag} onDragMove={moveConsoleDrag} onDragEnd={stopConsoleDrag} />
      <div className="relative flex gap-3 border-b border-slate-400 px-2 py-1 text-[11px]">{(['File', 'Edit', 'View', 'Tools', 'Help'] as const).map(name => <button key={name} onClick={() => setConsoleMenu(consoleMenu === name ? null : name)} className="hover:bg-blue-100">{name}</button>)}
        {consoleMenu && <div className="absolute left-1 top-6 z-50 min-w-44 border border-slate-600 bg-[#f1f1ef] p-1 shadow-lg" style={{ marginLeft: `${(['File', 'Edit', 'View', 'Tools', 'Help'] as const).indexOf(consoleMenu) * 31}px` }}>
          {consoleMenu === 'File' && <><MenuItem label="Print..." onClick={() => { setConsoleMenu(null); window.print(); }} /><MenuItem label="Save Console Log..." onClick={saveConsoleLog} /><MenuItem label="Close" onClick={() => { setConsoleId(null); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Edit' && <><MenuItem label="Copy" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(lines.join('\n')).catch(() => setStatus('Could not copy console text.')); else setStatus('Clipboard is unavailable in this browser.'); setConsoleMenu(null); }} /><MenuItem label="Paste" onClick={() => { void navigator.clipboard?.readText().then(value => setCommand(old => old + value)).catch(() => setStatus('Clipboard is unavailable in this browser.')); setConsoleMenu(null); }} /><MenuItem label="Clear Console" onClick={() => { setLines([]); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'View' && <><LabsMenu labs={labLibrary} onPreset={openPreset} onLibrary={openLibraryLab} /><MenuSubmenu label="Console">{topology.devices.filter(d => d.kind !== 'netconnect').map(d => <MenuItem key={d.id} label={d.name} onClick={() => { openConsole(d); setConsoleMenu(null); }} />)}</MenuSubmenu><MenuItem label="Network Visualizer Screen" onClick={() => { setConsoleId(null); setConsoleMenu(null); }} /><MenuItem label="Supported Commands" onClick={() => { setLines(old => [...old, consoleDevice.kind === 'pc' ? 'ipconfig, ipconfig /all, ping IP' : consoleDevice.kind === 'switch' ? 'enable, conf t, hostname, int P1, shutdown, no shut, show interfaces status, show vlan brief, end, wr' : 'enable, conf t, hostname, int F0/0, ip add IP MASK, no shut, clock rate 64000, router rip, network NET, show ip route, end, wr']); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Tools' && <><MenuItem label="Net Packet Monitor" onClick={() => { setShowPing(true); setConsoleMenu(null); }} /><MenuItem label="Net Detective" onClick={() => { setShowAssessment(true); setConsoleMenu(null); }} /></>}
          {consoleMenu === 'Help' && <MenuItem label="RouterSim Help" onClick={() => { setShowGuide(true); setConsoleMenu(null); }} />}
        </div>}
      </div>
      <div className="flex h-10 items-center gap-2 border-b border-slate-400 bg-[#f3f3f3] px-2"><ToolButton title="Print Console" onClick={() => window.print()}><img src="/routersim/printer_up.png" alt="Print" /></ToolButton><button title="Copy Console" onClick={() => void navigator.clipboard?.writeText(lines.join('\n'))} className="border px-2 py-1 text-xs">Copy</button><button title="Paste Command" onClick={() => void navigator.clipboard?.readText().then(value => setCommand(old => old + value))} className="border px-2 py-1 text-xs">Paste</button><ToolButton title="Net Packet Monitor" onClick={() => setShowPing(true)}><img src="/routersim/netpacket_up.png" alt="Packet monitor" /></ToolButton></div>
      <div onClick={() => consoleInputRef.current?.focus()} className={`${consoleMaximized ? 'min-h-0 flex-1' : 'h-72'} overflow-y-auto whitespace-pre-wrap bg-white p-3 font-mono text-[12px] leading-5 text-black`}>{lines.map((line, i) => <div key={i}>{line}</div>)}<div>{prompt()}{command}<span className="animate-pulse">▌</span></div></div>
      <form onSubmit={e => { e.preventDefault(); runCommand(); requestAnimationFrame(() => consoleInputRef.current?.focus()); }} className="flex border-t border-slate-300"><input ref={consoleInputRef} autoFocus aria-label="RouterSim console command" value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => {
        if (e.key === 'ArrowUp' && commandHistory.length) { e.preventDefault(); const next = commandHistoryIndex < 0 ? commandHistory.length - 1 : Math.max(0, commandHistoryIndex - 1); setCommandHistoryIndex(next); setCommand(commandHistory[next]); }
        if (e.key === 'ArrowDown' && commandHistoryIndex >= 0) { e.preventDefault(); const next = commandHistoryIndex + 1; setCommandHistoryIndex(next < commandHistory.length ? next : -1); setCommand(next < commandHistory.length ? commandHistory[next] : ''); }
        if (e.key === 'Tab') { e.preventDefault(); const candidates = consoleDevice.kind === 'pc' ? ['ipconfig', 'ping'] : ['enable', 'configure terminal', 'hostname', 'interface', 'ip address', 'no shutdown', 'clock rate', 'router rip', 'network', 'show ip route', 'show ip interface brief', 'write memory']; const match = candidates.find(item => item.startsWith(command.toLowerCase()) && item !== command.toLowerCase()); if (match) setCommand(match); }
        if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); setLines(old => [...old, `${prompt()}${command}^C`]); setCommand(''); if (consoleDevice.kind !== 'pc') setConsoleMode('privileged'); }
      }} className="min-w-0 flex-1 bg-white px-2 py-1.5 font-mono text-xs text-black outline-none" placeholder="Type a command and press Enter" /><button type="submit" className="border-l border-slate-300 bg-[#f3f4f6] px-3 text-xs">Enter</button></form>
    </div>}

    {showPing && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowPing(false)}><div className="w-[min(760px,calc(100vw-20px))] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Packet Monitor" onClose={() => setShowPing(false)} />
      <div className="border-b border-slate-400 bg-white px-2 py-1 text-xs">File　 View</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-400 bg-white px-3 py-2 text-[10px]"><span><i className="mr-1 inline-block h-2 w-2 bg-pink-400" />Echo Request</span><span><i className="mr-1 inline-block h-2 w-2 bg-violet-600" />Echo Reply</span><span><i className="mr-1 inline-block h-2 w-2 bg-green-500" />Telnet Request</span><span><i className="mr-1 inline-block h-2 w-2 bg-red-500" />RIP Update</span></div>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-400 p-2 text-xs"><Field label="Source Host" value={sourceId} onChange={setSourceId} asSelect={topology.devices.filter(d => d.kind === 'pc').map(d => ({ id: d.id, label: d.name }))} /><Field label="Destination IP" value={pingTarget} onChange={setPingTarget} /><button onClick={runPing} className="border border-slate-500 bg-white px-4 py-1 hover:bg-blue-100">Ping</button><button onClick={() => setPing(null)} className="border border-slate-500 bg-white px-4 py-1 hover:bg-blue-100">Clear</button></div>
      <div className="min-h-48 max-h-[45vh] overflow-auto bg-white p-1 text-xs"><table className="w-full border-collapse text-left"><thead><tr className="bg-[#ece9d8]">{['Network', 'Device', 'Interface', 'Type', 'Time'].map(label => <th key={label} className="border border-slate-400 px-2 py-1">{label}</th>)}</tr></thead><tbody>{ping?.path.map((name, index) => <tr key={`${name}-${index}`}><td className="border border-slate-300 px-2">{PRESET_LABELS[preset]}</td><td className="border border-slate-300 px-2">{name}</td><td className="border border-slate-300 px-2">{index === 0 ? 'OUT' : 'IN'}</td><td className="border border-slate-300 bg-pink-400 px-2">Echo Request</td><td className="border border-slate-300 px-2">{new Date().toLocaleTimeString()}</td></tr>)}{ping?.ok && [...ping.path].reverse().map((name, index) => <tr key={`reply-${name}-${index}`}><td className="border border-slate-300 px-2">{PRESET_LABELS[preset]}</td><td className="border border-slate-300 px-2">{name}</td><td className="border border-slate-300 px-2">{index === 0 ? 'OUT' : 'IN'}</td><td className="border border-slate-300 bg-violet-500 px-2 text-white">Echo Reply</td><td className="border border-slate-300 px-2">{new Date().toLocaleTimeString()}</td></tr>)}</tbody></table>{ping && <div className={`mt-2 p-2 ${ping.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{ping.message} · {ping.why}</div>}</div>
    </div></div>}

    {showAssessment && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowAssessment(false)}><div className="w-[min(600px,calc(100vw-20px))] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Assessment" onClose={() => setShowAssessment(false)} /><div className="max-h-[65vh] overflow-auto bg-white p-4 text-xs"><p className="mb-3 font-bold">Connectivity test for each pair of hosts</p>{topology.devices.filter(d => d.kind === 'pc').flatMap(source => topology.devices.filter(d => d.kind === 'pc' && d.id !== source.id).map(target => { const result = simulatePing(topology, source.id, target.ports[0]?.ip || ''); return <div key={`${source.id}-${target.id}`} className="mb-2 border-b pb-2"><span className={result.ok ? 'font-bold text-green-700' : 'font-bold text-red-700'}>{result.ok ? 'PASS' : 'FAIL'}</span> · {source.name} → {target.name} ({target.ports[0]?.ip || 'unassigned'})<div className="text-slate-600">{result.why}</div></div>; }))}{topology.devices.filter(d => d.kind === 'pc').length < 2 && <p>Add at least two hosts to test the network.</p>}</div></div></div>}

    {showNetConnectManager && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowNetConnectManager(false)}><div className="w-[min(450px,calc(100vw-20px))] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Net Connect Manager" onClose={() => setShowNetConnectManager(false)} /><div className="space-y-3 bg-white p-4 text-xs"><p>Net Connect devices act as local two-port bridges in this browser simulator. The original program's online peer service is separate.</p>{topology.devices.filter(d => d.kind === 'netconnect').map(device => <div key={device.id} className="flex items-center gap-3 border p-2"><img src="/routersim/netconnect_up.png" alt="" className="h-9 w-12 object-contain" /><div><strong>{device.name}</strong><p>{device.ports.map(port => `${port.name}: ${occupied.has(`${device.id}:${port.name}`) ? 'connected' : 'empty'}`).join(' · ')}</p></div></div>)}<button onClick={() => { addDevice('netconnect'); setShowNetConnectManager(false); }} className="border border-slate-500 bg-[#ece9d8] px-3 py-1">Insert Net Connect</button></div></div></div>}

    {showNetConfigs && <div data-testid="routersim-net-configs" className="fixed left-4 top-24 z-40 w-[min(350px,calc(100vw-30px))] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl"><WindowTitle title="Net Configs" onClose={() => setShowNetConfigs(false)} /><div className="max-h-[60vh] overflow-auto border border-slate-400 bg-white p-2 font-mono text-xs"><div className="mb-2 font-bold text-blue-800">▣ {PRESET_LABELS[preset]}</div>{topology.devices.map(device => <details key={device.id} open className="ml-2"><summary className="cursor-pointer font-bold text-slate-800" onClick={() => setSelectedId(device.id)}>{device.kind === 'pc' ? '▣' : device.kind === 'router' ? '▤' : '▥'} {device.name}</summary><div className="ml-5 text-slate-600">{device.kind === 'pc' && <div>Gateway: {device.gateway || 'unassigned'}</div>}{device.ports.map(port => <div key={port.name} className="my-0.5"><span className={port.enabled ? 'text-green-700' : 'text-red-700'}>{port.name} {port.enabled ? 'up' : 'down'}</span><span> · {port.ip || 'unassigned'} / {port.mask}</span>{port.clockRate && <span> · clock {port.clockRate}</span>}</div>)}{device.kind === 'router' && <div>RIP: {device.ripNetworks.join(', ') || 'none'}</div>}</div></details>)}</div></div>}

    {showDeviceList && <div className="fixed left-8 top-16 z-40 w-[265px] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl"><WindowTitle title="Device List" onClose={() => setShowDeviceList(false)} /><div className="max-h-[70vh] space-y-3 overflow-auto bg-white p-3 text-center text-xs">{([['pc', 'Host', '/routersim/host.png', '2950'], ['router', '2600 Router', '/routersim/router.png', '2950'], ['switch', '1900 Switch', '/routersim/switch1900.png', '1900'], ['switch', '2950 Switch', '/routersim/switch.png', '2950'], ['switch', '3550 Switch', '/routersim/switch3550.png', '3550'], ['netconnect', 'Net Connect', '/routersim/netconnect_up.png', '2950']] as const).map(([kind, label, picture, model]) => <button key={label} draggable onDragStart={e => { e.dataTransfer.setData('application/x-routersim-device', kind); e.dataTransfer.setData('application/x-routersim-model', model); }} onClick={() => addDeviceAt(kind, undefined, model)} className="block w-full cursor-grab border border-transparent p-1 hover:border-blue-400 hover:bg-blue-50"><span className="block">{label}</span><img className="mx-auto mt-1" src={picture} alt={label} style={{ imageRendering: 'pixelated' }} /></button>)}</div></div>}

    {showPreferences && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowPreferences(false)}><div className="w-[350px] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-xl" onMouseDown={e => e.stopPropagation()}><WindowTitle title="Preferences" onClose={() => setShowPreferences(false)} /><div className="space-y-3 p-4 text-xs"><strong>Background Color</strong><p>Click a color to change the Network Visualizer background.</p><div className="grid grid-cols-10 gap-1">{['#ffffff','#000000','#000064','#0000ff','#00b7c6','#b9c9ff','#505050','#888888','#008542','#00e200','#ff00ff','#e6ad00','#ffaaaa','#e00000','#ffff00','#ffffcc','#dbffdf','#008b89'].map(color => <button key={color} title={color} aria-label={`Background ${color}`} onClick={() => setCanvasColor(color)} className={`h-5 w-5 border border-slate-500 ${canvasColor === color ? 'outline-2 outline-offset-1 outline-blue-700' : ''}`} style={{ backgroundColor: color }} />)}</div><label className="flex items-center gap-2"><input type="checkbox" checked={showDeviceListAtStart} onChange={e => setShowDeviceListAtStart(e.target.checked)} /> Show Device List with Network Visualizer</label><label className="flex items-center gap-2"><input type="checkbox" checked={autoSizeCanvas} onChange={e => setAutoSizeCanvas(e.target.checked)} /> Autosize Network Visualizer when loading a network</label><button onClick={() => setShowPreferences(false)} className="rounded-full border border-green-900 bg-gradient-to-b from-green-400 to-green-800 px-6 py-1 font-bold text-white">Close</button></div></div></div>}

    {showGuide && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onMouseDown={() => setShowGuide(false)}><section className="w-[min(600px,calc(100vw-20px))] overflow-hidden rounded-lg border border-[#b8bec8] bg-[#f2f2f3] shadow-2xl" onMouseDown={event => event.stopPropagation()}><WindowTitle title="RouterSim Help · Làm bài COMP303" onClose={() => setShowGuide(false)} /><div className="max-h-[70vh] overflow-auto p-4 text-sm leading-6"><ol className="list-decimal pl-5"><li>Chọn sơ đồ trong <strong>View → Labs</strong> hoặc mở tệp RouterSim <code>.rsm</code> bằng <strong>File → Open</strong>. Vào <strong>Tools → Clear Configuration</strong> để bắt đầu cấu hình từ đầu.</li><li>Kéo thiết bị từ thanh công cụ hoặc Device List vào vùng xanh. Nhấp chuột phải lên thiết bị và chọn cổng ở hai đầu để nối dây. Với cáp serial, chọn đầu DCE và đặt <code>clock rate 64000</code> trên cổng DCE.</li><li>Nhấp phải PC → Configs để nhập IP, mask và gateway. Nhấp đúp router để mở console; gõ <code>enable</code>, <code>conf t</code>, <code>int F0/0</code>, <code>ip add ...</code>, <code>no shut</code>, <code>router rip</code> và <code>network ...</code>.</li><li>Nhấp đúp PC, chạy <code>ipconfig</code> hoặc <code>ping IP_đích</code>. Dùng <code>show ip route</code> để xem tuyến; dùng mũi tên ↑/↓ để gọi lại lệnh.</li></ol><p className="mt-2">Nút tròn xanh trên thanh tiêu đề mở toàn màn hình. Các phím tắt chính: Ctrl+O mở tệp, Ctrl+S lưu JSON, Ctrl+D mở Device List, Ctrl+F mở Net Configs, Ctrl+T mở Net Packet Monitor.</p></div></section></div>}
    <input ref={fileRef} type="file" accept=".json,.rsm,application/json,application/xml,text/xml" className="hidden" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
  </div>;
};

function ToolButton({ title, onClick, children, deviceKind, switchModel }: { title: string; onClick: () => void; children: React.ReactNode; deviceKind?: DeviceKind; switchModel?: '1900' | '2950' | '3550' }) {
  return <button title={title} onClick={onClick} draggable={!!deviceKind} onDragStart={e => { if (deviceKind) e.dataTransfer.setData('application/x-routersim-device', deviceKind); if (switchModel) e.dataTransfer.setData('application/x-routersim-model', switchModel); }} className="flex h-9 min-w-9 items-center justify-center border border-transparent px-1 text-xl hover:border-slate-400 hover:bg-blue-100">{children}</button>;
}
function PortHotspot({ name, x, y, w, h, connectedTo, onChoose, onDisconnect, onInspect }: { name: string; x: number; y: number; w: number; h: number; connectedTo?: string; onChoose: () => void; onDisconnect: () => void; onInspect: () => void }) {
  return <div className="absolute group" style={{ left: x, top: y, width: w, height: h }}><button title={connectedTo ? `${name} → ${connectedTo}` : `${name} · click to connect`} aria-label={connectedTo ? `${name} connected to ${connectedTo}` : `${name} · click to connect`} onClick={connectedTo ? onInspect : onChoose} className={`h-full w-full border-2 hover:border-yellow-400 ${connectedTo ? 'border-[#22c55e] bg-[#22c55e]/15' : 'border-transparent hover:bg-yellow-300/20'}`} />{connectedTo && <><span aria-hidden="true" className="pointer-events-none absolute -left-1 -top-1 rounded-full border border-white bg-[#16803e] px-1 text-[9px] font-bold text-white">✓</span><button title={`Disconnect ${name} from ${connectedTo}`} aria-label={`Disconnect ${name}`} onClick={onDisconnect} className="absolute -right-1 -top-1 h-4 w-4 rounded bg-red-600 text-[10px] font-bold text-white opacity-90 hover:opacity-100">×</button></>}</div>;
}
function MenuItem({ label, onClick, shortcut, disabled = false }: { label: string; onClick: () => void; shortcut?: string; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="flex w-full items-center justify-between gap-5 whitespace-nowrap px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white disabled:text-slate-400 disabled:hover:bg-transparent"><span>{label}</span>{shortcut && <span className="text-[10px] opacity-80">{shortcut}</span>}</button>;
}
function MenuSubmenu({ label, children, scroll = false }: { label: string; children: React.ReactNode; scroll?: boolean }) {
  return <div className="rs-submenu relative"><button className="flex w-full items-center justify-between gap-5 whitespace-nowrap px-3 py-1 text-left hover:bg-[#316ac5] hover:text-white">{label}<span>▸</span></button><div className={`rs-submenu-panel absolute left-full top-0 z-50 hidden min-w-44 border border-slate-600 bg-[#f5f5f1] p-1 text-black shadow-lg ${scroll ? 'max-h-[70vh] overflow-y-auto' : ''}`}>{children}</div></div>;
}
function LabsMenu({ labs, onPreset, onLibrary }: { labs: LabLibraryItem[]; onPreset: (preset: LabPreset) => void; onLibrary: (lab: LabLibraryItem) => void }) {
  const categories = [...new Set(labs.map(lab => lab.category))];
  return <MenuSubmenu label="Labs"><MenuSubmenu label="COMP303 practice">{PRESETS.filter(p => p !== 'blank').map(p => <MenuItem key={p} label={PRESET_LABELS[p]} onClick={() => onPreset(p)} />)}</MenuSubmenu>{categories.map(category => <MenuSubmenu key={category} label={category} scroll>{labs.filter(lab => lab.category === category).map((lab, index) => <MenuItem key={`${lab.name}-${index}`} label={lab.name} onClick={() => onLibrary(lab)} />)}</MenuSubmenu>)}</MenuSubmenu>;
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
  const trafficLight = 'flex h-[13px] w-[13px] items-center justify-center rounded-full border text-[10px] leading-none shadow-[inset_0_1px_1px_#ffffff99]';
  return <div onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="relative flex h-9 shrink-0 cursor-grab items-center border-b border-[#c6c8cd] bg-gradient-to-b from-[#fafafa] to-[#e9e9eb] px-3 text-[12px] text-[#34373b] select-none active:cursor-grabbing" style={{ touchAction: 'none' }}>
    <div className="z-10 flex items-center gap-2">
      <button type="button" title="Đóng" aria-label={`Đóng ${title}`} onClick={onClose} className={`${trafficLight} border-[#e0443e] bg-[#ff5f57] text-[#7a201c]`}>×</button>
      <button type="button" title="Thu nhỏ" aria-label={`Thu nhỏ ${title}`} onClick={onMinimize} disabled={!onMinimize} className={`${trafficLight} border-[#dba629] bg-[#febc2e] text-[#805800] disabled:opacity-40`}>−</button>
      <button type="button" title="Phóng to" aria-label={`Phóng to ${title}`} onClick={onMaximize} disabled={!onMaximize} className={`${trafficLight} border-[#1ba93d] bg-[#28c840] text-[#17612a] disabled:opacity-40`}>⤢</button>
    </div>
    <div className="pointer-events-none absolute inset-x-[72px] flex min-w-0 items-center justify-center gap-1.5 font-semibold"><img src="/logo.svg" alt="" className="h-[18px] w-[18px] shrink-0" /><span className="truncate">{title}</span></div>
  </div>;
}
function Field({ label, value, onChange, asSelect }: { label: string; value: string; onChange: (value: string) => void; asSelect?: Array<{ id: string; label: string }> }) {
  return <label className="grid grid-cols-[120px_1fr] items-center gap-2"><span>{label}</span>{asSelect ? <select value={value} onChange={e => onChange(e.target.value)} className="border border-slate-500 bg-white px-1 py-0.5">{asSelect.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <input value={value} onChange={e => onChange(e.target.value)} className="min-w-0 border border-slate-500 bg-white px-1 py-0.5" />}</label>;
}
function IpField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const parts = value ? value.split('.').slice(0, 4) : [];
  while (parts.length < 4) parts.push('');
  return <label className="grid grid-cols-[120px_1fr] items-center gap-2"><span>{label}</span><span className="flex items-center gap-0.5">{parts.map((part, index) => <React.Fragment key={index}><input aria-label={`${label} octet ${index + 1}`} inputMode="numeric" maxLength={3} value={part} onChange={event => { const next = [...parts]; next[index] = event.target.value.replace(/\D/g, '').slice(0, 3); onChange(next.join('.')); }} className="w-11 border border-slate-500 bg-white px-1 py-0.5 text-center" />{index < 3 && <span>.</span>}</React.Fragment>)}</span></label>;
}
