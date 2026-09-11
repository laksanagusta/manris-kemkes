import { Search } from "@/components/ui/icons";

export function CollectionLoadingState({
  message = "Memuat data...",
}: {
  message?: string;
}) {
  return (
    <div className="p-4">
      <div className="rounded-lg bg-state-surface px-4 py-8 text-left text-state-foreground">
        <div className="flex items-center gap-2 text-sm font-medium text-state-foreground">
          <Search className="size-4 animate-pulse" />
          {message}
        </div>
      </div>
    </div>
  );
}
