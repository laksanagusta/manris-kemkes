import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CollectionFilterPopover,
  CollectionFilterInput,
} from "@/components/shared/design-system";

export function FilterPopoverExample() {
  return (
    <CollectionFilterPopover
      footer={
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="ghost" size="md" className="shadow-none">Reset</Button>
          <Button type="button" size="md">Terapkan</Button>
        </div>
      }
    >
      <div>
        <h4 className="text-sm font-medium">Filter Daftar Risiko</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Atur filter untuk daftar risiko dan transaksi pemantauan.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="semester-example">Semester</Label>
        <CollectionFilterInput id="semester-example" placeholder="Semester" />
      </div>
    </CollectionFilterPopover>
  );
}
