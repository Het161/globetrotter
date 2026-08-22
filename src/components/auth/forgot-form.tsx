"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { forgotSchema, type ForgotInput } from "@/lib/validators/auth";
import { api } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, Input } from "@/components/ui/field";

type ForgotResponse = { message: string; devResetUrl?: string };

export function ForgotForm() {
  const [sent, setSent] = React.useState<ForgotResponse | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotInput) {
    const result = await api.post<ForgotResponse>("/auth/forgot", values);
    setSent(result);
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="surface flex gap-3.5 p-4">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-lagoon" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-cloud">{sent.message}</p>
            <p className="mt-1 text-xs text-fog">
              Sent to <span className="font-mono">{getValues("email")}</span>. The link is good
              for 30 minutes.
            </p>
          </div>
        </div>

        {/* No mail provider in this build, so development surfaces the link. */}
        {sent.devResetUrl ? <DevResetLink url={sent.devResetUrl} /> : null}

        <DeckButton asChild variant="secondary" size="lg" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </DeckButton>
      </div>
    );
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

      <DeckButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        Send reset link
      </DeckButton>
    </form>
  );
}

function DevResetLink({ url }: { url: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-solar/35 bg-solar/[0.06] p-3.5">
      <p className="placard mb-2 text-solar/80">Development only</p>
      <p className="mb-2.5 text-xs text-fog">
        This build has no email provider, so the reset link is shown here instead.
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={url.replace(/^https?:\/\/[^/]+/, "")}
          className="min-w-0 flex-1 truncate rounded-md bg-deck px-2.5 py-2 font-mono text-2xs text-lagoon underline-offset-4 hover:underline"
        >
          {url}
        </Link>
        <DeckButton
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Copy reset link"
          onClick={() => {
            void navigator.clipboard.writeText(url);
            toast.success("Reset link copied");
          }}
        >
          <Copy />
        </DeckButton>
      </div>
    </div>
  );
}
