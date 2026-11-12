import { Download, Loader2 } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

export function DocumentDownloadButton({ label, title, onDownload, downloading = false }: {
  label: string;
  title: string;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      disabled={!onDownload || downloading}
      aria-label={label}
      title={title}
      onClick={onDownload}
    >
      {downloading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}
