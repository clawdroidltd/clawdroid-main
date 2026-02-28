# Clawdroid roadmap

High-level direction for the Clawdroid project. Dates are indicative.

## Short term

- **Stable rebrand pipeline**: Document and automate re-signing after `rebrand-apk.sh` so teams can ship Clawdroid builds without manual steps.
- **Agent defaults**: Tune Clawdroid runtime defaults (resolution, gesture duration, log prefix) based on real device usage.
- **Session log tooling**: Provide a small script or command to summarize session logs (success rate, step count, failure modes) for debugging and metrics.

## Medium term

- **Vox integration**: Optional voice channel for Clawdroid using the Twilio–OpenAI bridge in `vox/` (e.g. “call my agent”).
- **Multi-device**: Support multiple connected devices (e.g. by serial) and allow specifying which device the agent controls.
- **Config presets**: Preset configs for common use cases (e.g. “chat-only”, “full automation”) to reduce setup friction.

## Long term

- **On-device agent**: Align the desktop agent loop with the on-device implementation in the APK so behavior and prompts stay consistent.
- **Community skills**: Curate or link a small set of Clawdroid-specific skills (e.g. in `agent-scripts/skills`) that work well with the phone agent.

Contributions and ideas are welcome via issues or pull requests.
