import { useState } from 'react';
import { Btn } from './UIKit';
import Icon from './Icon';
import { useProject } from '../context/ProjectContext';
import { DOCUFLOW_DATA as D } from '../data/mock';

export default function TopBar() {
  const { projectInfo, projects, setProjectPath, apiOnline } = useProject();
  const [showPicker, setShowPicker] = useState(false);

  const name = projectInfo.name || D.project.name;
  const syncStatus = projectInfo.syncStatus || D.project.syncStatus;
  const lastIngest = projectInfo.lastIngest || D.project.lastIngest;

  return (
    <div className="df-topbar">
      <div className="df-topbar__crumb" style={{ position: 'relative' }}>
        <Icon name="folder" size={13} style={{ color: 'var(--df-text-4)' }} />
        <button
          style={{
            background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 'inherit', padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          onClick={() => setShowPicker(p => !p)}
          title={projects.length > 1 ? 'Switch project' : undefined}
        >
          <span style={{ color: 'var(--df-text-3)' }}>{name}</span>
          {projects.length > 1 && (
            <Icon name="chevron-down" size={11} style={{ color: 'var(--df-text-4)' }} />
          )}
        </button>

        {showPicker && projects.length > 1 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'var(--df-surface)', border: '1px solid var(--df-border-2)',
            borderRadius: 'var(--df-r-lg)', padding: '4px 0', minWidth: 220,
            zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.4)',
          }}>
            {projects.map(p => (
              <button
                key={p.path}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 12px', background: 'none', border: 'none',
                  color: p.path === projectInfo.path
                    ? 'var(--df-accent-text)' : 'var(--df-text)',
                  fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
                }}
                onClick={() => { setProjectPath(p.path); setShowPicker(false); }}
              >
                {p.name}
                <span style={{ marginLeft: 8, color: 'var(--df-text-4)', fontSize: 10 }}>
                  {p.pages}p
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="df-topbar__divider" />

      <div className="df-topbar__meta">
        <span className={`df-status-dot df-status-dot--${apiOnline ? 'live' : 'paused'}`} />
        <span>
          {apiOnline
            ? `${syncStatus} · last ingest ${lastIngest}`
            : 'API offline — showing demo data'}
        </span>
      </div>

      <div style={{ flex: 1 }} />
      <Btn icon="search" kbd="⌘K">Search</Btn>
      <Btn icon="tool">Tools</Btn>
      <div className="df-topbar__avatar" />
    </div>
  );
}
