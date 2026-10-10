import type { Channel } from "../db/types";

export const CHANNELS: Record<Channel, { tagline: string; pillars: string[]; color: string }> = {
  MONEYVARK: {
    tagline: "Money skills for students & beginners",
    color: "var(--c-finance)",
    pillars: ["Saving & budgeting (50/30/20)", "SIPs & mutual funds explained", "Financial literacy for students", "Side hustles & passive income (honest)", "AI tools for earning", "Money habits, business & financial stories"],
  },
  ZILVOREX: {
    tagline: "Technology beyond tomorrow",
    color: "var(--c-content)",
    pillars: ["Artificial intelligence", "Quantum computing", "Emerging technology", "Science documentaries", "Future innovations", "Engineering & tech explainers"],
  },
};

export const CHECKLIST_LONG = ["Topic & angle validated", "Research with sources saved", "Hook (first 15 s) written", "Script written & timed", "B-roll / visuals list", "Record voice-over", "Edit: pacing, captions, music", "Thumbnail (3 options)", "Title (A/B ready)", "Description, chapters, tags", "Sources cited on screen/description", "Disclaimer added (finance: not advice)", "Upload & schedule", "Pin comment + reply to first comments"];
export const CHECKLIST_SHORT = ["One-sentence idea", "Hook in first 2 s", "Script ≤ 45 s", "Vertical 9:16 recording/visuals", "Captions on", "Loop/CTA ending", "Title + hashtags", "Schedule"];
export const STAGES = ["idea", "scripting", "filming", "editing", "scheduled", "published"] as const;

export const TITLE_FORMULAS = [
  "Clear result + timeframe: “How to ___ in ___ (without ___)”",
  "Curiosity with substance: “Why ___ is changing ___ (explained)”",
  "Myth-busting: “The truth about ___ that nobody explains”",
  "Beginner promise: “___ for beginners: everything you need in 10 minutes”",
];
export const TITLE_NOTE = "Heuristics, not verified data. Test titles against your own YouTube Analytics results.";
