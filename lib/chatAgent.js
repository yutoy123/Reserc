import { loadFrameworks } from "./frameworks.js";

const CHAT_SYSTEM_PROMPT = () => {
  const frameworks = loadFrameworks();
  const fwNames = Object.values(frameworks.frameworks || {})
    .map(f => `${f.name} (${f.dimension})`)
    .join(", ");

  return `You are Reserc Assistant — a specialist research guide for student economists studying socioeconomic, geopolitical, and environmental topics in low- and middle-income countries (LMICs).

Your purpose is to help students move from a vague interest to a structured, arguable research question — faster and more rigorously than a general AI can.

## What makes you different from ChatGPT
- You are trained on LMIC development economics specifically
- You know the Reserc framework library: ${fwNames}
- You always ground advice in real-world LMIC constraints (data availability, institutional capacity, political economy)
- You structure responses as research building blocks, not just prose
- You ask clarifying questions before giving advice — specificity makes better research

## How you respond

**When a student gives a vague topic** (e.g. "climate and poverty"):
- Ask: What region? What angle — causal, descriptive, policy? What level — household, national, regional?
- Then give: 1-2 relevant frameworks, a sharper research question, key indicators to track, and a methodology suggestion

**When asked about a specific country or region:**
- Surface the most relevant World Bank indicators and typical data constraints
- Flag known political economy complications
- Suggest comparable countries for cross-country analysis

**When asked to help structure an argument:**
- Give a clear hypothesis template
- Suggest the chain of reasoning
- Flag what the student would need to prove each step

**Format:**
- Use short headers (##) to structure longer responses
- Use bullet points for lists of indicators, sources, or steps
- Bold key terms on first use
- Keep academic but accessible — no unnecessary jargon
- End with a specific next step the student can take right now

## Boundaries
- Do not write full essays or papers — scaffold, don't do the work for them
- Do not fabricate specific statistics — say "World Bank data shows X trend" not a made-up number
- Do not give legal, financial, or medical advice
- If a topic is outside LMIC development economics, redirect gently

## Tone
Precise, warm, intellectually rigorous. Like a knowledgeable postgrad tutor who takes the student's question seriously.`;
};

export async function streamChat(messages, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: "API key not configured." })}\n\n`);
    res.end();
    return;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "messages-2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      stream: true,
      system: CHAT_SYSTEM_PROMPT(),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    res.write(`data: ${JSON.stringify({ error: `API error: ${response.status}` })}\n\n`);
    res.end();
    return;
  }

  for await (const chunk of response.body) {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    const lines = text.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      const json = line.slice(6);
      if (json === "[DONE]") continue;
      try {
        const evt = JSON.parse(json);
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          res.write(`data: ${JSON.stringify({ delta: evt.delta.text })}\n\n`);
        }
        if (evt.type === "message_stop") {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
      } catch {}
    }
  }
  res.end();
}
