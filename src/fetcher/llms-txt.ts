import type { LlmsTxt, LlmsTxtLink, LlmsTxtSection } from '../types.js';

const LINK_RE = /^\s*-\s*\[([^\]]+)\]\(([^)]+)\)\s*(?::\s*(.+))?\s*$/;

export function parseLlmsTxt(raw: string): LlmsTxt {
  const lines = raw.split(/\r?\n/);

  let title: string | null = null;
  let summary: string | null = null;
  const sections: LlmsTxtSection[] = [];
  let currentSection: LlmsTxtSection | null = null;
  const summaryParts: string[] = [];
  let inSummaryPhase = false;

  for (const line of lines) {
    if (/^#\s+/.test(line) && title === null) {
      title = line.replace(/^#\s+/, '').trim();
      inSummaryPhase = true;
      continue;
    }
    if (/^##\s+/.test(line)) {
      if (inSummaryPhase && summaryParts.length > 0) {
        summary = summaryParts.join(' ').trim();
      }
      inSummaryPhase = false;
      currentSection = { title: line.replace(/^##\s+/, '').trim(), links: [] };
      sections.push(currentSection);
      continue;
    }

    if (inSummaryPhase) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        summaryParts.push(trimmed.replace(/^>\s*/, ''));
      } else if (trimmed.length > 0) {
        summaryParts.push(trimmed);
      }
      continue;
    }

    if (currentSection) {
      const m = LINK_RE.exec(line);
      if (m) {
        const link: LlmsTxtLink = { title: m[1]!.trim(), url: m[2]!.trim() };
        if (m[3]) link.description = m[3].trim();
        currentSection.links.push(link);
      }
    }
  }

  if (inSummaryPhase && summary === null && summaryParts.length > 0) {
    summary = summaryParts.join(' ').trim();
  }

  return { raw, title, summary, sections };
}

export function isLlmsTxtWellFormed(parsed: LlmsTxt): { ok: boolean; reason?: string } {
  if (!parsed.title) return { ok: false, reason: 'Missing H1 project title' };
  if (parsed.sections.length === 0) return { ok: false, reason: 'No H2 sections found' };
  const totalLinks = parsed.sections.reduce((n, s) => n + s.links.length, 0);
  if (totalLinks === 0) return { ok: false, reason: 'No link items found under any section' };
  return { ok: true };
}
