import superjson from "superjson";
import { db } from "../helpers/db";
import { OutputType } from "./dashboard_GET.schema";

export async function handle(request: Request) {
  try {
    const [revenueDesc, deals, leads] = await Promise.all([
      db.selectFrom("monthlyRevenue").selectAll().orderBy("month", "desc").limit(12).execute(),
      db
        .selectFrom("deals")
        .selectAll()
        .where("stage", "in", ["discovery", "proposal", "negotiation", "contract"])
        .orderBy("expectedClose", "asc")
        .execute(),
      db.selectFrom("leads").selectAll().orderBy("createdAt", "desc").limit(8).execute(),
    ]);

    return new Response(
      superjson.stringify({ revenue: revenueDesc.reverse(), deals, leads } satisfies OutputType),
    );
  } catch (error) {
    console.error("Failed to load dashboard", error);
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return new Response(superjson.stringify({ error: message }), { status: 500 });
  }
}
