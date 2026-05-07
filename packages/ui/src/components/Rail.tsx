import Icon from './Icon';
import type { IconName } from '../types';

interface RailProps {
  view: string;
  onChange: (v: string) => void;
}

const items: { id: string; icon: IconName; label: string }[] = [
  { id: 'query',   icon: 'sparkle', label: 'Ask'         },
  { id: 'wiki',    icon: 'book',    label: 'Wiki'        },
  { id: 'graph',   icon: 'graph',   label: 'Graph'       },
  { id: 'health',  icon: 'health',  label: 'Health'      },
  { id: 'sync',    icon: 'sync',    label: 'Sync'        },
  { id: 'onboard', icon: 'plus',    label: 'New project' },
];

export default function Rail({ view, onChange }: RailProps) {
  return (
    <nav className="df-rail" aria-label="Primary">
      <div className="df-rail__logo"><Icon name="logo" size={18} /></div>
      {items.map(it => (
        <button
          key={it.id}
          className={`df-rail__item${view === it.id ? ' df-rail__item--active' : ''}`}
          onClick={() => onChange(it.id)}
          title={it.label}
          aria-current={view === it.id ? 'page' : undefined}
        >
          <Icon name={it.icon} size={18} />
        </button>
      ))}
      <div className="df-rail__spacer" />
      <button className="df-rail__item" title="Settings">
        <Icon name="settings" size={18} />
      </button>
    </nav>
  );
}
