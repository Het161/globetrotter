"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createTripSchema, type CreateTripInput } from "@/lib/validators/trips";
import { api, fieldErrors } from "@/lib/api-client";
import type { TripDTO } from "@/server/dto";
import { DeckButton } from "@/components/ui/deck-button";
import { Field, Input, MoneyInput, NativeSelect, Textarea } from "@/components/ui/field";
import { useCurrency } from "@/hooks/use-currency";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import { pluralize } from "@/lib/utils";

/**
 * Create a trip.
 *
 * The budget limit is entered in the user's display currency and converted to
 * USD on submit, because USD is what the database and the engine speak.
 */
export function TripForm() {
  const router = useRouter();
  const money = useCurrency();
  const [cover, setCover] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const defaultStart = addDays(todayISO(), 30);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: defaultStart,
      endDate: addDays(defaultStart, 7),
      budgetLimit: null,
      status: "PLANNING",
    },
  });

  // useWatch rather than watch(): it subscribes without returning a fresh
  // function each render, so the React Compiler can still memoize this form.
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });
  const span =
    startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) + 1 : null;

  async function onCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await api.upload(file);
      setCover(url);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function onSubmit(values: CreateTripInput) {
    try {
      const trip = await api.post<TripDTO>(
        "/trips",
        {
          ...values,
          coverImageUrl: cover ?? "",
          // The form collects the user's currency; the API stores USD.
          budgetLimit:
            values.budgetLimit === null || values.budgetLimit === undefined
              ? null
              : money.toUSD(values.budgetLimit),
        },
        { toastOnError: false },
      );

      toast.success("Trip created — now add your first city");
      router.push(`/trips/${trip.id}/build`);
      router.refresh();
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields) {
        for (const [name, message] of Object.entries(fields)) {
          setError(name as keyof CreateTripInput, { message });
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6" noValidate>
      <div className="surface space-y-5 p-5 sm:p-6">
        <Field label="Trip name" htmlFor="name" required error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Japan Cherry Blossom '27"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" htmlFor="startDate" required error={errors.startDate?.message}>
            <Input
              id="startDate"
              type="date"
              invalid={Boolean(errors.startDate)}
              {...register("startDate")}
            />
          </Field>

          <Field label="End date" htmlFor="endDate" required error={errors.endDate?.message}>
            <Input
              id="endDate"
              type="date"
              min={startDate}
              invalid={Boolean(errors.endDate)}
              {...register("endDate")}
            />
          </Field>
        </div>

        {span ? (
          <p className="flex items-center gap-2 rounded-[var(--radius-input)] border border-line bg-deck/40 px-3 py-2 font-mono text-xs text-fog">
            <CalendarDays className="size-3.5 text-lagoon" aria-hidden />
            {pluralize(span, "day")} · {pluralize(Math.max(0, span - 1), "night")} to fill
          </p>
        ) : null}

        <Field
          label="Description"
          htmlFor="description"
          hint="Optional"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={3}
            placeholder="Chasing the sakura front from Tokyo down to Osaka, mostly on the Shinkansen."
            invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </Field>
      </div>

      <div className="surface space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Budget limit (${money.currency})`}
            htmlFor="budgetLimit"
            hint="Optional"
            error={errors.budgetLimit?.message}
          >
            <MoneyInput
              id="budgetLimit"
              symbol={money.symbol}
              placeholder="0"
              invalid={Boolean(errors.budgetLimit)}
              {...register("budgetLimit", {
                setValueAs: (value) => (value === "" ? null : Number(value)),
              })}
            />
          </Field>

          <Field label="Status" htmlFor="status">
            <NativeSelect id="status" {...register("status")}>
              <option value="PLANNING">Planning</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
            </NativeSelect>
          </Field>
        </div>

        <Field label="Cover image" hint="Optional — a Postcard is used otherwise">
          {cover ? (
            <div className="relative overflow-hidden rounded-[var(--radius-input)] border border-line">
              {/* User upload of unknown dimensions; next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={() => setCover(null)}
                aria-label="Remove cover image"
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-md border border-line bg-ink/70 text-cloud backdrop-blur-sm"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-input)] border border-dashed border-line-strong bg-deck/30 px-4 py-7 text-sm text-fog transition-colors hover:border-lagoon/40 hover:text-cloud">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {uploading ? "Uploading…" : "Choose an image (JPEG, PNG or WebP, max 2 MB)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onCoverChange}
              />
            </label>
          )}
        </Field>
      </div>

      <div className="flex justify-end gap-3">
        <DeckButton
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </DeckButton>
        <DeckButton type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Create trip
        </DeckButton>
      </div>
    </form>
  );
}
