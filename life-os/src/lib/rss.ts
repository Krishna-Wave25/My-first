export interface RawItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
}

/** Stable short hash (cyrb53) used for article ids. */
export function hashId(s: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function textOf(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}
const child = (el: Element, ...names: string[]) => {
  for (const n of names) {
    for (const c of Array.from(el.children)) if (c.tagName.toLowerCase() === n.toLowerCase() || c.localName.toLowerCase() === n.toLowerCase()) return c;
  }
  return null;
};
function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const x = new URL(u.trim());
    return x.protocol === "http:" || x.protocol === "https:" ? x.toString() : null;
  } catch {
    return null;
  }
}
function toIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s.trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Parse RSS 2.0, RSS 1.0 (RDF) and Atom. Throws if the document is not a feed. */
export function parseFeed(xml: string): RawItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Not valid XML (the site may have returned a web page instead of a feed)");
  const root = doc.documentElement.localName.toLowerCase();
  if (!["rss", "feed", "rdf"].includes(root)) throw new Error("Not an RSS/Atom feed");
  const entries = Array.from(doc.getElementsByTagName(root === "feed" ? "entry" : "item"));
  const out: RawItem[] = [];
  for (const e of entries) {
    const title = textOf(child(e, "title")?.textContent ?? "");
    let link: string | null = null;
    if (root === "feed") {
      const links = Array.from(e.children).filter((c) => c.localName === "link");
      const alt = links.find((l) => !l.getAttribute("rel") || l.getAttribute("rel") === "alternate") ?? links[0];
      link = safeUrl(alt?.getAttribute("href"));
    } else {
      link = safeUrl(child(e, "link")?.textContent) ?? safeUrl(child(e, "guid")?.textContent);
    }
    if (!title || !link) continue;
    const date = toIso(child(e, "pubDate", "published", "updated", "date")?.textContent);
    const body = child(e, "description", "summary", "encoded", "content")?.textContent ?? "";
    out.push({ title, url: link, publishedAt: date, summary: textOf(body).slice(0, 500) });
  }
  return out;
}
