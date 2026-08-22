"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetSchema, type ResetInput } from "@/lib/validators/auth";
import { api, fieldErrors, errorMessage } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { PasswordMeter } from "./password-meter";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token, password: "", confirm: "" },
  });

  // useWatch rather than watch(): it subscribes without returning a fresh
  // function each render, so the React Compiler can still memoize this form.
  const password = useWatch({ control, name: "password" });

  async function onSubmit(values: ResetInput) {
    try {
      await api.post("/auth/reset", values, { toastOnError: false });
      toast.success("Password updated");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          setError(name as keyof ResetInput, { message });
        }
      } else {
        // An expired token isn't a field problem — say so above the button.
        setError("root", { message: errorMessage(error) });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        hint="8+ characters, a letter and a number"
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <PasswordMeter password={password} />

      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          placeholder="••••••••"
          invalid={Boolean(errors.confirm)}
          {...register("confirm")}
        />
      </Field>

      {errors.root ? (
        <p role="alert" className="rounded-md border border-ember/30 bg-ember/10 px-3 py-2 text-xs text-ember">
          {errors.root.message}
        </p>
      ) : null}

      <DeckButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        Set new password
      </DeckButton>
    </form>
  );
}
