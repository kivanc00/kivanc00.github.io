---
title: A Note on Simplicity
date: 2026-07-05
description: Thinking through why fewer moving parts usually wins for a personal site.
tags:
  - meta
  - design
---

Every extra dependency is something that can break, go unmaintained, or need an upgrade you didn't
ask for. For a personal site meant to last years, that adds up.

## The rule I keep coming back to

If a static file can do the job, use a static file. This site has exactly three moving parts:

1. Markdown files you write
2. A small manifest listing them (`posts/index.json`)
3. Plain JavaScript that reads both and renders the page

No framework, no bundler, no server.

## The one manual step

There's a trade-off worth being upfront about: something has to tell the browser which Markdown
files exist, since static hosting can't list a folder's contents on its own. This project handles
it with a small `posts/index.json` manifest that a script regenerates automatically — see the
README for the two ways to run it.

That's the only indirection in the whole system, and it's one line per post.
