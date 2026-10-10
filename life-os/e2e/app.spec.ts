import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ROUTES, fresh, rssItems, trackErrors } from "./helpers";

test.describe("navigation & shell", () => {
  test("all 11 sections load without errors and have a heading", async ({ page }) => {
    const errors = trackErrors(page);
    await fresh(page);
    for (const [name, path, h1] of ROUTES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first(), name).toContainText(h1);
    }
    expect(errors).toEqual([]);
  });

  test("sidebar nav links navigate (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await fresh(page);
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    for (const [name] of ROUTES.slice(1)) {
      await nav.getByRole("link", { name }).click();
      await expect(page.getByRole("link", { name, includeHidden: false }).first()).toHaveClass(/active/);
    }
  });

  test("mobile: bottom nav, More sheet, no horizontal overflow on any page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await fresh(page);
    await expect(page.getByRole("navigation", { name: "Main (mobile)" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
    await page.getByRole("button", { name: "More sections" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Settings/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Settings");
    for (const [name, path] of ROUTES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over, `${name} overflows horizontally by ${over}px`).toBeLessThanOrEqual(1);
    }
  });

  test("tablet layout renders", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1100 });
    await fresh(page);
    await expect(page.getByRole("navigation", { name: "Main (mobile)" })).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });

  test("theme toggle persists across reload", async ({ page }) => {
    await fresh(page);
    const before = await page.locator("html").getAttribute("data-theme");
    await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", before!);
    const after = await page.locator("html").getAttribute("data-theme");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", after!);
  });
});

test.describe("tasks", () => {
  test("natural-language quick add → structured task that persists across reload", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day");
    const box = page.getByLabel("Quick add task in plain English");
    await box.fill("Tomorrow at 7 AM, spend 45 minutes learning AI automation");
    await expect(page.getByText("⏱ 45 min")).toBeVisible();
    await expect(page.getByText(/Tomorrow, 7:00 AM/).first()).toBeVisible();
    await box.press("Enter");
    await page.getByRole("tab", { name: "Upcoming" }).click();
    const row = page.getByRole("button", { name: "Learning AI automation" });
    await expect(row).toBeVisible();
    await expect(page.locator(".task").getByText(/Tomorrow, 7:00 AM/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Learning AI automation" })).toBeVisible();
  });

  test("create, edit, complete, postpone, delete + recurring + subtasks", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day");
    const box = page.getByLabel("Quick add task in plain English");
    await box.fill("Gym every day 11pm high priority");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(box).toHaveValue("");
    await box.fill("Write report today critical");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: "Write report", exact: true })).toBeVisible();

    // edit + subtask
    await page.getByRole("button", { name: "Write report", exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Title").fill("Write final report");
    await dlg.getByLabel("New subtask").fill("Outline");
    await dlg.getByRole("button", { name: "Add step" }).click();
    await dlg.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Write final report" })).toBeVisible();
    await expect(page.getByText("☑ 0/1")).toBeVisible();

    // complete → shows in Completed
    await page.getByRole("checkbox", { name: "Complete: Write final report" }).click();
    await page.getByRole("tab", { name: "Completed" }).click();
    await expect(page.getByRole("button", { name: "Write final report" })).toBeVisible();

    // recurring: completing the daily Gym task spawns the next occurrence
    await page.getByRole("tab", { name: /^Today/ }).click();
    await page.getByRole("checkbox", { name: /Complete: Gym/ }).click();
    await page.getByRole("tab", { name: "Upcoming" }).click();
    await expect(page.getByRole("button", { name: "Gym", exact: true })).toBeVisible();
    await expect(page.locator(".task").getByText("Every day")).toBeVisible();

    // postpone, then delete with confirmation
    await page.getByRole("button", { name: "Gym", exact: true }).click();
    await page.getByRole("button", { name: "Postpone 1 day" }).click();
    await expect(page.getByText("postponed")).toHaveCount(0); // postponed once is not flagged; the row moved to the next day
    await page.getByRole("button", { name: "Gym", exact: true }).click(); // re-open the moved row
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("button", { name: "Gym", exact: true })).toHaveCount(0);
  });

  test("overdue appears and can be moved to today; calendar shows dots; plan builds a schedule", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day");
    await page.getByLabel("Quick add task in plain English").fill("Submit old assignment yesterday");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("tab", { name: /Overdue · 1/ })).toBeVisible();
    await page.getByRole("tab", { name: /Overdue/ }).click();
    await expect(page.getByText("Overdue", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Move all to today" }).click();
    await page.getByRole("tab", { name: /^Plan/ }).click();
    await expect(page.locator(".tl-body").getByText("Submit old assignment")).toBeVisible();
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.getByRole("grid", { name: "Calendar" })).toBeVisible();
  });

  test("end-of-day review saves a reflection that persists", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day?tab=review");
    await page.getByLabel("Reflection").fill("Shipped the MPPT sim.");
    await page.getByRole("button", { name: "Save review" }).click();
    await expect(page.getByText("Review saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Reflection")).toHaveValue("Shipped the MPPT sim.");
  });

  test("notes persist after refresh and can become tasks; universal search finds them", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day?tab=notes");
    await page.getByRole("button", { name: "+ Note" }).click();
    await page.getByLabel("Title").fill("MPPT idea");
    await page.getByLabel("Note", { exact: true }).fill("Try incremental conductance under partial shading");
    await page.getByLabel("Tags (comma separated)").fill("solar, project");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "MPPT idea" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "MPPT idea" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByRole("dialog").getByLabel("Search everything").fill("shading");
    await expect(page.getByRole("dialog").getByText("MPPT idea")).toBeVisible();
  });

  test("habits can be created and toggled", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day?tab=habits");
    await page.getByLabel("Habit name").fill("Read 20 pages");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Read 20 pages")).toBeVisible();
    await page.getByRole("button", { name: /Read 20 pages on .*/ }).last().click();
    await expect(page.getByText("🔥 1 day streak")).toBeVisible();
  });
});

