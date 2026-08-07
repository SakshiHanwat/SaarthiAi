/**
 * Breeth REST API client
 * Provides addEpisode and searchMemory functions
 */

const BREETH_BASE_URL = process.env.BREETH_BASE_URL || 'https://api.thebreeth.com/v1';
const BREETH_API_KEY = process.env.BREETH_API_KEY || '';

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BREETH_API_KEY}`,
  };
}

export interface AddEpisodeOptions {
  content: string;
  source_description?: string;
  group_id?: string;
}

export interface EpisodeResult {
  ok: boolean;
  episode_name: string;
  extracted: { entities: number; edges: number };
  group_id: string;
  warning?: string;
}

export interface SearchResult {
  episodes: Array<{
    uuid: string;
    content: string;
    source: string;
    created_at: string;
    score: number;
  }>;
  total: number;
}

/**
 * Adds a memory episode to Breeth
 */
export async function addEpisode(options: AddEpisodeOptions): Promise<EpisodeResult> {
  const res = await fetch(`${BREETH_BASE_URL}/episodes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      content: options.content,
      source_description: options.source_description ?? 'saarthi-interview',
      group_id: options.group_id ?? 'default',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Breeth addEpisode failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Searches Breeth memory graph for relevant context
 */
export async function searchMemory(
  query: string,
  group_id = 'default',
  limit = 5
): Promise<SearchResult> {
  const params = new URLSearchParams({
    query,
    group_id,
    limit: String(limit),
  });

  const res = await fetch(`${BREETH_BASE_URL}/search?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Breeth searchMemory failed: ${res.status} ${errorText}`);
  }

  return res.json();
}
