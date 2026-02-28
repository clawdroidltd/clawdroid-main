/**
 * Clawdroid LLM provider layer: OpenAI, Groq, Bedrock, OpenRouter, Ollama.
 * System prompt is loaded from agent-prompts; this module handles routing and response parsing.
 */

import OpenAI from "openai";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { generateText, streamText, generateObject, streamObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

import { CLAWDROID_AGENT_SYSTEM_PROMPT } from "./agent-prompts.js";
import { Config } from "./config.js";
import {
  GROQ_API_BASE_URL,
  OLLAMA_API_BASE_URL,
  BEDROCK_ANTHROPIC_MODELS,
  BEDROCK_META_MODELS,
} from "./constants.js";
import { sanitizeCoordinates, type ActionDecision } from "./actions.js";

/** Re-export for callers that import SYSTEM_PROMPT from this module. */
export const SYSTEM_PROMPT = CLAWDROID_AGENT_SYSTEM_PROMPT;

// ===========================================
// Chat message and content types
// ===========================================

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: "image/png" | "image/jpeg" };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

// ===========================================
// Provider Interface
// ===========================================

export interface LLMProvider {
  readonly capabilities: {
    supportsImages: boolean;
    supportsStreaming: boolean;
  };
  getDecision(messages: ChatMessage[]): Promise<ActionDecision>;
  getDecisionStream?(messages: ChatMessage[]): AsyncIterable<string>;
}

// ===========================================
// Message Trimming (Phase 4A)
// ===========================================

/**
 * Trims conversation messages to keep within history limit.
 * Always keeps the system message. Drops oldest user/assistant pairs.
 */
export function trimMessages(
  messages: ChatMessage[],
  maxHistorySteps: number
): ChatMessage[] {
  if (messages.length === 0) return messages;

  // System message is always first
  const system = messages[0].role === "system" ? messages[0] : null;
  const rest = system ? messages.slice(1) : messages;

  // Count user/assistant pairs (each step = 1 user + 1 assistant)
  const maxMessages = maxHistorySteps * 2;
  if (rest.length <= maxMessages) {
    return messages;
  }

  const dropped = rest.length - maxMessages;
  const stepsDropped = Math.floor(dropped / 2);
  const trimmed = rest.slice(dropped);

  // Insert a summary note
  const summary: ChatMessage = {
    role: "user",
    content: `[${stepsDropped} earlier steps omitted]`,
  };

  return system ? [system, summary, ...trimmed] : [summary, ...trimmed];
}

// ===========================================
// OpenAI / Groq Provider
// ===========================================

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  readonly capabilities: { supportsImages: boolean; supportsStreaming: boolean };

  constructor() {
    if (Config.LLM_PROVIDER === "groq") {
      this.client = new OpenAI({
        apiKey: Config.GROQ_API_KEY,
        baseURL: GROQ_API_BASE_URL,
      });
      this.model = Config.GROQ_MODEL;
      this.capabilities = { supportsImages: false, supportsStreaming: true };
    } else if (Config.LLM_PROVIDER === "ollama") {
      this.client = new OpenAI({
        apiKey: "ollama", // required by the SDK but ignored by Ollama
        baseURL: Config.OLLAMA_BASE_URL,
      });
      this.model = Config.OLLAMA_MODEL;
      // Vision models (llava, llama3.2-vision, etc.) support images
      this.capabilities = { supportsImages: true, supportsStreaming: true };
    } else {
      this.client = new OpenAI({ apiKey: Config.OPENAI_API_KEY });
      this.model = Config.OPENAI_MODEL;
      this.capabilities = { supportsImages: true, supportsStreaming: true };
    }
  }

  private toOpenAIMessages(
    messages: ChatMessage[]
  ): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content } as OpenAI.ChatCompletionMessageParam;
      }
      // Convert ContentPart[] to OpenAI format
      const parts: OpenAI.ChatCompletionContentPart[] = msg.content.map(
        (part) => {
          if (part.type === "text") {
            return { type: "text" as const, text: part.text };
          }
          // Image — only for OpenAI (Groq skips images)
          if (this.capabilities.supportsImages) {
            return {
              type: "image_url" as const,
              image_url: {
                url: `data:${part.mimeType};base64,${part.base64}`,
                detail: "low" as const,
              },
            };
          }
          // Groq: convert image to text placeholder
          return { type: "text" as const, text: "[Screenshot attached]" };
        }
      );
      return {
        role: msg.role,
        content: parts,
      } as OpenAI.ChatCompletionMessageParam;
    });
  }

  async getDecision(messages: ChatMessage[]): Promise<ActionDecision> {
    const openaiMessages = this.toOpenAIMessages(messages);
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: openaiMessages,
    });
    return parseJsonResponse(response.choices[0].message.content ?? "{}");
  }

  async *getDecisionStream(messages: ChatMessage[]): AsyncIterable<string> {
    const openaiMessages = this.toOpenAIMessages(messages);
    const stream = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: "json_object" },
      messages: openaiMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}

