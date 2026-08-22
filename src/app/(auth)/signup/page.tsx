import type { Metadata } from "next";
import { AuthFooterLink, AuthHeading } from "@/components/auth/auth-heading";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        eyebrow="Get started"
        title="Create an account"
        description="Build a multi-city itinerary, watch the budget as you go, and share the finished plan."
      />
      <SignupForm />
      <AuthFooterLink prompt="Already have an account?" href="/login" label="Sign in" />
    </>
  );
}
