"use client";
import Link from "next/link";
import { getWorkReturnLink } from "@/lib/operator-work";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/shared/design-system";
export function OperatorWorkReturnLink() {
 const search=useSearchParams();
 const target=getWorkReturnLink(search.get("returnTo"));
 if(!target)return null;
 return <ActionButton asChild variant="ghost"><Link href={target.href}>{target.label}</Link></ActionButton>;
}
