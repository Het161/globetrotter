import "server-only";
import { after } from "next/server";
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
 * Fires both signup messages without making the caller wait for either.
 *
 * The work is handed to Next's `after()`, which is the difference between this
 * working locally and working in production. A bare detached promise survives
 * on a long-lived Node server, but on a serverless platform the function is
 * frozen the moment the response is flushed — the SMTP dialogue would be cut
 * off mid-sentence and the email would silently never arrive. `after()` keeps
 * the invocation alive until the callback settles, while still letting the
 * response go out first.
 *
 * Outside a request there is no `after()` to call — a CLI script, a test — so
 * that case falls back to detaching, where nothing is going to freeze anyway.
 */
export function sendSignupEmails(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}): void {
  if (!mailer()) return;

  const work = async () => {
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
  };

  try {
    after(work);
  } catch {
    // No request context — a script or a test. Nothing is about to freeze the
    // process here, so detaching is safe and keeps the caller non-blocking.
    void work();
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // Nodemailer hangs an SMTP code off the error; it is the part worth reading.
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code} — ${error.message}` : error.message;
  }
  return String(error);
}
