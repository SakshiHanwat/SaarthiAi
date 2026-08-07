/**
 * Gemini API wrapper for Saarthi
 * Handles interview question generation and answer evaluation
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function getModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings,
  });
}

export interface InterviewMessage {
  role: 'user' | 'interviewer';
  content: string;
}

export interface GenerateQuestionOptions {
  track: string;
  difficulty: 'junior' | 'mid' | 'senior';
  questionType: 'conceptual' | 'coding' | 'system_design' | 'behavioral';
  topics: string[];
  history: InterviewMessage[];
  candidateName?: string;
}

export interface EvaluationResult {
  score: number; // 0–10
  feedback: string;
  strengths: string[];
  improvements: string[];
  followUp?: string;
}

/**
 * Generates the next interview question or follow-up
 */
export async function generateInterviewQuestion(
  options: GenerateQuestionOptions
): Promise<string> {
  const { track, difficulty, questionType, topics, history, candidateName } = options;
  const model = getModel();

  const historyContext = history
    .slice(-6)
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a senior technical interviewer at a top tech company conducting a ${difficulty}-level ${track} interview.

${candidateName ? `Candidate name: ${candidateName}` : ''}
Topics to cover: ${topics.join(', ')}
Question type to ask next: ${questionType}

Conversation so far:
${historyContext || '(start of interview)'}

Ask the next interview question. Be concise and professional. Do NOT evaluate the candidate's previous answer — just ask the question. If this is the start, briefly introduce yourself and ask the first question. Keep your response to 2-4 sentences maximum.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Evaluates a candidate's answer and returns structured feedback
 */
export async function evaluateAnswer(
  question: string,
  answer: string,
  track: string,
  difficulty: 'junior' | 'mid' | 'senior'
): Promise<EvaluationResult> {
  const model = getModel();

  const prompt = `You are evaluating a ${difficulty}-level ${track} interview answer.

Question asked: "${question}"
Candidate's answer: "${answer}"

Evaluate this answer and respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-10>,
  "feedback": "<1-2 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area 1>", "<area 2>"],
  "followUp": "<optional follow-up question to probe deeper, or null>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON evaluation');
  }

  return JSON.parse(jsonMatch[0]) as EvaluationResult;
}

/**
 * Generates a final interview summary
 */
export async function generateInterviewSummary(
  history: InterviewMessage[],
  track: string,
  difficulty: string,
  candidateName?: string
): Promise<string> {
  const model = getModel();

  const transcript = history
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n');

  const prompt = `You are summarizing a ${difficulty}-level ${track} technical interview${candidateName ? ` for ${candidateName}` : ''}.

Full transcript:
${transcript}

Write a concise professional interview summary (3-5 paragraphs) covering:
1. Overall performance assessment
2. Technical strengths demonstrated
3. Areas needing improvement
4. Hiring recommendation (Strong Yes / Yes / Maybe / No)

Be specific and reference actual answers from the transcript.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
