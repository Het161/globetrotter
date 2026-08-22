import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { Backdrop } from "@/components/ui/backdrop";
import { Logo } from "@/components/layout/logo";
import { AuthShowcase } from "@/components/auth/auth-showcase";

/**
 * Split layout: the form on the left, the Night Atlas showcase on the right.
 *
 * The showcase is desktop-only — on a phone it would push the form below the
 * fold, and the form is the entire job of this screen.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in? There is nothing here for you.
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <div className="relative min-h-dvh">
      <Backdrop variant="rich" />

      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Form column */}
        <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-14">
          <Link href="/" className="mb-auto inline-flex w-fit" aria-label="GlobeTrotter home">
            <Logo />
          </Link>

          <main className="mx-auto w-full max-w-sm py-10">{children}</main>

          <footer className="mt-auto pt-8 text-xs text-fog-dim">
            <p>Plan the route. Know the cost. Share the story.</p>
          </footer>
        </div>

        {/* Showcase column */}
        <AuthShowcase />
      </div>
    </div>
  );
}
