import type { ProcessingJob } from "@/types/document-processing";

const PROCESSING_STORAGE_KEY = "manris:document-processing-jobs";

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveProcessingJob(job: ProcessingJob) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const stored = loadProcessingJobs();
    const next = [job, ...stored.filter((item) => item.id !== job.id)].slice(0, 12);
    storage.setItem(
      PROCESSING_STORAGE_KEY,
      JSON.stringify(next, (key, value) =>
        key === "file" || key === "previewUrl" ? undefined : value,
      ),
    );
  } catch {
    // Persistence is a convenience; the active API result remains usable.
  }
}

export function loadProcessingJobs(): ProcessingJob[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(PROCESSING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProcessingJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadLatestProcessingJob(mode?: string) {
  return loadProcessingJobs().find(
    (job) => (!mode || job.mode === mode) &&
      ["completed", "partial", "failed", "cancelled"].includes(job.status),
  );
}

export function clearProcessingJobs(mode?: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!mode) {
      storage.removeItem(PROCESSING_STORAGE_KEY);
      return;
    }

    const remaining = loadProcessingJobs().filter((job) => job.mode !== mode);
    if (remaining.length === 0) {
      storage.removeItem(PROCESSING_STORAGE_KEY);
      return;
    }
    storage.setItem(PROCESSING_STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // Persistence is a convenience; the active API result remains usable.
  }
}

export function markProcessingFindingHandled(mode: string, findingId: string) {
  const job = loadLatestProcessingJob(mode);
  if (!job || job.handledFindingIds?.includes(findingId)) return;
  saveProcessingJob({
    ...job,
    handledFindingIds: [...(job.handledFindingIds ?? []), findingId],
  });
}
