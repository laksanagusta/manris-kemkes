import { FormLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton><FormLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
