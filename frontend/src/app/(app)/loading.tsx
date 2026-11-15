import { PageLoadingSkeleton, TableLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton><TableLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
