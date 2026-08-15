"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function FieldsExample() {
  return (
    <div className="grid gap-4 rounded-xl bg-card p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="design-system-field-input">Input</Label>
        <Input
          id="design-system-field-input"
          placeholder="Nama risiko"
        />
        <p className="text-xs text-muted-foreground">
          36px · 8px radius · padding horizontal 12px
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="design-system-field-select">Select</Label>
        <Select defaultValue="aktif">
          <SelectTrigger id="design-system-field-select">
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Tinggi, radius, dan border mengikuti Input; trigger popover tetap
          netral tanpa efek pressed dan chevron berputar 180° dalam 150ms
        </p>
      </div>

      <div className="space-y-2 md:col-span-3 lg:col-span-1">
        <Label htmlFor="design-system-field-textarea">Textarea</Label>
        <Textarea
          id="design-system-field-textarea"
          className="min-h-20"
          placeholder="Catatan tambahan"
        />
        <p className="text-xs text-muted-foreground">
          Surface solid dan state interaksi yang sama
        </p>
      </div>
    </div>
  );
}
