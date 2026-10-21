import { simulatePing, type Topology } from './model';

export const HOST_BANNER = ['Microsoft Windows 2000 [Version 5.00.2195]', '(C) Copyright 1985-1999 Microsoft Corp.', ''];

export function runHostCommand(topology: Topology, id: string, input: string): { output: string[]; close?: boolean } {
  const cmd = input.trim().toLowerCase();
  const output: string[] = [];
  if (cmd === 'exit') return { output, close: true };
  if (cmd.startsWith('ping ') || cmd.startsWith('tracert ') || cmd.startsWith('telnet ')) {
    const destination = input.trim().split(/\s+/)[1];
    const result = simulatePing(topology, id, destination);
    if (cmd.startsWith('ping ')) {
      output.push('', `Pinging ${destination} with 32 bytes of data:`, '');
      for (let i = 0; i < 4; i++) output.push(result.ok ? `Reply from ${destination} ;bytes=32 time=22ms TTL=254` : 'Request timed out.');
      output.push('', `Ping Statistics for ${destination}: `, `    Packets Sent = 4, Received = ${result.ok ? 4 : 0}, Lost = ${result.ok ? 0 : 4} (${result.ok ? 0 : 100}% loss),`);
      if (result.ok) output.push('Approximate round trip times in milli-seconds:', '    Minimum = 22ms, Maximum = 23ms, Average = 22ms');
    } else if (cmd.startsWith('telnet ')) {
      output.push(`Connecting To ${destination} ...`, '');
      if (result.ok && topology.devices.some(d => d.kind === 'router' && d.ports.some(p => p.ip === destination))) output.push('Password required, but none set', '', '', 'Connection to host lost.');
      else output.push('Could not open connection to the host, on port 23: Connect failed');
    } else {
      output.push('', `Tracing route to ${destination} over a maximum of 30 hops`, ' ');
      if (!result.ok) output.push('  1   *        *        *     Request timed out.');
      else {
        // The desktop simulator reports the next router's incoming serial IP,
        // then repeats the destination as the final hop.
        const routers = result.path.map(name => topology.devices.find(d => d.kind === 'router' && d.name === name)).filter(d => !!d);
        const hops: string[] = [];
        for (let i = 1; i < routers.length; i++) {
          const previous = routers[i - 1]!, current = routers[i]!;
          const link = topology.cables.find(c => (c.a.deviceId === previous.id && c.b.deviceId === current.id) || (c.b.deviceId === previous.id && c.a.deviceId === current.id));
          const end = link && (link.a.deviceId === current.id ? link.a : link.b);
          const ip = end && current.ports.find(p => p.name === end.port)?.ip;
          if (ip) hops.push(ip);
        }
        hops.push(destination, destination);
        output.push(...hops.map((ip, i) => `  ${i + 1}   12 ms    14 ms    12 ms   ${ip}`));
      }
      output.push('', 'Trace complete.', ' ');
    }
  } else output.push(`'${input}' is not recognized as an internal or external command,`, 'operable program or batch file.', '');
  return { output };
}
