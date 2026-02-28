# Clawdroid

Platform License Status GitHub Issues GitHub Stars

Google Play X (Twitter) Follow Website

---

Clawdroid is an Android app that lets you deploy and run your own local OpenClaw AI agent directly on your device.  
It runs fully on-device: no external backend required, works offline, and is designed for power users who want full control over their agent.

> **TL;DR**: Clawdroid = local OpenClaw agent on Android.

---

### Features

* **Local OpenClaw agent**: Run a local AI agent directly on your Android device.
* **Offline-first**: No mandatory network calls to external services.
* **Configurable system prompt**: Define the agent's role, behavior, and constraints.
* **Persistent state**: Agent can maintain memory between sessions (implementation-dependent).
* **Android-native UX**: Optimized for mobile interaction patterns.

---

### How it works

1. **Download & Install**  
   * Install the Clawdroid APK on your Android device (from Google Play or a local build).
2. **Create your agent**  
   * Open the app, give your agent a **name** and define its **system prompt** (role, personality, constraints).
3. **Deploy**  
   * Tap **“Deploy agent”**.  
   * The agent runs locally on your device, responding to your input using on-device models or a configured backend.
4. **Use**  
   * Chat with your agent, iterate on its prompt, and adapt it to your workflows.

---

### Repository layout

> **Note:** This repository currently focuses on the unpacked APK and auxiliary tooling rather than a hand-written Android Studio project. Structure may evolve over time.

* `apk/` – original APK(s) and unpacked contents (resources, manifest, DEX, etc.).
* `scripts/` – helper scripts to unpack, inspect, and rebuild the APK.
* `docs/` – additional technical documentation.

---

### Unpacking the APK

Once you place your Clawdroid APK into this repository (for example as `apk/clawdroid.apk`), you can unpack it locally.

Recommended layout:

```text
apk/
  clawdroid.apk
```

Example commands (using common Android reverse engineering tools):

```bash
# 1. Create output directory
mkdir -p apk/unpacked

# 2. Unpack resources, manifest, smali (if apktool is installed)
apktool d apk/clawdroid.apk -o apk/unpacked

# 3. (Optional) Also unzip the raw contents
unzip -d apk/unpacked-zip apk/clawdroid.apk
```

You can then explore:

* `AndroidManifest.xml`
* `res/` resources
* `smali*/` or `classes*.dex` (for code-level inspection)

If you want, we can add more automation around this (e.g. a `scripts/unpack-apk.sh` helper).

---

### Credits & Inspiration

This project is heavily inspired by work from:

* Peter Steinberger (@steipete) – OpenClaw and AI-native tooling for developers.
* Russ Bishop (@russbishop) – Clawdroid concept and original Android implementation, as described on clawdroid.pro.

If you use or copy code from their repositories, make sure to:

* Respect each repository’s **license**.
* Keep **copyright** and **license headers**.
* Add explicit attribution in this README or a separate `CREDITS`/`AUTHORS` file.

> **Important:** GitHub’s automatic “Contributors” list is based on the Git history (commit authors).  
> Importing their code is great and should be properly credited, but faking commit authorship just to force them into the contributors graph is discouraged.  
> A clear **Credits** section (like this one) is the clean and honest way to acknowledge their work.

---

### Contributing

Contributions, PRs and issues are welcome.

If you open a PR:

1. Keep changes focused and small where possible.
2. Document any non-obvious behavior or constraints.
3. Make sure the project still builds after your changes.

---

### License

This repository is licensed under the **MIT License** (unless specified otherwise in individual subdirectories).  
If you import third-party code (for example from steipete or russbishop), you **must** keep their original licenses and follow their terms.
