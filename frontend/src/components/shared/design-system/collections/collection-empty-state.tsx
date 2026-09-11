export function CollectionEmptyState({
  title = "Belum ada data",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="p-4">
      <div className="rounded-lg bg-state-surface px-4 py-8 text-left text-state-foreground">
        <p className="text-sm font-medium text-state-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-state-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
