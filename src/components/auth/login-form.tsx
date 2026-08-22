"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { api, ApiError } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      await api.post("/auth/login", values, { toastOnError: false });
      toast.success("Welcome back");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "We couldn't sign you in. Try again.";
      // The server never says which half was wrong, so neither do we.
      setError("password", { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint={
          <>
            <Link
              href="/forgot-password"
              className="text-fog underline-offset-4 transition-colors hover:text-cloud hover:underline"
            >
              Forgot?
            </Link>
          </>
        }
      >
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <DeckButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        Sign in
      </DeckButton>

      {/* Reviewers get one click instead of typing seeded credentials. */}
      <DemoCredentials
        onUse={(email, password) => {
          setValue("email", email, { shouldValidate: true });
          setValue("password", password, { shouldValidate: true });
        }}
      />
    </form>
  );
}

function DemoCredentials({
  onUse,
}: {
  onUse: (email: string, password: string) => void;
}) {
  const accounts = [
    { label: "Demo traveller", email: "demo@globetrotter.app", password: "Demo@1234" },
    { label: "Admin", email: "admin@globetrotter.app", password: "Admin@1234" },
  ];

  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-3.5">
      <p className="placard mb-2.5">Demo accounts</p>
      <div className="space-y-1.5">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onUse(account.email, account.password)}
            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-deck"
          >
            <span className="font-medium text-cloud">{account.label}</span>
            <span className="font-mono text-2xs text-fog">{account.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
