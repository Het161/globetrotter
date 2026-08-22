"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CityDTO, StopActivityDTO, StopDTO, TripDTO } from "@/server/dto";
import { computeBudget, type DayBudget } from "@/server/engine/budget";
import { budgetInputFor, stopDays } from "@/lib/trip-view";
import type { UpdateStopInput } from "@/lib/validators/stops";
import { api, errorMessage } from "@/lib/api-client";
import { CockpitBar } from "./cockpit-bar";
import { StopRail } from "./stop-rail";
import { DayCanvas } from "./day-canvas";
import { CitySearchSheet } from "@/components/explore/city-search-sheet";
import {
  ActivitySearchSheet,
  type NewActivityPayload,
} from "@/components/explore/activity-search-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeckButton } from "@/components/ui/deck-button";

/**
 * The itinerary builder.
 *
 * All trip state lives here in one object. Every mutation is applied to that
 * object immediately, the request goes out, and the server's response replaces
 * the optimistic version — or, on failure, the previous snapshot is restored
 * and a toast explains why.
 *
 * The running total is recomputed locally on every change with `computeBudget`,
 * the same pure function the API uses. That is why dragging a stop updates the
 * money instantly and still agrees with the server a moment later.
 */
export function TripBuilder({ initialTrip }: { initialTrip: TripDTO }) {
  const router = useRouter();

  const [trip, setTrip] = React.useState(initialTrip);
  const [selectedStopId, setSelectedStopId] = React.useState<string | null>(
    initialTrip.stops[0]?.id ?? null,
  );
  const [selectedDate, setSelectedDate] = React.useState<string | null>(
    initialTrip.stops[0]?.arrivalDate ?? null,
  );

  const [pending, setPending] = React.useState(false);
  const [cityPickerOpen, setCityPickerOpen] = React.useState(false);
  const [activityPickerOpen, setActivityPickerOpen] = React.useState(false);
  const [stopToRemove, setStopToRemove] = React.useState<StopDTO | null>(null);

  /* --- Derived ---------------------------------------------------------- */

  const budget = React.useMemo(() => computeBudget(budgetInputFor(trip)), [trip]);

  const budgetByDay = React.useMemo(
    () => new Map<string, DayBudget>(budget.byDay.map((day) => [day.date, day])),
    [budget],
  );

  const overBudgetStopIds = React.useMemo(() => {
    const over = new Set(budget.overBudgetDays);
    const ids = new Set<string>();
    for (const stop of trip.stops) {
      if (stopDays(stop).some((day) => over.has(day))) ids.add(stop.id);
    }
    return ids;
  }, [budget.overBudgetDays, trip.stops]);

  const selectedStop = trip.stops.find((stop) => stop.id === selectedStopId) ?? null;
  const days = selectedStop ? stopDays(selectedStop) : [];

  /**
   * The selected day is derived, not stored: if the stored one no longer falls
   * inside the selected stop's stay (the stop moved, or a different stop was
   * picked) we show the arrival day instead. Deriving avoids an effect and the
   * extra render an effect would cost.
   */
  const activeDate =
    selectedStop === null
      ? null
      : selectedDate && days.includes(selectedDate)
        ? selectedDate
        : selectedStop.arrivalDate;

  /* --- Mutation plumbing ------------------------------------------------ */

  /**
   * Apply an optimistic change, run the request, and roll back on failure.
   * Every mutation on this screen goes through here so the behaviour — and the
   * error message — is identical everywhere.
   */
  const mutate = React.useCallback(
    async (optimistic: (current: TripDTO) => TripDTO, request: () => Promise<TripDTO | void>) => {
      const snapshot = trip;
      setTrip(optimistic);
      setPending(true);

      try {
        const confirmed = await request();
        if (confirmed) setTrip(confirmed);
        router.refresh(); // keep server components (cards, dashboard) honest
      } catch (error) {
        setTrip(snapshot);
        toast.error(errorMessage(error, "That change didn't stick."));
      } finally {
        setPending(false);
      }
    },
    [trip, router],
  );

  const replaceStops = (current: TripDTO, stops: StopDTO[]): TripDTO => ({ ...current, stops });

  const patchStop = (current: TripDTO, stopId: string, patch: Partial<StopDTO>): TripDTO =>
    replaceStops(
      current,
      current.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop)),
    );

  const patchActivities = (
    current: TripDTO,
    stopId: string,
    update: (activities: StopActivityDTO[]) => StopActivityDTO[],
  ): TripDTO =>
    replaceStops(
      current,
      current.stops.map((stop) =>
        stop.id === stopId ? { ...stop, activities: update(stop.activities) } : stop,
      ),
    );

  /* --- Trip ------------------------------------------------------------- */

  async function renameTrip(name: string) {
    await mutate(
      (current) => ({ ...current, name }),
      async () => {
        const updated = await api.patch<TripDTO>(`/trips/${trip.id}`, { name });
        return { ...updated, summary: trip.summary };
      },
    );
  }

  /* --- Stops ------------------------------------------------------------ */

  async function addStop(city: CityDTO) {
    setPending(true);
    try {
      const stop = await api.post<StopDTO>(
        `/trips/${trip.id}/stops`,
        { cityId: city.id },
        { toastOnError: false },
      );

      setTrip((current) => replaceStops(current, [...current.stops, stop]));
      setSelectedStopId(stop.id);
      setSelectedDate(stop.arrivalDate);
      setCityPickerOpen(false);
      toast.success(`${city.name} added to the route`);
      router.refresh();
    } catch (error) {
      // The date engine refuses politely, naming the blocking city.
      toast.error(errorMessage(error, "We couldn't add that stop."));
    } finally {
      setPending(false);
    }
  }

  async function updateStop(stopId: string, patch: UpdateStopInput) {
    await mutate(
      (current) => patchStop(current, stopId, patch as Partial<StopDTO>),
      async () => {
        const stop = await api.patch<StopDTO>(`/stops/${stopId}`, patch, {
          toastOnError: false,
        });
        setTrip((current) =>
          replaceStops(
            current,
            current.stops.map((existing) => (existing.id === stopId ? stop : existing)),
          ),
        );
      },
    );
  }

  async function removeStop(stop: StopDTO) {
    setStopToRemove(null);

    await mutate(
      (current) => replaceStops(current, current.stops.filter((s) => s.id !== stop.id)),
      async () => {
        await api.delete(`/stops/${stop.id}`, { toastOnError: false });
        toast.success(`${stop.city.name} removed`);
      },
    );

    if (selectedStopId === stop.id) {
      const remaining = trip.stops.filter((s) => s.id !== stop.id);
      setSelectedStopId(remaining[0]?.id ?? null);
    }
  }

  async function reorderStops(ids: string[]) {
    const currentOrder = trip.stops.map((stop) => stop.id);
    if (ids.join() === currentOrder.join()) return;

    await mutate(
      (current) =>
        replaceStops(
          current,
          ids
            .map((id) => current.stops.find((stop) => stop.id === id))
            .filter((stop): stop is StopDTO => Boolean(stop)),
        ),
      async () => {
        // The server re-flows every date, so its answer is authoritative.
        const stops = await api.post<StopDTO[]>(
          `/trips/${trip.id}/stops/reorder`,
          { ids },
          { toastOnError: false },
        );
        setTrip((current) => replaceStops(current, stops));
      },
    );
  }

  /* --- Activities ------------------------------------------------------- */

  async function addActivity(payload: NewActivityPayload) {
    if (!selectedStop) return;
    const stopId = selectedStop.id;
    setPending(true);

    try {
      const activity = await api.post<StopActivityDTO>(
        `/stops/${stopId}/activities`,
        payload,
        { toastOnError: false },
      );

      setTrip((current) =>
        patchActivities(current, stopId, (activities) => [...activities, activity]),
      );
      setSelectedDate(payload.date);
      setActivityPickerOpen(false);
      toast.success(`${activity.name} added`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't add that activity."));
    } finally {
      setPending(false);
    }
  }

  async function updateActivity(
    id: string,
    patch: { startMinute?: number | null; cost?: number },
  ) {
    if (!selectedStop) return;
    const stopId = selectedStop.id;

    await mutate(
      (current) =>
        patchActivities(current, stopId, (activities) =>
          activities.map((activity) =>
            activity.id === id ? { ...activity, ...patch } : activity,
          ),
        ),
      async () => {
        const updated = await api.patch<StopActivityDTO>(`/stop-activities/${id}`, patch, {
          toastOnError: false,
        });
        setTrip((current) =>
          patchActivities(current, stopId, (activities) =>
            activities.map((activity) => (activity.id === id ? updated : activity)),
          ),
        );
      },
    );
  }

  async function moveActivity(id: string, date: string) {
    if (!selectedStop) return;
    const stopId = selectedStop.id;

    await mutate(
      (current) =>
        patchActivities(current, stopId, (activities) =>
          activities.map((activity) => (activity.id === id ? { ...activity, date } : activity)),
        ),
      async () => {
        await api.post(`/stop-activities/${id}/move`, { date }, { toastOnError: false });
      },
    );
  }

  async function removeActivity(id: string) {
    if (!selectedStop) return;
    const stopId = selectedStop.id;

    await mutate(
      (current) =>
        patchActivities(current, stopId, (activities) =>
          activities.filter((activity) => activity.id !== id),
        ),
      async () => {
        await api.delete(`/stop-activities/${id}`, { toastOnError: false });
      },
    );
  }

  async function reorderActivities(ids: string[]) {
    if (!selectedStop) return;
    const stopId = selectedStop.id;

    await mutate(
      (current) =>
        patchActivities(current, stopId, (activities) =>
          activities.map((activity) => {
            const index = ids.indexOf(activity.id);
            return index === -1 ? activity : { ...activity, orderIndex: index };
          }),
        ),
      async () => {
        await api.post(
          `/stops/${stopId}/activities/reorder`,
          { ids },
          { toastOnError: false },
        );
      },
    );
  }

  /* --- Render ----------------------------------------------------------- */

  return (
    <>
      <CockpitBar trip={trip} budget={budget} onRename={renameTrip} saving={pending} />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* On mobile the rail sits above the canvas rather than beside it. */}
        <div className="lg:sticky lg:top-[8.5rem] lg:self-start">
          <StopRail
            trip={trip}
            selectedStopId={selectedStopId}
            overBudgetStopIds={overBudgetStopIds}
            pending={pending}
            onSelect={setSelectedStopId}
            onReorder={reorderStops}
            onUpdateStop={updateStop}
            onRemoveStop={setStopToRemove}
            onAddStop={() => setCityPickerOpen(true)}
          />
        </div>

        <DayCanvas
          stop={selectedStop}
          days={days}
          selectedDate={activeDate}
          budgetByDay={budgetByDay}
          onSelectDate={setSelectedDate}
          onAddActivity={() => setActivityPickerOpen(true)}
          onUpdateActivity={updateActivity}
          onMoveActivity={moveActivity}
          onRemoveActivity={removeActivity}
          onReorderActivities={reorderActivities}
        />
      </div>

      <CitySearchSheet
        open={cityPickerOpen}
        onOpenChange={setCityPickerOpen}
        onSelect={addStop}
        busy={pending}
      />

      <ActivitySearchSheet
        open={activityPickerOpen}
        onOpenChange={setActivityPickerOpen}
        citySlug={selectedStop?.city.slug ?? null}
        cityName={selectedStop?.city.name ?? null}
        days={days}
        defaultDate={activeDate}
        onAdd={addActivity}
        busy={pending}
      />

      <Dialog open={stopToRemove !== null} onOpenChange={(open) => !open && setStopToRemove(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {stopToRemove?.city.name}?</DialogTitle>
            <DialogDescription>
              Its {stopToRemove?.activities.length ?? 0} planned{" "}
              {stopToRemove?.activities.length === 1 ? "activity goes" : "activities go"} with it.
              The other stops keep their dates.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DeckButton variant="secondary" onClick={() => setStopToRemove(null)}>
              Keep it
            </DeckButton>
            <DeckButton
              variant="danger"
              onClick={() => stopToRemove && removeStop(stopToRemove)}
            >
              Remove stop
            </DeckButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
