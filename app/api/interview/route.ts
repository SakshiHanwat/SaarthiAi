/**
 * POST /api/interview
 *
 * Contract:
 *
 * START (action = "start"):
 *   Request:  { action: "start", candidate: CandidateData }
 *   Response: { reply: string, done: false, questionCount: 1, daysCovered: number[] }
 *
 * TURN (action = "answer"):
 *   Request:  { action: "answer", candidate: CandidateData,
 *               history: InterviewMessage[], message: string }
 *   Response: { reply: string, done: false, questionCount: n, daysCovered: number[] }
 *          OR { reply: "Interview completed.", done: true,
 *               feedback: { summary, strengths, gaps, next } }
 *
 * History is owned by the frontend. The server computes questionCount and
 * daysCovered server-side from the history array every request, then
 * persists signals to Breeth asynchronously (fire-and-forget).
 */

import { NextRequest, NextResponse } from 'next/server';
import { nextTurn, finalFeedback, CandidateData, InterviewMessage } from '@/lib/gemini';
import { writeCandidateProfile, writeInterviewSignal, getCandidateSignals } from '@/lib/breeth';

// ---------------------------------------------------------------------------
// Helpers — derive session state from the client-supplied history
// ---------------------------------------------------------------------------

/** Count how many full interviewer-turn questions have been asked. */
function countQuestions(history: InterviewMessage[]): number {
  return history.filter(m => m.role === 'interviewer').length;
}

/**
 * Derive which curriculum day numbers have been covered.
 * We store dayNumber in the history via a hidden metadata trick:
 * the frontend must include a `__day` field on each interviewer turn.
 * If it doesn't, we scan day numbers from the Gemini replies stored
 * in history. As a fallback the route also returns daysCovered so the
 * frontend can maintain it.
 *
 * Simpler approach used here: the frontend sends `daysCovered` as part
 * of the request body and we just use that + the new day returned by Gemini.
 */
function mergeDays(existing: number[], newDay: number): number[] {
  if (!newDay || newDay === 0) return existing;
  return existing.includes(newDay) ? existing : [...existing, newDay];
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, candidate } = body as {
      action: 'start' | 'answer';
      candidate: CandidateData;
      history?: InterviewMessage[];
      message?: string;
      daysCovered?: number[];
    };

    if (!action || !candidate?.member?.id) {
      return NextResponse.json({ error: 'action and candidate are required' }, { status: 400 });
    }

    const candidateId = candidate.member.id;

    // ------------------------------------------------------------------
    // START
    // ------------------------------------------------------------------
    if (action === 'start') {
      // Fire-and-forget: write candidate profile to Breeth memory
      writeCandidateProfile(candidateId, candidate as unknown as Record<string, unknown>)
        .catch(err => console.error('[route] writeCandidateProfile error:', err));

      // Check for prior session signals (awaited — informs opening question)
      let priorSignals: string[] = [];
      try {
        const edges = await getCandidateSignals(candidateId);
        priorSignals = edges.map(e => e.fact).filter(Boolean);
      } catch {
        // non-fatal
      }

      // Generate opening question
      const turn = await nextTurn({
        candidate,
        history: [],
        latestAnswer: '',
        daysCovered: [],
        priorSignals,
        isStart: true,
      });

      const daysCovered = mergeDays([], turn.dayNumber);

      return NextResponse.json({
        reply: turn.reply,
        done: false,
        questionCount: 1,
        daysCovered,
        priorSignals,
      });
    }

    // ------------------------------------------------------------------
    // ANSWER
    // ------------------------------------------------------------------
    if (action === 'answer') {
      const { history = [], message = '', daysCovered: clientDaysCovered = [] } = body as {
        history: InterviewMessage[];
        message: string;
        daysCovered: number[];
      };

      if (!message.trim()) {
        return NextResponse.json({ error: 'message is required' }, { status: 400 });
      }

      // Compute current state from the history the client sent
      const questionCount = countQuestions(history) + 1; // +1 for this turn's upcoming reply
      const priorSignals: string[] = []; // Not fetched on answer turns — Breeth is supplementary

      // Generate next turn
      const turn = await nextTurn({
        candidate,
        history,
        latestAnswer: message,
        daysCovered: clientDaysCovered,
        priorSignals,
        isStart: false,
      });

      const daysCovered = mergeDays(clientDaysCovered, turn.dayNumber);

      // Fire-and-forget: write signal to Breeth after each answer
      if (turn.signal) {
        writeInterviewSignal(candidateId, turn.signal)
          .catch(err => console.error('[route] writeInterviewSignal error:', err));
      }

      // ------------------------------------------------------------------
      // Check end condition: >= 8 questions AND >= 4 unique days covered
      // ------------------------------------------------------------------
      if (questionCount >= 8 && daysCovered.length >= 4) {
        // Build updated history with the latest exchange for feedback
        const fullHistory: InterviewMessage[] = [
          ...history,
          { role: 'candidate', text: message },
        ];

        const feedback = await finalFeedback({ candidate, history: fullHistory });

        return NextResponse.json({
          reply: 'Interview completed.',
          done: true,
          feedback,
          signalTag: turn.signalTag ?? null,
          daysCovered,
        });
      }

      // ------------------------------------------------------------------
      // Continue interview
      // ------------------------------------------------------------------
      return NextResponse.json({
        reply: turn.reply,
        done: false,
        questionCount,
        daysCovered,
        signalTag: turn.signalTag ?? null,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[/api/interview] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
