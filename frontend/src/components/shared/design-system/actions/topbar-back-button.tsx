import type { ComponentProps } from "react";
import Link from "next/link";
import { ChevronLeft } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

type TopbarBackButtonProps = { label: string } & (
  | { href: string; onClick?: never; disabled?: never }
  | { href?: never; onClick: ComponentProps<typeof Button>["onClick"]; disabled?: boolean }
);

export function TopbarBackButton({ label, href, onClick, disabled }: TopbarBackButtonProps) {
  const icon = <ChevronLeft aria-hidden="true" className="size-4" />;
  return (
    <Button
      asChild={Boolean(href)}
      type={href ? undefined : "button"}
      variant="ghost"
      size="icon"
      className="shrink-0 bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {href ? <Link href={href}>{icon}</Link> : icon}
    </Button>
  );
}
