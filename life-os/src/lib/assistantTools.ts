import { addDays, format, startOfDay } from "date-fns";
import { db, uid } from "../db/db";
import type { Category, Channel, Priority, TrackedOpportunity } from "../db/types";
import type { ToolDef } from "./ai";
import { buildBriefing } from "./news";
import { weekMarkdown, weekStats } from "./reports";
import { universalSearch } from "./search";
import type { Settings } from "./settings";
import { addTask, bucketOf, completeTask, compareTasks, postponeTask } from "./tasks";
import { suggestPlan } from "./scheduler";
import { dayKey, fmtDue } from "./dates";
import { PLAYBOOKS, OFFICIAL_PORTALS, ESTIMATE_NOTE } from "../content/opportunities";
import { ROADMAPS } from "../content/career";
import { CHANNELS, TITLE_FORMULAS, TITLE_NOTE } from "../content/youtube";
import { lintConnection, type Connection } from "./safety";

export interface ToolSpec {
  def: ToolDef;
  /** Consequential tools change records and require explicit user confirmation. */
  write: boolean;
  describe: (input: any) => string;
  run: (input: any, s: Settings) => Promise<string>;
}

const CATS = ["personal", "college", "project", "career", "finance", "content"];
const PRIS = ["critical", "high", "medium", "low"];
const taskLine = (t: { id: string; title: string; priority: string; category: string; due: string | null; hasTime: boolean }) =>
  `[${t.id.slice(0, 8)}] ${t.title} — ${t.priority}, ${t.category}, ${fmtDue(t.due, t.hasTime)}`;

async function findTask(idOrPrefix: string) {
  const all = await db.tasks.toArray();
  return all.find((t) => t.id === idOrPrefix) ?? all.find((t) => t.id.startsWith(idOrPrefix));
}

