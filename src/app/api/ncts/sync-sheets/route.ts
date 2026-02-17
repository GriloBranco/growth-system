import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { parseNctRows } from "@/lib/nct-parser";

export async function POST() {
  try {
    // Read settings
    const settings = await prisma.appSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    const sheetsUrl = settingsMap.google_sheets_url;
    const apiKey = settingsMap.google_ai_api_key;

    if (!sheetsUrl) {
      return NextResponse.json({ error: "No Google Sheets URL configured. Set it in Settings." }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "No Google AI API key configured. Set it in Settings." }, { status: 400 });
    }

    // Parse spreadsheet ID and gid from URL
    const idMatch = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!idMatch) {
      return NextResponse.json({ error: "Could not parse spreadsheet ID from URL. Use a standard Google Sheets URL." }, { status: 400 });
    }
    const spreadsheetId = idMatch[1];

    const gidMatch = sheetsUrl.match(/[#?&]gid=(\d+)/);
    const gid = gidMatch ? parseInt(gidMatch[1]) : 0;

    // Step 1: Fetch spreadsheet metadata to resolve gid to sheet name
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties&key=${apiKey}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      const err = await metaRes.json();
      const msg = err.error?.message || "Unknown error";
      if (msg.includes("not enabled") || msg.includes("API")) {
        return NextResponse.json({
          error: `Google Sheets API is not enabled for your API key. Go to console.cloud.google.com, find your project, and enable the "Google Sheets API".`,
        }, { status: 400 });
      }
      return NextResponse.json({ error: `Sheets API error: ${msg}` }, { status: 400 });
    }
    const meta = await metaRes.json();

    const sheets = meta.sheets || [];
    const targetSheet = sheets.find((s: { properties: { sheetId: number } }) => s.properties.sheetId === gid);
    const sheetName = targetSheet?.properties?.title || sheets[0]?.properties?.title;

    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found in the spreadsheet." }, { status: 400 });
    }

    // Step 2: Fetch all values from the sheet
    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
    const valuesRes = await fetch(valuesUrl);
    if (!valuesRes.ok) {
      const err = await valuesRes.json();
      return NextResponse.json({ error: `Failed to fetch sheet data: ${err.error?.message || "Unknown error"}` }, { status: 400 });
    }
    const valuesData = await valuesRes.json();
    const rows: string[][] = valuesData.values || [];

    if (rows.length < 2) {
      return NextResponse.json({ error: "Sheet has no data rows." }, { status: 400 });
    }

    // Step 3: Parse using shared parser
    const parsed = parseNctRows(rows, "Q1 2026");

    if (parsed.narratives.length === 0) {
      return NextResponse.json({ error: "No NCTs found in the sheet." }, { status: 400 });
    }

    // Step 4: Create full hierarchy
    const objectiveText = parsed.objectives.join("\n") || null;
    const created = [];

    for (const narr of parsed.narratives) {
      const nct = await prisma.nct.create({
        data: {
          goal: narr.description
            ? `${narr.name}: ${narr.description.split("\n")[0].trim()}`
            : narr.name,
          metric: narr.metric,
          target: narr.target,
          current: 0,
          quarter: parsed.quarter,
          objective: objectiveText,
          description: narr.description || null,
          isActive: true,
          commitments: {
            create: narr.commitments.map((c) => ({
              name: c.name,
              type: c.type,
              description: c.description || null,
              dri: c.dri || null,
              sortOrder: c.sortOrder,
              tasks: {
                create: c.tasks.map((t) => ({
                  text: t.text,
                  isDone: t.isDone,
                  sortOrder: t.sortOrder,
                })),
              },
            })),
          },
        },
        include: {
          commitments: { include: { tasks: true } },
        },
      });
      created.push(nct);
    }

    // Step 5: Update last sync timestamp
    const now = new Date().toISOString();
    await prisma.appSetting.upsert({
      where: { key: "google_sheets_last_sync" },
      update: { value: now },
      create: { key: "google_sheets_last_sync", value: now },
    });

    return NextResponse.json({ count: created.length, ncts: created });
  } catch (e) {
    console.error("Sheets sync error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
