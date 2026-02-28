# Clawdroid phone agent

An AI agent that controls an Android device over ADB: give it a goal in plain English, it perceives the screen, reasons with an LLM, and acts (tap, type, swipe) until the task is done.

Part of the [Clawdroid](https://github.com/clawdroidltd/clawdroid-main) project.

## How it works

**Perception → reasoning → action** loop:

1. **Perceive** — dump accessibility tree via ADB, parse UI elements (or screenshot when tree is empty).
2. **Reason** — send screen state + goal + history to an LLM; get back `{ think, plan, action }`.
3. **Act** — run the action via ADB (tap, type, swipe, launch app, etc.), then loop.

## Requirements

- [Bun](https://bun.sh) (runtime)
- [ADB](https://developer.android.com/tools/adb) (Android Debug Bridge)
- Android device with USB debugging enabled
- LLM API key (Groq, OpenAI, OpenRouter, Bedrock) or [Ollama](https://ollama.com) for local

## Setup

```bash
cd agent
bun install
cp .env.example .env
# Edit .env: set LLM_PROVIDER and API key (e.g. GROQ_API_KEY)
```

## Run

```bash
bun run src/kernel.ts
# Enter your goal when prompted
```

Workflows (multi-step, multi-app):

```bash
bun run src/kernel.ts --workflow examples/workflows/research/weather-to-whatsapp.json
```

Flows (deterministic YAML, no LLM):

```bash
bun run src/kernel.ts --flow examples/flows/send-whatsapp.yaml
```

## Config

See `.env.example`. Main options: `LLM_PROVIDER`, `MAX_STEPS`, `STEP_DELAY`, `VISION_MODE`, `STUCK_THRESHOLD`.

## License

MIT. This agent module uses the same perception–reasoning–action architecture as the open-source project [unitedbyai/droidclaw](https://github.com/unitedbyai/droidclaw) (MIT); we thank their team for the reference implementation.