export const TOOLS: ToolSpec[] = [
  {
    def: {
      name: "list_tasks",
      description: "List the user's tasks. filter: today | overdue | upcoming | open | completed.",
      input_schema: { type: "object", properties: { filter: { type: "string", enum: ["today", "overdue", "upcoming", "open", "completed"] }, limit: { type: "number" } }, required: ["filter"] },
    },
    write: false,
    describe: (i) => `List ${i.filter} tasks`,
    run: async (i) => {
      const now = new Date();
      const tasks = await db.tasks.toArray();
      let out = tasks.filter((t) => {
        const b = bucketOf(t, now);
        if (i.filter === "open") return t.status === "todo";
        if (i.filter === "completed") return t.status === "done";
        return b === i.filter;
      });
      out = out.sort(compareTasks).slice(0, i.limit ?? 15);
      return out.length ? out.map(taskLine).join("\n") : `No ${i.filter} tasks.`;
    },
  },
  {
    def: {
      name: "plan_day",
      description: "Build a realistic schedule for a day (default today) from the user's tasks and working hours.",
      input_schema: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD, default today" } } },
    },
    write: false,
    describe: () => "Plan the day",
    run: async (i, s) => {
      const day = i.date ? new Date(i.date + "T00:00:00") : new Date();
      const p = suggestPlan(await db.tasks.toArray(), day, s.workStart, s.workEnd);
      const lines = p.blocks.map((b) => `${format(b.start, "h:mm a")}–${format(b.end, "h:mm a")}  ${b.title}${b.kind === "fixed" ? " (fixed)" : ""}`);
      return [`Plan for ${format(day, "EEE d MMM")} (${p.plannedMinutes} min planned, ${p.freeMinutes} min free):`, ...lines, ...(p.unscheduled.length ? ["Did not fit: " + p.unscheduled.map((t) => t.title).join("; ")] : []), ...p.notes].join("\n");
    },
  },
  {
    def: { name: "get_todays_briefing", description: "Today's five top-priority news stories with source links (from the user's configured RSS sources). Returns nothing if no fresh stories are available.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Read today's briefing",
    run: async (_i, s) => {
      const { articles } = await buildBriefing(s.interests);
      if (!articles.length) return "No fresh stories are available. The user needs to refresh News (feeds may be offline).";
      return articles.map((a, n) => `${n + 1}. ${a.title} — ${a.source}, ${a.publishedAt} — ${a.url}\n   ${a.summary.slice(0, 200)}`).join("\n");
    },
  },
  {
    def: {
      name: "get_recent_articles",
      description: "Recent stored articles with source, date and URL. Use for 'summarize markets/tech/…' requests. topic is one of india, world, tech, ai, business, upsc, science, sports, environment, entertainment, energy, cyber, space. There is NO live price data.",
      input_schema: { type: "object", properties: { topic: { type: "string" }, days: { type: "number" }, limit: { type: "number" } } },
    },
    write: false,
    describe: (i) => `Read recent ${i.topic ?? "all"} articles`,
    run: async (i) => {
      const cutoff = Date.now() - (Number(i.days) || 3) * 86400000;
      const list = (await db.articles.toArray())
        .filter((a) => a.publishedAt && new Date(a.publishedAt).getTime() >= cutoff && (!i.topic || a.topic === i.topic))
        .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!)).slice(0, Math.min(Number(i.limit) || 10, 20));
      return list.length ? list.map((a) => `- ${a.title} — ${a.source}, ${a.publishedAt} — ${a.url}\n  ${a.summary.slice(0, 180)}`).join("\n") : "No stored articles match. The user may need to refresh News, or feeds may be unreachable.";
    },
  },
  {
    def: { name: "opportunity_ideas", description: "Beginner-friendly, low-cost ways to earn (curated playbooks with risks and a first action). Use for 'earn my first ₹1,000', side hustles, online income. Estimates are illustrative, never guaranteed.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Look up earning ideas",
    run: async () => {
      const picks = ["tutoring", "video-editing", "content-writing", "freelance-web", "ai-automation"].map((id) => PLAYBOOKS.find((p) => p.id === id)!);
      return [ESTIMATE_NOTE, "", ...picks.map((p, i) => `${i + 1}. ${p.name} — ${p.difficulty}, competition ${p.competition}, start cost ${p.startCost}\n   First action (~${p.firstAction.minutes} min): ${p.firstAction.title}\n   Time to first income: ${p.timeToFirstIncome}\n   Main risk: ${p.risks[0]}`), "", "Full plans: Earn Money tab → “First ₹1,000 plan”. Never pay a fee to get work."].join("\n");
    },
  },
  {
    def: { name: "learning_next", description: "The user's next unfinished skill-roadmap steps (AI & Automation, Embedded/IoT, Web, Finance).", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Check learning roadmaps",
    run: async () => {
      const prog = await db.roadmapProgress.toArray();
      return ROADMAPS.map((r) => {
        const todo = r.steps.filter((st) => !prog.some((x) => x.id === `${r.id}:${st.id}` && x.done));
        const done = r.steps.length - todo.length;
        return `${r.name} (${done}/${r.steps.length} done)\n` + (todo.slice(0, 3).map((st) => `  • [${st.stage}] ${st.title}${st.resource ? " — " + st.resource.url : ""}${st.project ? `\n    project: ${st.project}` : ""}`).join("\n") || "  All steps complete.");
      }).join("\n");
    },
  },
  {
    def: { name: "career_pointers", description: "Where to find real internships, scholarships and certifications (official portals) plus what the user is tracking. Cannot list individual postings.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Look up career portals",
    run: async () => {
      const mine = (await db.opportunities.toArray()).filter((o) => ["job", "internship", "scholarship", "certification"].includes(o.kind));
      const lines = ["I can't list individual postings (I can't verify them). Official places to look:", ...["Internships", "Scholarships", "Certifications"].flatMap((g) => OFFICIAL_PORTALS[g].map((p) => `  • ${g}: ${p.name} — ${p.url}`))];
      lines.push("", mine.length ? "You're tracking:\n" + mine.map((o) => `  • ${o.name} (${o.kind}) — ${o.status}${o.deadline ? ", deadline " + o.deadline : ""}${o.meta?.verified ? "" : " [unverified]"}`).join("\n") : "You're not tracking any yet — use Career → Opportunities → Track. Check the ATS resume tool first.", "", "Always confirm eligibility, stipend and deadline on the official page. Legitimate employers never charge application fees.");
      return lines.join("\n");
    },
  },
  {
    def: { name: "project_status", description: "Status of the user's engineering projects: milestones, next deadline, open issues, wiring safety flags, viva readiness.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Check project status",
    run: async () => {
      const projects = await db.projects.toArray();
      if (!projects.length) return "No project workspace yet. Create one in Projects (the IoT Solar Microgrid template adds milestones, documents and viva questions).";
      const out: string[] = [];
      for (const p of projects) {
        const items = await db.projectItems.where("projectId").equals(p.id).toArray();
        const ms = items.filter((i) => i.type === "milestone");
        const doneN = ms.filter((m) => m.data.status === "done").length;
        const next = ms.filter((m) => m.data.status !== "done").sort((a, b) => String(a.data.due || "9999").localeCompare(String(b.data.due || "9999")))[0];
        const conns = items.filter((i) => i.type === "connection").map((i) => i.data as Connection);
        const danger = conns.filter((c) => lintConnection(c).some((f) => f.level === "danger")).length;
        const viva = items.filter((i) => i.type === "viva");
        const tests = items.filter((i) => i.type === "test");
        out.push([`${p.name}: ${doneN}/${ms.length} milestones done.`,
          next ? `  Next: ${next.data.title}${next.data.due ? " (due " + next.data.due + ")" : " (no date set)"}` : "  No open milestones.",
          `  Wiring: ${conns.filter((c) => c.status === "confirmed").length} confirmed, ${conns.filter((c) => c.status !== "confirmed").length} proposed${danger ? `, ⚠ ${danger} with DANGER flags — review before powering anything` : ""}`,
          `  Tests: ${tests.filter((t) => t.data.result === "pass").length} pass / ${tests.filter((t) => t.data.result === "fail").length} fail / ${tests.filter((t) => (t.data.result ?? "pending") === "pending").length} pending`,
          `  Open issues: ${items.filter((i) => i.type === "log" && !i.data.resolved).length}; viva answered: ${viva.filter((v) => v.data.answer).length}/${viva.length}`].join("\n"));
      }
      return out.join("\n\n");
    },
  },
  {
    def: { name: "channel_ideas", description: "YouTube channel context for MONEYVARK or ZILVOREX: content pillars, ideas already in the pipeline, title formulas. Use before suggesting new video ideas.", input_schema: { type: "object", properties: { channel: { type: "string", enum: ["MONEYVARK", "ZILVOREX"] } } } },
    write: false,
    describe: (i) => `Look up ${i.channel ?? "channel"} content plan`,
    run: async (i) => {
      const chans = (i.channel ? [i.channel] : ["MONEYVARK", "ZILVOREX"]) as ("MONEYVARK" | "ZILVOREX")[];
      const ideas = await db.videoIdeas.toArray();
      return chans.map((c) => { const mine = ideas.filter((v) => v.channel === c && v.stage !== "published"); return `${c} — ${CHANNELS[c].tagline}\n  Pillars: ${CHANNELS[c].pillars.join("; ")}\n  In pipeline (${mine.length}): ${mine.slice(0, 6).map((v) => `${v.title} [${v.stage}]`).join("; ") || "none"}`; }).join("\n\n") + `\n\nTitle formulas (heuristics, not verified data):\n- ${TITLE_FORMULAS.join("\n- ")}\n${TITLE_NOTE}`;
    },
  },
  {
    def: { name: "progress_summary", description: "Summarise the user's last 7 days: tasks, habits, learning, money, videos.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "Review weekly progress",
    run: async () => weekMarkdown(await weekStats()),
  },
  {
    def: { name: "search_app", description: "Search tasks, notes, saved articles, opportunities, projects and content ideas.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    write: false,
    describe: (i) => `Search for “${i.query}”`,
    run: async (i) => {
      const h = await universalSearch(String(i.query), 8);
      return h.length ? h.map((x) => `${x.kind}: ${x.title} — ${x.snippet}`).join("\n") : "No matches.";
    },
  },
  {
    def: { name: "list_opportunities", description: "The user's tracked opportunities (jobs, internships, earning ideas) and their status.", input_schema: { type: "object", properties: {} } },
    write: false,
    describe: () => "List tracked opportunities",
    run: async () => {
      const o = await db.opportunities.toArray();
      return o.length ? o.map((x) => `${x.name} (${x.kind}) — ${x.status}${x.deadline ? ", deadline " + x.deadline : ""}`).join("\n") : "Nothing tracked yet.";
    },
  },
  {
    def: {
      name: "create_task",
      description: "Create a task. due_iso is an ISO-8601 local datetime like 2025-10-09T07:00:00; set has_time false for all-day.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" }, notes: { type: "string" }, due_iso: { type: "string" }, has_time: { type: "boolean" },
          duration_min: { type: "number" }, priority: { type: "string", enum: PRIS }, category: { type: "string", enum: CATS },
        },
        required: ["title"],
      },
    },
    write: true,
    describe: (i) => `Create task “${i.title}”${i.due_iso ? " due " + fmtDue(new Date(i.due_iso).toISOString(), i.has_time !== false) : ""} · ${i.priority ?? "medium"} · ${i.category ?? "personal"}`,
    run: async (i, s) => {
      const due = i.due_iso ? new Date(i.due_iso) : null;
      const hasTime = !!due && i.has_time !== false;
      const t = await addTask({
        title: String(i.title).slice(0, 200), notes: String(i.notes ?? ""), due: due && !isNaN(+due) ? (hasTime ? due : startOfDay(due)).toISOString() : null, hasTime,
        durationMin: i.duration_min ?? null, priority: (PRIS.includes(i.priority) ? i.priority : "medium") as Priority,
        category: (CATS.includes(i.category) ? i.category : "personal") as Category, reminderMin: hasTime ? s.defaultReminderMin : null, source: "assistant",
      });
      return `Created task ${t.id.slice(0, 8)}: ${t.title}`;
    },
  },
  {
    def: { name: "complete_task", description: "Mark a task done (use the id shown by list_tasks).", input_schema: { type: "object", properties: { task_id: { type: "string" } }, required: ["task_id"] } },
    write: true,
    describe: (i) => `Mark task ${String(i.task_id).slice(0, 8)} as done`,
    run: async (i) => {
      const t = await findTask(String(i.task_id));
      if (!t) return "Task not found.";
      await completeTask(t.id);
      return `Completed: ${t.title}`;
    },
  },
  {
    def: { name: "postpone_task", description: "Move a task's due date later by N days.", input_schema: { type: "object", properties: { task_id: { type: "string" }, days: { type: "number" } }, required: ["task_id"] } },
    write: true,
    describe: (i) => `Postpone task ${String(i.task_id).slice(0, 8)} by ${i.days ?? 1} day(s)`,
    run: async (i) => {
      const t = await findTask(String(i.task_id));
      if (!t) return "Task not found.";
      await postponeTask(t.id, Math.max(1, Number(i.days) || 1));
      return `Postponed: ${t.title}`;
    },
  },
  {
    def: { name: "create_note", description: "Save a note.", input_schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "body"] } },
    write: true,
    describe: (i) => `Save note “${i.title}”`,
    run: async (i) => {
      const now = new Date().toISOString();
      await db.notes.add({ id: uid(), title: String(i.title), body: String(i.body), tags: Array.isArray(i.tags) ? i.tags.map(String) : [], pinned: false, createdAt: now, updatedAt: now });
      return "Note saved.";
    },
  },
  {
    def: {
      name: "create_video_idea", description: "Add a video idea to YouTube Studio for MONEYVARK or ZILVOREX.",
      input_schema: { type: "object", properties: { channel: { type: "string", enum: ["MONEYVARK", "ZILVOREX"] }, title: { type: "string" }, format: { type: "string", enum: ["short", "long"] }, hook: { type: "string" } }, required: ["channel", "title"] },
    },
    write: true,
    describe: (i) => `Add ${i.channel} video idea “${i.title}”`,
    run: async (i) => {
      await db.videoIdeas.add({
        id: uid(), channel: (i.channel === "ZILVOREX" ? "ZILVOREX" : "MONEYVARK") as Channel, title: String(i.title), format: i.format === "short" ? "short" : "long",
        stage: "idea", publishDate: null, hook: String(i.hook ?? ""), script: "", description: "", tags: [], thumbnail: "", checklist: [], origin: "ai", views: null, createdAt: new Date().toISOString(),
      });
      return "Idea added to YouTube Studio.";
    },
  },
  {
    def: {
      name: "track_opportunity", description: "Add an opportunity to the tracker (status 'saved'). Only use real opportunities the user gave you or that you found with a source URL.",
      input_schema: { type: "object", properties: { name: { type: "string" }, kind: { type: "string", enum: ["earn", "job", "internship", "scholarship", "certification", "other"] }, url: { type: "string" }, deadline: { type: "string", description: "YYYY-MM-DD if known" }, notes: { type: "string" } }, required: ["name"] },
    },
    write: true,
    describe: (i) => `Track opportunity “${i.name}”`,
    run: async (i) => {
      const now = new Date().toISOString();
      const o: TrackedOpportunity = { id: uid(), name: String(i.name), kind: (i.kind ?? "other"), status: "saved", url: String(i.url ?? ""), deadline: i.deadline ?? null, notes: String(i.notes ?? ""), amount: null, playbookId: null, createdAt: now, updatedAt: now };
      await db.opportunities.add(o);
      return "Added to the Opportunity Tracker.";
    },
  },
];

