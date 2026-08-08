'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import rawCandidates from '@/data/candidates.json';
import rawCurriculum from '@/data/curriculum.json';

const CANDIDATES = rawCandidates.candidates;
const MODULES = rawCurriculum.modules;
const TOTAL_DAYS = rawCurriculum.days.length;

// Unique roles for filtering
const ROLES = ['All Roles', ...Array.from(new Set(CANDIDATES.map((c) => c.member.jobRole)))];

export default function LandingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [startingId, setStartingId] = useState<string | null>(null);

  // Filter candidates based on search & role filter
  const filteredCandidates = useMemo(() => {
    return CANDIDATES.filter((c) => {
      const matchesRole = selectedRole === 'All Roles' || c.member.jobRole === selectedRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.member.name.toLowerCase().includes(q) ||
        c.member.jobRole.toLowerCase().includes(q) ||
        c.member.id.toLowerCase().includes(q) ||
        c.member.education.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [searchQuery, selectedRole]);

  // Handle starting interview for a specific candidate
  const handleStartInterview = (candidateObj: typeof CANDIDATES[number]) => {
    setStartingId(candidateObj.member.id);

    try {
      sessionStorage.setItem('saarthi_candidate', JSON.stringify(candidateObj));
    } catch (e) {
      console.warn('[saarthi] Failed to store candidate in sessionStorage', e);
    }

    const sessionId = uuidv4();
    const params = new URLSearchParams({
      sessionId,
      candidateId: candidateObj.member.id,
      candidateName: candidateObj.member.name,
    });

    router.push(`/interview?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Subtle Grid Background Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1200px',
          height: '450px',
          background: 'radial-gradient(circle at 50% 20%, rgba(29, 155, 240, 0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          height: '60px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 10px var(--accent)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--text)' }}>
              Saarthi
            </span>
          </div>
          <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            AI Technical Interview Platform
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://github.com/SakshiHanwat/SaarthiAi"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>GitHub Repository</span>
            <span>↗</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, zIndex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '50px 24px 80px' }}>
        
        {/* HERO SECTION */}
        <section className="fade-in" style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto 56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent-dim)',
              border: '1px solid rgba(29, 155, 240, 0.25)',
              borderRadius: 20,
              padding: '5px 14px',
              marginBottom: 24,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
            <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Gemini 1.5 Flash · Breeth Memory Graph
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 54px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--text)',
              margin: '0 0 20px',
            }}
          >
            Adaptive Technical Interviews{' '}
            <span style={{ color: 'var(--accent)' }}>That Remember.</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: 'var(--text-muted)',
              maxWidth: 620,
              margin: '0 auto 32px',
            }}
          >
            Saarthi evaluates engineering candidates across 31 curriculum days. Powered by Breeth memory graphs, it remembers past session signals, adapts follow-ups in real-time, and generates post-interview diagnostics.
          </p>
        </section>

        {/* METRICS / STATS OVERVIEW STRIP */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 56,
          }}
        >
          <MetricCard title="Candidates Available" value={CANDIDATES.length.toString()} subtitle="Full telemetry dataset" icon="👥" />
          <MetricCard title="Curriculum Modules" value={MODULES.length.toString()} subtitle={`${TOTAL_DAYS}-Day AI Cohort`} icon="📚" />
          <MetricCard title="Stateful Memory" value="Breeth REST API" subtitle="Graph-based episodic memory" icon="🧠" />
          <MetricCard title="Real-Time Signals" value="Live Intent Tags" subtitle="Adaptive situational feedback" icon="⚡" />
        </section>

        {/* CANDIDATE ROSTER SECTION */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--text)' }}>
                  Candidate Evaluation Roster
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Select a candidate profile to initiate an adaptive technical interview.
                </p>
              </div>

              <span style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 6 }}>
                Showing {filteredCandidates.length} of {CANDIDATES.length} Candidates
              </span>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <input
                  id="candidate-search"
                  type="text"
                  placeholder="Search candidate by name, role, ID, education..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    padding: '10px 14px 10px 36px',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>
                  🔍
                </span>
              </div>

              {/* Role filter pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    style={{
                      background: selectedRole === role ? 'var(--accent-dim)' : 'var(--bg-2)',
                      border: `1px solid ${selectedRole === role ? 'var(--accent)' : 'var(--border-light)'}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: selectedRole === role ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CANDIDATE CARDS GRID */}
          {filteredCandidates.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>No candidate matches found</div>
              <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-dim)' }}>
                Try clearing your search query or switching role filters.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 16,
              }}
            >
              {filteredCandidates.map((c) => (
                <CandidateCard
                  key={c.member.id}
                  candidate={c}
                  isStarting={startingId === c.member.id}
                  onStart={() => handleStartInterview(c)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 32px',
          background: 'rgba(10,10,10,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: 'var(--text-dim)',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Saarthi</span>
          <span>·</span>
          <span>Craftora Creator League Hackathon</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>Next.js 14 App Router</span>
          <span>·</span>
          <span>Gemini 1.5 Flash</span>
          <span>·</span>
          <span>Breeth Memory Graph</span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {subtitle}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  isStarting,
  onStart,
}: {
  candidate: typeof CANDIDATES[number];
  isStarting: boolean;
  onStart: () => void;
}) {
  const { member, missions } = candidate;

  // Compute telemetry metrics
  const passedMissions = missions.filter((m) => m.passed);
  const skippedMissions = missions.filter((m) => m.skipped);
  const failedMissions = missions.filter((m) => m.passed === false);
  const highAttemptMissions = missions.filter((m) => (m.attempts ?? 1) >= 4);

  const totalTracked = missions.length;
  const progressPct = totalTracked > 0 ? Math.round((passedMissions.length / totalTracked) * 100) : 0;

  return (
    <div
      onClick={onStart}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(29, 155, 240, 0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        {/* Top bar: name + ID tag */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            {member.name}
          </h3>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--bg-3)', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: 4 }}>
            {member.id}
          </span>
        </div>

        {/* Subhead: role & experience */}
        <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>
          {member.jobRole}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {member.yearsExperience} yrs experience · {member.education}
        </div>

        {/* Telemetry Progress Bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Missions Passed</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{passedMissions.length} / {totalTracked} ({progressPct}%)</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: progressPct >= 80 ? '#22c55e' : progressPct >= 50 ? 'var(--accent)' : '#f59e0b',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Performance telemetry chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {passedMissions.length > 0 && (
            <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
              {passedMissions.length} Passed
            </span>
          )}
          {skippedMissions.length > 0 && (
            <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
              {skippedMissions.length} Skipped
            </span>
          )}
          {failedMissions.length > 0 && (
            <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 6px', borderRadius: 4 }}>
              {failedMissions.length} Failed
            </span>
          )}
          {highAttemptMissions.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-3)', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: 4 }}>
              {highAttemptMissions.length} High-Attempt
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Action */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span>Breeth Memory Active</span>
        </div>

        <button
          disabled={isStarting}
          style={{
            background: isStarting ? 'var(--bg-3)' : 'var(--accent-dim)',
            border: `1px solid ${isStarting ? 'var(--border)' : 'rgba(29, 155, 240, 0.4)'}`,
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: isStarting ? 'var(--text-dim)' : 'var(--accent)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          {isStarting ? (
            <>
              <span style={{ width: 10, height: 10, border: '2px solid var(--text-dim)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              Launching...
            </>
          ) : (
            'Start Interview →'
          )}
        </button>
      </div>
    </div>
  );
}
