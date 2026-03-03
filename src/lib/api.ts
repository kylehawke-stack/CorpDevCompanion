import type { Idea, RankedIdea, CompanyProfile, FinancialHighlight, RevenueSegment, CompetitorProfile, PeerCompany, PeerFinancials } from '../types/index.ts';

const BASE_URL = '/.netlify/functions';

/** Phase 1: Fetch all FMP financial data + compute deterministic cards 1-6 (~3-5s) */
export async function analyzeCompany(symbol: string): Promise<{
  profile: CompanyProfile;
  highlights: FinancialHighlight[];
  revenueSegments: RevenueSegment[];
  competitorProfiles: CompetitorProfile[];
  promptData: string;
}> {
  const response = await fetch(`${BASE_URL}/analyze-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(`Failed to analyze company: ${detail}`);
  }

  return response.json();
}

function normalizeBlurb(blurb: string | string[]): string[] {
  if (Array.isArray(blurb)) return blurb.length > 0 ? blurb : ["No details provided"];
  const sentences = blurb.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  return sentences.length > 0 ? sentences : [blurb];
}

/** Phase 2: Send data to Claude for briefing cards + strategic ideas (streamed) */
export async function generateBriefing(promptData: string, competitorPromptData?: string): Promise<{
  highlights: FinancialHighlight[];
  ideas: Idea[];
}> {
  const response = await fetch(`${BASE_URL}/generate-briefing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptData, competitorPromptData }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(`Failed to generate briefing: ${detail}`);
  }

  // Read streamed text chunks from the function
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const ideas = parsed.ideas.map(
    (idea: { title: string; blurb: string | string[]; dimension?: string; dimensionIndex?: number }) => ({
      id: crypto.randomUUID(),
      title: idea.title,
      tier: "strategic_priority",
      blurb: normalizeBlurb(idea.blurb),
      source: "seed",
      createdAt: Date.now(),
      dimension: idea.dimension,
      dimensionIndex: idea.dimensionIndex,
    })
  );

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((h: { label: string; value: string; detail: string; observation: string }) => ({
        label: h.label,
        value: h.value,
        detail: h.detail,
        observation: h.observation,
      }))
    : [];

  return { highlights, ideas };
}

export async function generateSeedIdeas(
  companyProfile: CompanyProfile,
  topStrategicPriorities: { title: string; score: number; rank: number }[],
  bottomStrategicPriorities?: { title: string; score: number; rank: number }[],
  competitorProfiles?: CompetitorProfile[],
  promptData?: string,
  competitorPromptData?: string
): Promise<Idea[]> {
  const response = await fetch(`${BASE_URL}/generate-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyProfile, topStrategicPriorities, bottomStrategicPriorities, competitorProfiles, promptData, competitorPromptData }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(`Failed to generate ideas: ${detail}`);
  }

  const data = await response.json();
  return data.ideas as Idea[];
}

export async function injectIdeas(
  rankings: RankedIdea[],
  totalVotes: number,
  existingIdeas: Idea[],
  votingStep?: 'step1' | 'step2' | 'step3',
  companyProfile?: CompanyProfile,
  topStrategicPriorities?: { title: string; score: number; rank: number }[],
  bottomStrategicPriorities?: { title: string; score: number; rank: number }[],
  lastInjectionAtVoteCount?: number,
  userDirections?: string[],
  competitorProfiles?: CompetitorProfile[],
  promptData?: string,
  competitorPromptData?: string
): Promise<Idea[]> {
  // Identify previously injected ideas and their current performance
  const injectedPerformance = rankings
    .filter((r) => r.idea.source === 'claude_injected')
    .slice(0, 10)
    .map((r) => ({
      title: r.idea.title,
      tier: r.idea.tier,
      score: r.displayScore,
      wins: r.wins,
      losses: r.losses,
      rank: r.rank,
    }));

  const response = await fetch(`${BASE_URL}/inject-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rankings: rankings.slice(0, 20).map((r) => ({
        title: r.idea.title,
        tier: r.idea.tier,
        blurb: r.idea.blurb,
        score: r.displayScore,
        wins: r.wins,
        losses: r.losses,
        source: r.idea.source,
      })),
      totalVotes,
      existingTitles: existingIdeas.map((i) => i.title),
      votingStep,
      companyProfile,
      topStrategicPriorities,
      bottomStrategicPriorities,
      injectedPerformance,
      lastInjectionAtVoteCount,
      userDirections,
      competitorProfiles,
      promptData,
      competitorPromptData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to inject ideas: ${response.statusText}`);
  }

  const data = await response.json();
  return data.ideas as Idea[];
}

export async function generateCompanyIdeas(
  rankings: RankedIdea[],
  topStrategicPriorities?: { title: string; score: number; rank: number }[],
  bottomStrategicPriorities?: { title: string; score: number; rank: number }[],
  competitorProfiles?: CompetitorProfile[],
  promptData?: string,
  competitorPromptData?: string
): Promise<Idea[]> {
  const response = await fetch(`${BASE_URL}/generate-company-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rankings: rankings.slice(0, 10).map((r) => ({
        title: r.idea.title,
        tier: r.idea.tier,
        score: r.displayScore,
        wins: r.wins,
        losses: r.losses,
      })),
      topStrategicPriorities,
      bottomStrategicPriorities,
      competitorProfiles,
      promptData,
      competitorPromptData,
    }),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body.error) detail = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(`Failed to generate company ideas: ${detail}`);
  }

  const data = await response.json();
  return data.ideas as Idea[];
}

export async function generateNarrative(
  rankings: RankedIdea[],
  totalVotes: number,
  sessionName: string,
  promptData?: string,
  competitorPromptData?: string,
): Promise<{ narrative: string; presentationOutline: string }> {
  const response = await fetch(`${BASE_URL}/generate-narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rankings: rankings.slice(0, 30).map((r) => ({
        rank: r.rank,
        title: r.idea.title,
        tier: r.idea.tier,
        blurb: r.idea.blurb,
        score: r.displayScore,
        wins: r.wins,
        losses: r.losses,
      })),
      totalVotes,
      sessionName,
      promptData,
      competitorPromptData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate narrative: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    narrative: data.narrative as string,
    presentationOutline: (data.presentationOutline ?? "") as string,
  };
}

export async function fetchPeers(symbol: string, sector?: string, industry?: string): Promise<PeerCompany[]> {
  const response = await fetch(`${BASE_URL}/fetch-peers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, sector, industry }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch peers: ${response.statusText}`);
  }

  const data = await response.json();
  return data.peers as PeerCompany[];
}

export async function fetchPeerData(symbols: string[]): Promise<{ peerFinancials: PeerFinancials[]; competitorPromptData?: string }> {
  const response = await fetch(`${BASE_URL}/fetch-peer-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch peer data: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    peerFinancials: data.peerFinancials as PeerFinancials[],
    competitorPromptData: data.competitorPromptData as string | undefined,
  };
}
