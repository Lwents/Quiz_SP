export interface WalkthroughConnection {
  name: string;
  first: string;
  second: string;
  subnet: string;
  dce?: string;
}
export interface WalkthroughStep {
  title: string;
  why: string;
  actions: string[];
  commands?: string[];
  commandGroups?: Array<{ label: string; lines: string[] }>;
  result?: string;
  connections?: WalkthroughConnection[];
}
