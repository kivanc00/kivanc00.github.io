// home.js — powers the "Recent writing" section on index.html.

const listEl = document.getElementById("recent-posts");

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function cardHtml(post) {
  return `
    <a class="post-card reveal" href="post.html?slug=${encodeURIComponent(post.slug)}">
      <div class="meta-row">
        <span>${formatDate(post.date)}</span><span>·</span><span>${post.readingTime} min read</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.description}</p>
    </a>`;
}

async function init() {
  if (!listEl) return;
  try {
    const res = await fetch("posts/index.json", { cache: "no-cache" });
    const manifest = await res.json();
    manifest.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = manifest.slice(0, 3);
    listEl.innerHTML = recent.length
      ? recent.map(cardHtml).join("")
      : `<div class="empty-state"><h3>No posts yet</h3><p>Add a Markdown file to <code>/posts</code> to get started.</p></div>`;
    requestAnimationFrame(() => listEl.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")));
  } catch {
    listEl.innerHTML = `<div class="empty-state"><h3>Couldn't load posts</h3></div>`;
  }
}

init();
