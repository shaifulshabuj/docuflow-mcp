import { useState } from 'react';
import { Btn, Field } from '../components/UIKit';
import Icon from '../components/Icon';
import { DOCUFLOW_DATA as D } from '../data/mock';

export default function OnboardView() {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('code');
  const steps = ['Domain', 'Project', 'Source', 'Init'];

  return (
    <div className="df-onboard">
      <div className="df-onboard__center">
        <div className="df-onboard__inner">
          <div className="df-onboard__steps">
            {steps.map((s, i) => {
              const n = i + 1;
              const state = n < step ? 'done' : n === step ? 'active' : 'idle';
              return (
                <span key={s} style={{ display: 'contents' }}>
                  <div className={`df-onboard__step df-onboard__step--${state}`}>
                    <span className="df-onboard__step-num">
                      {state === 'done' ? <Icon name="check" size={11} /> : n}
                    </span>
                    <span>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`df-onboard__step-line${n < step ? ' df-onboard__step-line--done' : ''}`} />
                  )}
                </span>
              );
            })}
          </div>

          {step === 1 && (
            <div className="df-anim-fade">
              <h1 className="df-h1">What kind of knowledge will live here?</h1>
              <div className="df-onboard__intro">DocuFlow specializes the wiki schema by domain. You can change this later.</div>
              <div className="df-domains">
                {D.domains.map(d => (
                  <button
                    key={d.id}
                    className={`df-domain${domain === d.id ? ' df-domain--selected' : ''}`}
                    onClick={() => setDomain(d.id)}
                  >
                    <div className="df-domain__icon"><Icon name={d.icon} size={16} /></div>
                    <div className="df-domain__label">{d.label}</div>
                    <div className="df-domain__desc">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="df-anim-fade">
              <h1 className="df-h1">Project basics</h1>
              <div className="df-onboard__intro">
                Saved to <code className="df-code">.docuflow/config.yaml</code> at the project root.
              </div>
              <div className="df-onboard__fields">
                <Field label="Project name"    value="acme-platform" />
                <Field label="Project root"    value="~/code/acme-platform" mono />
                <Field label="Wiki output dir" value=".docuflow/wiki" mono />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="df-anim-fade">
              <h1 className="df-h1">Add your first source</h1>
              <div className="df-onboard__intro">Drop a folder, paste a path, or import a repo. We'll ingest non-destructively.</div>
              <div className="df-dropzone">
                <Icon name="folder" size={28} style={{ color: 'var(--df-text-4)' }} />
                <div className="df-dropzone__title">Drop a folder here</div>
                <div className="df-dropzone__sub">…or paste a path · Git repo · zip archive</div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="df-pill df-pill--accent">.docuflow/sources/</span>
                <span className="df-subtle">~/code/acme-platform/src · 412 files detected</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="df-anim-fade">
              <h1 className="df-h1">Initializing…</h1>
              <div className="df-onboard__intro">
                Setting up <code className="df-code">.docuflow/</code> and running first ingest.
              </div>
              <div className="df-init-log">
                {[
                  ['ok',  'Created .docuflow/config.yaml'],
                  ['ok',  'Created .docuflow/schema.md'],
                  ['ok',  'Generated 188 wiki pages'],
                  ['ok',  'Built BM25 index (412 entities)'],
                  ['run', 'Installing post-commit hook…'],
                ].map(([m, t], i) => (
                  <div key={i} className="df-init-log__line">
                    <span className={`df-init-log__mark--${m}`}>{m === 'ok' ? '✓' : '→'}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="df-onboard__nav">
            <Btn variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>Back</Btn>
            {step < 4
              ? <Btn variant="primary" icon="arrow-right" onClick={() => setStep(s => s + 1)}>Continue</Btn>
              : <Btn variant="primary" icon="check">Open project</Btn>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
