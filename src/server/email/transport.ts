import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * One SMTP connection pool for the process.
 *
 * Email is treated as optional infrastructure. With no SMTP_USER or SMTP_PASS
 * the transport is simply absent and every send becomes a logged no-op —
 * cloning this repo and signing up has to work without anyone's mailbox
 * credentials, and a hackathon judge should not hit a stack trace because the
 * .env they copied has empty mail settings.
 */

export type MailEnv = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  owner: string | null;
};

function readEnv(): MailEnv | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    user,
    pass,
    // Gmail rewrites From to the authenticated account anyway, so falling back
    // to `user` keeps the header honest rather than silently mismatched.
    from: process.env.MAIL_FROM?.trim() || `GlobeTrotter <${user}>`,
    owner: process.env.OWNER_EMAIL?.trim() || null,
  };
}

let cached: { env: MailEnv; transporter: Transporter } | null | undefined;

export function mailer(): { env: MailEnv; transporter: Transporter } | null {
  if (cached !== undefined) return cached;

  const env = readEnv();
  if (!env) {
    // A warning rather than a silence: a configured feature being off is
    // something you want to notice, and it is the first thing to check when
    // "the welcome email didn't arrive".
    console.warn("[mail] SMTP_USER/SMTP_PASS not set — email is disabled");
    cached = null;
    return null;
  }

  cached = {
    env,
    transporter: nodemailer.createTransport({
      host: env.host,
      port: env.port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
      secure: env.port === 465,
      auth: { user: env.user, pass: env.pass },
      // Signup fires two messages back to back, so reuse the connection.
      pool: true,
      maxConnections: 2,
      // Bounded so a hung SMTP dialogue can't keep a request alive; the send is
      // detached from the response anyway, but the socket should still let go.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  };
  return cached;
}

/** Only for tests and scripts — drops the pool so the next call re-reads env. */
export function resetMailer(): void {
  if (cached) void cached.transporter.close();
  cached = undefined;
}
