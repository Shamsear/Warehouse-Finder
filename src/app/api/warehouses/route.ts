import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/warehouses — List warehouses with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || "";
  const country = searchParams.get("country") || "";
  const city = searchParams.get("city") || "";
  const freeZone = searchParams.get("freeZone") || "";
  const status = searchParams.get("status") || "";
  const hasPhone = searchParams.get("hasPhone") || "";
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (country) where.country = country;
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (freeZone) where.freeZone = { contains: freeZone, mode: "insensitive" };
  if (status) where.status = status;
  if (hasPhone === "true") where.phone = { not: null };
  if (hasPhone === "false") where.phone = null;

  try {
    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        include: { contacts: true, _count: { select: { messages: true } } },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.warehouse.count({ where }),
    ]);

    return NextResponse.json({
      warehouses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

// POST /api/warehouses — Create a warehouse manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const warehouse = await prisma.warehouse.create({
      data: {
        name: body.name,
        address: body.address,
        city: body.city,
        country: body.country,
        freeZone: body.freeZone,
        phone: body.phone,
        email: body.email,
        website: body.website,
        tags: body.tags || [],
        source: "manual",
      },
    });
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