export const toolByName = (n: string) => TOOLS.find((t) => t.def.name === n);

export async function systemContext(s: Settings): Promise<string> {
  const now = new Date();
  const tasks = await db.tasks.toArray();
  const open = tasks.filter((t) => t.status === "todo");
  const overdue = open.filter((t) => bucketOf(t, now) === "overdue").length;
  const today = open.filter((t) => bucketOf(t, now) === "today").length;
  return [
    `You are LIFE OS Assistant inside ${s.name ? s.name + "'s" : "the user's"} personal productivity app.`,
    `Now: ${format(now, "EEEE d MMMM yyyy, h:mm a")} (${s.timezone}). Tomorrow is ${dayKey(addDays(now, 1))}.`,
    `State: ${open.length} open tasks, ${today} due today, ${overdue} overdue.`,
    "The user is an Indian engineering student (IoT solar microgrid project), learning finance and AI, preparing for UPSC, running YouTube channels MONEYVARK (finance) and ZILVOREX (tech), seeking internships and online income.",
    "Rules: use tools to read real app data instead of guessing. Be concise and practical; turn advice into tasks when useful (create_task) — the user is asked to confirm every change. Never invent news, job listings, deadlines, earnings or prices; if a tool returns nothing, say so. Never promise income or investment returns; mention risk when discussing money. Give ISO local datetimes for due dates.",
  ].join("\n");
}
