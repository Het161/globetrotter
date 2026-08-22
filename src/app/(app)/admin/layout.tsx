import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

/** Second guard: signed in isn't enough for /admin. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <>{children}</>;
}
