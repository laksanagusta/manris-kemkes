import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RiskTableIdentity({ title, href }: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex min-w-0 w-full flex-col">
      {href ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={href} className="block min-w-0 truncate rounded-sm font-semibold text-foreground no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring">
              {title}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="register-motion-tooltip">{title}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="block min-w-0 truncate rounded-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">{title}</span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="register-motion-tooltip">{title}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
