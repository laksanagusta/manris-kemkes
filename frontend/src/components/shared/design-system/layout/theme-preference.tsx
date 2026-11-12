"use client";

import { useId } from "react";
import { FormContainer, FormGroup } from "./form-container";

const options = [
  { value: "system", label: "Sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
] as const;

export function ThemePreference({ value, onChange }: {
  value: string;
  onChange: (theme: string) => void;
}) {
  const id = useId();

  return (
    <FormContainer title="Tampilan">
      <FormGroup className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p id={`${id}-label`} className="font-medium">Tema</p>
          <p id={`${id}-description`} className="mt-0.5 text-xs text-muted-foreground">Pilih tampilan Manrisk pada perangkat ini.</p>
        </div>
        <div className="workspace-segmented" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}>
          {options.map(({ value: option, label }) => (
            <label key={option} className="workspace-theme-option">
              <input className="sr-only" type="radio" name={id} value={option} checked={value === option} onChange={() => onChange(option)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </FormGroup>
    </FormContainer>
  );
}
