import Dexie, { type Table } from "dexie";
import type {
  Article, Bookmark, Briefing, Budget, ChatMessage, DayReview, Feed, Habit, HabitLog,
  KV, LearningLog, Note, Project, ProjectItem, RoadmapProgress, SavingsGoal, Task,
  TrackedOpportunity, Transaction, VideoIdea, WatchItem,
} from "./types";

export class LifeOSDB extends Dexie {
  tasks!: Table<Task, string>;
  notes!: Table<Note, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  feeds!: Table<Feed, string>;
  articles!: Table<Article, string>;
  watchlist!: Table<WatchItem, string>;
  opportunities!: Table<TrackedOpportunity, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  learningLogs!: Table<LearningLog, string>;
  roadmapProgress!: Table<RoadmapProgress, string>;
  projects!: Table<Project, string>;
  projectItems!: Table<ProjectItem, string>;
  videoIdeas!: Table<VideoIdea, string>;
  chat!: Table<ChatMessage, string>;
  bookmarks!: Table<Bookmark, string>;
  reviews!: Table<DayReview, string>;
  briefings!: Table<Briefing, string>;
  kv!: Table<KV, string>;

  constructor(name = "lifeos") {
    super(name);
    this.version(1).stores({
      tasks: "id, status, due, category, priority, seriesId, projectId, createdAt",
      notes: "id, updatedAt, pinned",
      habits: "id, archived",
      habitLogs: "id, habitId, date",
      feeds: "id, section, enabled",
      articles: "id, feedId, section, topic, publishedAt, saved, fetchedAt",
      watchlist: "id, kind",
      opportunities: "id, status, kind, deadline",
      transactions: "id, date, type, category",
      budgets: "id, month",
      savingsGoals: "id",
      learningLogs: "id, date",
      roadmapProgress: "id",
      projects: "id",
      projectItems: "id, projectId, type",
      videoIdeas: "id, channel, stage, publishDate",
      chat: "id, createdAt",
      bookmarks: "id",
      reviews: "id",
      briefings: "id",
      kv: "key",
    });
  }
}

export const db = new LifeOSDB();

export const uid = () =>
  (globalThis.crypto && "randomUUID" in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}
export async function setKV(key: string, value: unknown) {
  await db.kv.put({ key, value });
}
