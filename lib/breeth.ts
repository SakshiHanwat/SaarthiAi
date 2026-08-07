/**
 * Breeth REST API client for Saarthi
 *
 * Functions:
 *   addEpisode             — persist a raw conversation turn (used by route.ts)
 *   getSessionHistory      — reconstruct conversation from memory graph (used by route.ts)
 *   writeCandidateProfile  — write a candidate profile summary episode
 *   writeInterviewSignal   — write a single notable signal (strong/weak answer)
 *   getCandidateSignals    — retrieve prior interview signals for a candidate
 *
 * Error policy: every function is graceful. Network failures / bad API keys
 * log to console and return a safe fallback — the interview never crashes
 * because of a Breeth failure.
 */

import type { InterviewMessage } from './gemini';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BREETH_BASE_URL =
  (process.env.BREETH_BASE_URL ?? 'https://api.thebreeth.com/v1').replace(/\/$/, '');
const BREETH_API_KEY = process.env.BREETH_API_KEY ?? '';

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BREETH_API_KEY}`,
  };
}

function isConfigured(): boolean {
  if (!BREETH_API_KEY) {
    console.warn('[breeth] BREETH_API_KEY not set — skipping Breeth call');
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Shared API types (matching the Breeth REST spec exactly)
// ---------------------------------------------------------------------------

export interface AddEpisodeResult {
  ok: boolean;
  episode_name: string;
  extracted: { entities: number; edges: number };
  group_id: string;
  warning?: string | null;
}

/** A graph edge returned by POST /v1/search */
export interface BreethEdge {
  edge_uuid: string;
  source_node: string;
  target_node: string;
  /** The distilled fact sentence */
  fact: string;
  name: string;
  created_at?: string;
  valid_at?: string;
  intent_meta?: {
    edge_kind?: string;
    cognitive_pattern?: string;
    why_connected?: string;
  } | null;
  score?: number;
}

interface SearchResponse {
  edges: BreethEdge[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function postEpisode(body: {
  content: string;
  group_id: string;
  source_description: string;
  extract_intent: boolean;
}): Promise<AddEpisodeResult | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${BREETH_BASE_URL}/episodes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[breeth] POST /episodes HTTP ${res.status}:`, text);
      return null;
    }
    return (await res.json()) as AddEpisodeResult;
  } catch (err) {
    console.error('[breeth] POST /episodes network error:', err);
    return null;
  }
}

