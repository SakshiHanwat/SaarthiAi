import { NextRequest, NextResponse } from 'next/server';
import { generateInterviewQuestion, evaluateAnswer, generateInterviewSummary, InterviewMessage } from '@/lib/gemini';
import { addEpisode, searchMemory } from '@/lib/breeth';
import curriculum from '@/data/curriculum.json';

export interface InterviewRequestBody {
  action: 'start' | 'answer' | 'summary';
  sessionId: string;
  candidateName?: string;
  track?: string;
  difficulty?: 'junior' | 'mid' | 'senior';
  questionType?: 'conceptual' | 'coding' | 'system_design' | 'behavioral';
  history?: InterviewMessage[];
  lastQuestion?: string;
  answer?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: InterviewRequestBody = await req.json();
    const { action, sessionId, candidateName, track, difficulty, history = [], lastQuestion, answer, questionType } = body;

    switch (action) {
      case 'start': {
        if (!track || !difficulty) {
          return NextResponse.json({ error: 'track and difficulty are required' }, { status: 400 });
        }

        const trackData = curriculum.tracks.find((t) => t.id === track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        // Store session start in Breeth memory
        await addEpisode({
          content: `Interview session started. Candidate: ${candidateName || 'Anonymous'}. Track: ${trackData.title}. Difficulty: ${difficulty}. Session: ${sessionId}`,
          source_description: `saarthi-session-start`,
          group_id: sessionId,
        });

        const question = await generateInterviewQuestion({
          track: trackData.title,
          difficulty,
          questionType: questionType ?? 'conceptual',
          topics: trackData.topics,
          history: [],
          candidateName,
        });

        return NextResponse.json({ question });
      }

      case 'answer': {
        if (!lastQuestion || !answer || !track || !difficulty) {
          return NextResponse.json({ error: 'lastQuestion, answer, track, and difficulty are required' }, { status: 400 });
        }

        const trackData = curriculum.tracks.find((t) => t.id === track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        // Evaluate the answer
        const evaluation = await evaluateAnswer(lastQuestion, answer, trackData.title, difficulty);

        // Store Q&A pair in Breeth memory
        await addEpisode({
          content: `Q: ${lastQuestion}\nA: ${answer}\nScore: ${evaluation.score}/10\nFeedback: ${evaluation.feedback}`,
          source_description: `saarthi-qa`,
          group_id: sessionId,
        });

        // Search for relevant context from past sessions (optional enrichment)
        let contextHint: string | null = null;
        try {
          const memoryResults = await searchMemory(answer, sessionId, 3);
          if (memoryResults.episodes?.length > 0) {
            contextHint = memoryResults.episodes[0].content;
          }
        } catch {
          // non-fatal — memory search is optional
        }

        // Generate next question
        const updatedHistory: InterviewMessage[] = [
          ...history,
          { role: 'interviewer', content: lastQuestion },
          { role: 'user', content: answer },
        ];

        const nextQuestion = await generateInterviewQuestion({
          track: trackData.title,
          difficulty,
          questionType: questionType ?? 'conceptual',
          topics: trackData.topics,
          history: updatedHistory,
          candidateName,
        });

        return NextResponse.json({ evaluation, nextQuestion, contextHint });
      }

      case 'summary': {
        if (!track || !difficulty) {
          return NextResponse.json({ error: 'track and difficulty are required' }, { status: 400 });
        }

        const trackData = curriculum.tracks.find((t) => t.id === track);
        if (!trackData) {
          return NextResponse.json({ error: 'Unknown track' }, { status: 400 });
        }

        const summary = await generateInterviewSummary(history, trackData.title, difficulty, candidateName);

        // Store final summary in Breeth
        await addEpisode({
          content: `Interview complete. Session: ${sessionId}. Candidate: ${candidateName || 'Anonymous'}.\n\n${summary}`,
          source_description: `saarthi-summary`,
          group_id: sessionId,
        });

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
