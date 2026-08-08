'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { InterviewMessage, CandidateData, FinalFeedbackResult } from '@/lib/gemini';
import rawCurriculum from '@/data/curriculum.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'interviewer' | 'candidate' | 'system';
  text: string;
  timestamp: Date;
  signalTag?: string;
}

// ---------------------------------------------------------------------------
// Small UI components
// ---------------------------------------------------------------------------

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size,
      border: `2px solid var(--border-light)`,
      borderTopColor: 'var(--accent)',
      borderRadius: '50%',
      display: 'inline-block',
      flexShrink: 0,
      animation: 'spin 0.75s linear infinite',
    }} />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
      {label && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>}
    </div>
  );
}

function CurriculumCoverageMap({ daysCovered, compact = false }: { daysCovered: number[]; compact?: boolean }) {
  const modules = rawCurriculum.modules;
  const totalTouched = modules.filter(m =>
    daysCovered.some(d => d >= m.days[0] && d <= m.days[1])
  ).length;

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: compact ? '12px 14px' : '16px 18px',
      fontSize: 13,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Curriculum Coverage
        </span>
        <span style={{ fontSize: 11, color: totalTouched > 0 ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 600 }}>
          {totalTouched}/8 Modules Touched
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
        gap: 6,
      }}>
        {modules.map(m => {
          const isCovered = daysCovered.some(d => d >= m.days[0] && d <= m.days[1]);
          return (
            <div
              key={m.n}
              title={`Module ${m.n}: ${m.title} (Days ${m.days[0]}–${m.days[1]})`}
              style={{
                background: isCovered ? 'var(--accent-dim)' : 'var(--bg-3)',
                border: `1px solid ${isCovered ? 'var(--accent)' : 'var(--border-light)'}`,
                borderRadius: 6,
                padding: compact ? '6px 8px' : '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isCovered ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: isCovered ? '0 0 6px var(--accent)' : 'none',
                flexShrink: 0,
              }} />
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isCovered ? 'var(--accent)' : 'var(--text-muted)' }}>
                  M{m.n}
                </span>
                {!compact && (
                  <span style={{ fontSize: 11, color: isCovered ? 'var(--text)' : 'var(--text-dim)', marginLeft: 4 }}>
                    {m.title}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Header({
  candidateName, questionCount, daysCovered, elapsedMin, loading,
}: {
  candidateName: string;
  questionCount: number;
  daysCovered: number[];
  elapsedMin: number;
  loading: boolean;
}) {
  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '54px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10,10,10,0.97)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Left: brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Saarthi</span>
        {candidateName && (
          <>
            <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{candidateName}</span>
          </>
        )}
      </div>

      {/* Right: stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Stat label="Q" value={String(questionCount)} />
        <Stat label="days" value={String(daysCovered.length)} />
        <Stat label="min" value={String(elapsedMin)} />
      </div>
    </nav>
  );
}

function FeedbackPanel({ feedback, candidateName, daysCovered, onRestart }: {
  feedback: FinalFeedbackResult;
  candidateName: string;
  daysCovered: number[];
  onRestart: () => void;
}) {
  return (
    <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Interview Complete{candidateName ? ` · ${candidateName}` : ''}</h2>
      </div>

      {/* Final Coverage Map Snapshot */}
      <div style={{ marginBottom: 24 }}>
        <CurriculumCoverageMap daysCovered={daysCovered} compact={false} />
      </div>

      {/* Summary */}
      <Section title="Overall Assessment" color="var(--text)">
        <p style={{ margin: 0, lineHeight: 1.8, color: 'var(--text)', fontSize: 14 }}>{feedback.summary}</p>
      </Section>

      {/* Strengths */}
      {feedback.strengths?.length > 0 && (
        <Section title="Strengths" color="#22c55e">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.strengths.map((s, i) => (
              <li key={i} style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gaps */}
      {feedback.gaps?.length > 0 && (
        <Section title="Areas to Strengthen" color="#f59e0b">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.gaps.map((g, i) => (
              <li key={i} style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>{g}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Next steps */}
      {feedback.next?.length > 0 && (
        <Section title="Recommended Next Steps" color="var(--accent)">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.next.map((n, i) => (
              <li key={i} style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>{n}</li>
            ))}
          </ul>
        </Section>
      )}

      <button
        id="restart-interview"
        onClick={onRestart}
        style={{
          marginTop: 8,
          padding: '11px 20px',
          background: 'var(--bg-3)',
          border: '1px solid var(--border-light)',
          borderRadius: 6,
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        ← New Interview
      </button>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main interview content
// ---------------------------------------------------------------------------

function InterviewContent() {
  const params = useSearchParams();
  const router = useRouter();

  const candidateParam = params.get('candidate');
  const candidateNameParam = params.get('candidateName') || '';

  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'interview' | 'done'>('loading');
  const [feedback, setFeedback] = useState<FinalFeedbackResult | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [daysCovered, setDaysCovered] = useState<number[]>([]);
  const [priorSignals, setPriorSignals] = useState<string[]>([]);
  const [apiHistory, setApiHistory] = useState<InterviewMessage[]>([]);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ------------------------------------------------------------------
  // Resolve candidate object
  // ------------------------------------------------------------------
  useEffect(() => {
    let cand: CandidateData | null = null;

    if (candidateParam) {
      try { cand = JSON.parse(decodeURIComponent(candidateParam)); } catch { /* ignore */ }
    }

    if (!cand) {
      try {
        const stored = sessionStorage.getItem('saarthi_candidate');
        if (stored) cand = JSON.parse(stored);
      } catch { /* ignore */ }
    }

    if (!cand) {
      const id = params.get('sessionId') || `anon-${Date.now()}`;
      const name = candidateNameParam || 'Candidate';
      cand = {
        member: { id, name, jobRole: 'Engineer', yearsExperience: 0, education: '', status: 'ACTIVE' },
        missions: [],
      };
    }

    setCandidate(cand);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Start interview once candidate is resolved
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!candidate) return;
    startInterview(candidate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [
      ...prev,
      { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() },
    ]);
  };

  const callApi = async (body: object) => {
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'API error' }));
      throw new Error(err.error || 'API error');
    }
    return res.json();
  };

  const startInterview = async (cand: CandidateData) => {
    setPhase('loading');
    setError('');
    try {
      const data = await callApi({ action: 'start', candidate: cand });
      addMessage({ role: 'interviewer', text: data.reply });
      setQuestionCount(data.questionCount ?? 1);
      setDaysCovered(data.daysCovered ?? []);
      if (data.priorSignals && Array.isArray(data.priorSignals)) {
        setPriorSignals(data.priorSignals);
      }
      setPhase('interview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview');
      setPhase('interview');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || loading || !candidate) return;
    const trimmed = answer.trim();
    setAnswer('');
    setLoading(true);
    setError('');

    // Add user message optimistically
    addMessage({ role: 'candidate', text: trimmed });

    // Build updated history to send
    const newHistory: InterviewMessage[] = [
      ...apiHistory,
      { role: 'candidate', text: trimmed },
    ];

    try {
      const data = await callApi({
        action: 'answer',
        candidate,
        history: newHistory,
        message: trimmed,
        daysCovered,
      });

      // Attach subtle signalTag to candidate's message if returned
      if (data.signalTag) {
        setMessages(prev => {
          const updated = [...prev];
          const lastCandIdx = updated.map((m, i) => ({ m, i })).filter(({ m }) => m.role === 'candidate').pop()?.i;
          if (lastCandIdx !== undefined) {
            updated[lastCandIdx] = { ...updated[lastCandIdx], signalTag: data.signalTag };
          }
          return updated;
        });
      }

      if (data.done) {
        addMessage({ role: 'interviewer', text: data.reply });
        setFeedback(data.feedback);
        if (data.daysCovered) setDaysCovered(data.daysCovered);
        setPhase('done');
      } else {
        const withInterviewer: InterviewMessage[] = [
          ...newHistory,
          { role: 'interviewer', text: data.reply },
        ];
        setApiHistory(withInterviewer);
        addMessage({ role: 'interviewer', text: data.reply });
        setQuestionCount(data.questionCount ?? questionCount + 1);
        setDaysCovered(data.daysCovered ?? daysCovered);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const elapsedMin = Math.floor(
    (Date.now() - (messages[0]?.timestamp.getTime() ?? Date.now())) / 60000
  );

  const candidateName = candidate?.member?.name || candidateNameParam || '';

  // ------------------------------------------------------------------
  // Done screen
  // ------------------------------------------------------------------
  if (phase === 'done' && feedback) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header candidateName={candidateName} questionCount={questionCount} daysCovered={daysCovered} elapsedMin={elapsedMin} loading={false} />
        <FeedbackPanel feedback={feedback} candidateName={candidateName} daysCovered={daysCovered} onRestart={() => router.push('/')} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Interview screen
  // ------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header
        candidateName={candidateName}
        questionCount={questionCount}
        daysCovered={daysCovered}
        elapsedMin={elapsedMin}
        loading={loading}
      />

      {/* Main Container: Chat Column + Sidebar Coverage Map */}
      <div style={{
        flex: 1,
        maxWidth: 1100,
        width: '100%',
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        gap: 24,
        overflow: 'hidden',
      }}>
        {/* Left: Chat Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Scrollable messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 4 }}>
            
            {phase === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '20px 0' }}>
                <Spinner />
                <span>Connecting to interviewer...</span>
              </div>
            )}

            {/* PRIOR SIGNALS RESUME INDICATOR */}
            {priorSignals.length > 0 && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <span style={{ fontSize: 14 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Building on your last session
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                    {priorSignals.slice(0, 2).map((s, idx) => (
                      <div key={idx} style={{ marginTop: 2 }}>• {s}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'candidate' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {msg.role === 'interviewer' ? 'Interviewer' : candidateName || 'You'}
                  </span>
                </div>

                <div style={{
                  maxWidth: '84%',
                  background: msg.role === 'candidate' ? 'var(--bg-3)' : 'var(--bg-2)',
                  border: `1px solid ${msg.role === 'interviewer' ? 'var(--border)' : 'var(--border-light)'}`,
                  borderRadius: msg.role === 'candidate' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                  padding: '14px 16px',
                  color: 'var(--text)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.text}
                </div>

                {/* LIVE INTERVIEWER SIGNAL BADGE (understated private note) */}
                {msg.role === 'candidate' && msg.signalTag && (
                  <div style={{
                    marginTop: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 12,
                    padding: '2px 8px',
                  }}>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>📋 Read:</span>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{msg.signalTag}</span>
                  </div>
                )}

                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', padding: '4px 0' }}>
                <Spinner />
                <span style={{ fontSize: 13 }}>Evaluating answer...</span>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 6,
                padding: '10px 14px',
                color: '#ef4444',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Right: Sidebar Curriculum Coverage Map */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CurriculumCoverageMap daysCovered={daysCovered} compact={false} />

          {/* Candidate Context Pill */}
          {candidate && (
            <div style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                {candidate.member.name}
              </div>
              <div>{candidate.member.jobRole} · {candidate.member.yearsExperience} yrs exp</div>
              {candidate.missions.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                  <span>Passed: {candidate.missions.filter(m => m.passed).length}</span>
                  <span>Skipped: {candidate.missions.filter(m => m.skipped).length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      {phase === 'interview' && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              ref={textareaRef}
              id="answer-input"
              placeholder="Type your answer… (Ctrl+Enter to submit)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={3}
              style={{
                width: '100%',
                background: 'var(--bg-2)',
                border: '1px solid var(--border-light)',
                borderRadius: 6,
                padding: '12px 14px',
                color: 'var(--text)',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'var(--font)',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Ctrl+Enter to submit</span>
              <button
                id="submit-answer"
                onClick={handleSubmitAnswer}
                disabled={loading || !answer.trim()}
                style={{
                  padding: '9px 18px',
                  background: loading || !answer.trim() ? 'var(--bg-3)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 6,
                  color: loading || !answer.trim() ? 'var(--text-dim)' : '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {loading ? <><Spinner size={12} /> Evaluating</> : 'Submit Answer →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    }>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <InterviewContent />
    </Suspense>
  );
}
