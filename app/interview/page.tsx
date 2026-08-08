'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
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
      background: '#121212',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 10,
      padding: compact ? '12px 14px' : '16px 18px',
      fontSize: 13,
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Curriculum Coverage
        </span>
        <span style={{ fontSize: 11, color: totalTouched > 0 ? 'var(--accent)' : 'rgba(255, 255, 255, 0.4)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {totalTouched}/8 Modules Touched
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(2, minmax(0, 1fr))',
        gap: 8,
        width: '100%',
      }}>
        {modules.map(m => {
          const isCovered = daysCovered.some(d => d >= m.days[0] && d <= m.days[1]);
          return (
            <div
              key={m.n}
              title={`Module ${m.n}: ${m.title} (Days ${m.days[0]}–${m.days[1]})`}
              style={{
                background: isCovered ? 'var(--accent-dim)' : '#1a1a1a',
                border: `1px solid ${isCovered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: 6,
                padding: compact ? '6px 8px' : '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isCovered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.3)',
                boxShadow: isCovered ? '0 0 6px var(--accent)' : 'none',
                flexShrink: 0,
              }} />
              <div style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isCovered ? 'var(--accent)' : 'rgba(255, 255, 255, 0.8)' }}>
                  M{m.n}
                </span>
                {!compact && (
                  <span style={{ fontSize: 11, color: isCovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)', marginLeft: 4 }}>
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
  candidateName, questionCount, daysCovered, elapsedMin,
}: {
  candidateName: string;
  questionCount: number;
  daysCovered: number[];
  elapsedMin: number;
}) {
  return (
    <nav style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0 20px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10, 10, 10, 0.9)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      flexShrink: 0,
    }}>
      {/* Left: brand & candidate subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: 'transparent',
          }}
        >
          <Image
            src="/logo.png"
            alt="Saarthi Logo"
            width={28}
            height={28}
            style={{
              objectFit: 'contain',
              width: '100%',
              height: '100%',
              mixBlendMode: 'screen',
              filter: 'invert(1) hue-rotate(180deg) drop-shadow(0 0 6px rgba(29, 155, 240, 0.4))',
            }}
          />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#ffffff', letterSpacing: '-0.01em' }}>Saarthi</span>
        {candidateName && (
          <>
            <span style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }} className="truncate max-w-[120px] sm:max-w-none">
                {candidateName}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }} className="hidden sm:inline-block">
                · Interview with Saarthi
              </span>
            </div>
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
    <div style={{ maxWidth: 780, width: '100%', margin: '0 auto', padding: '32px 16px', boxSizing: 'border-box' }} className="flex flex-col gap-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
          Interview Complete{candidateName ? ` · ${candidateName}` : ''}
        </h2>
      </div>

      {/* Final Coverage Map Snapshot */}
      <div>
        <CurriculumCoverageMap daysCovered={daysCovered} compact={false} />
      </div>

      {/* Summary */}
      <Section title="Overall Assessment" color="#ffffff">
        <p style={{ margin: 0, lineHeight: 1.8, color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>{feedback.summary}</p>
      </Section>

      {/* Strengths */}
      {feedback.strengths?.length > 0 && (
        <Section title="Strengths" color="#22c55e">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.strengths.map((s, i) => (
              <li key={i} style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, lineHeight: 1.6 }}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gaps */}
      {feedback.gaps?.length > 0 && (
        <Section title="Areas to Strengthen" color="#f59e0b">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.gaps.map((g, i) => (
              <li key={i} style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, lineHeight: 1.6 }}>{g}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Next steps */}
      {feedback.next?.length > 0 && (
        <Section title="Recommended Next Steps" color="var(--accent)">
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {feedback.next.map((n, i) => (
              <li key={i} style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, lineHeight: 1.6 }}>{n}</li>
            ))}
          </ul>
        </Section>
      )}

      <div>
        <button
          id="restart-interview"
          onClick={onRestart}
          style={{
            padding: '11px 22px',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
        >
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#121212', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#181818' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: '16px 18px', wordBreak: 'break-word' }}>{children}</div>
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
        <Header candidateName={candidateName} questionCount={questionCount} daysCovered={daysCovered} elapsedMin={elapsedMin} />
        <FeedbackPanel feedback={feedback} candidateName={candidateName} daysCovered={daysCovered} onRestart={() => router.push('/')} />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Interview screen
  // ------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <Header
        candidateName={candidateName}
        questionCount={questionCount}
        daysCovered={daysCovered}
        elapsedMin={elapsedMin}
      />

      {/* Main Container: Chat Column + Sidebar Coverage Map */}
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-[1100px] mx-auto p-4 md:p-6 flex-1 min-h-0 overflow-hidden box-border">
        
        {/* Left: Chat Column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Scrollable messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 4 }}>
            
            {phase === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255, 255, 255, 0.6)', padding: '20px 0' }}>
                <Spinner />
                <span>Connecting to interviewer...</span>
              </div>
            )}

            {/* PRIOR SIGNALS RESUME INDICATOR */}
            {priorSignals.length > 0 && (
              <div style={{
                background: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.7)',
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
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}>
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
                  <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {msg.role === 'interviewer' ? 'Interviewer' : candidateName || 'You'}
                  </span>
                </div>

                <div style={{
                  maxWidth: '88%',
                  background: msg.role === 'candidate' ? '#1c1c1c' : '#121212',
                  border: `1px solid ${msg.role === 'interviewer' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.15)'}`,
                  borderRadius: msg.role === 'candidate' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                  padding: '14px 16px',
                  color: '#ffffff',
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>

                {/* LIVE INTERVIEWER SIGNAL BADGE */}
                {msg.role === 'candidate' && msg.signalTag && (
                  <div style={{
                    marginTop: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    color: 'rgba(255, 255, 255, 0.7)',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: '2px 9px',
                  }}>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>📋 Read:</span>
                    <span style={{ fontWeight: 500, color: '#ffffff' }}>{msg.signalTag}</span>
                  </div>
                )}

                <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.35)' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255, 255, 255, 0.6)', padding: '4px 0' }}>
                <Spinner />
                <span style={{ fontSize: 13 }}>Evaluating answer...</span>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
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
        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4 overflow-hidden">
          <CurriculumCoverageMap daysCovered={daysCovered} compact={false} />

          {/* Candidate Context Card */}
          {candidate && (
            <div style={{
              background: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.7)',
              boxSizing: 'border-box',
              width: '100%',
            }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 13, marginBottom: 4 }}>
                {candidate.member.name}
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 500, marginBottom: 2 }}>{candidate.member.jobRole}</div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>{candidate.member.yearsExperience} yrs experience · {candidate.member.education}</div>
              
              {candidate.missions.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
                  <span>Passed: <strong style={{ color: '#22c55e' }}>{candidate.missions.filter(m => m.passed).length}</strong></span>
                  <span>Skipped: <strong style={{ color: '#f59e0b' }}>{candidate.missions.filter(m => m.skipped).length}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      {phase === 'interview' && (
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(16px)',
          padding: '14px 20px',
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
                background: '#141414',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                padding: '12px 14px',
                color: '#ffffff',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>Ctrl+Enter to submit</span>
              <button
                id="submit-answer"
                onClick={handleSubmitAnswer}
                disabled={loading || !answer.trim()}
                style={{
                  padding: '9px 20px',
                  background: loading || !answer.trim() ? '#1f1f1f' : '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  color: loading || !answer.trim() ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
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
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        Loading session...
      </div>
    }>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <InterviewContent />
    </Suspense>
  );
}
