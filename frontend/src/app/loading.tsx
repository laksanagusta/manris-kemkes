import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <PageLoadingSkeleton><DetailLoadingSkeleton message="Memuat halaman…" /></PageLoadingSkeleton>
    </main>
  );
}
