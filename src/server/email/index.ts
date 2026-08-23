import "server-only";
import { db } from "@/server/db";
import { mailer } from "./transport";
import { welcomeEmail, signupNoticeEmail } from "./templates";

export { welcomeEmail, signupNoticeEmail } from "./templates";
export { mailer, resetMailer } from "./transport";

/**
 * Sending, and the rule that governs it: **an email may never fail a request.**
 *
 * Same discipline as logEvent in services/analytics — signup writes the user,
 * sets the cookie and returns, and the two messages go out beside it. A
 * mistyped app password, a Gmail rate limit or an unplugged network cable
 * shows up as one line on the server log, not as a failed signup for the
 * person in front of you.
 */

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

type Message = { subject: string; html: string; text: string };

/**
 * Successful sends are not logged. App code here prints only warnings and
 * errors — see the no-console rule in eslint.config.mjs — and a delivery that
 * worked is neither. To watch messages actually go out, use the CLI:
 * `pnpm send:test-email`, which is a script and prints message ids.
 */
async function deliver(to: string, message: Message): Promise<void> {
  const active = mailer();
  if (!active) return;

  await active.transporter.sendMail({
    from: active.env.from,
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

/**
 * Fires both signup messages without awaiting either.
 *
 * Deliberately not exported as a promise: callers should not be able to await
 * this by accident and put a 2-second SMTP round trip inside a signup response.
 * On a long-lived server the sends finish in the background. On a
 * serverless platform this is the spot that would need an
 * `after()` / queue instead — noted rather than pretended otherwise.
 */
export function sendSignupEmails(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): void {
  if (!mailer()) return;

  void (async () => {
    const base = appUrl();

    // Sequential, not Promise.all: the pool holds two connections and Gmail is
    // happier with one conversation at a time than with a burst it might defer.
    try {
      await deliver(user.email, welcomeEmail({ name: user.name, email: user.email, appUrl: base }));
    } catch (error) {
      console.error(`[mail] welcome to ${user.email} failed:`, describe(error));
    }

    const owner = mailer()?.env.owner;
    if (!owner) return;

    try {
      // Read live rather than passing a number in: the notification claims to
      // be a snapshot of the database, so it should actually ask it.
      const totalUsers = await db.user.count();
      await deliver(
        owner,
        signupNoticeEmail({
          name: user.name,
          email: user.email,
          userId: user.id,
          signedUpAt: user.createdAt,
          totalUsers,
          appUrl: base,
        }),
      );
    } catch (error) {
      console.error(`[mail] signup notice to ${owner} failed:`, describe(error));
    }
  })();
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // Nodemailer hangs an SMTP code off the error; it is the part worth reading.
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code} — ${error.message}` : error.message;
  }
  return String(error);
}
