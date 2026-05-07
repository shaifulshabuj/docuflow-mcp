import { useState, useRef, useEffect } from 'react';
import { Pill, Btn } from '../components/UIKit';
import { DOCUFLOW_DATA as D } from '../data/mock';
import type { NodeKind, GraphNode } from '../types';
import { useProject } from '../context/ProjectContext';
import { useApi } from '../hooks/useApi';

interface LivePage {
  id: string;
  title: string;
  category: string;
  stale: boolean;
}

interface LiveWiki {
  pages: LivePage[];
  total_pages: number;
}

const colorFor = (k: NodeKind): string =>
  ({ module: '#a5b4fc', api: '#34d399', concept: '#fbbf24', entity: '#f472b6' }[k] ?? '#a5b4fc');

/** Map DocuFlow wiki category to a graph NodeKind */
function categoryToKind(cat: string): NodeKind {
  if (cat === 'concept') return 'concept';
  if (cat === 'entity')  return 'entity';
  if (cat === 'api')     return 'api';
  return 'module';
}

/** Build graph nodes from live wiki pages, arranged in a circle */
function buildLiveGraph(pages: LivePage[]): { nodes: GraphNode[]; edges: [string, string][] } {
  if (!pages || pages.length === 0) return D.graph;

  const nodes: GraphNode[] = pages.map((p, i) => {
    const angle = (2 * Math.PI * i) / pages.length - Math.PI / 2;
    const r = 0.35; // radius as fraction of canvas
    return {
      id: p.id,
      label: p.title.length > 20 ? p.title.slice(0, 18) + '…' : p.title,
      x: 0.5 + r * Math.cos(angle),
      y: 0.5 + r * Math.sin(angle),
      size: categoryToKind(p.category) === 'entity' ? 20
          : categoryToKind(p.category) === 'concept' ? 16
          : 18,
      kind: categoryToKind(p.category),
    };
  });

  // No explicit edges from wiki data — use empty array
  const edges: [string, string][] = [];

  return { nodes, edges };
}

export default function GraphView() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const ref = useRef<HTMLDivElement>(null);
  const { projectPath, apiOnline } = useProject();

  const { data: liveWiki } = useApi<LiveWiki | null>(
    apiOnline && projectPath ? `/api/wiki?path=${encodeURIComponent(projectPath)}` : null,
    null,
  );

  const graph = liveWiki?.pages && liveWiki.pages.length > 0
    ? buildLiveGraph(liveWiki.pages)
    : D.graph;

  // Default selected to first node when graph changes
  const defaultSelected = graph.nodes[0]?.id ?? 'retry';
  const activeSelected = selected ?? defaultSelected;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const focused = hovered ?? activeSelected;
  const adj = new Set<string>();
  if (focused) {
    graph.edges.forEach(([a, b]) => {
      if (a === focused) adj.add(b);
      if (b === focused) adj.add(a);
    });
    adj.add(focused);
  }

  const sel = graph.nodes.find(n => n.id === activeSelected) ?? graph.nodes[0];
  const inbound  = graph.edges.filter(([, b]) => b === activeSelected).map(([a]) => graph.nodes.find(n => n.id === a)!).filter(Boolean);
  const outbound = graph.edges.filter(([a]) => a === activeSelected).map(([, b]) => graph.nodes.find(n => n.id === b)!).filter(Boolean);

  if (!sel) return null;

  return (
    <div className="df-graph">
      <div className="df-graph__canvas" ref={ref}>
        <div className="df-graph__grid" />
        <div className="df-graph__legend">
          {(['module', 'api', 'concept', 'entity'] as NodeKind[]).map(k => (
            <div key={k} className="df-graph__legend-row">
              <span className="df-graph__legend-swatch" style={{ background: colorFor(k) }} />
              <span>{k}</span>
            </div>
          ))}
        </div>
        <div className="df-graph__controls">
          <Btn icon="search">Find node</Btn>
          <Btn>Layout</Btn>
        </div>

        <svg className="df-graph__svg" width={size.w} height={size.h}>
          {graph.edges.map(([a, b], i) => {
            const na = graph.nodes.find(n => n.id === a)!;
            const nb = graph.nodes.find(n => n.id === b)!;
            if (!na || !nb) return null;
            const dim = focused && !(adj.has(a) && adj.has(b));
            return (
              <line key={i}
                x1={na.x * size.w} y1={na.y * size.h}
                x2={nb.x * size.w} y2={nb.y * size.h}
                stroke={dim ? '#1a1a1f' : '#26262c'}
                strokeWidth={1}
                opacity={dim ? 0.35 : 1}
              />
            );
          })}
          {graph.nodes.map(n => {
            const dim = focused && !adj.has(n.id);
            const isSel = activeSelected === n.id;
            return (
              <g key={n.id}
                style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity .15s' }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(n.id)}
              >
                <circle
                  cx={n.x * size.w} cy={n.y * size.h} r={n.size}
                  fill={isSel ? colorFor(n.kind) : '#111113'}
                  stroke={colorFor(n.kind)}
                  strokeWidth={isSel ? 2 : 1.5}
                />
                <text
                  x={n.x * size.w} y={n.y * size.h + n.size + 14}
                  textAnchor="middle" fontSize="11"
                  fill={isSel ? '#ededee' : '#a1a1aa'}
                  fontFamily="var(--df-font-sans)"
                  fontWeight={isSel ? 600 : 400}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="df-graph__detail">
        <div className="df-eyebrow" style={{ marginBottom: 12 }}>Selected node</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorFor(sel.kind) }} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>{sel.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <Pill tone="accent">{sel.kind}</Pill>
          <Pill>{inbound.length} in</Pill>
          <Pill>{outbound.length} out</Pill>
        </div>

        <div className="df-eyebrow" style={{ marginBottom: 8 }}>Inbound</div>
        <div style={{ marginBottom: 18 }}>
          {inbound.map(n => (
            <div key={n.id} className="df-graph__connection" onClick={() => setSelected(n.id)}>
              <span className="df-graph__connection-dot" style={{ background: colorFor(n.kind) }} />
              <span>{n.label}</span>
            </div>
          ))}
          {inbound.length === 0 && <span style={{ color: 'var(--df-text-4)', fontSize: 12 }}>None</span>}
        </div>

        <div className="df-eyebrow" style={{ marginBottom: 8 }}>Outbound</div>
        <div>
          {outbound.map(n => (
            <div key={n.id} className="df-graph__connection" onClick={() => setSelected(n.id)}>
              <span className="df-graph__connection-dot" style={{ background: colorFor(n.kind) }} />
              <span>{n.label}</span>
            </div>
          ))}
          {outbound.length === 0 && <span style={{ color: 'var(--df-text-4)', fontSize: 12 }}>None</span>}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 6 }}>
          <Btn icon="book" variant="primary">Open page</Btn>
          <Btn icon="cite">Cite in answer</Btn>
        </div>
      </aside>
    </div>
  );
}
