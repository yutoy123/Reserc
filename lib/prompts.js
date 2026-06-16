export const SYSTEM_PROMPT = `You are a development economics research assistant specializing in low- and middle-income countries (LMICs). Your role is to help students, policy researchers, and NGO analysts quickly understand the economic and social landscape of a topic — without requiring them to dig through raw datasets themselves.

When given a research topic and region, you synthesize available data into a structured, accessible report. You are rigorous but readable. You cite real institutions and data sources (World Bank, IMF, UN, academic literature). You do not invent statistics — if you are uncertain about a figure, you flag it clearly.

Always respond in valid JSON matching the schema provided. Do not include any text outside the JSON object.`;

const USER_MESSAGE_SCHEMA = `{
  "topic_title": "A clean, readable title for this research topic",

  "context_summary": {
    "headline": "One sentence that captures the core finding",
    "paragraphs": [
      "Paragraph 1: Current state — what does the data show?",
      "Paragraph 2: Historical trend — how has this changed over time?",
      "Paragraph 3: Regional variation — which countries stand out and why?"
    ]
  },

  "key_metrics": [
    {
      "label": "Metric name",
      "value": "Numeric value or range",
      "unit": "e.g. % of population, USD, index score",
      "year": "Most recent year available",
      "source": "e.g. World Bank WDI 2023",
      "note": "Optional: any important caveat about this figure"
    }
  ],

  "policy_responses": [
    {
      "title": "Name of the policy or initiative",
      "actor": "Government, NGO, multilateral — who is doing this",
      "description": "2–3 sentences on what it is and what it aims to achieve",
      "status": "Active | Completed | Proposed",
      "countries": ["List of relevant countries"]
    }
  ],

  "research_gaps": [
    {
      "gap": "A specific under-researched area or data gap",
      "why_it_matters": "Why closing this gap would be useful for policy or practice",
      "suggested_angle": "A concrete research question a student or analyst could pursue"
    }
  ],

  "suggested_sources": [
    {
      "title": "Full title of the source",
      "org": "Publishing organization",
      "url": "URL if publicly available, otherwise null",
      "type": "Dataset | Report | Academic paper | Policy brief"
    }
  ],

  "related_topics": [
    "Short label for a related topic the user might want to explore next"
  ]
}`;

export function buildUserMessage(topic, region, worldBankData) {
  return `Research topic: ${topic}
Region: ${region}

Here is relevant World Bank data I have fetched for this region:
${worldBankData}

Return a JSON object with exactly this structure:

${USER_MESSAGE_SCHEMA}

Return only the JSON. No preamble, no markdown fences, no explanation outside the object.`;
}
