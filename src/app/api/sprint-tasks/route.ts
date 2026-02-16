import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = await prisma.sprintTask.create({
    data: {
      sprintItemId: body.sprintItemId,
      text: body.text,
      sortOrder: body.sortOrder || 0,
    },
  });
  return NextResponse.json(task);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.isDone !== undefined) data.isDone = body.isDone;
  if (body.text !== undefined) data.text = body.text;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const task = await prisma.sprintTask.update({ where: { id: body.id }, data });
  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.sprintTask.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
