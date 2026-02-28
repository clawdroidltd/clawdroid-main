import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  if (!msg || msg.type !== "query" || typeof msg.id !== "string") return;

  const question = msg.args?.question ?? msg.args?.args?.question ?? null;
  const result = {
    ok: true,
    echo: msg.args,
    answer:
      typeof question === "string" && question.length
        ? `Echo agent says: you asked "${question}".`
        : "Echo agent says: I received your request.",
  };

  process.stdout.write(`${JSON.stringify({ id: msg.id, result })}\n`);
});
