import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      total,
      byCountry,
      byStatus,
      byCity,
      byFreeZone,
      bySource,
      withPhone,
      withEmail,
      recentlyContacted,
      dueFollowUp,
    ] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.groupBy({ by: ["country"], _count: true }),
      prisma.warehouse.groupBy({ by: ["status"], _count: true }),
      prisma.warehouse.groupBy({ by: ["city"], _count: true, orderBy: { _count: { city: "desc" } }, take: 20 }),
      prisma.warehouse.groupBy({ by: ["freeZone"], _count: true, where: { freeZone: { not: null } }, orderBy: { _count: { freeZone: "desc" } }, take: 20 }),
      prisma.warehouse.groupBy({ by: ["source"], _count: true }),
      prisma.warehouse.count({ where: { phone: { not: null } } }),
      prisma.warehouse.count({ where: { email: { not: null } } }),
      prisma.warehouse.count({ where: { lastContactedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.warehouse.count({ where: { nextFollowUpAt: { lte: new Date() }, status: { notIn: ["closed", "not_interested"] } } }),
    ]);

    return NextResponse.json({
      total,
      withPhone,
      withEmail,
      recentlyContacted,
      dueFollowUp,
      byCountry: Object.fromEntries(byCountry.map((r) => [r.country, r._count])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      byCity: byCity.map((r) => ({ city: r.city, count: r._count })),
      byFreeZone: byFreeZone.map((r) => ({ freeZone: r.freeZone, count: r._count })),
      bySource: Object.fromEntries(bySource.map((r) => [r.source, r._count])),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
