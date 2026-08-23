import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { requireUser } from "@/server/auth/session";
import { toErrorEnvelope } from "@/server/http/withApi";
import { AppError } from "@/server/http/errors";

/**
 * Avatar and trip-cover upload.
 *
 * Two backends, picked by what the environment actually offers:
 *
 *   · **Vercel Blob**, whenever BLOB_READ_WRITE_TOKEN is present. This is what
 *     production uses, and it is not optional there — a serverless filesystem
 *     is read-only apart from /tmp, and /tmp does not survive the invocation.
 *     Writing into `public/` on Vercel fails with EROFS, and even if it didn't,
 *     the file would vanish before anyone could load it.
 *   · **`public/uploads/`** otherwise, so a local clone with no Vercel account
 *     still has a working upload button.
 *
 * Both return the same `{ url }` shape. The callers render it with a plain
 * `<img>` rather than `next/image`, so an absolute blob URL needs no
 * `remotePatterns` entry.
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
    const body = Buffer.from(await file.arrayBuffer());
    const url = process.env.BLOB_READ_WRITE_TOKEN
      ? await putOnBlob(name, body, file.type)
      : await putOnDisk(name, body);

    const ms = Math.round((performance.now() - started) * 100) / 100;
    return NextResponse.json(
      { ok: true, data: { url }, meta: { ms } },
      { headers: { "Server-Timing": `app;dur=${ms}` } },
    );
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(toErrorEnvelope(error), { status });
  }
}

async function putOnBlob(name: string, body: Buffer, contentType: string): Promise<string> {
  const blob = await put(`uploads/${name}`, body, {
    access: "public",
    contentType,
    // The name is already a nanoid, so the extra suffix would only make the
    // URL longer and harder to read back in the database.
    addRandomSuffix: false,
  });
  return blob.url;
}

async function putOnDisk(name: string, body: Buffer): Promise<string> {
  // Refuse rather than attempt it: on Vercel the write fails with EROFS, which
  // surfaces as a 500 and a stack trace. Saying what is actually wrong, and
  // what fixes it, is worth more than the attempt.
  if (process.env.VERCEL) {
    throw new AppError(
      "VALIDATION",
      503,
      "Image uploads aren't configured on this deployment. Connect a Vercel Blob store to the project so BLOB_READ_WRITE_TOKEN is set.",
    );
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), body);
  return `/uploads/${name}`;
}
