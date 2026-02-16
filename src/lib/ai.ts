const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent";

const SYSTEM_PROMPT = `You are a Growth Sprint Planner for CoGrader, an EdTech company that sells AI essay grading tools to American teachers.

Your job is to analyze a weekly Growth team meeting transcript and extract actionable sprint items, backlog items, and any updates to quarterly goals.

Context about CoGrader:
- Serves American K-12 teachers, primarily ELA/writing
- Top states: Texas, California, Florida
- Growth channels: SEO, Meta Ads, Google Ads, YouTube Ads, Social Media (TikTok, Instagram), Content Creators/UGC, Email Marketing, Referral/MGM programs
- Business is seasonal, tied to the American school calendar (state testing, grading crunches, back-to-school)

You will be given:
1. The meeting transcript
2. The current active NCTs (quarterly goals) for context
3. The current school calendar events in the next 60 days for context

Your output must be valid JSON with this exact structure:
{
  "sprint_items": [
    {
      "name": "Short descriptive name",
      "scope": "SEO|Ads|Social|Product Growth|Content|Email|Partnerships|Other",
      "owner": "Name of person responsible (extract from transcript)",
      "definition_of_done": "Specific, measurable completion criteria",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "why_now": "One sentence explaining why this matters RIGHT NOW",
      "calendar_urgency": 1,
      "impact": 1,
      "suggested_nct_link": "NCT goal text if applicable, or null",
      "suggested_deadline": "YYYY-MM-DD or null"
    }
  ],
  "backlog_items": [
    {
      "name": "Short descriptive name",
      "scope": "SEO|Ads|Social|Product Growth|Content|Email|Partnerships|Other",
      "description": "One sentence description",
      "calendar_urgency": 1,
      "impact": 1,
      "suggested_nct_link": "NCT goal text if applicable, or null"
    }
  ],
  "nct_updates": [
    {
      "nct_goal": "The NCT goal text to match against",
      "new_current_value": 0,
      "note": "Why this changed"
    }
  ],
  "calendar_mentions": [
    {
      "event": "Event name mentioned",
      "context": "How it was discussed / why it matters"
    }
  ]
}

Rules:
- Extract ONLY items that were explicitly discussed or decided in the meeting. Do not invent items.
- Sprint items are things they committed to doing in the next 1-2 weeks.
- Backlog items are things they discussed but deferred or said "later."
- Maximum 4 sprint items. If more were discussed, pick the highest-priority ones based on calendar urgency and impact, and move the rest to backlog.
- definition_of_done must be specific and measurable.
- Calendar urgency scoring: 3 = school calendar event within 4 weeks, 2 = event in 4-8 weeks, 1 = no time pressure.
- Impact scoring: 3 = directly moves primary metric, 2 = indirect support, 1 = research/infrastructure.
- Owner should be extracted from the transcript. If unclear, put "Unassigned".
- Do NOT include personal/HR topics, career discussions, or performance management items.`;

export interface TranscriptResult {
  sprint_items: {
    name: string;
    scope: string;
    owner: string;
    definition_of_done: string;
    tasks: string[];
    why_now: string;
    calendar_urgency: number;
    impact: number;
    suggested_nct_link: string | null;
    suggested_deadline: string | null;
  }[];
  backlog_items: {
    name: string;
    scope: string;
    description: string;
    calendar_urgency: number;
    impact: number;
    suggested_nct_link: string | null;
  }[];
  nct_updates: {
    nct_goal: string;
    new_current_value: number;
    note: string;
  }[];
  calendar_mentions: {
    event: string;
    context: string;
  }[];
}

export async function processTranscript(
  apiKey: string,
  transcript: string,
  ncts: string,
  calendarEvents: string,
  retryCount = 0
): Promise<TranscriptResult> {
  const userMessage = `## Meeting Transcript
${transcript}

## Current NCTs
${ncts}

## Upcoming School Calendar Events (next 60 days)
${calendarEvents}

Please analyze this transcript and extract sprint items, backlog items, and any relevant updates.`;

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response text from Gemini API");
  }

  try {
    return JSON.parse(text) as TranscriptResult;
  } catch {
    if (retryCount < 1) {
      return processTranscript(apiKey, transcript, ncts, calendarEvents, retryCount + 1);
    }
    throw new Error("Failed to parse Gemini response as JSON after retry");
  }
}

export async function testApiConnection(apiKey: string): Promise<boolean> {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Respond with exactly: OK" }] }],
    }),
  });
  return response.ok;
}
