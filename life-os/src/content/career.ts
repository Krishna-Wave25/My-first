export interface RoadmapStep { id: string; stage: "Beginner" | "Intermediate" | "Advanced"; title: string; detail: string; resource?: { label: string; url: string }; project?: string }
export interface Roadmap { id: string; name: string; blurb: string; steps: RoadmapStep[] }

export const ROADMAPS: Roadmap[] = [
  {
    id: "ai-engineer", name: "AI & Automation", blurb: "From Python to building real AI-powered tools.",
    steps: [
      { id: "py", stage: "Beginner", title: "Python fundamentals", detail: "Variables, functions, lists/dicts, files, virtual envs.", resource: { label: "CS50P (Harvard, free)", url: "https://cs50.harvard.edu/python/" }, project: "A CLI expense tracker that saves to CSV" },
      { id: "git", stage: "Beginner", title: "Git & GitHub", detail: "Commit, branch, pull request; publish your work.", resource: { label: "GitHub Skills", url: "https://skills.github.com/" } },
      { id: "api", stage: "Beginner", title: "Calling web APIs", detail: "HTTP, JSON, auth keys, error handling.", resource: { label: "MDN: HTTP overview", url: "https://developer.mozilla.org/docs/Web/HTTP" }, project: "A script that emails you a daily weather + news summary" },
      { id: "ml", stage: "Intermediate", title: "Machine-learning basics", detail: "Supervised learning, train/test split, overfitting, evaluation.", resource: { label: "Kaggle Learn", url: "https://www.kaggle.com/learn" }, project: "Predict solar output from weather data" },
      { id: "llm", stage: "Intermediate", title: "Building with LLM APIs", detail: "Prompting, structured output, tool use, evaluation, cost control.", resource: { label: "Anthropic docs", url: "https://docs.anthropic.com/" }, project: "A study assistant that answers from your own notes" },
      { id: "auto", stage: "Intermediate", title: "Workflow automation", detail: "Webhooks, schedulers, retries, human-in-the-loop review.", project: "Automate lead capture → reply draft → sheet for a real small business" },
      { id: "deploy", stage: "Advanced", title: "Deploying & monitoring", detail: "Containers, logging, secrets, rate limits, privacy.", resource: { label: "Docker get started", url: "https://docs.docker.com/get-started/" } },
      { id: "eval", stage: "Advanced", title: "Evaluating AI systems", detail: "Test sets, regression checks, failure modes, guardrails.", project: "Write an eval suite for your own project and publish the results" },
    ],
  },
  {
    id: "embedded-iot", name: "Embedded, IoT & Solar Systems", blurb: "Hardware + firmware + dashboards for energy systems.",
    steps: [
      { id: "elec", stage: "Beginner", title: "Electrical basics & safety", detail: "Ohm's law, power, series/parallel, grounding, fusing, safe lab habits.", resource: { label: "All About Circuits", url: "https://www.allaboutcircuits.com/textbook/" } },
      { id: "arduino", stage: "Beginner", title: "Arduino fundamentals", detail: "Digital/analog I/O, serial, ADC, timers.", resource: { label: "Arduino docs", url: "https://docs.arduino.cc/" }, project: "Read a voltage divider on A0 and log it" },
      { id: "sensors", stage: "Beginner", title: "Sensors & signal conditioning", detail: "Current/voltage sensing, scaling, filtering, calibration against a multimeter.", project: "Calibrate a current sensor and document the error" },
      { id: "esp32", stage: "Intermediate", title: "ESP32 & Wi-Fi/MQTT", detail: "Connect to a broker, publish telemetry, handle reconnects.", resource: { label: "Espressif docs", url: "https://docs.espressif.com/" }, project: "Publish panel voltage/current to an MQTT dashboard" },
      { id: "mppt", stage: "Intermediate", title: "MPPT algorithms", detail: "Perturb & observe, incremental conductance; simulate before hardware.", resource: { label: "MathWorks Simulink Onramp", url: "https://www.mathworks.com/learn/tutorials/simulink-onramp.html" }, project: "Simulate P&O MPPT in Simulink and compare to measured data" },
      { id: "power", stage: "Intermediate", title: "Power electronics", detail: "Buck/boost converters, MOSFET switching, thermal limits.", project: "Design and simulate a buck converter" },
      { id: "bms", stage: "Advanced", title: "Battery management & protection", detail: "Charge profiles, cut-offs, balancing, fusing, fault handling.", project: "Document a protection scheme and the fault tests you'd run" },
      { id: "scada", stage: "Advanced", title: "Monitoring, security & reliability", detail: "OTA updates, authentication, watchdogs, data retention.", project: "Add authenticated MQTT + a watchdog to your node" },
    ],
  },
  {
    id: "web-dev", name: "Web & App Development", blurb: "Build and ship real products you can show employers.",
    steps: [
      { id: "html", stage: "Beginner", title: "HTML, CSS & responsive layout", detail: "Semantic HTML, flexbox, grid, accessibility.", resource: { label: "web.dev Learn", url: "https://web.dev/learn" }, project: "A responsive personal portfolio" },
      { id: "js", stage: "Beginner", title: "JavaScript", detail: "DOM, fetch, async/await, modules.", resource: { label: "javascript.info", url: "https://javascript.info/" } },
      { id: "ts", stage: "Intermediate", title: "TypeScript & a UI framework", detail: "Components, state, routing, testing.", resource: { label: "React docs", url: "https://react.dev/learn" }, project: "A habit tracker with local storage" },
      { id: "backend", stage: "Intermediate", title: "Backend & databases", detail: "REST design, SQL, authentication, validation.", project: "A to-do API with user accounts" },
      { id: "ship", stage: "Advanced", title: "Testing, CI & deployment", detail: "Unit/e2e tests, GitHub Actions, monitoring, security basics.", resource: { label: "GitHub Actions docs", url: "https://docs.github.com/actions" } },
    ],
  },
  {
    id: "finance-skills", name: "Finance & Analytics", blurb: "Understand money and data — useful for MONEYVARK and many careers.",
    steps: [
      { id: "sheets", stage: "Beginner", title: "Spreadsheets for money", detail: "Budgeting, formulas, pivot tables, charts.", project: "A personal budget sheet" },
      { id: "fin101", stage: "Beginner", title: "Personal finance fundamentals", detail: "Use the Finance → Learn lessons.", resource: { label: "SEBI Investor Education", url: "https://investor.sebi.gov.in/" } },
      { id: "sql", stage: "Intermediate", title: "SQL & data analysis", detail: "SELECT, JOIN, GROUP BY; clean data; summarise.", resource: { label: "Kaggle: Intro to SQL", url: "https://www.kaggle.com/learn/intro-to-sql" } },
      { id: "stats", stage: "Intermediate", title: "Statistics for investors", detail: "Mean/variance, correlation, distributions, risk metrics.", project: "Compare volatility of two index funds using public NAV data" },
      { id: "viz", stage: "Advanced", title: "Dashboards & storytelling", detail: "Turn analysis into decisions and videos.", project: "Publish a data-backed MONEYVARK video with sources cited" },
    ],
  },
];

