import { CollapsibleCard, FormGroup, FormPanel } from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";

export function CollapsibleCardExample() {
  return (
    <CollapsibleCard.Root appearance="form">
      <CollapsibleCard.Trigger className="hover:bg-transparent sm:px-5">
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Text>
            <CollapsibleCard.Title>Hasil Pemantauan</CollapsibleCard.Title>
            <CollapsibleCard.Description>
              Header dan isi disusun eksplisit melalui compound component.
            </CollapsibleCard.Description>
          </CollapsibleCard.Text>
        </CollapsibleCard.Header>
        <CollapsibleCard.Actions>
          <Badge variant="secondary"
            className=""
          >
            2026-H1
          </Badge>
        </CollapsibleCard.Actions>
      </CollapsibleCard.Trigger>
      <CollapsibleCard.Content>
        <FormPanel>
          <FormGroup>
            <p className="text-sm leading-6 text-muted-foreground">
              Bagian ini menampilkan skor observasi dan catatan hasil pemantauan.
            </p>
          </FormGroup>
        </FormPanel>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}
