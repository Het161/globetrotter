import { layout, dataTable, paragraph, button, eyebrow, esc, PALETTE, FONT } from "./layout";

/**
 * The two messages signup sends: one to the person who just joined, one to
 * whoever runs the instance.
 *
 * Each returns `text` as well as `html`. A plain-text alternative is not
 * decoration — spam scoring counts an HTML-only message against you, and it is
 * the version a watch or a screen reader gets.
 */

export type WelcomeInput = {
  name: string;
  email: string;
  appUrl: string;
};

export type SignupNoticeInput = {
  name: string;
  email: string;
  userId: string;
  signedUpAt: Date;
  totalUsers: number;
  appUrl: string;
};

/** "24 Mar 2027, 14:42 IST" — the format the app already uses for dates. */
function stamp(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** The first name alone, so the greeting doesn't read like a form letter. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

/* -------------------------------------------------------------------------- */
/* 1. Welcome — to the new user                                               */
/* -------------------------------------------------------------------------- */

export function welcomeEmail({ name, email, appUrl }: WelcomeInput) {
  const who = firstName(name);

  /** Three things the product does, in the order someone will do them. */
  const steps: { n: string; title: string; copy: string; colour: string }[] = [
    {
      n: "01",
      colour: PALETTE.lagoon,
      title: "Build the route",
      copy: "Add cities in any order. Drag one and every date after it re-flows, with its activities still attached.",
    },
    {
      n: "02",
      colour: PALETTE.solar,
      title: "Watch the money",
      copy: "Stay, travel, food and activities add up as you plan — broken down by day, and flagged when a day goes over.",
    },
    {
      n: "03",
      colour: PALETTE.cloud,
      title: "Share the story",
      copy: "Publish a read-only page anyone can open. No account needed to look, one button to copy it.",
    },
  ];

  const stepRows = steps
    .map(
      (s, i) => `
    <tr>
      <td valign="top" width="42" style="padding:${i === 0 ? "0" : "16px"} 0 0;">
        <div style="font-family:${FONT.mono};font-size:15px;font-weight:bold;color:${s.colour};">${s.n}</div>
      </td>
      <td valign="top" style="padding:${i === 0 ? "0" : "16px"} 0 0;">
        <div style="font-family:${FONT.ui};font-size:15px;font-weight:700;color:${PALETTE.cloud};padding-bottom:3px;">${esc(s.title)}</div>
        <div style="font-family:${FONT.ui};font-size:14px;line-height:1.6;color:${PALETTE.fog};">${esc(s.copy)}</div>
      </td>
    </tr>`,
    )
    .join("");

  const body = `
    ${paragraph(`Your account is ready, and you're signed in on the device you just used. Here's what GlobeTrotter is for.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="width:100%;margin:24px 0 6px;">
      <tr>
        <td bgcolor="${PALETTE.deck}" style="background-color:${PALETTE.deck};padding:22px 24px;border-radius:10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${stepRows}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:26px 0 8px;">${button("Plan your first trip", `${appUrl}/trips/new`)}</td></tr>
    </table>

    ${paragraph(
      `Or start from the map — there are <strong style="color:${PALETTE.cloud};">48 cities</strong> with real nightly costs already loaded, so a plan gets a believable total from the first stop. <a href="${esc(appUrl)}/explore" style="color:${PALETTE.lagoon};text-decoration:underline;">Browse them &rarr;</a>`,
    )}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
      <tr><td style="border-top:1px solid ${PALETTE.line};padding-top:16px;">
        ${eyebrow("Signed up with")}
        <div style="font-family:${FONT.mono};font-size:13px;color:${PALETTE.cloud};padding-top:6px;">${esc(email)}</div>
      </td></tr>
    </table>`;

  return {
    subject: "Welcome to GlobeTrotter",
    html: layout({
      preheader: `Your account is ready, ${who}. Plan a multi-city trip and know what it costs before you book.`,
      kicker: "Welcome aboard",
      heading: `Welcome, ${who}.`,
      body,
      footNote: `You're receiving this because someone signed up at GlobeTrotter using ${esc(email)}. If that wasn't you, you can ignore this message — no trips have been created.`,
    }),
    text: [
      `WELCOME ABOARD`,
      ``,
      `Welcome, ${who}.`,
      ``,
      `Your account is ready, and you're signed in on the device you just used.`,
      `Here's what GlobeTrotter is for.`,
      ``,
      ...steps.flatMap((s) => [`${s.n}  ${s.title}`, `    ${s.copy}`, ``]),
      `Plan your first trip: ${appUrl}/trips/new`,
      `Browse 48 cities with real nightly costs: ${appUrl}/explore`,
      ``,
      `Signed up with: ${email}`,
      ``,
      `--`,
      `GlobeTrotter - Plan the route, know the cost, share the story.`,
      `If this wasn't you, ignore this message. No trips have been created.`,
    ].join("\n"),
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Signup notice — to the owner                                            */
/* -------------------------------------------------------------------------- */

export function signupNoticeEmail(input: SignupNoticeInput) {
  const { name, email, userId, signedUpAt, totalUsers, appUrl } = input;

  const rows = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    { label: "User ID", value: userId },
    { label: "Signed up", value: stamp(signedUpAt) },
    { label: "Total users", value: String(totalUsers), accent: true },
  ];

  const body = `
    ${paragraph(`A new account was created on GlobeTrotter.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;">
      <tr>
        <td bgcolor="${PALETTE.deck}" style="background-color:${PALETTE.deck};padding:6px 24px 12px;border-radius:10px;">
          ${dataTable(rows)}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:26px 0 0;">${button("Open the admin dashboard", `${appUrl}/admin`)}</td></tr>
    </table>`;

  return {
    subject: `New signup — ${name}`,
    html: layout({
      preheader: `${name} (${email}) just created an account. That's ${totalUsers} user${totalUsers === 1 ? "" : "s"} in total.`,
      kicker: "New signup",
      heading: name,
      body,
      footNote: `Sent automatically on signup. Every figure here is read live from the database at the moment the account was created.`,
    }),
    text: [
      `NEW SIGNUP`,
      ``,
      ...rows.map((r) => `${r.label.padEnd(13)}${r.value}`),
      ``,
      `Admin dashboard: ${appUrl}/admin`,
      ``,
      `--`,
      `Sent automatically on signup.`,
    ].join("\n"),
  };
}
