export type IconName =
  | 'search' | 'sparkle' | 'book' | 'graph' | 'health' | 'sync' | 'plus'
  | 'settings' | 'arrow-right' | 'check' | 'check-circle' | 'alert' | 'dot'
  | 'chevron-right' | 'chevron-down' | 'file' | 'folder' | 'code' | 'flask'
  | 'briefcase' | 'cite' | 'tool' | 'commit' | 'play' | 'pause' | 'logo';

export type PillTone = 'default' | 'accent' | 'green' | 'amber' | 'red' | 'pink';
export type BtnVariant = 'default' | 'primary' | 'ghost';
export type NodeKind = 'module' | 'api' | 'concept' | 'entity';

export interface Project {
  name: string;
  path: string;
  domain: string;
  health: number;
  pages: number;
  sources: number;
  entities: number;
  lastIngest: string;
  syncStatus: string;
}

export interface AnswerBlock {
  kind: 'p' | 'ol';
  text?: string;
  items?: string[];
}

export interface Citation {
  id: string;
  title: string;
  cat: string;
  path: string;
  score: number;
  lines: string;
}

export interface HeroData {
  question: string;
  answer: AnswerBlock[];
  citations: Citation[];
  related: string[];
}

export interface ActivityItem {
  t: string;
  tool: string;
  target: string;
  kind: string;
  delta: string;
}

export interface WikiNode {
  id: string;
  label: string;
  kind: 'cat' | 'page';
  children?: WikiNode[];
  stale?: boolean;
  highlight?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  kind: NodeKind;
  hot?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: [string, string][];
}

export interface LintIssue {
  kind: 'stale' | 'orphan' | 'meta';
  sev: 'warn' | 'info';
  page: string;
  age: string;
  msg: string;
}

export interface SyncEvent {
  t: string;
  kind: 'commit' | 'sync' | 'tool' | 'done';
  msg: string;
  files: number;
}

export interface DomainOption {
  id: string;
  label: string;
  desc: string;
  icon: IconName;
}

export interface DocuflowData {
  project: Project;
  hero: HeroData;
  activity: ActivityItem[];
  wikiTree: WikiNode[];
  graph: GraphData;
  lintIssues: LintIssue[];
  syncEvents: SyncEvent[];
  domains: DomainOption[];
}
