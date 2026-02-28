import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, avatarUrl: true },
    orderBy: { username: "asc" },
  });
  return NextResponse.json(users);
}
