import { api } from "@/lib/api";

export interface RegisterInput {
  name: string;
  email: string;
  phoneNumber?: string;
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
}

export async function registerUser(input: RegisterInput): Promise<RegisterResponse> {
  return api.post<RegisterResponse>("/auth/register", {
    name: input.name,
    email: input.email,
    phoneNumber: input.phoneNumber,
    password: input.password,
    confirmPassword: input.confirmPassword ?? input.password,
    organizationId: input.organizationId,
    nip: input.nip,
    jabatan: input.jabatan ?? "",
    pangkat: input.pangkat ?? "",
  });
}
