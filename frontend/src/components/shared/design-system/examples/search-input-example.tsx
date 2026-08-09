"use client";

import { useState } from "react";

import { ExpandableSearchField } from "@/components/shared/design-system";

export function SearchInputExample() {
  const [value, setValue] = useState("");

  return (
    <div className="w-full sm:w-72">
      <ExpandableSearchField
        placeholder="Cari risiko..."
        ariaLabel="Cari risiko"
        value={value}
        onChange={setValue}
      />
    </div>
  );
}
