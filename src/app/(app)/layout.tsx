import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { AppShell } from "@/components/layout/app-shell";

/**
 * The auth guard for every signed-in screen.
 *
 * This is a layout rather than middleware on purpose: the session check needs
 * the database (a deleted or demoted account has to stop working immediately),
 * and middleware runs on the edge without it. Keeping it here also means one
 * `getSession()` per request thanks to React.cache.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