test.describe("dashboard", () => {
  test("customize: hide and reorder widgets, persisted", async ({ page }) => {
    await fresh(page);
    await page.getByRole("button", { name: /Customize/ }).click();
    await page.getByLabel("Habits", { exact: true }).click();
    await expect(page.getByRole("heading", { name: "Habits" })).toHaveCount(0);
    await page.getByRole("button", { name: "Move Top 3 priorities down" }).click();
    await expect.poll(async () => { const h = await page.locator("section.card h3").allTextContents(); return h.findIndex((x) => x.includes("Deadlines")) < h.findIndex((x) => x.includes("Top 3 priorities")); }).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Habits" })).toHaveCount(0);
    await expect.poll(async () => {
      const heads = await page.locator("section.card h3").allTextContents();
      return heads.findIndex((h) => h.includes("Deadlines")) < heads.findIndex((h) => h.includes("Top 3 priorities"));
    }).toBe(true);
  });
});

test.describe("news pipeline (fixture feeds)", () => {
  test("shows exactly five de-duplicated, dated, sourced stories and archives them", async ({ page }) => {
    await fresh(page);
    // Replace every feed request with fixtures; one feed fails, one returns a web page.
    await page.route(/^https?:\/\/(?!localhost)/, async (route) => {
      const url = route.request().url();
      const h = { "access-control-allow-origin": "*", "content-type": "application/xml" };
      if (url.includes("pib.gov.in")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "Cabinet approves national solar storage mission", link: "https://pib.gov.in/a1", hoursAgo: 3, desc: "The Union Cabinet approved a mission to support grid-scale battery storage with detailed funding provisions." },
        { title: "Government notifies new semiconductor incentive rules", link: "https://pib.gov.in/a2", hoursAgo: 5, desc: "The ministry notified revised incentive guidelines for chip fabrication units across the country." }] ) });
      if (url.includes("thehindu.com/news/national")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "Cabinet approves national solar storage mission", link: "https://thehindu.com/dup", hoursAgo: 2, desc: "Duplicate report of the same event with a similar headline and body text for testing." },
        { title: "Supreme Court hears plea on electoral bonds disclosure", link: "https://thehindu.com/a3", hoursAgo: 6, desc: "A constitution bench continued hearing arguments on transparency in political funding today." }] ) });
      if (url.includes("bbc.co.uk/news/world")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "Leaders agree ceasefire framework at regional summit", link: "https://bbc.co.uk/w1", hoursAgo: 4, desc: "Delegates from several countries signed a framework after two days of negotiations in the capital." },
        { title: "You won't believe this one weird trick", link: "https://bbc.co.uk/click", hoursAgo: 1, desc: "clickbait that should never reach the top five of the briefing at all, however fresh it is." }] ) });
      if (url.includes("rbi.org.in")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "RBI keeps policy repo rate unchanged", link: "https://rbi.org.in/r1", hoursAgo: 8, desc: "The Monetary Policy Committee voted to keep the repo rate unchanged and maintained its stance." }] ) });
      if (url.includes("bbc.co.uk/news/science")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "ISRO completes key test of reusable launch vehicle", link: "https://bbc.co.uk/s1", hoursAgo: 7, desc: "The space agency said the experiment met all its objectives in a landing trial this week." },
        { title: "Old story from last month about glaciers", link: "https://bbc.co.uk/old", hoursAgo: 24 * 40, desc: "This story is far too old to be included in the daily briefing under any ranking." }] ) });
      if (url.includes("indianexpress.com")) return route.fulfill({ status: 200, headers: { ...h, "content-type": "text/html" }, body: "<html><body>Access denied</body></html>" });
      if (url.includes("carbonbrief.org")) return route.fulfill({ status: 200, headers: h, body: rssItems([
        { title: "Record solar additions push emissions outlook lower", link: "https://carbonbrief.org/c1", hoursAgo: 9, desc: "Analysis of capacity additions shows faster deployment than earlier projections suggested." }] ) });
      return route.abort("failed");
    });
    await page.goto("/#/news");
    await page.getByRole("button", { name: /Refresh sources/ }).first().click();
    const stories = page.locator("article, section.story");
    await expect(stories).toHaveCount(5);
    // duplicates and clickbait and stale items are excluded
    await expect(page.getByText("You won't believe")).toHaveCount(0);
    await expect(page.getByText("Old story from last month")).toHaveCount(0);
    await expect(page.getByText("Cabinet approves national solar storage mission")).toHaveCount(1);
    // every story has a source link and a dated timestamp
    for (const s of await stories.all()) {
      await expect(s.getByRole("link", { name: /Read source/ })).toHaveAttribute("href", /^https:\/\//);
      await expect(s.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d\d-\d\dT/);
      await expect(s.getByText(/Reported by/)).toBeVisible();
    }
    // failing sources are reported, not hidden
    await expect(page.getByText(/sources failed/)).toBeVisible();
    // without an AI key we never show invented analysis
    await expect(page.getByText("AI analysis ·")).toHaveCount(0);
    await expect(page.getByText(/Add an AI key in Settings/).first()).toBeVisible();

    // sources tab shows per-feed health
    await page.getByRole("tab", { name: "Sources" }).click();
    await expect(page.getByText("5 items").or(page.getByText("2 items")).first()).toBeVisible();
    await expect(page.getByText(/Not valid XML|Not an RSS/).first()).toBeVisible();

    // archive contains today's briefing
    await page.getByRole("tab", { name: "Archive" }).click();
    await expect(page.getByText("5 stories")).toBeVisible();

    // briefing persists after reload with the same five
    await page.getByRole("tab", { name: "Today's briefing" }).click();
    await page.reload();
    await expect(page.locator("section.story")).toHaveCount(5);
  });

  test("honest empty state when nothing can be fetched", async ({ page }) => {
    await fresh(page);
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort("failed"));
    await page.goto("/#/news");
    await page.getByRole("button", { name: /Refresh sources/ }).first().click();
    await expect(page.getByText("No fresh verified stories available")).toBeVisible();
  });
});

