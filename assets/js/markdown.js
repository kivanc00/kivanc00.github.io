// markdown.js — a small, dependency-free Markdown → HTML converter written
// for this blog's needs. It is not a full CommonMark implementation, but it
// covers everything the writing workflow needs: front matter, headings (with
// auto-generated ids for the table of contents), paragraphs, bold/italic,
// inline code, fenced code blocks, blockquotes, ordered/unordered lists,
// links, images, horizontal rules, and footnotes. LaTeX math ($...$ and
// $$...$$) is protected from the parser and left as-is so KaTeX's
// auto-render extension can typeset it after the HTML is inserted.

/** Turn a heading string into a URL-safe id, used for TOC anchors. */
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Parse the `---` delimited YAML-ish front matter at the top of a post. */
export function parseFrontMatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  const lines = match[1].split("\n");
  let currentListKey = null;

  for (const line of lines) {
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

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Protects a region of text from further inline processing by swapping it
 * for a placeholder token, to be restored verbatim at the very end. Used for
 * fenced code, inline code, and math spans so markdown syntax inside them
 * (asterisks, underscores, brackets…) is never touched.
 */
function makeVault() {
  const store = [];
  return {
    stash(html) {
      const token = `\u0000VAULT${store.length}\u0000`;
      store.push(html);
      return token;
    },
    restore(text) {
      return text.replace(/\u0000VAULT(\d+)\u0000/g, (_, i) => store[Number(i)]);
    },
  };
}

/** Inline-level formatting: images, links, bold, italic, inline code, footnote refs. */
function renderInline(text, vault) {
  // Inline code first, so its contents are never touched by anything below.
  text = text.replace(/`([^`]+?)`/g, (_, code) =>
    vault.stash(`<code>${escapeHtml(code)}</code>`)
  );

  // Images: ![alt](src "optional title")
  text = text.replace(
    /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, src, title) =>
      vault.stash(
        `<img src="${src}" alt="${escapeHtml(alt)}"${
          title ? ` title="${escapeHtml(title)}"` : ""
        } loading="lazy">`
      )
  );

  // Links: [text](href)
  text = text.replace(/\[([^\]]+)\]\((?!\^)([^\s)]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const external = /^https?:\/\//.test(href);
    return vault.stash(
      `<a href="${href}"${title ? ` title="${escapeHtml(title)}"` : ""}${
        external ? ' target="_blank" rel="noopener noreferrer"' : ""
      }>${label}</a>`
    );
  });

  // Footnote references: [^id]
  text = text.replace(/\[\^([\w-]+)\]/g, (_, id) =>
    vault.stash(
      `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${id}">${id}</a></sup>`
    )
  );

  // Bold then italic (order matters so **/__ don't get eaten by single */_ rules)
  text = text.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`);
  text = text.replace(/\*([^*]+)\*|(?<![\w])_([^_]+)_(?![\w])/g, (_, a, b) => `<em>${a || b}</em>`);

  return text;
}

/**
 * Full block-level Markdown parser. Returns rendered HTML, a table of
 * contents array, and a word count (for reading-time estimation).
 */
export function renderMarkdown(md) {
  const vault = makeVault();
  const toc = [];
  const footnotes = {}; // id -> rendered html of the definition

  // --- Protect math spans first ($$...$$ block, then $...$ inline) ---------
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => vault.stash(`$$${expr}$$`));
  md = md.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (_, expr) => vault.stash(`$${expr}$`));

  // --- Protect fenced code blocks -------------------------------------------
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const cls = lang ? ` class="language-${lang}"` : "";
    const escaped = escapeHtml(code.replace(/\n$/, ""));
    return vault.stash(
      `<pre><button class="code-copy-btn" type="button">Copy</button><code${cls}>${escaped}</code></pre>`
    );
  });

  // --- Extract footnote definitions: [^id]: text (may be anywhere, usually bottom) ---
  md = md.replace(/^\[\^([\w-]+)\]:\s?(.+)$/gm, (_, id, text) => {
    footnotes[id] = renderInline(escapeHtml(text), vault);
    return "";
  });

  const lines = md.split("\n");
  const htmlParts = [];
  let i = 0;
  let wordCount = 0;

  const countWords = (line) => {
    wordCount += (line.match(/\S+/g) || []).length;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      htmlParts.push("<hr>");
      i++; continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      if (level === 2 || level === 3) toc.push({ level, text, id });
      countWords(text);
      htmlParts.push(`<h${level} id="${id}">${renderInline(escapeHtml(text), vault)}</h${level}>`);
      i++; continue;
    }

    // Blockquote (consume consecutive '>' lines)
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      // Blank lines inside the quote start a new paragraph; wrapped lines
      // without a blank line between them are joined into one paragraph.
      const paras = buf.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
      countWords(paras.join(" "));
      htmlParts.push(
        `<blockquote>${paras.map((p) => `<p>${renderInline(escapeHtml(p), vault)}</p>`).join("")}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const t = lines[i].replace(/^[-*+]\s+/, "");
        countWords(t);
        items.push(`<li>${renderInline(escapeHtml(t), vault)}</li>`);
        i++;
      }
      htmlParts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const t = lines[i].replace(/^\d+\.\s+/, "");
        countWords(t);
        items.push(`<li>${renderInline(escapeHtml(t), vault)}</li>`);
        i++;
      }
      htmlParts.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // A restored code-block/math placeholder sitting on its own line
    if (/^\u0000VAULT\d+\u0000$/.test(line.trim())) {
      htmlParts.push(line.trim());
      i++; continue;
    }

    // Paragraph (consume until blank line)
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6})\s/.test(lines[i]) &&
           !/^[-*+]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) && !/^>\s?/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    const para = buf.join(" ");
    countWords(para);
    htmlParts.push(`<p>${renderInline(escapeHtml(para), vault)}</p>`);
  }

  // --- Footnotes section ----------------------------------------------------
  const footnoteIds = Object.keys(footnotes);
  if (footnoteIds.length) {
    const items = footnoteIds
      .map(
        (id) =>
          `<li id="fn-${id}">${footnotes[id]} <a href="#fnref-${id}" class="footnote-backref">↩</a></li>`
      )
      .join("");
    htmlParts.push(`<div class="footnotes"><ol>${items}</ol></div>`);
  }

  let html = htmlParts.join("\n");
  html = vault.restore(html);

  const readingTime = Math.max(1, Math.round(wordCount / 200));
  return { html, toc, readingTime, wordCount };
}
