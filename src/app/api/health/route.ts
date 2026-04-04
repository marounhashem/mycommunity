import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findUnique({
      where: { email: "admin@terrastate.com" },
      select: { email: true, role: true, hashedPassword: true },
    });

    return NextResponse.json({
      ok: true,
      dbConnected: true,
      userCount,
      adminFound: !!admin,
      adminHasPassword: !!admin?.hashedPassword,
      envCheck: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || "NOT_SET",
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL || "NOT_SET",
        allVarNames: Object.keys(process.env).sort(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      dbConnected: false,
      error: error.message,
      envCheck: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || "NOT_SET",
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL || "NOT_SET",
        allVarNames: Object.keys(process.env).sort(),
      },
    });
  }
}
