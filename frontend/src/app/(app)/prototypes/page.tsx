import { notFound, redirect } from "next/navigation";

export default function PrototypesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/prototypes/monitoring-review");
}
