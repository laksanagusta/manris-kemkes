"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormContainer, FormGroup } from "../layout/form-container";

export function RiskRevisionReasonCard({ id, label, value, onChange, required = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <FormContainer>
      <FormGroup className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={required ? 10 : undefined}
          maxLength={required ? 1000 : 2000}
          required={required}
          className="min-h-20"
        />
      </FormGroup>
    </FormContainer>
  );
}
