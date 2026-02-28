/**
 * Clawdroid agent constants: APIs, keycodes, screen defaults, models, paths.
 * Sourced from clawdroid-runtime where applicable.
 */

import { CLAWDROID_RUNTIME } from "./clawdroid-runtime.js";

const REF = CLAWDROID_RUNTIME.referenceResolution;

export const ClawdroidAgentDefaults = {
  api: {
    groq: "https://api.groq.com/openai/v1",
    ollama: "http://localhost:11434/v1",
  },
  adbKeycodes: {
    enter: "66",
    home: "KEYCODE_HOME",
    back: "KEYCODE_BACK",
    del: "67",
    forwardDel: "112",
    moveHome: "122",
    moveEnd: "123",
    menu: "82",
    tab: "61",
    escape: "111",
    dpadUp: "19",
    dpadDown: "20",
    dpadLeft: "21",
    dpadRight: "22",
    volumeUp: "24",
    volumeDown: "25",
    power: "26",
    paste: "279",
  },
  screen: {
    centerX: Math.floor(REF.width / 2),
    centerY: Math.floor(REF.height / 2),
    swipeMs: String(CLAWDROID_RUNTIME.gestureDurationMs),
    longPressMs: "1000",
  },
  models: {
    groq: "llama-3.3-70b-versatile",
    openai: "gpt-4o",
    bedrock: "us.meta.llama3-3-70b-instruct-v1:0",
    openrouter: "anthropic/claude-3.5-sonnet",
    ollama: "llama3.2",
  },
  bedrockPrefixes: { anthropic: ["anthropic"], meta: ["meta", "llama"] },
  paths: {
    deviceDump: "/sdcard/window_dump.xml",
    localDump: "window_dump.xml",
    deviceScreenshot: "/sdcard/kernel_screenshot.png",
    localScreenshot: "kernel_screenshot.png",
  },
  agent: {
    maxSteps: 30,
    stepDelay: 2.0,
    maxRetries: 3,
    stuckThreshold: 3,
    visionEnabled: true,
    maxElements: 40,
    logDir: "logs",
    visionMode: "fallback" as const,
    maxHistorySteps: 10,
    streamingEnabled: true,
  },
} as const;

