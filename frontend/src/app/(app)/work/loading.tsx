import { CardsLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton><CardsLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
