import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const ncts = await prisma.nct.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(ncts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Handle CSV import
  if (body.import && Array.isArray(body.rows)) {
    const created = [];
    for (const row of body.rows) {
      const target = parseFloat(row.target);
      const current = parseFloat(row.current || "0");
      if (!row.goal || !row.metric || isNaN(target)) continue; // skip invalid rows
      const nct = await prisma.nct.create({
        data: {
          goal: row.goal,
          metric: row.metric,
          target,
          current: isNaN(current) ? 0 : current,
          quarter: row.quarter || "Q1 2026",
          isActive: true,
        },
      });
      created.push(nct);
    }
    return NextResponse.json(created);
  }

  const nct = await prisma.nct.create({
    data: {
      goal: body.goal,
      metric: body.metric,
      target: parseFloat(body.target),
      current: parseFloat(body.current || "0"),
      quarter: body.quarter,
      isActive: true,
    },
  });
  return NextResponse.json(nct);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  // Archive quarter
  if (body.archiveQuarter) {
    await prisma.nct.updateMany({
      where: { quarter: body.archiveQuarter, isActive: true },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.current !== undefined) data.current = parseFloat(body.current);
  if (body.goal !== undefined) data.goal = body.goal;
  if (body.metric !== undefined) data.metric = body.metric;
  if (body.target !== undefined) data.target = parseFloat(body.target);
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const nct = await prisma.nct.update({ where: { id: body.id }, data });
  return NextResponse.json(nct);
}