// Named exports for backward compatibility
export const GROQ_API_BASE_URL = ClawdroidAgentDefaults.api.groq;
export const OLLAMA_API_BASE_URL = ClawdroidAgentDefaults.api.ollama;
export const KEYCODE_ENTER = ClawdroidAgentDefaults.adbKeycodes.enter;
export const KEYCODE_HOME = ClawdroidAgentDefaults.adbKeycodes.home;
export const KEYCODE_BACK = ClawdroidAgentDefaults.adbKeycodes.back;
export const KEYCODE_DEL = ClawdroidAgentDefaults.adbKeycodes.del;
export const KEYCODE_FORWARD_DEL = ClawdroidAgentDefaults.adbKeycodes.forwardDel;
export const KEYCODE_MOVE_HOME = ClawdroidAgentDefaults.adbKeycodes.moveHome;
export const KEYCODE_MOVE_END = ClawdroidAgentDefaults.adbKeycodes.moveEnd;
export const KEYCODE_MENU = ClawdroidAgentDefaults.adbKeycodes.menu;
export const KEYCODE_TAB = ClawdroidAgentDefaults.adbKeycodes.tab;
export const KEYCODE_ESCAPE = ClawdroidAgentDefaults.adbKeycodes.escape;
export const KEYCODE_DPAD_UP = ClawdroidAgentDefaults.adbKeycodes.dpadUp;
export const KEYCODE_DPAD_DOWN = ClawdroidAgentDefaults.adbKeycodes.dpadDown;
export const KEYCODE_DPAD_LEFT = ClawdroidAgentDefaults.adbKeycodes.dpadLeft;
export const KEYCODE_DPAD_RIGHT = ClawdroidAgentDefaults.adbKeycodes.dpadRight;
export const KEYCODE_VOLUME_UP = ClawdroidAgentDefaults.adbKeycodes.volumeUp;
export const KEYCODE_VOLUME_DOWN = ClawdroidAgentDefaults.adbKeycodes.volumeDown;
export const KEYCODE_POWER = ClawdroidAgentDefaults.adbKeycodes.power;
export const KEYCODE_PASTE = ClawdroidAgentDefaults.adbKeycodes.paste;
export const SCREEN_CENTER_X = ClawdroidAgentDefaults.screen.centerX;
export const SCREEN_CENTER_Y = ClawdroidAgentDefaults.screen.centerY;
export const SWIPE_DURATION_MS = ClawdroidAgentDefaults.screen.swipeMs;
export const LONG_PRESS_DURATION_MS = ClawdroidAgentDefaults.screen.longPressMs;
export const DEFAULT_GROQ_MODEL = ClawdroidAgentDefaults.models.groq;
export const DEFAULT_OPENAI_MODEL = ClawdroidAgentDefaults.models.openai;
export const DEFAULT_BEDROCK_MODEL = ClawdroidAgentDefaults.models.bedrock;
export const DEFAULT_OPENROUTER_MODEL = ClawdroidAgentDefaults.models.openrouter;
export const DEFAULT_OLLAMA_MODEL = ClawdroidAgentDefaults.models.ollama;
export const BEDROCK_ANTHROPIC_MODELS = ClawdroidAgentDefaults.bedrockPrefixes.anthropic;
export const BEDROCK_META_MODELS = ClawdroidAgentDefaults.bedrockPrefixes.meta;
export const DEVICE_DUMP_PATH = ClawdroidAgentDefaults.paths.deviceDump;
export const LOCAL_DUMP_PATH = ClawdroidAgentDefaults.paths.localDump;
export const DEVICE_SCREENSHOT_PATH = ClawdroidAgentDefaults.paths.deviceScreenshot;
export const LOCAL_SCREENSHOT_PATH = ClawdroidAgentDefaults.paths.localScreenshot;
export const DEFAULT_MAX_STEPS = ClawdroidAgentDefaults.agent.maxSteps;
export const DEFAULT_STEP_DELAY = ClawdroidAgentDefaults.agent.stepDelay;
export const DEFAULT_MAX_RETRIES = ClawdroidAgentDefaults.agent.maxRetries;
export const DEFAULT_STUCK_THRESHOLD = ClawdroidAgentDefaults.agent.stuckThreshold;
export const DEFAULT_VISION_ENABLED = ClawdroidAgentDefaults.agent.visionEnabled;
export const DEFAULT_MAX_ELEMENTS = ClawdroidAgentDefaults.agent.maxElements;
export const DEFAULT_LOG_DIR = ClawdroidAgentDefaults.agent.logDir;
export const DEFAULT_VISION_MODE = ClawdroidAgentDefaults.agent.visionMode;
export const DEFAULT_MAX_HISTORY_STEPS = ClawdroidAgentDefaults.agent.maxHistorySteps;
export const DEFAULT_STREAMING_ENABLED = ClawdroidAgentDefaults.agent.streamingEnabled;

export type VisionMode = "off" | "fallback" | "always";

export const SWIPE_COORDS: Record<string, [number, number, number, number]> = {
  up: [SCREEN_CENTER_X, 1500, SCREEN_CENTER_X, 500],
  down: [SCREEN_CENTER_X, 500, SCREEN_CENTER_X, 1500],
  left: [800, SCREEN_CENTER_Y, 200, SCREEN_CENTER_Y],
  right: [200, SCREEN_CENTER_Y, 800, SCREEN_CENTER_Y],
};

/** Build swipe coordinate map for a given resolution (ratios from reference 1080×2400). */
export function computeSwipeCoords(
  width: number,
  height: number
): Record<string, [number, number, number, number]> {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const vTop = Math.floor(height * 0.208);
  const vBottom = Math.floor(height * 0.625);
  const hLeft = Math.floor(width * 0.185);
  const hRight = Math.floor(width * 0.741);
  return {
    up: [cx, vBottom, cx, vTop],
    down: [cx, vTop, cx, vBottom],
    left: [hRight, cy, hLeft, cy],
    right: [hLeft, cy, hRight, cy],
  };
}