test.describe("earn, finance, career, projects, youtube", () => {
  test("opportunity tracker: add, change status, deadline creates a task", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/earn?tab=tracker");
    await page.getByRole("button", { name: /\+ Add opportunity/ }).click();
    await page.getByLabel("Name").fill("Freelance landing page for local gym");
    const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel(/Application deadline/).fill(d);
    await page.getByLabel("Status").selectOption("in_progress");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("region", { name: "In progress" }).getByText("Freelance landing page for local gym")).toBeVisible();
    await page.getByRole("region", { name: "In progress" }).getByRole("button").first().click();
    await page.getByLabel("Status").selectOption("earned");
    await page.getByLabel(/Amount earned/).fill("1500");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Recorded earnings: ₹1,500/)).toBeVisible();
    await page.goto("/#/day?tab=upcoming");
    await expect(page.getByText("Deadline: Freelance landing page for local gym")).toBeVisible();
  });

  test("opportunity playbooks show required fields, risks and estimate disclaimer", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/earn");
    await expect(page.getByText(/Illustrative estimates, not data and not guarantees/)).toBeVisible();
    await page.getByRole("button", { name: "Details & plan" }).first().click();
    const dlg = page.getByRole("dialog");
    for (const t of ["How it works", "Skills needed", "Starting cost", "Time to first income", "Risks & limitations", "Free learning resources", "Step-by-step plan", "Do this today"]) await expect(dlg.getByText(t).first()).toBeVisible();
    await expect(dlg.getByText(/Revenue ≠ profit/)).toBeVisible();
  });

  test("finance: log income/expense → overview, budget, goal, calculators, lessons", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/finance?tab=tracker");
    for (const [type, amount, cat] of [["income", "10000", "Stipend"], ["expense", "4000", "Rent/Hostel"], ["expense", "1000", "Shopping"]] as const) {
      await page.getByRole("button", { name: "+ Add" }).click();
      await page.getByRole("dialog").getByRole("button", { name: type === "income" ? "Income" : "Expense" }).click();
      await page.getByLabel("Amount (₹)").fill(amount);
      await page.getByLabel("Category").selectOption(cat);
      await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    }
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("₹10,000").first()).toBeVisible();
    await expect(page.getByText("50% savings" ).or(page.getByText("Savings rate")).first()).toBeVisible();
    await expect(page.getByText(/target/).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("₹10,000").first()).toBeVisible();

    await page.getByRole("tab", { name: "Budgets & goals" }).click();
    await page.getByLabel("Monthly limit").fill("2000");
    await page.getByRole("button", { name: "Set" }).click();
    await expect(page.getByText("₹0 / ₹2,000").or(page.getByText(/\/ ₹2,000/)).first()).toBeVisible();

    await page.getByRole("tab", { name: "Calculators" }).click();
    await expect(page.getByText(/Hypothetical projections/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "Cautious" })).toBeVisible();
    await page.getByRole("button", { name: "Goal planner" }).click();
    await expect(page.getByText(/need ≈/).first()).toBeVisible();

    await page.getByRole("tab", { name: "Learn" }).click();
    await page.getByText("What is a SIP?").click();
    await expect(page.locator("details[open] .notice")).toContainText("Risk:");
    await expect(page.locator("details[open]").getByText(/Verify at official sources/)).toBeVisible();

    await page.getByRole("tab", { name: "Markets & data" }).click();
    await expect(page.getByText(/does not include a live price feed/)).toBeVisible();
  });

  test("career: ATS analysis, interview practice, roadmap progress", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/career?tab=resume");
    await page.getByLabel(/Your resume/).fill("Asha Rao asha@example.com +91 98765 43210\nEducation: B.Tech ECE\nSkills: Python, React, MQTT\nProjects: Built a solar monitor that cut losses by 18% for 200 users");
    await page.getByLabel(/Job \/ internship description/).fill("Looking for a Python developer with React, MQTT and embedded systems knowledge.");
    await expect(page.getByText("ATS match")).toBeVisible();
    await expect(page.getByText(/Missing keywords/)).toBeVisible();
    await page.getByRole("tab", { name: "Interview prep" }).click();
    await page.getByRole("button", { name: "Show answer hints" }).click();
    await expect(page.getByText("Hints:")).toBeVisible();
    await page.getByRole("tab", { name: "Skill roadmaps" }).click();
    await page.getByRole("checkbox", { name: /Mark done: Python fundamentals/ }).click();
    await expect(page.getByRole("checkbox", { name: /Mark done: Python fundamentals/ })).toBeChecked();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: /Mark done: Python fundamentals/ })).toBeChecked();
    await page.getByRole("tab", { name: "Opportunities" }).click();
    await expect(page.getByText(/does not list individual job or internship postings/)).toBeVisible();
  });

  test("projects: microgrid template, confirmed vs proposed wiring, safety flags", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/projects");
    await page.getByRole("button", { name: "Create your first project" }).click();
    await page.getByLabel("Name").fill("IoT Solar Microgrid");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText("Overview").first()).toBeVisible();
    await expect(page.getByText("0/12 milestones")).toBeVisible();
    await page.getByRole("tab", { name: /Wiring/ }).click();
    await page.getByRole("button", { name: "+ Add connection" }).click();
    await page.getByLabel(/^From/).fill("Solar panel +");
    await page.getByLabel(/^To/).fill("Arduino A0");
    await page.getByLabel(/Signal/).fill("analog in");
    await page.getByLabel(/Voltage on this line/).fill("21");
    await expect(page.getByRole("dialog").getByText(/logic pin/)).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Proposed (1)")).toBeVisible();
    await expect(page.getByText("Confirmed (0)")).toBeVisible();
    await expect(page.getByText(/⛔.*logic pin/)).toBeVisible();
    await expect(page.getByText(/not.*certified safe/)).toBeVisible();
    // cannot mark confirmed without verification
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Status").selectOption("confirmed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Describe how it was verified/)).toBeVisible();
    await page.keyboard.press("Escape");
    // milestones: mark done updates progress
    await page.getByRole("tab", { name: /Milestones/ }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).first().click();
    await page.getByLabel("Status").selectOption("done");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("1/12 milestones")).toBeVisible();
    await page.reload();
    await expect(page.getByText("1/12 milestones")).toBeVisible();
  });

  test("youtube: pipeline for both channels, checklist, honest research/performance notices", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/youtube");
    await page.getByLabel("Video idea title").fill("50/30/20 rule explained for students");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel("Video idea title")).toHaveValue("");
    await page.getByLabel("Channel").selectOption("ZILVOREX");
    await page.getByLabel("Video idea title").fill("How quantum error correction works");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("50/30/20 rule explained for students")).toBeVisible();
    await page.getByRole("button", { name: /How quantum error correction works/ }).click();
    await expect(page.getByRole("dialog").getByText("Production checklist")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Idea generator" }).click();
    await expect(page.getByText(/not verified trends/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate 5 ideas/ })).toBeDisabled();
    await page.getByRole("tab", { name: "Research" }).click();
    await expect(page.getByText(/No live YouTube data in this app/)).toBeVisible();
    await page.getByRole("tab", { name: "Performance" }).click();
    await expect(page.getByText(/Automatic performance tracking needs/)).toBeVisible();
  });
});

