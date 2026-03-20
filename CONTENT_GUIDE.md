# Content Guide

This guide explains how to write and update site content in Markdown.

## Overview

Content lives in `/pages` and is compiled at build time by `scripts/generate-content.mjs`.

Current content types:
- `pages/home.md`
- `pages/about.md`
- `pages/experience/*.md`
- `pages/posts/*.md`
- `pages/games/*.md`

Generated output is written to `src/generated/content.generated.js` (ignored in git).

## Commands

Run content generation checks:

```bash
npm run content:generate
```

Run full production build:

```bash
npm run build
```

During development, `npm run dev` auto-regenerates content when Markdown files change.

## General Rules

- Frontmatter is strict. Unknown keys are rejected.
- `slug` values (where used) must match: `^[a-z0-9-]+$`
- Use quotes around `sortDate` values (for example: `"2026-03-16"`).
- Dates support multiple formats (for example: `2026-03-16`, `2026/3/16`, `16 Mar 2026`, `March 16, 2026`, `16/3/2026`).
- Local images should be referenced as `images/...` or `/images/...`.
- External links must be full URLs (`https://...`).

## Home Page (`pages/home.md`)

### Allowed frontmatter
- `title` (optional string)
- `summary` (optional string)

### Example

```md
---
title: Home
summary: Frinky's portfolio of games, updates, and development posts.
---

Welcome text in Markdown.
```

Notes:
- Body content renders the homepage intro block.
- `summary` is reused as site description defaults.

## About Page (`pages/about.md`)

### Allowed frontmatter
- `name` (required string)
- `birthDate` (optional string)
- `image` (optional string)
- `imageAlt` (optional string)

### Example

```md
---
name: Finn Rawlings (Frinky)
birthDate: 24 Sep 2004
image: images/frog.png
imageAlt: Frog illustration for Finn Rawlings
---

I'm from Australia.

I like making games and music.
```

Notes:
- Body content renders the about text block.
- `birthDate` powers the age display line.

## Experience Entries (`pages/experience/*.md`)

One Markdown file per experience item.

### Allowed frontmatter
- `title` (required string)
- `date` (required string)
- `meta` (optional string)
- `order` (optional integer)

### Example

```md
---
title: Full-time Remote Programmer & Gameplay Designer
date: 2022 - 2025
meta: Transience @ RESURGENT
order: 1
---
```

Sorting:
1. `order` ascending (if present)
2. alphabetical by `title`

## Posts (`pages/posts/*.md`)

One Markdown file per post.

### Allowed frontmatter
- `title` (required string)
- `slug` (required string)
- `date` (required string, display value)
- `sortDate` (optional string)
- `summary` (optional string)
- `pinned` (optional boolean)
- `featured` (optional boolean)
- `order` (optional integer)
- `image` (optional string)
- `downloadUrl` (optional URL string)

### Example

```md
---
title: My Update
slug: my-update
date: 16 Mar 2026
sortDate: "2026-03-16"
summary: Short list summary.
pinned: false
featured: false
order:
image:
downloadUrl:
---

Post body in Markdown.
```

Route:
- `/posts/<slug>/`

## Games (`pages/games/*.md`)

One Markdown file per game.

### Allowed frontmatter
- `title` (required string)
- `slug` (required string)
- `date` (required string, display value)
- `image` (required string)
- `sortDate` (optional string)
- `summary` (optional string)
- `pinned` (optional boolean)
- `featured` (optional boolean)
- `order` (optional integer)
- `downloadUrl` (optional URL string)

### Example

```md
---
title: New Game
slug: new-game
date: Coming Soon
sortDate: "2026-12-01"
image: images/new-game.webp
summary: Quick game summary.
featured: false
pinned: false
order:
downloadUrl: https://example.com/game
---

Game description in Markdown.
```

Route:
- `/games/<slug>/`

## Sorting Rules (Posts/Games)

Applied in this order:
1. `pinned: true` first
2. `order` ascending (if present)
3. `sortDate` descending (fallback to `date` parse)
4. `title` alphabetical

Featured game selection:
- first game with `featured: true` after sorting
- otherwise first game in sorted list

## Markdown Support

Supported (sanitized):
- headings
- paragraphs
- lists
- links
- images
- bold/italic
- code/pre
- blockquotes
- tables

Generated links/images are normalized and sanitized.

### Embeds (Posts/Games Only)

Embeds are enabled for:
- `pages/posts/*.md`
- `pages/games/*.md`

Embeds are not enabled for:
- `home`
- `about`
- `experience`

Use raw HTML iframe/video tags in post/game bodies.

Example iframe (YouTube):

```html
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="YouTube video player"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen
></iframe>
```

Example local video:

```html
<video controls preload="metadata" poster="/images/preview.webp">
  <source src="/videos/demo.mp4" type="video/mp4" />
</video>
```

Allowed iframe hosts:
- `youtube.com`
- `youtube-nocookie.com`
- `player.vimeo.com`
- `itch.io`
- `store.steampowered.com`

## Media Files

Place assets in:
- `/images`
- `/svgs`

Build step syncs these folders into `/public` automatically.

## SEO/Feed Output

Generated on content build:
- `public/sitemap.xml`
- `public/rss.xml`
- `public/robots.txt`

Base URL source:
- `RAILWAY_PUBLIC_DOMAIN` (preferred)
- fallback: `https://frinky.org`

## Common Errors

- `Invalid frontmatter ...`: unknown key or wrong type.
- `Duplicate slug ...`: same slug used twice in a collection.
- Missing required fields (for example game `image`).

Fix, then rerun:

```bash
npm run content:generate
```
