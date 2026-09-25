"use client";

import { CollectionPagination } from "@/components/shared/design-system";

export function PaginationExample() {
  return (
    <div className="overflow-hidden rounded-[12px] bg-card shadow-black">
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
