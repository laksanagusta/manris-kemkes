import Image from "next/image";
import { cn } from "@/lib/utils";

/** Decorative brand symbol; the adjacent wordmark names the application. */
export function ManriskMark({
  size = 24,
  inverted = false,
  className,
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/manrisk-logo.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 object-contain", inverted ? "invert" : "dark:invert", className)}
    />
  );
}
