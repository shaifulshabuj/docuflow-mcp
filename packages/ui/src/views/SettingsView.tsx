import { useProject } from '../context/ProjectContext';

// Version will be injected at build time if available, fallback to 'dev'
const APP_VERSION = typeof '__APP_VERSION__' === 'string' && '__APP_VERSION__' ? '__APP_VERSION__' : 'dev';

export default function SettingsView() {
  const { projectPath } = useProject();

  return (
    <div className="df-settings" style={{ padding: '24px 24px 24px 0' }}>
      <div className="df-h1" style={{ marginBottom: 4, fontSize: 24 }}>Settings</div>
      <p className="df-subtle">DocuFlow Web UI · v{APP_VERSION}</p>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="df-card">
          <div className="df-eyebrow">API Port</div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}>48821</div>
        </div>
        
        <div className="df-card">
          <div className="df-eyebrow">Wiki Output</div>
          <div className="df-code" style={{ marginTop: 4, fontSize: 11 }}>
            {projectPath || ''}/.docuflow/wiki/
          </div>
        </div>

        <div className="df-card">
          <div className="df-eyebrow">Discovery Root</div>
          <div style={{ fontSize: 14, marginTop: 6, color: 'var(--df-text-3)' }}>
            Scans: <span style={{ color: 'var(--df-text-4)' }}>.docuflow/</span> dirs in ~/code ~/dev ~/projects ~/work ~/src ~/Desktop
          </div>
        </div>

        <div className="df-card">
          <div className="df-eyebrow">Schema Domains</div>
          <div style={{ fontSize: 14, marginTop: 6, color: 'var(--df-text-3)' }}>
            Entities · Concepts · Timelines · Syntheses · Specs · Sources
          </div>
        </div>
      </div>
    </div>
  );
}
