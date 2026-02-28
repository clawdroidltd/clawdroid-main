import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createSubprocessAgentClient } from "../src/agent.js";

test("subprocess agent JSONL roundtrip", async () => {
  const cmd = `node ${path.join("examples", "echo-agent.js")}`;
  const agent = createSubprocessAgentClient(cmd);
  try {
    const res = await agent.query({ question: "hello" });
    const record = (res ?? {}) as Record<string, unknown>;
    assert.equal(record.ok, true);
    assert.match(String(record.answer ?? ""), /hello/);
  } finally {
    agent.close();
  }
});
