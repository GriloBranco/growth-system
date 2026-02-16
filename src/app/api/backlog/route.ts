import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { calculateIceScore } from "@/lib/utils";

export async function GET() {
  const items = await prisma.backlogItem.findMany({
    where: { status: "pending" },
    include: { nct: true },
    orderBy: { iceScore: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Promote to sprint
  if (body.promote && body.id && body.sprintId) {
    const item = await prisma.backlogItem.findUnique({ where: { id: body.id } });
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

    const sprintItem = await prisma.sprintItem.create({
      data: {
        sprintId: body.sprintId,
        name: item.name,
        scope: item.scope,
        definitionOfDone: item.description,
        calendarUrgency: item.calendarUrgency,
        impact: item.impact,
        iceScore: item.iceScore,
        nctId: item.nctId,
      },
      include: { tasks: true, owner: true, nct: true },
    });

    await prisma.backlogItem.update({
      where: { id: body.id },
      data: { status: "promoted_to_sprint", promotedToSprintId: body.sprintId },
    });

    return NextResponse.json(sprintItem);
  }

  const iceScore = calculateIceScore(body.calendarUrgency || 1, body.impact || 1);
  const item = await prisma.backlogItem.create({
    data: {
      name: body.name,
      scope: body.scope || "Other",
      description: body.description || "",
      calendarUrgency: body.calendarUrgency || 1,
      impact: body.impact || 1,
      iceScore,
      nctId: body.nctId || null,
    },
    include: { nct: true },
  });
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.scope !== undefined) data.scope = body.scope;
  if (body.description !== undefined) data.description = body.description;
  if (body.calendarUrgency !== undefined) data.calendarUrgency = body.calendarUrgency;
  if (body.impact !== undefined) data.impact = body.impact;
  if (body.status !== undefined) data.status = body.status;
  if (body.nctId !== undefined) data.nctId = body.nctId || null;

  if (body.calendarUrgency !== undefined || body.impact !== undefined) {
    const existing = await prisma.backlogItem.findUnique({ where: { id: body.id } });
    data.iceScore = calculateIceScore(
      body.calendarUrgency ?? existing?.calendarUrgency ?? 1,
      body.impact ?? existing?.impact ?? 1
    );
  }

  const item = await prisma.backlogItem.update({
    where: { id: body.id },
    data,
    include: { nct: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.backlogItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
