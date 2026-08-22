"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validators/profile";
import { api, fieldErrors } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, FieldGroup, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordMeter } from "@/components/auth/password-meter";

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirm: "" },
  });

  // useWatch rather than watch(): it subscribes without returning a fresh
  // function each render, so the React Compiler can still memoize this form.
  const password = useWatch({ control, name: "password" });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await api.post("/me/password", values, { toastOnError: false });
      toast.success("Password updated");
      reset();
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          setError(name as keyof ChangePasswordInput, { message });
        }
      } else {
        toast.error("We couldn't change your password.");
      }
    }
  }

  return (
    <FieldGroup title="Password" description="Use something you haven't used here before.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          label="Current password"
          htmlFor="currentPassword"
          error={errors.currentPassword?.message}
        >
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            invalid={Boolean(errors.currentPassword)}
            {...register("currentPassword")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </Field>

          <Field label="Confirm" htmlFor="confirm" error={errors.confirm?.message}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              {...register("confirm")}
            />
          </Field>
        </div>

        <PasswordMeter password={password} />

        <div className="flex justify-end">
          <DeckButton type="submit" variant="secondary" loading={isSubmitting}>
            Update password
          </DeckButton>
        </div>
      </form>
    </FieldGroup>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Deleting an account cascades through every trip, stop, activity and expense,
 * so it asks for the word DELETE rather than an "are you sure" that people
 * click through on reflex.
 */
export function DangerZone() {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const armed = confirm === "DELETE";

  async function deleteAccount() {
    if (!armed) return;
    setBusy(true);

    try {
      await api.delete("/me");
      toast.success("Account deleted");
      router.push("/");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-ember/25 bg-ember/[0.04] p-5 sm:p-6">
      <header className="mb-4 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ember" aria-hidden />
        <div>
          <h2 className="text-lg font-medium text-cloud">Delete this account</h2>
          <p className="mt-1 text-sm text-fog">
            Every trip, stop, activity and saved destination goes with it. There is no undo.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Type DELETE to confirm"
          htmlFor="confirm-delete"
          className="flex-1"
        >
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        <DeckButton
          variant="danger"
          disabled={!armed}
          loading={busy}
          onClick={deleteAccount}
        >
          Delete account
        </DeckButton>
      </div>
    </section>
  );
}
