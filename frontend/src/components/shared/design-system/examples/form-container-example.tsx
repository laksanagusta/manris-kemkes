import {
  FormContainer,
  InlineEmptyState,
} from "@/components/shared/design-system";

export function FormContainerExample() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_380px] 2xl:grid-cols-[minmax(0,1.75fr)_430px]">
      <div className="min-w-0 w-full space-y-4">
        <FormContainer title="Form Container (Left)">
          <p className="text-sm text-muted-foreground">
            Area formulir utama dengan lebar fleksibel.
          </p>
        </FormContainer>
      </div>
      <div className="hidden xl:block">
        <div className="space-y-6 xl:sticky xl:top-24">
          <FormContainer title="Side Panel" className="bg-card/80 shadow-sm backdrop-blur-lg">
            <InlineEmptyState message="Sticky side panel — 380px (xl) / 430px (2xl)" />
          </FormContainer>
        </div>
      </div>
    </div>
  );
}
