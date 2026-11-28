import Link from "next/link";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RiskTableIdentity({ title, href, wrap = false }: {
  title: string;
  href?: string;
  wrap?: boolean;
}) {
  const titleClassName = cn(
    "min-w-0 rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring",
    wrap ? "line-clamp-2 whitespace-normal wrap-anywhere" : "block truncate",
  );
  return (
    <div className="flex min-w-0 w-full flex-col">
      {href ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href} className={cn(titleClassName, "no-underline hover:no-underline")}>
              {title}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="register-motion-tooltip">{title}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className={titleClassName}>{title}</span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="register-motion-tooltip">{title}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
