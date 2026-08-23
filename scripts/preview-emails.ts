/**
 * Renders both signup emails to `.next-dev/email-preview/`.
 *
 *   pnpm preview:emails
 *
 * Nothing is sent and no SMTP config is read — the templates are pure, so they
 * can be looked at without a mailbox. Use this while changing the design;
 * `pnpm send:test-email` is the one that actually posts a message.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { welcomeEmail, signupNoticeEmail } from "../src/server/email/templates";

const OUT = join(process.cwd(), ".next-dev", "email-preview");
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function main() {
  const welcome = welcomeEmail({
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    appUrl,
  });

  const notice = signupNoticeEmail({
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    userId: "cmt46glb9009deoo6e126o3jm",
    signedUpAt: new Date("2026-08-23T09:12:00.000Z"),
    totalUsers: 3,
    appUrl,
  });

  await mkdir(OUT, { recursive: true });

  for (const [file, mail] of [
    ["welcome.html", welcome],
    ["signup-notice.html", notice],
  ] as const) {
    await writeFile(join(OUT, file), mail.html, "utf8");
    await writeFile(join(OUT, file.replace(".html", ".txt")), mail.text, "utf8");
    console.log(`  ${file.padEnd(20)} subject: ${mail.subject}`);
    console.log(
      `  ${"".padEnd(20)} ${(mail.html.length / 1024).toFixed(1)} KB html · ${mail.text.split("\n").length} lines text`,
    );
  }

  console.log(`\nwrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
