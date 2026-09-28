import { Search } from "@/components/shared/icons";

export function CollectionLoadingState({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-4">
      <Search className="size-4 animate-pulse" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
