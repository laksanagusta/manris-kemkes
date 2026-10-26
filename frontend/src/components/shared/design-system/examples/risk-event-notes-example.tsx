"use client";
import { useState } from "react";
import { RiskEventNotes } from "../domain/risk-event-notes";
import type { RiskEventNote } from "@/types/risk-event";
export function RiskEventNotesExample(){
 const [notes,setNotes]=useState<RiskEventNote[]>([{id:"illustration",eventId:"example",body:"Koreksi: kejadian berlangsung pada 12 Oktober, sesuai catatan petugas.",createdBy:"example",createdByName:"Operator (ilustrasi)",createdAt:"2026-10-13T02:00:00Z"}]);
 return <section className="space-y-3"><h2 className="text-lg font-semibold">Catatan kejadian</h2><p className="text-sm text-muted-foreground">Contoh interaktif dengan data ilustratif.</p><RiskEventNotes notes={notes} canWrite onSave={async(body,id)=>{setNotes(items=>[...items,{id,eventId:"example",body,createdBy:"example",createdByName:"Operator (ilustrasi)",createdAt:new Date().toISOString()}]);}}/></section>;
}
