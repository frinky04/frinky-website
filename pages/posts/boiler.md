---
title: Boiler
slug: boiler
date: March 18 2026
sortDate: "March 18 2026"
summary: boiler is a small CLI that makes Steam uploads feel less like paperwork.

---

"boiler is a CLI for uploading game builds to Steam via SteamCMD."

That's the summary, I've been fairly unhappy with the Steamworks UX, especially for uploading games, so this is my solution. You can now push builds with a very simple command: `boiler push`

If you are a noob having some trouble with the steam upload process, this tool should help. I still remeber 6 years ago, when I was 15, trying to figure out how to upload my game to Steam was a full days worth of fiddling around. s

I created this mostly to reduce headaches internally for uploading to Steam, but hopefully someone else can find it useful.

To be clear, it's **mostly agentically coded**; I've been utilizing Codex heavily to improve my workflows. I see this as a pretty helpful and use of the technology.

- [Github](https://github.com/frinky04/boiler)
- [npm](https://www.npmjs.com/package/@frinky/boiler)

## Quick Start

```bash
# Run without installing
npx @frinky/boiler --help

# 1) Log in to Steam (handles Steam Guard prompts)
npx @frinky/boiler login

# 2) Create project config (.boiler.json)
npx @frinky/boiler init

# 3) Upload your build
npx @frinky/boiler push
```