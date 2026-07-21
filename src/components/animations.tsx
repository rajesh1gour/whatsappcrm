"use client";

import { Children, type ReactNode, cloneElement, isValidElement } from "react";
import { useInView } from "@/hooks/use-in-view";

/* ── Shared transition classes ─────────────────────── */
const BASE = "transition-all duration-700 ease-out";
const HIDDEN = "opacity-0 translate-y-6";
const VISIBLE = "opacity-100 translate-y-0";

/* ── Injected reduced-motion overrides ─────────────── */
// Paired with the CSS rule in globals.css that forces
// opacity-100 & translate-y-0 when the user prefers reduced motion.

/* ── FadeIn – also slides up slightly ──────────────── */
interface AnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  threshold?: number;
}

export function FadeIn({
  children,
  className = "",
  delay = 0,
  threshold,
}: AnimationProps) {
  const { ref, isInView } = useInView({ threshold });

  return (
    <div
      ref={ref}
      className={`${BASE} ${isInView ? VISIBLE : HIDDEN} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── SlideUp – larger slide distance for emphasis ──── */
export function SlideUp({
  children,
  className = "",
  delay = 0,
  threshold,
}: AnimationProps) {
  const { ref, isInView } = useInView({ threshold });

  return (
    <div
      ref={ref}
      className={`${BASE} ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── ScaleIn – subtle scale-up for cards ───────────── */
export function ScaleIn({
  children,
  className = "",
  delay = 0,
}: AnimationProps) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isInView
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── StaggerGroup – wraps children with staggered delays ── */
interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number; // ms between each child
  threshold?: number;
}

export function StaggerGroup({
  children,
  className = "",
  staggerDelay = 100,
  threshold,
}: StaggerGroupProps) {
  const { ref, isInView } = useInView({ threshold });

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        return cloneElement(
          child,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {
            ...(child.props as Record<string, unknown>),
            className: `${(child.props as Record<string, unknown>).className || ""} ${BASE} ${
              isInView ? VISIBLE : HIDDEN
            }`.trim(),
            style: {
              ...(child.props as Record<string, unknown>).style as Record<string, unknown>,
              transitionDelay: `${index * staggerDelay}ms`,
            } as React.CSSProperties,
          } as Record<string, unknown>,
        );
      })}
    </div>
  );
}
