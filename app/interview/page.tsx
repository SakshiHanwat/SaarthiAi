'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { InterviewMessage, EvaluationResult } from '@/lib/gemini';

interface ChatMessage {
  id: string;
  role: 'interviewer' | 'user' | 'system';
  content: string;
  evaluation?: EvaluationResult;
  timestamp: Date;
}

const TRACK_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full Stack',
  dsa: 'DSA',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
};

function ScoreBadge({ score }: { score: number }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: `${SCORE_COLOR(score)}18`,
      border: `1px solid ${SCORE_COLOR(score)}40`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
      color: SCORE_COLOR(score),
    }}>
      {score}/10
    </span>
  );
}

function EvalPanel({ eval: ev }: { eval: EvaluationResult }) {
  return (
    <div style={{
      marginTop: 12,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
      fontSize: 13,
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Evaluation</span>
        <ScoreBadge score={ev.score} />
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.6 }}>{ev.feedback}</p>
        {ev.strengths?.length > 0 && (
          <div>
            <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Strengths</span>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ev.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        {ev.improvements?.length > 0 && (
          <div>
            <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Improve</span>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ev.improvements.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewContent() {
  const params = useSearchParams();
  const router = useRouter();

  const sessionId = params.get('sessionId') || '';
  const track = params.get('track') || '';
  const difficulty = (params.get('difficulty') || 'mid') as 'junior' | 'mid' | 'senior';
  const questionType = params.get('questionType') || 'conceptual';
  const candidateName = params.get('candidateName') || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'loading' | 'interview' | 'summary'>('loading');
  const [summary, setSummary] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [lastQuestion, setLastQuestion] = useState('');
  const [apiHistory, setApiHistory] = useState<InterviewMessage[]>([]);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
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
      const err = await res.json();
      throw new Error(err.error || 'API error');
    }
    return res.json();
  };

  // Start interview
  useEffect(() => {
    if (!sessionId || !track) {
      router.push('/');
      return;
    }

    const start = async () => {
      setPhase('loading');
      try {
        const data = await callApi({
          action: 'start',
          sessionId,
          track,
          difficulty,
          questionType,
          candidateName,
          history: [],
        });
        addMessage({ role: 'interviewer', content: data.question });
        setLastQuestion(data.question);
        setQuestionCount(1);
        setPhase('interview');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start interview');
        setPhase('interview');
      }
    };

    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || loading) return;
    const trimmed = answer.trim();
    setAnswer('');
    setLoading(true);
    setError('');

    addMessage({ role: 'user', content: trimmed });

    try {
      const data = await callApi({
        action: 'answer',
        sessionId,
        track,
        difficulty,
        questionType,
        candidateName,
        lastQuestion,
        answer: trimmed,
        history: apiHistory,
      });

      const newHistory: InterviewMessage[] = [
        ...apiHistory,
        { role: 'interviewer', content: lastQuestion },
        { role: 'user', content: trimmed },
      ];
      setApiHistory(newHistory);

      // Show evaluation attached to user message
      setMessages((prev) => {
        const updated = [...prev];
        const lastUser = updated.map((m, i) => ({ m, i })).filter(({ m }) => m.role === 'user').pop();
        if (lastUser) {
          updated[lastUser.i] = { ...updated[lastUser.i], evaluation: data.evaluation };
        }
        return updated;
      });

      // Show next question
      addMessage({ role: 'interviewer', content: data.nextQuestion });
      setLastQuestion(data.nextQuestion);
      setQuestionCount((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callApi({
        action: 'summary',
        sessionId,
        track,
        difficulty,
        candidateName,
        history: apiHistory,
      });
      setSummary(data.summary);
      setPhase('summary');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const elapsedMinutes = Math.floor((Date.now() - (messages[0]?.timestamp.getTime() || Date.now())) / 60000);

  if (phase === 'summary') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header candidateName={candidateName} track={track} difficulty={difficulty} questionCount={questionCount} elapsedMin={elapsedMinutes} onFinish={undefined} loading={false} />
        <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Interview Complete</h2>
          </div>

          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '28px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
            color: 'var(--text)',
            fontSize: 14,
            marginBottom: 24,
          }}>
            {summary}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="restart-interview"
              onClick={() => router.push('/')}
              style={{
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
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header
        candidateName={candidateName}
        track={track}
        difficulty={difficulty}
        questionCount={questionCount}
        elapsedMin={elapsedMinutes}
        onFinish={handleFinish}
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
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {/* Role label */}
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', paddingLeft: msg.role !== 'user' ? 2 : 0 }}>
                {msg.role === 'interviewer' ? 'Interviewer' : candidateName || 'You'}
              </span>

              {/* Bubble */}
              <div style={{
                maxWidth: '80%',
                background: msg.role === 'user' ? 'var(--bg-3)' : 'var(--bg-2)',
                border: `1px solid ${msg.role === 'interviewer' ? 'var(--border)' : 'var(--border-light)'}`,
                borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                padding: '14px 16px',
                color: 'var(--text)',
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
                {msg.evaluation && <EvalPanel eval={msg.evaluation} />}
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', padding: '4px 0' }}>
              <Spinner />
              <span style={{ fontSize: 13 }}>Evaluating...</span>
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
              placeholder="Type your answer... (Ctrl+Enter to submit)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || phase !== 'interview'}
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
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
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

function Header({
  candidateName, track, difficulty, questionCount, elapsedMin, onFinish, loading,
}: {
  candidateName: string;
  track: string;
  difficulty: string;
  questionCount: number;
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
      {/* Left: brand + session info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Saarthi</span>
        </div>
        <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {track && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>
              {TRACK_LABELS[track] || track}
            </span>
          )}
          {difficulty && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{difficulty}</span>
          )}
        </div>
      </div>

      {/* Right: stats + end button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <Stat label="Q" value={String(questionCount)} />
          <Stat label="min" value={String(elapsedMin)} />
          {candidateName && <Stat label="" value={candidateName} />}
        </div>
        {onFinish && (
          <button
            id="end-interview"
            onClick={onFinish}
            disabled={loading || questionCount < 2}
            title={questionCount < 2 ? 'Answer at least 2 questions first' : 'End interview and get summary'}
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
            onMouseEnter={(e) => { if (questionCount >= 2) e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = questionCount < 2 ? 'var(--text-dim)' : 'var(--text-muted)'; }}
          >
            End Interview
          </button>
        )}
      </div>
    </nav>
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
