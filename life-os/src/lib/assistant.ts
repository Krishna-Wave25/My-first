import { db, uid } from "../db/db";
import { aiReady, callClaude, textOf, type ApiMessage, type ContentBlock } from "./ai";
import { systemContext, TOOLS, toolByName } from "./assistantTools";
import { parseTaskText } from "./nlp";
import type { Settings } from "./settings";

export interface PendingAction { id: string; name: string; input: any; summary: string }
export interface AiPending {
  kind: "ai";
  messages: ApiMessage[]; // ends with the assistant message containing tool_use blocks
  results: Record<string, { content: string; isError?: boolean }>;
  actions: PendingAction[];
}
export interface LocalPending { kind: "local"; actions: PendingAction[] }
export interface TurnOutcome { text: string; messages: ApiMessage[]; pending: AiPending | LocalPending | null }

const MAX_STEPS = 6;

async function loop(s: Settings, messages: ApiMessage[], carryText = ""): Promise<TurnOutcome> {
  const system = await systemContext(s);
  const tools = TOOLS.map((t) => t.def);
  let text = carryText;
  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await callClaude(s, { system, messages, tools, maxTokens: 1500 });
    messages = [...messages, { role: "assistant", content: r.content }];
    const t = textOf(r);
    if (t) text += (text ? "\n\n" : "") + t;
    const uses = r.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");
    if (!uses.length) return { text, messages, pending: null };

    const results: AiPending["results"] = {};
    const actions: PendingAction[] = [];
    for (const u of uses) {
      const spec = toolByName(u.name);
      if (!spec) { results[u.id] = { content: `Unknown tool ${u.name}`, isError: true }; continue; }
      if (spec.write) { actions.push({ id: u.id, name: u.name, input: u.input, summary: spec.describe(u.input) }); continue; }
      try { results[u.id] = { content: await spec.run(u.input, s) }; }
      catch (e) { results[u.id] = { content: `Tool failed: ${(e as Error).message}`, isError: true }; }
    }
    if (actions.length) return { text, messages, pending: { kind: "ai", messages, results, actions } };
    messages = [...messages, { role: "user", content: uses.map((u) => ({ type: "tool_result" as const, tool_use_id: u.id, content: results[u.id].content, is_error: results[u.id].isError })) }];
  }
  return { text: text || "I couldn't finish that — please rephrase.", messages, pending: null };
}

export async function runAiTurn(s: Settings, history: ApiMessage[]): Promise<TurnOutcome> {
  return loop(s, history);
}

/** Apply the user's approve/reject decisions to pending write tools, then let the model continue. */
export async function resumeAiTurn(s: Settings, p: AiPending, decisions: Record<string, boolean>, prevText: string): Promise<TurnOutcome> {
  const results = { ...p.results };
  for (const a of p.actions) {
    if (!decisions[a.id]) { results[a.id] = { content: "The user declined this action. Do not retry it." }; continue; }
    try { results[a.id] = { content: await toolByName(a.name)!.run(a.input, s) }; }
    catch (e) { results[a.id] = { content: `Failed: ${(e as Error).message}`, isError: true }; }
  }
  const last = p.messages[p.messages.length - 1];
  const uses = (last.content as ContentBlock[]).filter((b) => b.type === "tool_use") as Extract<ContentBlock, { type: "tool_use" }>[];
  const messages: ApiMessage[] = [...p.messages, { role: "user", content: uses.map((u) => ({ type: "tool_result" as const, tool_use_id: u.id, content: results[u.id]?.content ?? "No result", is_error: results[u.id]?.isError })) }];
  return loop(s, messages, prevText);
}

export async function applyLocalActions(s: Settings, p: LocalPending, decisions: Record<string, boolean>): Promise<string> {
  const out: string[] = [];
  for (const a of p.actions) {
    if (!decisions[a.id]) { out.push(`Skipped: ${a.summary}`); continue; }
    out.push(await toolByName(a.name)!.run(a.input, s));
  }
  return out.join("\n");
}

const HELP =
  "I'm in offline mode, so I only understand certain requests. Try: “plan my day”, “show my overdue tasks”, “what's due today”, “today's briefing”, “review my progress this week”, “ways to earn my first ₹1,000”, “what skills should I learn this month”, “find internships”, “help me finish my project”, “video idea for MONEYVARK”, “search <words>”, or “add <task in plain English>” (e.g. “add tomorrow 7am spend 45 minutes learning AI automation”). For anything else, add an Anthropic API key in Settings → AI.";

