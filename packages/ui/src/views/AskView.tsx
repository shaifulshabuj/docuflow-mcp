import { useState, useEffect, useRef } from 'react';
import { Pill, Btn } from '../components/UIKit';
import Icon from '../components/Icon';
import { DOCUFLOW_DATA as D } from '../data/mock';
import { renderInlineMd } from '../lib/markdown';
import { useProject } from '../context/ProjectContext';
import { useApi } from '../hooks/useApi';

type Stage = 'idle' | 'searching' | 'answering';

interface AskViewProps {
  initialStage?: Stage;
  autoplay?: boolean;
}

interface ActivityItem {
  t: string;
  tool: string;
  target: string;
  kind: string;
  delta: string;
}

export default function AskView({ initialStage = 'idle', autoplay = false }: AskViewProps) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [typed, setTyped] = useState('');
  const [searchStep, setSearchStep] = useState(0);
  const runToken = useRef(0);
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const { projectPath, projectInfo, apiOnline } = useProject();

  const { data: liveActivity } = useApi<ActivityItem[] | null>(
    apiOnline && projectPath ? `/api/activity?path=${encodeURIComponent(projectPath)}` : null,
    null,
  );

  const projectName = projectInfo.name || D.project.name;

  const run = async () => {
    const token = ++runToken.current;
    const alive = () => token === runToken.current;
    setTyped(D.hero.question);
    setStage('searching'); setSearchStep(0);
    for (let n = 1; n <= 4; n++) {
      await wait(n === 1 ? 280 : 240);
      if (!alive()) return;
      setSearchStep(n);
    }
    await wait(280);
    if (!alive()) return;
    setStage('answering');
  };

  const reset = () => {
    runToken.current++;
    setStage('idle'); setTyped(''); setSearchStep(0);
  };

  useEffect(() => {
    if (autoplay) {
      const id = setTimeout(run, 700);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="df-ask">
      <header className="df-ask__header">
        <div className="df-ask__eyebrow">
          <Pill tone="accent"><Icon name="sparkle" size={11} />Ask</Pill>
          <span className="df-subtle">Cited answers from your project's wiki, in seconds.</span>
        </div>
        <h1 className="df-h1 df-h1--display">
          What do you want to know about <span className="df-ask__title-accent">{projectName}</span>?
        </h1>

        <div className="df-ask__box-wrap">
          <div className={`df-ask__box${stage !== 'idle' ? ' df-ask__box--active' : ''}`}>
            <Icon name="search" size={16} style={{ color: 'var(--df-text-4)' }} />
            <div className="df-ask__box-input">
              {stage === 'idle' && <span className="df-ask__placeholder">How does payment retry work when Stripe returns a soft decline?</span>}
              {stage !== 'idle' && <span>{typed || D.hero.question}</span>}
            </div>
            {stage === 'idle' && (
              <button className="df-ask__run" onClick={run}>
                <Icon name="sparkle" size={11} />Run<span className="df-kbd">↩</span>
              </button>
            )}
            {(stage === 'searching' || stage === 'answering') && (
              <button className="df-ask__reset" onClick={reset}>New question</button>
            )}
          </div>

          {stage === 'idle' && (
            <div className="df-ask__chips">
              {[
                'How does payment retry work when Stripe returns a soft decline?',
                'What modules touch the LedgerWriter?',
                'Where is idempotency enforced?',
              ].map((q, i) => (
                <button key={i} className="df-chip" onClick={run}>{q}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="df-ask__body">
        <div className="df-ask__main">
          {stage === 'idle'      && <IdleState liveActivity={liveActivity} />}
          {stage === 'searching' && <SearchingState step={searchStep} />}
          {stage === 'answering' && <AnswerState />}
        </div>
        {stage === 'answering' && <CitationsRail />}
      </div>
    </div>
  );
}

function IdleState({ liveActivity }: { liveActivity: ActivityItem[] | null }) {
  const activity = liveActivity && liveActivity.length > 0 ? liveActivity : D.activity;

  const toneFor = (k: string) =>
    k === 'ingest' ? 'pink' : k === 'query' ? 'accent' : k === 'lint' ? 'amber' : 'default';
  return (
    <div className="df-anim-fade">
      <div className="df-eyebrow" style={{ marginBottom: 14 }}>Recent activity</div>
      <div className="df-card df-card--rows">
        {activity.map((a, i) => (
          <div key={i} className="df-activity__row">
            <span className="df-activity__time">{a.t} ago</span>
            <Pill tone={toneFor(a.kind) as Parameters<typeof Pill>[0]['tone']}>{a.tool}</Pill>
            <span className="df-activity__target">{a.target}</span>
            <span className="df-activity__delta">{a.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchingState({ step }: { step: number }) {
  const stages = [
    'BM25 search across 188 wiki pages',
    'Re-ranking by recency × relevance',
    'Selecting 4 sources for synthesis',
    'Composing answer with inline citations',
  ];
  return (
    <div className="df-anim-fade">
      <div className="df-search__head">
        <div className="df-search__spinner" />
        <span>Querying wiki…</span>
      </div>
      <div>
        {stages.map((s, i) => {
          const done = step > i;
          const active = step === i + 1;
          return (
            <div
              key={i}
              className={`df-search__stage${done ? ' df-search__stage--done' : ''}`}
              style={{ color: active ? 'var(--df-accent-text)' : undefined }}
            >
              <Icon name={done ? 'check' : 'dot'} size={11} />
              <span>{s}</span>
            </div>
          );
        })}
      </div>
      <div className="df-search__skel">
        {[100, 92, 78, 64].map((w, i) => (
          <div key={i} className="df-search__skel-bar" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function AnswerState() {
  return (
    <div className="df-anim-fade df-answer">
      <div className="df-answer__meta">
        <Pill tone="green"><Icon name="check" size={11} />Answered in 1.4s</Pill>
        <Pill tone="accent">4 cited sources</Pill>
        <Pill>BM25 0.94</Pill>
      </div>

      <article className="df-answer__doc">
        <h2 className="df-answer__h">{D.hero.question}</h2>
        <div className="df-answer__prose">
          {D.hero.answer.map((b, i) => {
            if (b.kind === 'p') {
              const note = i === 0 ? '<sup class="df-answer__sup">[1,2]</sup>' : '';
              return <p key={i} dangerouslySetInnerHTML={{ __html: renderInlineMd(b.text ?? '') + note }} />;
            }
            if (b.kind === 'ol') return (
              <ol key={i} className="df-answer__list">
                {(b.items ?? []).map((t, j) => (
                  <li key={j} className="df-answer__li">
                    <span className="df-answer__num">{j + 1}</span>
                    <span dangerouslySetInnerHTML={{ __html: renderInlineMd(t) }} />
                  </li>
                ))}
              </ol>
            );
            return null;
          })}
        </div>
      </article>

      <div className="df-cites">
        <div className="df-eyebrow" style={{ marginBottom: 10, fontFamily: 'var(--df-font-sans)' }}>Sources</div>
        {D.hero.citations.map((c, i) => (
          <div key={c.id} className="df-cites__row" style={{ animation: `df-fade-in .35s ${0.05 + i * 0.05}s both` }}>
            <span className="df-cites__num">[{i + 1}]</span>
            <div style={{ flex: 1 }}>
              <div className="df-cites__title">{c.title}</div>
              <div className="df-cites__path">{c.path} · L{c.lines}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--df-font-sans)' }}>
              <Pill>{c.cat}</Pill>
              <span className="df-cites__path">{(c.score * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="df-related">
        <div className="df-eyebrow" style={{ marginBottom: 10 }}>Related questions</div>
        <div className="df-related__list">
          {D.hero.related.map((q, i) => (
            <button key={i} className="df-related__item">
              <span>{q}</span>
              <Icon name="arrow-right" size={13} />
            </button>
          ))}
        </div>
      </div>

      <div className="df-actions">
        <Btn icon="plus" variant="primary">Save as wiki page</Btn>
        <Btn icon="cite">Copy with citations</Btn>
      </div>
    </div>
  );
}

function CitationsRail() {
  return (
    <aside className="df-cites-rail df-anim-fade">
      <div className="df-eyebrow" style={{ marginBottom: 14 }}>Sources rail</div>
      <div className="df-cites-rail__list">
        {D.hero.citations.map((c, i) => (
          <div key={c.id} className="df-cites-card" style={{ animation: `df-fade-in .4s ${0.1 + i * 0.08}s both` }}>
            <div className="df-cites-card__head">
              <span className="df-cites-card__num">{i + 1}</span>
              <span className="df-cites-card__title">{c.title}</span>
            </div>
            <div className="df-cites-card__path">{c.path}</div>
            <div className="df-cites-card__foot">
              <Pill>{c.cat}</Pill>
              <span style={{ flex: 1 }} />
              <span className="df-cites-card__path" style={{ marginBottom: 0 }}>L{c.lines}</span>
              <span style={{ color: 'var(--df-accent-text)' }}>{(c.score * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
