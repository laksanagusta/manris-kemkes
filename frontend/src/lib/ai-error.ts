import { ApiError } from "@/lib/api";

// Surface the backend's category-only detection message. Other errors may
// contain provider details, so keep the caller's generic recovery message.
export function getAIErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof ApiError &&
    error.status === 422 &&
    error.message.startsWith("Permintaan AI terindikasi memuat data sensitif (")
  ) {
    return error.message;
  }
  return fallback;
}
