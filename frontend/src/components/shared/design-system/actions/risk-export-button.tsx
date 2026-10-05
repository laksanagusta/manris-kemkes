"use client";

import { Download } from "@/components/shared/icons";
import { ActionButton } from "./action-button";

export function RiskExportButton({ loading = false, disabled = false, onClick }: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ActionButton
      type="button"
      variant="outline"
      icon={<Download className="size-3.5" />}
      loading={loading}
      disabled={loading || disabled}
      onClick={onClick}
      title="Ekspor semua risiko sesuai filter aktif ke Excel"
    >
      {loading ? "Menyiapkan Excel..." : "Ekspor Excel"}
    </ActionButton>
  );
}
