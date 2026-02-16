import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { calculateIceScore } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const iceScore = calculateIceScore(body.calendarUrgency || 1, body.impact || 1);

  const item = await prisma.sprintItem.create({
    data: {
      sprintId: body.sprintId,
      name: body.name,
      scope: body.scope || "Other",
      ownerId: body.ownerId || null,
      status: "not_started",
      definitionOfDone: body.definitionOfDone || "",
      whyNow: body.whyNow || null,
      calendarUrgency: body.calendarUrgency || 1,
      impact: body.impact || 1,
      iceScore,
      nctId: body.nctId || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      sortOrder: body.sortOrder || 0,
      carriedFromSprintId: body.carriedFromSprintId || null,
      tasks: body.tasks
        ? {
            create: body.tasks.map((t: string, i: number) => ({
              text: t,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { tasks: true, owner: true, nct: true },
  });

  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.scope !== undefined) data.scope = body.scope;
  if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.definitionOfDone !== undefined) data.definitionOfDone = body.definitionOfDone;
  if (body.whyNow !== undefined) data.whyNow = body.whyNow;
  if (body.calendarUrgency !== undefined) data.calendarUrgency = body.calendarUrgency;
  if (body.impact !== undefined) data.impact = body.impact;
  if (body.nctId !== undefined) data.nctId = body.nctId || null;
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  if (body.calendarUrgency !== undefined || body.impact !== undefined) {
    const existing = await prisma.sprintItem.findUnique({ where: { id: body.id } });
    const urgency = body.calendarUrgency ?? existing?.calendarUrgency ?? 1;
    const impact = body.impact ?? existing?.impact ?? 1;
    data.iceScore = calculateIceScore(urgency, impact);
  }

  const item = await prisma.sprintItem.update({
    where: { id: body.id },
    data,
    include: { tasks: true, owner: true, nct: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.sprintItem.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
