"use client";

import { CollectionPagination } from "@/components/shared/design-system";

export function PaginationExample() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <CollectionPagination
        itemLabel="risiko"
        page={1}
        pageSize={10}
        total={42}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </div>
  );
}
