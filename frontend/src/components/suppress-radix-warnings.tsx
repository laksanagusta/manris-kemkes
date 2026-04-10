"use client";

import { useEffect } from "react";

/**
 * Suppresses known React 19 + Radix UI console warnings that cannot be fixed
 * from application code. Specifically:
 * - "Each child in a list should have a unique key prop" from Radix Select's
 *   internal native <option> elements rendered without keys.
 *
 * This is a known issue: https://github.com/radix-ui/primitives/issues/3254
 * Only suppresses in development mode.
 */
export function SuppressRadixWarnings() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalError = console.error;

    console.error = (...args: any[]) => {
      const message = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");

      if (message.includes("Each child in a list should have a unique")) {
        if (!message.includes("WorkingPapersPage")) {
          return;
        }
      }

      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
