import { AlertTriangle } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ExternalAIProcessingNotice() {
  return (
    <Alert role="note" aria-label="Pemrosesan dokumen oleh layanan AI eksternal">
      <AlertTriangle aria-hidden="true" />
      <AlertDescription>
        Dokumen akan diproses oleh layanan AI eksternal. Pastikan dokumen dapat dibagikan sesuai kebijakan organisasi dan tidak memuat informasi rahasia atau data sensitif.
      </AlertDescription>
    </Alert>
  );
}
