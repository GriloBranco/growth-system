import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const members = await prisma.teamMember.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const member = await prisma.teamMember.create({
    data: { name: body.name, role: body.role || null },
  });
  return NextResponse.json(member);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.teamMember.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
