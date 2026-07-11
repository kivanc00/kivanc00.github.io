// blog.js — powers blog.html. Fetches posts/index.json, renders the listing,
// and builds a lazy full-text search index over title/description/tags/body.

import { parseFrontMatter } from "./markdown.js";

const listEl = document.getElementById("post-list");
const searchInput = document.getElementById("search-input");
const searchCount = document.getElementById("search-count");

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function cardHtml(post) {
  const tags = post.tags.map((t) => `<span class="tag">${t}</span>`).join(" ");
  return `
    <a class="post-card reveal" href="post.html?slug=${encodeURIComponent(post.slug)}">
      <div class="meta-row">
        <span>${formatDate(post.date)}</span>
        <span>·</span>
        <span>${post.readingTime} min read</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.description}</p>
      ${tags ? `<div class="meta-row" style="margin-top:10px">${tags}</div>` : ""}
    </a>`;
}

function render(posts) {
  if (!posts.length) {
    listEl.innerHTML = `<div class="empty-state"><h3>No posts found</h3><p>Try a different search term.</p></div>`;
    return;
  }
  listEl.innerHTML = posts.map(cardHtml).join("");
  // Re-trigger reveal animation for newly injected cards
  requestAnimationFrame(() => {
    listEl.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  });
}

async function init() {
  let manifest = [];
  try {
    const res = await fetch("posts/index.json", { cache: "no-cache" });
    manifest = await res.json();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><h3>Couldn't load posts</h3><p>Check that posts/index.json exists and is valid JSON.</p></div>`;
    return;
  }

  manifest.sort((a, b) => new Date(b.date) - new Date(a.date));
  render(manifest);
  if (searchCount) searchCount.textContent = `${manifest.length} article${manifest.length === 1 ? "" : "s"}`;

  if (!searchInput) return;

  // Build a full-text search index in the background (fetch each post body).
  // For a personal blog the post count is small, so fetching everything
  // up front is cheap and keeps search instant once it's ready.
  const searchIndex = manifest.map((p) => ({ ...p, body: "" }));
  Promise.all(
    searchIndex.map(async (entry) => {
      try {
        const res = await fetch(`posts/${entry.file}`, { cache: "no-cache" });
        const raw = await res.text();
        entry.body = parseFrontMatter(raw).content.toLowerCase();
      } catch { /* ignore individual fetch failures */ }
    })
  );

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      render(manifest);
      searchCount.textContent = `${manifest.length} article${manifest.length === 1 ? "" : "s"}`;
      return;
    }
    const results = searchIndex.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.body.includes(q)
    );
    render(results);
    searchCount.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
  });
}

init();
