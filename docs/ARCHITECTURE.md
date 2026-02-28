# Clawdroid architecture

This document describes how the main pieces of the Clawdroid repository fit together.

## Overview

- **APK** — The Clawdroid Android app (installable package). Can be rebranded and re-signed via `scripts/rebrand-apk.sh`.
- **Agent** — A desktop-side “phone agent” that controls an Android device over ADB and uses an LLM for perception–reasoning–action. Run with Bun from `agent/`.
- **Agent-scripts** — Shared guardrails, slash-command docs, and skills (from [steipete/agent-scripts](https://github.com/steipete/agent-scripts)); used by Cursor and compatible tooling.
- **Vox** — Twilio ↔ OpenAI Realtime bridge for voice; optional integration for future Clawdroid voice features.

## Agent ↔ device flow

1. **Perception**: ADB pulls the accessibility tree (XML) and optionally a screenshot; `agent` parses and filters to a compact UI context.
2. **Reasoning**: The LLM receives goal, context, and optional image, then returns a structured action (tap, type, swipe, etc.).
3. **Action**: The agent runs ADB input commands (tap coordinates, key events, swipes) and observes the result.
4. **Loop**: Steps repeat until the goal is satisfied, max steps are reached, or a stuck state is detected.

Session logs (with Clawdroid prefix) are written under `logs/` for debugging and analytics.

## Runtime defaults

The agent uses a small Clawdroid runtime layer (`agent/src/clawdroid-runtime.ts`) for product identity and default resolution/gesture settings. Constants and config are centralized so rebranding and device targeting stay consistent.

## Docs and scripts

- `docs/` — Project-specific documentation (this file, design decisions).
- `scripts/` — APK unpack/rebrand and other helpers; `agent-scripts/` remains the upstream scripts/skills tree.
