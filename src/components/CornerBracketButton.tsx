import * as React from "react";
import { cn } from "@/lib/utils";

export interface CornerBracketButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Bracket arm length in px. */
  bracketSize?: number;
  /** Bracket stroke thickness in px. */
  bracketWidth?: number;
  /** How far brackets sit outside the button bounds when expanded, in px. */
  bracketOffset?: number;
  asChild?: never;
}

/**
 * Button with animated L-shaped corner brackets that slide outward + fade in
 * on hover/focus. Pure CSS (transform + opacity) so the animation is jank-free.
 *
 * Accessibility: brackets are decorative (aria-hidden). The button itself
 * carries focus and the same focus ring as the rest of the design system.
 */
export const CornerBracketButton = React.forwardRef<
  HTMLButtonElement,
  CornerBracketButtonProps
>(function CornerBracketButton(
  {
    className,
    children,
    bracketSize = 14,
    bracketWidth = 1.5,
    bracketOffset = 6,
    ...props
  },
  ref,
) {
  const armStyle: React.CSSProperties = {
    width: bracketSize,
    height: bracketSize,
    borderColor: "currentColor",
  };

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "group/cbb relative inline-flex items-center justify-center gap-2 rounded-md",
        "px-6 py-3 text-sm font-medium",
        "bg-foreground text-background",
        "transition-[transform,background-color,box-shadow] duration-200 ease-out",
        "hover:bg-foreground/90 hover:scale-[1.02]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {/* Corner brackets — animated frame */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {/* Top-left */}
        <span
          className={cn(
            "absolute left-0 top-0 border-l border-t opacity-0",
            "transition-[transform,opacity] duration-300 ease-out",
            "group-hover/cbb:opacity-100 group-focus-visible/cbb:opacity-100",
          )}
          style={{
            ...armStyle,
            borderLeftWidth: bracketWidth,
            borderTopWidth: bracketWidth,
            transform: `translate(${bracketOffset / 2}px, ${bracketOffset / 2}px)`,
          }}
          data-bracket="tl"
        />
        {/* Top-right */}
        <span
          className={cn(
            "absolute right-0 top-0 border-r border-t opacity-0",
            "transition-[transform,opacity] duration-300 ease-out",
            "group-hover/cbb:opacity-100 group-focus-visible/cbb:opacity-100",
          )}
          style={{
            ...armStyle,
            borderRightWidth: bracketWidth,
            borderTopWidth: bracketWidth,
            transform: `translate(-${bracketOffset / 2}px, ${bracketOffset / 2}px)`,
          }}
          data-bracket="tr"
        />
        {/* Bottom-left */}
        <span
          className={cn(
            "absolute bottom-0 left-0 border-b border-l opacity-0",
            "transition-[transform,opacity] duration-300 ease-out",
            "group-hover/cbb:opacity-100 group-focus-visible/cbb:opacity-100",
          )}
          style={{
            ...armStyle,
            borderBottomWidth: bracketWidth,
            borderLeftWidth: bracketWidth,
            transform: `translate(${bracketOffset / 2}px, -${bracketOffset / 2}px)`,
          }}
          data-bracket="bl"
        />
        {/* Bottom-right */}
        <span
          className={cn(
            "absolute bottom-0 right-0 border-b border-r opacity-0",
            "transition-[transform,opacity] duration-300 ease-out",
            "group-hover/cbb:opacity-100 group-focus-visible/cbb:opacity-100",
          )}
          style={{
            ...armStyle,
            borderBottomWidth: bracketWidth,
            borderRightWidth: bracketWidth,
            transform: `translate(-${bracketOffset / 2}px, -${bracketOffset / 2}px)`,
          }}
          data-bracket="br"
        />

        {/* Inject expanded translate values via data-state on hover/focus */}
        <style>{`
          .group\\/cbb:hover [data-bracket="tl"],
          .group\\/cbb:focus-visible [data-bracket="tl"] {
            transform: translate(-${bracketOffset}px, -${bracketOffset}px) !important;
          }
          .group\\/cbb:hover [data-bracket="tr"],
          .group\\/cbb:focus-visible [data-bracket="tr"] {
            transform: translate(${bracketOffset}px, -${bracketOffset}px) !important;
          }
          .group\\/cbb:hover [data-bracket="bl"],
          .group\\/cbb:focus-visible [data-bracket="bl"] {
            transform: translate(-${bracketOffset}px, ${bracketOffset}px) !important;
          }
          .group\\/cbb:hover [data-bracket="br"],
          .group\\/cbb:focus-visible [data-bracket="br"] {
            transform: translate(${bracketOffset}px, ${bracketOffset}px) !important;
          }
          @media (prefers-reduced-motion: reduce) {
            .group\\/cbb [data-bracket] {
              transition: opacity 200ms ease-out !important;
              transform: none !important;
            }
          }
        `}</style>
      </span>

      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
});
