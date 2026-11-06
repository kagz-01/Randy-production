import type { EventType, VenueType } from "@/data/catalog";
import type { PackageFocus } from "./package-recommendation";

export type KnowledgeMatch = {
  id: string;
  title: string;
  content: string;
  tags: string;
  source_name: string;
  source_url: string | null;
  source_checked_at: string;
  jurisdiction: string;
  evidence_type: string;
};

export type KnowledgeQuery = {
  eventType: EventType;
  venueType: VenueType;
  focus: PackageFocus;
  guests: number;
  weddingWeekend?: boolean;
};

const STOP_WORDS = new Set(["event", "events", "production", "type", "guests", "venue"]);

function terms(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

export function knowledgeSearchTerms(query: KnowledgeQuery) {
  const context = [
    query.eventType,
    query.venueType,
    query.focus,
    query.guests >= 300 ? "large-event high-complexity" : "",
  ].join(" ");
  return [...new Set(terms(context))];
}

export function rankKnowledge(
  entries: KnowledgeMatch[],
  query: KnowledgeQuery,
  limit = 4,
): KnowledgeMatch[] {
  const queryTokens = knowledgeSearchTerms(query);
  return entries
    .map((entry) => {
      const titleTokens = new Set(terms(entry.title));
      const tagTokens = new Set(terms(entry.tags));
      const contentTokens = new Set(terms(entry.content));
      const score = queryTokens.reduce(
        (total, token) =>
          total + (tagTokens.has(token) ? 4 : 0) + (titleTokens.has(token) ? 3 : 0) + (contentTokens.has(token) ? 1 : 0),
        0,
      );
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.entry.source_checked_at.localeCompare(a.entry.source_checked_at))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
