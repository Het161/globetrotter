/**
 * Sends both signup emails for real, so the design can be checked in an actual
 * mail client rather than a browser.
 *
 *   pnpm send:test-email                  # both, to OWNER_EMAIL
 *   pnpm send:test-email you@example.com  # both, to that address
 *
 * Verifies the SMTP credentials first, so a wrong app password reports itself
 * as one clear line instead of a silent non-delivery.
 */
import { mailer } from "../src/server/email/transport";
import { welcomeEmail, signupNoticeEmail } from "../src/server/email/templates";

async function main() {
  const active = mailer();
  if (!active) {
    console.error("SMTP_USER / SMTP_PASS are not set in .env — nothing to send.");
    process.exit(1);
  }

  const to = process.argv[2]?.trim() || active.env.owner;
  if (!to) {
    console.error("No recipient. Pass one as an argument, or set OWNER_EMAIL in .env.");
    process.exit(1);
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  process.stdout.write(`verifying ${active.env.user} at ${active.env.host}:${active.env.port} … `);
  await active.transporter.verify();
  console.log("ok");

  const messages = [
    welcomeEmail({ name: "Aarav Mehta", email: to, appUrl }),
    signupNoticeEmail({
      name: "Aarav Mehta",
      email: "aarav.mehta@example.com",
      userId: "cmt46glb9009deoo6e126o3jm",
      signedUpAt: new Date(),
      totalUsers: 3,
      appUrl,
    }),
  ];

  for (const message of messages) {
    const info = await active.transporter.sendMail({
      from: active.env.from,
      to,
      subject: `[test] ${message.subject}`,
      html: message.html,
      text: message.text,
    });
    console.log(`  sent  ${message.subject.padEnd(32)} ${info.messageId}`);
  }

  active.transporter.close();
  console.log(`\nBoth delivered to ${to}.`);
}

main().catch((error) => {
  console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
