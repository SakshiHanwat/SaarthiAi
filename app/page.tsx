'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import rawCurriculum from '@/data/curriculum.json';

// Derive track cards from the new AI-cohort curriculum schema (modules[])
const TRACKS = rawCurriculum.modules.map((m) => ({
  id: String(m.n),
  title: m.title,
  dayRange: `Days ${m.days[0]}–${m.days[1]}`,
}));

const QUESTION_TYPES = ['conceptual', 'coding', 'system_design', 'behavioral'] as const;

const DIFFICULTY_LABELS = {
  junior: { label: 'Junior', years: '0–2 yrs', color: '#22c55e' },
  mid: { label: 'Mid-level', years: '2–5 yrs', color: '#f59e0b' },
  senior: { label: 'Senior', years: '5+ yrs', color: '#ef4444' },
};

const QTYPE_LABELS: Record<string, string> = {
  conceptual: 'Conceptual',
  coding: 'Coding',
  system_design: 'System Design',
  behavioral: 'Behavioral',
};

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [track, setTrack] = useState('');
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior'>('mid');
  const [qtype, setQtype] = useState('conceptual');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!track) {
      setError('Please select a track to continue.');
      return;
    }
    setError('');
    setStarting(true);

    const sessionId = uuidv4();
    const params = new URLSearchParams({
      sessionId,
      track,
      difficulty,
      questionType: qtype,
      ...(name.trim() ? { candidateName: name.trim() } : {}),
    });

    router.push(`/interview?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            boxShadow: '0 0 8px var(--accent)',
          }} />
          <span style={{ color: 'var(--text)', fontWeight: 600, letterSpacing: '0.01em', fontSize: 15 }}>
            Saarthi
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>AI Interview Platform</span>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 640, width: '100%' }}>
          {/* Heading */}
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent-dim)',
              border: '1px solid rgba(29,155,240,0.2)',
              borderRadius: 4,
              padding: '4px 10px',
              marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                AI-Powered Mock Interviews
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>
              Practice like it's{' '}
              <span style={{ color: 'var(--accent)' }}>the real thing.</span>
            </h1>
            <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, maxWidth: 520 }}>
              Saarthi conducts structured technical interviews powered by Gemini. Get real-time feedback on every answer, track your progress, and improve faster.
            </p>
          </div>

          {/* Setup card */}
          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                ))}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>interview_setup.json</span>
            </div>

            {/* Card body */}
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Your Name <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
                </label>
                <input
                  id="candidate-name"
                  type="text"
                  placeholder="e.g. Sakshi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                />
              </div>

              {/* Track */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Track <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TRACKS.map((t) => (
                    <button
                      key={t.id}
                      id={`track-${t.id}`}
                      onClick={() => setTrack(t.id)}
                      style={{
                        background: track === t.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                        border: `1px solid ${track === t.id ? 'var(--accent)' : 'var(--border-light)'}`,
                        borderRadius: 6,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        color: 'var(--text)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t.dayRange}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Difficulty
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(DIFFICULTY_LABELS).map(([key, val]) => (
                    <button
                      key={key}
                      id={`difficulty-${key}`}
                      onClick={() => setDifficulty(key as 'junior' | 'mid' | 'senior')}
                      style={{
                        flex: 1,
                        background: difficulty === key ? 'var(--bg-3)' : 'transparent',
                        border: `1px solid ${difficulty === key ? val.color : 'var(--border-light)'}`,
                        borderRadius: 6,
                        padding: '10px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        color: difficulty === key ? val.color : 'var(--text-muted)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{val.label}</div>
                      <div style={{ fontSize: 11, marginTop: 1, opacity: 0.7 }}>{val.years}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Question Focus
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {QUESTION_TYPES.map((qt) => (
                    <button
                      key={qt}
                      id={`qtype-${qt}`}
                      onClick={() => setQtype(qt)}
                      style={{
                        background: qtype === qt ? 'var(--accent-dim)' : 'var(--bg-3)',
                        border: `1px solid ${qtype === qt ? 'rgba(29,155,240,0.4)' : 'var(--border-light)'}`,
                        borderRadius: 4,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        color: qtype === qt ? 'var(--accent)' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {QTYPE_LABELS[qt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{error}</p>
              )}

              {/* Start button */}
              <button
                id="start-interview"
                onClick={handleStart}
                disabled={starting}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: starting ? 'var(--bg-3)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 6,
                  color: starting ? 'var(--text-muted)' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: starting ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => !starting && (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => !starting && (e.currentTarget.style.background = 'var(--accent)')}
              >
                {starting ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid var(--text-dim)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Starting...
                  </>
                ) : (
                  'Start Interview →'
                )}
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: 12 }}>
            Powered by Gemini · Memory by Breeth · No account required
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