async function postSearch(body: {
  query: string;
  group_id: string;
  limit: number;
}): Promise<BreethEdge[]> {
  if (!isConfigured()) return [];
  try {
    const res = await fetch(`${BREETH_BASE_URL}/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[breeth] POST /search HTTP ${res.status}:`, text);
      return [];
    }
    const data = (await res.json()) as SearchResponse;
    return data.edges ?? [];
  } catch (err) {
    console.error('[breeth] POST /search network error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 1. addEpisode — used by route.ts for raw conversation turns
// ---------------------------------------------------------------------------

/**
 * Persist a single conversation turn into Breeth under `sessionId` as the
 * group namespace. Role prefix ("Interviewer:" / "Candidate:") is embedded
 * in `content` so getSessionHistory can round-trip the role.
 *
 * Returns null on failure — the interview continues normally.
 */
export async function addEpisode(
  sessionId: string,
  content: string,
  sourceDescription: string
): Promise<AddEpisodeResult | null> {
  return postEpisode({
    content,
    group_id: sessionId,
    source_description: sourceDescription,
    extract_intent: false,
  });
}

// ---------------------------------------------------------------------------
// 2. getSessionHistory — used by route.ts to reconstruct conversation
// ---------------------------------------------------------------------------

/**
 * Reconstruct the full interview conversation from Breeth's memory graph.
 * Searches with query "interview transcript" scoped to the session's group_id,
 * sorts edges chronologically, and maps each `fact` to an InterviewMessage
 * by reading the embedded "Interviewer:" / "Candidate:" prefix.
 *
 * Returns [] on failure — route.ts falls back to client-supplied history.
 */
export async function getSessionHistory(sessionId: string): Promise<InterviewMessage[]> {
  const edges = await postSearch({
    query: 'interview transcript',
    group_id: sessionId,
    limit: 50,
  });

  if (edges.length === 0) return [];

  const sorted = [...edges].sort((a, b) => {
    const ta = a.created_at ?? a.valid_at ?? '';
    const tb = b.created_at ?? b.valid_at ?? '';
    return ta.localeCompare(tb);
  });

  return sorted
    .map((edge): InterviewMessage | null => {
      const text = edge.fact?.trim();
      if (!text) return null;

      if (text.startsWith('Interviewer:')) {
        return { role: 'interviewer', content: text.replace(/^Interviewer:\s*/, '') };
      }
      if (text.startsWith('Candidate:')) {
        return { role: 'user', content: text.replace(/^Candidate:\s*/, '') };
      }
      // Fallback — unknown facts treated as interviewer context
      return { role: 'interviewer', content: text };
    })
    .filter((m): m is InterviewMessage => m !== null);
}

// ---------------------------------------------------------------------------
// 3. writeCandidateProfile
// ---------------------------------------------------------------------------

/**
 * Write a natural-language summary of the candidate's profile as a Breeth
 * episode, scoped to `candidateId` as the group namespace.
 *
 * `candidate` is any object (from candidates.json or constructed at runtime).
 * It is serialised into a prose summary before writing.
 *
 * Returns null on failure — non-fatal.
 */
export async function writeCandidateProfile(
  candidateId: string,
  candidate: Record<string, unknown>
): Promise<AddEpisodeResult | null> {
  // Build a readable prose summary so Breeth extracts meaningful entities/edges
  const lines: string[] = [`Candidate profile for ID: ${candidateId}.`];

  if (candidate.name)       lines.push(`Name: ${candidate.name}.`);
  if (candidate.email)      lines.push(`Email: ${candidate.email}.`);
  if (candidate.role)       lines.push(`Applying for: ${candidate.role}.`);
  if (candidate.experience) lines.push(`Experience: ${candidate.experience}.`);

  if (Array.isArray(candidate.completedModules) && candidate.completedModules.length > 0) {
    lines.push(`Completed modules: ${candidate.completedModules.join(', ')}.`);
  }
  if (Array.isArray(candidate.skippedTopics) && candidate.skippedTopics.length > 0) {
    lines.push(`Skipped topics: ${candidate.skippedTopics.join(', ')}.`);
  }
  if (typeof candidate.totalAttempts === 'number') {
    lines.push(`Total interview attempts: ${candidate.totalAttempts}.`);
  }
  if (candidate.notes) {
    lines.push(`Notes: ${candidate.notes}.`);
  }
  // Dump any remaining keys as key=value pairs
  const knownKeys = new Set([
    'name', 'email', 'role', 'experience',
    'completedModules', 'skippedTopics', 'totalAttempts', 'notes',
  ]);
  for (const [k, v] of Object.entries(candidate)) {
    if (!knownKeys.has(k)) {
      lines.push(`${k}: ${JSON.stringify(v)}.`);
    }
  }

  const content = lines.join(' ');

  return postEpisode({
    content,
    group_id: candidateId,
    source_description: 'candidate-profile',
    extract_intent: false,
  });
}

// ---------------------------------------------------------------------------
// 4. writeInterviewSignal
// ---------------------------------------------------------------------------

/**
 * Write a single notable interview signal — one sentence describing something
 * observed during a candidate's answer (strong or weak).
 *
 * Examples of `signalText`:
 *   "Candidate struggled to explain cache invalidation in the RAG pipeline."
 *   "Candidate gave a strong answer on vector database indexing strategies."
 *
 * `extract_intent: true` is set so Breeth annotates the signal with intent
 * metadata (edge_kind: strength/weakness, cognitive_pattern, etc.).
 *
 * Returns null on failure — non-fatal.
 */
export async function writeInterviewSignal(
  candidateId: string,
  signalText: string
): Promise<AddEpisodeResult | null> {
  if (!signalText.trim()) return null;

  return postEpisode({
    content: signalText.trim(),
    group_id: candidateId,
    source_description: 'interview-signal',
    extract_intent: true,
  });
}

// ---------------------------------------------------------------------------
// 5. getCandidateSignals
// ---------------------------------------------------------------------------

/**
 * Retrieve prior interview signals for a candidate from Breeth's memory graph.
 *
 * Returns an array of BreethEdge objects (each has a `fact` field with the
 * distilled signal sentence, plus optional `intent_meta` from Breeth's
 * intent annotation). The caller can scan these for prior weak areas to
 * surface during the next interview session.
 *
 * Returns [] on failure — caller handles absence gracefully.
 */
export async function getCandidateSignals(
  candidateId: string,
  query = 'interview performance signals'
): Promise<BreethEdge[]> {
  return postSearch({
    query,
    group_id: candidateId,
    limit: 20,
  });
}