export interface Question { q: string; hint: string; topic: string }
export const INTERVIEW: Question[] = [
  { topic: "Technical: Programming", q: "What is the difference between a list and a tuple in Python?", hint: "Mutability, hashability, typical use. Mention that tuples can be dictionary keys." },
  { topic: "Technical: Programming", q: "Explain time complexity of binary search and the precondition for using it.", hint: "O(log n); array must be sorted; mention off-by-one care." },
  { topic: "Technical: Programming", q: "What is a REST API and what makes an endpoint idempotent?", hint: "Resource-oriented HTTP; GET/PUT/DELETE are idempotent, POST usually isn't." },
  { topic: "Technical: DBMS", q: "What are ACID properties?", hint: "Atomicity, Consistency, Isolation, Durability — give a bank-transfer example." },
  { topic: "Technical: DBMS", q: "Difference between INNER JOIN and LEFT JOIN?", hint: "Matching rows only vs all left rows with NULLs for no match." },
  { topic: "Technical: OS & Networks", q: "What is a deadlock and how can it be prevented?", hint: "Four Coffman conditions; break one (e.g. lock ordering)." },
  { topic: "Technical: OS & Networks", q: "What happens when you type a URL in a browser?", hint: "DNS → TCP/TLS → HTTP request → response → render." },
  { topic: "Technical: Embedded/IoT", q: "How does an ADC work and what limits its accuracy?", hint: "Resolution, reference voltage, sampling rate, noise; Arduino Uno 10-bit/5 V → ~4.9 mV step." },
  { topic: "Technical: Embedded/IoT", q: "Why is MQTT popular for IoT and what are QoS levels 0, 1, 2?", hint: "Lightweight pub/sub; at-most-once, at-least-once, exactly-once." },
  { topic: "Technical: Embedded/IoT", q: "Why must grounds be shared between a sensor module and a microcontroller?", hint: "Common reference for voltage measurement; floating grounds give invalid readings." },
  { topic: "Technical: Power & Solar", q: "What is MPPT and why is it needed?", hint: "Panel I–V curve has one maximum-power point that moves with irradiance/temperature; a converter adjusts duty cycle to track it." },
  { topic: "Technical: Power & Solar", q: "Explain Perturb & Observe and its main weakness.", hint: "Step the voltage, compare power; oscillates around the MPP and can be misled by rapid irradiance changes." },
  { topic: "Technical: Power & Solar", q: "Why does a battery need a fuse and a charge controller?", hint: "Short-circuit current is very high; controller prevents over/under-charge and extends life." },
  { topic: "Technical: AI/ML", q: "Explain overfitting and how to reduce it.", hint: "Model memorises training data; use more data, regularisation, cross-validation, simpler models." },
  { topic: "Technical: AI/ML", q: "What is the difference between precision and recall?", hint: "Precision = TP/(TP+FP); recall = TP/(TP+FN); give a spam-filter example." },
  { topic: "HR", q: "Tell me about yourself.", hint: "Present → past → future in 60–90 seconds; end with why this role." },
  { topic: "HR", q: "Describe a project you're proud of and your exact contribution.", hint: "Problem, your role, decisions, measurable result, what you'd improve." },
  { topic: "HR", q: "Tell me about a time something failed. What did you do?", hint: "Own it, explain the diagnosis, the fix and what you changed afterwards." },
  { topic: "HR", q: "Why should we hire you for this internship?", hint: "Match 2–3 JD requirements to concrete evidence from your projects." },
  { topic: "HR", q: "Where do you see yourself in 3 years?", hint: "Skills you'll build and value you'll deliver; stay honest and specific." },
];
export const GD_TOPICS = [
  "Is AI a threat or an opportunity for engineering jobs in India?",
  "Should India prioritise solar over other energy sources?",
  "Social media: a tool for learning or a distraction?",
  "Startups vs jobs: which is the better first step for a graduate?",
  "Is a degree still necessary in the age of online learning?",
  "Digital payments: how safe are UPI and cashless economies?",
];
export const COMMUNICATION_TIPS = [
  "Structure answers: point → reason → example → recap (PREP).",
  "In a GD: speak early with a fact, build on others by name, summarise at the end — don't interrupt.",
  "Pause for 2 seconds before answering a hard question; silence reads as confidence.",
  "Record yourself for 60 seconds weekly; check pace, fillers and eye contact.",
  "Write emails in 3 lines: purpose, ask, deadline. Close with a clear next step.",
];
