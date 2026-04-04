import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authOptions } from "@/lib/auth";
import { r2, R2_BUCKET } from "@/lib/r2";
import { randomUUID } from "crypto";

const ALLOWED_PREFIXES = ["tickets/pending", "announcements", "renovations", "violations"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename, contentType, prefix } = await request.json();

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const resolvedPrefix = prefix && ALLOWED_PREFIXES.includes(prefix)
    ? prefix
    : "tickets/pending";

  const key = `${resolvedPrefix}/${randomUUID()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2, command, { expiresIn: 600 });

  return NextResponse.json({ url, key });
}