// ===========================================
// OpenRouter Provider (Vercel AI SDK)
// ===========================================

/** Zod schema for structured LLM output — guarantees valid JSON */
const actionDecisionSchema = z.object({
  think: z.string().optional().describe("Your reasoning about the current screen state and what to do next"),
  plan: z.array(z.string()).optional().describe("3-5 high-level steps to achieve the goal"),
  planProgress: z.string().optional().describe("Which plan step you are currently on"),
  action: z.string().describe("The action to take: tap, type, scroll, enter, back, home, wait, done, longpress, launch, clear, clipboard_get, clipboard_set, paste, shell, open_url, switch_app, notifications, pull_file, push_file, keyevent, open_settings, read_screen, submit_message, copy_visible_text, wait_for_content, find_and_tap, compose_email"),
  coordinates: z.tuple([z.number(), z.number()]).optional().describe("Target field as [x, y] — used by tap, longpress, type, and paste"),
  text: z.string().optional().describe("Text to type, clipboard text, or email body for compose_email"),
  direction: z.string().optional().describe("Scroll direction: up, down, left, right"),
  reason: z.string().optional().describe("Why you chose this action"),
  package: z.string().optional().describe("App package name for launch action"),
  activity: z.string().optional().describe("Activity name for launch action"),
  uri: z.string().optional().describe("URI for launch action"),
  extras: z.record(z.string(), z.string()).optional().describe("Intent extras for launch action"),
  command: z.string().optional().describe("Shell command to run"),
  filename: z.string().optional().describe("Screenshot filename"),
  query: z.string().optional().describe("Email address for compose_email (REQUIRED), search term for find_and_tap (REQUIRED), or filter for copy_visible_text"),
  url: z.string().optional().describe("URL to open for open_url action"),
  path: z.string().optional().describe("Device file path for pull_file action"),
  source: z.string().optional().describe("Local file path for push_file action"),
  dest: z.string().optional().describe("Device destination path for push_file action"),
  code: z.number().optional().describe("Android keycode number for keyevent action"),
  setting: z.string().optional().describe("Setting name for open_settings: wifi, bluetooth, display, sound, battery, location, apps, date, accessibility, developer"),
});

class OpenRouterProvider implements LLMProvider {
  private openrouter: ReturnType<typeof createOpenRouter>;
  private model: string;
  readonly capabilities = { supportsImages: true, supportsStreaming: true };

  constructor() {
    this.openrouter = createOpenRouter({
      apiKey: Config.OPENROUTER_API_KEY,
    });
    this.model = Config.OPENROUTER_MODEL;
  }

  private toVercelMessages(messages: ChatMessage[]) {
    // Vercel AI SDK uses a similar format but we need to convert images
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    const converted = nonSystem.map((msg) => {
      if (typeof msg.content === "string") {
        return { role: msg.role as "user" | "assistant", content: msg.content };
      }
      const parts = msg.content.map((part) => {
        if (part.type === "text") {
          return { type: "text" as const, text: part.text };
        }
        return {
          type: "image" as const,
          image: `data:${part.mimeType};base64,${part.base64}`,
        };
      });
      return { role: msg.role as "user" | "assistant", content: parts };
    });

    return {
      system: typeof systemMsg?.content === "string" ? systemMsg.content : "",
      messages: converted,
    };
  }

  async getDecision(messages: ChatMessage[]): Promise<ActionDecision> {
    const { system, messages: converted } = this.toVercelMessages(messages);
    const { object } = await generateObject({
      model: this.openrouter.chat(this.model),
      schema: actionDecisionSchema,
      system,
      messages: converted as any,
    });
    // Sanitize coordinates from structured output
    const decision = object as ActionDecision;
    decision.coordinates = sanitizeCoordinates(decision.coordinates);
    return decision;
  }

  async *getDecisionStream(messages: ChatMessage[]): AsyncIterable<string> {
    const { system, messages: converted } = this.toVercelMessages(messages);
    const { partialObjectStream } = streamObject({
      model: this.openrouter.chat(this.model),
      schema: actionDecisionSchema,
      system,
      messages: converted as any,
    });
    // Accumulate partial objects and yield the final complete one as JSON
    let lastObject: any = {};
    for await (const partial of partialObjectStream) {
      lastObject = partial;
      // Yield a dot for progress indication (streaming UI feedback)
      yield ".";
    }
    yield JSON.stringify(lastObject);
  }
}

// ===========================================
// AWS Bedrock Provider
// ===========================================

class BedrockProvider implements LLMProvider {
  private client: BedrockRuntimeClient;
  private model: string;
  readonly capabilities: { supportsImages: boolean; supportsStreaming: boolean };

  constructor() {
    this.client = new BedrockRuntimeClient({ region: Config.AWS_REGION });
    this.model = Config.BEDROCK_MODEL;
    // Only Anthropic models on Bedrock support images
    this.capabilities = {
      supportsImages: this.isAnthropicModel(),
      supportsStreaming: true,
    };
  }