/** Offline intent router — real actions on real data, no model required. */
export async function localAssistant(s: Settings, text: string): Promise<TurnOutcome> {
  const t = text.trim();
  const run = async (name: string, input: any) => toolByName(name)!.run(input, s);
  const done = (reply: string): TurnOutcome => ({ text: reply, messages: [], pending: null });
  let m: RegExpMatchArray | null;

  // Questions from the brief that the app can answer from its own curated content and your data (no AI needed)
  if (/\b(earn|make money|side hustle|income|first ₹|first rs|₹\s?1,?000)\b|ways to earn/i.test(t)) return done(await run("opportunity_ideas", {}));
  if (/\b(internships?|jobs?|scholarships?|certifications?)\b/i.test(t) && !/^\s*(add|create|remind)/i.test(t)) return done(await run("career_pointers", {}));
  if (/\b(skills?|roadmap|learn(ing)?)\b.*\b(month|learn|study|next|should)\b|what.*\b(learn|study)\b/i.test(t)) return done(await run("learning_next", {}));
  if (/\b(project|viva|microgrid|simulink)\b.*\b(finish|help|status|left|next)\b|\bfinish\b.*\bproject\b/i.test(t)) return done(await run("project_status", {}));
  if (/\b(video|youtube|moneyvark|zilvorex)\b/i.test(t)) {
    const ch = /moneyvark/i.test(t) ? "MONEYVARK" : /zilvorex/i.test(t) ? "ZILVOREX" : undefined;
    return done((await run("channel_ideas", { channel: ch })) + "\n\nI can't invent fresh, specific ideas without an AI key. Add one in Settings → AI, or add your own in YouTube Studio.");
  }
  if (/\b(plan|schedule)\b.*\b(day|today|tomorrow)\b|\bplan my day\b/i.test(t)) {
    const tomorrow = /tomorrow/i.test(t);
    const d = new Date(); if (tomorrow) d.setDate(d.getDate() + 1);
    return done(await run("plan_day", { date: d.toISOString().slice(0, 10) }));
  }
  if (/\boverdue\b/i.test(t)) return done(await run("list_tasks", { filter: "overdue" }));
  if (/\b(due )?today\b.*\btasks?\b|\btasks?\b.*\btoday\b|what'?s due/i.test(t)) return done(await run("list_tasks", { filter: "today" }));
  if (/\b(upcoming)\b/i.test(t)) return done(await run("list_tasks", { filter: "upcoming" }));
  if (/\b(market|markets|sensex|nifty|stocks?)\b/i.test(t)) return done("I have no live price feed, so I won't quote index levels. Recent business headlines I can see:\n" + (await run("get_recent_articles", { topic: "business", days: 3 })));
  if (/\b(briefing|top (five|5)|important updates|news)\b/i.test(t)) return done(await run("get_todays_briefing", {}));
  if (/\b(review|summar\w+)\b.*\b(week|progress)\b|\bprogress\b/i.test(t)) return done(await run("progress_summary", {}));
  if ((m = t.match(/^(?:search|find)\s+(?:for\s+)?(.+)/i))) return done(await run("search_app", { query: m[1] }));
  if ((m = t.match(/^(?:add|create|remind me|schedule|new task)\s*(?:a )?(?:task)?:?\s*(.+)/i))) {
    const d = parseTaskText(m[1], new Date(), s.defaultReminderMin);
    const input = { title: d.title, due_iso: d.due ? new Date(d.due).toISOString() : undefined, has_time: d.hasTime, duration_min: d.durationMin ?? undefined, priority: d.priority, category: d.category };
    const action: PendingAction = { id: uid(), name: "create_task", input, summary: toolByName("create_task")!.describe(input) };
    return { text: "I parsed that as a task. Confirm to save it:", messages: [], pending: { kind: "local", actions: [action] } };
  }
  return done(HELP);
}

export async function sendToAssistant(s: Settings, history: ApiMessage[], text: string): Promise<TurnOutcome> {
  await db.chat.add({ id: uid(), role: "user", content: text, createdAt: new Date().toISOString() });
  if (!aiReady(s)) return localAssistant(s, text);
  return runAiTurn(s, [...history, { role: "user", content: text }]);
}
