// Monitoring Preview Item — corresponds to BulkMonitoringPreviewItem
export interface MonitoringPreviewItem {
  clientKey: string;
  rowNumber: number;
  raw: Record<string, string>;
  code?: string;           // Kode Risiko
  title?: string;          // Uraian Risiko
  inherentScore?: number;  // from approved risk
  targetP?: number;        // from approved risk
  targetD?: number;        // from approved risk
  targetBobot?: number;    // from approved risk
  targetNilai?: number;   // computed
  targetTingkat?: string;  // from approved risk
  realizationP?: number;     // frontend alias
  realizationD?: number;     // frontend alias
  realisasiP?: number;       // backend field name
  realisasiD?: number;       // backend field name
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
  realizationP: number;    // frontend alias
  realizationD: number;   // frontend alias
  realisasiP?: number;     // backend field name
  realisasiD?: number;     // backend field name
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
