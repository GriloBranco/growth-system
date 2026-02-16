import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch (e) {
    console.error("Settings GET error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const updates: { key: string; value: string }[] = Object.entries(body).map(
    ([key, value]) => ({ key, value: String(value) })
  );

  for (const { key, value } of updates) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true });
}
