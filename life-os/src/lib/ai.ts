import type { Article, Analysis, Channel } from "../db/types";
import { Capacitor } from "@capacitor/core";
import { describeNetworkError, httpPost } from "./http";
import type { Settings } from "./settings";

export class AiNotConfigured extends Error {
  constructor() { super("Add your Anthropic API key in Settings → AI to enable this."); }
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, any> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export interface ApiMessage { role: "user" | "assistant"; content: string | ContentBlock[] }
export interface ToolDef { name: string; description: string; input_schema: Record<string, any> }

export interface MessagesResponse {
  content: ContentBlock[];
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export const aiReady = (s: Settings) => s.ai.enabled && s.ai.apiKey.trim().length > 10;

export async function callClaude(
  s: Settings,
  req: { system: string; messages: ApiMessage[]; tools?: ToolDef[]; maxTokens?: number },
): Promise<MessagesResponse> {
  if (!aiReady(s)) throw new AiNotConfigured();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": s.ai.apiKey.trim(),
    "anthropic-version": "2023-06-01",
  };
  if (!Capacitor.isNativePlatform()) headers["anthropic-dangerous-direct-browser-access"] = "true";
  let r;
  try {
    r = await httpPost(
      "https://api.anthropic.com/v1/messages", headers,
      JSON.stringify({ model: s.ai.model, max_tokens: req.maxTokens ?? 1500, system: req.system, messages: req.messages, ...(req.tools ? { tools: req.tools } : {}) }),
      60000,
    );
  } catch (e) {
    throw new Error(describeNetworkError(e));
  }
  let body: any = null;
  try { body = JSON.parse(r.text); } catch { /* non-JSON error body */ }
  if (r.status === 401) throw new Error("The API key was rejected (401). Check it in Settings → AI.");
  if (r.status === 429) throw new Error("Rate limited by the AI provider (429). Try again in a minute.");
  if (r.status >= 400) throw new Error(body?.error?.message ? `AI error ${r.status}: ${body.error.message}` : `AI error ${r.status}`);
  if (!body?.content) throw new Error("Unexpected AI response");
  return body as MessagesResponse;
}

export const textOf = (r: MessagesResponse) =>
  r.content.filter((b): b is { type: "text"; text: string } => b.type === "text").map((b) => b.text).join("\n").trim();

export function extractJson<T = any>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The AI did not return structured data");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

const TRUST_RULES = `Rules: use ONLY the facts given in the excerpt. Never invent numbers, quotes, dates or names. If the excerpt is too thin to answer a field, write "Not enough information in the source excerpt." Put anything that is your inference (not stated in the excerpt) in "speculation", never in the other fields. Be concise and beginner-friendly.`;

export async function analyzeArticle(s: Settings, a: Article): Promise<Analysis> {
  const tech = a.section === "tech";
  const profile = "The reader is an Indian engineering student (IoT, solar microgrids, AI), preparing for UPSC, learning personal finance, building two YouTube channels (MONEYVARK: finance; ZILVOREX: tech) and looking for internships and online income.";
  const fields = tech
    ? `{"whatIsNew":"","whyItMatters":"","applications":"","implications":"how students/professionals can benefit","skills":"skills worth learning","earning":"possible business/earning angle, or 'None evident'","relevance":"relevance to the reader","upsc":"UPSC angle or null","speculation":"your inference, clearly speculative, or null"}`
    : `{"whyItMatters":"","implications":"practical implications","relevance":"relevance to the reader's career, finances, education or projects","upsc":"UPSC syllabus theme and why, or null if none","speculation":"your inference, clearly speculative, or null"}`;
  const r = await callClaude(s, {
    system: `You are a careful news analyst. ${profile} ${TRUST_RULES} Reply with ONLY a JSON object with exactly these keys: ${fields}`,
    messages: [{ role: "user", content: `Source: ${a.source} (${a.tier})\nPublished: ${a.publishedAt ?? "unknown"}\nHeadline: ${a.title}\nExcerpt: ${a.summary || "(none provided)"}\nURL: ${a.url}` }],
    maxTokens: 900,
  });
  const j = extractJson<Record<string, string | null>>(textOf(r));
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const opt = (v: unknown) => (typeof v === "string" && v.trim() && v.toLowerCase() !== "null" ? v : null);
  return {
    whyItMatters: str(j.whyItMatters), implications: str(j.implications), relevance: str(j.relevance),
    upsc: opt(j.upsc), speculation: opt(j.speculation),
    whatIsNew: opt(j.whatIsNew) ?? undefined, applications: opt(j.applications) ?? undefined,
    skills: opt(j.skills) ?? undefined, earning: opt(j.earning) ?? undefined,
    generatedAt: new Date().toISOString(), model: s.ai.model,
  };
}

const CHANNEL_BRIEF: Record<Channel, string> = {
  MONEYVARK: "MONEYVARK — personal finance for students and beginners in India: saving, budgeting, 50/30/20, SIPs and mutual funds, financial literacy, side hustles, AI tools for earning, money habits and business stories. Never promise returns; educational tone.",
  ZILVOREX: "ZILVOREX — 'Technology Beyond Tomorrow': AI, quantum computing, emerging tech, science documentaries, future innovations, engineering explainers.",
};

export interface VideoPackage {
  titles: string[]; hook: string; outline: string[]; description: string; tags: string[]; thumbnails: string[];
}
export async function generateVideoPackage(s: Settings, channel: Channel, topic: string, format: "short" | "long"): Promise<VideoPackage> {
  const r = await callClaude(s, {
    system: `You are a YouTube strategist and scriptwriter. Channel: ${CHANNEL_BRIEF[channel]}\nThese are AI-generated creative suggestions, NOT verified trends: do not state view counts, search volumes or competitor numbers. Reply with ONLY JSON: {"titles":[5 titles under 70 chars],"hook":"first 15 seconds script","outline":["beat 1","beat 2",...],"description":"SEO description with a short summary and chapters placeholder","tags":[10 tags],"thumbnails":[3 concept descriptions]}. For shorts the outline must fit 45 seconds.`,
    messages: [{ role: "user", content: `Topic: ${topic}\nFormat: ${format === "short" ? "YouTube Short (≤60s, vertical)" : "long-form (8–12 min)"}` }],
    maxTokens: 1600,
  });
  const j = extractJson<VideoPackage>(textOf(r));
  return {
    titles: j.titles ?? [], hook: j.hook ?? "", outline: j.outline ?? [], description: j.description ?? "", tags: j.tags ?? [], thumbnails: j.thumbnails ?? [],
  };
}
export async function generateVideoIdeas(s: Settings, channel: Channel, count = 5, avoid: string[] = []): Promise<{ title: string; format: "short" | "long"; hook: string }[]> {
  const r = await callClaude(s, {
    system: `You are a YouTube strategist. Channel: ${CHANNEL_BRIEF[channel]}\nGive original, specific ideas. These are AI-generated ideas, not verified trends. Reply with ONLY JSON: {"ideas":[{"title":"","format":"short|long","hook":""}]}`,
    messages: [{ role: "user", content: `Give ${count} fresh video ideas.${avoid.length ? ` Avoid repeating: ${avoid.slice(0, 15).join("; ")}` : ""}` }],
    maxTokens: 1200,
  });
  const j = extractJson<{ ideas: any[] }>(textOf(r));
  return (j.ideas ?? []).slice(0, count).map((i) => ({ title: String(i.title ?? ""), format: (i.format === "short" ? "short" : "long") as "short" | "long", hook: String(i.hook ?? "") })).filter((i) => i.title);
}