test.describe("assistant, settings, lock", () => {
  test("offline assistant lists overdue tasks and requires confirmation to add one", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/day");
    await page.getByLabel("Quick add task in plain English").fill("Pay hostel fee yesterday");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Open AI assistant" }).click();
    const a = page.getByRole("dialog", { name: "AI assistant" });
    await a.getByLabel("Message the assistant").fill("show my overdue tasks");
    await a.getByRole("button", { name: "Send" }).click();
    await expect(a.getByText(/Pay hostel fee/).last()).toBeVisible();
    await a.getByLabel("Message the assistant").fill("add friday 5pm submit lab record");
    await a.getByRole("button", { name: "Send" }).click();
    await expect(a.getByText("Confirm before I make changes")).toBeVisible();
    // nothing is written until the user approves
    const titles = () => page.evaluate(async () => new Promise<string[]>((res) => { const r = indexedDB.open("lifeos"); r.onsuccess = () => { const q = r.result.transaction("tasks").objectStore("tasks").getAll(); q.onsuccess = () => res(q.result.map((t: any) => t.title)); }; }));
    expect(await titles()).toEqual(["Pay hostel fee"]);
    await a.getByRole("button", { name: /Apply 1/ }).click();
    await expect(a.getByText(/Created task/)).toBeVisible();
    expect(await titles()).toContain("Submit lab record");
    await page.getByRole("button", { name: "Close assistant" }).click();
    await page.goto("/#/day?tab=upcoming");
    await expect(page.getByRole("button", { name: "Submit lab record" })).toBeVisible();
  });

  test("settings: name, schedules, key handling, integration status is honest", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/settings");
    await page.getByLabel("Your name").fill("Krishna");
    await page.getByLabel("Daily briefing time").fill("06:45");
    await page.reload();
    await expect(page.getByLabel("Your name")).toHaveValue("Krishna");
    await expect(page.getByLabel("Daily briefing time")).toHaveValue("06:45");
    await expect(page.getByRole("heading", { name: /Good .*, Krishna/ })).toHaveCount(0); // heading is on Home
    await expect(page.getByText("Not built").or(page.getByText("not built")).first()).toBeVisible();
    await expect(page.getByText(/Cloud accounts, multi-device sync/)).toBeVisible();
    await page.getByLabel("Anthropic API key").fill("sk-ant-test-123456789");
    await page.getByLabel("Your name").click();
    await page.reload();
    await expect(page.getByLabel("Anthropic API key")).toHaveValue("sk-ant-test-123456789");
    // key is not part of default export
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export backup (JSON)" }).click();
    const path = await (await dl).path();
    const txt = (await import("node:fs")).readFileSync(path!, "utf8");
    expect(txt).not.toContain("sk-ant-test-123456789");
    expect(txt).toContain('"app": "life-os-ai"');
  });

  test("PIN lock: locks on reload, rejects wrong PIN, unlocks with right PIN", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/settings");
    await page.getByLabel("New PIN").fill("4821");
    await page.getByRole("button", { name: "Set PIN" }).click();
    await expect(page.getByText("PIN on")).toBeVisible();
    await page.reload();
    const lock = page.getByRole("dialog", { name: "App locked" });
    await expect(lock).toBeVisible();
    for (const d of "0000") await lock.getByRole("button", { name: d, exact: true }).click();
    await lock.getByRole("button", { name: "Unlock" }).click();
    await expect(lock.getByText("Wrong PIN")).toBeVisible();
    for (const d of "4821") await lock.getByRole("button", { name: d, exact: true }).click();
    await lock.getByRole("button", { name: "Unlock" }).click();
    await expect(lock).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Settings");
    await page.getByRole("button", { name: "Lock app" }).click();
    await expect(lock).toBeVisible();
  });

  test("notification schedule reports honestly in a browser", async ({ page }) => {
    await fresh(page);
    await page.goto("/#/settings");
    await page.getByRole("button", { name: "Re-schedule now" }).click();
    await expect(page.getByText(/Browser: \d+ timers armed/)).toBeVisible();
    await expect(page.getByText(/only fire while this page is open/).first()).toBeVisible();
  });
});

test.describe("accessibility (axe)", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`no serious/critical violations on any page — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 900 });
      await fresh(page);
      await page.evaluate((t) => { localStorage.setItem("lifeos-theme", t); }, theme);
      for (const [name, path] of ROUTES) {
        await page.goto(path);
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(450);
        const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        const bad = res.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
        expect(bad.map((v) => `${name}/${theme}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`), `${name} ${theme}`).toEqual([]);
      }
    });
  }
});
