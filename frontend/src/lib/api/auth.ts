import { api } from "@/lib/api";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  organizationId: string;
  nip: string;
  jabatan?: string;
  pangkat?: string;
}

export interface RegisterResponse {
  message: string;
  userId?: string;
  verificationQueued: boolean;
  verificationDeliveryId?: string;
}

export type VerificationDeliveryStatus = "queued" | "sending" | "retrying" | "accepted" | "failed" | "cancelled";

export interface AdminVerificationDelivery {
  status: VerificationDeliveryStatus | "unknown";
  failure?: "temporary" | "recipient" | "configuration" | "permanent";
}

export async function registerUser(input: RegisterInput): Promise<RegisterResponse> {
  return api.post<RegisterResponse>("/auth/register", {
    name: input.name,
    email: input.email,
    password: input.password,
    confirmPassword: input.confirmPassword ?? input.password,
    organizationId: input.organizationId,
    nip: input.nip,
    jabatan: input.jabatan ?? "",
    pangkat: input.pangkat ?? "",
  });
}

export function requestPasswordReset(nip: string) {
  return api.post("/auth/forgot-password", { nip });
}

export function resetPasswordByEmail(token: string, newPassword: string, confirmPassword: string) {
  return api.post<void>("/auth/reset-password", { token, newPassword, confirmPassword });
}

export function requestEmailVerification(sessionToken: string, currentPassword: string) {
  return api.post("/auth/verify-email/request", { currentPassword }, sessionToken);
}

export function confirmEmailVerification(token: string) {
  return api.post<{ pendingApproval?: boolean }>("/auth/verify-email/confirm", { token });
}

export function resendRegistrationVerification(nip: string, password: string, statusOnly = false) {
  return api.post<{ accepted: true; deliveryId?: string }>(
    "/auth/verify-email/resend-registration",
    { nip, password, statusOnly },
  );
}

export function getVerificationDelivery(deliveryId: string, signal: AbortSignal) {
  return api.get<{ status: VerificationDeliveryStatus }>(`/auth/verify-email/delivery/${deliveryId}`, undefined, { signal });
}

export function getAdminVerificationDelivery(userId: string, token: string, signal: AbortSignal) {
  return api.get<AdminVerificationDelivery>(`/auth/verify-email/admin/${userId}`, token, { signal });
}

export function retryAdminVerificationDelivery(userId: string, token: string) {
  return api.post<AdminVerificationDelivery>(`/auth/verify-email/admin/${userId}/retry`, {}, token);
}
