import { prisma } from "@/lib/db";
import { processTranscript, testApiConnection } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Test connection endpoint
  if (body.testConnection) {
    const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "google_ai_api_key" } });
    const apiKey = body.apiKey || apiKeySetting?.value;
    if (!apiKey) return NextResponse.json({ error: "No API key configured" }, { status: 400 });
    try {
      const result = await testApiConnection(apiKey);
      if (result.success) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 200 });
    } catch (e) {
      return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
  }

  // Process transcript
  const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "google_ai_api_key" } });
  const apiKey = apiKeySetting?.value;
  if (!apiKey) {
    return NextResponse.json({ error: "Google AI API key not configured. Go to Settings to add it." }, { status: 400 });
  }

  // Get context data
  const ncts = await prisma.nct.findMany({ where: { isActive: true } });
  const nctsText = ncts.map((n) => `- ${n.goal} (${n.metric}: ${n.current}/${n.target}, ${n.quarter})`).join("\n");

  const sixtyDaysOut = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { startDate: { gte: now, lte: sixtyDaysOut } },
        { prepStartDate: { gte: now, lte: sixtyDaysOut } },
        { startDate: { gte: now }, prepStartDate: { lte: now } },
      ],
    },
    orderBy: { startDate: "asc" },
  });
  const eventsText = events
    .map((e) => {
      const prep = e.prepStartDate ? ` (Prep starts: ${e.prepStartDate.toISOString().split("T")[0]})` : "";
      return `- ${e.name} [${e.states}] ${e.startDate.toISOString().split("T")[0]} to ${e.endDate.toISOString().split("T")[0]}${prep}`;
    })
    .join("\n");

  try {
    const result = await processTranscript(apiKey, body.transcript, nctsText || "No active NCTs", eventsText || "No upcoming events");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
