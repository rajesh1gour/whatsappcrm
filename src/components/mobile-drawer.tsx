"use client";

import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { useEffect, useCallback, useRef } from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/login", label: "Sign in" },
];

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* ── Focus management ────────────────────────────── */
  useEffect(() => {
    if (open) {
      // Store the currently focused element so we can restore it later
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Move focus to the drawer (close button will receive it first)
      // Use setTimeout to ensure the drawer is rendered before focusing
      requestAnimationFrame(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])",
        );
        firstFocusable?.focus();
      });
    } else if (previousFocusRef.current) {
      // Restore focus to the element that opened the drawer
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  /* ── Close on Escape ─────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  /* ── Close when a link is clicked ───────────────── */
  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      {/* ── Backdrop ───────────────────────────────── */}
      <button
        type="button"
        aria-label="Close navigation menu"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      {/* ── Drawer panel ───────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        id="mobile-drawer"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-background shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-emerald-600 text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold">WhatsApp CRM</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 pt-4">
          {navLinks.map((link) => {
            const isExternal = link.href.startsWith("#");
            if (isExternal) {
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={handleNavClick}
                  className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              );
            }
            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={handleNavClick}
                className="flex rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <div className="border-t p-4">
          <Link
            href="/signup"
            onClick={handleNavClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            Get started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
