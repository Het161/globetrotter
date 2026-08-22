import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import { requireUser } from "@/server/auth/session";
import { toErrorEnvelope } from "@/server/http/withApi";
import { AppError } from "@/server/http/errors";

/**
 * Local file upload — avatars and trip covers land in `public/uploads/`.
 *
 * Multipart, so this one route can't use `withApi` (which parses JSON). It
 * still returns the same envelope and the same error vocabulary.
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const started = performance.now();

  try {
    await requireUser();

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError("VALIDATION", 400, "Choose an image to upload.");
    }
    if (file.size > MAX_BYTES) {
      throw new AppError("VALIDATION", 400, "Images need to be 2 MB or smaller.");
    }

    const extension = ALLOWED[file.type];
    if (!extension) {
      throw new AppError("VALIDATION", 400, "Use a JPEG, PNG or WebP image.");
    }

    const name = `${nanoid(16)}.${extension}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

    const ms = Math.round((performance.now() - started) * 100) / 100;
    return NextResponse.json(
      { ok: true, data: { url: `/uploads/${name}` }, meta: { ms } },
      { headers: { "Server-Timing": `app;dur=${ms}` } },
    );
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(toErrorEnvelope(error), { status });
  }
}
