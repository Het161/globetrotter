"use client";

import * as React from "react";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { StopDTO, TripDTO } from "@/server/dto";
import type { UpdateStopInput } from "@/lib/validators/stops";
import { Postcard } from "@/components/ui/postcard";
import { RouteSpine } from "@/components/ui/route-line";
import { DeckButton } from "@/components/ui/deck-button";
import { Input, NativeSelect } from "@/components/ui/field";
import { useCurrency } from "@/hooks/use-currency";
import { formatDateShort } from "@/lib/dates";
import { cn, pluralize } from "@/lib/utils";

/**
 * The stop rail: the trip's route as a vertical list of postcards, threaded by
 * the RouteSpine.
 *
 * Dragging a stop reorders it and the server re-flows every date, keeping each
 * stop's night count. While that request is in flight the spine's dashes
 * animate — the route *is* the loading indicator, so nothing shifts and no
 * spinner appears in the layout.
 */
export function StopRail({
  trip,
  selectedStopId,
  overBudgetStopIds,
  pending,
  onSelect,
  onReorder,
  onUpdateStop,
  onRemoveStop,
  onAddStop,
}: {
  trip: TripDTO;
  selectedStopId: string | null;
  overBudgetStopIds: Set<string>;
  pending: boolean;
  onSelect: (stopId: string) => void;
  onReorder: (ids: string[]) => void;
  onUpdateStop: (stopId: string, patch: UpdateStopInput) => void;
  onRemoveStop: (stop: StopDTO) => void;
  onAddStop: () => void;
}) {
  // Reorder.Group needs to own the array while a drag is happening, so we mirror
  // the trip's stops into local state and push the new order up on drag end.
  const [order, setOrder] = React.useState(trip.stops);

  // Re-sync when the server confirms (or rejects) a reorder. Adjusting state
  // during render is React's prescribed pattern; an effect would render twice
  // and briefly show the stale order.
  const [seenStops, setSeenStops] = React.useState(trip.stops);
  if (seenStops !== trip.stops) {
    setSeenStops(trip.stops);
    setOrder(trip.stops);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="placard">Route</h2>
        <span className="font-mono text-2xs text-fog-dim">
          {pluralize(trip.stops.length, "stop")}
        </span>
      </header>

      {trip.stops.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 px-4 py-8 text-center">
          <p className="text-sm text-fog">No stops yet. Add your first city.</p>
          <DeckButton variant="primary" size="sm" onClick={onAddStop}>
            <Plus />
            Add stop
          </DeckButton>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={setOrder}
          className="space-y-1"
          layoutScroll
        >
          {order.map((stop, index) => (
            <StopChip
              key={stop.id}
              stop={stop}
              index={index}
              isFirst={index === 0}
              isLast={index === order.length - 1}
              selected={stop.id === selectedStopId}
              alert={overBudgetStopIds.has(stop.id)}
              pending={pending}
              onSelect={() => onSelect(stop.id)}
              onDragEnd={() => onReorder(order.map((s) => s.id))}
              onUpdate={(patch) => onUpdateStop(stop.id, patch)}
              onRemove={() => onRemoveStop(stop)}
              tripStart={trip.startDate}
              tripEnd={trip.endDate}
            />
          ))}
        </Reorder.Group>
      )}

      {trip.stops.length > 0 ? (
        <DeckButton variant="secondary" size="sm" className="mt-3 w-full" onClick={onAddStop}>
          <Plus />
          Add stop
        </DeckButton>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StopChip({
  stop,
  index,
  isFirst,
  isLast,
  selected,
  alert,
  pending,
  onSelect,
  onDragEnd,
  onUpdate,
  onRemove,
  tripStart,
  tripEnd,
}: {
  stop: StopDTO;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  selected: boolean;
  alert: boolean;
  pending: boolean;
  onSelect: () => void;
  onDragEnd: () => void;
  onUpdate: (patch: UpdateStopInput) => void;
  onRemove: () => void;
  tripStart: string;
  tripEnd: string;
}) {
  const money = useCurrency();
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="relative list-none"
    >
      <div className="flex gap-1">
        {/* 34 px lines the node up with the middle of the chip's header row. */}
        <RouteSpine
          first={isFirst}
          last={isLast}
          active={selected}
          pending={pending}
          alert={alert}
          nodeOffset={34}
        />

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border bg-harbor/70 transition-colors",
            selected ? "border-lagoon/40" : "border-line hover:border-line-strong",
          )}
        >
          {/* Header — always visible, click to select. */}
          <div className="flex items-stretch">
            <button
              type="button"
              onPointerDown={(event) => controls.start(event)}
              aria-label={`Reorder ${stop.city.name}`}
              className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center text-fog-dim transition-colors hover:text-cloud active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={onSelect}
              className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left"
            >
              <span className="w-16 shrink-0 overflow-hidden rounded-md">
                <Postcard city={stop.city} size="chip" tilt={false} minimal />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-cloud">
                    {stop.city.name}
                  </span>
                  {alert ? (
                    <span
                      aria-label="Contains an over-budget day"
                      className="size-1.5 shrink-0 rounded-full bg-ember"
                    />
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate font-mono text-2xs text-fog">
                  {formatDateShort(stop.arrivalDate)} → {formatDateShort(stop.departureDate)}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block font-mono text-2xs font-semibold tabular-nums text-solar">
                  {money.format(stop.stayCostPerNight * stop.nights, { decimals: false })}
                </span>
                <span className="block font-mono text-[10px] text-fog-dim">
                  {stop.nights}n · {stop.activities.length}a
                </span>
              </span>
            </button>
          </div>

          {/* Editor — only for the selected stop, to keep the rail scannable. */}
          {selected ? (
            <div className="space-y-3 border-t border-line px-3 py-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="placard mb-1 block">Arrive</span>
                  <Input
                    type="date"
                    value={stop.arrivalDate}
                    min={tripStart}
                    max={tripEnd}
                    onChange={(event) => onUpdate({ arrivalDate: event.target.value })}
                    className="px-2 py-1.5 text-xs"
                  />
                </label>

                <label className="block">
                  <span className="placard mb-1 block">Depart</span>
                  <Input
                    type="date"
                    value={stop.departureDate}
                    min={stop.arrivalDate}
                    max={tripEnd}
                    onChange={(event) => onUpdate({ departureDate: event.target.value })}
                    className="px-2 py-1.5 text-xs"
                  />
                </label>
              </div>

              <label className="block">
                <span className="placard mb-1 block">Stay per night ({money.currency})</span>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  // Keyed on the value so a server correction re-seeds the input.
                  key={`stay-${stop.id}-${stop.stayCostPerNight}`}
                  defaultValue={money.toDisplay(stop.stayCostPerNight)}
                  onBlur={(event) => {
                    const typed = Number(event.target.value);
                    if (Number.isFinite(typed) && typed >= 0) {
                      onUpdate({ stayCostPerNight: money.toUSD(typed) });
                    }
                  }}
                  className="px-2 py-1.5 font-mono text-xs tabular-nums"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="placard mb-1 block">
                    {isLast ? "Trip home" : "Onward travel"}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    key={`transport-${stop.id}-${stop.transportCostToNext}`}
                    defaultValue={money.toDisplay(stop.transportCostToNext)}
                    onBlur={(event) => {
                      const typed = Number(event.target.value);
                      if (Number.isFinite(typed) && typed >= 0) {
                        onUpdate({ transportCostToNext: money.toUSD(typed) });
                      }
                    }}
                    className="px-2 py-1.5 font-mono text-xs tabular-nums"
                  />
                </label>

                <label className="block">
                  <span className="placard mb-1 block">Mode</span>
                  <NativeSelect
                    value={stop.transportMode ?? ""}
                    onChange={(event) =>
                      onUpdate({
                        transportMode:
                          event.target.value === ""
                            ? null
                            : (event.target.value as UpdateStopInput["transportMode"]),
                      })
                    }
                    className="px-2 py-1.5 text-xs"
                  >
                    <option value="">—</option>
                    <option value="FLIGHT">Flight</option>
                    <option value="TRAIN">Train</option>
                    <option value="BUS">Bus</option>
                    <option value="CAR">Car</option>
                    <option value="FERRY">Ferry</option>
                  </NativeSelect>
                </label>
              </div>

              <DeckButton
                variant="ghost"
                size="sm"
                className="w-full text-ember hover:text-ember"
                onClick={onRemove}
              >
                <Trash2 />
                Remove {stop.city.name}
              </DeckButton>
            </div>
          ) : null}
        </div>
      </div>

      <span className="sr-only">Stop {index + 1}</span>
    </Reorder.Item>
  );
}
