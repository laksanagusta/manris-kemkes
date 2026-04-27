// Monitoring Preview Item — corresponds to BulkMonitoringPreviewItem
export interface MonitoringPreviewItem {
  clientKey: string;
  rowNumber: number;
  raw: Record<string, string>;
  code?: string;           // Kode Risiko
  title?: string;          // Uraian Risiko
  targetP?: number;        // from approved risk
  targetD?: number;        // from approved risk
  targetBobot?: number;    // from approved risk
  targetNilai?: number;   // computed
  targetTingkat?: string;  // from approved risk
  realizationP?: number;     // user input from template (note: backend uses RealisasiP)
  realizationD?: number;     // user input from template (note: backend uses RealisasiD)
  computedBobot?: number;  // server computed
  computedNilai?: number; // server computed
  computedTingkat?: string; // server computed
  simpulan?: string;      // server computed
  efektivitas?: string;   // server computed
  payload?: MonitoringBatchPayload;
  errors: string[];
  warnings: string[];
}

// Monitoring Batch Payload — for submission
export interface MonitoringBatchPayload {
  clientKey: string;
  code: string;           // Kode Risiko to match
  realizationP: number;    // 1-5 (note: backend uses RealisasiP)
  realizationD: number;   // 1-5 (note: backend uses RealisasiD)
}

// Monitoring Batch Result Item — corresponds to BulkMonitoringBatchItemOutput
export interface MonitoringBatchResultItem {
  clientKey: string;
  id?: string;
  code?: string;
  status: "created" | "failed";
  message: string;
  error?: string;
}

// Monitoring Preview Response
export interface MonitoringPreviewResponse {
  items: MonitoringPreviewItem[];
}

// Monitoring Batch Response
export interface MonitoringBatchResponse {
  items: MonitoringBatchResultItem[];
}
