import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { type ParsedNctData } from "@/lib/nct-parser";

export async function GET() {
  const ncts = await prisma.nct.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      commitments: {
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  return NextResponse.json(ncts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Handle full hierarchy import (from CSV parser or Sheets sync)
  if (body.importHierarchy && body.data) {
    const data = body.data as ParsedNctData;
    const objectiveText = data.objectives.join("\n") || null;

    const created = [];
    for (const narr of data.narratives) {
      const nct = await prisma.nct.create({
        data: {
          goal: narr.description
            ? `${narr.name}: ${narr.description.split("\n")[0].trim()}`
            : narr.name,
          metric: narr.metric,
          target: narr.target,
          current: 0,
          quarter: data.quarter,
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
    return NextResponse.json(created);
  }

  // Handle flat CSV import (legacy)
  if (body.import && Array.isArray(body.rows)) {
    const created = [];
    for (const row of body.rows) {
      const target = parseFloat(row.target);
      const current = parseFloat(row.current || "0");
      if (!row.goal || !row.metric || isNaN(target)) continue;
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
