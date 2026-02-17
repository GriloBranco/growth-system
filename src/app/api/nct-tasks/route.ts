import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const task = await prisma.nctTask.update({
    where: { id: body.id },
    data: { isDone: body.isDone },
  });

  return NextResponse.json(task);
}
