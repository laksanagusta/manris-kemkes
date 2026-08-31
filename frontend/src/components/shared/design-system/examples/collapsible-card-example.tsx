import { Badge, CollapsibleCard } from "@/components/shared/design-system";

export function CollapsibleCardExample() {
  return (
    <CollapsibleCard.Root>
      <CollapsibleCard.Trigger>
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Text>
            <CollapsibleCard.Title>Hasil Pemantauan</CollapsibleCard.Title>
            <CollapsibleCard.Description>
              Header, status, dan isi disusun eksplisit melalui compound component.
            </CollapsibleCard.Description>
          </CollapsibleCard.Text>
        </CollapsibleCard.Header>
        <CollapsibleCard.Actions>
          <Badge size="micro" tone="success">
            Siap dikirim
          </Badge>
        </CollapsibleCard.Actions>
      </CollapsibleCard.Trigger>
      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Gunakan body ber-padding untuk form dan ringkasan, atau atur padding
            pada pemanggil ketika kontennya berupa tabel full-bleed.
          </p>
        </CollapsibleCard.Body>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}
