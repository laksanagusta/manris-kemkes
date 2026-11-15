import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton><DetailLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
