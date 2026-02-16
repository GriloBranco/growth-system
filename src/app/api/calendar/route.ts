import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const alerts = searchParams.get("alerts");

  const where: Record<string, unknown> = {};

  if (state && state !== "ALL") {
    where.OR = [
      { states: { contains: state } },
      { states: "ALL" },
    ];
  }

  if (type) {
    where.type = type;
  }

  if (from || to) {
    where.startDate = {};
    if (from) (where.startDate as Record<string, unknown>).gte = new Date(from);
    if (to) (where.startDate as Record<string, unknown>).lte = new Date(to);
  }

  // Alerts: events with prep windows opening in the next 30 days or events starting within 30 days
  if (alerts === "true") {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    where.OR = [
      { startDate: { gte: now, lte: thirtyDays } },
      { prepStartDate: { gte: now, lte: thirtyDays } },
      { prepStartDate: { lte: now }, startDate: { gte: now } },
    ];
    delete where.startDate;
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const event = await prisma.calendarEvent.create({
    data: {
      name: body.name,
      type: body.type,
      states: body.states,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      prepStartDate: body.prepStartDate ? new Date(body.prepStartDate) : null,
      relevanceNote: body.relevanceNote || null,
      isRecurring: body.isRecurring ?? true,
    },
  });
  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.states !== undefined) data.states = body.states;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.prepStartDate !== undefined) data.prepStartDate = body.prepStartDate ? new Date(body.prepStartDate) : null;
  if (body.relevanceNote !== undefined) data.relevanceNote = body.relevanceNote;
  if (body.isRecurring !== undefined) data.isRecurring = body.isRecurring;

  const event = await prisma.calendarEvent.update({ where: { id: body.id }, data });
  return NextResponse.json(event);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.calendarEvent.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
