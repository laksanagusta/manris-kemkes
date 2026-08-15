"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, Trash2, GripVertical } from "@/components/ui/icons";

export interface EditableItem {
  id: string;
  text: string;
}

interface EditableItemsTableProps {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  placeholder?: string;
  disabled?: boolean;
  addItemLabel?: string;
  emptyMessage?: string;
}

export function EditableItemsTable({
  items,
  onChange,
  placeholder = "Tulis item...",
  disabled = false,
  addItemLabel = "Tambah Item",
  emptyMessage = "Belum ada item",
}: EditableItemsTableProps) {
  const addItem = () => {
    const newItem: EditableItem = {
      id: `item-${Date.now()}`,
      text: "",
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, value: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, text: value } : item
    );
    onChange(updated);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableBody className="divide-y divide-border/50">
              {items.map((item, index) => (
                <TableRow key={item.id} className="h-auto animate-in fade-in slide-in-from-top-2 duration-200 ease-out motion-reduce:animate-none hover:bg-muted/30 transition-colors" style={{ animationDelay: `${index * 30}ms` }}>
                  <TableCell className="w-8 px-2 py-2">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <GripVertical className="size-3.5" />
                    </div>
                  </TableCell>
                  <TableCell className="w-8 px-2 py-2">
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 rounded-full w-5 h-5 flex items-center justify-center">
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 px-2 py-2">
                    <Input
                      value={item.text}
                      onChange={(e) => updateItem(item.id, e.target.value)}
                      placeholder={placeholder}
                      className="text-xs bg-background border-border/50 h-8"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell className="w-10 px-2 py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(item.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="w-full border-dashed gap-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <Plus className="size-3.5" />
        {addItemLabel}
      </Button>
    </div>
  );
}
