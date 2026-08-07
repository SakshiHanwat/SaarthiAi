import { NextRequest, NextResponse } from 'next/server';
import { generateInterviewQuestion, evaluateAnswer, generateInterviewSummary, InterviewMessage } from '@/lib/gemini';
import { addEpisode, getSessionHistory } from '@/lib/breeth';
import rawCurriculum from '@/data/curriculum.json';

// ---------------------------------------------------------------------------
// Adapt the AI-cohort curriculum schema to the track model the app expects.
// Each module becomes a "track"; its day titles become the interview topics.
// ---------------------------------------------------------------------------
type CurriculumModule = typeof rawCurriculum.modules[number];
type CurriculumDay   = typeof rawCurriculum.days[number];

function getTrackData(trackId: string): { id: string; title: string; topics: string[] } | undefined {
  const module: CurriculumModule | undefined = rawCurriculum.modules.find(
    (m) => String(m.n) === trackId
  );
  if (!module) return undefined;

  const [startDay, endDay] = module.days as [number, number];
  const topics: string[] = (rawCurriculum.days as CurriculumDay[])
    .filter((d) => d.day >= startDay && d.day <= endDay)
    .map((d) => d.title);

  return { id: trackId, title: module.title, topics };
}

export interface InterviewRequestBody {
  action: 'start' | 'answer' | 'summary';
  sessionId: string;
  candidateName?: string;
  track?: string;
  difficulty?: 'junior' | 'mid' | 'senior';
  questionType?: 'conceptual' | 'coding' | 'system_design' | 'behavioral';
  /** Client-side history (used as fallback when Breeth is unavailable) */
  history?: InterviewMessage[];
  lastQuestion?: string;
  answer?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: InterviewRequestBody = await req.json();
    const {
      action,
      sessionId,
      candidateName,
      track,
      difficulty,
      history: clientHistory = [],
      lastQuestion,
      answer,
      questionType,
    } = body;

    switch (action) {
      // ------------------------------------------------------------------
      // start — initialise a new session, generate the first question
      // ------------------------------------------------------------------
      case 'start': {
        if (!track || !difficulty) {
          return NextResponse.json(
            { error: 'track and difficulty are required' },
            { status: 400 }
          );
        }

        const trackData = getTrackData(track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        // Persist session start in Breeth memory
        await addEpisode(
          sessionId,
          `Interview session started. Candidate: ${candidateName || 'Anonymous'}. Track: ${trackData.title}. Difficulty: ${difficulty}.`,
          'saarthi-session-start'
        );

        const question = await generateInterviewQuestion({
          track: trackData.title,
          difficulty,
          questionType: questionType ?? 'conceptual',
          topics: trackData.topics,
          history: [],
          candidateName,
        });

        // Persist the first interviewer turn so getSessionHistory can replay it
        await addEpisode(
          sessionId,
          `Interviewer: ${question}`,
          'saarthi-question'
        );

        return NextResponse.json({ question });
      }

      // ------------------------------------------------------------------
      // answer — evaluate candidate's answer, persist it, generate next Q
      // ------------------------------------------------------------------
      case 'answer': {
        if (!lastQuestion || !answer || !track || !difficulty) {
          return NextResponse.json(
            { error: 'lastQuestion, answer, track, and difficulty are required' },
            { status: 400 }
          );
        }

        const trackData = getTrackData(track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        // Evaluate the candidate's answer
        const evaluation = await evaluateAnswer(lastQuestion, answer, trackData.title, difficulty);

        // Persist the candidate turn with role prefix so getSessionHistory can parse it
        await addEpisode(
          sessionId,
          `Candidate: ${answer}`,
          'saarthi-answer'
        );

        // Persist the evaluation as a structured fact
        await addEpisode(
          sessionId,
          `Evaluation — Score: ${evaluation.score}/10. ${evaluation.feedback}`,
          'saarthi-eval'
        );

        // Reconstruct full conversation history from Breeth memory.
        // Falls back to the client-supplied history if Breeth is unavailable.
        let conversationHistory: InterviewMessage[] = await getSessionHistory(sessionId);
        if (conversationHistory.length === 0) {
          conversationHistory = [
            ...clientHistory,
            { role: 'interviewer', content: lastQuestion },
            { role: 'user', content: answer },
          ];
        }

        // Generate the next question
        const nextQuestion = await generateInterviewQuestion({
          track: trackData.title,
          difficulty,
          questionType: questionType ?? 'conceptual',
          topics: trackData.topics,
          history: conversationHistory,
          candidateName,
        });

        // Persist the next interviewer question
        await addEpisode(
          sessionId,
          `Interviewer: ${nextQuestion}`,
          'saarthi-question'
        );

        return NextResponse.json({ evaluation, nextQuestion });
      }

      // ------------------------------------------------------------------
      // summary — generate final summary and persist it
      // ------------------------------------------------------------------
      case 'summary': {
        if (!track || !difficulty) {
          return NextResponse.json(
            { error: 'track and difficulty are required' },
            { status: 400 }
          );
        }

        const trackData = getTrackData(track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        // Reconstruct history from Breeth; fall back to client history
        let conversationHistory: InterviewMessage[] = await getSessionHistory(sessionId);
        if (conversationHistory.length === 0) {
          conversationHistory = clientHistory;
        }

        const summary = await generateInterviewSummary(
          conversationHistory,
          trackData.title,
          difficulty,
          candidateName
        );

        // Persist the final summary
        await addEpisode(
          sessionId,
          `Interview complete. Candidate: ${candidateName || 'Anonymous'}.\n\n${summary}`,
          'saarthi-summary'
        );

        return NextResponse.json({ summary });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[/api/interview] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
