---
title: Değiş 
date: 2026-07-11
description: A short note on why this blog exists and how the publishing workflow works.
tags:
  - meta
  - writing
---

Welcome. This is the first post on this site, and it doubles as a demonstration of everything the
publishing pipeline supports — so future-me has something to copy from.

## Why a plain Markdown blog

I wanted a place to write that didn't fight me. No build step, no database, no CMS login screen —
just a Markdown file and a `git push`. If you're reading this on GitHub Pages, that's the entire
infrastructure: static files, served as-is.

The site is intentionally simple:

- Write a `.md` file in `/posts`
- Add front matter (title, date, description, tags)
- Commit and push

That's it. No HTML to touch, ever.

## What the renderer supports

Inline formatting like **bold text**, *italics*, and `inline code` all work as expected, along with
[links to other places](https://github.com) and footnotes like this one.[^1]

> Good writing is clear thinking made visible. A blockquote should feel like someone leaning in to
> make a point.

### Code blocks with syntax highlighting

```js
function greet(name) {
  return `Hello, ${name}!`;
}
console.log(greet("world"));
```

### Math, courtesy of KaTeX

Inline math like $E = mc^2$ renders next to text, and block equations get their own line:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

### Images

![A placeholder illustrating where an image would go](https://placehold.co/800x400/131316/9a9ca3?text=Post+Image)

## Wrapping up

Every post gets an automatic table of contents, reading-time estimate, and previous/next links —
all generated from this one Markdown file. Nice and boring, in the best way.

[^1]: Footnotes render at the bottom of the article with a back-link to where you were reading.
