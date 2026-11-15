"use client";

import { useState } from "react";
import { MonitoringDateField } from "../domain/monitoring-date-field";
import { todayMonitoringDate } from "@/lib/monitoring-date";

export function MonitoringDateExample() {
  const [date, setDate] = useState(() => todayMonitoringDate());
  return <div className="w-full max-w-md"><MonitoringDateField id="catalog-monitoring-date" value={date} onChange={setDate} /></div>;
}
