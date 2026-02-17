import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

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
    // Formats:
    //   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={GID}
    //   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?gid={GID}
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

    // Find the sheet matching the gid
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

    // Step 3: Parse NCTs
    // Try to detect CoGrader NCT format (has "Narratives" section with Name/Description/KR columns)
    const narrativesRowIdx = rows.findIndex((row) => row.some((c) => c.toLowerCase().trim() === "narratives"));

    const nctRows: { goal: string; metric: string; target: number; quarter: string }[] = [];

    if (narrativesRowIdx >= 0) {
      // Find header row after "Narratives"
      const headerIdx = rows.findIndex((row, i) =>
        i > narrativesRowIdx &&
        row.some((c) => c.toLowerCase().trim() === "name") &&
        row.some((c) => c.toLowerCase().trim() === "kr")
      );

      if (headerIdx < 0) {
        return NextResponse.json({ error: "Found 'Narratives' section but no Name/KR header row." }, { status: 400 });
      }

      const headerRow = rows[headerIdx].map((c) => c.toLowerCase().trim());
      const nameCol = headerRow.findIndex((c) => c === "name");
      const descCol = headerRow.findIndex((c) => c.includes("description"));
      const krCol = headerRow.findIndex((c) => c === "kr");

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const name = (row[nameCol >= 0 ? nameCol : 1] || "").trim();
        if (!name) continue;
        if (name.toLowerCase() === "commitments" || name.toLowerCase() === "tasks") break;

        const description = descCol >= 0 ? (row[descCol] || "").trim() : "";
        const kr = (row[krCol >= 0 ? krCol : 6] || "").trim();

        const numMatch = kr.match(/([\d,.]+)/);
        const target = numMatch ? parseFloat(numMatch[1].replace(/,/g, "")) : 1;
        const metric = kr || name;
        const goal = description ? `${name}: ${description.split("\n")[0].trim()}` : name;

        nctRows.push({ goal, metric, target, quarter: "Q1 2026" });
      }
    } else {
      // Fallback: standard columns (goal/name, metric/kr, target, quarter)
      const headerRow = rows[0].map((c) => c.toLowerCase().trim().replace(/[^a-z]/g, ""));
      const goalIdx = headerRow.findIndex((h) => h.includes("goal") || h.includes("description") || h.includes("name"));
      const metricIdx = headerRow.findIndex((h) => h.includes("metric") || h.includes("kr"));
      const targetIdx = headerRow.findIndex((h) => h.includes("target"));
      const quarterIdx = headerRow.findIndex((h) => h.includes("quarter"));

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const goal = (row[goalIdx >= 0 ? goalIdx : 0] || "").trim();
        const metric = (row[metricIdx >= 0 ? metricIdx : 1] || "").trim();
        const targetStr = (row[targetIdx >= 0 ? targetIdx : 2] || "").trim();
        const quarter = (row[quarterIdx >= 0 ? quarterIdx : 3] || "Q1 2026").trim();

        if (!goal || !metric) continue;
        const target = parseFloat(targetStr) || 1;

        nctRows.push({ goal, metric, target, quarter });
      }
    }

    if (nctRows.length === 0) {
      return NextResponse.json({ error: "No NCTs found in the sheet." }, { status: 400 });
    }

    // Step 4: Create NCTs
    const created = [];
    for (const row of nctRows) {
      const nct = await prisma.nct.create({
        data: {
          goal: row.goal,
          metric: row.metric,
          target: row.target,
          current: 0,
          quarter: row.quarter,
          isActive: true,
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
