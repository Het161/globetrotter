"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signupSchema, type SignupInput } from "@/lib/validators/auth";
import { api, fieldErrors } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "./password-input";
import { PasswordMeter } from "./password-meter";

export function SignupForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onBlur",
  });

  // useWatch rather than watch(): it subscribes without returning a fresh
  // function each render, so the React Compiler can still memoize this form.
  const password = useWatch({ control, name: "password" });

  async function onSubmit(values: SignupInput) {
    try {
      await api.post("/auth/signup", values, { toastOnError: false });
      toast.success("Account created — let's plan something");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      // Server-side field errors (a taken email) land on the right input.
      const fields = fieldErrors(error);
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          setError(name as keyof SignupInput, { message });
        }
      } else {
        setError("email", { message: "We couldn't create that account. Try again." });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Name" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Aarav Mehta"
          invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

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

      <DeckButton
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        Create account
      </DeckButton>
    </form>
  );
}
