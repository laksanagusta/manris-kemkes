import { Accordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccordionFormSection } from "@/components/shared/design-system";

export function AccordionExample() {
  return (
    <Accordion type="multiple" defaultValue={["item-1"]} className="space-y-4">
      <AccordionFormSection
        value="item-1"
        title="Section Title"
        description="Deskripsi section dengan teks bantuan untuk pengguna."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="accordion-input">Form Field</Label>
          <Input id="accordion-input" placeholder="Placeholder text..." className="h-9 text-sm" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="accordion-textarea">Textarea Field</Label>
          <Textarea id="accordion-textarea" placeholder="Tulis sesuatu..." className="min-h-[80px] text-sm" />
        </div>
      </AccordionFormSection>
      <AccordionFormSection
        value="item-2"
        title="Another Section"
        description="All accordion items follow the exact same pattern."
      >
        <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-card p-5 shadow-none">
          <p className="text-sm font-medium text-foreground">Nested Card</p>
          <p className="text-xs text-muted-foreground">
            Digunakan untuk approval line dan grouped content.
          </p>
        </div>
      </AccordionFormSection>
    </Accordion>
  );
}
