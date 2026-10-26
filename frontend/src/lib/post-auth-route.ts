export function getPostAuthRoute(role: string, mustChangePassword: boolean): string {
  if (mustChangePassword) return "/change-password";
  return role === "unit" ? "/work" : "/overview";
}
