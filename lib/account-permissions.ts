export function canAccessDashboard(accountType: string) {
  const normalizedAccountType = accountType.trim().toLowerCase();
  return normalizedAccountType.includes("admin") || normalizedAccountType.includes("director");
}
