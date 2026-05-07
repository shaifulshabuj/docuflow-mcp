import { useState } from 'react';
import { Pill, Btn } from '../components/UIKit';
import { DOCUFLOW_DATA as D } from '../data/mock';
import { useProject } from '../context/ProjectContext';
import { useApi } from '../hooks/useApi';
import type { SyncEvent } from '../types';

interface ActivityItem {
  t: string;
  tool: string;
  target: string;
  kind: string;
  delta: string;
}

/** Map an activity log item to a SyncEvent-shaped row for the timeline */
function activityToSyncEvent(a: ActivityItem, i: number, total: number): SyncEvent {
  const isLast = i === total - 1;
  const kindMap: Record<string, SyncEvent['kind']> = {
    ingest: 'tool',
    query:  'tool',
    lint:   'tool',
    index:  'tool',
    read:   'tool',
  };
  return {
    t: a.t,
    kind: isLast ? 'done' : (kindMap[a.kind] ?? 'tool'),
    msg: `${a.tool} ${a.target}${a.delta ? ' → ' + a.delta : ''}`,
    files: 0,
  };
}

export default function SyncView() {
  const [paused, setPaused] = useState(false);
  const { projectPath, apiOnline } = useProject();

  const { data: liveActivity } = useApi<ActivityItem[] | null>(
    apiOnline && projectPath ? `/api/activity?path=${encodeURIComponent(projectPath)}` : null,
    null,
  );

  // Build timeline rows: use live activity if available, otherwise fall back to mock
  const timelineRows: SyncEvent[] = liveActivity && liveActivity.length > 0
    ? liveActivity.map((a, i) => activityToSyncEvent(a, i, liveActivity.length))
    : D.syncEvents;

  return (
    <div className="df-sync">
      <div className="df-sync__head">
        <div>
          <div className="df-eyebrow">Sync</div>
          <h1 className="df-h1" style={{ marginTop: 6 }}>docuflow watch</h1>
          <div className="df-subtle" style={{ marginTop: 6 }}>
            Auto-refresh wiki on every commit. Bridged via your AI agent.
          </div>
        </div>
        <Btn icon={paused ? 'play' : 'pause'} variant="primary" onClick={() => setPaused(p => !p)}>
          {paused ? 'Resume' : 'Pause'} daemon
        </Btn>
      </div>

      <div className="df-sync__cards">
        <div className="df-sync-card">
          <div className="df-eyebrow">Status</div>
          <div className="df-sync-card__body">
            <span className={`df-status-dot${paused ? ' df-status-dot--paused' : ' df-status-dot--live'}`} />
            <span>{paused ? 'Paused' : 'Listening'}</span>
          </div>
          <div className="df-sync-card__sub">
            {paused ? 'Resume to re-enable post-commit sync' : 'Watching post-commit & post-merge hooks'}
          </div>
        </div>
        <div className="df-sync-card">
          <div className="df-eyebrow">AI bridge</div>
          <div className="df-sync-card__body">Claude Code · auto</div>
          <div className="df-sync-card__sub">Detected from <code className="df-code">.claude/</code></div>
        </div>
        <div className="df-sync-card">
          <div className="df-eyebrow">Last run</div>
          <div className="df-sync-card__body">
            {liveActivity && liveActivity.length > 0
              ? `${liveActivity[0].t} ago`
              : '2 hours ago · 1.8s'}
          </div>
          <div className="df-sync-card__sub df-sync-card__sub--green">
            {liveActivity && liveActivity.length > 0
              ? `${liveActivity.length} operations recorded`
              : '3 pages refreshed, 0 errors'}
          </div>
        </div>
      </div>

      <div className="df-eyebrow" style={{ marginBottom: 12 }}>Recent activity · timeline</div>
      <div className="df-timeline">
        {timelineRows.map((e, i) => (
          <div key={i} className="df-timeline__row">
            <span className="df-timeline__time">{e.t}</span>
            {i < timelineRows.length - 1 && <div className="df-timeline__line" />}
            <span className={`df-timeline__dot df-timeline__dot--${e.kind}`} />
            <span className={`df-timeline__msg${e.kind === 'done' ? ' df-timeline__msg--done' : ''}`}>{e.msg}</span>
            {e.files > 0 && <Pill>{e.files} {e.files === 1 ? 'file' : 'files'}</Pill>}
          </div>
        ))}
      </div>

    </div>
  );
}
