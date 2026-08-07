'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import rawCandidates from '@/data/candidates.json';

const candidatesList = rawCandidates.candidates;

export default function LandingPage() {
  const router = useRouter();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidatesList[0]?.member?.id || '');
  const [customName, setCustomName] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = () => {
    setError('');
    setStarting(true);

    let candidateObj: any = candidatesList.find((c) => c.member.id === selectedCandidateId);

    if (!candidateObj) {
      const id = `CAND-${uuidv4().slice(0, 6)}`;
      candidateObj = {
        member: {
          id,
          name: customName.trim() || 'Anonymous Candidate',
          jobRole: 'Software Engineer',
          yearsExperience: 3,
          education: 'BS Computer Science',
          status: 'ACTIVE',
        },
        missions: [],
      };
    } else if (customName.trim()) {
      candidateObj = {
        ...candidateObj,
        member: {
          ...candidateObj.member,
          name: customName.trim(),
        },
      };
    }

    // Store candidate object in sessionStorage so the interview page can read it directly
    try {
      sessionStorage.setItem('saarthi_candidate', JSON.stringify(candidateObj));
    } catch (e) {
      console.warn('Failed to save to sessionStorage', e);
    }

    const sessionId = uuidv4();
    const params = new URLSearchParams({
      sessionId,
      candidateId: candidateObj.member.id,
      candidateName: candidateObj.member.name,
    });

    router.push(`/interview?${params.toString()}`);
  };

  const selectedCandidate = candidatesList.find((c) => c.member.id === selectedCandidateId);

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
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>AI Technical Interview Platform</span>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: 640, width: '100%' }}>
          {/* Heading */}
          <div style={{ marginBottom: 40 }}>
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
                AI Technical Interviewer
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>
              Adaptive technical interviews powered by <span style={{ color: 'var(--accent)' }}>Gemini & Breeth.</span>
            </h1>
            <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, maxWidth: 540 }}>
              Saarthi probes completed, skipped, and high-attempt curriculum topics, tracking memory signals across sessions and producing detailed post-interview evaluations.
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
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                    <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  ))}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>candidate_session.json</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>20 Candidates Available</span>
            </div>

            {/* Card body */}
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Candidate dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Select Candidate Profile <span style={{ color: 'var(--danger)', fontSize: 11 }}>*</span>
                </label>
                <select
                  id="candidate-select"
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  {candidatesList.map((c) => (
                    <option key={c.member.id} value={c.member.id}>
                      {c.member.name} — {c.member.jobRole} ({c.member.yearsExperience} yrs exp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Candidate Info Card */}
              {selectedCandidate && (
                <div style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '14px 16px',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedCandidate.member.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selectedCandidate.member.id}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Role: <strong style={{ color: 'var(--text)' }}>{selectedCandidate.member.jobRole}</strong> ({selectedCandidate.member.yearsExperience} yrs) · {selectedCandidate.member.education}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                    <span>Missions Passed: {selectedCandidate.missions.filter((m: any) => m.passed).length}</span>
                    <span>Skipped: {selectedCandidate.missions.filter((m: any) => m.skipped).length}</span>
                    <span>Failed: {selectedCandidate.missions.filter((m: any) => m.passed === false).length}</span>
                  </div>
                </div>
              )}

              {/* Custom Name Override */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Override Name <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
                </label>
                <input
                  id="custom-name"
                  type="text"
                  placeholder="Enter custom candidate name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
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
                    Initializing Interview...
                  </>
                ) : (
                  'Start Interview →'
                )}
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: 12 }}>
            Powered by Gemini 1.5 Flash · Memory by Breeth Graph REST API
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
