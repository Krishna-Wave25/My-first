import type { Feed, Topic } from "../db/types";

type F = [id: string, name: string, url: string, topic: Topic, tier: Feed["tier"], section: Feed["section"]];

/**
 * Default feed list. These are the publishers' public RSS endpoints; publishers change them
 * occasionally, so every feed reports its own health in the app (News → Sources) and any feed
 * can be edited or replaced in-app. None of them require an API key.
 */
const LIST: F[] = [
  // India & policy (official + primary)
  ["pib", "PIB (Govt. of India)", "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", "india", "official", "news"],
  ["rbi", "RBI Press Releases", "https://www.rbi.org.in/pressreleases_rss.xml", "business", "official", "news"],
  ["hindu-nat", "The Hindu — National", "https://www.thehindu.com/news/national/feeder/default.rss", "india", "primary", "news"],
  ["hindu-edit", "The Hindu — Editorial", "https://www.thehindu.com/opinion/editorial/feeder/default.rss", "upsc", "primary", "news"],
  ["ie-explained", "Indian Express — Explained", "https://indianexpress.com/section/explained/feed/", "upsc", "primary", "news"],
  // World
  ["bbc-world", "BBC News — World", "https://feeds.bbci.co.uk/news/world/rss.xml", "world", "primary", "news"],
  // Business
  ["bbc-biz", "BBC News — Business", "https://feeds.bbci.co.uk/news/business/rss.xml", "business", "primary", "news"],
  ["hindu-biz", "The Hindu — Business", "https://www.thehindu.com/business/feeder/default.rss", "business", "primary", "news"],
  ["et-markets", "Economic Times — Markets", "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", "business", "secondary", "news"],
  // Science, environment, sports, entertainment
  ["bbc-sci", "BBC — Science & Environment", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "science", "primary", "news"],
  ["carbon-brief", "Carbon Brief", "https://www.carbonbrief.org/feed/", "environment", "primary", "news"],
  ["cricinfo", "ESPNcricinfo", "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", "sports", "secondary", "news"],
  ["bbc-ent", "BBC — Entertainment & Arts", "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "entertainment", "secondary", "news"],
  // Technology radar
  ["bbc-tech", "BBC News — Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml", "tech", "primary", "tech"],
  ["mit-tr", "MIT Technology Review", "https://www.technologyreview.com/feed/", "ai", "primary", "tech"],
  ["tc-ai", "TechCrunch — AI", "https://techcrunch.com/category/artificial-intelligence/feed/", "ai", "secondary", "tech"],
  ["verge", "The Verge", "https://www.theverge.com/rss/index.xml", "tech", "secondary", "tech"],
  ["ars", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index", "tech", "primary", "tech"],
  ["arxiv-ai", "arXiv cs.AI (preprints)", "https://rss.arxiv.org/rss/cs.AI", "ai", "primary", "tech"],
  ["ieee", "IEEE Spectrum", "https://spectrum.ieee.org/feeds/feed.rss", "tech", "primary", "tech"],
  ["quanta", "Quanta Magazine", "https://www.quantamagazine.org/feed/", "science", "primary", "tech"],
  ["nasa", "NASA News Releases", "https://www.nasa.gov/news-release/feed/", "space", "official", "tech"],
  ["pv-mag", "pv magazine (solar)", "https://www.pv-magazine.com/feed/", "energy", "primary", "tech"],
  ["electrek", "Electrek (EV, solar, batteries)", "https://electrek.co/feed/", "energy", "secondary", "tech"],
  ["thn", "The Hacker News (security)", "https://feeds.feedburner.com/TheHackersNews", "cyber", "secondary", "tech"],
  ["hn", "Hacker News front page", "https://hnrss.org/frontpage", "tech", "secondary", "tech"],
];

export const DEFAULT_FEEDS: Feed[] = LIST.map(([id, name, url, topic, tier, section]) => ({
  id, name, url, topic, tier, section, enabled: true, custom: false,
}));

export const TOPIC_LABEL: Record<Topic, string> = {
  india: "India & Policy", world: "World", tech: "Technology", ai: "AI", business: "Business & Markets",
  upsc: "UPSC", science: "Science", sports: "Sports", environment: "Environment",
  entertainment: "Entertainment", energy: "Energy", cyber: "Cybersecurity", space: "Space",
};
export const TECH_AREAS: { id: string; label: string; match: RegExp }[] = [
  { id: "genai", label: "Generative & agentic AI", match: /\b(generative|llm|gpt|claude|gemini|agent(ic)?s?|chatbot|foundation model|copilot|openai|anthropic|deepmind)\b/i },
  { id: "robotics", label: "Robotics & automation", match: /\b(robot(s|ics)?|humanoid|automation|drone)\b/i },
  { id: "chips", label: "Semiconductors", match: /\b(chip(s|maker)?|semiconductor|nvidia|tsmc|foundry|gpu|fab|intel|amd|arm)\b/i },
  { id: "quantum", label: "Quantum computing", match: /\b(quantum|qubit)s?\b/i },
  { id: "energy", label: "Renewables & storage", match: /\b(solar|photovoltaic|battery|batteries|storage|renewable|wind|grid|inverter|ev)\b/i },
  { id: "iot", label: "IoT & industrial", match: /\b(iot|internet of things|sensor|edge|embedded|plc|scada|industry 4\.0|mqtt)\b/i },
  { id: "cyber", label: "Cybersecurity & cloud", match: /\b(cyber|security|ransomware|breach|vulnerability|cloud|aws|azure|zero[- ]day)\b/i },
  { id: "software", label: "Software & startups", match: /\b(startup|developer|open[- ]source|github|software|api|funding|series [a-c])\b/i },
  { id: "space", label: "Space & science", match: /\b(space|nasa|isro|rocket|satellite|mars|moon|telescope|astronom)\w*/i },
];
