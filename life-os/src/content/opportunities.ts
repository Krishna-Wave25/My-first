export interface Playbook {
  id: string;
  name: string;
  group: "Freelancing" | "Content" | "Products" | "Career" | "Engineering";
  summary: string;
  how: string;
  skills: string[];
  startCost: string;
  timeToFirstIncome: string;
  revenueEstimate: string; // always an illustrative estimate, revenue not profit
  difficulty: "Easy" | "Medium" | "Hard";
  competition: "Low" | "Medium" | "High";
  risks: string[];
  free: { label: string; url: string }[];
  platforms: { label: string; url: string }[];
  steps: string[];
  firstAction: { title: string; minutes: number };
}

export const ESTIMATE_NOTE =
  "Illustrative estimates, not data and not guarantees. Figures are gross revenue before platform fees, taxes and your costs — not profit. Many beginners earn nothing at first. Nobody can promise you income.";

export const PLAYBOOKS: Playbook[] = [
  {
    id: "freelance-web", name: "Freelance website & landing-page building", group: "Freelancing",
    summary: "Build simple sites for local shops, clinics, coaching centres and creators.",
    how: "You build and host small static or CMS sites for businesses that lack a web presence, charging per project plus optional monthly upkeep.",
    skills: ["HTML/CSS/JS", "Responsive design", "Basic SEO", "Communicating with clients", "Git + hosting"],
    startCost: "₹0–₹1,000 (domain/hosting for demos; free tiers cover most practice)",
    timeToFirstIncome: "Typically 3–10 weeks, mostly from your own network first",
    revenueEstimate: "Small local sites commonly priced in the low thousands of ₹ per project; wide variation by city, scope and skill",
    difficulty: "Medium", competition: "High",
    risks: ["Scope creep and unpaid revisions — agree scope and a deposit in writing", "Platform fees on marketplaces", "Irregular income", "Client non-payment: never hand over final files before payment"],
    free: [{ label: "freeCodeCamp — Responsive Web Design", url: "https://www.freecodecamp.org/" }, { label: "MDN Web Docs", url: "https://developer.mozilla.org/" }, { label: "The Odin Project", url: "https://www.theodinproject.com/" }],
    platforms: [{ label: "Upwork", url: "https://www.upwork.com/" }, { label: "Fiverr", url: "https://www.fiverr.com/" }, { label: "Freelancer", url: "https://www.freelancer.in/" }],
    steps: ["Build 3 demo sites for imaginary or friendly businesses", "Put them on GitHub Pages with a short case-study each", "List 20 local businesses with weak or no sites; message 5 per day with a specific improvement idea", "Offer a fixed-price starter package with a deposit", "Collect a testimonial after delivery", "Ask for referrals; then raise prices"],
    firstAction: { title: "Pick one local business and write 3 concrete improvements for its web presence", minutes: 30 },
  },
  {
    id: "ai-automation", name: "AI automation services for small businesses", group: "Freelancing",
    summary: "Automate repetitive work (lead capture, reminders, reports, support replies) with no-code tools and APIs.",
    how: "You map a client's manual workflow, then connect forms, spreadsheets, messaging and AI APIs so it runs automatically. Charge per workflow, plus a maintenance retainer.",
    skills: ["Workflow mapping", "No-code automation tools", "REST APIs / webhooks", "Prompting & output validation", "Basic Python or JS"],
    startCost: "₹0 to start (free tiers); API usage is a cost you must price in",
    timeToFirstIncome: "Typically 4–12 weeks; depends on finding a first trusting client",
    revenueEstimate: "Single small workflows are often priced in the low-to-mid thousands of ₹; recurring retainers are possible but not assured",
    difficulty: "Medium", competition: "Medium",
    risks: ["AI outputs can be wrong — add human review for anything customer-facing", "Handling client data brings privacy obligations", "Tool pricing changes can break your margins", "Over-promising what automation can do"],
    free: [{ label: "Anthropic docs — build with Claude", url: "https://docs.anthropic.com/" }, { label: "Google Apps Script guides", url: "https://developers.google.com/apps-script" }, { label: "Zapier learn", url: "https://zapier.com/learn/" }],
    platforms: [{ label: "Upwork", url: "https://www.upwork.com/" }, { label: "LinkedIn", url: "https://www.linkedin.com/" }],
    steps: ["Automate one of your own routines end-to-end (e.g. lead sheet → email reply draft)", "Record a 2-minute demo video", "Write a one-page offer: problem → workflow → time saved → fixed price", "Pitch five small businesses you can reach in person or by message", "Deliver one pilot at a low, honest price in exchange for a testimonial", "Document the workflow and handover so the client isn't dependent on you"],
    firstAction: { title: "List 5 repetitive tasks you do weekly and pick one to automate", minutes: 25 },
  },
  {
    id: "video-editing", name: "Video editing for creators", group: "Freelancing",
    summary: "Edit Shorts and long-form videos for small YouTubers and educators.",
    how: "Creators outsource editing to save time. You deliver cut, captioned, paced videos on a per-video or monthly basis.",
    skills: ["Editing software (DaVinci Resolve, CapCut)", "Pacing & storytelling", "Captions/subtitles", "Audio cleanup", "Deadlines"],
    startCost: "₹0 (free editors) – laptop you already own",
    timeToFirstIncome: "Typically 2–8 weeks",
    revenueEstimate: "Per-video rates for beginners are commonly modest (hundreds to low thousands of ₹); volume and repeat clients matter most",
    difficulty: "Easy", competition: "High",
    risks: ["Low rates while building a portfolio", "Revision loops", "Hardware limits on long renders", "Client may not credit or pay on time"],
    free: [{ label: "DaVinci Resolve training", url: "https://www.blackmagicdesign.com/products/davinciresolve/training" }, { label: "YouTube Creator Academy / Creator Insider", url: "https://www.youtube.com/creators/" }],
    platforms: [{ label: "Fiverr", url: "https://www.fiverr.com/" }, { label: "Upwork", url: "https://www.upwork.com/" }],
    steps: ["Re-edit 3 public Creative-Commons videos as portfolio pieces", "Create one Short and one long-form sample", "Message 10 small creators with a specific improvement to their latest upload", "Offer a free trial cut for one video", "Set a clear revision limit in your terms"],
    firstAction: { title: "Download a free-licence clip and edit a 30-second portfolio piece", minutes: 45 },
  },
  {
    id: "content-writing", name: "Technical & educational content writing", group: "Freelancing",
    summary: "Write explainers, blog posts and study material on tech, finance and engineering.",
    how: "Companies and ed-tech sites pay for accurate, clear writing. You pitch topics you understand and deliver on deadline.",
    skills: ["Clear writing", "Research & fact-checking", "SEO basics", "Editing your own work"],
    startCost: "₹0",
    timeToFirstIncome: "Typically 3–10 weeks",
    revenueEstimate: "Beginner per-article payments vary a lot; per-word or per-article rates are set by the client — treat any figure as unverified until a client agrees",
    difficulty: "Easy", competition: "High",
    risks: ["Content mills pay very little", "AI-generated spam is saturating the market — originality and accuracy are your edge", "Plagiarism accusations — always cite"],
    free: [{ label: "Google Technical Writing course", url: "https://developers.google.com/tech-writing" }, { label: "Hemingway-style editing tips (plain language guidelines)", url: "https://www.plainlanguage.gov/" }],
    platforms: [{ label: "Upwork", url: "https://www.upwork.com/" }, { label: "Medium (build a portfolio)", url: "https://medium.com/" }],
    steps: ["Publish 3 well-researched explainers on your own blog", "Study 5 sites that pay for contributions and read their guidelines", "Send one tailored pitch per day", "Always send a clean, sourced draft", "Reuse your best pieces as portfolio samples"],
    firstAction: { title: "Write a 300-word explainer of something you learned this week", minutes: 30 },
  },
  {
    id: "youtube", name: "YouTube channel monetization (MONEYVARK / ZILVOREX)", group: "Content",
    summary: "Long-term income from ads, sponsorships, affiliate links and your own products.",
    how: "YouTube pays a share of ad revenue only after you meet the Partner Program thresholds. Sponsorships, affiliate links and products are separate income streams that don't require the YPP.",
    skills: ["Topic research", "Scripting & hooks", "Editing", "Thumbnails & titles", "Analytics literacy", "Consistency"],
    startCost: "₹0–₹5,000 (microphone is the best first upgrade)",
    timeToFirstIncome: "Commonly many months; the Partner Program has audience thresholds — check the current rules on YouTube's help page",
    revenueEstimate: "Highly uncertain. Ad revenue depends on views, audience country, niche and watch time. Do not plan around any per-view number you read online",
    difficulty: "Hard", competition: "High",
    risks: ["Most channels earn little for a long time", "Algorithm and policy changes", "Copyright strikes and demonetisation of reused content", "Finance content must avoid guaranteeing returns and needs clear disclaimers"],
    free: [{ label: "YouTube Partner Program eligibility", url: "https://support.google.com/youtube/answer/72851" }, { label: "YouTube Creators", url: "https://www.youtube.com/creators/" }],
    platforms: [{ label: "YouTube Studio", url: "https://studio.youtube.com/" }, { label: "Google AdSense", url: "https://www.google.com/adsense/" }],
    steps: ["Pick 3 repeatable series per channel", "Publish on a schedule you can sustain for 6 months", "Study retention graphs after each upload and fix the first 30 seconds", "Reuse long videos as Shorts", "Add affiliate disclosures where you use links", "Apply to the Partner Program only when the thresholds are met"],
    firstAction: { title: "Write 10 video titles for one channel and rank them by how clearly they promise a result", minutes: 30 },
  },
  {
    id: "affiliate", name: "Affiliate marketing (honest recommendations)", group: "Content",
    summary: "Earn commissions by recommending tools or products you actually use.",
    how: "Programs give you a tracking link; you earn a commission when someone buys. Works best with a trusted audience (YouTube, blog, newsletter).",
    skills: ["Honest product reviews", "Basic SEO", "Disclosure compliance", "Audience building"],
    startCost: "₹0",
    timeToFirstIncome: "Weeks to months — requires an audience first",
    revenueEstimate: "Commission rates vary by programme; income is zero until you have traffic",
    difficulty: "Medium", competition: "High",
    risks: ["Must disclose affiliate links clearly (platform and legal rules)", "Recommending things only for commission destroys trust", "Programmes can change or end commissions", "Never recommend financial products as guaranteed profit"],
    free: [{ label: "Amazon Associates India", url: "https://affiliate-program.amazon.in/" }],
    platforms: [{ label: "Amazon Associates India", url: "https://affiliate-program.amazon.in/" }],
    steps: ["List tools you genuinely use", "Write one honest comparison with pros and cons", "Add a visible disclosure", "Track clicks vs purchases", "Drop programmes that don't serve your audience"],
    firstAction: { title: "List 5 tools you use daily and note one honest drawback of each", minutes: 15 },
  },
  {
    id: "digital-products", name: "Digital products & templates", group: "Products",
    summary: "Sell templates, notes, spreadsheets or small tools that save others time.",
    how: "Create something reusable (budget planner sheet, resume template, UPSC notes layout, Arduino cheat-sheet) once and sell it repeatedly.",
    skills: ["Spreadsheets/design", "A niche you understand", "Basic marketing", "Customer support"],
    startCost: "₹0–₹500",
    timeToFirstIncome: "Several weeks to months; many products sell nothing",
    revenueEstimate: "Unpredictable; usually small and slow at first",
    difficulty: "Medium", competition: "High",
    risks: ["No sales without distribution", "Copying others' templates is infringement — make original work", "Refund and tax obligations"],
    free: [{ label: "Canva design school", url: "https://www.canva.com/designschool/" }, { label: "Google Sheets help", url: "https://support.google.com/docs/" }],
    platforms: [{ label: "Gumroad", url: "https://gumroad.com/" }, { label: "Notion (templates)", url: "https://www.notion.so/" }],
    steps: ["Find a problem people in your circle complain about", "Build a minimal version and test it with 5 people", "Price it, add a clear preview", "Share where those people already gather", "Improve from feedback"],
    firstAction: { title: "Build a 1-page monthly budget sheet using the 50/30/20 rule and ask 3 friends to try it", minutes: 40 },
  },
  {
    id: "tutoring", name: "Online tutoring (engineering / maths / coding)", group: "Freelancing",
    summary: "Teach juniors or school students subjects you're strong in.",
    how: "Take small batches or 1:1 sessions online or in person; recurring students make income steadier than one-off gigs.",
    skills: ["Subject mastery", "Patience & explanation", "Scheduling", "Basic screen-sharing tools"],
    startCost: "₹0",
    timeToFirstIncome: "Typically 1–4 weeks via word of mouth",
    revenueEstimate: "Hourly rates for student tutors vary widely by subject, city and track record",
    difficulty: "Easy", competition: "Medium",
    risks: ["Time-for-money ceiling", "Cancellations", "Safety — keep to platform rules and share sessions with guardians for minors"],
    free: [{ label: "Khan Academy", url: "https://www.khanacademy.org/" }, { label: "NPTEL course material", url: "https://nptel.ac.in/" }],
    platforms: [{ label: "Superprof", url: "https://www.superprof.co.in/" }],
    steps: ["Pick 1–2 subjects you scored well in", "Offer one free trial session", "Create a simple syllabus and weekly progress note", "Ask for referrals", "Raise rates after 5 happy students"],
    firstAction: { title: "Write a 5-line description of what you'd teach and who it's for", minutes: 15 },
  },
  {
    id: "internships", name: "Paid internships & stipends", group: "Career",
    summary: "Experience + a stipend, and the strongest route to better jobs.",
    how: "Apply to listed internships on official portals and company career pages. Verify every posting on the employer's own site before applying or paying anything.",
    skills: ["Resume & portfolio", "Project showcase", "Interview basics", "Follow-up emails"],
    startCost: "₹0 — legitimate internships never charge you a fee",
    timeToFirstIncome: "Varies by hiring season; apply 4–8 weeks ahead",
    revenueEstimate: "Stipends vary from unpaid to well-paid; always read the posting for the stated stipend",
    difficulty: "Medium", competition: "High",
    risks: ["Fake postings and ‘registration fee’ scams — never pay to get a job", "Unpaid roles with no learning", "Missing application deadlines"],
    free: [{ label: "AICTE Internship Portal", url: "https://internship.aicte-india.org/" }, { label: "Skill India Digital Hub", url: "https://www.skillindiadigital.gov.in/" }],
    platforms: [{ label: "Internshala", url: "https://internshala.com/" }, { label: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/" }, { label: "AICTE Internship Portal", url: "https://internship.aicte-india.org/" }],
    steps: ["Finish an ATS-friendly one-page resume (use Career → Resume)", "Pick 10 roles; track each in the Opportunity Tracker with the official URL and deadline", "Customise 2–3 bullets per application", "Apply, then follow up politely after a week", "Practise interviews with the question bank"],
    firstAction: { title: "Run your resume through the ATS checker against one real internship description", minutes: 25 },
  },
  {
    id: "open-source", name: "Open source & competitions (portfolio → income)", group: "Career",
    summary: "Build visible proof of skill: GitHub contributions, hackathons, Kaggle, Google Summer of Code.",
    how: "Public work converts into internships, stipends (some programmes are paid) and freelance leads.",
    skills: ["Git/GitHub", "Reading others' code", "A language of your choice", "Writing clear READMEs"],
    startCost: "₹0",
    timeToFirstIncome: "Months; the payoff is mostly opportunity, not direct pay",
    revenueEstimate: "Prizes and stipends exist for some programmes but are not typical income",
    difficulty: "Medium", competition: "Medium",
    risks: ["Time sink without a goal", "Programmes have eligibility and deadlines — check the official page"],
    free: [{ label: "First Contributions guide", url: "https://github.com/firstcontributions/first-contributions" }, { label: "Kaggle Learn", url: "https://www.kaggle.com/learn" }],
    platforms: [{ label: "GitHub", url: "https://github.com/" }, { label: "Google Summer of Code", url: "https://summerofcode.withgoogle.com/" }, { label: "Devpost hackathons", url: "https://devpost.com/hackathons" }],
    steps: ["Make your profile README", "Fix one documentation issue in a project you use", "Enter one beginner-friendly hackathon", "Write up what you built"],
    firstAction: { title: "Find one beginner-labelled issue in a project you use and read its contribution guide", minutes: 30 },
  },
  {
    id: "iot-energy", name: "IoT, solar & energy-monitoring side projects", group: "Engineering",
    summary: "Turn your microgrid skills into local services: monitoring dashboards, sensor kits, energy audits.",
    how: "Small businesses and homes with solar want to see what their system produces. You can build low-cost monitoring using microcontrollers, sensors and a dashboard — only after safety training for anything beyond low-voltage prototypes.",
    skills: ["Arduino/ESP32", "Sensors & signal conditioning", "MQTT & dashboards", "Basic electrical safety", "Documentation"],
    startCost: "₹1,500–₹6,000 for parts for a demo kit",
    timeToFirstIncome: "Months; start with a documented demo and a few unpaid pilots",
    revenueEstimate: "Unknown until you find customers; treat the first projects as portfolio-building",
    difficulty: "Hard", competition: "Low",
    risks: ["Electrical hazards: never work on mains or high-DC systems without qualified supervision", "Liability if your device is installed in someone's system", "Component sourcing costs"],
    free: [{ label: "Arduino docs", url: "https://docs.arduino.cc/" }, { label: "Espressif ESP-IDF docs", url: "https://docs.espressif.com/" }, { label: "MNRE (Govt. of India renewables)", url: "https://mnre.gov.in/" }],
    platforms: [{ label: "GitHub", url: "https://github.com/" }, { label: "Hackster.io", url: "https://www.hackster.io/" }],
    steps: ["Document your college microgrid project as a case study", "Publish the code and wiring (marked verified/unverified)", "Offer to monitor a friend's low-voltage system as a pilot", "Learn from a qualified electrician before touching anything above ELV", "Pitch dashboards to small installers"],
    firstAction: { title: "Write a one-page case study of your microgrid project with a block diagram", minutes: 45 },
  },
  {
    id: "startup-ideas", name: "Small online business / startup validation", group: "Products",
    summary: "Test a service or product idea cheaply before building it.",
    how: "Describe the offer on a one-page site or message, find 10 target customers, and see whether anyone will pre-commit before you build anything.",
    skills: ["Customer interviews", "Simple landing pages", "Basic accounting", "Persistence"],
    startCost: "₹0–₹2,000",
    timeToFirstIncome: "Highly variable; most ideas fail validation — that is useful information",
    revenueEstimate: "No reliable estimate. Revenue is not profit; track costs from day one",
    difficulty: "Hard", competition: "Medium",
    risks: ["Spending money before validation", "GST/registration and tax obligations may apply as you grow", "Co-founder/IP disputes — put agreements in writing"],
    free: [{ label: "Startup India learning", url: "https://www.startupindia.gov.in/" }],
    platforms: [{ label: "Startup India", url: "https://www.startupindia.gov.in/" }],
    steps: ["Write the problem in one sentence", "Talk to 10 people who have it", "Offer a manual version first", "Charge something small to test willingness to pay", "Only then build"],
    firstAction: { title: "Write your idea's problem statement in one sentence and name 3 people who have it", minutes: 15 },
  },
];

export interface OfficialPortal { name: string; url: string; what: string }
export const OFFICIAL_PORTALS: Record<string, OfficialPortal[]> = {
  Internships: [
    { name: "AICTE Internship Portal", url: "https://internship.aicte-india.org/", what: "Government-backed internship listings for engineering students" },
    { name: "Internshala", url: "https://internshala.com/", what: "Internships and trainings (verify each employer)" },
    { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/", what: "Company-posted roles" },
  ],
  Scholarships: [
    { name: "National Scholarship Portal", url: "https://scholarships.gov.in/", what: "Central & state scholarship schemes — check eligibility and the deadline on each scheme page" },
    { name: "Buddy4Study", url: "https://www.buddy4study.com/", what: "Scholarship aggregator (always confirm on the provider's site)" },
  ],
  Certifications: [
    { name: "NPTEL / SWAYAM", url: "https://nptel.ac.in/", what: "Free IIT/IISc courses; proctored certification exams for a fee" },
    { name: "Skill India Digital Hub", url: "https://www.skillindiadigital.gov.in/", what: "Government skilling courses" },
    { name: "Google Career Certificates", url: "https://grow.google/certificates/", what: "Industry certificates (paid, financial aid available)" },
  ],
  Programmes: [
    { name: "Google Summer of Code", url: "https://summerofcode.withgoogle.com/", what: "Paid open-source mentorship; check eligibility each year" },
    { name: "MLH Fellowship", url: "https://fellowship.mlh.io/", what: "Open-source fellowship programmes" },
  ],
  Exams: [
    { name: "UPSC", url: "https://upsc.gov.in/", what: "Official notifications, syllabus and exam calendar" },
  ],
};
