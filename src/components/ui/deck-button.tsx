"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

/**
 * DeckButton — the one button system in the app.
 *
 * The "3D" is not a drop shadow. Each button is two stacked slabs: a plate
 * pinned 3 px lower than the face, and the face itself carrying a 1 px inner
 * top highlight. Hovering lifts the face; pressing sinks it flush onto the
 * plate. Both stacked layers are `::before` / `::after` in globals.css, so the
 * whole effect costs one element and animates transform only.
 *
 * `magnetic` is for hero calls to action only — the face leans toward the
 * pointer within 48 px. It is disabled under prefers-reduced-motion.
 */

const deckButton = cva(
  "deck-btn select-none disabled:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "text-ink [--deck-face:var(--color-solar)] [--deck-plate:var(--color-solar-deep)] [--deck-glow:var(--glow-solar)]",
        secondary: "text-cloud [--deck-face:var(--color-deck)] [--deck-plate:#080c16] [--deck-glow:0_0_0_3px_rgba(242,238,227,0.10)]",
        lagoon: "text-ink [--deck-face:var(--color-lagoon)] [--deck-plate:var(--color-lagoon-deep)] [--deck-glow:var(--glow-lagoon)]",
        danger: "text-ink [--deck-face:var(--color-ember)] [--deck-plate:var(--color-ember-deep)] [--deck-glow:var(--glow-ember)]",
        ghost:
          "text-fog hover:text-cloud [--deck-face:transparent] [--deck-plate:transparent] [--deck-glow:none] before:hidden after:border after:border-transparent hover:after:border-[color:var(--color-line-strong)]",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 gap-2 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 gap-2.5 px-6 text-base [&_svg]:size-[18px]",
        icon: "size-10 px-0 [&_svg]:size-[18px]",
        "icon-sm": "size-8 px-0 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type DeckButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof deckButton> & {
    asChild?: boolean;
    loading?: boolean;
    magnetic?: boolean;
  };

/** How far the pointer can be before the button stops reacting. */
const MAGNET_RADIUS = 48;
const MAGNET_PULL = 0.28;

export const DeckButton = React.forwardRef<HTMLButtonElement, DeckButtonProps>(
  function DeckButton(
    { className, variant, size, asChild, loading, magnetic, children, disabled, ...props },
    forwardedRef,
  ) {
    const reduceMotion = useSafeReducedMotion();
    const localRef = React.useRef<HTMLButtonElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
    const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

    const enabled = magnetic && !reduceMotion && !disabled && !loading;

    React.useEffect(() => {
      if (!enabled) return;

      const onPointerMove = (event: PointerEvent) => {
        const node = localRef.current;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;

        // Distance to the button's edge, not its centre, so wide buttons
        // don't need the pointer to be further away to react.
        const outsideX = Math.max(0, Math.abs(dx) - rect.width / 2);
        const outsideY = Math.max(0, Math.abs(dy) - rect.height / 2);
        const distance = Math.hypot(outsideX, outsideY);

        if (distance > MAGNET_RADIUS) {
          x.set(0);
          y.set(0);
          return;
        }
        const strength = (1 - distance / MAGNET_RADIUS) * MAGNET_PULL;
        x.set(dx * strength);
        y.set(dy * strength);
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      return () => window.removeEventListener("pointermove", onPointerMove);
    }, [enabled, x, y]);

    const content = (
      <>
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </>
    );

    if (asChild) {
      return (
        <Slot className={cn(deckButton({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        style={enabled ? { x: springX, y: springY } : undefined}
        className={cn(deckButton({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {content}
      </motion.button>
    );
  },
);

export { deckButton };
