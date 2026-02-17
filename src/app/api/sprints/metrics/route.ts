import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sprints = await prisma.sprint.findMany({
      where: { status: { in: ["completed", "archived"] } },
      include: {
        items: {
          include: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const metrics = sprints.map((sprint) => {
      const totalItems = sprint.items.length;
      const completedItems = sprint.items.filter((i) => i.status === "done").length;
      const totalTasks = sprint.items.reduce((sum, i) => sum + i.tasks.length, 0);
      const completedTasks = sprint.items.reduce((sum, i) => sum + i.tasks.filter((t) => t.isDone).length, 0);
      const itemCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        totalItems,
        completedItems,
        totalTasks,
        completedTasks,
        itemCompletionRate,
        taskCompletionRate,
      };
    });

    // Calculate trend from last 5 sprints
    const recent = metrics.slice(0, 5);
    let trend: "improving" | "declining" | "stable" = "stable";
    if (recent.length >= 2) {
      const older = recent.slice(Math.floor(recent.length / 2));
      const newer = recent.slice(0, Math.floor(recent.length / 2));
      const olderAvg = older.reduce((s, m) => s + m.taskCompletionRate, 0) / older.length;
      const newerAvg = newer.reduce((s, m) => s + m.taskCompletionRate, 0) / newer.length;
      const diff = newerAvg - olderAvg;
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }

    return NextResponse.json({ metrics, trend });
  } catch (e) {
    console.error("Metrics error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
