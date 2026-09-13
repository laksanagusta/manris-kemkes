import type { ProcessingJob } from "@/types/document-processing";

const PROCESSING_STORAGE_KEY = "manris:document-processing-jobs";

export function saveProcessingJob(job: ProcessingJob) {
  if (typeof window === "undefined") return;

  try {
    const stored = loadProcessingJobs();
    const next = [job, ...stored.filter((item) => item.id !== job.id)].slice(0, 12);
    window.localStorage.setItem(
      PROCESSING_STORAGE_KEY,
      JSON.stringify(next, (key, value) =>
        key === "file" || key === "previewUrl" ? undefined : value,
      ),
    );
  } catch {
    // Persistence is a convenience; the active API result remains usable.
  }
}

function loadProcessingJobs(): ProcessingJob[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROCESSING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProcessingJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
