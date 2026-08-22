"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { UserDTO } from "@/server/dto";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validators/profile";
import { api, fieldErrors } from "@/lib/api-client";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, FieldGroup, Input, NativeSelect } from "@/components/ui/field";
import { CURRENCIES } from "@/lib/currency";
import { initials } from "@/lib/utils";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
];

export function ProfileForm({ user }: { user: UserDTO }) {
  const router = useRouter();
  const [avatar, setAvatar] = React.useState(user.avatarUrl);
  const [uploading, setUploading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      language: user.language as "en" | "hi" | "gu",
      currency: user.currency as UpdateProfileInput["currency"],
    },
  });

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await api.upload(file);
      setAvatar(url);
      await api.patch("/me", { avatarUrl: url });
      toast.success("Photo updated");
      router.refresh();
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function removeAvatar() {
    setAvatar(null);
    await api.patch("/me", { avatarUrl: null });
    router.refresh();
  }

  async function onSubmit(values: UpdateProfileInput) {
    try {
      await api.patch("/me", values, { toastOnError: false });
      toast.success("Profile saved");
      router.refresh();
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          setError(name as keyof UpdateProfileInput, { message });
        }
      } else {
        toast.error("We couldn't save that.");
      }
    }
  }

  return (
    <FieldGroup title="Profile" description="How you appear on trips you share.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-deck text-lg font-semibold text-cloud">
            {avatar ? (
              // A user upload of unknown dimensions — next/image buys nothing here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              initials(user.name)
            )}
          </span>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs font-medium text-fog transition-colors hover:border-line-strong hover:text-cloud">
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden />
              )}
              {avatar ? "Change photo" : "Upload a photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onAvatarChange}
              />
            </label>

            {avatar ? (
              <button
                type="button"
                onClick={removeAvatar}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] px-3 py-2 text-xs text-fog transition-colors hover:text-ember"
              >
                <X className="size-3.5" aria-hidden />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>

          <Field label="Language" htmlFor="language" hint="Labels and date formatting">
            <NativeSelect id="language" {...register("language")}>
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Display currency"
            htmlFor="currency"
            hint="Costs are stored in USD"
          >
            <NativeSelect id="currency" {...register("currency")}>
              {CURRENCIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} — {option.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="flex justify-end">
          <DeckButton
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={!isDirty}
          >
            Save changes
          </DeckButton>
        </div>
      </form>
    </FieldGroup>
  );
}
