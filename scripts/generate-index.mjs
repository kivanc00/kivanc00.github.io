#!/usr/bin/env node
// generate-index.mjs
//
// Scans /posts for Markdown files, parses their front matter, and writes:
//   - posts/index.json  (the manifest the site fetches at runtime)
//   - rss.xml           (feed for RSS readers)
//   - sitemap.xml        (for search engines)
//
// This script has ZERO npm dependencies — only Node's built-in `fs`/`path` —
// so there is nothing to `npm install`. It is NOT required for the site to
// work; it's a convenience so you never have to hand-edit the manifest,
// RSS feed, or sitemap yourself. Run it two ways:
//
//   1. Manually, before you commit:      node scripts/generate-index.mjs
//   2. Automatically via GitHub Actions: see .github/workflows/build-index.yml
//
// ---- Configure these for your own site ------------------------------------
const SITE_URL = "https://your-username.github.io/your-repo"; // no trailing slash
const SITE_TITLE = "Your Name";
const SITE_DESCRIPTION = "Personal site and blog.";
// -----------------------------------------------------------------------------

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");

/** Minimal front-matter parser, mirroring assets/js/markdown.js's logic. */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {}, content: raw };
  const data = {};
  let currentListKey = null;
  for (const line of match[1].split("\n")) {
    if (/^\s*-\s+/.test(line) && currentListKey) {
      data[currentListKey].push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      const value = kv[2].trim();
      if (value === "") {
        data[key] = [];
        currentListKey = key;
      } else {
        data[key] = value.replace(/^["']|["']$/g, "");
        currentListKey = null;
      }
    }
  }
  return { data, content: raw.slice(match[0].length) };
}

function wordCount(text) {
  return (text.match(/\S+/g) || []).length;
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "");
}

function escapeXml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function main() {
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files.map((file) => {
    const raw = readFileSync(join(POSTS_DIR, file), "utf8");
    const { data, content } = parseFrontMatter(raw);
    if (!data.title || !data.date) {
      console.warn(`⚠️  ${file} is missing "title" or "date" in its front matter — skipping.`);
      return null;
    }
    return {
      slug: slugFromFilename(file),
      file,
      title: data.title,
      date: data.date,
      description: data.description || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      readingTime: Math.max(1, Math.round(wordCount(content) / 200)),
    };
  }).filter(Boolean);

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 1. Manifest --------------------------------------------------------------
  writeFileSync(join(POSTS_DIR, "index.json"), JSON.stringify(posts, null, 2) + "\n");
  console.log(`✔ posts/index.json written (${posts.length} posts)`);

  // 2. RSS feed ---------------------------------------------------------------
  const rssItems = posts
    .map(
      (p) => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${SITE_URL}/post.html?slug=${p.slug}</link>
    <guid>${SITE_URL}/post.html?slug=${p.slug}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${escapeXml(p.description)}</description>
  </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(SITE_TITLE)}</title>
  <link>${SITE_URL}</link>
  <description>${escapeXml(SITE_DESCRIPTION)}</description>
${rssItems}
</channel>
</rss>
`;
  writeFileSync(join(ROOT, "rss.xml"), rss);
  console.log("✔ rss.xml written");

  // 3. Sitemap ------------------------------------------------------------------
  const staticUrls = ["", "/blog.html", "/about.html"];
  const postUrls = posts.map((p) => `/post.html?slug=${p.slug}`);
  const urls = [...staticUrls, ...postUrls]
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  writeFileSync(join(ROOT, "sitemap.xml"), sitemap);
  console.log("✔ sitemap.xml written");
}

main();
