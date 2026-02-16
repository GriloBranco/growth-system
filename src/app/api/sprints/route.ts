import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (active === "true") where.status = "active";

  const sprints = await prisma.sprint.findMany({
    where,
    include: {
      items: {
        include: { tasks: { orderBy: { sortOrder: "asc" } }, owner: true, nct: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sprints);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // If there's an active sprint, archive it
  if (body.archiveCurrent) {
    await prisma.sprint.updateMany({
      where: { status: "active" },
      data: { status: "archived" },
    });
  }

  const sprint = await prisma.sprint.create({
    data: {
      name: body.name || null,
      startDate: new Date(body.startDate || new Date()),
      endDate: new Date(body.endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
      status: "active",
      transcriptText: body.transcriptText || null,
    },
    include: {
      items: { include: { tasks: true, owner: true, nct: true } },
    },
  });

  return NextResponse.json(sprint);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.status !== undefined) data.status = body.status;
  if (body.performanceNotes !== undefined) data.performanceNotes = body.performanceNotes;

  // Complete sprint flow
  if (body.complete) {
    data.status = "completed";

    // Handle carry-over items
    if (body.carryOverItemIds && body.carryOverItemIds.length > 0 && body.newSprintId) {
      for (const itemId of body.carryOverItemIds) {
        const item = await prisma.sprintItem.findUnique({
          where: { id: itemId },
          include: { tasks: true },
        });
        if (item) {
          await prisma.sprintItem.create({
            data: {
              sprintId: body.newSprintId,
              name: item.name,
              scope: item.scope,
              ownerId: item.ownerId,
              status: "not_started",
              definitionOfDone: item.definitionOfDone,
              whyNow: item.whyNow,
              calendarUrgency: item.calendarUrgency,
              impact: item.impact,
              iceScore: item.iceScore,
              nctId: item.nctId,
              deadline: item.deadline,
              carriedFromSprintId: body.id,
              tasks: {
                create: item.tasks.map((t) => ({
                  text: t.text,
                  isDone: false,
                  sortOrder: t.sortOrder,
                })),
              },
            },
          });
        }
      }
    }

    // Move remaining incomplete items to backlog
    if (body.moveToBacklogItemIds && body.moveToBacklogItemIds.length > 0) {
      for (const itemId of body.moveToBacklogItemIds) {
        const item = await prisma.sprintItem.findUnique({ where: { id: itemId } });
        if (item) {
          await prisma.backlogItem.create({
            data: {
              name: item.name,
              scope: item.scope,
              description: item.definitionOfDone,
              calendarUrgency: item.calendarUrgency,
              impact: item.impact,
              iceScore: item.iceScore,
              nctId: item.nctId,
            },
          });
        }
      }
    }
  }

  const sprint = await prisma.sprint.update({
    where: { id: body.id },
    data,
    include: {
      items: { include: { tasks: true, owner: true, nct: true } },
    },
  });

  return NextResponse.json(sprint);
}
