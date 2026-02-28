# Clawdroid design decisions

## Offline-first and on-device

Clawdroid is built so the **app** can run the agent fully on-device with no mandatory cloud. The **desktop agent** in this repo can use local LLMs (e.g. Ollama) or remote APIs (Groq, OpenAI, Bedrock, OpenRouter). We keep a single code path and config so users can choose local-only or hybrid.

## Rebrand and “Made with Cursor” removal

The included APK may carry “Nocracy” and “Made with Cursor” branding. We provide a rebrand script (`scripts/rebrand-apk.sh`) that uses apktool to strip or replace those strings and produce a clean Clawdroid build. Re-signing is the user’s responsibility after unpack/repack.

## Agent: one loop, multiple backends

The phone agent uses one perception–reasoning–action loop regardless of LLM provider. Vision (screenshot) is used when the accessibility tree is empty (e.g. custom UI or WebView) or when configured for “always”. Stuck detection and step limits avoid infinite loops.

## Shared agent-scripts

We ship [steipete/agent-scripts](https://github.com/steipete/agent-scripts) as a subtree so Cursor users get guardrails and slash-command docs without maintaining a fork. Clawdroid-specific behavior lives in `agent/` and `docs/`, not inside agent-scripts.

## Logging and session identity

Session logs use a Clawdroid prefix and are written incrementally (partial files per step) so a crash still leaves a usable log. No PII is stored by default; logs are for debugging and improving the agent.
