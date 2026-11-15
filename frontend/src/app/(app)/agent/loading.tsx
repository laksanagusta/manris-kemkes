import { PageLoadingSkeleton, TextLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton><TextLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
