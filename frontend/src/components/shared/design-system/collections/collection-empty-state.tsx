export function CollectionEmptyState({
  title = "Belum ada data",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-left">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
