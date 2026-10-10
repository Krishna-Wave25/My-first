import { db } from "../db/db";

const TABLES = ["tasks", "notes", "habits", "habitLogs", "feeds", "articles", "watchlist", "opportunities", "transactions", "budgets", "savingsGoals", "learningLogs", "roadmapProgress", "projects", "projectItems", "videoIdeas", "chat", "bookmarks", "reviews", "briefings", "kv"] as const;

export async function exportAll(includeSecrets = false): Promise<string> {
  const out: Record<string, unknown> = { app: "life-os-ai", version: 1, exportedAt: new Date().toISOString() };
  for (const t of TABLES) out[t] = await (db as any)[t].toArray();
  if (!includeSecrets) {
    out.kv = (out.kv as { key: string; value: any }[]).map((r) =>
      r.key === "settings" ? { ...r, value: { ...r.value, ai: { ...r.value?.ai, apiKey: "" } } } : r,
    );
  }
  return JSON.stringify(out, null, 2);
}

export async function importAll(json: string): Promise<number> {
  const data = JSON.parse(json);
  if (data?.app !== "life-os-ai") throw new Error("This file is not a LIFE OS backup");
  let rows = 0;
  await db.transaction("rw", TABLES.map((t) => (db as any)[t]), async () => {
    for (const t of TABLES) {
      if (!Array.isArray(data[t])) continue;
      if (t === "kv") {
        // keep this device's API key if the backup has none
        const cur = await db.kv.get("settings");
        for (const r of data.kv) {
          if (r.key === "settings" && cur?.value?.ai?.apiKey && !r.value?.ai?.apiKey) r.value = { ...r.value, ai: { ...r.value.ai, apiKey: cur.value.ai.apiKey } };
        }
      }
      await (db as any)[t].clear();
      await (db as any)[t].bulkPut(data[t]);
      rows += data[t].length;
    }
  });
  return rows;
}

export async function wipeAll() {
  await db.delete();
  await db.open();
}

export function download(filename: string, content: string, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
};
