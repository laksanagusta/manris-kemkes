import { redirect } from "next/navigation";

export default function LegacyCreateMinutesPage() {
  redirect("/minutes/new");
}
