# Personal site

A static personal site + blog. No framework, no bundler, no backend — just HTML, CSS, and vanilla
JavaScript (ES modules). Designed to be pushed straight to GitHub Pages.

## Publishing a new post

1. Create a Markdown file in `/posts`, e.g. `posts/my-new-post.md`.
2. Start it with front matter:

   ```markdown
   ---
   title: My New Post
   date: 2026-08-01
   description: One sentence describing the post.
   tags:
     - physics
     - math
   ---

   Your article content starts here.
   ```

3. Commit and push to `main`.

That's it — **you never edit any HTML file to publish.** A GitHub Action
(`.github/workflows/build-index.yml`) automatically regenerates `posts/index.json`, `rss.xml`, and
`sitemap.xml` whenever a file in `/posts` changes, and commits the update back to the branch. The
blog listing, homepage, RSS feed, and sitemap all pick it up automatically.

If you'd rather not rely on the Action (or want to preview locally before pushing), run the same
script yourself:

```bash
node scripts/generate-index.mjs
```

It has no npm dependencies — it only uses Node's built-in `fs`/`path` modules, so there's nothing
to install.

### Why a manifest file exists at all

Static hosting (GitHub Pages included) has no way for browser JavaScript to ask "what files are in
this folder?" — there's no server to answer that. `posts/index.json` is the one small workaround:
a list of which Markdown files exist and their front matter, so the site can build the blog index,
search, RSS feed, and sitemap without a server. It's the only generated file in the project, and
you never have to touch it by hand.

## Local preview

Any static file server works, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly via `file://` mostly works too, but some browsers block `fetch()` of
local files under `file://`, which breaks the blog listing/search/article rendering — a real local
server avoids that.)

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. Save. Your site will be live at `https://your-username.github.io/your-repo/` within a minute or two.

## Before you launch, update these

| What | Where |
|---|---|
| Your name / bio / links | `index.html`, `about.html`, `404.html`, nav in every page |
| Site URL, title, description | Top of `scripts/generate-index.mjs` (`SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`) |
| `robots.txt` sitemap URL | `robots.txt` |
| Favicon | `assets/img/favicon.svg` |
| Social preview image | `assets/img/og-cover.png` (1200×630 recommended) |
| Example posts | Delete or edit `posts/first-post.md` / `posts/second-post.md`, then regenerate the manifest |

After editing the site URL in `generate-index.mjs`, re-run the script (or push a post change to let
the Action do it) so `rss.xml` and `sitemap.xml` use the right domain.

## How the pieces fit together

```
index.html      → homepage, shows the 3 most recent posts (assets/js/home.js)
blog.html       → full post list + client-side search (assets/js/blog.js)
post.html       → renders whichever post ?slug= points to (assets/js/post.js)
about.html      → static content, edit directly
404.html        → GitHub Pages serves this for any unmatched URL

assets/js/markdown.js  → the Markdown → HTML converter (front matter, headings/TOC,
                          lists, blockquotes, code fences, links/images, footnotes;
                          leaves $..$ / $$..$$ math untouched for KaTeX)
assets/js/theme.js      → dark/light toggle (persisted in localStorage)
assets/js/nav.js        → mobile menu, active nav link, reading-progress bar, scroll reveal

posts/*.md          → your articles
posts/index.json    → auto-generated manifest (do not hand-edit; see above)
scripts/generate-index.mjs → the generator (also writes rss.xml / sitemap.xml)
```

## Known limitations (by design, given the "no backend, no build step" constraint)

- **Article URLs use a query string** (`post.html?slug=my-post`) rather than a real path per post
  (`/my-post/`). Generating a real static HTML file per post would need a build step; a shared
  template read at runtime is the zero-build trade-off.
- **Per-article Open Graph tags are set by JavaScript after load.** This means link previews on
  platforms that don't execute JavaScript (some chat apps, older crawlers) will show the site's
  generic title/description rather than the specific article's. Search engines (Google, Bing) do
  execute JavaScript when indexing, so organic search SEO for individual posts still works.
- **Search covers title, description, tags, and full body text**, built lazily in the browser from
  the Markdown files. It's plenty fast for a personal blog's post count; it isn't a server-side
  search index.

## License

Do whatever you'd like with this.
