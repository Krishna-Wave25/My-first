// Recorded-shape fixtures (RSS 2.0, Atom, RDF). Dates are relative to NOW in the tests.
export const rss = (items: { title: string; link: string; date: string; desc?: string }[]) => `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>T</title>
${items.map((i) => `<item><title><![CDATA[${i.title}]]></title><link>${i.link}</link><pubDate>${i.date}</pubDate><description><![CDATA[<p>${i.desc ?? ""}</p>]]></description></item>`).join("\n")}
</channel></rss>`;

export const atom = (date: string) => `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
<entry><title>Atom story about solar storage</title><link rel="alternate" href="https://example.org/atom-1"/><updated>${date}</updated><summary>Utility-scale batteries &amp; grids.</summary></entry>
</feed>`;

export const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<item><title>RDF item</title><link>https://example.org/rdf-1</link><dc:date>2025-10-08T05:00:00Z</dc:date><description>d</description></item></rdf:RDF>`;

export const html = `<!doctype html><html><body><h1>Please enable JS</h1></body></html>`;
