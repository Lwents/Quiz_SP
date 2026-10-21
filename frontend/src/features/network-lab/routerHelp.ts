import captured from './nativeRouterHelp.json';
import type { ConsoleMode } from './routerCli';

export function routerHelp(mode: ConsoleMode, input: string): string[] {
  const query = input.toLowerCase().replace(/\?/g, '').replace(/\s+/g, ' ');
  if (/^clock rate$/.test(query.trim())) return [
    '', '        Speed (bits per second)', '  1200', '  2400', '  4800', '  9600', '  14400', '  19200', '  28800', '  32000',
    '  38400', '  56000', '  57600', '  64000', '  72000', '  115200', '  125000', '  128000', '  148000', '  500000', '  800000', '  1000000',
  ];
  if (!query.trim()) return captured[mode === 'privileged' ? 'privileged' : mode];
  if (/^sh(?:ow)?\s*$/.test(query)) return captured.show;
  if (/^sh(?:ow)? ip\s*$/.test(query)) return captured['show ip'];
  const words = query.trimEnd().split(' ');
  const tail = words.pop() || '';
  const parent = words.join(' ');
  const source = /^sh(?:ow)? ip$/.test(parent) ? captured['show ip'] : /^sh(?:ow)?$/.test(parent) ? captured.show : captured[mode];
  const rows = source.filter(line => line.trimStart().split(/\s+/)[0]?.startsWith(tail));
  return rows.length ? rows : ['% Unrecognized command'];
}

export function completeRouterCommand(mode: ConsoleMode, input: string): string {
  if (!input || input.endsWith(' ')) return input;
  const token = input.split(/\s+/).at(-1)!;
  const prefix = input.slice(0, input.length - token.length);
  const candidates = routerHelp(mode, `${prefix}${token}?`).map(line => line.trim().split(/\s+/)[0]).filter(word => /^[a-z][a-z0-9-]*$/i.test(word) && word.startsWith(token.toLowerCase()));
  if (!candidates.length) return input;
  let common = candidates[0];
  for (const next of candidates) { while (!next.startsWith(common)) common = common.slice(0, -1); }
  return prefix + common + (candidates.length === 1 ? ' ' : '');
}
