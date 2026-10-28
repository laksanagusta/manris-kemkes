"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/shared/design-system";
export function OperatorWorkReturnLink() {
 const search=useSearchParams();
 if(search.get("returnTo")!=="/work")return null;
 return <ActionButton asChild variant="ghost"><Link href="/work">Kembali ke pekerjaan</Link></ActionButton>;
}
