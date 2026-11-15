import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return <PageLoadingSkeleton className="mx-auto max-w-[48rem] px-4 py-8 sm:px-6"><DetailLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>;
}
