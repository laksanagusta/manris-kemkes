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
import { Plus, Trash2 } from "lucide-react";
import type { MitigationFrequency, RecurringInterval } from "@/types/risk";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  treatmentOwnerId?: string;
  dueDate: string;
  frequency: MitigationFrequency;
  recurringInterval?: RecurringInterval;
  reportDay?: number;   // 0=Sun..6=Sat
  reportDate?: number;  // 1-31
  executionScheduleText?: string;
}

interface MitigationTableProps {
  items: MitigationItem[];
  onChange: (items: MitigationItem[]) => void;
  disabled?: boolean;
  users?: { id: string; name: string }[];
}

export function MitigationTable({ items, onChange, disabled, users = [] }: MitigationTableProps) {
  const addItem = () => {
    onChange([...items, { action: "", owner: "", dueDate: "", frequency: "insidental" }]);
  };

  const updateItem = (index: number, field: keyof MitigationItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updatePic = (index: number, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updated = [...items];
    updated[index] = { 
      ...updated[index], 
      treatmentOwnerId: userId, 
      owner: user.name 
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="shrink-0 mt-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
              {index + 1}
            </span>
            <div className="flex-1">
              <Input
                value={item.action || ""}
                onChange={(e) => updateItem(index, "action", e.target.value)}
                placeholder="Uraian rencana penanganan..."
                className="text-xs bg-background border-border/50"
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
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-7">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">PIC</Label>
              {users.length > 0 ? (
                <Select value={item.treatmentOwnerId || ""} onValueChange={(v) => updatePic(index, v)}>
                  <SelectTrigger size="sm" className="w-full text-[10px] bg-background"><SelectValue placeholder="Pilih PIC" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={item.owner || ""}
                  onChange={(e) => updateItem(index, "owner", e.target.value)}
                  placeholder="Nama PIC"
                  className="h-7 text-[10px] bg-background border-border/50"
                  disabled={disabled}
                />
              )}
            </div>
            {item.frequency !== "rutin" && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Target Waktu</Label>
                <Input
                  type="date"
                  value={item.dueDate || ""}
                  onChange={(e) => updateItem(index, "dueDate", e.target.value)}
                  className="h-7 text-[10px] bg-background border-border/50"
                  disabled={disabled}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Frekuensi</Label>
              <Select value={item.frequency} onValueChange={(v) => updateItem(index, "frequency", v)} disabled={disabled}>
                <SelectTrigger size="sm" className="w-full text-[10px] bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insidental" className="text-xs">Insidental</SelectItem>
                  <SelectItem value="rutin" className="text-xs">Rutin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {item.frequency === "rutin" && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Interval</Label>
                <Select value={item.recurringInterval || "mingguan"} onValueChange={(v) => updateItem(index, "recurringInterval", v)} disabled={disabled}>
                  <SelectTrigger size="sm" className="w-full text-[10px] bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harian" className="text-xs">Harian</SelectItem>
                    <SelectItem value="mingguan" className="text-xs">Mingguan</SelectItem>
                    <SelectItem value="bulanan" className="text-xs">Bulanan</SelectItem>
                    <SelectItem value="triwulan" className="text-xs">Triwulan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {item.frequency === "rutin" && (item.recurringInterval === "mingguan" || (!item.recurringInterval)) && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Tenggat Hari</Label>
                <Select 
                  value={String(item.reportDay ?? 5)} 
                  onValueChange={(v) => {
                    const updated = [...items];
                    updated[index] = { ...updated[index], reportDay: Number(v) };
                    onChange(updated);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full text-[10px] bg-background"><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">Senin</SelectItem>
                    <SelectItem value="2" className="text-xs">Selasa</SelectItem>
                    <SelectItem value="3" className="text-xs">Rabu</SelectItem>
                    <SelectItem value="4" className="text-xs">Kamis</SelectItem>
                    <SelectItem value="5" className="text-xs">Jumat</SelectItem>
                    <SelectItem value="6" className="text-xs">Sabtu</SelectItem>
                    <SelectItem value="0" className="text-xs">Minggu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {item.frequency === "rutin" && (item.recurringInterval === "bulanan" || item.recurringInterval === "triwulan") && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Tenggat Tanggal</Label>
                <Select 
                  value={String(item.reportDate ?? 5)} 
                  onValueChange={(v) => {
                    const updated = [...items];
                    updated[index] = { ...updated[index], reportDate: Number(v) };
                    onChange(updated);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full text-[10px] bg-background"><SelectValue placeholder="Tanggal" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">Tgl {i + 1}</SelectItem>
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
