// post.js — powers post.html. Reads ?slug= from the URL, fetches the
// matching Markdown file (and the manifest, for prev/next + metadata),
// renders it, and wires up the table of contents, code-copy buttons,
// syntax highlighting, and math typesetting.

import { parseFrontMatter, renderMarkdown } from "./markdown.js";

const params = new URLSearchParams(location.search);
const slug = params.get("slug");

const els = {
  title: document.getElementById("post-title"),
  meta: document.getElementById("post-meta"),
  desc: document.getElementById("post-desc"),
  tags: document.getElementById("post-tags"),
  content: document.getElementById("post-content"),
  toc: document.getElementById("toc"),
  tocCol: document.getElementById("toc-col"),
  postNav: document.getElementById("post-nav"),
};

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function renderToc(toc) {
  if (!toc.length) { els.tocCol.style.display = "none"; return; }
  els.toc.innerHTML = toc
    .map((h) => `<li><a href="#${h.id}" class="level-${h.level}">${h.text}</a></li>`)
    .join("");
}

function renderTags(tags) {
  els.tags.innerHTML = tags.map((t) => `<span class="tag">${t}</span>`).join(" ");
}

function renderPostNav(manifest, currentSlug) {
  const sorted = [...manifest].sort((a, b) => new Date(b.date) - new Date(a.date));
  const idx = sorted.findIndex((p) => p.slug === currentSlug);
  const prev = sorted[idx + 1]; // older
  const next = sorted[idx - 1]; // newer
  let html = "";
  if (next) html += `<a href="post.html?slug=${next.slug}"><div class="dir">Next</div><div class="title">${next.title}</div></a>`;
  else html += `<span></span>`;
  if (prev) html += `<a class="next" href="post.html?slug=${prev.slug}"><div class="dir">Previous</div><div class="title">${prev.title}</div></a>`;
  els.postNav.innerHTML = html;
}

function wireCodeCopyButtons() {
  els.content.querySelectorAll(".code-copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.nextElementSibling?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = "Copied";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1500);
      } catch { /* clipboard API unavailable — silently ignore */ }
    });
  });
}

function updateSeo({ title, description }) {
  document.title = `${title} · Blog`;
  const setMeta = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
}

async function init() {
  if (!slug) {
    els.content.innerHTML = `<div class="empty-state"><h3>No article specified</h3><p>Go back to the <a href="blog.html">blog index</a>.</p></div>`;
    return;
  }

  const manifestRes = await fetch("posts/index.json", { cache: "no-cache" });
  const manifest = await manifestRes.json();
  const entry = manifest.find((p) => p.slug === slug);

  if (!entry) {
    els.content.innerHTML = `<div class="empty-state"><h3>Article not found</h3><p>It may have moved. Back to the <a href="blog.html">blog index</a>.</p></div>`;
    return;
  }

  const mdRes = await fetch(`posts/${entry.file}`, { cache: "no-cache" });
  const raw = await mdRes.text();
  const { data, content } = parseFrontMatter(raw);
  const { html, toc, readingTime } = renderMarkdown(content);

  els.title.textContent = data.title || entry.title;
  els.desc.textContent = data.description || entry.description;
  els.meta.innerHTML = `<span>${formatDate(data.date || entry.date)}</span><span>·</span><span>${readingTime} min read</span>`;
  renderTags(Array.isArray(data.tags) ? data.tags : entry.tags);
  els.content.innerHTML = html;
  renderToc(toc);
  renderPostNav(manifest, slug);
  updateSeo({ title: data.title || entry.title, description: data.description || entry.description });

  wireCodeCopyButtons();

  // Syntax highlighting (highlight.js, loaded via CDN in post.html)
  if (window.hljs) els.content.querySelectorAll("pre code").forEach((b) => window.hljs.highlightElement(b));

  // Math typesetting (KaTeX auto-render, loaded via CDN in post.html)
  if (window.renderMathInElement) {
    window.renderMathInElement(els.content, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }

  // Highlight the active TOC entry as the reader scrolls
  const headings = [...els.content.querySelectorAll("h2, h3")];
  const tocLinks = [...els.toc.querySelectorAll("a")];
  if (headings.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const link = tocLinks.find((a) => a.getAttribute("href") === `#${e.target.id}`);
          if (link) link.classList.toggle("active", e.isIntersecting);
        });
      },
      { rootMargin: "-90px 0px -70% 0px" }
    );
    headings.forEach((h) => io.observe(h));
  }
}

init();
