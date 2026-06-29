import { SYSTEM_PROMPT, buildUserMessage } from "./prompts.js";

const REQUIRED_FIELDS = [
  "topic_title",
  "context_summary",
  "key_metrics",
  "policy_responses",
  "research_gaps",
  "suggested_sources",
];

async function callClaudeAPI(topic, region, worldBankData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserMessage(topic, region, worldBankData),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseReport(raw) {
  let clean = raw.replace(/```json|```/g, "").trim();
  // Find the outermost JSON object
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);
  try {
    return JSON.parse(clean);
  } catch {
    // Attempt to salvage truncated JSON by closing open structures
    let repaired = clean;
    if (!repaired.endsWith("}")) {
      // Trim trailing incomplete value, close any open arrays/objects
      repaired = repaired.replace(/,\s*$/, "");
      const opens = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      const objOpens = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < opens; i++) repaired += "]";
      for (let i = 0; i < objOpens; i++) repaired += "}";
    }
    return JSON.parse(repaired);
  }
}

function validateReport(report) {
  for (const field of REQUIRED_FIELDS) {
    if (!report[field]) throw new Error(`Missing field: ${field}`);
  }
}

export async function fetchResearchReport(topic, region, worldBankData) {
  try {
    const raw = await callClaudeAPI(topic, region, worldBankData);
    const report = parseReport(raw);
    validateReport(report);
    return { success: true, data: report };
  } catch (err) {
    console.error("Research report error:", err.message);
    const isKeyMissing = err.message.includes("ANTHROPIC_API_KEY");
    return {
      success: false,
      error: isKeyMissing
        ? "API key not configured. Copy .env.example to .env and set ANTHROPIC_API_KEY."
        : "Could not generate report. Try rephrasing your topic or selecting a different region.",
    };
  }
}
