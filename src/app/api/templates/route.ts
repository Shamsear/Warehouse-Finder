import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/templates
export async function GET() {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const template = await prisma.messageTemplate.create({
      data: {
        name: body.name,
        body: body.body,
        language: body.language || "en",
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
