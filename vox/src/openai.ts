import WebSocket from "ws";
import { safeJsonParse } from "./json.js";

export type OpenAIRealtimeClient = {
  send: (evt: unknown) => void;
  close: () => void;
  onServerEvent: (handler: (evt: unknown) => void) => void;
};

export function connectOpenAIRealtime(opts: {
  apiKey: string;
  model: string;
}): Promise<OpenAIRealtimeClient> {
  const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(opts.model)}`;
  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
    },
  });

  const handlers = new Set<(evt: unknown) => void>();
  const buffered: unknown[] = [];

  return new Promise((resolve, reject) => {
    ws.once("open", () => {
      resolve({
        send(evt: unknown) {
          ws.send(JSON.stringify(evt));
        },
        close() {
          ws.close();
        },
        onServerEvent(handler) {
          handlers.add(handler);
          if (buffered.length) {
            for (const evt of buffered) handler(evt);
            if (handlers.size === 1) buffered.length = 0;
          }
        },
      });
    });
    ws.once("error", reject);

    ws.on("message", (data) => {
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      const parsed = safeJsonParse<unknown>(text);
      if (!parsed.ok) return;
      if (!handlers.size) {
        buffered.push(parsed.value);
        if (buffered.length > 200) buffered.splice(0, buffered.length - 200);
        return;
      }
      for (const handler of handlers) handler(parsed.value);
    });
  });
}
