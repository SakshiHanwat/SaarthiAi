/**
 * Gemini API wrapper for Saarthi
 *
 * Two primary functions for the interview flow:
 *   nextTurn     — generate the next interviewer question / follow-up
 *   finalFeedback — generate structured end-of-interview feedback
 *
 * Both return parsed objects (no markdown fences, no prose wrappers).
 * Legacy exports kept for any other callers.
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,  threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function getModel() {
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings });
}

/** Extract the first JSON object from a model response (strips markdown fences). */
function extractJSON<T>(text: string): T {
  // Strip ```json ... ``` or ``` ... ``` fences
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Gemini returned no JSON object. Raw: ${text.slice(0, 300)}`);
  return JSON.parse(match[0]) as T;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single conversation turn — role matches the API contract */
export interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  text: string;
}

/** Mission row from candidates.json */
export interface Mission {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
}

/** Candidate object shape from candidates.json */
export interface CandidateData {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: Mission[];
  signals?: {
    commitDays?: number;
    missionsCompleted?: number;
    missionsFirstTry?: number;
  };
}

/** What nextTurn returns */
export interface NextTurnResult {
  /** The interviewer's next message (question or follow-up) */
  reply: string;
  /** Which curriculum day this turn covers (0 = no specific day / meta question) */
  dayNumber: number;
  /** One-sentence signal for Breeth writeInterviewSignal (null if answer not yet available) */
  signal: string | null;
}

/** What finalFeedback returns */
export interface FinalFeedbackResult {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

// ---------------------------------------------------------------------------
// 1. nextTurn — generate the next interviewer question / follow-up
// ---------------------------------------------------------------------------

export interface NextTurnOptions {
  candidate: CandidateData;
  /** Full conversation so far (from the client) */
  history: InterviewMessage[];
  /** The candidate's latest answer (empty string on "start") */
  latestAnswer: string;
  /** Curriculum day titles this session has already covered */
  daysCovered: number[];
  /** Prior signals from Breeth (from previous sessions), may be empty */
  priorSignals: string[];
  /** Is this the very first turn of the session? */
  isStart: boolean;
}

export async function nextTurn(opts: NextTurnOptions): Promise<NextTurnResult> {
  const { candidate, history, latestAnswer, daysCovered, priorSignals, isStart } = opts;
  const model = getModel();

  // Build mission intelligence
  const passedEasy   = candidate.missions.filter(m => m.passed && (m.attempts ?? 1) <= 2);
  const passedHard   = candidate.missions.filter(m => m.passed && (m.attempts ?? 1) >= 4);
  const failed       = candidate.missions.filter(m => m.passed === false);
  const skipped      = candidate.missions.filter(m => m.skipped === true);
  const allDayNums   = candidate.missions.map(m => m.day);
  const uncovered    = allDayNums.filter(d => !daysCovered.includes(d));

  const missionSummary = [
    passedEasy.length  ? `Strong topics (passed easily): ${passedEasy.map(m => m.title).join(', ')}.` : '',
    passedHard.length  ? `Struggled but passed (high-attempt, probe deeper): ${passedHard.map(m => `${m.title} (${m.attempts} attempts)`).join(', ')}.` : '',
    failed.length      ? `FAILED topics (prime interview targets): ${failed.map(m => m.title).join(', ')}.` : '',
    skipped.length     ? `SKIPPED topics (probe if fundamental gaps): ${skipped.map(m => m.title).join(', ')}.` : '',
    uncovered.length   ? `Days not yet covered this session: ${uncovered.join(', ')}.` : 'All mission days covered this session.',
  ].filter(Boolean).join('\n');

  const priorContext = priorSignals.length > 0
    ? `Prior session signals for this candidate:\n${priorSignals.map(s => `- ${s}`).join('\n')}`
    : '';

  const conversationTranscript = history.slice(-10)
    .map(m => `${m.role === 'interviewer' ? 'You' : candidate.member.name}: ${m.text}`)
    .join('\n');

  const prompt = `You are a senior AI engineer conducting a technical interview. You are direct, curious, and never robotic. You ask real questions — not textbook definitions, but "why did you choose X", "what breaks when Y scales", "walk me through a real failure".

CANDIDATE: ${candidate.member.name}, ${candidate.member.jobRole}, ${candidate.member.yearsExperience} years experience.

MISSION INTELLIGENCE (use this to decide what to probe):
${missionSummary}

${priorContext}

CONVERSATION SO FAR:
${conversationTranscript || '(start of interview)'}

${latestAnswer ? `CANDIDATE'S LATEST ANSWER:\n"${latestAnswer}"` : ''}

YOUR TASK:
${isStart
  ? `Open the interview. ${priorSignals.length > 0 ? 'Weave in a brief natural reference to prior context if relevant (e.g. "Last time we touched on X, let\'s build on that today.")' : ''} Start with their strongest completed topic. Be warm but professional. 2-3 sentences maximum.`
  : `Decide: should you follow up on the latest answer (if it was shallow, surprising, or incomplete), or move to a new topic (prioritize failed/high-attempt/skipped areas, then uncovered days)?
Ask ONE question. Be specific and situational — reference the candidate's actual background or their previous answer if relevant. 2-3 sentences maximum.`
}

Respond ONLY with valid JSON (no markdown, no fences):
{
  "reply": "<your next question or follow-up, plain text>",
  "dayNumber": <the curriculum day number this question is about, or 0 if it's a meta/behavioral question>,
  "signal": ${latestAnswer ? '"<one-sentence observation about the latest answer for memory logging, e.g. Candidate explained X well but missed Y>"' : 'null'}
}`;

  const result = await model.generateContent(prompt);
  return extractJSON<NextTurnResult>(result.response.text());
}

// ---------------------------------------------------------------------------
// 2. finalFeedback — generate structured end-of-interview feedback
// ---------------------------------------------------------------------------

export interface FinalFeedbackOptions {
  candidate: CandidateData;
  history: InterviewMessage[];
}

export async function finalFeedback(opts: FinalFeedbackOptions): Promise<FinalFeedbackResult> {
  const { candidate, history } = opts;
  const model = getModel();

  const transcript = history
    .map(m => `${m.role === 'interviewer' ? 'Interviewer' : candidate.member.name}: ${m.text}`)
    .join('\n');

  const skippedTitles = candidate.missions.filter(m => m.skipped).map(m => m.title);
  const failedTitles  = candidate.missions.filter(m => m.passed === false).map(m => m.title);

  const prompt = `You are writing a structured post-interview assessment for ${candidate.member.name} (${candidate.member.jobRole}, ${candidate.member.yearsExperience} yrs experience).

INTERVIEW TRANSCRIPT:
${transcript}

KNOWN GAPS FROM COURSE (skipped: ${skippedTitles.join(', ') || 'none'}; failed: ${failedTitles.join(', ') || 'none'}).

Write a rigorous, specific assessment. Reference actual things the candidate said. Do not be vague.

Respond ONLY with valid JSON (no markdown, no fences):
{
  "summary": "<2-3 sentence overall assessment — be direct about readiness>",
  "strengths": ["<specific strength with evidence from transcript>", "..."],
  "gaps": ["<specific gap or weak area, referencing skipped/failed topics or shallow answers>", "..."],
  "next": ["<concrete actionable learning recommendation>", "..."]
}

Rules:
- strengths: 3-5 items, each referencing something specific they said or demonstrated
- gaps: 2-4 items, each tied to a concrete weak answer or known skipped/failed topic
- next: 3-4 items, concrete (e.g. "Build a RAG pipeline from scratch using ChromaDB" not "Learn more about RAG")`;

  const result = await model.generateContent(prompt);
  return extractJSON<FinalFeedbackResult>(result.response.text());
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backwards compatibility with any existing callers)
// ---------------------------------------------------------------------------

/** @deprecated Use nextTurn() instead */
export async function generateInterviewQuestion(options: {
  track: string;
  difficulty: string;
  questionType: string;
  topics: string[];
  history: { role: 'user' | 'interviewer'; content: string }[];
  candidateName?: string;
}): Promise<string> {
  const model = getModel();
  const { track, difficulty, questionType, topics, history, candidateName } = options;
  const ctx = history.slice(-6).map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');
  const prompt = `You are a senior technical interviewer conducting a ${difficulty}-level ${track} interview.
${candidateName ? `Candidate: ${candidateName}` : ''}
Topics: ${topics.join(', ')}. Question type: ${questionType}.
Conversation:\n${ctx || '(start)'}
Ask the next question concisely (2-4 sentences). Do not evaluate the previous answer.`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/** @deprecated Use finalFeedback() instead */
export async function generateInterviewSummary(
  history: { role: 'user' | 'interviewer'; content: string }[],
  track: string,
  difficulty: string,
  candidateName?: string,
): Promise<string> {
  const model = getModel();
  const transcript = history.map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`).join('\n');
  const result = await model.generateContent(
    `Summarize this ${difficulty}-level ${track} interview${candidateName ? ` for ${candidateName}` : ''}.\n\nTranscript:\n${transcript}\n\nWrite 3-5 paragraphs: performance, strengths, weaknesses, recommendation.`
  );
  return result.response.text();
}

/** @deprecated Use nextTurn() instead */
export async function evaluateAnswer(
  question: string,
  answer: string,
  track: string,
  difficulty: string,
): Promise<{ score: number; feedback: string; strengths: string[]; improvements: string[]; followUp?: string }> {
  const model = getModel();
  const prompt = `Evaluate this ${difficulty}-level ${track} answer.\nQ: "${question}"\nA: "${answer}"\nRespond ONLY with JSON: {"score":<0-10>,"feedback":"<string>","strengths":["..."],"improvements":["..."],"followUp":"<string or null>"}`;
  const result = await model.generateContent(prompt);
  return extractJSON(result.response.text());
}
