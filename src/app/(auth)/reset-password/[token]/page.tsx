import type { Metadata } from "next";
import { AuthFooterLink, AuthHeading } from "@/components/auth/auth-heading";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <AuthHeading
        eyebrow="Password reset"
        title="Set a new password"
        description="Choose something you haven't used here before. The link works once."
      />
      <ResetForm token={token} />
      <AuthFooterLink prompt="Changed your mind?" href="/login" label="Sign in" />
    </>
  );
}
