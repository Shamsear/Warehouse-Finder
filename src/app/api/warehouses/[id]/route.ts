import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/warehouses/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: parseInt(id) },
      include: {
        contacts: true,
        messages: { orderBy: { sentAt: "desc" } },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(warehouse);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PUT /api/warehouses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const warehouse = await prisma.warehouse.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        address: body.address,
        city: body.city,
        country: body.country,
        freeZone: body.freeZone,
        phone: body.phone,
        email: body.email,
        website: body.website,
        status: body.status,
        priority: body.priority,
        notes: body.notes,
        tags: body.tags,
        lastContactedAt: body.lastContactedAt,
        nextFollowUpAt: body.nextFollowUpAt,
      },
    });
    return NextResponse.json(warehouse);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/warehouses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.warehouse.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
