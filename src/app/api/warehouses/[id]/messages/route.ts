import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/warehouses/[id]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const messages = await prisma.message.findMany({
      where: { warehouseId: parseInt(id) },
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST /api/warehouses/[id]/messages — Log a sent message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const message = await prisma.message.create({
      data: {
        warehouseId: parseInt(id),
        content: body.content,
        direction: body.direction || "outgoing",
      },
    });

    // Also update the warehouse status and last contacted date
    if (body.direction === "outgoing") {
      await prisma.warehouse.update({
        where: { id: parseInt(id) },
        data: {
          status: "contacted",
          lastContactedAt: new Date(),
        },
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
