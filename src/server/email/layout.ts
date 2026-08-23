/**
 * The shared shell every GlobeTrotter email renders inside.
 *
 * No `server-only` guard here, deliberately: like the budget and date engines,
 * this file is pure — strings in, a string out, no database, no credentials.
 * That is what lets the templates be unit-tested and rendered to disk by
 * `pnpm preview:emails` without standing up a server. The guard lives on
 * transport.ts and index.ts, which are the parts that hold the SMTP password.
 *
 * Email is not the web. Layout is tables, every style is inline, and there is
 * no flexbox, no grid, no custom fonts and no `gap`. Outlook renders through
 * Word, Gmail strips `<style>` from the clipped view, and a `<div>` with a
 * background is not reliably painted — so widths, padding and colour all sit on
 * `<td>`s, and each one carries `bgcolor` next to `background-color` because
 * some clients honour only the attribute.
 *
 * NIGHT ATLAS, restated in web-safe terms: ink #0A0E1A behind a harbor #121829
 * card, cloud on top, solar for money and the call to action, lagoon for the
 * route. Georgia stands in for the display face and Consolas/Menlo for the mono
 * one, because a webfont cannot be relied on to arrive.
 */

export const PALETTE = {
  ink: "#0A0E1A",
  inkDeep: "#05080F",
  harbor: "#121829",
  deck: "#1A2238",
  cloud: "#F2EEE3",
  fog: "#9AA3B5",
  fogDim: "#6B7385",
  solar: "#F5B62B",
  lagoon: "#36D6C3",
  line: "rgba(242,238,227,0.10)",
} as const;

export const FONT = {
  display: "Georgia, 'Times New Roman', Times, serif",
  ui: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "Consolas, Menlo, Monaco, 'Courier New', monospace",
} as const;

/**
 * Anything interpolated into these templates is user-controlled — a display
 * name is whatever someone typed into the signup form. Escape before it reaches
 * the markup, or a name containing a tag rewrites the email.
 */
export function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A small caps label in the data voice. */
export function eyebrow(text: string, color: string = PALETTE.fog): string {
  return `<div style="font-family:${FONT.mono};font-size:11px;line-height:1.4;letter-spacing:2.5px;text-transform:uppercase;color:${color};">${esc(text)}</div>`;
}

/** The solar call to action, built the bulletproof way so Outlook keeps it. */
export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" bgcolor="${PALETTE.solar}" style="background-color:${PALETTE.solar};border-radius:10px;">
        <a href="${esc(href)}"
           style="display:inline-block;padding:14px 30px;font-family:${FONT.ui};font-size:15px;font-weight:700;line-height:1;color:${PALETTE.ink};text-decoration:none;border-radius:10px;">
          ${esc(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * A label/value table. This is the "well aligned" part: a fixed-width label
 * column so every value starts on the same x, hairline rules between rows, and
 * the values set in mono so ids and timestamps line up character for character.
 */
export function dataTable(rows: { label: string; value: string; accent?: boolean }[]): string {
  const cells = rows
    .map(({ label, value, accent }, i) => {
      const top = i === 0 ? "" : `border-top:1px solid ${PALETTE.line};`;
      return `
      <tr>
        <td width="132" valign="top"
            style="${top}padding:11px 14px 11px 0;font-family:${FONT.mono};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${PALETTE.fogDim};white-space:nowrap;">
          ${esc(label)}
        </td>
        <td valign="top"
            style="${top}padding:11px 0;font-family:${FONT.mono};font-size:13px;line-height:1.5;color:${accent ? PALETTE.solar : PALETTE.cloud};word-break:break-word;">
          ${esc(value)}
        </td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${cells}</table>`;
}

/** Body copy, so paragraphs don't each restate the same six declarations. */
export function paragraph(html: string, color: string = PALETTE.fog): string {
  return `<p style="margin:0 0 14px;font-family:${FONT.ui};font-size:15px;line-height:1.65;color:${color};">${html}</p>`;
}

export type LayoutOptions = {
  /** The grey line after the subject in an inbox list. Never rendered in-body. */
  preheader: string;
  /** Rendered in the display face at the top of the card. */
  heading: string;
  /** Mono kicker above the heading. */
  kicker: string;
  /** Pre-escaped HTML. */
  body: string;
  /** Optional closing line under the hairline. */
  footNote?: string;
};

export function layout({ preheader, kicker, heading, body, footNote }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${PALETTE.ink};">

  <!-- Inbox preview text. Kept out of sight, then padded so the client doesn't
       pull body copy in after it. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    ${esc(preheader)}${"&#8199;&#65279;".repeat(60)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         bgcolor="${PALETTE.ink}" style="background-color:${PALETTE.ink};width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;">

          <!-- Route strip: lagoon running into solar, the way the app colours a
               journey and the money it costs. -->
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="62%" height="3" bgcolor="${PALETTE.lagoon}"
                      style="background-color:${PALETTE.lagoon};height:3px;font-size:0;line-height:0;border-radius:12px 0 0 0;">&nbsp;</td>
                  <td width="38%" height="3" bgcolor="${PALETTE.solar}"
                      style="background-color:${PALETTE.solar};height:3px;font-size:0;line-height:0;border-radius:0 12px 0 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${PALETTE.harbor}"
                style="background-color:${PALETTE.harbor};padding:36px 40px 32px;border-left:1px solid ${PALETTE.line};border-right:1px solid ${PALETTE.line};">

              <!-- Wordmark -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 26px;font-family:${FONT.display};font-size:23px;font-weight:bold;letter-spacing:-0.4px;color:${PALETTE.cloud};">
                    Globe<span style="color:${PALETTE.solar};">Trotter</span>
                  </td>
                </tr>
              </table>

              ${eyebrow(kicker)}

              <h1 style="margin:8px 0 20px;font-family:${FONT.display};font-size:30px;line-height:1.22;font-weight:normal;color:${PALETTE.cloud};">
                ${esc(heading)}
              </h1>

              ${body}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="${PALETTE.inkDeep}"
                style="background-color:${PALETTE.inkDeep};padding:20px 40px 24px;border:1px solid ${PALETTE.line};border-top:none;border-radius:0 0 12px 12px;">
              ${
                footNote
                  ? `<p style="margin:0 0 8px;font-family:${FONT.ui};font-size:12px;line-height:1.6;color:${PALETTE.fogDim};">${footNote}</p>`
                  : ""
              }
              <p style="margin:0;font-family:${FONT.mono};font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:${PALETTE.fogDim};">
                GlobeTrotter &middot; Plan the route &middot; Know the cost
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
