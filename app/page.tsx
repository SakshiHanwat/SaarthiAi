'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, ArrowRight, Search } from 'lucide-react';
import rawCandidates from '@/data/candidates.json';
import rawCurriculum from '@/data/curriculum.json';

const CANDIDATES = rawCandidates.candidates;
const MODULES = rawCurriculum.modules;
const TOTAL_DAYS = rawCurriculum.days.length;

const ROLES = ['All Roles', ...Array.from(new Set(CANDIDATES.map((c) => c.member.jobRole)))];

function SaarthiLogoMark({ size = 30 }: { size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background: 'transparent',
    }}>
      <Image
        src="/logo.png"
        alt="Saarthi Logo"
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          width: '100%',
          height: '100%',
          mixBlendMode: 'screen',
          filter: 'invert(1) hue-rotate(180deg) drop-shadow(0 0 8px rgba(29, 155, 240, 0.4))',
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const rosterRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [startingId, setStartingId] = useState<string | null>(null);

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

  const scrollToRoster = () => {
    rosterRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div style={{ background: '#0a0a0a', color: '#ffffff', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      
      {/* =================================================================== */}
      {/* 1. FULL-SCREEN HERO LANDING SECTION                                 */}
      {/* =================================================================== */}
      <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        
        {/* BACKGROUND ANIMATED GRID & RADIAL GLOW */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(29, 155, 240, 0.04) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(29, 155, 240, 0.04) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '800px',
              height: '500px',
              background: 'radial-gradient(ellipse at center, rgba(29, 155, 240, 0.09) 0%, transparent 65%)',
              filter: 'blur(70px)',
            }}
          />
        </motion.div>

        {/* FIXED NAVBAR */}
        <motion.nav
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            boxSizing: 'border-box',
          }}
          className="md:px-8"
        >
          {/* Left: Image Logo & Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SaarthiLogoMark size={30} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }} className="hidden md:inline-block">
              Saarthi
            </span>
          </div>

          {/* Center-left: Menu pill & tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={scrollToRoster}
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9999,
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ffffff', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={10} strokeWidth={3} />
              </span>
              <span>Menu</span>
            </button>

            <div
              className="hidden md:flex"
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9999,
                padding: '5px 14px',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>AI Interviewer</span>
              <span>·</span>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Adaptive Memory</span>
            </div>
          </div>

          {/* Right: Live Session Pill */}
          <div
            className="hidden md:flex"
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9999,
              padding: '5px 14px',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <LayoutGrid size={10} />
            </div>
            <span>Live Session</span>
          </div>
        </motion.nav>

        {/* HERO SPACER */}
        <div style={{ height: '64px' }} />

        {/* BOTTOM CONTENT OVER GRADIENT FADE */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            zIndex: 10,
            background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.88) 55%, transparent 100%)',
            padding: '60px 20px 40px',
            width: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
          className="md:px-8 md:py-16"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            {/* LEFT BLOCK: LOGO BADGE, SUBTITLE, HEADING, BUTTONS */}
            <div style={{ flex: 1, minWidth: 280, maxWidth: 720 }}>
              
              {/* Fully Transparent Hero Logo Container + Soft Blue Accent Glow */}
              <motion.div
                initial={{ y: 16, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.8 }}
                style={{
                  marginBottom: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                }}
              >
                <Image
                  src="/logo.png"
                  alt="Saarthi Hero Brand"
                  width={72}
                  height={72}
                  style={{
                    objectFit: 'contain',
                    mixBlendMode: 'screen',
                    filter: 'invert(1) hue-rotate(180deg) drop-shadow(0 0 24px rgba(29, 155, 240, 0.5))',
                  }}
                />
              </motion.div>

              {/* Subtitle */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d9bf0', boxShadow: '0 0 8px #1d9bf0' }} />
                <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.55)', letterSpacing: '0.01em' }}>
                  AI interviews that remember you
                </span>
              </motion.div>

              {/* Large Heading */}
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                style={{
                  fontWeight: 300,
                  fontSize: 'clamp(2.2rem, 6.5vw, 4.5rem)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: '#ffffff',
                  margin: '0 0 24px',
                }}
              >
                Interviews That<br />
                Actually Adapt.
              </motion.h1>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
              >
                <button
                  onClick={scrollToRoster}
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: 9999,
                    padding: '11px 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  <span>Start Interview</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={scrollToRoster}
                  style={{
                    background: 'transparent',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 9999,
                    padding: '11px 22px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  How It Works
                </button>
              </motion.div>
            </div>

            {/* RIGHT BLOCK: TAG PILLS */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}
            >
              <span style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11, borderRadius: 9999, padding: '6px 14px' }}>
                Gemini-powered
              </span>
              <span style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11, borderRadius: 9999, padding: '6px 14px' }}>
                Persistent Memory
              </span>
              <span style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 11, borderRadius: 9999, padding: '6px 14px' }}>
                Live Coverage Map
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* =================================================================== */}
      {/* 2. CANDIDATE EVALUATION ROSTER & DASHBOARD SECTION                  */}
      {/* =================================================================== */}
      <div id="roster" ref={rosterRef} style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '48px 20px 80px', scrollMarginTop: '64px', boxSizing: 'border-box' }} className="md:px-8">
        
        {/* METRICS / STATS OVERVIEW STRIP */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <MetricCard title="Candidates Available" value={CANDIDATES.length.toString()} subtitle="Telemetry roster dataset" icon="👥" />
          <MetricCard title="Curriculum Modules" value={MODULES.length.toString()} subtitle={`${TOTAL_DAYS}-Day AI Cohort`} icon="📚" />
          <MetricCard title="Stateful Memory" value="Breeth REST API" subtitle="Graph episodic memory" icon="🧠" />
          <MetricCard title="Real-Time Signals" value="Live Intent Tags" subtitle="Adaptive situational feedback" icon="⚡" />
        </section>

        {/* CANDIDATE ROSTER SECTION */}
        <section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: '#ffffff' }}>
                  Candidate Evaluation Roster
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  Select a candidate profile below to initiate an adaptive technical interview.
                </p>
              </div>

              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: '#121212', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 6 }}>
                Showing {filteredCandidates.length} of {CANDIDATES.length} Candidates
              </span>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <input
                  id="candidate-search"
                  type="text"
                  placeholder="Search candidate by name, role, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                    padding: '10px 14px 10px 36px',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1d9bf0'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
                />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.4 }}>
                  <Search size={14} />
                </span>
              </div>

              {/* Role filter pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}>
                {ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    style={{
                      background: selectedRole === role ? 'rgba(29, 155, 240, 0.15)' : '#121212',
                      border: `1px solid ${selectedRole === role ? '#1d9bf0' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: selectedRole === role ? '#1d9bf0' : 'rgba(255, 255, 255, 0.6)',
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

          {/* RESPONSIVE CANDIDATE CARDS GRID */}
          {filteredCandidates.length === 0 ? (
            <div
              style={{
                background: '#121212',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '48px 24px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>No candidate matches found</div>
              <div style={{ fontSize: 13, marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>
                Try clearing your search query or switching role filters.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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
      </div>

      {/* MINIMAL FOOTER */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 28px',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Saarthi</span>
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
        background: '#121212',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.55)' }}>
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
        background: '#121212',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(29, 155, 240, 0.5)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#ffffff' }}>
            {member.name}
          </h3>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
            {member.id}
          </span>
        </div>

        <div style={{ fontSize: 13, color: '#1d9bf0', fontWeight: 600, marginBottom: 4 }}>
          {member.jobRole}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
          {member.yearsExperience} yrs experience · {member.education}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
            <span>Missions Passed</span>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>{passedMissions.length} / {totalTracked} ({progressPct}%)</span>
          </div>
          <div style={{ height: 5, background: '#1f1f1f', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: progressPct >= 80 ? '#22c55e' : progressPct >= 50 ? '#1d9bf0' : '#f59e0b',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

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
            <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', background: '#1f1f1f', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
              {highAttemptMissions.length} High-Attempt
            </span>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span>Breeth Memory Active</span>
        </div>

        <button
          disabled={isStarting}
          style={{
            background: isStarting ? '#1f1f1f' : 'rgba(29, 155, 240, 0.15)',
            border: `1px solid ${isStarting ? 'rgba(255,255,255,0.1)' : 'rgba(29, 155, 240, 0.4)'}`,
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: isStarting ? 'rgba(255,255,255,0.4)' : '#1d9bf0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          {isStarting ? 'Launching...' : 'Start Interview →'}
        </button>
      </div>
    </div>
  );
}
