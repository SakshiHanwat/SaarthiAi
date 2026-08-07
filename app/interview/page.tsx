'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { InterviewMessage, CandidateData, FinalFeedbackResult } from '@/lib/gemini';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'interviewer' | 'candidate' | 'system';
  text: string;
  timestamp: Date;
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

function Header({
  candidateName, questionCount, daysCovered, elapsedMin, onFinish, loading,
}: {
  candidateName: string;
  questionCount: number;
  daysCovered: number[];
  elapsedMin: number;
  onFinish?: () => void;
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

      {/* Right: stats + end */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Stat label="Q" value={String(questionCount)} />
        <Stat label="days" value={String(daysCovered.length)} />
        <Stat label="min" value={String(elapsedMin)} />
        {onFinish && (
          <button
            id="end-interview"
            onClick={onFinish}
            disabled={loading || questionCount < 2}
            title={questionCount < 2 ? 'Answer at least 2 questions first' : 'End interview early'}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: 4,
              color: questionCount < 2 ? 'var(--text-dim)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 500,
              cursor: questionCount < 2 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            End Interview
          </button>
        )}
      </div>
    </nav>
  );
}

function FeedbackPanel({ feedback, candidateName, onRestart }: {
  feedback: FinalFeedbackResult;
  candidateName: string;
  onRestart: () => void;
}) {
  return (
    <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Interview Complete{candidateName ? ` · ${candidateName}` : ''}</h2>
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

  // The interview/page is still accessible via the old query-param flow
  // AND via new direct usage with a candidate object in sessionStorage.
  // For now we read candidateId from params; the candidate object is
  // fetched from sessionStorage (set by landing page) or built minimally.
  const candidateParam = params.get('candidate'); // JSON-encoded candidate or null
  const candidateNameParam = params.get('candidateName') || '';

  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'interview' | 'done'>('loading');
  const [feedback, setFeedback] = useState<FinalFeedbackResult | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [daysCovered, setDaysCovered] = useState<number[]>([]);
  const [apiHistory, setApiHistory] = useState<InterviewMessage[]>([]);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ------------------------------------------------------------------
  // Resolve candidate object
  // ------------------------------------------------------------------
  useEffect(() => {
    let cand: CandidateData | null = null;

    // Try JSON param (future flow where landing page passes it)
    if (candidateParam) {
      try { cand = JSON.parse(decodeURIComponent(candidateParam)); } catch { /* ignore */ }
    }

    // Try sessionStorage
    if (!cand) {
      try {
        const stored = sessionStorage.getItem('saarthi_candidate');
        if (stored) cand = JSON.parse(stored);
      } catch { /* ignore */ }
    }

    // Fallback: build a minimal candidate from legacy query params
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

      if (data.done) {
        addMessage({ role: 'interviewer', text: data.reply });
        setFeedback(data.feedback);
        setPhase('done');
      } else {
        // Update history with interviewer's next question
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
        <FeedbackPanel feedback={feedback} candidateName={candidateName} onRestart={() => router.push('/')} />
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
        onFinish={undefined /* auto-ends by API */}
        loading={loading}
      />

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {phase === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '20px 0' }}>
              <Spinner />
              <span>Connecting to interviewer...</span>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'candidate' ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', paddingLeft: msg.role !== 'candidate' ? 2 : 0 }}>
                {msg.role === 'interviewer' ? 'Interviewer' : candidateName || 'You'}
              </span>
              <div style={{
                maxWidth: '80%',
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
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', padding: '4px 0' }}>
              <Spinner />
              <span style={{ fontSize: 13 }}>Thinking...</span>
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

      {/* Input bar */}
      {phase === 'interview' && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(12px)',
          padding: '16px 24px',
        }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                {loading ? <><Spinner size={12} /> Thinking</> : 'Submit Answer →'}
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
