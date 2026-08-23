import { describe, expect, it } from "vitest";
import { welcomeEmail, signupNoticeEmail } from "./templates";
import { esc, dataTable } from "./layout";

const APP = "https://globetrotter.test";

const user = {
  name: "Aarav Mehta",
  email: "aarav.mehta@example.com",
  userId: "cmt46glb9009deoo6e126o3jm",
  signedUpAt: new Date("2026-08-23T09:12:00.000Z"),
  totalUsers: 3,
  appUrl: APP,
};

describe("esc", () => {
  it("neutralises every character that could break out of markup", () => {
    expect(esc(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(esc("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });

  it("renders null and undefined as nothing rather than the words", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });

  it("escapes the ampersand first, so an entity isn't double-encoded wrongly", () => {
    // &lt; not &amp;lt; — the order of replacements matters here.
    expect(esc("<")).toBe("&lt;");
  });
});

describe("welcomeEmail", () => {
  const mail = welcomeEmail({ name: user.name, email: user.email, appUrl: APP });

  it("greets by first name only", () => {
    expect(mail.html).toContain("Welcome, Aarav.");
    expect(mail.text).toContain("Welcome, Aarav.");
  });

  it("links to this deployment, not a hard-coded host", () => {
    expect(mail.html).toContain(`${APP}/trips/new`);
    expect(mail.html).toContain(`${APP}/explore`);
    expect(mail.html).not.toContain("localhost");
  });

  it("ships a plain-text alternative that is not just stripped markup", () => {
    expect(mail.text).not.toContain("<");
    expect(mail.text).toContain("Build the route");
    expect(mail.text).toContain(user.email);
  });

  it("is a complete document with the preheader ahead of the visible body", () => {
    expect(mail.html.startsWith("<!doctype html>")).toBe(true);
    // Compared against the <h1>, not the first occurrence of the heading text:
    // that also appears in <title>, which legitimately precedes the preheader.
    const preheaderAt = mail.html.indexOf("Your account is ready, Aarav");
    expect(preheaderAt).toBeGreaterThan(-1);
    expect(preheaderAt).toBeLessThan(mail.html.indexOf("<h1"));
  });
});

describe("signupNoticeEmail", () => {
  const mail = signupNoticeEmail(user);

  it("names the person in the subject, so the inbox list is readable", () => {
    expect(mail.subject).toBe("New signup — Aarav Mehta");
  });

  it("carries every field the owner needs to identify the account", () => {
    for (const value of [user.name, user.email, user.userId, "3"]) {
      expect(mail.html).toContain(value);
      expect(mail.text).toContain(value);
    }
  });

  it("stamps the time in IST rather than UTC", () => {
    // 09:12 UTC is 14:42 in Asia/Kolkata.
    expect(mail.html).toContain("2:42");
    expect(mail.html).toContain("23 Aug 2026");
  });

  it("agrees with itself about the user count in subject line and body", () => {
    const one = signupNoticeEmail({ ...user, totalUsers: 1 });
    expect(one.html).toContain("1 user in total");
    expect(mail.html).toContain("3 users in total");
  });
});

describe("injection through user-controlled fields", () => {
  const hostile = {
    ...user,
    name: `<img src=x onerror="alert(1)">`,
    email: `"><script>alert(2)</script>@example.com`,
  };

  it("emits no live markup through the name or email in either template", () => {
    for (const html of [
      signupNoticeEmail(hostile).html,
      welcomeEmail({ name: hostile.name, email: hostile.email, appUrl: APP }).html,
    ]) {
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<script>alert");
      // The word "onerror=" survives as escaped text, which is inert, so its
      // presence proves nothing. What matters is the quote after it: `onerror="`
      // would be a live attribute, `onerror=&quot;` is characters on a page.
      expect(html).not.toContain(`onerror="`);
      expect(html).toContain("&lt;img");
    }
  });

  it("keeps the whole hostile name visible, escaped, in the owner's copy", () => {
    // The welcome mail greets by first name and so truncates at the space; the
    // notice is a record and must show exactly what was submitted.
    expect(signupNoticeEmail(hostile).html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("escapes inside the data table too, not only the heading", () => {
    const html = dataTable([{ label: "Name", value: "<b>bold</b>" }]);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });
});
