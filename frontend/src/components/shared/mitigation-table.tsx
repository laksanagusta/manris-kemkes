"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserCircle2, Building2 } from "lucide-react";
import type { MitigationFrequency, RecurringInterval } from "@/types/risk";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
  dueDate: string;
  frequency: MitigationFrequency;
  recurringInterval?: RecurringInterval;
  reportDay?: number;
  reportDate?: number;
  executionScheduleText?: string;
}

interface MitigationTableProps {
  items: MitigationItem[];
  onChange: (items: MitigationItem[]) => void;
  disabled?: boolean;
  users?: { id: string; name: string }[];
  externalPics?: { id: string; name: string }[];
  onSaveExternalPic?: (name: string) => Promise<{ id: string; name: string } | null>;
}

export function MitigationTable({ 
  items, 
  onChange, 
  disabled, 
  users = [],
  externalPics = [],
  onSaveExternalPic 
}: MitigationTableProps) {
  const addItem = () => {
    onChange([...items, { action: "", owner: "", dueDate: "", frequency: "insidental" }]);
  };

  const updateItem = (index: number, field: keyof MitigationItem, value: string | number | undefined) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const allOptions = [
    ...users.map(u => ({ ...u, type: 'internal' as const })),
    ...externalPics.map(e => ({ ...e, type: 'external' as const })),
  ];

  const handlePicSelect = (index: number, selectedId: string) => {
    const updated = [...items];
    if (selectedId === "__manual__") {
      updated[index] = {
        ...updated[index],
        treatmentOwnerId: undefined,
        externalPicId: undefined,
        owner: "",
      };
    } else {
      const selectedOption = allOptions.find(o => o.id === selectedId);
      if (selectedOption) {
        if (selectedOption.type === 'internal') {
          updated[index] = {
            ...updated[index],
            treatmentOwnerId: selectedId,
            externalPicId: undefined,
            owner: selectedOption.name,
          };
        } else {
          updated[index] = {
            ...updated[index],
            treatmentOwnerId: undefined,
            externalPicId: selectedId,
            owner: selectedOption.name,
          };
        }
      }
    }
    onChange(updated);
  };

  const handleOwnerBlur = async (index: number, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const matchingUser = users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase());
    if (matchingUser) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        treatmentOwnerId: matchingUser.id,
        owner: matchingUser.name,
      };
      onChange(updated);
      return;
    }

    const matchingExternal = externalPics.find(e => e.name.toLowerCase() === trimmedName.toLowerCase());
    if (matchingExternal) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        treatmentOwnerId: undefined,
        externalPicId: matchingExternal.id,
        owner: matchingExternal.name,
      };
      onChange(updated);
      return;
    }

    if (onSaveExternalPic && trimmedName.length > 0) {
      const newPic = await onSaveExternalPic(trimmedName);
      if (newPic) {
        const updated = [...items];
        updated[index] = {
          ...updated[index],
          treatmentOwnerId: undefined,
          externalPicId: newPic.id,
          owner: newPic.name,
        };
        onChange(updated);
      }
    }
  };

  const handleOwnerChange = (index: number, name: string) => {
    const updated = [...items];
    updated[index] = { 
      ...updated[index], 
      owner: name 
    };
    onChange(updated);
  };

  const hasOptions = users.length > 0 || externalPics.length > 0;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 mt-1 text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
              {index + 1}
            </span>
            <div className="flex-1">
              <Input
                value={item.action || ""}
                onChange={(e) => updateItem(index, "action", e.target.value)}
                placeholder="Uraian rencana penanganan..."
                className="text-sm bg-background border-border/50"
                disabled={disabled}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8"
              onClick={() => removeItem(index)}
              disabled={disabled}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-7">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">PIC</Label>
              {hasOptions ? (
                <div className="space-y-1.5">
                  <Select 
                    value={item.treatmentOwnerId || item.externalPicId || "__manual__"} 
                    onValueChange={(v) => handlePicSelect(index, v)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full text-sm bg-background">
                      <SelectValue placeholder="Pilih PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__" className="text-sm">
                        <span className="flex items-center gap-1.5">
                          <UserCircle2 className="size-3.5" />
                          Ketik Manual...
                        </span>
                      </SelectItem>
                      {users.length > 0 && (
                        <SelectItem value="__users__" disabled className="text-sm text-muted-foreground font-semibold">
                          PIC Internal
                        </SelectItem>
                      )}
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-sm">{u.name}</SelectItem>
                      ))}
                      {externalPics.length > 0 && (
                        <SelectItem value="__external__" disabled className="text-sm text-muted-foreground font-semibold">
                          PIC Eksternal
                        </SelectItem>
                      )}
                      {externalPics.map((e) => (
                        <SelectItem key={e.id} value={e.id} className="text-sm">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="size-3.5" />
                            {e.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!item.treatmentOwnerId && !item.externalPicId && (
                    <Input
                      value={item.owner || ""}
                      onChange={(e) => handleOwnerChange(index, e.target.value)}
                      onBlur={(e) => handleOwnerBlur(index, e.target.value)}
                      placeholder="Nama PIC (tersimpan otomatis)"
                      className="h-8 text-sm bg-background border-border/50"
                      disabled={disabled}
                    />
                  )}
                </div>
              ) : (
                <Input
                  value={item.owner || ""}
                  onChange={(e) => handleOwnerChange(index, e.target.value)}
                  onBlur={(e) => handleOwnerBlur(index, e.target.value)}
                  placeholder="Nama PIC"
                  className="h-8 text-sm bg-background border-border/50"
                  disabled={disabled}
                />
              )}
            </div>
            {item.frequency !== "rutin" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Target Waktu</Label>
                <Input
                  type="date"
                  value={item.dueDate || ""}
                  onChange={(e) => updateItem(index, "dueDate", e.target.value)}
                  className="h-8 text-sm bg-background border-border/50"
                  disabled={disabled}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Frekuensi</Label>
              <Select value={item.frequency} onValueChange={(v) => updateItem(index, "frequency", v)} disabled={disabled}>
                <SelectTrigger className="w-full text-sm bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insidental" className="text-sm">Insidental</SelectItem>
                  <SelectItem value="rutin" className="text-sm">Rutin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {item.frequency === "rutin" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Interval</Label>
                <Select value={item.recurringInterval || "mingguan"} onValueChange={(v) => updateItem(index, "recurringInterval", v)} disabled={disabled}>
                  <SelectTrigger className="w-full text-sm bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harian" className="text-sm">Harian</SelectItem>
                    <SelectItem value="mingguan" className="text-sm">Mingguan</SelectItem>
                    <SelectItem value="bulanan" className="text-sm">Bulanan</SelectItem>
                    <SelectItem value="triwulan" className="text-sm">Triwulan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {item.frequency === "rutin" && (item.recurringInterval === "mingguan" || (!item.recurringInterval)) && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tenggat Hari</Label>
                <Select 
                  value={String(item.reportDay ?? 5)} 
                  onValueChange={(v) => {
                    const updated = [...items];
                    updated[index] = { ...updated[index], reportDay: Number(v) };
                    onChange(updated);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full text-sm bg-background"><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-sm">Senin</SelectItem>
                    <SelectItem value="2" className="text-sm">Selasa</SelectItem>
                    <SelectItem value="3" className="text-sm">Rabu</SelectItem>
                    <SelectItem value="4" className="text-sm">Kamis</SelectItem>
                    <SelectItem value="5" className="text-sm">Jumat</SelectItem>
                    <SelectItem value="6" className="text-sm">Sabtu</SelectItem>
                    <SelectItem value="0" className="text-sm">Minggu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {item.frequency === "rutin" && (item.recurringInterval === "bulanan" || item.recurringInterval === "triwulan") && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tenggat Tanggal</Label>
                <Select 
                  value={String(item.reportDate ?? 5)} 
                  onValueChange={(v) => {
                    const updated = [...items];
                    updated[index] = { ...updated[index], reportDate: Number(v) };
                    onChange(updated);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full text-sm bg-background"><SelectValue placeholder="Tanggal" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-sm">Tgl {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full border-dashed gap-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <Plus className="size-3.5" />
        Tambah Rencana Penanganan
      </Button>
    </div>
  );
}