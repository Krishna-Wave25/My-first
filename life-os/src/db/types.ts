export type Category = "personal" | "college" | "project" | "career" | "finance" | "content";
export type Priority = "critical" | "high" | "medium" | "low";

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "personal", label: "Personal", color: "var(--c-personal)" },
  { id: "college", label: "College", color: "var(--c-college)" },
  { id: "project", label: "Project", color: "var(--c-project)" },
  { id: "career", label: "Career", color: "var(--c-career)" },
  { id: "finance", label: "Finance", color: "var(--c-finance)" },
  { id: "content", label: "Content", color: "var(--c-content)" },
];
export const PRIORITIES: { id: Priority; label: string; weight: number }[] = [
  { id: "critical", label: "Critical", weight: 4 },
  { id: "high", label: "High", weight: 3 },
  { id: "medium", label: "Medium", weight: 2 },
  { id: "low", label: "Low", weight: 1 },
];
export const priorityWeight = (p: Priority) => PRIORITIES.find((x) => x.id === p)!.weight;

export interface Recurrence {
  freq: "daily" | "weekly" | "monthly";
  interval: number; // every N units
  byDay?: number[]; // 0=Sun..6=Sat (weekly)
  until?: string | null; // ISO date
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  category: Category;
  priority: Priority;
  status: "todo" | "done";
  due: string | null; // ISO datetime
  hasTime: boolean; // false => all-day (due is local midnight)
  durationMin: number | null;
  reminderMin: number | null; // minutes before due; null = none
  recurrence: Recurrence | null;
  seriesId: string | null;
  subtasks: Subtask[];
  tags: string[];
  projectId: string | null;
  postponedCount: number;
  createdAt: string;
  completedAt: string | null;
  source: "manual" | "nl" | "assistant" | "saved" | "plan";
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  archived: boolean;
}
export interface HabitLog {
  id: string; // habitId:YYYY-MM-DD
  habitId: string;
  date: string;
}

export type Topic =
  | "india" | "world" | "tech" | "ai" | "business" | "upsc" | "science"
  | "sports" | "environment" | "entertainment" | "energy" | "cyber" | "space";

export interface Feed {
  id: string;
  name: string;
  url: string;
  topic: Topic;
  tier: "official" | "primary" | "secondary"; // source reliability tier
  section: "news" | "tech";
  enabled: boolean;
  custom: boolean;
  lastStatus?: "ok" | "error";
  lastError?: string;
  lastFetched?: string;
  lastCount?: number;
}

export interface Analysis {
  whyItMatters: string;
  implications: string;
  relevance: string;
  upsc: string | null;
  speculation: string | null;
  // tech radar extras
  whatIsNew?: string;
  applications?: string;
  skills?: string;
  earning?: string;
  generatedAt: string;
  model: string;
}

export interface Article {
  id: string; // hash of url
  feedId: string;
  source: string;
  tier: Feed["tier"];
  section: "news" | "tech";
  topic: Topic;
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  fetchedAt: string;
  saved: boolean;
  tags: string[];
  note: string;
  analysis?: Analysis;
}

export interface WatchItem {
  id: string;
  kind: "technology" | "company" | "tool" | "industry";
  name: string;
  createdAt: string;
}

export type OppStatus = "saved" | "researching" | "in_progress" | "applied" | "earned" | "rejected";
export interface TrackedOpportunity {
  id: string;
  name: string;
  kind: "earn" | "job" | "internship" | "scholarship" | "certification" | "other";
  status: OppStatus;
  url: string;
  deadline: string | null; // YYYY-MM-DD
  notes: string;
  amount: number | null; // earned so far, INR (revenue)
  playbookId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
}
export interface Budget {
  id: string; // `${month}:${category}`
  month: string; // YYYY-MM
  category: string;
  limit: number;
}
export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  createdAt: string;
}

export interface LearningLog {
  id: string;
  date: string;
  minutes: number;
  topic: string;
}
export interface RoadmapProgress {
  id: string; // roadmapId:stepId
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  template: "microgrid" | "blank";
  createdAt: string;
}
export type ProjectItemType =
  | "milestone" | "component" | "connection" | "code" | "test" | "log"
  | "reference" | "viva" | "document";
export interface ProjectItem {
  id: string;
  projectId: string;
  type: ProjectItemType;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type Channel = "MONEYVARK" | "ZILVOREX";
export type IdeaStage = "idea" | "scripting" | "filming" | "editing" | "scheduled" | "published";
export interface VideoIdea {
  id: string;
  channel: Channel;
  title: string;
  format: "short" | "long";
  stage: IdeaStage;
  publishDate: string | null;
  hook: string;
  script: string;
  description: string;
  tags: string[];
  thumbnail: string;
  checklist: { id: string; label: string; done: boolean }[];
  origin: "manual" | "ai";
  views: number | null; // manually entered after publishing
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  note: string;
  tags: string[];
  createdAt: string;
}

export interface DayReview {
  id: string; // YYYY-MM-DD
  reflection: string;
  createdAt: string;
}

export interface Briefing {
  id: string; // YYYY-MM-DD
  generatedAt: string;
  articleIds: string[]; // exactly the top-five picks
}

export interface KV {
  key: string;
  value: any;
}
