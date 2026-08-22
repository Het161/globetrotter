import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthFooterLink, AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading
        eyebrow="Welcome back"
        title="Sign in"
        description="Pick up wherever you left off — your trips, stops and budgets are waiting."
      />

      {/* useSearchParams needs a boundary so the shell can stream. */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <LoginForm />
      </Suspense>

      <AuthFooterLink prompt="New here?" href="/signup" label="Create an account" />
    </>
  );
}
