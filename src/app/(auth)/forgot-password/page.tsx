import type { Metadata } from "next";
import { AuthFooterLink, AuthHeading } from "@/components/auth/auth-heading";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        eyebrow="Password reset"
        title="Forgot your password?"
        description="Enter the email you signed up with and we'll send a link to set a new one."
      />
      <ForgotForm />
      <AuthFooterLink prompt="Remembered it?" href="/login" label="Sign in" />
    </>
  );
}
