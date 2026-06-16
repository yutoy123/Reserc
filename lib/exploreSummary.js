const EXPLORE_SYSTEM = `You are a development economics research assistant helping students interpret World Bank data for low- and middle-income countries (LMICs). Write clearly and accessibly. Do not invent statistics — only reference numbers provided in the data summary.`;

export async function fetchExploreSummary(topic, region, dataSummary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      paragraph:
        "Summary unavailable — configure ANTHROPIC_API_KEY to generate an AI interpretation. Review the stat cards and charts above for the raw World Bank data.",
    };
  }

  const prompt = `Topic: ${topic}
Region: ${region}

Here is World Bank WDI data (median values across LIC and LMC countries in this region):
${dataSummary}

Write one short paragraph (3–5 sentences) explaining what these numbers mean for a student researching "${topic}" in ${region}. Highlight the most notable patterns, regional context, and one implication for further research. Plain text only — no JSON, no markdown.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: EXPLORE_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, paragraph: data.content[0].text.trim() };
  } catch (err) {
    console.error("Explore summary error:", err.message);
    return {
      success: false,
      paragraph:
        "Could not generate summary. The World Bank data above is still valid — try Investigate or Build mode to go deeper.",
    };
  }
}