  private isAnthropicModel(): boolean {
    return BEDROCK_ANTHROPIC_MODELS.some((id) => this.model.includes(id));
  }

  private isMetaModel(): boolean {
    return BEDROCK_META_MODELS.some((id) =>
      this.model.toLowerCase().includes(id)
    );
  }

  private buildAnthropicMessages(messages: ChatMessage[]) {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    const converted = nonSystem.map((msg) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }
      const parts = msg.content.map((part) => {
        if (part.type === "text") {
          return { type: "text", text: part.text };
        }
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: part.mimeType,
            data: part.base64,
          },
        };
      });
      return { role: msg.role, content: parts };
    });

    return {
      system: typeof systemMsg?.content === "string" ? systemMsg.content : "",
      messages: converted,
    };
  }

  private buildRequest(messages: ChatMessage[]): string {
    if (this.isAnthropicModel()) {
      const { system, messages: converted } = this.buildAnthropicMessages(messages);
      return JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        system,
        messages: converted,
      });
    }

    // For Meta/other models, flatten to single prompt (no multi-turn / image support)
    const systemContent = messages.find((m) => m.role === "system");
    const userMessages = messages
      .filter((m) => m.role === "user")
      .map((m) =>
        typeof m.content === "string"
          ? m.content
          : m.content
              .filter((p) => p.type === "text")
              .map((p) => (p as { type: "text"; text: string }).text)
              .join("\n")
      );
    const lastUserContent = userMessages[userMessages.length - 1] ?? "";
    const sysText =
      typeof systemContent?.content === "string" ? systemContent.content : "";

    if (this.isMetaModel()) {
      return JSON.stringify({
        prompt: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${sysText}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${lastUserContent}\n\nRespond with ONLY a valid JSON object, no other text.<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
        max_gen_len: 512,
        temperature: 0.1,
      });
    }

    return JSON.stringify({
      inputText: `${sysText}\n\n${lastUserContent}\n\nRespond with ONLY a valid JSON object.`,
      textGenerationConfig: {
        maxTokenCount: 512,
        temperature: 0.1,
      },
    });
  }

  private extractResponse(responseBody: Record<string, any>): string {
    if (this.isAnthropicModel()) {
      return responseBody.content[0].text;
    }
    if (this.isMetaModel()) {
      return responseBody.generation ?? "";
    }
    return responseBody.results[0].outputText;
  }

  async getDecision(messages: ChatMessage[]): Promise<ActionDecision> {
    const requestBody = this.buildRequest(messages);
    const command = new InvokeModelCommand({
      modelId: this.model,
      body: new TextEncoder().encode(requestBody),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const resultText = this.extractResponse(responseBody);
    return parseJsonResponse(resultText);
  }

  async *getDecisionStream(messages: ChatMessage[]): AsyncIterable<string> {
    if (!this.isAnthropicModel()) {
      // Fallback: non-streaming for non-Anthropic models
      const decision = await this.getDecision(messages);
      yield JSON.stringify(decision);
      return;
    }

    const { system, messages: converted } = this.buildAnthropicMessages(messages);
    const requestBody = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system,
      messages: converted,
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.model,
      body: new TextEncoder().encode(requestBody),
      contentType: "application/json",
    });

    const response = await this.client.send(command);
    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const data = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          if (data.type === "content_block_delta" && data.delta?.text) {
            yield data.delta.text;
          }
        }
      }
    }
  }
}

// ===========================================
// Shared JSON Parsing
// ===========================================

/**
 * Sanitizes raw LLM text so it can be parsed as JSON.
 * LLMs often put literal newlines inside JSON string values which breaks JSON.parse().
 */
export function sanitizeJsonText(raw: string): string {
  return raw.replace(/\n/g, " ").replace(/\r/g, " ");
}

export function parseJsonResponse(text: string): ActionDecision {
  let decision: ActionDecision | null = null;
  try {
    decision = JSON.parse(text);
  } catch {
    try {
      decision = JSON.parse(sanitizeJsonText(text));
    } catch {
      // Try to extract JSON from markdown code blocks or mixed text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          decision = JSON.parse(sanitizeJsonText(match[0]));
        } catch {
          // fall through
        }
      }
    }
  }
  if (!decision) {
    console.log(`Warning: Could not parse LLM response: ${text.slice(0, 200)}`);
    return { action: "wait", reason: "Failed to parse response, waiting" };
  }
  decision.coordinates = sanitizeCoordinates(decision.coordinates);
  return decision;
}

// ===========================================
// Factory
// ===========================================

export function getLlmProvider(): LLMProvider {
  if (Config.LLM_PROVIDER === "bedrock") {
    return new BedrockProvider();
  }
  if (Config.LLM_PROVIDER === "openrouter") {
    return new OpenRouterProvider();
  }
  // OpenAI, Groq, and Ollama all use OpenAI-compatible API
  return new OpenAIProvider();
}
